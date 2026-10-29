const mongoose = require('mongoose');

const repeatOrderItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    product_name: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: 'Standard',
    },
    sizes: {
      S: { type: Number, default: 0 },
      M: { type: Number, default: 0 },
      L: { type: Number, default: 0 },
      XL: { type: Number, default: 0 },
      '2XL': { type: Number, default: 0 },
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    uom: {
      type: String,
      default: 'PCS',
    },
    unit_price: {
      type: Number,
      required: true,
      default: 0,
    },
    total_price: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: true }
);

const communicationLogSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    channel: {
      type: String,
      enum: ['phone', 'whatsapp', 'email', 'meeting'],
      default: 'phone',
    },
    client_answer: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    outcome: {
      type: String,
      enum: ['interested', 'follow_up_needed', 'call_back_later', 'stock_available', 'confirmed', 'declined', 'no_response', 'not_interested'],
      default: 'follow_up_needed',
    },
    logged_by: {
      type: String,
      default: 'Sales Executive',
    },
    next_follow_up_date: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const repeatOrderSchema = new mongoose.Schema(
  {
    repeat_order_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    original_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      default: null,
    },
    original_order_number: {
      type: String,
      default: '',
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customer_name: {
      type: String,
      required: true,
      trim: true,
    },
    company_name: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    items: [repeatOrderItemSchema],
    total_quantity: {
      type: Number,
      default: 0,
    },
    subtotal_amount: {
      type: Number,
      default: 0,
    },
    loyalty_discount_percent: {
      type: Number,
      default: 5, // e.g. 5% standard repeat customer incentive
    },
    discount_amount: {
      type: Number,
      default: 0,
    },
    final_amount: {
      type: Number,
      default: 0,
    },
    repeat_frequency_days: {
      type: Number,
      default: 30, // 30, 45, 60, 90 days cycle
    },
    last_order_date: {
      type: Date,
      default: Date.now,
    },
    expected_reorder_date: {
      type: Date,
      required: true,
    },
    actual_reorder_date: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['due_soon', 'overdue', 'contacted', 'confirmed', 'invoiced', 'converted', 'skipped'],
      default: 'due_soon',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'normal'],
      default: 'medium',
    },
    assigned_sales_rep: {
      type: String,
      default: 'Key Account Manager',
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      set: (v) => (v === '' || !v ? null : v),
    },
    converted_invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      default: null,
      set: (v) => (v === '' || !v ? null : v),
    },
    converted_invoice_number: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    communications_log: [communicationLogSchema],
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RepeatOrder', repeatOrderSchema);
