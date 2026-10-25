const mongoose = require('mongoose');
const { getNextSequence } = require('./Counter');

const upsellOpportunitySchema = new mongoose.Schema(
  {
    opportunity_code: {
      type: String,
      unique: true,
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    customer_name: {
      type: String,
      required: true,
      trim: true,
    },
    rule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UpsellCrossSellRule',
      default: null,
    },
    rule_title: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['upsell', 'cross_sell'],
      required: true,
    },
    trigger_item_name: {
      type: String,
      default: '',
      trim: true,
    },
    recommended_item_name: {
      type: String,
      default: '',
      trim: true,
    },
    original_value: {
      type: Number,
      default: 0,
    },
    potential_additional_value: {
      type: Number,
      default: 0,
    },
    quantity_sold: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pitched', 'accepted', 'declined', 'converted_to_invoice'],
      default: 'pitched',
    },
    declined_reason: {
      type: String,
      default: '',
      trim: true,
    },
    sales_executive: {
      type: String,
      default: 'Vikram Mehta',
      trim: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
      default: null,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

upsellOpportunitySchema.pre('save', async function (next) {
  if (!this.opportunity_code) {
    const seq = await getNextSequence('upsell_opportunity', 'UpsellOpportunity', 'opportunity_code');
    this.opportunity_code = `OPP-${String(seq).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('UpsellOpportunity', upsellOpportunitySchema);
