const mongoose = require('mongoose');

const goodsItemSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    unit_cost_price: {
      type: Number,
      required: true,
      min: 0,
    },
    total_cost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const capitalTransactionSchema = new mongoose.Schema(
  {
    voucher_number: {
      type: String,
      unique: true,
      trim: true,
    },
    entry_type: {
      type: String,
      enum: [
        'capital_infusion',       // Owner adds money / capital (+)
        'drawing_bank',           // Owner withdraws bank funds (-)
        'drawing_cash',           // Owner withdraws cash in hand (-)
        'drawing_goods',          // Owner takes apparel stock at cost (-)
        'profit_allocation',      // Net profit transferred into capital account (+)
        'interest_on_capital',    // Interest credited to owner capital (+)
        'director_remuneration',  // Partner / Director salary withdrawal (-)
      ],
      required: true,
    },
    transaction_direction: {
      type: String,
      enum: ['credit', 'debit'], // credit = capital increases (+), debit = drawing / capital reduces (-)
      required: true,
    },
    owner_name: {
      type: String,
      required: [true, 'Owner / Partner name is required'],
      default: 'Zeel Patel (Managing Director)',
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than zero'],
    },
    payment_mode: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'cash', 'upi', 'stock_adjustment', 'journal_entry'],
      default: 'bank_transfer',
    },
    bank_or_cash_account: {
      type: String,
      required: true,
      default: 'HDFC Bank Ltd - Current A/C #4409',
      trim: true,
    },
    reference_number: {
      type: String,
      default: '',
      trim: true,
    },
    goods_items: [goodsItemSchema],
    purpose_or_reason: {
      type: String,
      required: [true, 'Purpose or reason is required'],
      trim: true,
    },
    financial_year: {
      type: String,
      required: true,
      default: '2026-2027',
      trim: true,
    },
    tax_treatment: {
      type: String,
      default: 'Drawings from capital balance - Not tax deductible as business expense (Sec 40b)',
      trim: true,
    },
    approved_by: {
      type: String,
      default: 'Finance & Accounts Head',
      trim: true,
    },
    status: {
      type: String,
      enum: ['approved', 'pending_approval', 'reconciled', 'cancelled'],
      default: 'approved',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    created_by: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-generate voucher number
capitalTransactionSchema.pre('save', async function (next) {
  if (!this.voucher_number) {
    const isDrawing = this.entry_type.startsWith('drawing');
    const prefix = isDrawing ? 'DRW' : 'CAP';
    const year = new Date(this.date || Date.now()).getFullYear();
    const count = await this.constructor.countDocuments();
    this.voucher_number = `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // Set direction automatically
  if (['capital_infusion', 'profit_allocation', 'interest_on_capital'].includes(this.entry_type)) {
    this.transaction_direction = 'credit';
  } else {
    this.transaction_direction = 'debit';
  }

  next();
});

module.exports = mongoose.model('CapitalTransaction', capitalTransactionSchema);
