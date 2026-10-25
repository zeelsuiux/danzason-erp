const mongoose = require('mongoose');

const marketingCampaignSchema = new mongoose.Schema(
  {
    campaign_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    campaign_name: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: [
        'Meta Ads (IG & FB)',
        'Google Ads',
        'WhatsApp Campaign',
        'IndiaMART / B2B Portals',
        'Trade Exhibition',
        'Email Marketing',
        'Influencer / Creator',
        'Direct Outreach',
      ],
      default: 'Meta Ads (IG & FB)',
    },
    objective: {
      type: String,
      enum: ['Lead Generation', 'Brand Awareness', 'Catalog Sales', 'Re-engagement', 'Wholesale Inquiries'],
      default: 'Lead Generation',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'scheduled', 'completed', 'draft'],
      default: 'active',
    },
    start_date: {
      type: Date,
      default: Date.now,
    },
    end_date: {
      type: Date,
      default: null,
    },
    budget: {
      type: Number,
      required: true,
      default: 25000,
    },
    spent: {
      type: Number,
      default: 0,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    leads_generated: {
      type: Number,
      default: 0,
    },
    orders_converted: {
      type: Number,
      default: 0,
    },
    revenue_generated: {
      type: Number,
      default: 0,
    },
    target_audience: {
      type: String,
      default: 'Wholesalers, Distributors & Retailers in Tier 1 & 2 cities',
    },
    target_products: [
      {
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        product_name: { type: String, default: '' },
      },
    ],
    target_regions: [
      {
        type: String,
        default: 'Gujarat',
      },
    ],
    notes: {
      type: String,
      default: '',
    },
    created_by: {
      type: String,
      default: 'Marketing Lead',
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

// Virtuals for ROAS, CAC, CPL
marketingCampaignSchema.virtual('roas').get(function () {
  if (!this.spent || this.spent === 0) return 0;
  return Number(((this.revenue_generated || 0) / this.spent).toFixed(2));
});

marketingCampaignSchema.virtual('cpl').get(function () {
  if (!this.leads_generated || this.leads_generated === 0) return 0;
  return Math.round((this.spent || 0) / this.leads_generated);
});

marketingCampaignSchema.virtual('cac').get(function () {
  if (!this.orders_converted || this.orders_converted === 0) return 0;
  return Math.round((this.spent || 0) / this.orders_converted);
});

marketingCampaignSchema.index({ channel: 1, status: 1 });

module.exports = mongoose.model('MarketingCampaign', marketingCampaignSchema);
