const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customer_name: {
      type: String,
      required: true,
      trim: true,
    },
    customer_code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    company_name: {
      type: String,
      default: '',
      trim: true,
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
    customer_type: {
      type: String,
      enum: [
        'B2B',
        'B2C',
        'B2D',
        'D2C',
        'WHOLESALER',
        'RETAILER',
        'DISTRIBUTOR',
        'DIRECT_BUYER',
        'CORPORATE',
        'wholesaler',
        'retailer',
        'distributor',
        'direct_buyer',
        'corporate',
      ],
      default: 'B2B',
    },
    category: {
      type: String,
      default: 'General',
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    categories: {
      type: [String],
      default: ['General'],
    },
    credit_limit: {
      type: Number,
      default: 100000,
    },
    credit_period_days: {
      type: Number,
      default: 30,
    },
    payment_terms: {
      type: String,
      default: 'Immediate / Advance',
    },
    pending_balance: {
      type: Number,
      default: 0,
    },
    billing_address: {
      address_line1: { type: String, default: '' },
      address_line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: 'Gujarat' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    shipping_address: {
      address_line1: { type: String, default: '' },
      address_line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: 'Gujarat' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
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

customerSchema.pre('save', async function (next) {
  if (!this.customer_code) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customer_code = `CUST-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
