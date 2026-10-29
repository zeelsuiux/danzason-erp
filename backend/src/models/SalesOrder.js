const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
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
      trim: true,
    },
    sku: {
      type: String,
      default: '',
    },
    hsn_code: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    uom: {
      type: String,
      default: 'PCS',
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0,
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
    gst_amount: {
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

const salesOrderSchema = new mongoose.Schema(
  {
    so_number: {
      type: String,
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    order_date: {
      type: Date,
      default: Date.now,
    },
    expected_delivery_date: {
      type: Date,
      default: null,
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      set: (v) => (v === '' || !v ? null : v),
    },
    items: [orderItemSchema],
    pricing_tier: {
      type: String,
      enum: ['B2B', 'B2C'],
      default: 'B2B',
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
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
      default: 0,
    },
    advance_paid: {
      type: Number,
      default: 0,
    },
    payment_terms: {
      type: String,
      default: 'Net 30 Days',
    },
    payment_status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
    },
    dispatch_status: {
      type: String,
      enum: ['not_dispatched', 'partially_dispatched', 'dispatched', 'delivered'],
      default: 'not_dispatched',
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'confirmed', 'processing', 'completed', 'cancelled'],
      default: 'pending',
    },
    billing_address: {
      address_line1: String,
      city: String,
      state: String,
      pincode: String,
    },
    shipping_address: {
      address_line1: String,
      city: String,
      state: String,
      pincode: String,
    },
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

salesOrderSchema.pre('save', async function (next) {
  if (!this.so_number) {
    try {
      const { getNextSequence } = require('./Counter');
      const year = new Date().getFullYear();
      const seq = await getNextSequence(`so_${year}`, 'SalesOrder', 'so_number');
      this.so_number = `SO-${year}-${String(seq).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

salesOrderSchema.index({ so_number: 1 }, { unique: true, sparse: true });
salesOrderSchema.index({ customer_id: 1, is_deleted: 1 });
salesOrderSchema.index({ status: 1 });

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
