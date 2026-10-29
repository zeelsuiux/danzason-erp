const mongoose = require('mongoose');

const quantityRangeSchema = new mongoose.Schema({
  min_qty: {
    type: Number,
    required: true,
    default: 1,
  },
  max_qty: {
    type: Number,
    required: true,
    default: 100,
  },
  b2b_percent: {
    type: Number,
    required: true,
    default: 5,
  },
  b2c_percent: {
    type: Number,
    required: true,
    default: 10,
  },
  d2c_percent: {
    type: Number,
    required: true,
    default: 15,
  },
  retail_percent: {
    type: Number,
    required: true,
    default: 8,
  },
  label: {
    type: String,
    default: '',
    trim: true,
  },
});

const pricingRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Channel & Quantity Tiered Pricing Policy',
      trim: true,
    },
    pricing_method: {
      type: String,
      enum: ['markup', 'margin'],
      default: 'markup', // markup: Purchase Cost * (1 + % / 100)
    },
    ranges: {
      type: [quantityRangeSchema],
      default: [
        { min_qty: 1, max_qty: 100, b2b_percent: 5, b2c_percent: 10, d2c_percent: 15, retail_percent: 8, label: 'Small Batch (1 - 100 Qty)' },
        { min_qty: 101, max_qty: 500, b2b_percent: 4, b2c_percent: 9, d2c_percent: 13, retail_percent: 7, label: 'Medium Volume (101 - 500 Qty)' },
        { min_qty: 501, max_qty: 1000, b2b_percent: 3.5, b2c_percent: 8, d2c_percent: 11, retail_percent: 6, label: 'Wholesale Bulk (501 - 1,000 Qty)' },
        { min_qty: 1001, max_qty: 999999, b2b_percent: 2.5, b2c_percent: 7, d2c_percent: 10, retail_percent: 5, label: 'Mega Enterprise (1,000+ Qty)' },
      ],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: 'Automated channel and quantity tiered markup added onto base purchase cost.',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
