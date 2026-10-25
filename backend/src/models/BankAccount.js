const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema(
  {
    account_name: {
      type: String,
      required: [true, 'Account display name is required'],
      trim: true,
    },
    bank_name: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
    },
    account_number: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true,
    },
    account_holder_name: {
      type: String,
      required: [true, 'Account holder name is required'],
      default: 'Danza-Son Apparels & Textiles',
      trim: true,
    },
    account_type: {
      type: String,
      enum: ['current', 'savings', 'overdraft_cc', 'cash', 'upi'],
      default: 'current',
    },
    ifsc_code: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    branch_name: {
      type: String,
      default: '',
      trim: true,
    },
    upi_id: {
      type: String,
      default: '',
      trim: true,
    },
    opening_balance: {
      type: Number,
      default: 0,
    },
    current_balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    is_default_receiving: {
      type: Boolean,
      default: false,
    },
    is_default_payment: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BankAccount', bankAccountSchema);
