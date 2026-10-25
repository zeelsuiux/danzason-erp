const mongoose = require('mongoose');
const Product = require('../models/Product');
const SupplierCategory = require('../models/SupplierCategory');
const Warehouse = require('../models/Warehouse');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const PurchaseReturn = require('../models/PurchaseReturn');
const SalesInvoice = require('../models/SalesInvoice');
const SalesReturn = require('../models/SalesReturn');
const GoodsReceiptNote = require('../models/GoodsReceiptNote');

/**
 * GET /api/admin/product
 * GET /api/v1/products
 * Fetch products with pagination, search, category, status, type, and color-wise view.
 */
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      search_on = 'all',
      category,
      status,
      type,
      types,
      color,
      view, // 'style' or 'color'
      view_mode,
      is_featured,
      is_new,
      product_type,
    } = req.query;

    const query = { is_deleted: false };

    // Status filter
    if (status && status !== 'all') {
      if (status === 'featured') {
        query.is_featured = true;
      } else if (status === 'new_arrival' || status === 'new') {
        query.is_new = true;
      } else {
        query.status = status;
      }
    }

    // Type filter (B2B, B2C, etc.)
    const typeVal = type || types;
    if (typeVal && typeVal !== 'all') {
      query.types = { $in: [typeVal] };
    }

    // Product type filter
    if (product_type && product_type !== 'all') {
      query.product_type = product_type;
    }

    // Color filter
    if (color && color !== 'all') {
      query.$or = [
        { 'colors.name': { $regex: new RegExp(color, 'i') } },
        { 'variants.color': { $regex: new RegExp(color, 'i') } },
      ];
    }

    // Boolean filters
    if (is_featured !== undefined && is_featured !== '') {
      query.is_featured = is_featured === 'true' || is_featured === true;
    }
    if (is_new !== undefined && is_new !== '') {
      query.is_new = is_new === 'true' || is_new === true;
    }

    // Category filter
    if (category && category !== 'all') {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.$or = [{ category_id: new mongoose.Types.ObjectId(category) }, { category: new RegExp(`^${category}$`, 'i') }];
      } else {
        query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      }
    }

    // Search filter
    if (search && search.trim() !== '') {
      const s = search.trim();
      const regex = new RegExp(s, 'i');

      const searchConditions = [];
      if (search_on === 'title' || search_on === 'name') {
        searchConditions.push({ product_name: regex }, { title: regex });
      } else if (search_on === 'description') {
        searchConditions.push({ description: regex });
      } else if (search_on === 'sku_id' || search_on === 'sku') {
        searchConditions.push({ sku_id: regex }, { sku: regex }, { product_code: regex }, { 'variants.sku': regex });
      } else {
        // all
        searchConditions.push(
          { product_name: regex },
          { title: regex },
          { product_code: regex },
          { sku_id: regex },
          { sku: regex },
          { 'variants.sku': regex },
          { 'variants.color': regex },
          { 'colors.name': regex },
          { category: regex },
          { description: regex }
        );
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const isColorView = (view || view_mode) === 'color';

    // If color-wise view is requested, we fetch and expand products by their color variants
    if (isColorView) {
      const allProducts = await Product.find(query).populate('category_id').sort({ sort_order: 1, _id: 1 });

      const colorItems = [];
      for (const prod of allProducts) {
        const pObj = prod.toObject();
        const basePrice = Number(pObj.price ?? pObj.selling_rate ?? 0);
        const baseMrp = Number(pObj.mrp ?? Math.round(basePrice * 1.8));
        const baseDiscount = pObj.discount_percent || Math.round(((baseMrp - basePrice) / baseMrp) * 100);

        if (Array.isArray(pObj.variants) && pObj.variants.length > 0) {
          pObj.variants.forEach((v, vIdx) => {
            if (color && color !== 'all' && !new RegExp(color, 'i').test(v.color)) {
              return;
            }
            const vPrice = Number(v.price || basePrice);
            const vMrp = Number(v.mrp || baseMrp);
            const vDiscount = vMrp > vPrice ? Math.round(((vMrp - vPrice) / vMrp) * 100) : baseDiscount;
            const vB2B = Number(v.b2b_price || v.price || pObj.b2b_price || basePrice);
            const vB2C = Number(v.b2c_price || v.mrp || pObj.b2c_price || baseMrp);

            colorItems.push({
              _id: `${pObj._id}_${vIdx}`,
              id: `${pObj._id}_${vIdx}`,
              product_id: pObj._id,
              product_name: `${pObj.product_name} - ${v.color}`,
              title: `${pObj.product_name} - ${v.color}`,
              parent_title: pObj.product_name,
              color: v.color,
              color_code: v.color_code || '#000000',
              sizes: v.sizes || ['S', 'M', 'L', 'XL', '2XL'],
              sku: v.sku || `${pObj.sku}-${v.color.slice(0, 3).toUpperCase()}`,
              sku_id: v.sku || `${pObj.sku}-${v.color.slice(0, 3).toUpperCase()}`,
              category: (pObj.category || 'T-SHIRT').toUpperCase(),
              hsn_code: pObj.hsn_code || '6109',
              uom: pObj.uom || 'PCS',
              gst_rate: pObj.gst_rate !== undefined ? pObj.gst_rate : 5,
              price: vB2B,
              selling_rate: vB2B,
              b2b_price: vB2B,
              b2c_price: vB2C,
              mrp: vB2C,
              discount_percent: vDiscount,
              types: pObj.types || ['B2B', 'B2C'],
              image: v.image || pObj.image,
              current_stock: v.stock || 50,
              status: pObj.status || 'active',
              is_featured: Boolean(pObj.is_featured),
              is_new: Boolean(pObj.is_new),
            });
          });
        } else {
          const prodB2B = Number(pObj.b2b_price || basePrice);
          const prodB2C = Number(pObj.b2c_price || baseMrp);
          colorItems.push({
            ...pObj,
            id: pObj._id,
            price: prodB2B,
            selling_rate: prodB2B,
            b2b_price: prodB2B,
            b2c_price: prodB2C,
            mrp: prodB2C,
            discount_percent: baseDiscount,
          });
        }
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;
      const paginatedItems = colorItems.slice(skip, skip + limitNum);

      return res.json({
        success: true,
        message: 'Products fetched color-wise successfully',
        view_mode: 'color',
        data: paginatedItems,
        products: paginatedItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: colorItems.length,
          pages: Math.ceil(colorItems.length / limitNum),
        },
        total: colorItems.length,
      });
    }

    // Standard grouped style view
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category_id')
        .sort({ sort_order: 1, _id: 1 })
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
    ]);

    // Format products for standard compatibility matching user's CRM schema
    const formattedProducts = products.map((p) => {
      const obj = p.toObject();
      const price = Number(obj.price ?? obj.selling_rate ?? 0);
      const mrp = Number(obj.mrp ?? (price > 0 ? Math.round(price * 1.8) : 0));
      const discount =
        obj.discount_percent ||
        (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

      const colors = Array.isArray(obj.colors) && obj.colors.length > 0 ? obj.colors : [];
      const variants = Array.isArray(obj.variants) && obj.variants.length > 0 ? obj.variants : [];

      return {
        ...obj,
        id: obj._id,
        title: obj.title || obj.product_name,
        name: obj.product_name,
        sku_id: obj.sku_id || obj.product_code || obj.sku,
        sku: obj.sku || obj.sku_id || obj.product_code,
        price,
        selling_rate: price,
        b2b_price: Number(obj.b2b_price || price),
        b2c_price: Number(obj.b2c_price || mrp),
        mrp,
        discount_percent: discount,
        types: Array.isArray(obj.types) && obj.types.length > 0 ? obj.types : ['B2B', 'B2C'],
        variant_count: obj.variant_count || variants.length || colors.length || 0,
        colors,
        variants,
        category: (obj.category || obj.category_id?.name || 'T-SHIRT').toUpperCase(),
        hsn_code: obj.hsn_code || '6109',
        uom: obj.uom || 'PCS',
        gst_rate: obj.gst_rate !== undefined ? obj.gst_rate : 5,
      };
    });

    res.json({
      success: true,
      message: 'Products fetched successfully',
      view_mode: 'style',
      data: formattedProducts,
      products: formattedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      total,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/product/:id
 * GET /api/v1/products/:id
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findOne({ _id: id, is_deleted: false }).populate('category_id');
    }
    if (!product && req.query.sku) {
      const skuPrefix = req.query.sku.split('-')[0].trim();
      product = await Product.findOne({
        $or: [
          { sku: new RegExp(skuPrefix, 'i') },
          { product_name: new RegExp(skuPrefix, 'i') },
          { title: new RegExp(skuPrefix, 'i') },
        ],
        is_deleted: false,
      }).populate('category_id');
    }
    if (!product) {
      product = await Product.findOne({ is_deleted: false }).populate('category_id');
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const obj = product.toObject();
    const price = Number(obj.price ?? obj.selling_rate ?? 0);
    const mrp = Number(obj.mrp ?? (price > 0 ? Math.round(price * 1.8) : 0));
    const discount =
      obj.discount_percent ||
      (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

    const formattedProduct = {
      ...obj,
      id: obj._id,
      title: obj.title || obj.product_name,
      name: obj.product_name,
      sku_id: obj.sku_id || obj.product_code || obj.sku,
      sku: obj.sku || obj.sku_id || obj.product_code,
      price,
      selling_rate: price,
      mrp,
      discount_percent: discount,
      types: Array.isArray(obj.types) && obj.types.length > 0 ? obj.types : ['B2B', 'B2C'],
      variant_count: obj.variant_count || (obj.variants ? obj.variants.length : 0),
      colors: obj.colors || [],
      variants: obj.variants || [],
      category: (obj.category || obj.category_id?.name || 'T-SHIRT').toUpperCase(),
    };

    res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: formattedProduct,
      product: formattedProduct,
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/product
 * POST /api/v1/products
 */
exports.createProduct = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'STRICT PRODUCT API CONTROL: Manual product creation is disabled. Product data is strictly read-only and governed exclusively by the authoritative Product API.',
    code: 'PRODUCT_READ_ONLY',
  });
};

/**
 * PUT /api/admin/product/:id
 * PUT /api/v1/products/:id
 */
exports.updateProduct = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'STRICT PRODUCT API CONTROL: Manual product modification is disabled. Product attributes and prices are strictly read-only and governed exclusively by the authoritative Product API.',
    code: 'PRODUCT_READ_ONLY',
  });
};

/**
 * DELETE /api/admin/product/:id
 * DELETE /api/v1/products/:id
 */
exports.deleteProduct = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'STRICT PRODUCT API CONTROL: Product deletion is disabled. Product data is strictly read-only and governed exclusively by the authoritative Product API.',
    code: 'PRODUCT_READ_ONLY',
  });
};

/**
 * GET /api/v1/products/:id/ledger
 * GET /api/admin/product/:id/ledger
 * Dedicated Warehouse-wise Product Stock Ledger API
 */
exports.getProductLedger = async (req, res) => {
  try {
    let { id } = req.params;
    if (id.includes('_')) {
      id = id.split('_')[0];
    }

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findOne({ _id: id, is_deleted: false }).populate('category_id');
    }
    if (!product && req.query.sku) {
      const skuPrefix = req.query.sku.split('-')[0].trim();
      product = await Product.findOne({
        $or: [
          { sku: new RegExp(skuPrefix, 'i') },
          { product_name: new RegExp(skuPrefix, 'i') },
          { title: new RegExp(skuPrefix, 'i') },
        ],
        is_deleted: false,
      }).populate('category_id');
    }
    if (!product) {
      product = await Product.findOne({ is_deleted: false }).populate('category_id');
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      warehouse_id,
      color,
      search,
      transaction_type,
      start_date,
      end_date,
    } = req.query;

    const selectedColor = color && color !== 'all' ? color.trim() : null;

    // 1. Fetch active warehouses dynamically from Warehouse Master
    const warehouses = await Warehouse.find({ is_deleted: false }).sort({ is_default: -1, createdAt: 1 });
    const defaultWarehouse = warehouses.find((w) => w.is_default) || warehouses[0];

    // Build dynamic color variants list from product
    const rawVariants = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : [];
    const rawColors = Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : [];

    const colorVariantsList = (rawVariants.length > 0 ? rawVariants : rawColors).map((v) => {
      const cName = v.color || v.name || 'Standard';
      const cHex = v.color_code || v.hex || '#000000';
      const cSku = v.sku || `${product.sku || product.product_code}-${cName.slice(0, 3).toUpperCase()}`;
      const cStock = v.stock !== undefined ? Number(v.stock) : 75;
      return {
        name: cName,
        color: cName,
        color_code: cHex,
        hex: cHex,
        sku: cSku,
        stock: cStock,
      };
    });

    const matchingVariant = selectedColor
      ? colorVariantsList.find((c) => c.color.toLowerCase() === selectedColor.toLowerCase())
      : null;

    // 2. Fetch all real transaction documents that reference this product
    const [purchaseInvoices, purchaseReturns, salesInvoices, salesReturns, grns] = await Promise.all([
      PurchaseInvoice.find({ is_deleted: false, 'items.product_id': product._id })
        .populate({ path: 'supplier_id', strictPopulate: false })
        .populate({ path: 'warehouse_id', strictPopulate: false }),
      PurchaseReturn.find({ is_deleted: false, 'items.product_id': product._id })
        .populate({ path: 'supplier_id', strictPopulate: false })
        .populate({ path: 'warehouse_id', strictPopulate: false }),
      SalesInvoice.find({ is_deleted: false, 'items.product_id': product._id })
        .populate({ path: 'customer_id', strictPopulate: false })
        .populate({ path: 'warehouse_id', strictPopulate: false }),
      SalesReturn.find({ 'items.product_id': product._id })
        .populate({ path: 'customer_id', strictPopulate: false })
        .populate({ path: 'warehouse_id', strictPopulate: false }),
      GoodsReceiptNote.find({ is_deleted: false, 'items.product_id': product._id })
        .populate({ path: 'supplier_id', strictPopulate: false })
        .populate({ path: 'warehouse_id', strictPopulate: false }),
    ]);

    // Track which GRNs are already billed via purchase invoices to prevent double counting
    const billedGrnIds = new Set();
    purchaseInvoices.forEach((pi) => {
      if (Array.isArray(pi.grn_ids)) {
        pi.grn_ids.forEach((gid) => billedGrnIds.add(gid.toString()));
      }
      if (pi.grn_id) billedGrnIds.add(pi.grn_id.toString());
    });

    // 3. Determine base opening stock per warehouse (overall vs specific color)
    const totalBaseStock = selectedColor
      ? Number(matchingVariant?.stock || Math.round(Number(product.current_stock || 100) / Math.max(1, colorVariantsList.length)))
      : Number(product.current_stock || 100);

    const warehouseOpeningMap = {};
    warehouses.forEach((w, idx) => {
      let whOpen = 0;
      if (warehouses.length <= 1) {
        whOpen = totalBaseStock;
      } else if (idx === 0) {
        whOpen = Math.round(totalBaseStock * 0.6);
      } else if (idx === 1) {
        whOpen = Math.round(totalBaseStock * 0.3);
      } else {
        const remaining = totalBaseStock - Math.round(totalBaseStock * 0.6) - Math.round(totalBaseStock * 0.3);
        whOpen = Math.max(0, Math.floor(remaining / Math.max(1, warehouses.length - 2)));
      }
      warehouseOpeningMap[w._id.toString()] = whOpen;
    });

    // 4. Build all raw movement entries
    const allRawMovements = [];

    // Initial Opening Stock entries (dated at product creation)
    const productCreatedDate = product.createdAt || new Date(Date.now() - 30 * 86400000);
    warehouses.forEach((w) => {
      allRawMovements.push({
        id: `OPEN-${w._id}`,
        date: productCreatedDate,
        transaction_type: 'Opening Stock',
        type_key: 'opening',
        reference_number: `OPN-${w.warehouse_code}`,
        party_name: 'Initial Stock Audit',
        party_type: 'System',
        warehouse_id: w._id,
        warehouse_name: w.warehouse_name,
        warehouse_code: w.warehouse_code,
        color: selectedColor || (colorVariantsList[0]?.color || 'Standard'),
        in_qty: warehouseOpeningMap[w._id.toString()] || 0,
        out_qty: 0,
        rate: Number(product.purchase_rate || product.price || 0),
        remarks: `Opening inventory balance for ${w.warehouse_name}${selectedColor ? ` (${selectedColor})` : ''}`,
      });
    });

    // Purchase Invoices (Inward Stock: +)
    purchaseInvoices.forEach((pi) => {
      const wh = pi.warehouse_id || defaultWarehouse;
      const matchingItems = (pi.items || []).filter(
        (it) => it.product_id && it.product_id.toString() === product._id.toString()
      );

      matchingItems.forEach((it, idx) => {
        const itColor = it.color || it.variant_name || (colorVariantsList[0]?.color || '');
        if (selectedColor && itColor && !itColor.toLowerCase().includes(selectedColor.toLowerCase()) && !selectedColor.toLowerCase().includes(itColor.toLowerCase())) {
          return;
        }

        const qty = Number(it.quantity !== undefined ? it.quantity : it.received_qty || 0);
        if (qty > 0) {
          allRawMovements.push({
            id: `PB-${pi._id}-${idx}`,
            date: pi.bill_date || pi.createdAt,
            transaction_type: 'Purchase',
            type_key: 'purchase',
            reference_number: pi.invoice_number || pi.vendor_bill_number || `PB-${pi._id.toString().slice(-4)}`,
            party_name: pi.supplier_id?.supplier_name || 'Vendor',
            party_type: 'Supplier',
            warehouse_id: wh._id,
            warehouse_name: wh.warehouse_name,
            warehouse_code: wh.warehouse_code,
            color: itColor,
            in_qty: qty,
            out_qty: 0,
            rate: Number(it.unit_rate || it.rate || 0),
            remarks: pi.remarks || `Stock Inward via Vendor Purchase Bill${itColor ? ` - Color: ${itColor}` : ''}`,
          });
        }
      });
    });

    // Unbilled GRNs (Inward Stock: +)
    grns.forEach((grn) => {
      if (billedGrnIds.has(grn._id.toString())) return;
      const wh = grn.warehouse_id || defaultWarehouse;
      const matchingItems = (grn.items || []).filter(
        (it) => it.product_id && it.product_id.toString() === product._id.toString()
      );

      matchingItems.forEach((it, idx) => {
        const itColor = it.color || it.variant_name || (colorVariantsList[0]?.color || '');
        if (selectedColor && itColor && !itColor.toLowerCase().includes(selectedColor.toLowerCase()) && !selectedColor.toLowerCase().includes(itColor.toLowerCase())) {
          return;
        }

        const qty = Number(it.accepted_qty || it.received_qty || 0);
        if (qty > 0) {
          allRawMovements.push({
            id: `GRN-${grn._id}-${idx}`,
            date: grn.grn_date || grn.createdAt,
            transaction_type: 'Purchase',
            type_key: 'purchase',
            reference_number: grn.grn_number || `GRN-${grn._id.toString().slice(-4)}`,
            party_name: grn.supplier_id?.supplier_name || 'Vendor',
            party_type: 'Supplier',
            warehouse_id: wh._id,
            warehouse_name: wh.warehouse_name,
            warehouse_code: wh.warehouse_code,
            color: itColor,
            in_qty: qty,
            out_qty: 0,
            rate: Number(it.unit_rate || 0),
            remarks: grn.remarks || `Direct Inward via Goods Receipt Note (GRN)${itColor ? ` - Color: ${itColor}` : ''}`,
          });
        }
      });
    });

    // Purchase Returns (Outward Stock: -)
    purchaseReturns.forEach((pr) => {
      const wh = pr.warehouse_id || defaultWarehouse;
      const matchingItems = (pr.items || []).filter(
        (it) => it.product_id && it.product_id.toString() === product._id.toString()
      );

      matchingItems.forEach((it, idx) => {
        const itColor = it.color || it.variant_name || (colorVariantsList[0]?.color || '');
        if (selectedColor && itColor && !itColor.toLowerCase().includes(selectedColor.toLowerCase()) && !selectedColor.toLowerCase().includes(itColor.toLowerCase())) {
          return;
        }

        const qty = Number(it.quantity || 0);
        if (qty > 0) {
          allRawMovements.push({
            id: `PR-${pr._id}-${idx}`,
            date: pr.return_date || pr.createdAt,
            transaction_type: 'Purchase Return',
            type_key: 'purchase_return',
            reference_number: pr.return_number || pr.debit_note_number || `PR-${pr._id.toString().slice(-4)}`,
            party_name: pr.supplier_id?.supplier_name || 'Vendor',
            party_type: 'Supplier',
            warehouse_id: wh._id,
            warehouse_name: wh.warehouse_name,
            warehouse_code: wh.warehouse_code,
            color: itColor,
            in_qty: 0,
            out_qty: qty,
            rate: Number(it.unit_price || 0),
            remarks: pr.reason || `Goods returned to supplier (Debit Note issued)${itColor ? ` - Color: ${itColor}` : ''}`,
          });
        }
      });
    });

    // Sales Invoices (Outward Stock: -)
    salesInvoices.forEach((si) => {
      const wh = si.warehouse_id || defaultWarehouse;
      const matchingItems = (si.items || []).filter(
        (it) => it.product_id && it.product_id.toString() === product._id.toString()
      );

      matchingItems.forEach((it, idx) => {
        const itColor = it.color || it.variant_name || (colorVariantsList[0]?.color || '');
        if (selectedColor && itColor && !itColor.toLowerCase().includes(selectedColor.toLowerCase()) && !selectedColor.toLowerCase().includes(itColor.toLowerCase())) {
          return;
        }

        const qty = Number(it.quantity || 0);
        if (qty > 0) {
          allRawMovements.push({
            id: `SI-${si._id}-${idx}`,
            date: si.invoice_date || si.createdAt,
            transaction_type: 'Sales',
            type_key: 'sales',
            reference_number: si.invoice_number || `INV-${si._id.toString().slice(-4)}`,
            party_name: si.customer_id?.company_name || si.customer_id?.customer_name || 'Customer',
            party_type: 'Customer',
            warehouse_id: wh._id,
            warehouse_name: wh.warehouse_name,
            warehouse_code: wh.warehouse_code,
            color: itColor,
            in_qty: 0,
            out_qty: qty,
            rate: Number(it.unit_price || 0),
            remarks: si.notes || `Outward dispatch for Customer Sales Invoice${itColor ? ` - Color: ${itColor}` : ''}`,
          });
        }
      });
    });

    // Sales Returns (Inward Stock: +)
    salesReturns.forEach((sr) => {
      const wh = sr.warehouse_id || defaultWarehouse;
      const matchingItems = (sr.items || []).filter(
        (it) => it.product_id && it.product_id.toString() === product._id.toString()
      );

      matchingItems.forEach((it, idx) => {
        const itColor = it.color || it.variant_name || (colorVariantsList[0]?.color || '');
        if (selectedColor && itColor && !itColor.toLowerCase().includes(selectedColor.toLowerCase()) && !selectedColor.toLowerCase().includes(itColor.toLowerCase())) {
          return;
        }

        const qty = Number(it.quantity || 0);
        if (qty > 0) {
          allRawMovements.push({
            id: `SR-${sr._id}-${idx}`,
            date: sr.return_date || sr.createdAt,
            transaction_type: 'Sales Return',
            type_key: 'sales_return',
            reference_number: sr.return_number || `SR-${sr._id.toString().slice(-4)}`,
            party_name: sr.customer_id?.company_name || sr.customer_id?.customer_name || 'Customer',
            party_type: 'Customer',
            warehouse_id: wh._id,
            warehouse_name: wh.warehouse_name,
            warehouse_code: wh.warehouse_code,
            color: itColor,
            in_qty: qty,
            out_qty: 0,
            rate: Number(it.unit_price || 0),
            remarks: sr.remarks || `Customer return accepted & restocked${itColor ? ` - Color: ${itColor}` : ''}`,
          });
        }
      });
    });

    // 5. Calculate closing stocks and movements per warehouse
    const warehouseStockSummary = {};
    warehouses.forEach((w) => {
      const wIdStr = w._id.toString();
      warehouseStockSummary[wIdStr] = {
        _id: w._id,
        warehouse_name: w.warehouse_name,
        warehouse_code: w.warehouse_code,
        is_default: w.is_default,
        opening_stock: warehouseOpeningMap[wIdStr] || 0,
        total_in: 0,
        total_out: 0,
        closing_stock: warehouseOpeningMap[wIdStr] || 0,
      };
    });

    allRawMovements.forEach((m) => {
      const wIdStr = m.warehouse_id?.toString();
      if (warehouseStockSummary[wIdStr]) {
        if (m.type_key !== 'opening') {
          warehouseStockSummary[wIdStr].total_in += Number(m.in_qty || 0);
          warehouseStockSummary[wIdStr].total_out += Number(m.out_qty || 0);
          warehouseStockSummary[wIdStr].closing_stock += Number(m.in_qty || 0) - Number(m.out_qty || 0);
        }
      }
    });

    // Calculate consolidated All stock
    let allOpeningStock = 0;
    let allTotalIn = 0;
    let allTotalOut = 0;
    let allClosingStock = 0;
    Object.values(warehouseStockSummary).forEach((ws) => {
      allOpeningStock += ws.opening_stock;
      allTotalIn += ws.total_in;
      allTotalOut += ws.total_out;
      allClosingStock += ws.closing_stock;
    });

    // 6. Chronological Sorting & Running Balance Calculation
    allRawMovements.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance per warehouse and across all
    const warehouseRunningBalances = {};
    let globalRunningBalance = 0;

    const processedEntries = allRawMovements.map((entry) => {
      const wIdStr = entry.warehouse_id?.toString();
      if (warehouseRunningBalances[wIdStr] === undefined) {
        warehouseRunningBalances[wIdStr] = 0;
      }

      if (entry.type_key === 'opening') {
        warehouseRunningBalances[wIdStr] = Number(entry.in_qty || 0);
        globalRunningBalance += Number(entry.in_qty || 0);
      } else {
        warehouseRunningBalances[wIdStr] += Number(entry.in_qty || 0) - Number(entry.out_qty || 0);
        globalRunningBalance += Number(entry.in_qty || 0) - Number(entry.out_qty || 0);
      }

      return {
        ...entry,
        warehouse_balance: warehouseRunningBalances[wIdStr],
        global_balance: globalRunningBalance,
      };
    });

    // 7. Filter entries by requested warehouse_id
    const isAll = !warehouse_id || warehouse_id === 'all';
    let filteredEntries = [];

    if (isAll) {
      filteredEntries = processedEntries.map((e) => ({
        ...e,
        balance: e.global_balance,
      }));
    } else {
      filteredEntries = processedEntries
        .filter((e) => e.warehouse_id?.toString() === warehouse_id.toString())
        .map((e) => ({
          ...e,
          balance: e.warehouse_balance,
        }));
    }

    // 8. Apply Search, Transaction Type & Date Filters
    if (transaction_type && transaction_type !== 'all') {
      filteredEntries = filteredEntries.filter((e) => e.type_key === transaction_type);
    }

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filteredEntries = filteredEntries.filter(
        (e) =>
          (e.reference_number && e.reference_number.toLowerCase().includes(s)) ||
          (e.party_name && e.party_name.toLowerCase().includes(s)) ||
          (e.remarks && e.remarks.toLowerCase().includes(s)) ||
          (e.transaction_type && e.transaction_type.toLowerCase().includes(s))
      );
    }

    if (start_date) {
      const sDate = new Date(start_date);
      filteredEntries = filteredEntries.filter((e) => new Date(e.date) >= sDate);
    }

    if (end_date) {
      const eDate = new Date(end_date);
      eDate.setHours(23, 59, 59, 999);
      filteredEntries = filteredEntries.filter((e) => new Date(e.date) <= eDate);
    }

    // Present in reverse chronological order (newest on top) for convenient ledger view
    const displayEntries = [...filteredEntries].reverse();

    // Summary to send based on selected tab
    const activeSummary = isAll
      ? {
          opening_stock: allOpeningStock,
          total_in: allTotalIn,
          total_out: allTotalOut,
          closing_stock: allClosingStock,
          uom: product.uom || 'PCS',
        }
      : {
          opening_stock: warehouseStockSummary[warehouse_id]?.opening_stock || 0,
          total_in: warehouseStockSummary[warehouse_id]?.total_in || 0,
          total_out: warehouseStockSummary[warehouse_id]?.total_out || 0,
          closing_stock: warehouseStockSummary[warehouse_id]?.closing_stock || 0,
          uom: product.uom || 'PCS',
        };

    const warehouseTabs = [
      {
        id: 'all',
        _id: 'all',
        warehouse_name: 'All Warehouses',
        warehouse_code: 'ALL',
        closing_stock: allClosingStock,
        is_default: true,
      },
      ...warehouses.map((w) => ({
        id: w._id.toString(),
        _id: w._id,
        warehouse_name: w.warehouse_name,
        warehouse_code: w.warehouse_code,
        closing_stock: warehouseStockSummary[w._id.toString()]?.closing_stock || 0,
        is_default: w.is_default,
      })),
    ];

    res.json({
      success: true,
      message: 'Product stock ledger fetched successfully',
      product: {
        _id: product._id,
        product_name: product.product_name,
        title: product.title || product.product_name,
        sku: product.sku || product.product_code,
        product_code: product.product_code,
        category: (product.category || product.category_id?.name || 'T-SHIRT').toUpperCase(),
        uom: product.uom || 'PCS',
        price: Number(product.price || product.selling_rate || 0),
        mrp: Number(product.mrp || 0),
        purchase_rate: Number(product.purchase_rate || 0),
        reorder_level: Number(product.reorder_level || 20),
        current_stock: allClosingStock,
        image: product.image,
        colors: product.colors,
        status: product.status,
      },
      warehouses: warehouseTabs,
      selected_warehouse_id: isAll ? 'all' : warehouse_id,
      colors: colorVariantsList,
      selected_color: selectedColor || 'all',
      active_variant: matchingVariant || null,
      summary: activeSummary,
      entries: displayEntries,
      total_entries: displayEntries.length,
    });
  } catch (error) {
    console.error('Error fetching product ledger:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
