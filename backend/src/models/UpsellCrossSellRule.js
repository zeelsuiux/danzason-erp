const mongoose = require('mongoose');
const { getNextSequence } = require('./Counter');

const upsellCrossSellRuleSchema = new mongoose.Schema(
  {
    rule_code: {
      type: String,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['upsell', 'cross_sell'],
      required: true,
      default: 'cross_sell',
    },
    trigger_type: {
      type: String,
      enum: ['product', 'category', 'all'],
      default: 'product',
    },
    trigger_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    trigger_product_name: {
      type: String,
      default: '',
      trim: true,
    },
    trigger_category: {
      type: String,
      default: '',
      trim: true,
    },
    recommended_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    recommended_product_name: {
      type: String,
      required: true,
      trim: true,
    },
    recommendation_pitch: {
      type: String,
      default: '',
      trim: true,
    },
    pricing_type: {
      type: String,
      enum: ['upgrade_diff', 'discount_percent', 'fixed_bundle_rate', 'special_price'],
      default: 'upgrade_diff',
    },
    price_value: {
      type: Number,
      default: 0,
      min: 0,
    },
    min_order_qty: {
      type: Number,
      default: 1,
      min: 1,
    },
    conversion_stats: {
      times_pitched: { type: Number, default: 0 },
      times_accepted: { type: Number, default: 0 },
      revenue_generated: { type: Number, default: 0 },
    },
    priority: {
      type: Number,
      default: 1,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

upsellCrossSellRuleSchema.pre('save', async function (next) {
  if (!this.rule_code) {
    const seq = await getNextSequence('upsell_rule', 'UpsellCrossSellRule', 'rule_code');
    this.rule_code = `UXS-${String(seq).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('UpsellCrossSellRule', upsellCrossSellRuleSchema);
