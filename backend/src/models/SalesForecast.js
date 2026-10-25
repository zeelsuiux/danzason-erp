const mongoose = require('mongoose');

const categoryForecastSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    category_label: {
      type: String,
      required: true,
      trim: true,
    },
    target_units: {
      type: Number,
      default: 0,
      min: 0,
    },
    projected_units: {
      type: Number,
      default: 0,
      min: 0,
    },
    actual_units: {
      type: Number,
      default: 0,
      min: 0,
    },
    average_selling_price: {
      type: Number,
      default: 0,
      min: 0,
    },
    projected_revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    target_revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    fabric_type: {
      type: String,
      default: '',
      trim: true,
    },
    fabric_required_kg: {
      type: Number,
      default: 0,
      min: 0,
    },
    growth_rate_pct: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const territoryForecastSchema = new mongoose.Schema(
  {
    region: {
      type: String,
      required: true,
      trim: true,
    },
    target_revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    projected_revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    key_accounts_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    growth_outlook: {
      type: String,
      enum: ['high', 'moderate', 'stable', 'caution'],
      default: 'moderate',
    },
  },
  { _id: true }
);

const salesForecastSchema = new mongoose.Schema(
  {
    forecast_code: {
      type: String,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Forecast title is required'],
      trim: true,
    },
    financial_year: {
      type: String,
      required: [true, 'Financial year is required'],
      default: '2026-2027',
      trim: true,
    },
    period_type: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'quarterly',
    },
    period_name: {
      type: String,
      required: [true, 'Period name is required (e.g. Q1, Q2, November)'],
      trim: true,
    },
    season: {
      type: String,
      enum: ['summer', 'festive_diwali', 'winter', 'monsoon', 'wedding_spring', 'regular'],
      default: 'regular',
    },
    confidence_level: {
      type: String,
      enum: ['conservative', 'realistic', 'optimistic'],
      default: 'realistic',
    },
    target_revenue: {
      type: Number,
      required: [true, 'Target revenue is required'],
      default: 0,
      min: 0,
    },
    projected_revenue: {
      type: Number,
      required: [true, 'Projected revenue is required'],
      default: 0,
      min: 0,
    },
    actual_revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    weighted_pipeline_revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    target_units: {
      type: Number,
      default: 0,
      min: 0,
    },
    projected_units: {
      type: Number,
      default: 0,
      min: 0,
    },
    actual_units: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimated_fabric_kg: {
      type: Number,
      default: 0,
      min: 0,
    },
    category_forecasts: [categoryForecastSchema],
    territory_forecasts: [territoryForecastSchema],
    status: {
      type: String,
      enum: ['draft', 'active', 'reviewed', 'archived'],
      default: 'active',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    created_by: {
      type: String,
      default: 'Sales Strategy Team',
      trim: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-generate forecast code if not provided
salesForecastSchema.pre('save', async function (next) {
  if (!this.forecast_code) {
    const periodSlug = (this.period_name || 'Q1').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const count = await this.constructor.countDocuments();
    this.forecast_code = `FCST-2026-${periodSlug}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('SalesForecast', salesForecastSchema);
