const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    supplier_name: {
      type: String,
      required: true,
      trim: true,
    },
    supplier_code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    contact_person: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    gstin: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    pan: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    supplier_type: {
      type: String,
      enum: ['B2B', 'B2C', 'D2C', 'WHOLESALE', 'MANUFACTURER', 'TRADER'],
      default: 'B2B',
      uppercase: true,
      trim: true,
    },
    supplier_classification: {
      type: String,
      enum: ['raw_material', 'manufacturing', 'both', 'finished', 'contractor'],
      default: 'both',
      trim: true,
    },
    supplier_classifications: {
      type: [String],
      default: ['raw_material'],
    },
    category: {
      type: String,
      default: 'raw_materials',
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplierCategory',
      default: null,
    },
    category_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupplierCategory',
      },
    ],
    rating: {
      type: Number,
      default: 4,
      min: 1,
      max: 5,
    },
    payment_terms: {
      type: String,
      default: 'Net 30 Days',
    },
    credit_period_days: {
      type: Number,
      default: 30,
    },
    credit_limit: {
      type: Number,
      default: 0,
    },
    pending_balance: {
      type: Number,
      default: 0,
    },
    address: {
      address_line1: { type: String, default: '' },
      address_line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: 'Gujarat' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    bank_details: {
      bank_name: { type: String, default: '' },
      account_number: { type: String, default: '' },
      ifsc_code: { type: String, default: '' },
      branch: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blacklisted'],
      default: 'active',
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

supplierSchema.pre('save', async function (next) {
  if (!this.supplier_code) {
    const count = await mongoose.model('Supplier').countDocuments();
    this.supplier_code = `SUP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);
