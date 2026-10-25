const mongoose = require('mongoose');

const supplierQuotationSchema = new mongoose.Schema(
  {
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    quoted_price: {
      type: Number,
      default: 0,
    },
    quoted_delivery_date: {
      type: Date,
      default: null,
    },
    quoted_remarks: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    accept_reason: {
      type: String,
      default: '',
    },
    reject_reason: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const inquiryItemSchema = new mongoose.Schema(
  {
    item_name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    uom: {
      type: String,
      default: 'Nos',
    },
    target_price: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const purchaseInquirySchema = new mongoose.Schema(
  {
    inquiry_number: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplierCategory',
      default: null,
    },
    category_name: {
      type: String,
      default: '',
    },
    expected_delivery_date: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
    },
    items: [inquiryItemSchema],
    suppliers: [supplierQuotationSchema],
    inquiry_type: {
      type: String,
      enum: ['standard', 'raw_material', 'manufacturing', 'finished'],
      default: 'finished',
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'awarded', 'closed'],
      default: 'open',
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

purchaseInquirySchema.pre('save', async function (next) {
  if (!this.inquiry_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PurchaseInquiry').countDocuments();
    this.inquiry_number = `INQ-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('PurchaseInquiry', purchaseInquirySchema);
