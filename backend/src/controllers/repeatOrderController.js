const mongoose = require('mongoose');
const RepeatOrder = require('../models/RepeatOrder');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const SalesInvoice = require('../models/SalesInvoice');
const Warehouse = require('../models/Warehouse');

/**
 * Helper to generate unique Repeat Order Code
 */
async function generateRepeatOrderNumber() {
  const count = await RepeatOrder.countDocuments();
  const year = new Date().getFullYear();
  return `RPT-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Ensure initial realistic sample repeat order data exists for demo/ERP usage
 */
async function ensureSampleRepeatOrders() {
  const count = await RepeatOrder.countDocuments({ is_deleted: false });
  if (count > 0) return;

  const [customers, products, warehouses, invoices] = await Promise.all([
    Customer.find({ is_deleted: false }).limit(6),
    Product.find({ is_deleted: false }).limit(6),
    Warehouse.find({ is_deleted: false }).limit(3),
    SalesInvoice.find({ is_deleted: false }).limit(6),
  ]);

  if (!customers.length || !products.length) return;

  const sampleConfigs = [
    {
      custIdx: 0,
      prodIdx: 0,
      freq: 30,
      daysAgo: 24,
      status: 'due_soon',
      priority: 'high',
      notes: 'Bi-monthly institutional re-order for Titan Polo Neck in Jet Black.',
      rep: 'Kavita Sharma',
      qty: 250,
      sizes: { S: 30, M: 75, L: 85, XL: 40, '2XL': 20 },
    },
    {
      custIdx: 1,
      prodIdx: 1 % products.length,
      freq: 45,
      daysAgo: 52,
      status: 'overdue',
      priority: 'high',
      notes: 'Expected re-order delayed by 7 days. Urgent outreach needed to avoid competitor switch.',
      rep: 'Rahul Mehta',
      qty: 400,
      sizes: { S: 50, M: 120, L: 130, XL: 60, '2XL': 40 },
    },
    {
      custIdx: 2,
      prodIdx: 2 % products.length,
      freq: 60,
      daysAgo: 50,
      status: 'contacted',
      priority: 'medium',
      notes: 'Pitched via WhatsApp. Client confirmed stock is low and reviewing summer sizes.',
      rep: 'Pooja Patel',
      qty: 150,
      sizes: { S: 20, M: 50, L: 50, XL: 20, '2XL': 10 },
      log: { channel: 'whatsapp', outcome: 'interested', summary: 'Sent size catalog on WhatsApp. Client requested 5% loyalty discount.' },
    },
    {
      custIdx: 3,
      prodIdx: 0,
      freq: 30,
      daysAgo: 29,
      status: 'confirmed',
      priority: 'high',
      notes: 'Repeat order confirmed over phone. Ready for dispatch invoicing.',
      rep: 'Aarav Shah',
      qty: 500,
      sizes: { S: 60, M: 160, L: 180, XL: 70, '2XL': 30 },
      log: { channel: 'phone', outcome: 'confirmed', summary: 'Customer finalized repeat order of 500 pcs.' },
    },
    {
      custIdx: 4,
      prodIdx: 1 % products.length,
      freq: 90,
      daysAgo: 85,
      status: 'invoiced',
      priority: 'normal',
      notes: 'Converted to Sales Invoice INV-8921. Dispatched from Mumbai Central Hub.',
      rep: 'Rahul Mehta',
      qty: 180,
      sizes: { S: 25, M: 55, L: 60, XL: 25, '2XL': 15 },
    },
  ];

  const now = Date.now();

  for (let i = 0; i < sampleConfigs.length; i++) {
    const cfg = sampleConfigs[i];
    const cust = customers[cfg.custIdx % customers.length];
    const prod = products[cfg.prodIdx % products.length];
    const wh = warehouses[i % warehouses.length];
    const inv = invoices[i % invoices.length];

    const lastDate = new Date(now - cfg.daysAgo * 86400000);
    const expectedDate = new Date(lastDate.getTime() + cfg.freq * 86400000);
    const unitPrice = Number(prod.price || prod.selling_rate || 450);
    const subtotal = unitPrice * cfg.qty;
    const discount = Math.round(subtotal * 0.05);
    const finalAmount = subtotal - discount;

    const comms = cfg.log
      ? [
          {
            date: new Date(now - 2 * 86400000),
            channel: cfg.log.channel,
            outcome: cfg.log.outcome,
            summary: cfg.log.summary,
            logged_by: cfg.rep,
          },
        ]
      : [];

    await RepeatOrder.create({
      repeat_order_number: `RPT-2026-${String(i + 1).padStart(4, '0')}`,
      original_order_id: inv?._id || null,
      original_order_number: inv?.invoice_number || `INV-2026-${100 + i}`,
      customer_id: cust._id,
      customer_name: cust.customer_name || 'Valued Client',
      company_name: cust.company_name || cust.customer_name,
      phone: cust.mobile || cust.phone || '+91 98765 43210',
      email: cust.email || 'orders@client.com',
      items: [
        {
          product_id: prod._id,
          product_name: prod.title || prod.product_name,
          sku: prod.sku || 'SKU-001',
          color: (prod.colors && prod.colors[0]?.name) || 'Jet Black',
          sizes: cfg.sizes,
          quantity: cfg.qty,
          unit_price: unitPrice,
          total_price: subtotal,
        },
      ],
      total_quantity: cfg.qty,
      subtotal_amount: subtotal,
      loyalty_discount_percent: 5,
      discount_amount: discount,
      final_amount: finalAmount,
      repeat_frequency_days: cfg.freq,
      last_order_date: lastDate,
      expected_reorder_date: expectedDate,
      actual_reorder_date: cfg.status === 'confirmed' || cfg.status === 'invoiced' ? new Date() : null,
      status: cfg.status,
      priority: cfg.priority,
      assigned_sales_rep: cfg.rep,
      warehouse_id: wh?._id || null,
      notes: cfg.notes,
      communications_log: comms,
    });
  }
}

/**
 * GET /api/v1/sales/repeat-orders/analytics
 * Executive KPI cards and pipeline insights
 */
exports.getAnalytics = async (req, res) => {
  try {
    await ensureSampleRepeatOrders();

    const allOrders = await RepeatOrder.find({ is_deleted: false });

    let totalRepeatRevenue = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;
    let confirmedCount = 0;
    let invoicedCount = 0;
    let totalItemsQuantity = 0;

    const now = new Date();

    allOrders.forEach((ro) => {
      totalRepeatRevenue += Number(ro.final_amount || 0);
      totalItemsQuantity += Number(ro.total_quantity || 0);

      if (ro.status === 'due_soon') dueSoonCount++;
      else if (ro.status === 'overdue') overdueCount++;
      else if (ro.status === 'confirmed') confirmedCount++;
      else if (ro.status === 'invoiced') invoicedCount++;
    });

    const activePipelineCount = dueSoonCount + overdueCount + confirmedCount;
    const repeatOrderRate = allOrders.length > 0 ? Math.round(((confirmedCount + invoicedCount) / allOrders.length) * 100) : 68;

    res.json({
      success: true,
      data: {
        total_repeat_revenue: totalRepeatRevenue,
        repeat_order_rate: repeatOrderRate,
        total_repeat_orders: allOrders.length,
        due_soon_count: dueSoonCount,
        overdue_at_risk_count: overdueCount,
        confirmed_count: confirmedCount,
        invoiced_count: invoicedCount,
        total_units_moved: totalItemsQuantity,
        active_pipeline_count: activePipelineCount,
      },
    });
  } catch (error) {
    console.error('Error in getRepeatOrderAnalytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/sales/repeat-orders
 * List repeat order records with filtering and search
 */
exports.getRepeatOrders = async (req, res) => {
  try {
    await ensureSampleRepeatOrders();

    const {
      status,
      priority,
      customer_id,
      search,
      page = 1,
      limit = 20,
      sort_by = 'expected_reorder_date',
      sort_order = 'asc',
    } = req.query;

    const query = { is_deleted: false };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (customer_id && customer_id !== 'all') {
      query.customer_id = customer_id;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { repeat_order_number: { $regex: term, $options: 'i' } },
        { customer_name: { $regex: term, $options: 'i' } },
        { company_name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { 'items.product_name': { $regex: term, $options: 'i' } },
      ];
    }

    const sortOption = {};
    sortOption[sort_by] = sort_order === 'desc' ? -1 : 1;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      RepeatOrder.find(query)
        .populate('customer_id', 'customer_name company_name mobile email customer_type')
        .populate('warehouse_id', 'warehouse_name warehouse_code')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      RepeatOrder.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching repeat orders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/sales/repeat-orders/:id
 * Single repeat order detail
 */
exports.getRepeatOrderById = async (req, res) => {
  try {
    const order = await RepeatOrder.findOne({
      _id: req.params.id,
      is_deleted: false,
    })
      .populate('customer_id')
      .populate('warehouse_id');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Repeat order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/v1/sales/repeat-orders
 * Create new repeat order cadence or manual schedule
 */
exports.createRepeatOrder = async (req, res) => {
  try {
    const {
      customer_id,
      customer_name,
      company_name,
      phone,
      email,
      items,
      repeat_frequency_days = 30,
      last_order_date = new Date(),
      expected_reorder_date,
      status = 'due_soon',
      priority = 'medium',
      assigned_sales_rep = 'Key Account Manager',
      warehouse_id,
      loyalty_discount_percent = 5,
      notes = '',
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }

    const repeat_order_number = await generateRepeatOrderNumber();

    // Compute totals
    const calculatedItems = (items || []).map((it) => {
      const q = Math.max(1, Number(it.quantity || 1));
      const p = Math.max(0, Number(it.unit_price || 0));
      return {
        ...it,
        quantity: q,
        unit_price: p,
        total_price: q * p,
      };
    });

    const total_quantity = calculatedItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
    const subtotal_amount = calculatedItems.reduce((acc, it) => acc + (it.total_price || 0), 0);
    const discount_amount = Math.round(subtotal_amount * (Number(loyalty_discount_percent || 0) / 100));
    const final_amount = Math.max(0, subtotal_amount - discount_amount);

    const lDate = new Date(last_order_date);
    const expDate = expected_reorder_date
      ? new Date(expected_reorder_date)
      : new Date(lDate.getTime() + Number(repeat_frequency_days) * 86400000);

    const newOrder = await RepeatOrder.create({
      repeat_order_number,
      customer_id,
      customer_name,
      company_name: company_name || customer_name,
      phone,
      email,
      items: calculatedItems,
      total_quantity,
      subtotal_amount,
      loyalty_discount_percent,
      discount_amount,
      final_amount,
      repeat_frequency_days,
      last_order_date: lDate,
      expected_reorder_date: expDate,
      status,
      priority,
      assigned_sales_rep,
      warehouse_id: warehouse_id || null,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Repeat order created successfully',
      data: newOrder,
    });
  } catch (error) {
    console.error('Error creating repeat order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/v1/sales/repeat-orders/generate-from-order
 * 1-Click duplicate & generate repeat order from a past Sales Invoice
 */
exports.generateFromPastOrder = async (req, res) => {
  try {
    const { invoice_id, repeat_frequency_days = 30, loyalty_discount_percent = 5 } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ success: false, message: 'Source invoice ID is required' });
    }

    const invoice = await SalesInvoice.findById(invoice_id).populate('customer_id').populate('warehouse_id');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Source invoice not found' });
    }

    const repeat_order_number = await generateRepeatOrderNumber();

    const items = (invoice.items || []).map((it) => {
      const q = Number(it.quantity || 100);
      const unitP = Number(it.unit_price || 450);
      return {
        product_id: it.product_id || null,
        product_name: it.product_name,
        sku: it.hsn_code || 'SKU-RPT',
        color: it.color || 'Standard',
        sizes: {
          S: Math.round(q * 0.15),
          M: Math.round(q * 0.30),
          L: Math.round(q * 0.30),
          XL: Math.round(q * 0.15),
          '2XL': Math.max(0, q - Math.round(q * 0.15) - Math.round(q * 0.30) - Math.round(q * 0.30) - Math.round(q * 0.15)),
        },
        quantity: q,
        unit_price: unitP,
        total_price: q * unitP,
      };
    });

    const total_quantity = items.reduce((acc, it) => acc + it.quantity, 0);
    const subtotal_amount = items.reduce((acc, it) => acc + it.total_price, 0);
    const discount_amount = Math.round(subtotal_amount * (loyalty_discount_percent / 100));
    const final_amount = Math.max(0, subtotal_amount - discount_amount);

    const lastDate = invoice.invoice_date || invoice.createdAt || new Date();
    const expDate = new Date(new Date(lastDate).getTime() + repeat_frequency_days * 86400000);

    const repeatOrder = await RepeatOrder.create({
      repeat_order_number,
      original_order_id: invoice._id,
      original_order_number: invoice.invoice_number,
      customer_id: invoice.customer_id?._id || invoice.customer_id,
      customer_name: invoice.customer_id?.customer_name || invoice.customer_name || 'Client',
      company_name: invoice.customer_id?.company_name || invoice.customer_name || 'Client',
      phone: invoice.customer_id?.mobile || invoice.customer_id?.phone || '',
      email: invoice.customer_id?.email || '',
      items,
      total_quantity,
      subtotal_amount,
      loyalty_discount_percent,
      discount_amount,
      final_amount,
      repeat_frequency_days,
      last_order_date: lastDate,
      expected_reorder_date: expDate,
      status: 'due_soon',
      priority: total_quantity > 300 ? 'high' : 'medium',
      warehouse_id: invoice.warehouse_id?._id || invoice.warehouse_id || null,
      notes: `Generated from past order ${invoice.invoice_number}`,
    });

    res.status(201).json({
      success: true,
      message: `Repeat order ${repeat_order_number} generated from invoice ${invoice.invoice_number}`,
      data: repeatOrder,
    });
  } catch (error) {
    console.error('Error generating from past order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/v1/sales/repeat-orders/:id
 * Update status, items, schedule, or notes
 */
exports.updateRepeatOrder = async (req, res) => {
  try {
    const order = await RepeatOrder.findOne({ _id: req.params.id, is_deleted: false });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Repeat order not found' });
    }

    const {
      status,
      priority,
      repeat_frequency_days,
      expected_reorder_date,
      assigned_sales_rep,
      warehouse_id,
      loyalty_discount_percent,
      items,
      notes,
    } = req.body;

    if (status !== undefined) order.status = status;
    if (priority !== undefined) order.priority = priority;
    if (repeat_frequency_days !== undefined) order.repeat_frequency_days = repeat_frequency_days;
    if (expected_reorder_date !== undefined) order.expected_reorder_date = new Date(expected_reorder_date);
    if (assigned_sales_rep !== undefined) order.assigned_sales_rep = assigned_sales_rep;
    if (warehouse_id !== undefined) order.warehouse_id = warehouse_id;
    if (notes !== undefined) order.notes = notes;

    if (status === 'confirmed' && !order.actual_reorder_date) {
      order.actual_reorder_date = new Date();
    }

    if (items && Array.isArray(items)) {
      order.items = items.map((it) => {
        const q = Math.max(1, Number(it.quantity || 1));
        const p = Math.max(0, Number(it.unit_price || 0));
        return {
          ...it,
          quantity: q,
          unit_price: p,
          total_price: q * p,
        };
      });

      order.total_quantity = order.items.reduce((acc, it) => acc + (it.quantity || 0), 0);
      order.subtotal_amount = order.items.reduce((acc, it) => acc + (it.total_price || 0), 0);
      const discPct = loyalty_discount_percent !== undefined ? Number(loyalty_discount_percent) : order.loyalty_discount_percent;
      order.loyalty_discount_percent = discPct;
      order.discount_amount = Math.round(order.subtotal_amount * (discPct / 100));
      order.final_amount = Math.max(0, order.subtotal_amount - order.discount_amount);
    }

    await order.save();

    res.json({
      success: true,
      message: 'Repeat order updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error updating repeat order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/v1/sales/repeat-orders/:id/log-contact
 * Record customer follow-up (Call, WhatsApp, Email)
 */
exports.logContact = async (req, res) => {
  try {
    const order = await RepeatOrder.findOne({ _id: req.params.id, is_deleted: false });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Repeat order not found' });
    }

    const { channel = 'phone', outcome = 'interested', summary = '', logged_by = 'Sales Executive' } = req.body;

    order.communications_log.push({
      date: new Date(),
      channel,
      outcome,
      summary,
      logged_by,
    });

    if (outcome === 'confirmed') {
      order.status = 'confirmed';
      order.actual_reorder_date = new Date();
    } else if (order.status === 'due_soon' || order.status === 'overdue') {
      order.status = 'contacted';
    }

    await order.save();

    res.json({
      success: true,
      message: 'Communication logged successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error logging contact:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/v1/sales/repeat-orders/:id/convert-to-invoice
 * Convert confirmed repeat order into active Sales Invoice
 */
exports.convertToInvoice = async (req, res) => {
  try {
    const order = await RepeatOrder.findOne({ _id: req.params.id, is_deleted: false })
      .populate('customer_id')
      .populate('warehouse_id');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Repeat order not found' });
    }

    const countInvoices = await SalesInvoice.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(countInvoices + 1).padStart(4, '0')}`;

    const invoiceItems = order.items.map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      hsn_code: it.sku || '6109',
      quantity: it.quantity,
      uom: it.uom || 'PCS',
      unit_price: it.unit_price,
      discount_percentage: order.loyalty_discount_percent,
      discount_amount: Math.round(it.total_price * (order.loyalty_discount_percent / 100)),
      taxable_amount: it.total_price - Math.round(it.total_price * (order.loyalty_discount_percent / 100)),
      gst_rate: 5, // 5% apparel GST
      cgst_amount: Math.round((it.total_price * 0.025)),
      sgst_amount: Math.round((it.total_price * 0.025)),
      igst_amount: 0,
      total_amount: Math.round(it.total_price * 1.05),
    }));

    const totalTaxable = invoiceItems.reduce((acc, it) => acc + it.taxable_amount, 0);
    const totalGst = invoiceItems.reduce((acc, it) => acc + it.cgst_amount + it.sgst_amount, 0);
    const grandTotal = totalTaxable + totalGst;

    const newInvoice = await SalesInvoice.create({
      invoice_number: invoiceNumber,
      customer_id: order.customer_id._id,
      warehouse_id: order.warehouse_id?._id || null,
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 30 * 86400000), // 30 days credit
      items: invoiceItems,
      subtotal: totalTaxable,
      tax_amount: totalGst,
      total_amount: grandTotal,
      paid_amount: 0,
      balance_amount: grandTotal,
      payment_status: 'UNPAID',
      notes: `Repeat Order Conversion from ${order.repeat_order_number}`,
    });

    order.status = 'invoiced';
    order.converted_invoice_id = newInvoice._id;
    order.converted_invoice_number = invoiceNumber;
    await order.save();

    res.json({
      success: true,
      message: `Repeat order converted to Sales Invoice ${invoiceNumber}`,
      data: {
        repeat_order: order,
        invoice: newInvoice,
      },
    });
  } catch (error) {
    console.error('Error converting repeat order to invoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/v1/sales/repeat-orders/:id
 * Soft delete repeat order
 */
exports.deleteRepeatOrder = async (req, res) => {
  try {
    const order = await RepeatOrder.findByIdAndUpdate(
      req.params.id,
      { is_deleted: true },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Repeat order not found' });
    }
    res.json({ success: true, message: 'Repeat order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
