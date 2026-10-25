const mongoose = require('mongoose');
const SupplierCategory = require('../models/SupplierCategory');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const PurchaseInquiry = require('../models/PurchaseInquiry');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceiptNote = require('../models/GoodsReceiptNote');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const PurchaseReturn = require('../models/PurchaseReturn');

// ======================== CATEGORIES ========================
exports.getCategories = async (req, res) => {
  try {
    const { type, category_type } = req.query;
    const filter = { is_deleted: false };
    const targetType = type || category_type;
    if (targetType && targetType !== 'all') {
      filter.$or = [
        { category_types: targetType },
        { category_types: { $size: 0 } },
        { category_types: { $exists: false } },
      ];
    }
    const categories = await SupplierCategory.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      message: 'Categories fetched successfully',
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, code, description, is_active, category_types } = req.body;
    const category = new SupplierCategory({
      name,
      code,
      description,
      is_active,
      category_types: Array.isArray(category_types) && category_types.length > 0
        ? category_types
        : ['raw_material', 'finished'],
    });
    await category.save();
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await SupplierCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await SupplierCategory.findByIdAndUpdate(
      req.params.id,
      { is_deleted: true },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== SUPPLIERS ========================
exports.getSuppliers = async (req, res) => {
  try {
    const { search, category, categories, type, supplier_type, supplier_classification, page = 1, limit = 10 } = req.query;
    const query = { is_deleted: false };

    if (supplier_classification && supplier_classification !== 'all') {
      const targetClass = String(supplier_classification).toLowerCase();
      const classMatches = [targetClass, 'both'];
      if (targetClass === 'contractor') {
        classMatches.push('manufacturing');
      }
      if (targetClass === 'manufacturing') {
        classMatches.push('contractor');
      }
      const classCondition = {
        $or: [
          { supplier_classification: { $in: classMatches } },
          { supplier_classifications: { $in: classMatches } },
        ],
      };
      if (query.$and) {
        query.$and.push(classCondition);
      } else {
        query.$and = [classCondition];
      }
    }

    if (search) {
      query.$or = [
        { supplier_name: { $regex: search, $options: 'i' } },
        { supplier_code: { $regex: search, $options: 'i' } },
        { contact_person: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by supplier_type (B2B, B2C, D2C, etc.)
    const typeVal = type || supplier_type;
    if (typeVal && typeVal.toUpperCase() !== 'ALL') {
      query.supplier_type = typeVal.toUpperCase();
    }

    // Handle single category or multiple categories filter
    const catList = [];
    if (categories) {
      if (Array.isArray(categories)) {
        catList.push(...categories);
      } else {
        catList.push(...categories.split(',').map((c) => c.trim()).filter(Boolean));
      }
    } else if (category && category !== 'all') {
      catList.push(category);
    }

    if (catList.length > 0) {
      const catOrConditions = [];
      for (const catVal of catList) {
        if (!catVal || catVal === 'all') continue;
        const isObjectId = mongoose.Types.ObjectId.isValid(catVal);

        // String matches (code, legacy category, slug, or name)
        catOrConditions.push({ category: catVal });
        catOrConditions.push({ categories: catVal });

        // If also valid ObjectId, match category_id and category_ids
        if (isObjectId) {
          catOrConditions.push({ category_id: new mongoose.Types.ObjectId(catVal) });
          catOrConditions.push({ category_ids: new mongoose.Types.ObjectId(catVal) });
        }
      }

      if (catOrConditions.length > 0) {
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: catOrConditions }];
          delete query.$or;
        } else {
          query.$or = catOrConditions;
        }
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Run query, total count, and type count aggregation concurrently
    const [suppliers, total, typeAgg] = await Promise.all([
      Supplier.find(query)
        .populate('category_id')
        .populate('category_ids')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Supplier.countDocuments(query),
      Supplier.aggregate([
        { $match: { is_deleted: false } },
        { $group: { _id: '$supplier_type', count: { $sum: 1 } } },
      ]),
    ]);

    const totalAll = await Supplier.countDocuments({ is_deleted: false });
    const typeCounts = {
      ALL: totalAll,
      B2B: 0,
      B2C: 0,
      D2C: 0,
    };
    if (Array.isArray(typeAgg)) {
      typeAgg.forEach((item) => {
        const key = item._id ? String(item._id).toUpperCase() : 'B2B';
        typeCounts[key] = item.count;
      });
    }

    res.json({
      success: true,
      data: suppliers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        typeCounts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('category_id')
      .populate('category_ids');
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSupplierOverview = async (req, res) => {
  try {
    const supplierId = req.params.id;
    const supplier = await Supplier.findById(supplierId)
      .populate('category_id')
      .populate('category_ids');
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const [orders, inquiries, invoices, grns] = await Promise.all([
      PurchaseOrder.find({ supplier_id: supplierId, is_deleted: false })
        .populate('warehouse_id')
        .populate('items.product_id')
        .sort({ createdAt: -1 }),
      PurchaseInquiry.find({ 'suppliers.supplier_id': supplierId, is_deleted: false })
        .populate('category_id')
        .sort({ createdAt: -1 }),
      PurchaseInvoice.find({ supplier_id: supplierId, is_deleted: false })
        .populate('po_id')
        .populate('grn_id')
        .sort({ createdAt: -1 }),
      GoodsReceiptNote.find({ supplier_id: supplierId, is_deleted: false })
        .populate('warehouse_id')
        .populate('po_id')
        .sort({ createdAt: -1 }),
    ]);

    // Format quotations from inquiries
    const quotations = inquiries.map((inq) => {
      const q = inq.suppliers.find(
        (s) => s.supplier_id.toString() === supplierId.toString()
      );
      return {
        _id: inq._id,
        inquiry_number: inq.inquiry_number,
        title: inq.title,
        category_name: inq.category_name,
        expected_delivery_date: inq.expected_delivery_date,
        quoted_price: q?.quoted_price || 0,
        quoted_delivery_date: q?.quoted_delivery_date,
        quoted_remarks: q?.quoted_remarks || '',
        status: q?.status || 'pending',
        accept_reason: q?.accept_reason || '',
        reject_reason: q?.reject_reason || '',
        items_count: inq.items?.length || 0,
        createdAt: inq.createdAt,
      };
    });

    const activeOrders = orders.filter((o) => o.status !== 'cancelled');
    const totalPurchaseAmount = activeOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.grand_total || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
    const pendingBalance = supplier.pending_balance || Math.max(0, totalInvoiced - totalPaid);

    res.json({
      success: true,
      data: {
        supplier,
        metrics: {
          totalPurchaseAmount,
          totalOrders: orders.length,
          totalQuotations: quotations.length,
          totalInvoices: invoices.length,
          totalGrns: grns.length,
          totalInvoiced,
          totalPaid,
          pendingBalance,
        },
        orders,
        quotations,
        invoices,
        grns,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (Array.isArray(payload.categories) && payload.categories.length > 0) {
      payload.category = payload.categories[0];
    } else if (payload.category) {
      payload.categories = [payload.category];
    }
    if (Array.isArray(payload.category_ids) && payload.category_ids.length > 0) {
      payload.category_id = payload.category_ids[0];
    } else if (payload.category_id) {
      payload.category_ids = [payload.category_id];
    }
    if (Array.isArray(payload.supplier_classifications) && payload.supplier_classifications.length > 0) {
      if (payload.supplier_classifications.length > 1) {
        payload.supplier_classification = 'both';
      } else {
        payload.supplier_classification = payload.supplier_classifications[0];
      }
    } else if (payload.supplier_classification) {
      payload.supplier_classifications = [payload.supplier_classification];
    }

    const supplier = new Supplier(payload);
    await supplier.save();
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (Array.isArray(payload.categories) && payload.categories.length > 0) {
      payload.category = payload.categories[0];
    } else if (payload.category) {
      payload.categories = [payload.category];
    }
    if (Array.isArray(payload.category_ids) && payload.category_ids.length > 0) {
      payload.category_id = payload.category_ids[0];
    } else if (payload.category_id) {
      payload.category_ids = [payload.category_id];
    }
    if (Array.isArray(payload.supplier_classifications) && payload.supplier_classifications.length > 0) {
      if (payload.supplier_classifications.length > 1) {
        payload.supplier_classification = 'both';
      } else {
        payload.supplier_classification = payload.supplier_classifications[0];
      }
    } else if (payload.supplier_classification) {
      payload.supplier_classifications = [payload.supplier_classification];
    }

    const supplier = await Supplier.findByIdAndUpdate(req.params.id, payload, { new: true })
      .populate('category_id')
      .populate('category_ids');
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    if (supplier.pending_balance && supplier.pending_balance > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier "${supplier.supplier_name}" because there is an outstanding pending balance of ₹${supplier.pending_balance.toLocaleString('en-IN')}. Please settle accounts first.`,
      });
    }

    supplier.is_deleted = true;
    await supplier.save();
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== INQUIRIES & QUOTATIONS ========================
exports.getInquiries = async (req, res) => {
  try {
    const { search, status, category_id, inquiry_type, page = 1, limit = 50 } = req.query;
    const query = { is_deleted: false };

    if (search) {
      query.$or = [
        { inquiry_number: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (category_id) query.category_id = category_id;
    if (inquiry_type) {
      if (inquiry_type === 'finished') {
        query.$or = [
          { inquiry_type: 'finished' },
          { inquiry_type: 'standard' },
          { inquiry_type: null },
          { inquiry_type: { $exists: false } },
        ];
      } else {
        query.inquiry_type = inquiry_type;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [inquiries, total] = await Promise.all([
      PurchaseInquiry.find(query)
        .populate('category_id')
        .populate('suppliers.supplier_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PurchaseInquiry.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: inquiries,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInquiryById = async (req, res) => {
  try {
    const inquiry = await PurchaseInquiry.findById(req.params.id)
      .populate('category_id')
      .populate('suppliers.supplier_id');
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.json({ success: true, data: inquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createInquiry = async (req, res) => {
  try {
    const { title, category_id, category_name, inquiry_type, expected_delivery_date, remarks, items, selectedSuppliers } = req.body;

    if (!selectedSuppliers || !Array.isArray(selectedSuppliers) || selectedSuppliers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one supplier must be selected to issue an inquiry or quotation.',
      });
    }

    const suppliers = (selectedSuppliers || []).map((sId) => ({
      supplier_id: sId,
      status: 'pending',
    }));

    const inquiry = new PurchaseInquiry({
      title,
      category_id,
      category_name,
      inquiry_type: inquiry_type || 'finished',
      expected_delivery_date,
      remarks,
      items,
      suppliers,
      status: 'open',
    });

    await inquiry.save();
    const populated = await PurchaseInquiry.findById(inquiry._id).populate('suppliers.supplier_id');
    res.status(201).json({
      success: true,
      message: 'Inquiry created successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category_id,
      category_name,
      expected_delivery_date,
      remarks,
      items,
      selectedSuppliers,
      status,
    } = req.body;

    const inquiry = await PurchaseInquiry.findById(id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

    if (title) inquiry.title = title;
    if (category_id !== undefined) inquiry.category_id = category_id || null;
    if (category_name !== undefined) inquiry.category_name = category_name;
    if (expected_delivery_date !== undefined) inquiry.expected_delivery_date = expected_delivery_date;
    if (remarks !== undefined) inquiry.remarks = remarks;
    if (status) inquiry.status = status;
    if (Array.isArray(items)) inquiry.items = items;

    // If selectedSuppliers updated, preserve existing quotations where available
    if (Array.isArray(selectedSuppliers) && selectedSuppliers.length > 0) {
      const existingMap = new Map();
      (inquiry.suppliers || []).forEach((sup) => {
        const sId = sup.supplier_id?._id?.toString() || sup.supplier_id?.toString();
        if (sId) existingMap.set(sId, sup);
      });

      inquiry.suppliers = selectedSuppliers.map((sId) => {
        const existing = existingMap.get(sId.toString());
        if (existing) return existing;
        return {
          supplier_id: sId,
          status: 'pending',
        };
      });
    }

    await inquiry.save();
    const populated = await PurchaseInquiry.findById(inquiry._id)
      .populate('category_id')
      .populate('suppliers.supplier_id');

    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await PurchaseInquiry.findByIdAndUpdate(
      id,
      { is_deleted: true },
      { new: true }
    );
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSupplierQuotationStatus = async (req, res) => {
  try {
    const { id, supplierId } = req.params;
    const { status, quoted_price, quoted_delivery_date, quoted_remarks, accept_reason, reject_reason } = req.body;

    const inquiry = await PurchaseInquiry.findById(id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });

    const suppIdx = inquiry.suppliers.findIndex(
      (s) => s.supplier_id.toString() === supplierId || s._id.toString() === supplierId
    );

    if (suppIdx === -1) {
      return res.status(404).json({ success: false, message: 'Supplier quotation not found in this inquiry' });
    }

    if (status) inquiry.suppliers[suppIdx].status = status;
    if (quoted_price !== undefined) inquiry.suppliers[suppIdx].quoted_price = Number(quoted_price);
    if (quoted_delivery_date) inquiry.suppliers[suppIdx].quoted_delivery_date = quoted_delivery_date;
    if (quoted_remarks !== undefined) inquiry.suppliers[suppIdx].quoted_remarks = quoted_remarks;
    if (accept_reason !== undefined) inquiry.suppliers[suppIdx].accept_reason = accept_reason;
    if (reject_reason !== undefined) inquiry.suppliers[suppIdx].reject_reason = reject_reason;

    if (status === 'accepted') {
      inquiry.status = 'awarded';
      // Automatically reject all other competing quotations under this inquiry
      inquiry.suppliers.forEach((s, idx) => {
        if (idx !== suppIdx) {
          s.status = 'rejected';
          s.reject_reason = 'Auto rejected - competing supplier quotation awarded';
        }
      });
    }

    await inquiry.save();
    const populated = await PurchaseInquiry.findById(id).populate('suppliers.supplier_id');
    res.json({
      success: true,
      message: 'Quotation status updated successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.awardQuotationAndGeneratePo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_id,
      warehouse_id,
      confirmed_items,
      expected_delivery_date,
      payment_terms,
      remarks,
    } = req.body;

    const inquiry = await PurchaseInquiry.findById(id).populate('suppliers.supplier_id');
    if (!inquiry) return res.status(404).json({ success: false, message: 'Purchase inquiry not found' });

    // Validate that supplier is part of this inquiry
    const targetSupIdx = inquiry.suppliers.findIndex(
      (s) => (s.supplier_id?._id?.toString() || s.supplier_id?.toString()) === supplier_id.toString()
    );
    if (targetSupIdx === -1) {
      return res.status(400).json({ success: false, message: 'Selected supplier not found in this inquiry' });
    }

    // 1. Mark selected supplier as 'accepted' and all others as 'rejected' (Auto Rejection)
    inquiry.suppliers.forEach((s, idx) => {
      if (idx === targetSupIdx) {
        s.status = 'accepted';
        s.accept_reason = remarks || 'Quotation confirmed & PO generated';
      } else {
        s.status = 'rejected';
        s.reject_reason = 'Auto rejected - competing supplier quotation awarded';
      }
    });

    inquiry.status = 'awarded';
    await inquiry.save();

    // 2. Determine target warehouse
    let targetWh = warehouse_id;
    if (!targetWh) {
      const defaultWh = await Warehouse.findOne({ is_deleted: false });
      targetWh = defaultWh ? defaultWh._id : null;
    }

    // 3. Find default product or map items
    const defaultProduct = await Product.findOne({ is_deleted: false });
    const poItems = (confirmed_items && confirmed_items.length > 0
      ? confirmed_items
      : inquiry.items
    ).map((it) => {
      const qty = Number(it.ordered_qty || it.quantity || 1);
      const rate = Number(it.rate || it.unit_rate || it.target_price || 100);
      const gstRate = Number(it.gst_rate || 5);
      const taxable = Math.round(qty * rate);
      const gstAmt = Math.round((taxable * gstRate) / 100);

      return {
        product_id: it.product_id || defaultProduct?._id,
        description: it.description || it.item_name || 'Apparel Item',
        ordered_qty: qty,
        received_qty: 0,
        pending_qty: qty,
        rate,
        taxable_amount: taxable,
        gst_rate: gstRate,
        cgst_amount: Math.round(gstAmt / 2),
        sgst_amount: Math.round(gstAmt / 2),
        total_amount: taxable + gstAmt,
      };
    });

    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    poItems.forEach((it) => {
      subtotal += it.taxable_amount;
      cgstTotal += it.cgst_amount;
      sgstTotal += it.sgst_amount;
    });
    const grandTotal = subtotal + cgstTotal + sgstTotal;

    const poPurchaseType =
      req.body.purchase_type ||
      (inquiry.inquiry_type === 'raw_material'
        ? 'raw_material'
        : inquiry.inquiry_type === 'manufacturing'
        ? 'manufacturing'
        : 'standard');

    const purchaseOrder = new PurchaseOrder({
      supplier_id,
      warehouse_id: targetWh,
      purchase_type: poPurchaseType,
      expected_delivery_date: expected_delivery_date || inquiry.expected_delivery_date || null,
      payment_terms: payment_terms || 'Net 30 Days',
      items: poItems,
      subtotal,
      taxable_amount: subtotal,
      cgst_total: cgstTotal,
      sgst_total: sgstTotal,
      grand_total: grandTotal,
      status: 'sent',
      notes: `Generated automatically from Inquiry ${inquiry.inquiry_number}. ${remarks || ''}`,
    });

    await purchaseOrder.save();

    const populatedPo = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('items.product_id');

    res.status(201).json({
      success: true,
      message: `Quotation accepted, competing suppliers auto-rejected, and Purchase Order ${purchaseOrder.po_number} generated successfully!`,
      data: {
        inquiry,
        purchase_order: populatedPo,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================== REQUISITIONS (PR) ========================
exports.getRequisitions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { is_deleted: false };
    if (status) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [requisitions, total] = await Promise.all([
      PurchaseRequisition.find(query)
        .populate('warehouse_id')
        .populate('items.product_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PurchaseRequisition.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: requisitions,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createRequisition = async (req, res) => {
  try {
    const requisition = new PurchaseRequisition(req.body);
    await requisition.save();
    const populated = await PurchaseRequisition.findById(requisition._id)
      .populate('warehouse_id')
      .populate('items.product_id');
    res.status(201).json({
      success: true,
      message: 'Requisition created successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.approveRequisition = async (req, res) => {
  try {
    const { status = 'approved', approval_notes } = req.body;
    const requisition = await PurchaseRequisition.findByIdAndUpdate(
      req.params.id,
      { status, approval_notes },
      { new: true }
    )
      .populate('warehouse_id')
      .populate('items.product_id');

    if (!requisition) return res.status(404).json({ success: false, message: 'Requisition not found' });
    res.json({
      success: true,
      message: `Requisition ${status} successfully`,
      data: requisition,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== PURCHASE ORDERS (PO) ========================
exports.getOrders = async (req, res) => {
  try {
    const { search, status, purchase_type, page = 1, limit = 10 } = req.query;
    const query = { is_deleted: false };

    if (search) {
      query.po_number = { $regex: search, $options: 'i' };
    }
    if (status) query.status = status;
    if (purchase_type && purchase_type !== 'all') {
      query.purchase_type = purchase_type;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplier_id')
        .populate('warehouse_id')
        .populate('finished_product_id')
        .populate('raw_materials_required.raw_material_id')
        .populate('items.product_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PurchaseOrder.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('items.product_id');

    if (!order) return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNextOrderNumber = async (req, res) => {
  try {
    const { Counter } = require('../models/Counter');
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = String((fyStart + 1) % 100).padStart(2, '0');
    const fyString = `${fyStart}-${fyEnd}`;
    const seqDoc = await Counter.findOne({ name: `po_${fyString}` });
    const nextSeq = (seqDoc ? seqDoc.seq : 0) + 1;
    const nextNumber = `PO-${fyString}-${String(nextSeq).padStart(4, '0')}`;
    res.json({
      success: true,
      next_number: nextNumber,
      financial_year: fyString,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const order = new PurchaseOrder(req.body);
    await order.save();

    // If linked to PR, update PR status
    if (order.pr_id) {
      await PurchaseRequisition.findByIdAndUpdate(order.pr_id, { status: 'converted_to_po' });
    }

    const populated = await PurchaseOrder.findById(order._id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('items.product_id');

    res.status(201).json({
      success: true,
      message: 'Purchase Order created successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_id,
      warehouse_id,
      expected_delivery_date,
      payment_terms,
      delivery_terms,
      reference_no,
      billing_address,
      shipping_address,
      is_interstate,
      items,
      notes,
      remarks,
      edit_reason,
    } = req.body;

    const po = await PurchaseOrder.findById(id);
    if (!po || po.is_deleted) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    // Business Rules Validation
    if (po.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled Purchase Orders cannot be edited.' });
    }
    if (po.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed Purchase Orders cannot be modified. Use an amendment or purchase return workflow.',
      });
    }

    // If partially received, prevent supplier change
    if (po.status === 'partially_received') {
      if (supplier_id && supplier_id.toString() !== (po.supplier_id?._id || po.supplier_id).toString()) {
        return res.status(400).json({
          success: false,
          message: 'Supplier cannot be modified on a Purchase Order that has already received partial goods.',
        });
      }
    }

    const previousGrandTotal = po.grand_total;
    const previousItemsCount = po.items.length;

    // Process and validate items
    if (Array.isArray(items) && items.length > 0) {
      const updatedItems = [];

      for (const item of items) {
        const prodId = item.product_id?._id || item.product_id;
        const newOrderedQty = Number(item.ordered_qty || item.quantity || 1);
        const rate = Number(item.rate || item.unit_rate || 0);

        // Find existing line item to check received_qty
        const existingItem = po.items.find(
          (pi) =>
            (item._id && pi._id.toString() === item._id.toString()) ||
            (pi.product_id && prodId && pi.product_id.toString() === prodId.toString())
        );

        const receivedQty = existingItem ? Number(existingItem.received_qty || 0) : 0;

        // Restriction: ordered_qty cannot be reduced below already received_qty
        if (newOrderedQty < receivedQty) {
          return res.status(400).json({
            success: false,
            message: `Ordered quantity for item "${item.description || 'Item'}" cannot be reduced to ${newOrderedQty} because ${receivedQty} units have already been received.`,
          });
        }

        updatedItems.push({
          product_id: prodId,
          description: item.description || '',
          ordered_qty: newOrderedQty,
          received_qty: receivedQty,
          pending_qty: Math.max(0, newOrderedQty - receivedQty),
          rate: rate,
          discount_percent: Number(item.discount_percent || 0),
          gst_rate: Number(item.gst_rate !== undefined ? item.gst_rate : 18),
        });
      }

      po.items = updatedItems;
    }

    if (supplier_id && po.status !== 'partially_received') po.supplier_id = supplier_id;
    if (warehouse_id) po.warehouse_id = warehouse_id;
    if (expected_delivery_date !== undefined) po.expected_delivery_date = expected_delivery_date || null;
    if (payment_terms !== undefined) po.payment_terms = payment_terms;
    if (delivery_terms !== undefined) po.delivery_terms = delivery_terms;
    if (reference_no !== undefined) po.reference_no = reference_no;
    if (billing_address !== undefined) po.billing_address = billing_address;
    if (shipping_address !== undefined) po.shipping_address = shipping_address;
    if (is_interstate !== undefined) po.is_interstate = is_interstate;
    if (notes !== undefined) po.notes = notes;
    if (remarks !== undefined) po.remarks = remarks;

    // Log revision history
    if (!Array.isArray(po.revision_history)) po.revision_history = [];
    po.revision_history.push({
      edited_at: new Date(),
      edited_by: 'Admin',
      reason: edit_reason || 'PO updated via PO Editor',
      previous_grand_total: previousGrandTotal,
      previous_items_count: previousItemsCount,
      notes: notes || remarks || '',
    });

    await po.save();

    const populated = await PurchaseOrder.findById(po._id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('items.product_id');

    res.json({
      success: true,
      message: 'Purchase Order updated successfully and totals recalculated',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== GOODS RECEIPTS (GRN) ========================
exports.getGrns = async (req, res) => {
  try {
    const { page = 1, limit = 10, po_id } = req.query;
    const query = { is_deleted: false };
    if (po_id) query.po_id = po_id;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [grns, total] = await Promise.all([
      GoodsReceiptNote.find(query)
        .populate('supplier_id')
        .populate('warehouse_id')
        .populate('po_id')
        .populate('items.product_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      GoodsReceiptNote.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: grns,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGrnById = async (req, res) => {
  try {
    const grn = await GoodsReceiptNote.findById(req.params.id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('po_id')
      .populate('items.product_id');

    if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });
    res.json({ success: true, data: grn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGrn = async (req, res) => {
  try {
    const {
      po_id,
      supplier_id,
      warehouse_id,
      grn_date,
      vendor_challan_no,
      vendor_challan_date,
      vehicle_number,
      driver_name,
      remarks,
      file_data,
      attachment_name,
      attachment_type,
      items,
    } = req.body;

    const grn = new GoodsReceiptNote({
      po_id,
      supplier_id,
      warehouse_id,
      grn_date: grn_date || Date.now(),
      vendor_challan_no,
      vendor_challan_date,
      vehicle_number,
      driver_name,
      remarks,
      file_data,
      attachment_name,
      attachment_type,
      items,
      status: 'received',
      stock_posted: false,
    });

    await grn.save();

    // Update PO item received & pending quantities and PO status
    if (po_id) {
      const po = await PurchaseOrder.findById(po_id);
      if (po) {
        items.forEach((grnItem) => {
          const poItem = po.items.find(
            (pi) =>
              (grnItem.po_item_id && pi._id.toString() === grnItem.po_item_id.toString()) ||
              pi.product_id.toString() === (grnItem.product_id?._id || grnItem.product_id).toString()
          );
          if (poItem) {
            poItem.received_qty = (poItem.received_qty || 0) + Number(grnItem.received_qty || 0);
            poItem.pending_qty = Math.max(0, poItem.ordered_qty - poItem.received_qty);
          }
        });

        const allReceived = po.items.every((pi) => pi.pending_qty === 0);
        const someReceived = po.items.some((pi) => pi.received_qty > 0);
        po.status = allReceived ? 'completed' : someReceived ? 'partially_received' : po.status;

        await po.save();
      }
    }

    const populated = await GoodsReceiptNote.findById(grn._id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('po_id')
      .populate('items.product_id');

    res.status(201).json({
      success: true,
      message: 'Goods Receipt Note created successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.postGrnToStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_id, remarks, file_data, attachment_name, attachment_type } = req.body;

    const grn = await GoodsReceiptNote.findById(id).populate('items.product_id');
    if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });
    if (grn.stock_posted) {
      return res.status(400).json({ success: false, message: 'GRN already posted to stock' });
    }

    // Update stock quantity for each product and variant
    for (const item of grn.items) {
      const prodId = item.product_id?._id || item.product_id;
      const qtyToAdd = Number(item.accepted_qty || item.received_qty || 0);
      if (prodId && qtyToAdd > 0) {
        const prod = await Product.findById(prodId);
        if (prod) {
          prod.current_stock = (prod.current_stock || 0) + qtyToAdd;
          if (Array.isArray(prod.variants) && prod.variants.length > 0) {
            const variant = prod.variants.find(
              (v) => (item.sku && v.sku === item.sku) || (item.color && v.color === item.color)
            );
            if (variant) {
              variant.stock = (variant.stock || 0) + qtyToAdd;
            }
          }
          await prod.save();
        }
      }
    }

    grn.stock_posted = true;
    grn.stock_posted_at = new Date();
    grn.status = 'posted';
    if (warehouse_id) grn.warehouse_id = warehouse_id;
    if (remarks) grn.remarks = grn.remarks ? `${grn.remarks} | ${remarks}` : remarks;
    if (file_data) grn.file_data = file_data;
    if (attachment_name) grn.attachment_name = attachment_name;
    if (attachment_type) grn.attachment_type = attachment_type;

    await grn.save();

    const populated = await GoodsReceiptNote.findById(id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('po_id')
      .populate('items.product_id');

    res.json({
      success: true,
      message: 'GRN items posted to stock inventory successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== SUPPLIER INVOICES (BILLS) ========================
exports.getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, purchase_type, is_service_bill } = req.query;
    const query = { is_deleted: false };

    if (search) {
      query.$or = [
        { invoice_number: { $regex: search, $options: 'i' } },
        { vendor_bill_number: { $regex: search, $options: 'i' } },
        { supplier_invoice_number: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (purchase_type && purchase_type !== 'all') {
      query.purchase_type = purchase_type;
    }
    if (is_service_bill !== undefined && is_service_bill !== 'all') {
      query.is_service_bill = is_service_bill === 'true' || is_service_bill === true;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      PurchaseInvoice.find(query)
        .populate('supplier_id')
        .populate('warehouse_id')
        .populate('po_id')
        .populate('grn_id')
        .populate('items.product_id')
        .populate('items.raw_material_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PurchaseInvoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: invoices,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await PurchaseInvoice.findById(req.params.id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('po_id')
      .populate('grn_id')
      .populate('grn_ids')
      .populate('items.product_id');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNextBillNumber = async (req, res) => {
  try {
    const { Counter } = require('../models/Counter');
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = String((fyStart + 1) % 100).padStart(2, '0');
    const fyString = `${fyStart}-${fyEnd}`;
    const seqDoc = await Counter.findOne({ name: `bill_${fyString}` });
    const nextSeq = (seqDoc ? seqDoc.seq : 0) + 1;
    const nextNumber = `PB-${fyString}-${String(nextSeq).padStart(4, '0')}`;
    res.json({
      success: true,
      next_number: nextNumber,
      financial_year: fyString,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { po_id, supplier_id, warehouse_id, vendor_bill_number, bill_date, due_date, remarks, items, grn_id } = req.body;

    let invoice;
    let isConsolidated = false;
    let oldBalance = 0;

    // Requirement 5: Check if a Purchase Bill already exists for this PO
    if (po_id) {
      invoice = await PurchaseInvoice.findOne({ po_id, is_deleted: false });
    }

    if (invoice) {
      // CONSOLIDATION LOGIC:
      // An existing Purchase Bill already exists for this Purchase Order!
      // Do NOT create a duplicate bill. Consolidate into the existing Purchase Bill.
      isConsolidated = true;
      oldBalance = Number(invoice.balance_amount !== undefined ? invoice.balance_amount : (invoice.grand_total - (invoice.paid_amount || 0)));

      const existingItems = invoice.items || [];
      const incomingItems = items || [];

      incomingItems.forEach((newItem) => {
        const pIdStr = (newItem.product_id?._id || newItem.product_id || '').toString();
        const found = existingItems.find(
          (ex) =>
            (pIdStr && (ex.product_id?._id || ex.product_id || '').toString() === pIdStr) ||
            (newItem.description && ex.description === newItem.description)
        );
        const qtyToAdd = Number(newItem.quantity || 0);
        const rate = Number(newItem.unit_rate || (found ? found.unit_rate : 0));
        const gstRate = Number(newItem.gst_rate !== undefined ? newItem.gst_rate : (found ? found.gst_rate : 18));

        if (found) {
          found.quantity = (found.quantity || 0) + qtyToAdd;
          found.taxable_amount = Math.round(found.quantity * rate);
          const gstAmt = Math.round((found.taxable_amount * gstRate) / 100);
          found.cgst_amount = Math.round(gstAmt / 2);
          found.sgst_amount = Math.round(gstAmt / 2);
          found.total_amount = found.taxable_amount + gstAmt;
        } else {
          const taxable = Math.round(qtyToAdd * rate);
          const gstAmt = Math.round((taxable * gstRate) / 100);
          existingItems.push({
            product_id: newItem.product_id,
            description: newItem.description || 'Material Item',
            quantity: qtyToAdd,
            unit_rate: rate,
            taxable_amount: taxable,
            gst_rate: gstRate,
            cgst_amount: Math.round(gstAmt / 2),
            sgst_amount: Math.round(gstAmt / 2),
            total_amount: taxable + gstAmt,
          });
        }
      });

      invoice.items = existingItems;

      // Recalculate totals
      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      existingItems.forEach((it) => {
        totalTaxable += it.taxable_amount || 0;
        totalCgst += it.cgst_amount || 0;
        totalSgst += it.sgst_amount || 0;
      });
      invoice.taxable_amount = totalTaxable;
      invoice.cgst_total = totalCgst;
      invoice.sgst_total = totalSgst;
      invoice.grand_total = totalTaxable + totalCgst + totalSgst;
      invoice.balance_amount = Math.max(0, invoice.grand_total - (invoice.paid_amount || 0));

      if (grn_id) {
        if (!invoice.grn_ids) invoice.grn_ids = [];
        if (!invoice.grn_ids.some((g) => g.toString() === grn_id.toString())) {
          invoice.grn_ids.push(grn_id);
        }
      }

      if (remarks) {
        invoice.remarks = (invoice.remarks ? `${invoice.remarks} | ` : '') + remarks;
      }

      await invoice.save();

      // Adjust supplier balance for incremental amount
      const newBalance = Number(invoice.balance_amount || 0);
      const balanceDelta = newBalance - oldBalance;
      if (balanceDelta > 0 && invoice.supplier_id) {
        await Supplier.findByIdAndUpdate(invoice.supplier_id, {
          $inc: { pending_balance: balanceDelta },
        });
      }
    } else {
      // Create new Purchase Bill
      invoice = new PurchaseInvoice(req.body);
      if (grn_id) {
        invoice.grn_ids = [grn_id];
      }
      await invoice.save();

      // Increment supplier pending balance by unpaid amount
      if (invoice.supplier_id) {
        const unpaid = Number(
          invoice.balance_amount || (invoice.grand_total - (invoice.paid_amount || 0))
        );
        if (unpaid > 0) {
          await Supplier.findByIdAndUpdate(invoice.supplier_id, {
            $inc: { pending_balance: unpaid },
          });
        }
      }
    }

    // Auto Inward: Increment inventory stock for the newly received items (unless pure service bill)
    if (!invoice.is_service_bill) {
      const inwardItems = Array.isArray(items) && items.length > 0 ? items : invoice.items;
      if (Array.isArray(inwardItems) && inwardItems.length > 0) {
        for (const item of inwardItems) {
          const qtyToAdd = Number(item.quantity || 0);
          if (qtyToAdd <= 0) continue;

          const rmId = item.raw_material_id?._id || item.raw_material_id;
          if (rmId || item.item_type === 'raw_material') {
            const RawMaterial = require('../models/RawMaterial');
            const RawMaterialMovement = require('../models/RawMaterialMovement');
            const rm = await RawMaterial.findById(rmId);
            if (rm) {
              rm.warehouse_stock = (rm.warehouse_stock || 0) + qtyToAdd;
              const whId = invoice.warehouse_id || rm.warehouse_id;
              let whName = 'Main Warehouse';
              if (whId) {
                let whBal = (rm.warehouse_balances || []).find(
                  (b) => b.warehouse_id.toString() === whId.toString()
                );
                if (!whBal) {
                  const wh = await Warehouse.findById(whId);
                  whName = wh ? wh.warehouse_name : 'Warehouse';
                  whBal = { warehouse_id: whId, warehouse_name: whName, current_stock: 0 };
                  rm.warehouse_balances.push(whBal);
                } else {
                  whName = whBal.warehouse_name || 'Warehouse';
                }
                whBal.current_stock += qtyToAdd;
              }
              rm.total_stock = rm.warehouse_stock + (rm.supplier_stock || 0) + (rm.in_transit_stock || 0);
              await rm.save();

              const { getNextSequence } = require('../models/Counter');
              const seq = await getNextSequence('raw_material_txn', 'RawMaterialMovement', 'transaction_number');
              const txnNum = `TXN-INW-${String(seq).padStart(5, '0')}`;
              const supplier = await Supplier.findById(invoice.supplier_id);
              await RawMaterialMovement.create({
                transaction_number: txnNum,
                transaction_type: 'Purchase Inward',
                reference_no: invoice.invoice_number,
                reference_type: 'Purchase Bill Inward',
                raw_material_id: rm._id,
                material_code: rm.material_code,
                material_name: rm.material_name,
                supplier_id: invoice.supplier_id,
                supplier_name: supplier?.supplier_name || 'Supplier',
                warehouse_id: invoice.warehouse_id || rm.warehouse_id,
                warehouse_name: whName,
                source_location: supplier?.supplier_name || 'Supplier',
                destination_location: whName,
                qty_in: qtyToAdd,
                qty_out: 0,
                uom: rm.uom,
                warehouse_balance: rm.warehouse_stock,
                supplier_balance: rm.supplier_stock || 0,
                in_transit_balance: rm.in_transit_stock || 0,
                total_company_balance: rm.total_stock,
                remarks: `Stock received via Purchase Bill ${invoice.invoice_number}`,
              });
            }
          } else {
            const prodId = item.product_id?._id || item.product_id;
            if (prodId) {
              const prod = await Product.findById(prodId);
              if (prod) {
                prod.current_stock = (prod.current_stock || 0) + qtyToAdd;
                if (Array.isArray(prod.variants) && prod.variants.length > 0) {
                  const variant = prod.variants.find(
                    (v) => (item.sku && v.sku === item.sku) || (item.color && v.color === item.color)
                  );
                  if (variant) {
                    variant.stock = (variant.stock || 0) + qtyToAdd;
                  }
                }
                await prod.save();
              }
            }
          }
        }
      }
    }

    // If linked to PO, update PO item quantities & status
    if (invoice.po_id) {
      const po = await PurchaseOrder.findById(invoice.po_id);
      if (po) {
        (items || []).forEach((inItem) => {
          const poItem = po.items.find(
            (pi) =>
              (inItem.po_item_id && pi._id.toString() === inItem.po_item_id.toString()) ||
              pi.product_id.toString() === (inItem.product_id?._id || inItem.product_id).toString()
          );
          if (poItem) {
            poItem.received_qty = (poItem.received_qty || 0) + Number(inItem.quantity || 0);
            poItem.pending_qty = Math.max(0, poItem.ordered_qty - poItem.received_qty);
          }
        });

        const allReceived = po.items.every((pi) => pi.pending_qty === 0);
        po.status = allReceived ? 'completed' : 'partially_received';
        po.invoiced_status = allReceived ? 'invoiced' : 'partially_invoiced';
        await po.save();
      }
    }

    const populated = await PurchaseInvoice.findById(invoice._id)
      .populate('supplier_id')
      .populate('po_id')
      .populate('grn_id')
      .populate('grn_ids')
      .populate('items.product_id');

    res.status(201).json({
      success: true,
      message: isConsolidated
        ? `Consolidated with existing bill (${invoice.invoice_number}): Additional delivery added & stock updated.`
        : 'Purchase Bill saved: Stock added to inventory and supplier ledger updated successfully',
      data: populated,
      is_consolidated: isConsolidated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor_bill_number,
      supplier_invoice_number,
      supplier_invoice_date,
      bill_date,
      due_date,
      remarks,
      items,
      warehouse_id,
      supplier_id,
      status,
      final_discount_type,
      final_discount_value,
      shipping_charges,
      payment_terms,
      is_interstate,
      paid_amount,
    } = req.body;

    const invoice = await PurchaseInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (vendor_bill_number !== undefined) invoice.vendor_bill_number = vendor_bill_number;
    if (supplier_invoice_number !== undefined) invoice.supplier_invoice_number = supplier_invoice_number;
    if (supplier_invoice_date !== undefined) invoice.supplier_invoice_date = supplier_invoice_date;
    if (bill_date !== undefined) invoice.bill_date = bill_date;
    if (due_date !== undefined) invoice.due_date = due_date;
    if (remarks !== undefined) invoice.remarks = remarks;
    if (warehouse_id !== undefined) invoice.warehouse_id = warehouse_id;
    if (supplier_id !== undefined) invoice.supplier_id = supplier_id;
    if (status !== undefined) invoice.status = status;
    if (final_discount_type !== undefined) invoice.final_discount_type = final_discount_type;
    if (final_discount_value !== undefined) invoice.final_discount_value = Number(final_discount_value) || 0;
    if (shipping_charges !== undefined) invoice.shipping_charges = Number(shipping_charges) || 0;
    if (payment_terms !== undefined) invoice.payment_terms = payment_terms;
    if (is_interstate !== undefined) invoice.is_interstate = Boolean(is_interstate);
    if (paid_amount !== undefined) invoice.paid_amount = Number(paid_amount) || 0;

    if (items && Array.isArray(items) && items.length > 0) {
      invoice.items = items.map((it) => ({
        product_id: it.product_id?._id || it.product_id || null,
        product_name: it.product_name || (it.product_id?.name) || '',
        sku: it.sku || (it.product_id?.sku) || '',
        description: it.description || '',
        ordered_qty: Number(it.ordered_qty || 0),
        quantity: Number(it.quantity !== undefined ? it.quantity : it.received_qty || 1),
        received_qty: Number(it.received_qty !== undefined ? it.received_qty : it.quantity || 1),
        uom: it.uom || it.unit || 'PCS',
        unit_rate: Number(it.unit_rate !== undefined ? it.unit_rate : it.rate || 0),
        rate: Number(it.rate !== undefined ? it.rate : it.unit_rate || 0),
        discount: Number(it.discount || it.discount_amount || 0),
        discount_percent: Number(it.discount_percent || 0),
        gst_rate: Number(it.gst_rate !== undefined ? it.gst_rate : 18),
      }));
    }

    await invoice.save();

    const populated = await PurchaseInvoice.findById(id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('po_id')
      .populate('grn_id')
      .populate('items.product_id');

    res.json({
      success: true,
      message: 'Purchase Bill updated successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateInvoiceDueDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date } = req.body;
    if (!due_date) {
      return res.status(400).json({ success: false, message: 'Due date is required' });
    }

    const invoice = await PurchaseInvoice.findByIdAndUpdate(
      id,
      { due_date },
      { new: true }
    )
      .populate('supplier_id')
      .populate('po_id')
      .populate('grn_id')
      .populate('items.product_id');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    res.json({
      success: true,
      message: 'Bill due date updated successfully',
      data: invoice,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.recordInvoicePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, payment_mode, reference_number, remarks } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const invoice = await PurchaseInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const newPaid = (invoice.paid_amount || 0) + paymentAmount;
    const newBalance = Math.max(0, (invoice.grand_total || 0) - newPaid);

    invoice.paid_amount = newPaid;
    invoice.balance_amount = newBalance;
    invoice.payment_status = newBalance === 0 ? 'paid' : 'partially_paid';

    if (!Array.isArray(invoice.payments)) invoice.payments = [];
    invoice.payments.push({
      amount: paymentAmount,
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      payment_mode: payment_mode || 'Bank Transfer',
      reference_number: reference_number || '',
      remarks: remarks || '',
    });

    const dateStr = payment_date
      ? new Date(payment_date).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');
    const paymentNote = `[Payment: ₹${paymentAmount.toLocaleString('en-IN')} via ${
      payment_mode || 'Cash'
    } on ${dateStr}${reference_number ? ` Ref: ${reference_number}` : ''}${
      remarks ? ` - ${remarks}` : ''
    }]`;
    invoice.remarks = invoice.remarks ? `${invoice.remarks}\n${paymentNote}` : paymentNote;

    await invoice.save();

    // Decrement supplier pending balance
    if (invoice.supplier_id) {
      await Supplier.findByIdAndUpdate(invoice.supplier_id, {
        $inc: { pending_balance: -paymentAmount },
      });
    }

    // Auto-sync immediately to Finance Transaction Ledger
    try {
      const FinanceTransaction = require('../models/FinanceTransaction');
      let source = 'finished_purchase';
      let cat = 'Finished Goods Purchase Payment';
      if (invoice.purchase_type === 'raw_material') {
        source = 'raw_material_purchase';
        cat = 'Raw Material Purchase Payment';
      } else if (invoice.purchase_type === 'manufacturing' || invoice.is_service_bill) {
        source = 'job_work_purchase';
        cat = 'Job Work / Processing Payment';
      }
      const pMode = payment_mode || 'Bank Transfer';
      const accName = pMode.toLowerCase().includes('cash')
        ? 'Cash Drawer / Petty Cash'
        : 'Primary Bank Account (HDFC Bank - Current A/c #5020001)';

      await FinanceTransaction.create({
        transaction_type: 'expense',
        entry_source: source,
        amount: paymentAmount,
        transaction_date: payment_date ? new Date(payment_date) : new Date(),
        category: cat,
        party_name: invoice.supplier_id?.supplier_name || 'Vendor',
        party_type: invoice.purchase_type === 'manufacturing' || invoice.is_service_bill ? 'contractor' : 'supplier',
        supplier_id: invoice.supplier_id?._id || invoice.supplier_id,
        bill_id: invoice._id,
        bill_type: 'purchase_invoice',
        bill_number: invoice.invoice_number || invoice.vendor_bill_number || 'PB',
        payment_index: (invoice.payments?.length || 1) - 1,
        payment_method: pMode.includes('UPI') ? 'UPI' : pMode.includes('Cash') ? 'Cash' : 'Bank Transfer',
        account_name: accName,
        reference_number: reference_number || invoice.invoice_number || '',
        description: remarks || `Payment recorded for ${cat}: ${invoice.invoice_number || ''}`,
        is_manual: false,
        status: 'confirmed',
        created_by: 'System (Purchase Billing)',
      });
    } catch (finErr) {
      console.error('Failed to auto-post to Finance:', finErr);
    }

    const populated = await PurchaseInvoice.findById(id)
      .populate('supplier_id')
      .populate('po_id')
      .populate('grn_id')
      .populate('items.product_id');

    res.json({
      success: true,
      message: `Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded successfully`,
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== PURCHASE RETURNS ========================
exports.getReturns = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [returns, total] = await Promise.all([
      PurchaseReturn.find({ is_deleted: false })
        .populate('supplier_id')
        .populate('warehouse_id')
        .populate('bill_id')
        .populate('po_id')
        .populate('items.product_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PurchaseReturn.countDocuments({ is_deleted: false }),
    ]);

    res.json({
      success: true,
      data: returns,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNextReturnNumber = async (req, res) => {
  try {
    const { Counter } = require('../models/Counter');
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = String((fyStart + 1) % 100).padStart(2, '0');
    const fyString = `${fyStart}-${fyEnd}`;
    const seqDoc = await Counter.findOne({ name: `pr_${fyString}` });
    const nextSeq = (seqDoc ? seqDoc.seq : 0) + 1;
    const nextNumber = `PR-${fyString}-${String(nextSeq).padStart(4, '0')}`;
    res.json({
      success: true,
      next_number: nextNumber,
      financial_year: fyString,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReturnById = async (req, res) => {
  try {
    const ret = await PurchaseReturn.findById(req.params.id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('bill_id')
      .populate('po_id')
      .populate('items.product_id');

    if (!ret) return res.status(404).json({ success: false, message: 'Purchase return not found' });
    res.json({ success: true, data: ret });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createReturn = async (req, res) => {
  try {
    const purchaseReturn = new PurchaseReturn(req.body);
    await purchaseReturn.save();

    // Deduct stock for returned items (at product, variant or raw material level)
    if (purchaseReturn.items && purchaseReturn.items.length) {
      for (const item of purchaseReturn.items) {
        const qty = Math.abs(item.quantity || 0);
        if (item.raw_material_id) {
          const RawMaterial = require('../models/RawMaterial');
          const RawMaterialMovement = require('../models/RawMaterialMovement');
          const rm = await RawMaterial.findById(item.raw_material_id);
          if (rm) {
            rm.warehouse_stock = Math.max(0, (rm.warehouse_stock || 0) - qty);
            if (purchaseReturn.warehouse_id) {
              const whBal = (rm.warehouse_balances || []).find(
                (b) => b.warehouse_id.toString() === purchaseReturn.warehouse_id.toString()
              );
              if (whBal) {
                whBal.current_stock = Math.max(0, whBal.current_stock - qty);
              }
            }
            rm.total_stock = rm.warehouse_stock + (rm.supplier_stock || 0) + (rm.in_transit_stock || 0);
            await rm.save();

            const { getNextSequence } = require('../models/Counter');
            const seq = await getNextSequence('raw_material_txn', 'RawMaterialMovement', 'transaction_number');
            const txnNum = `TXN-PR-${String(seq).padStart(5, '0')}`;
            const supplier = await Supplier.findById(purchaseReturn.supplier_id);
            const wh = purchaseReturn.warehouse_id ? await Warehouse.findById(purchaseReturn.warehouse_id) : null;
            await RawMaterialMovement.create({
              transaction_number: txnNum,
              transaction_type: 'Purchase Return',
              reference_no: purchaseReturn.return_number,
              reference_type: 'Purchase Return',
              raw_material_id: rm._id,
              material_code: rm.material_code,
              material_name: rm.material_name,
              supplier_id: purchaseReturn.supplier_id,
              supplier_name: supplier?.supplier_name || 'Supplier',
              warehouse_id: purchaseReturn.warehouse_id,
              warehouse_name: wh?.warehouse_name || 'Warehouse',
              source_location: wh?.warehouse_name || 'Warehouse',
              destination_location: supplier?.supplier_name || 'Supplier',
              qty_in: 0,
              qty_out: qty,
              uom: rm.uom,
              warehouse_balance: rm.warehouse_stock,
              supplier_balance: rm.supplier_stock || 0,
              in_transit_balance: rm.in_transit_stock || 0,
              total_company_balance: rm.total_stock,
              remarks: `Raw material purchase return ${purchaseReturn.return_number} to ${supplier?.supplier_name || 'Supplier'}`,
            });
          }
        } else if (item.product_id) {
          const prod = await Product.findById(item.product_id);
          if (prod) {
            prod.current_stock = Math.max(0, (prod.current_stock || 0) - qty);
            if (Array.isArray(prod.variants) && prod.variants.length > 0) {
              const variant = prod.variants.find(
                (v) => (item.sku && v.sku === item.sku) || (item.product_name && v.variant_name === item.product_name)
              );
              if (variant) {
                variant.stock = Math.max(0, (variant.stock || 0) - qty);
              }
            }
            await prod.save();
          }
        }
      }
    }

    // Debit Note / Supplier Balance adjustment for returned goods
    const returnAmount = Number(purchaseReturn.total_amount || purchaseReturn.grand_total || 0);
    if (purchaseReturn.supplier_id && returnAmount > 0) {
      await Supplier.findByIdAndUpdate(purchaseReturn.supplier_id, {
        $inc: { pending_balance: -returnAmount },
      });
    }

    const populated = await PurchaseReturn.findById(purchaseReturn._id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('bill_id')
      .populate('po_id')
      .populate('items.product_id');

    res.status(201).json({
      success: true,
      message: 'Purchase return created successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reason,
      status,
      notes,
      remarks,
      debit_note_number,
      debit_note_date,
      warehouse_id,
      supplier_id,
      items,
      is_interstate,
    } = req.body;

    const purchaseReturn = await PurchaseReturn.findById(id);
    if (!purchaseReturn) return res.status(404).json({ success: false, message: 'Purchase return not found' });

    if (reason !== undefined) purchaseReturn.reason = reason;
    if (status !== undefined) purchaseReturn.status = status;
    if (notes !== undefined) purchaseReturn.notes = notes;
    if (remarks !== undefined) purchaseReturn.remarks = remarks;
    if (debit_note_number !== undefined) purchaseReturn.debit_note_number = debit_note_number;
    if (debit_note_date !== undefined) purchaseReturn.debit_note_date = debit_note_date;
    if (warehouse_id !== undefined) purchaseReturn.warehouse_id = warehouse_id;
    if (supplier_id !== undefined) purchaseReturn.supplier_id = supplier_id;
    if (is_interstate !== undefined) purchaseReturn.is_interstate = Boolean(is_interstate);

    if (items && Array.isArray(items) && items.length > 0) {
      purchaseReturn.items = items.map((it) => ({
        product_id: it.product_id?._id || it.product_id,
        product_name: it.product_name || (it.product_id?.name) || '',
        sku: it.sku || (it.product_id?.sku) || '',
        description: it.description || '',
        unit: it.unit || 'PCS',
        purchased_qty: Number(it.purchased_qty || 0),
        previously_returned_qty: Number(it.previously_returned_qty || 0),
        available_qty: Number(it.available_qty || 0),
        quantity: Number(it.quantity !== undefined ? it.quantity : it.return_qty || 0),
        unit_price: Number(it.unit_price !== undefined ? it.unit_price : it.rate || 0),
        gst_rate: Number(it.gst_rate !== undefined ? it.gst_rate : 18),
      }));
    }

    await purchaseReturn.save();

    const populated = await PurchaseReturn.findById(id)
      .populate('supplier_id')
      .populate('warehouse_id')
      .populate('bill_id')
      .populate('po_id')
      .populate('items.product_id');

    res.json({
      success: true,
      message: 'Purchase return updated successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== WAREHOUSE MANAGEMENT ========================
exports.getWarehouses = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { is_deleted: false };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { warehouse_name: { $regex: search, $options: 'i' } },
        { warehouse_code: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { contact_person: { $regex: search, $options: 'i' } },
      ];
    }

    let warehouses = await Warehouse.find(query).sort({ is_default: -1, status: 1, warehouse_name: 1 });

    // Guarantee that if there is at least one active warehouse and none is marked default, set the first one as default
    if (warehouses.length > 0 && !warehouses.some((w) => w.is_default && w.status === 'active')) {
      const firstActive = warehouses.find((w) => w.status === 'active') || warehouses[0];
      firstActive.is_default = true;
      await Warehouse.findByIdAndUpdate(firstActive._id, { is_default: true });
    }

    res.json({
      success: true,
      data: {
        warehouses,
      },
      warehouses,
      total: warehouses.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse || warehouse.is_deleted) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    const [poCount, grnCount, invCount] = await Promise.all([
      PurchaseOrder.countDocuments({ warehouse_id: warehouse._id, is_deleted: false }),
      GoodsReceiptNote.countDocuments({ warehouse_id: warehouse._id, is_deleted: false }),
      PurchaseInvoice.countDocuments({ warehouse_id: warehouse._id, is_deleted: false }),
    ]);

    res.json({
      success: true,
      data: {
        ...warehouse.toObject(),
        usage: {
          purchase_orders: poCount,
          goods_receipts: grnCount,
          purchase_invoices: invCount,
          total_linked_records: poCount + grnCount + invCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const {
      warehouse_name,
      warehouse_code,
      warehouse_type,
      address,
      contact_person,
      mobile,
      status = 'active',
      is_default = false,
      description,
    } = req.body;

    if (!warehouse_name || !warehouse_name.trim()) {
      return res.status(400).json({ success: false, message: 'Warehouse name is required' });
    }
    if (!warehouse_code || !warehouse_code.trim()) {
      return res.status(400).json({ success: false, message: 'Warehouse code is required' });
    }

    const cleanCode = warehouse_code.trim().toUpperCase();
    const existing = await Warehouse.findOne({ warehouse_code: cleanCode, is_deleted: false });
    if (existing) {
      return res.status(400).json({ success: false, message: `Warehouse code "${cleanCode}" is already in use.` });
    }

    const existingCount = await Warehouse.countDocuments({ is_deleted: false });
    const shouldBeDefault = Boolean(is_default || existingCount === 0);

    if (shouldBeDefault) {
      await Warehouse.updateMany({}, { is_default: false });
    }

    const warehouse = new Warehouse({
      warehouse_name: warehouse_name.trim(),
      warehouse_code: cleanCode,
      warehouse_type: warehouse_type || 'central',
      address: address || {},
      contact_person: contact_person || '',
      mobile: mobile || '',
      status: status || 'active',
      is_default: shouldBeDefault,
      description: description || '',
    });

    await warehouse.save();

    res.status(201).json({
      success: true,
      message: 'Warehouse added successfully and available across all modules',
      data: warehouse,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      warehouse_name,
      warehouse_code,
      warehouse_type,
      address,
      contact_person,
      mobile,
      status,
      is_default,
      description,
    } = req.body;

    const warehouse = await Warehouse.findById(id);
    if (!warehouse || warehouse.is_deleted) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    if (warehouse_code && warehouse_code.trim().toUpperCase() !== warehouse.warehouse_code) {
      const cleanCode = warehouse_code.trim().toUpperCase();
      const conflict = await Warehouse.findOne({
        _id: { $ne: id },
        warehouse_code: cleanCode,
        is_deleted: false,
      });
      if (conflict) {
        return res.status(400).json({ success: false, message: `Warehouse code "${cleanCode}" is already in use by another warehouse.` });
      }
      warehouse.warehouse_code = cleanCode;
    }

    if (warehouse_name) warehouse.warehouse_name = warehouse_name.trim();
    if (warehouse_type) warehouse.warehouse_type = warehouse_type;
    if (address) warehouse.address = address;
    if (contact_person !== undefined) warehouse.contact_person = contact_person;
    if (mobile !== undefined) warehouse.mobile = mobile;
    if (status) warehouse.status = status;
    if (description !== undefined) warehouse.description = description;

    if (is_default) {
      await Warehouse.updateMany({ _id: { $ne: id } }, { is_default: false });
      warehouse.is_default = true;
      warehouse.status = 'active'; // Default warehouse must be active
    }

    await warehouse.save();

    res.json({
      success: true,
      message: 'Warehouse updated successfully across the entire ERP system',
      data: warehouse,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findById(id);
    if (!warehouse || warehouse.is_deleted) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    // Safeguard: Check if linked to existing transactions
    const [poCount, grnCount, invCount] = await Promise.all([
      PurchaseOrder.countDocuments({ warehouse_id: id, is_deleted: false }),
      GoodsReceiptNote.countDocuments({ warehouse_id: id, is_deleted: false }),
      PurchaseInvoice.countDocuments({ warehouse_id: id, is_deleted: false }),
    ]);

    const totalUsage = poCount + grnCount + invCount;
    if (totalUsage > 0) {
      return res.status(400).json({
        success: false,
        is_linked: true,
        usage: { poCount, grnCount, invCount },
        message: `Destructive deletion blocked! This warehouse is linked to ${poCount} Purchase Order(s), ${grnCount} GRN(s), and ${invCount} Purchase Bill(s). To protect historical records and stock audit trails, please deactivate this warehouse instead.`,
      });
    }

    warehouse.is_deleted = true;
    warehouse.is_default = false;
    await warehouse.save();

    // If deleted warehouse was default, assign next active warehouse as default
    const remainingActive = await Warehouse.findOne({ is_deleted: false, status: 'active' });
    if (remainingActive) {
      remainingActive.is_default = true;
      await remainingActive.save();
    }

    res.json({
      success: true,
      message: 'Warehouse removed successfully from active master list',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.setDefaultWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await Warehouse.findById(id);
    if (!target || target.is_deleted) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    await Warehouse.updateMany({}, { is_default: false });
    target.is_default = true;
    target.status = 'active'; // Default warehouse must be active
    await target.save();

    res.json({
      success: true,
      message: `"${target.warehouse_name}" is now set as the Default Warehouse for all new orders and receipts.`,
      data: target,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.toggleWarehouseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await Warehouse.findById(id);
    if (!target || target.is_deleted) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    target.status = newStatus;

    if (newStatus === 'inactive' && target.is_default) {
      target.is_default = false;
      const nextActive = await Warehouse.findOne({ _id: { $ne: id }, is_deleted: false, status: 'active' });
      if (nextActive) {
        nextActive.is_default = true;
        await nextActive.save();
      }
    }

    await target.save();

    res.json({
      success: true,
      message: `Warehouse "${target.warehouse_name}" status changed to ${newStatus.toUpperCase()}`,
      data: target,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const products = await Product.find({ is_deleted: false }).limit(parseInt(limit, 10));
    res.json({
      success: true,
      data: {
        products,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
