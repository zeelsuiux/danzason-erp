const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
      default: null,
      set: (v) => (v === '' || !v ? null : v),
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
      default: '',
    },
    variant_name: {
      type: String,
      default: '',
    },
    hsn_code: String,
    quantity: {
      type: Number,
      required: true,
    },
    uom: {
      type: String,
      default: 'PCS',
    },
    unit_price: {
      type: Number,
      required: true,
    },
    discount_percentage: {
      type: Number,
      default: 0,
    },
    discount_amount: {
      type: Number,
      default: 0,
    },
    taxable_amount: {
      type: Number,
      required: true,
    },
    gst_rate: {
      type: Number,
      default: 18,
    },
    cgst_amount: {
      type: Number,
      default: 0,
    },
    sgst_amount: {
      type: Number,
      default: 0,
    },
    igst_amount: {
      type: Number,
      default: 0,
    },
    total_amount: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const salesInvoiceSchema = new mongoose.Schema(
  {
    invoice_number: {
      type: String,
      trim: true,
    },
    so_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
      default: null,
      set: (v) => (v === '' || !v ? null : v),
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      set: (v) => (v === '' || !v ? null : v),
    },
    invoice_date: {
      type: Date,
      default: Date.now,
    },
    due_date: {
      type: Date,
      required: true,
    },
    approx_repeat_date: {
      type: Date,
      default: null,
    },
    items: [invoiceItemSchema],
    pricing_tier: {
      type: String,
      enum: ['B2B', 'B2C'],
      default: 'B2B',
    },
    subtotal: {
      type: Number,
      required: true,
    },
    discount_total: {
      type: Number,
      default: 0,
    },
    final_discount_type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed',
    },
    final_discount_value: {
      type: Number,
      default: 0,
    },
    tax_total: {
      type: Number,
      default: 0,
    },
    shipping_charges: {
      type: Number,
      default: 0,
    },
    round_off: {
      type: Number,
      default: 0,
    },
    grand_total: {
      type: Number,
      required: true,
    },
    paid_amount: {
      type: Number,
      default: 0,
    },
    balance_amount: {
      type: Number,
      required: true,
    },
    payment_status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'cancelled'],
      default: 'issued',
    },
    place_of_supply: {
      type: String,
      default: 'Gujarat',
    },
    payments: [
      {
        amount: { type: Number, required: true },
        payment_date: { type: Date, default: Date.now },
        payment_time: { type: String, default: '' },
        payment_datetime: { type: Date, default: Date.now },
        payment_mode: { type: String, default: 'Cash' },
        reference_number: { type: String, default: '' },
        notes: { type: String, default: '' },
        created_at: { type: Date, default: Date.now },
        time_corrected: { type: Boolean, default: false },
        correction_history: [
          {
            previous_datetime: { type: Date },
            new_datetime: { type: Date },
            reason: { type: String, default: '' },
            corrected_by: { type: String, default: '' },
            corrected_at: { type: Date, default: Date.now },
          },
        ],
      },
    ],
    notes: {
      type: String,
      default: '',
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

salesInvoiceSchema.pre('save', async function (next) {
  if (!this.invoice_number) {
    try {
      const { getNextSequence } = require('./Counter');
      const year = new Date().getFullYear();
      const seq = await getNextSequence(`sales_inv_${year}`, 'SalesInvoice', 'invoice_number');
      this.invoice_number = `INV-SALES-${year}-${String(seq).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

salesInvoiceSchema.index({ invoice_number: 1 }, { unique: true, sparse: true });
salesInvoiceSchema.index({ customer_id: 1, is_deleted: 1 });
salesInvoiceSchema.index({ so_id: 1 });
salesInvoiceSchema.index({ payment_status: 1 });

module.exports = mongoose.model('SalesInvoice', salesInvoiceSchema);
