const mongoose = require('mongoose');

const financeTransactionSchema = new mongoose.Schema(
  {
    transaction_number: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    transaction_type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      required: true,
    },
    entry_source: {
      type: String,
      enum: [
        'manual',
        'sales_bill',
        'raw_material_purchase',
        'finished_purchase',
        'job_work_purchase',
        'internal_transfer',
      ],
      required: true,
      default: 'manual',
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    transaction_date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    party_name: {
      type: String,
      trim: true,
      default: 'Direct / Miscellaneous',
    },
    party_type: {
      type: String,
      enum: ['customer', 'supplier', 'contractor', 'employee', 'bank', 'other'],
      default: 'other',
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    bill_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    bill_type: {
      type: String,
      enum: ['sales_invoice', 'purchase_invoice', 'none'],
      default: 'none',
    },
    bill_number: {
      type: String,
      default: '',
      trim: true,
    },
    payment_index: {
      type: Number,
      default: 0,
    },
    payment_method: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Net Banking', 'NEFT/RTGS/IMPS', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'Other'],
      default: 'Bank Transfer',
    },
    account_name: {
      type: String,
      default: 'Primary Bank Account (HDFC)',
      trim: true,
    },
    reference_number: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
    is_manual: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: String,
      default: 'Administrator',
    },
    audit_history: [
      {
        action: { type: String, required: true },
        changed_at: { type: Date, default: Date.now },
        changed_by: { type: String, default: 'Administrator' },
        reason: { type: String, default: '' },
        details: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

financeTransactionSchema.pre('save', async function (next) {
  if (!this.transaction_number) {
    try {
      const { getNextSequence } = require('./Counter');
      const year = new Date().getFullYear();
      const prefix = this.transaction_type === 'income' ? 'INC' : this.transaction_type === 'expense' ? 'EXP' : 'TX';
      const seq = await getNextSequence(`finance_${this.transaction_type}_${year}`, 'FinanceTransaction', 'transaction_number');
      this.transaction_number = `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

financeTransactionSchema.index({ transaction_date: -1 });
financeTransactionSchema.index({ transaction_type: 1 });
financeTransactionSchema.index({ entry_source: 1 });
financeTransactionSchema.index({ bill_id: 1, payment_index: 1 });
financeTransactionSchema.index({ is_deleted: 1, status: 1 });

module.exports = mongoose.model('FinanceTransaction', financeTransactionSchema);
