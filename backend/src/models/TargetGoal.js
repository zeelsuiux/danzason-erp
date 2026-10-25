const mongoose = require('mongoose');
const { getNextSequence } = require('./Counter');

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    is_completed: { type: Boolean, default: false },
    completed_at: { type: Date, default: null },
    weight: { type: Number, default: 25 },
  },
  { _id: true }
);

const progressNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    recorded_by: { type: String, default: 'Administrator' },
    recorded_at: { type: Date, default: Date.now },
    previous_value: { type: Number, default: 0 },
    new_value: { type: Number, default: 0 },
  },
  { _id: true }
);

const targetGoalSchema = new mongoose.Schema(
  {
    goal_code: {
      type: String,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['sales', 'procurement', 'production', 'finance', 'strategic_okr'],
      required: true,
      default: 'sales',
    },
    target_level: {
      type: String,
      enum: ['individual', 'department', 'company_wide'],
      required: true,
      default: 'individual',
    },
    department: {
      type: String,
      required: true,
      trim: true,
      default: 'Sales & CRM',
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      default: null,
    },
    assignee_name: {
      type: String,
      default: 'All Department Members',
      trim: true,
    },
    period_type: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'custom'],
      default: 'monthly',
    },
    period_label: {
      type: String,
      required: true,
      trim: true,
      default: 'Current Month',
    },
    start_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    end_date: {
      type: Date,
      required: true,
    },
    metric_type: {
      type: String,
      enum: [
        'revenue_amount',
        'order_count',
        'unit_volume',
        'collection_amount',
        'percentage',
        'milestone',
      ],
      default: 'revenue_amount',
    },
    metric_unit: {
      type: String,
      default: '₹',
      trim: true,
    },
    target_value: {
      type: Number,
      required: true,
      min: 0,
    },
    actual_value: {
      type: Number,
      default: 0,
      min: 0,
    },
    achievement_pct: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'on_track', 'behind', 'achieved', 'missed', 'closed'],
      default: 'active',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high',
    },
    incentive_type: {
      type: String,
      enum: ['none', 'percentage', 'fixed_bonus'],
      default: 'none',
    },
    incentive_value: {
      type: Number,
      default: 0,
      min: 0,
    },
    earned_incentive: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    milestones: [milestoneSchema],
    progress_notes: [progressNoteSchema],
    created_by: {
      type: String,
      default: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate goal_code and recalculate progress percentage
targetGoalSchema.pre('save', async function (next) {
  if (!this.goal_code) {
    const year = new Date().getFullYear();
    const seq = await getNextSequence(`target_goal_${year}`, 'TargetGoal', 'goal_code');
    this.goal_code = `TG-${year}-${String(seq).padStart(4, '0')}`;
  }

  // Recalculate achievement percentage
  if (this.target_value > 0) {
    this.achievement_pct = Math.round((this.actual_value / this.target_value) * 100 * 10) / 10;
  } else {
    this.achievement_pct = 0;
  }

  // Auto-evaluate status if active/on_track/behind/achieved
  if (this.status !== 'draft' && this.status !== 'closed' && this.status !== 'missed') {
    if (this.achievement_pct >= 100) {
      this.status = 'achieved';
    } else if (this.achievement_pct >= 75) {
      this.status = 'on_track';
    } else if (this.achievement_pct >= 40) {
      this.status = 'active';
    } else {
      this.status = 'behind';
    }
  }

  // Compute earned incentive if achieved
  if (this.achievement_pct >= 100 && this.incentive_value > 0) {
    if (this.incentive_type === 'percentage') {
      this.earned_incentive = Math.round((this.actual_value * this.incentive_value) / 100);
    } else if (this.incentive_type === 'fixed_bonus') {
      this.earned_incentive = this.incentive_value;
    }
  } else {
    this.earned_incentive = 0;
  }

  next();
});

const TargetGoal = mongoose.model('TargetGoal', targetGoalSchema);

module.exports = TargetGoal;
