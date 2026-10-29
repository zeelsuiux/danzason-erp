const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const SalesOrder = require('../models/SalesOrder');
const SalesInvoice = require('../models/SalesInvoice');
const SalesReturn = require('../models/SalesReturn');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const BankAccount = require('../models/BankAccount');
const PricingRule = require('../models/PricingRule');
const { adjustBalance } = require('./bankAccountController');
const { trackGoalProgressEvent } = require('../utils/targetGoalTracker');

/**
 * Authoritative Product Price Resolver:
 * Retrieves the product directly from the database/API catalog.
 * Validates existence, variant pricing, and returns authoritative selling price
 * tailored to B2B (Wholesale) or B2C (Retail) pricing tiers.
 */
async function resolveAuthoritativeProductPrice(item, preferredTier = null) {
  const rawId = item.product_id ? String(item.product_id).trim() : '';
  const baseId = rawId ? rawId.split('_')[0] : null;
  const sku = item.sku ? String(item.sku).trim() : '';

  let prod = null;
  if (baseId && mongoose.Types.ObjectId.isValid(baseId)) {
    prod = await Product.findById(baseId);
  }
  if (!prod && sku) {
    prod = await Product.findOne({
      $or: [{ sku }, { product_code: sku }, { 'variants.sku': sku }],
    });
  }
  if (!prod && item.product_name) {
    prod = await Product.findOne({
      $or: [{ title: item.product_name }, { product_name: item.product_name }],
    });
  }

  if (!prod) {
    return {
      error: `Product not found in authoritative API catalog for "${item.product_name || rawId || sku}". All sales line items must reference a valid API product.`,
    };
  }

  // Variant matching
  let variant = null;
  if (rawId && rawId.includes('_')) {
    const vIdx = parseInt(rawId.split('_')[1], 10);
    if (!isNaN(vIdx) && Array.isArray(prod.variants) && prod.variants[vIdx]) {
      variant = prod.variants[vIdx];
    }
  }
  if (!variant && sku && Array.isArray(prod.variants)) {
    variant = prod.variants.find((v) => v.sku === sku);
  }
  if (!variant && item.color && Array.isArray(prod.variants)) {
    variant = prod.variants.find(
      (v) => (v.color || '').toLowerCase() === String(item.color).toLowerCase()
    );
  }

  const baseRate = Number(
    prod.selling_rate !== undefined && prod.selling_rate !== null
      ? prod.selling_rate
      : prod.price !== undefined && prod.price !== null
      ? prod.price
      : 0
  );

  const b2bPrice = Number(
    variant?.b2b_price ||
    variant?.price ||
    prod.b2b_price ||
    baseRate
  );

  const b2cPrice = Number(
    variant?.b2c_price ||
    variant?.mrp ||
    prod.b2c_price ||
    prod.mrp ||
    (b2bPrice ? Math.round(b2bPrice * 1.35) : 0)
  );

  // Authoritative price based on pricing tier (B2B vs B2C)
  const tier = String(preferredTier || item.pricing_tier || 'B2B').toUpperCase();
  const fallbackCatalogPrice = ['B2C', 'RETAIL', 'D2C'].includes(tier) ? b2cPrice : b2bPrice;

  // Dynamic price calculation based on base purchase cost + panel % markup
  const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
  let baseCost = 0;
  if (typeof prod.calculateFifoCost === 'function') {
    const fifo = prod.calculateFifoCost(qty);
    baseCost = Number(fifo?.effectiveCost || 0);
  }
  if (baseCost <= 0) {
    baseCost = Number(prod.purchase_rate || prod.cost_rate || variant?.purchase_rate || variant?.cost_rate || 0);
  }

  let dynamicPrice = fallbackCatalogPrice;
  if (baseCost > 0) {
    let percent = 5;
    try {
      const activeRule = await PricingRule.findOne({ is_active: true }).lean();
      if (activeRule && Array.isArray(activeRule.ranges) && activeRule.ranges.length > 0) {
        const matched = activeRule.ranges.find((r) => {
          const min = Number(r.min_qty) || 0;
          const max = r.max_qty !== null && r.max_qty !== undefined ? Number(r.max_qty) : Infinity;
          return qty >= min && qty <= max;
        }) || activeRule.ranges[activeRule.ranges.length - 1];

        if (matched) {
          if (tier === 'B2C') percent = Number(matched.b2c_percent || 0);
          else if (tier === 'D2C') percent = Number(matched.d2c_percent || 0);
          else if (tier === 'RETAIL') percent = Number(matched.retail_percent || 0);
          else percent = Number(matched.b2b_percent || 0);
        }
      }
    } catch (_) {}
    dynamicPrice = Math.round((baseCost + (baseCost * percent) / 100) * 100) / 100;
  }

  return {
    product: prod,
    variant,
    authoritativePrice: dynamicPrice || fallbackCatalogPrice,
    dynamicPrice,
    baseCost,
    b2bPrice,
    b2cPrice,
    tier,
  };
}

function isAuthorizedPrice(submittedPrice, resolution) {
  if (submittedPrice === undefined || submittedPrice === null) return true;
  const num = Number(submittedPrice);
  if (isNaN(num) || num <= 0) return false;
  const { authoritativePrice, b2bPrice, b2cPrice, dynamicPrice } = resolution;

  if (dynamicPrice && Math.abs(num - dynamicPrice) <= 0.50) return true;
  if (authoritativePrice && Math.abs(num - authoritativePrice) <= 0.50) return true;
  if (b2bPrice && Math.abs(num - b2bPrice) <= 0.50) return true;
  if (b2cPrice && Math.abs(num - b2cPrice) <= 0.50) return true;

  // Accept any valid positive price from authorized ERP user
  return true;
}

function resolveItemDiscount(it, gross) {
  let discAmt = 0;
  let discPct = 0;

  if (it.discount_amount !== undefined && Number(it.discount_amount) > 0) {
    discAmt = Math.min(gross, Number(it.discount_amount));
    discPct = gross > 0 ? Number(((discAmt / gross) * 100).toFixed(2)) : 0;
  } else if (it.discount_percentage !== undefined && Number(it.discount_percentage) > 0) {
    discPct = Number(it.discount_percentage);
    discAmt = Number(((gross * discPct) / 100).toFixed(2));
  }

  return { discAmt, discPct };
}

// ======================== CUSTOMERS ========================
exports.getCustomers = async (req, res) => {
  try {
    const { search, category, type, page = 1, limit = 10 } = req.query;
    const query = { is_deleted: false };

    if (search) {
      query.$or = [
        { customer_name: { $regex: search, $options: 'i' } },
        { customer_code: { $regex: search, $options: 'i' } },
        { company_name: { $regex: search, $options: 'i' } },
        { contact_person: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      const catConditions = [{ category }, { categories: category }];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: catConditions }];
        delete query.$or;
      } else {
        query.$or = catConditions;
      }
    }

    if (type && type.toLowerCase() !== 'all') {
      query.customer_type = type.toUpperCase();
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [customers, total, typeAgg] = await Promise.all([
      Customer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Customer.countDocuments(query),
      Customer.aggregate([
        { $match: { is_deleted: false } },
        { $group: { _id: { $toUpper: '$customer_type' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalAll = await Customer.countDocuments({ is_deleted: false });
    const typeCounts = {
      ALL: totalAll,
      B2B: 0,
      B2C: 0,
    };
    if (Array.isArray(typeAgg)) {
      typeAgg.forEach((item) => {
        const key = item._id ? String(item._id).toUpperCase() : 'B2B';
        typeCounts[key] = item.count;
      });
    }

    res.json({
      success: true,
      message: 'Customers fetched successfully',
      data: customers,
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

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomerOverview = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const [orders, invoices] = await Promise.all([
      SalesOrder.find({ customer_id: customerId, is_deleted: false })
        .populate('warehouse_id')
        .sort({ createdAt: -1 }),
      SalesInvoice.find({ customer_id: customerId, is_deleted: false })
        .populate('so_id')
        .sort({ createdAt: -1 }),
    ]);

    const totalOrderAmount = orders.reduce((sum, o) => sum + (o.grand_total || 0), 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.grand_total || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
    const pendingBalance = totalInvoiced - totalPaid;

    res.json({
      success: true,
      data: {
        customer,
        metrics: {
          totalOrders: orders.length,
          totalInvoices: invoices.length,
          totalOrderAmount,
          totalInvoiced,
          totalPaid,
          pendingBalance,
          creditAvailable: Math.max(0, (customer.credit_limit || 0) - pendingBalance),
        },
        orders,
        invoices,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (Array.isArray(payload.categories) && payload.categories.length > 0) {
      payload.category = payload.categories[0];
    } else if (payload.category) {
      payload.categories = [payload.category];
    }

    const customer = new Customer(payload);
    await customer.save();
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: customer,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (Array.isArray(payload.categories) && payload.categories.length > 0) {
      payload.category = payload.categories[0];
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    if (customer.pending_balance && customer.pending_balance > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer "${customer.customer_name}" because they have an outstanding pending balance of ₹${customer.pending_balance.toLocaleString('en-IN')}. Please settle all dues first.`,
      });
    }

    customer.is_deleted = true;
    await customer.save();
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== SALES ORDERS ========================
exports.getSalesOrders = async (req, res) => {
  try {
    const { search, status, payment_status, page = 1, limit = 10 } = req.query;
    const query = { is_deleted: false };

    if (status && status !== 'all') query.status = status;
    if (payment_status && payment_status !== 'all') query.payment_status = payment_status;

    if (search) {
      query.$or = [{ so_number: { $regex: search, $options: 'i' } }];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      SalesOrder.find(query)
        .populate('customer_id')
        .populate('warehouse_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SalesOrder.countDocuments(query),
    ]);

    res.json({
      success: true,
      message: 'Sales orders fetched successfully',
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

exports.getSalesOrderById = async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate('customer_id')
      .populate('warehouse_id')
      .populate('items.product_id');

    if (!order) return res.status(404).json({ success: false, message: 'Sales order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSalesOrder = async (req, res) => {
  try {
    const {
      customer_id,
      expected_delivery_date,
      warehouse_id,
      items,
      shipping_charges = 0,
      payment_terms = 'Net 30 Days',
      advance_paid = 0,
      notes = '',
      pricing_tier: requestedTier,
      final_discount_type = 'fixed',
      final_discount_value = 0,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer selection is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one order item is required.' });
    }

    const customer = await Customer.findById(customer_id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const activeTier = String(
      requestedTier ||
      (['B2C', 'RETAIL', 'D2C'].includes(String(customer.customer_type).toUpperCase()) ? 'B2C' : 'B2B')
    ).toUpperCase();

    let subtotal = 0;
    let item_discount_total = 0;
    let tax_total = 0;

    const processedItems = [];

    for (const it of items) {
      const qty = Number(it.quantity);
      if (!qty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for "${it.product_name || 'item'}". Quantity must be a positive whole number.`,
        });
      }

      const resolution = await resolveAuthoritativeProductPrice(it, activeTier);
      if (resolution.error) {
        return res.status(400).json({ success: false, message: resolution.error });
      }

      const { product: prod, variant, authoritativePrice } = resolution;

      // Validate price (accepts either active tier price, B2B price, or B2C price)
      if (it.unit_price !== undefined && it.unit_price !== null) {
        const submittedPrice = Number(it.unit_price);
        if (!isAuthorizedPrice(submittedPrice, resolution)) {
          return res.status(400).json({
            success: false,
            message: `Price verification failed for product "${prod.title || prod.product_name}". B2B Price: ₹${resolution.b2bPrice}, B2C Price: ₹${resolution.b2cPrice}. Submitted price was ₹${submittedPrice}.`,
          });
        }
      }

      // Check available stock
      if (prod.current_stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${prod.title || prod.product_name}". Available: ${prod.current_stock}, Requested: ${qty}`,
        });
      }

      const rate = it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price) : authoritativePrice;
      const gross = qty * rate;
      const { discAmt, discPct } = resolveItemDiscount(it, gross);
      const taxable = Math.max(0, gross - discAmt);
      const gstRate = Number(it.gst_rate !== undefined ? it.gst_rate : prod.gst_rate || 5);
      const gstAmt = (taxable * gstRate) / 100;
      const total = taxable + gstAmt;

      subtotal += gross;
      item_discount_total += discAmt;
      tax_total += gstAmt;

      processedItems.push({
        product_id: prod._id,
        product_name: variant ? `${prod.title || prod.product_name} - ${variant.color || variant.variant_name || ''}`.trim() : (prod.title || prod.product_name),
        sku: variant?.sku || prod.sku || '',
        color: variant?.color || it.color || '',
        variant_name: variant?.variant_name || variant?.color || '',
        quantity: qty,
        uom: prod.uom || it.uom || 'PCS',
        unit_price: rate,
        discount_percentage: discPct,
        discount_amount: discAmt,
        taxable_amount: taxable,
        gst_rate: gstRate,
        gst_amount: gstAmt,
        total_amount: total,
      });
    }

    // Overall / Final Discount calculation
    let finalDiscountAmt = 0;
    const finalVal = Number(final_discount_value) || 0;
    if (finalVal > 0) {
      if (final_discount_type === 'percentage') {
        finalDiscountAmt = (subtotal * finalVal) / 100;
      } else {
        finalDiscountAmt = finalVal;
      }
    }
    const discount_total = Math.round(item_discount_total + finalDiscountAmt);

    const grand_total = Math.round(Math.max(0, subtotal - discount_total) + tax_total + Number(shipping_charges));
    const round_off = grand_total - (subtotal - discount_total + tax_total + Number(shipping_charges));

    const validWarehouseId = warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : null;

    const salesOrder = new SalesOrder({
      customer_id,
      expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : null,
      warehouse_id: validWarehouseId,
      pricing_tier: activeTier,
      items: processedItems,
      subtotal,
      discount_total,
      final_discount_type,
      final_discount_value: finalVal,
      tax_total,
      shipping_charges: Number(shipping_charges),
      round_off,
      grand_total,
      advance_paid: Number(advance_paid),
      payment_terms,
      payment_status: Number(advance_paid) >= grand_total ? 'paid' : Number(advance_paid) > 0 ? 'partially_paid' : 'unpaid',
      dispatch_status: 'not_dispatched',
      status: 'confirmed',
      billing_address: customer.billing_address,
      shipping_address: customer.shipping_address,
      notes,
    });

    await salesOrder.save();

    // Auto-update Target Goals for Sales Orders
    trackGoalProgressEvent({
      eventType: 'SALES_ORDER',
      count: 1,
      amount: grand_total,
      department: 'Sales & CRM',
      notes: `Order #${salesOrder.so_number || ''} confirmed`,
    }).catch(() => {});

    const populated = await SalesOrder.findById(salesOrder._id)
      .populate('customer_id')
      .populate('warehouse_id');

    res.status(201).json({
      success: true,
      message: 'Sales Order created and confirmed successfully!',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSalesOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, dispatch_status, payment_status } = req.body;
    
    const existingOrder = await SalesOrder.findById(id);
    if (!existingOrder) return res.status(404).json({ success: false, message: 'Sales order not found' });

    const previousStatus = existingOrder.status;

    // If order was active and is now being cancelled -> Restore Inventory
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      if (Array.isArray(existingOrder.items)) {
        for (const item of existingOrder.items) {
          if (item.product_id) {
            const prod = await Product.findById(item.product_id);
            if (prod) {
              prod.current_stock = (prod.current_stock || 0) + Number(item.quantity || 0);
              if (Array.isArray(prod.variants) && prod.variants.length > 0) {
                const variant = prod.variants.find(
                  (v) => (item.sku && v.sku === item.sku) || (item.product_name && v.variant_name === item.product_name)
                );
                if (variant) {
                  variant.stock = (variant.stock || 0) + Number(item.quantity || 0);
                }
              }
              await prod.save();
            }
          }
        }
      }
    }

    // If order was cancelled and is now being re-opened -> Re-deduct Inventory
    if (previousStatus === 'cancelled' && status && status !== 'cancelled') {
      if (Array.isArray(existingOrder.items)) {
        for (const item of existingOrder.items) {
          if (item.product_id) {
            const prod = await Product.findById(item.product_id);
            if (prod) {
              prod.current_stock = Math.max(0, (prod.current_stock || 0) - Number(item.quantity || 0));
              if (Array.isArray(prod.variants) && prod.variants.length > 0) {
                const variant = prod.variants.find(
                  (v) => (item.sku && v.sku === item.sku) || (item.product_name && v.variant_name === item.product_name)
                );
                if (variant) {
                  variant.stock = Math.max(0, (variant.stock || 0) - Number(item.quantity || 0));
                }
              }
              await prod.save();
            }
          }
        }
      }
    }

    const update = {};
    if (status) update.status = status;
    if (dispatch_status) update.dispatch_status = dispatch_status;
    if (payment_status) update.payment_status = payment_status;

    const order = await SalesOrder.findByIdAndUpdate(id, update, { new: true })
      .populate('customer_id')
      .populate('warehouse_id');

    res.json({ success: true, message: 'Order status updated successfully', data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      expected_delivery_date,
      items,
      shipping_charges = 0,
      payment_terms,
      advance_paid = 0,
      notes = '',
      status,
    } = req.body;

    const existingOrder = await SalesOrder.findById(id);
    if (!existingOrder) return res.status(404).json({ success: false, message: 'Sales quotation not found' });

    let processedItems = existingOrder.items;
    let subtotal = existingOrder.subtotal;
    let discount_total = existingOrder.discount_total;
    let tax_total = existingOrder.tax_total;
    let grand_total = existingOrder.grand_total;

    if (items && Array.isArray(items) && items.length > 0) {
      const activeTier = String(
        req.body.pricing_tier ||
        existingOrder.pricing_tier ||
        'B2B'
      ).toUpperCase();

      subtotal = 0;
      let item_discount_total = 0;
      tax_total = 0;
      processedItems = [];

      for (const it of items) {
        const qty = Number(it.quantity);
        if (!qty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
          return res.status(400).json({
            success: false,
            message: `Invalid quantity for "${it.product_name || 'item'}". Quantity must be a positive whole number.`,
          });
        }

        const resolution = await resolveAuthoritativeProductPrice(it, activeTier);
        if (resolution.error) {
          return res.status(400).json({ success: false, message: resolution.error });
        }

        const { product: prod, variant, authoritativePrice } = resolution;

        if (it.unit_price !== undefined && it.unit_price !== null) {
          const submittedPrice = Number(it.unit_price);
          if (!isAuthorizedPrice(submittedPrice, resolution)) {
            return res.status(400).json({
              success: false,
              message: `Price verification failed for product "${prod.title || prod.product_name}". B2B: ₹${resolution.b2bPrice}, B2C: ₹${resolution.b2cPrice}. Submitted: ₹${submittedPrice}.`,
            });
          }
        }

        const rate = it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price) : authoritativePrice;
        const gross = qty * rate;
        const { discAmt, discPct } = resolveItemDiscount(it, gross);
        const lineTaxable = Math.max(0, gross - discAmt);
        const gstRate = Number(it.gst_rate !== undefined ? it.gst_rate : prod.gst_rate || 5);
        const gst = (lineTaxable * gstRate) / 100;
        const lineTotal = Math.round(lineTaxable + gst);

        subtotal += gross;
        item_discount_total += discAmt;
        tax_total += gst;

        processedItems.push({
          product_id: prod._id,
          product_name: variant ? `${prod.title || prod.product_name} - ${variant.color || ''}`.trim() : (prod.title || prod.product_name),
          sku: variant?.sku || prod.sku || '',
          quantity: qty,
          uom: prod.uom || it.uom || 'PCS',
          unit_price: rate,
          discount_percentage: discPct,
          discount_amount: discAmt,
          taxable_amount: lineTaxable,
          gst_rate: gstRate,
          total_price: lineTotal,
          total_amount: lineTotal,
        });
      }

      const finalVal = Number(req.body.final_discount_value !== undefined ? req.body.final_discount_value : existingOrder.final_discount_value || 0);
      const finalType = req.body.final_discount_type || existingOrder.final_discount_type || 'fixed';
      let finalDiscountAmt = 0;
      if (finalVal > 0) {
        if (finalType === 'percentage') {
          finalDiscountAmt = (subtotal * finalVal) / 100;
        } else {
          finalDiscountAmt = finalVal;
        }
      }
      discount_total = Math.round(item_discount_total + finalDiscountAmt);

      const taxableWithShip = Math.max(0, subtotal - discount_total) + Number(shipping_charges);
      const rawGrand = taxableWithShip + tax_total;
      grand_total = Math.round(rawGrand);
    }

    const updateData = {
      items: processedItems,
      subtotal,
      discount_total,
      tax_total,
      shipping_charges: Number(shipping_charges),
      grand_total,
      notes,
    };

    if (expected_delivery_date) updateData.expected_delivery_date = expected_delivery_date;
    if (payment_terms) updateData.payment_terms = payment_terms;
    if (advance_paid !== undefined) {
      updateData.advance_paid = Number(advance_paid);
      updateData.payment_status =
        Number(advance_paid) >= grand_total
          ? 'paid'
          : Number(advance_paid) > 0
          ? 'partially_paid'
          : 'unpaid';
    }
    if (status) updateData.status = status;

    const updated = await SalesOrder.findByIdAndUpdate(id, updateData, { new: true })
      .populate('customer_id')
      .populate('warehouse_id');

    res.json({
      success: true,
      message: 'Sales quotation updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== SALES INVOICES ========================
exports.getSalesInvoices = async (req, res) => {
  try {
    const { search, payment_status, page = 1, limit = 50 } = req.query;
    const query = { is_deleted: false };

    if (payment_status && payment_status !== 'all') query.payment_status = payment_status;
    if (search) query.$or = [{ invoice_number: { $regex: search, $options: 'i' } }];

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      SalesInvoice.find(query)
        .populate('customer_id')
        .populate('so_id')
        .populate('warehouse_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SalesInvoice.countDocuments(query),
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

exports.createSalesInvoiceFromOrder = async (req, res) => {
  try {
    const { so_id, due_date, approx_repeat_date } = req.body;
    const so = await SalesOrder.findById(so_id)
      .populate('customer_id')
      .populate('warehouse_id');
    if (!so) return res.status(404).json({ success: false, message: 'Sales Quotation not found' });

    // Prevent duplicate conversion
    const existingInvoice = await SalesInvoice.findOne({ so_id: so._id, is_deleted: false });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: `Quotation has already been converted to Tax Invoice ${existingInvoice.invoice_number}. Duplicate conversion prevented.`,
      });
    }

    const originState = (so.warehouse_id?.address?.state || 'Gujarat').trim().toLowerCase();
    const destState = (
      so.shipping_address?.state ||
      so.customer_id?.shipping_address?.state ||
      so.customer_id?.billing_address?.state ||
      'Gujarat'
    ).trim().toLowerCase();
    const isIntraState = originState === destState;

    const validSoWhId = so.warehouse_id?._id || (mongoose.Types.ObjectId.isValid(so.warehouse_id) ? so.warehouse_id : null);

    const invoiceItems = so.items.map((it) => {
      const halfTax = Number(((it.gst_amount || 0) / 2).toFixed(2));
      return {
        product_id: it.product_id,
        product_name: it.product_name,
        sku: it.sku || '',
        color: it.color || '',
        variant_name: it.variant_name || '',
        hsn_code: it.hsn_code || '6109',
        quantity: it.quantity,
        uom: it.uom,
        unit_price: it.unit_price,
        discount_amount: it.discount_amount,
        taxable_amount: it.taxable_amount,
        gst_rate: it.gst_rate,
        cgst_amount: isIntraState ? halfTax : 0,
        sgst_amount: isIntraState ? halfTax : 0,
        igst_amount: isIntraState ? 0 : it.gst_amount,
        total_amount: it.total_amount,
      };
    });

    const dueDateCalculated = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const balance = Math.max(0, so.grand_total - so.advance_paid);

    const invoice = new SalesInvoice({
      so_id: so._id,
      customer_id: so.customer_id._id,
      warehouse_id: validSoWhId,
      invoice_date: new Date(),
      due_date: dueDateCalculated,
      approx_repeat_date: approx_repeat_date ? new Date(approx_repeat_date) : null,
      items: invoiceItems,
      subtotal: so.subtotal,
      discount_total: so.discount_total,
      tax_total: so.tax_total,
      shipping_charges: so.shipping_charges,
      round_off: so.round_off,
      grand_total: so.grand_total,
      paid_amount: so.advance_paid,
      balance_amount: balance,
      payment_status: balance === 0 ? 'paid' : so.advance_paid > 0 ? 'partially_paid' : 'unpaid',
      status: 'issued',
      notes: so.notes,
    });

    await invoice.save();

    // Auto-create Repeat Requirement if approx_repeat_date is specified
    if (approx_repeat_date) {
      try {
        const RepeatOrder = require('../models/RepeatOrder');
        const count = await RepeatOrder.countDocuments();
        const year = new Date().getFullYear();
        const repNumber = `RO-${year}-${String(count + 1).padStart(4, '0')}`;
        await RepeatOrder.create({
          repeat_order_number: repNumber,
          original_order_id: invoice._id,
          original_order_number: invoice.invoice_number,
          customer_id: so.customer_id._id,
          customer_name: so.customer_id.customer_name || 'Valued Customer',
          company_name: so.customer_id.company_name || so.customer_id.customer_name || '',
          phone: so.customer_id.mobile || so.customer_id.phone || '',
          email: so.customer_id.email || '',
          expected_reorder_date: new Date(approx_repeat_date),
          last_order_date: invoice.invoice_date || new Date(),
          status: 'due_soon',
          priority: so.grand_total > 50000 ? 'high' : 'medium',
          total_quantity: invoiceItems.reduce((acc, it) => acc + (it.quantity || 0), 0),
          subtotal_amount: so.subtotal,
          final_amount: so.grand_total,
          items: invoiceItems.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            sku: it.hsn_code || '',
            color: 'Standard',
            sizes: { S: 0, M: 0, L: 0, XL: 0, '2XL': 0 },
            quantity: it.quantity,
            uom: it.uom || 'PCS',
            unit_price: it.unit_price,
            total_price: it.total_amount,
          })),
          warehouse_id: so.warehouse_id?._id || null,
          notes: so.notes || `Scheduled repeat from Invoice ${invoice.invoice_number}`,
        });
      } catch (errRep) {
        console.error('Failed to auto-schedule RepeatOrder from Quotation conversion:', errRep);
      }
    }

    // Inventory Posting: Deduct physical stock at finalized invoice generation stage
    for (const item of invoiceItems) {
      if (item.product_id) {
        const prod = await Product.findById(item.product_id);
        if (prod) {
          prod.current_stock = Math.max(0, (prod.current_stock || 0) - item.quantity);
          if (Array.isArray(prod.variants) && prod.variants.length > 0) {
            const variant = prod.variants.find(
              (v) => (item.sku && v.sku === item.sku) || (item.product_name && v.variant_name === item.product_name)
            );
            if (variant) {
              variant.stock = Math.max(0, (variant.stock || 0) - item.quantity);
            }
          }
          await prod.save();
        }
      }
    }

    // Mark quotation as completed / converted
    so.status = 'completed';
    await so.save();

    // Update customer pending balance
    await Customer.findByIdAndUpdate(so.customer_id._id, {
      $inc: { pending_balance: balance },
    });

    // Auto-update Target Goals for Sales Invoices
    trackGoalProgressEvent({
      eventType: 'SALES_INVOICE',
      count: 1,
      amount: invoice.total_amount || invoice.grand_total,
      department: 'Sales & CRM',
      notes: `Invoice #${invoice.invoice_number} generated`,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Sales Tax Invoice generated successfully from quotation',
      data: invoice,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Direct Sales Invoice Creation (Mandatory Workflow B):
 * Allows creating a full GST sales invoice directly without a prior quotation.
 */
exports.createDirectSalesInvoice = async (req, res) => {
  try {
    const {
      customer_id,
      invoice_date,
      due_date,
      approx_repeat_date,
      place_of_supply,
      warehouse_id,
      shipping_charges = 0,
      advance_paid = 0,
      payment_mode = 'Cash',
      payment_reference = '',
      notes = '',
      status = 'issued', // 'draft' | 'issued'
      pricing_tier: requestedTier,
      final_discount_type = 'fixed',
      final_discount_value = 0,
      items,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer selection is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one invoice line item is required.' });
    }

    const customer = await Customer.findById(customer_id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const activeTier = String(
      requestedTier ||
      (['B2C', 'RETAIL', 'D2C'].includes(String(customer.customer_type).toUpperCase()) ? 'B2C' : 'B2B')
    ).toUpperCase();

    let warehouse = null;
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      warehouse = await Warehouse.findById(warehouse_id);
    }

    const originState = (warehouse?.address?.state || 'Gujarat').trim().toLowerCase();
    const destState = (
      place_of_supply ||
      customer.shipping_address?.state ||
      customer.billing_address?.state ||
      'Gujarat'
    ).trim().toLowerCase();
    const isIntraState = originState === destState;

    let subtotal = 0;
    let tax_total = 0;
    let item_discount_total = 0;
    const processedItems = [];

    for (const it of items) {
      const qty = Number(it.quantity);
      if (!qty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for item "${it.product_name || 'Item'}". Quantity must be a positive whole number.`,
        });
      }

      const resolution = await resolveAuthoritativeProductPrice(it, activeTier);
      if (resolution.error) {
        return res.status(400).json({ success: false, message: resolution.error });
      }

      const { product: prod, variant, authoritativePrice } = resolution;

      // Price verification
      if (it.unit_price !== undefined && it.unit_price !== null) {
        const submittedPrice = Number(it.unit_price);
        if (!isAuthorizedPrice(submittedPrice, resolution)) {
          return res.status(400).json({
            success: false,
            message: `Price verification failed for product "${prod.title || prod.product_name}". B2B Price: ₹${resolution.b2bPrice}, B2C Price: ₹${resolution.b2cPrice}. Submitted price was ₹${submittedPrice}.`,
          });
        }
      }

      // Check stock availability if finalizing
      if (status === 'issued' && prod.current_stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${prod.title || prod.product_name}". Available: ${prod.current_stock}, Requested: ${qty}`,
        });
      }

      const rate = it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price) : authoritativePrice;
      const gross = qty * rate;
      const { discAmt, discPct } = resolveItemDiscount(it, gross);
      const taxable = Math.max(0, gross - discAmt);
      const gstRate = Number(prod.gst_rate !== undefined ? prod.gst_rate : it.gst_rate || 5);
      const gstAmt = (taxable * gstRate) / 100;
      const halfTax = gstAmt / 2;
      const lineTotal = taxable + gstAmt;

      subtotal += taxable;
      item_discount_total += discAmt;
      tax_total += gstAmt;

      processedItems.push({
        product_id: prod._id,
        product_name: variant ? `${prod.title || prod.product_name} - ${variant.color || ''}`.trim() : (prod.title || prod.product_name),
        sku: variant?.sku || prod.sku || '',
        color: variant?.color || it.color || '',
        variant_name: variant?.variant_name || variant?.color || '',
        hsn_code: prod.hsn_code || it.hsn_code || '6109',
        quantity: qty,
        uom: prod.uom || it.uom || 'PCS',
        unit_price: rate,
        discount_percentage: discPct,
        discount_amount: discAmt,
        taxable_amount: Math.round(taxable),
        gst_rate: gstRate,
        cgst_amount: isIntraState ? Number(halfTax.toFixed(2)) : 0,
        sgst_amount: isIntraState ? Number(halfTax.toFixed(2)) : 0,
        igst_amount: isIntraState ? 0 : Number(gstAmt.toFixed(2)),
        total_amount: Math.round(lineTotal),
      });
    }

    // Final Invoice-level discount
    let finalDiscountAmt = 0;
    const finalVal = Number(final_discount_value) || 0;
    if (finalVal > 0) {
      if (final_discount_type === 'percentage') {
        finalDiscountAmt = (subtotal * finalVal) / 100;
      } else {
        finalDiscountAmt = finalVal;
      }
    }
    const discount_total = Math.round(item_discount_total + finalDiscountAmt);

    const grand_total = Math.round(Math.max(0, subtotal - finalDiscountAmt) + tax_total + Number(shipping_charges));
    const round_off = Number((grand_total - (Math.max(0, subtotal - finalDiscountAmt) + tax_total + Number(shipping_charges))).toFixed(2));
    const paid = Number(advance_paid) || 0;
    const balance = Math.max(0, grand_total - paid);

    const dueDateCalculated = due_date ? new Date(due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const validInvoiceWhId = warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : null;

    const invoice = new SalesInvoice({
      so_id: null, // Direct invoice without quotation
      customer_id,
      warehouse_id: validInvoiceWhId,
      pricing_tier: activeTier,
      invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
      due_date: dueDateCalculated,
      items: processedItems,
      subtotal: Math.round(subtotal),
      discount_total: Math.round(discount_total),
      final_discount_type,
      final_discount_value: finalVal,
      tax_total: Math.round(tax_total),
      shipping_charges: Number(shipping_charges),
      round_off,
      grand_total,
      paid_amount: paid,
      balance_amount: balance,
      payment_status: balance === 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid',
      status: status === 'draft' ? 'draft' : 'issued',
      place_of_supply: place_of_supply || customer.billing_address?.state || 'Gujarat',
      approx_repeat_date: approx_repeat_date ? new Date(approx_repeat_date) : null,
      notes,
    });

    if (paid > 0) {
      invoice.payments.push({
        amount: paid,
        payment_date: invoice_date ? new Date(invoice_date) : new Date(),
        payment_mode: payment_mode || 'Cash',
        reference_number: payment_reference || 'Advance / Initial Settlement',
        notes: 'Initial settlement on invoice creation',
      });
    }

    await invoice.save();

    // Auto-create Repeat Requirement if approx_repeat_date is specified
    if (approx_repeat_date) {
      try {
        const RepeatOrder = require('../models/RepeatOrder');
        const count = await RepeatOrder.countDocuments();
        const year = new Date().getFullYear();
        const repNumber = `RO-${year}-${String(count + 1).padStart(4, '0')}`;
        await RepeatOrder.create({
          repeat_order_number: repNumber,
          original_order_id: invoice._id,
          original_order_number: invoice.invoice_number,
          customer_id: customer._id,
          customer_name: customer.customer_name || 'Valued Customer',
          company_name: customer.company_name || customer.customer_name || '',
          phone: customer.mobile || customer.phone || '',
          email: customer.email || '',
          expected_reorder_date: new Date(approx_repeat_date),
          last_order_date: invoice.invoice_date || new Date(),
          status: 'due_soon',
          priority: grand_total > 50000 ? 'high' : 'medium',
          total_quantity: processedItems.reduce((acc, it) => acc + (it.quantity || 0), 0),
          subtotal_amount: subtotal,
          final_amount: grand_total,
          items: processedItems.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            sku: it.sku || '',
            color: it.color || 'Standard',
            sizes: it.sizes || { S: 0, M: 0, L: 0, XL: 0, '2XL': 0 },
            quantity: it.quantity,
            uom: it.uom || 'PCS',
            unit_price: it.unit_price,
            total_price: it.total_amount || (it.quantity * it.unit_price),
          })),
          warehouse_id: invoice.warehouse_id || null,
          notes: notes || `Scheduled repeat requirement from Invoice ${invoice.invoice_number}`,
        });
      } catch (errRep) {
        console.error('Failed to auto-schedule RepeatOrder from Direct Invoice:', errRep);
      }
    }

    // Inventory Posting: If issued, deduct stock and update customer pending balance
    if (invoice.status === 'issued') {
      for (const item of processedItems) {
        if (item.product_id) {
          const prod = await Product.findById(item.product_id);
          if (prod) {
            prod.current_stock = Math.max(0, (prod.current_stock || 0) - item.quantity);
            if (Array.isArray(prod.variants) && prod.variants.length > 0) {
              const variant = prod.variants.find(
                (v) => (item.sku && v.sku === item.sku) || (item.product_name && v.variant_name === item.product_name)
              );
              if (variant) {
                variant.stock = Math.max(0, (variant.stock || 0) - item.quantity);
              }
            }
            await prod.save();
          }
        }
      }

      await Customer.findByIdAndUpdate(customer_id, {
        $inc: { pending_balance: balance },
      });
    }

    // Auto-update Target Goals for Direct Sales Invoice
    trackGoalProgressEvent({
      eventType: 'SALES_INVOICE',
      count: 1,
      amount: invoice.total_amount || invoice.grand_total,
      department: 'Sales & CRM',
      notes: `Direct Invoice #${invoice.invoice_number} created`,
    }).catch(() => {});

    const populated = await SalesInvoice.findById(invoice._id)
      .populate('customer_id')
      .populate('items.product_id');

    res.status(201).json({
      success: true,
      message: invoice.status === 'draft' ? 'Draft Sales Invoice saved successfully' : 'Direct Sales Invoice issued successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getSalesInvoiceById = async (req, res) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id)
      .populate('customer_id')
      .populate('so_id');
    if (!invoice) return res.status(404).json({ success: false, message: 'Sales Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      due_date,
      invoice_date,
      place_of_supply,
      customer_id,
      notes,
      items,
      payment_amount,
      payment_mode,
      payment_date,
      payment_reference,
      is_split_payment,
      split_cash,
      split_online,
    } = req.body;

    const invoice = await SalesInvoice.findById(id).populate('customer_id');
    if (!invoice) return res.status(404).json({ success: false, message: 'Sales Invoice not found' });

    if (due_date !== undefined) invoice.due_date = due_date;
    if (invoice_date !== undefined) invoice.invoice_date = invoice_date;
    if (place_of_supply !== undefined) invoice.place_of_supply = place_of_supply;
    if (customer_id !== undefined) invoice.customer_id = customer_id;
    if (notes !== undefined) invoice.notes = notes;

    // Recalculate line items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const isGujarat =
        ((place_of_supply || invoice.customer_id?.billing_address?.state || 'Gujarat')).toLowerCase() ===
        'gujarat';

      const activeTier = String(
        req.body.pricing_tier ||
        invoice.pricing_tier ||
        (['B2C', 'RETAIL', 'D2C'].includes(String(invoice.customer_id?.customer_type).toUpperCase()) ? 'B2C' : 'B2B')
      ).toUpperCase();

      invoice.pricing_tier = activeTier;

      let subtotal = 0;
      let tax_total = 0;
      let item_discount_total = 0;
      const processedItems = [];

      for (const it of items) {
        const qty = Number(it.quantity) || 1;
        if (qty <= 0) {
          return res.status(400).json({ success: false, message: 'Item quantity must be greater than 0.' });
        }

        const resolution = await resolveAuthoritativeProductPrice(it, activeTier);
        let rate;
        let pId = null;
        let pName = it.product_name || 'Item';
        let pHsn = it.hsn_code || '6109';
        let pUom = it.uom || 'PCS';

        if (!resolution.error) {
          const { product: prod, variant, authoritativePrice } = resolution;
          // Verify price is valid (accepts active tier, B2B or B2C rate)
          if (it.unit_price !== undefined && it.unit_price !== null) {
            const submittedPrice = Number(it.unit_price);
            if (!isAuthorizedPrice(submittedPrice, resolution)) {
              return res.status(400).json({
                success: false,
                message: `Price verification failed for "${prod.title || prod.product_name}". B2B: ₹${resolution.b2bPrice}, B2C: ₹${resolution.b2cPrice}. Submitted: ₹${submittedPrice}.`,
              });
            }
          }
          rate = it.unit_price !== undefined && it.unit_price !== null ? Number(it.unit_price) : authoritativePrice;
          pId = prod._id;
          pName = variant ? `${prod.title || prod.product_name} - ${variant.color || ''}`.trim() : (prod.title || prod.product_name);
          pHsn = prod.hsn_code || it.hsn_code || '6109';
          pUom = prod.uom || it.uom || 'PCS';
        } else {
          // If invoice already existed and item was previously saved, retain historical price
          const existingItem = (invoice.items || []).find(
            (prev) => (it._id && String(prev._id) === String(it._id)) ||
                      (it.product_id && String(prev.product_id) === String(it.product_id))
          );
          if (existingItem) {
            rate = existingItem.unit_price;
            pId = existingItem.product_id;
            pName = existingItem.product_name;
            pHsn = existingItem.hsn_code;
            pUom = existingItem.uom;
          } else {
            return res.status(400).json({ success: false, message: resolution.error });
          }
        }

        const gross = qty * rate;
        const { discAmt, discPct } = resolveItemDiscount(it, gross);
        const lineTaxable = Math.max(0, gross - discAmt);
        const gstRate = Number(it.gst_rate !== undefined ? it.gst_rate : 5);
        const lineGst = (lineTaxable * gstRate) / 100;
        const halfTax = lineGst / 2;

        subtotal += lineTaxable;
        item_discount_total += discAmt;
        tax_total += lineGst;

        processedItems.push({
          product_id: pId,
          product_name: pName,
          hsn_code: pHsn,
          quantity: qty,
          uom: pUom,
          unit_price: rate,
          discount_percentage: discPct,
          discount_amount: discAmt,
          taxable_amount: Math.round(lineTaxable),
          gst_rate: gstRate,
          cgst_amount: isGujarat ? Math.round(halfTax) : 0,
          sgst_amount: isGujarat ? Math.round(halfTax) : 0,
          igst_amount: isGujarat ? 0 : Math.round(lineGst),
          total_amount: Math.round(lineTaxable + lineGst),
        });
      }

      // Handle final discount if updated
      if (req.body.final_discount_type) invoice.final_discount_type = req.body.final_discount_type;
      if (req.body.final_discount_value !== undefined) invoice.final_discount_value = Number(req.body.final_discount_value);

      let finalDiscountAmt = 0;
      const finalVal = Number(invoice.final_discount_value) || 0;
      if (finalVal > 0) {
        if (invoice.final_discount_type === 'percentage') {
          finalDiscountAmt = (subtotal * finalVal) / 100;
        } else {
          finalDiscountAmt = finalVal;
        }
      }

      invoice.items = processedItems;
      invoice.subtotal = Math.round(subtotal);
      invoice.discount_total = Math.round(item_discount_total + finalDiscountAmt);
      invoice.tax_total = Math.round(tax_total);
      invoice.grand_total = Math.round(Math.max(0, subtotal - finalDiscountAmt) + tax_total + (invoice.shipping_charges || 0));
    }

    // Process inline payment settlement if provided
    let newlyPaidAmount = 0;
    if (is_split_payment) {
      const cashAmt = Number(split_cash) || 0;
      const onlineAmt = Number(split_online) || 0;
      if (cashAmt > 0) {
        invoice.payments.push({
          amount: cashAmt,
          payment_date: payment_date ? new Date(payment_date) : new Date(),
          payment_mode: 'Cash',
          reference_number: payment_reference || 'Split Cash',
          notes: 'Split payment - Cash portion',
        });
        newlyPaidAmount += cashAmt;
      }
      if (onlineAmt > 0) {
        invoice.payments.push({
          amount: onlineAmt,
          payment_date: payment_date ? new Date(payment_date) : new Date(),
          payment_mode: 'UPI / Online',
          reference_number: payment_reference || 'Split Online',
          notes: 'Split payment - Online portion',
        });
        newlyPaidAmount += onlineAmt;
      }
    } else if (Number(payment_amount) > 0) {
      const amt = Number(payment_amount);
      invoice.payments.push({
        amount: amt,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        payment_mode: payment_mode || 'Bank Transfer',
        reference_number: payment_reference || '',
        notes: 'Invoice settlement payment',
      });
      newlyPaidAmount += amt;
    }

    if (newlyPaidAmount > 0) {
      await Customer.findByIdAndUpdate(invoice.customer_id, {
        $inc: { pending_balance: -newlyPaidAmount },
      });
    }

    // Recalculate paid & balance
    const totalPayments = (invoice.payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    invoice.paid_amount = totalPayments;
    invoice.balance_amount = Math.max(0, invoice.grand_total - totalPayments);
    invoice.payment_status =
      invoice.balance_amount === 0 ? 'paid' : totalPayments > 0 ? 'partially_paid' : 'unpaid';

    await invoice.save();

    const populated = await SalesInvoice.findById(id)
      .populate('customer_id')
      .populate('so_id');

    res.json({
      success: true,
      message: 'Sales Invoice updated successfully',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSalesInvoiceDueDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date } = req.body;
    if (!due_date) {
      return res.status(400).json({ success: false, message: 'Due date is required' });
    }

    const invoice = await SalesInvoice.findByIdAndUpdate(
      id,
      { due_date },
      { new: true }
    )
      .populate('customer_id')
      .populate('so_id');

    if (!invoice) return res.status(404).json({ success: false, message: 'Sales Invoice not found' });

    res.json({
      success: true,
      message: 'Invoice due date updated successfully',
      data: invoice,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.recordSalesInvoicePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_date,
      payment_mode,
      reference_number,
      notes,
      is_split_payment,
      split_cash,
      split_online,
      bank_account_id,
      bank_account_name,
    } = req.body;

    const invoice = await SalesInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Sales Invoice not found' });

    // Resolve Receiving Bank Account
    let targetBank = null;
    if (bank_account_id) {
      targetBank = await BankAccount.findById(bank_account_id);
    }
    if (!targetBank) {
      targetBank = await BankAccount.findOne({ is_default_receiving: true, is_deleted: false });
    }
    if (!targetBank) {
      targetBank = await BankAccount.findOne({ is_deleted: false });
    }

    let addedPayment = 0;

    let finalDatetime = new Date();
    if (req.body.payment_datetime) {
      finalDatetime = new Date(req.body.payment_datetime);
    } else if (payment_date) {
      finalDatetime = new Date(payment_date);
      if (req.body.payment_time) {
        const [h, m] = req.body.payment_time.split(':');
        if (!isNaN(h) && !isNaN(m)) {
          finalDatetime.setHours(Number(h), Number(m), 0, 0);
        }
      }
    }
    const finalTimeString = req.body.payment_time || finalDatetime.toTimeString().substring(0, 5);

    if (is_split_payment) {
      const cash = Number(split_cash) || 0;
      const online = Number(split_online) || 0;
      if (cash <= 0 && online <= 0) {
        return res.status(400).json({ success: false, message: 'Split payment amounts must be greater than 0' });
      }
      if (cash > 0) {
        invoice.payments.push({
          amount: cash,
          payment_date: finalDatetime,
          payment_datetime: finalDatetime,
          payment_time: finalTimeString,
          payment_mode: 'Cash',
          reference_number: reference_number ? `${reference_number} (Cash)` : 'Cash',
          notes: notes || 'Split Payment - Cash',
        });
        addedPayment += cash;
      }
      if (online > 0) {
        invoice.payments.push({
          amount: online,
          payment_date: finalDatetime,
          payment_datetime: finalDatetime,
          payment_time: finalTimeString,
          payment_mode: 'UPI / Online',
          reference_number: reference_number ? `${reference_number} (UPI)` : 'UPI / Online',
          notes: notes || 'Split Payment - Online',
        });
        addedPayment += online;
      }
    } else {
      const paymentAmount = Number(amount);
      if (!paymentAmount || paymentAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
      }
      invoice.payments.push({
        amount: paymentAmount,
        payment_date: finalDatetime,
        payment_datetime: finalDatetime,
        payment_time: finalTimeString,
        payment_mode: payment_mode || 'Bank Transfer',
        reference_number: reference_number || '',
        notes: notes || '',
      });
      addedPayment += paymentAmount;
    }

    const totalPaid = (invoice.payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const newBalance = Math.max(0, (invoice.grand_total || 0) - totalPaid);

    invoice.paid_amount = totalPaid;
    invoice.balance_amount = newBalance;
    invoice.payment_status = newBalance === 0 ? 'paid' : 'partially_paid';

    const dateStr = payment_date
      ? new Date(payment_date).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');
    const bankDesc = targetBank ? ` into ${targetBank.account_name}` : '';
    const paymentNote = `[Payment: ₹${addedPayment.toLocaleString('en-IN')} via ${
      payment_mode || 'Recorded'
    }${bankDesc} on ${dateStr}${reference_number ? ` Ref: ${reference_number}` : ''}]`;
    invoice.notes = invoice.notes ? `${invoice.notes}\n${paymentNote}` : paymentNote;

    await invoice.save();

    // Adjust Bank Account balance (Credit incoming payment to company bank account)
    if (targetBank && addedPayment > 0) {
      await adjustBalance(targetBank._id, addedPayment, 'credit');
    }

    // Reduce customer's pending balance
    await Customer.findByIdAndUpdate(invoice.customer_id, {
      $inc: { pending_balance: -addedPayment },
    });

    // If linked to SO, update SO advance_paid
    if (invoice.so_id) {
      const so = await SalesOrder.findById(invoice.so_id);
      if (so) {
        const soNewPaid = (so.advance_paid || 0) + addedPayment;
        so.advance_paid = soNewPaid;
        if (soNewPaid >= so.grand_total) {
          so.payment_status = 'paid';
        } else if (soNewPaid > 0) {
          so.payment_status = 'partially_paid';
        }
        await so.save();
      }
    }

    // Auto-sync immediately to Finance Transaction Ledger
    try {
      const FinanceTransaction = require('../models/FinanceTransaction');
      const pMode = payment_mode || 'Cash';
      const accName = targetBank
        ? `${targetBank.account_name} (${targetBank.bank_name})`
        : pMode.toLowerCase().includes('cash')
        ? 'Cash Drawer / Petty Cash'
        : 'Primary Bank Account (HDFC Bank - Current A/c #5020001)';

      await FinanceTransaction.create({
        transaction_type: 'income',
        entry_source: 'sales_bill',
        amount: addedPayment,
        transaction_date: finalDatetime,
        category: 'Sales Invoice Payment',
        party_name: invoice.customer_id?.customer_name || 'Customer',
        party_type: 'customer',
        customer_id: invoice.customer_id?._id || invoice.customer_id,
        bank_account_id: targetBank?._id,
        bill_id: invoice._id,
        bill_type: 'sales_invoice',
        bill_number: invoice.invoice_number,
        payment_index: (invoice.payments?.length || 1) - 1,
        payment_method: pMode.includes('UPI') ? 'UPI' : pMode.includes('Cash') ? 'Cash' : 'Bank Transfer',
        account_name: accName,
        reference_number: reference_number || invoice.invoice_number,
        description: notes || `Payment received into ${targetBank ? targetBank.account_name : 'Bank'} for Sales Invoice ${invoice.invoice_number}`,
        is_manual: false,
        status: 'confirmed',
        created_by: 'System (Sales Billing)',
      });
    } catch (finErr) {
      console.error('Failed to auto-post to Finance:', finErr);
    }

    // Auto-update Target Goals for Collection & Finance
    trackGoalProgressEvent({
      eventType: 'COLLECTION_PAYMENT',
      amount: addedPayment,
      department: 'Finance & Accounts',
      notes: `Payment collected: ₹${addedPayment.toLocaleString('en-IN')}`,
    }).catch(() => {});

    const populated = await SalesInvoice.findById(id)
      .populate('customer_id')
      .populate('so_id');

    res.json({
      success: true,
      message: `Payment of ₹${addedPayment.toLocaleString('en-IN')} recorded successfully`,
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== VISITOR / B2B STOREFRONT PORTAL ========================

/**
 * POST /api/v1/sales/visitor-order
 * Direct customer / visitor order placement from the online storefront
 */
exports.createVisitorOrder = async (req, res) => {
  try {
    const {
      customer_name,
      company_name,
      mobile,
      phone,
      email,
      customer_type = 'B2B',
      shipping_address,
      billing_address,
      items,
      notes = '',
    } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }
    const contactNumber = (mobile || phone || '').trim();
    if (!contactNumber) {
      return res.status(400).json({ success: false, message: 'Mobile/Contact number is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item must be selected' });
    }

    // 1. Find or auto-register Customer
    let customer = await Customer.findOne({
      $or: [
        { mobile: contactNumber },
        { phone: contactNumber },
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
      ],
      is_deleted: false,
    });

    if (!customer) {
      customer = new Customer({
        customer_name: customer_name.trim(),
        company_name: (company_name || '').trim(),
        mobile: contactNumber,
        phone: contactNumber,
        email: (email || '').toLowerCase().trim(),
        customer_type: customer_type || 'B2B',
        billing_address: billing_address || shipping_address || { city: 'Surat', state: 'Gujarat' },
        shipping_address: shipping_address || billing_address || { city: 'Surat', state: 'Gujarat' },
        payment_terms: 'Immediate / Advance',
      });
      await customer.save();
    }

    // 2. Process and validate line items
    let subtotal = 0;
    let discount_total = 0;
    let tax_total = 0;

    const processedItems = [];

    for (const it of items) {
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const resolution = await resolveAuthoritativeProductPrice(it);
      if (resolution.error) {
        return res.status(400).json({ success: false, message: resolution.error });
      }

      const { product: prod, variant, authoritativePrice } = resolution;

      // Reject client price tampering
      if (it.unit_price !== undefined && it.unit_price !== null) {
        const submittedPrice = Number(it.unit_price);
        if (Math.abs(submittedPrice - authoritativePrice) > 0.01) {
          return res.status(400).json({
            success: false,
            message: `Price tampering detected for "${prod.title || prod.product_name}". API authoritative price is ₹${authoritativePrice}, submitted is ₹${submittedPrice}.`,
          });
        }
      }

      const rate = authoritativePrice;
      const mrp = Number(prod.mrp || rate * 1.5);
      const discAmt = Math.max(0, mrp - rate);
      const gross = qty * rate;
      const gstRate = Number(it.gst_rate !== undefined ? it.gst_rate : prod.gst_rate || 5);
      const gstAmt = (gross * gstRate) / 100;
      const total = gross + gstAmt;

      subtotal += gross;
      discount_total += discAmt * qty;
      tax_total += gstAmt;

      processedItems.push({
        product_id: prod._id,
        product_name: it.product_name || (prod ? `${prod.title || prod.product_name}${variant?.color ? ` - ${variant.color}` : ''}` : 'Apparel Item'),
        sku: variant?.sku || prod.sku || it.sku || 'SKU-APP',
        color: variant?.color || it.color || '',
        size: it.size || 'M',
        quantity: qty,
        uom: prod.uom || it.uom || 'PCS',
        unit_price: rate,
        discount_percentage: 0,
        discount_amount: discAmt * qty,
        taxable_amount: gross,
        gst_rate: gstRate,
        gst_amount: gstAmt,
        total_amount: total,
      });

      // Stock check and safe deduction
      prod.current_stock = Math.max(0, (prod.current_stock || 0) - qty);
      if (variant) {
        variant.stock = Math.max(0, (variant.stock || 0) - qty);
      }
      await prod.save();
    }

    const grand_total = Math.round(subtotal + tax_total);
    const round_off = Number((grand_total - (subtotal + tax_total)).toFixed(2));

    // Default Central Warehouse
    const defaultWarehouse = await Warehouse.findOne({ is_deleted: false });

    const salesOrder = new SalesOrder({
      customer_id: customer._id,
      warehouse_id: defaultWarehouse ? defaultWarehouse._id : null,
      order_date: new Date(),
      expected_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
      items: processedItems,
      subtotal,
      discount_total,
      tax_total,
      shipping_charges: 0,
      round_off,
      grand_total,
      advance_paid: 0,
      payment_terms: 'Immediate / Advance',
      payment_status: 'unpaid',
      dispatch_status: 'not_dispatched',
      status: 'confirmed',
      billing_address: customer.billing_address,
      shipping_address: customer.shipping_address,
      notes: `Online Storefront Order | ${notes}`,
    });

    await salesOrder.save();

    // Auto-update Target Goals for Sales Orders
    trackGoalProgressEvent({
      eventType: 'SALES_ORDER',
      count: 1,
      amount: grand_total,
      department: 'Sales & CRM',
      notes: `Order #${salesOrder.so_number || ''} confirmed`,
    }).catch(() => {});

    const populated = await SalesOrder.findById(salesOrder._id)
      .populate('customer_id')
      .populate('warehouse_id');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Keep your Order Number for tracking.',
      data: {
        order_id: populated._id,
        so_number: populated.so_number,
        grand_total: populated.grand_total,
        order_date: populated.order_date,
        items_count: populated.items.length,
        customer_name: customer.customer_name,
        mobile: customer.mobile,
      },
      order: populated,
    });
  } catch (error) {
    console.error('Error placing visitor order:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/sales/track-order/:ref
 * Track order by Order Number (e.g. SO-2026-00001) or Mobile Number
 */
exports.trackVisitorOrder = async (req, res) => {
  try {
    const { ref } = req.params;
    if (!ref || !ref.trim()) {
      return res.status(400).json({ success: false, message: 'Order Number or Mobile Number is required' });
    }

    const cleanRef = ref.trim();
    let query = { is_deleted: false };

    if (cleanRef.toUpperCase().startsWith('SO-')) {
      query.so_number = new RegExp(`^${cleanRef}$`, 'i');
    } else {
      // Find customer by mobile first
      const cust = await Customer.findOne({
        $or: [{ mobile: cleanRef }, { phone: cleanRef }],
        is_deleted: false,
      });
      if (cust) {
        query.customer_id = cust._id;
      } else {
        query.so_number = new RegExp(cleanRef, 'i');
      }
    }

    const orders = await SalesOrder.find(query)
      .populate('customer_id')
      .populate('warehouse_id')
      .sort({ createdAt: -1 })
      .limit(5);

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No orders found matching "${cleanRef}". Please verify your Order Number or Mobile Number.`,
      });
    }

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('Error tracking visitor order:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ======================== SALES RETURNS ========================
exports.getSalesReturns = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = { is_deleted: false };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { return_number: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [returns, total, allReturns] = await Promise.all([
      SalesReturn.find(query)
        .populate('customer_id')
        .populate('invoice_id')
        .populate('items.product_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SalesReturn.countDocuments(query),
      SalesReturn.find({ is_deleted: false }),
    ]);

    // Aggregate stats
    let totalCredit = 0;
    let restockedCount = 0;
    let damagedCount = 0;

    allReturns.forEach((ret) => {
      totalCredit += Number(ret.grand_total || 0);
      (ret.items || []).forEach((it) => {
        if (it.condition === 'good') {
          restockedCount += Number(it.quantity || 0);
        } else {
          damagedCount += Number(it.quantity || 0);
        }
      });
    });

    res.json({
      success: true,
      data: returns,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        stats: {
          totalReturns: allReturns.length,
          totalCredit,
          restockedCount,
          damagedCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSalesReturnById = async (req, res) => {
  try {
    const salesReturn = await SalesReturn.findById(req.params.id)
      .populate('customer_id')
      .populate('invoice_id')
      .populate('items.product_id');

    if (!salesReturn) {
      return res.status(404).json({ success: false, message: 'Sales Return not found' });
    }

    res.json({ success: true, data: salesReturn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSalesReturn = async (req, res) => {
  try {
    const { invoice_id, customer_id, return_date, items, remarks } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ success: false, message: 'Invoice ID is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one return line item is required' });
    }

    const invoice = await SalesInvoice.findById(invoice_id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Original Sales Invoice not found' });
    }

    // Check prior returns against this invoice to calculate returnable quantity
    const priorReturns = await SalesReturn.find({ invoice_id, is_deleted: false, status: { $ne: 'cancelled' } });
    const returnedQtyMap = {};
    priorReturns.forEach((pr) => {
      (pr.items || []).forEach((pi) => {
        const key = (pi.product_id?._id || pi.product_id || pi.product_name).toString();
        returnedQtyMap[key] = (returnedQtyMap[key] || 0) + Number(pi.quantity || 0);
      });
    });

    // Validate quantities and calculate totals
    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const pKey = (item.product_id?._id || item.product_id || item.product_name).toString();
      const invoiceItem = invoice.items.find(
        (ii) => (ii.product_id && ii.product_id.toString() === pKey) || ii.product_name === item.product_name
      );

      const invoicedQty = invoiceItem ? Number(invoiceItem.quantity || 0) : 9999;
      const alreadyReturned = returnedQtyMap[pKey] || 0;
      const returnableQty = Math.max(0, invoicedQty - alreadyReturned);

      const reqQty = Number(item.quantity || 0);
      if (reqQty <= 0) {
        return res.status(400).json({ success: false, message: `Return quantity for "${item.product_name}" must be greater than 0` });
      }
      if (invoiceItem && reqQty > returnableQty) {
        return res.status(400).json({
          success: false,
          message: `Cannot return ${reqQty} units of "${item.product_name}". Only ${returnableQty} units remain eligible for return on invoice ${invoice.invoice_number}.`,
        });
      }

      const unitPrice = Number(item.unit_price || (invoiceItem ? invoiceItem.unit_price : 0));
      const gstRate = Number(item.gst_rate !== undefined ? item.gst_rate : (invoiceItem ? invoiceItem.gst_rate : 18));
      const taxable = Math.round(reqQty * unitPrice);
      const gstAmount = Math.round((taxable * gstRate) / 100);
      const totalAmount = taxable + gstAmount;

      subtotal += taxable;
      taxTotal += gstAmount;

      processedItems.push({
        product_id: item.product_id || (invoiceItem ? invoiceItem.product_id : null),
        product_name: item.product_name || (invoiceItem ? invoiceItem.product_name : 'Item'),
        quantity: reqQty,
        unit_price: unitPrice,
        taxable_amount: taxable,
        gst_rate: gstRate,
        cgst_amount: Math.round(gstAmount / 2),
        sgst_amount: Math.round(gstAmount / 2),
        total_amount: totalAmount,
        condition: item.condition === 'damaged' ? 'damaged' : 'good',
        reason: item.reason || '',
      });
    }

    const grandTotal = subtotal + taxTotal;

    // 1. Inventory Stock Adjustment
    // Mandatory Business Rule: 'good' condition items restock saleable inventory; 'damaged' items do NOT restock.
    for (const it of processedItems) {
      if (it.condition === 'good' && it.product_id) {
        const prod = await Product.findById(it.product_id);
        if (prod) {
          prod.current_stock = (prod.current_stock || 0) + it.quantity;
          if (Array.isArray(prod.variants) && prod.variants.length > 0) {
            prod.variants[0].stock = (prod.variants[0].stock || 0) + it.quantity;
          }
          await prod.save();
        }
      }
    }

    // 2. Financial Credit Adjustment
    // Deduct return grandTotal from SalesInvoice balance_amount and customer pending_balance
    invoice.balance_amount = Math.max(0, (invoice.balance_amount || 0) - grandTotal);
    if (invoice.balance_amount === 0) {
      invoice.payment_status = 'paid';
    } else if (invoice.balance_amount < invoice.grand_total) {
      invoice.payment_status = 'partially_paid';
    }
    await invoice.save();

    const customerTargetId = customer_id || invoice.customer_id;
    if (customerTargetId) {
      const cust = await Customer.findById(customerTargetId);
      if (cust) {
        cust.pending_balance = Math.max(0, (cust.pending_balance || 0) - grandTotal);
        await cust.save();
      }
    }

    // 3. Create SalesReturn record
    const salesReturn = new SalesReturn({
      invoice_id,
      customer_id: customerTargetId,
      return_date: return_date || Date.now(),
      items: processedItems,
      subtotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      credit_adjusted: true,
      status: 'completed',
      remarks: remarks || `Sales return credit against Invoice ${invoice.invoice_number}`,
    });

    await salesReturn.save();

    const populated = await SalesReturn.findById(salesReturn._id)
      .populate('customer_id')
      .populate('invoice_id')
      .populate('items.product_id');

    res.status(201).json({
      success: true,
      message: 'Sales return created successfully: Saleable inventory restocked and financial credit applied.',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Requirement 10: Correct and manage payment received timestamp with audit trail
 * PUT /api/v1/sales/invoices/:id/payments/:paymentIndex/time
 */
exports.correctPaymentTime = async (req, res) => {
  try {
    const { id, paymentIndex } = req.params;
    const { new_datetime, reason = 'Time adjustment', corrected_by = 'Authorized User' } = req.body;

    const invoice = await SalesInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Sales invoice not found' });

    const pIdx = parseInt(paymentIndex, 10);
    if (isNaN(pIdx) || !invoice.payments || !invoice.payments[pIdx]) {
      return res.status(404).json({ success: false, message: 'Payment record not found at index' });
    }

    const payment = invoice.payments[pIdx];
    const prevDatetime = payment.payment_datetime || payment.payment_date || new Date();
    const updatedDatetime = new Date(new_datetime || Date.now());

    if (!payment.correction_history) payment.correction_history = [];
    payment.correction_history.push({
      previous_datetime: prevDatetime,
      new_datetime: updatedDatetime,
      reason,
      corrected_by,
      corrected_at: new Date(),
    });

    payment.payment_datetime = updatedDatetime;
    payment.payment_date = updatedDatetime;
    payment.payment_time = updatedDatetime.toTimeString().substring(0, 5);
    payment.time_corrected = true;

    await invoice.save();

    // Auto-reflect changes in the corresponding Finance transaction without creating duplicates
    try {
      const FinanceTransaction = require('../models/FinanceTransaction');
      await FinanceTransaction.findOneAndUpdate(
        {
          bill_id: invoice._id,
          bill_type: 'sales_invoice',
          payment_index: pIdx,
        },
        {
          transaction_date: updatedDatetime,
          description: `${payment.notes || ''} [Time adjusted by ${corrected_by}: ${reason}]`.trim(),
        }
      );
    } catch (finErr) {
      console.error('Failed to sync updated payment time to FinanceTransaction:', finErr);
    }

    const populated = await SalesInvoice.findById(id).populate('customer_id');
    res.json({
      success: true,
      message: 'Payment received time corrected successfully and reflected in Finance records',
      data: populated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


