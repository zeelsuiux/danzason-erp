const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    product_name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0,
    },
    taxable_amount: {
      type: Number,
      default: 0,
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
    total_amount: {
      type: Number,
      required: true,
    },
    condition: {
      type: String,
      enum: ['good', 'damaged'],
      default: 'good',
    },
    reason: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const salesReturnSchema = new mongoose.Schema(
  {
    return_number: {
      type: String,
      trim: true,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      required: true,
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
    },
    return_date: {
      type: Date,
      default: Date.now,
    },
    items: [returnItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax_total: {
      type: Number,
      default: 0,
    },
    grand_total: {
      type: Number,
      required: true,
    },
    credit_adjusted: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'completed', 'cancelled'],
      default: 'completed',
    },
    remarks: {
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

salesReturnSchema.pre('save', async function (next) {
  if (!this.return_number) {
    try {
      const { getNextSequence } = require('./Counter');
      const year = new Date().getFullYear();
      const seq = await getNextSequence(`sales_ret_${year}`, 'SalesReturn', 'return_number');
      this.return_number = `SR-${year}-${String(seq).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

salesReturnSchema.index({ return_number: 1 }, { unique: true, sparse: true });
salesReturnSchema.index({ invoice_id: 1, is_deleted: 1 });
salesReturnSchema.index({ customer_id: 1, is_deleted: 1 });

module.exports = mongoose.model('SalesReturn', salesReturnSchema);
