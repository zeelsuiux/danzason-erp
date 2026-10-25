const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema(
  {
    po_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    received_qty: {
      type: Number,
      required: true,
      min: 0,
    },
    accepted_qty: {
      type: Number,
      default: function () {
        return this.received_qty;
      },
    },
    rejected_qty: {
      type: Number,
      default: 0,
    },
    unit_rate: {
      type: Number,
      default: 0,
    },
    batch_number: {
      type: String,
      default: '',
    },
    qc_status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'partial'],
      default: 'passed',
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const goodsReceiptNoteSchema = new mongoose.Schema(
  {
    grn_number: {
      type: String,
      trim: true,
    },
    grn_date: {
      type: Date,
      default: Date.now,
    },
    po_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    vendor_challan_no: {
      type: String,
      default: '',
    },
    vendor_challan_date: {
      type: Date,
      default: null,
    },
    vehicle_number: {
      type: String,
      default: '',
    },
    driver_name: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
    },
    file_data: {
      type: String, // Base64 attachment data
      default: null,
    },
    attachment_name: {
      type: String,
      default: '',
    },
    attachment_type: {
      type: String,
      default: '',
    },
    items: [grnItemSchema],
    status: {
      type: String,
      enum: ['received', 'inspected', 'posted'],
      default: 'received',
    },
    stock_posted: {
      type: Boolean,
      default: false,
    },
    stock_posted_at: {
      type: Date,
      default: null,
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

goodsReceiptNoteSchema.pre('save', async function (next) {
  if (!this.grn_number) {
    try {
      const { getNextSequence } = require('./Counter');
      const year = new Date().getFullYear();
      const seq = await getNextSequence(`grn_${year}`, 'GoodsReceiptNote', 'grn_number');
      this.grn_number = `GRN-${year}-${String(seq).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

goodsReceiptNoteSchema.index({ grn_number: 1 }, { unique: true, sparse: true });
goodsReceiptNoteSchema.index({ po_id: 1 });
goodsReceiptNoteSchema.index({ supplier_id: 1, is_deleted: 1 });

module.exports = mongoose.model('GoodsReceiptNote', goodsReceiptNoteSchema);
