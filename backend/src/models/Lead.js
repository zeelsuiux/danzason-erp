const mongoose = require('mongoose');
const { getNextSequence } = require('./Counter');

const followupSchema = new mongoose.Schema(
  {
    followup_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    followup_type: {
      type: String,
      enum: ['Phone Call', 'WhatsApp', 'Meeting / Visit', 'Email', 'Demo / Sample', 'Other'],
      default: 'Phone Call',
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'overdue'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    next_action: {
      type: String,
      default: '',
      trim: true,
    },
    next_followup_date: {
      type: Date,
      default: null,
    },
    conducted_by: {
      type: String,
      default: 'Sales Representative',
      trim: true,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const leadSchema = new mongoose.Schema(
  {
    lead_number: {
      type: String,
      unique: true,
      trim: true,
    },
    lead_name: {
      type: String,
      required: true,
      trim: true,
    },
    company_name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    lead_source: {
      type: String,
      enum: [
        'WhatsApp',
        'IndiaMART',
        'TradeIndia',
        'Website',
        'Justdial',
        'Referral',
        'Exhibition / Trade Fair',
        'Cold Call',
        'Walk-in',
        'Social Media',
        'Other',
      ],
      default: 'WhatsApp',
    },
    interest_type: {
      type: String,
      enum: [
        'Finished Goods',
        'Raw Material',
        'Job Work Processing',
        'Fabric / Yarn',
        'General Apparel',
        'Custom Manufacturing',
        'Other',
      ],
      default: 'Finished Goods',
    },
    estimated_value: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: [
        'new',
        'contacted',
        'qualified',
        'quotation_sent',
        'negotiation',
        'won',
        'lost',
        'junk',
      ],
      default: 'new',
    },
    assigned_to: {
      type: String,
      default: 'Sales Team',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: 'Gujarat',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    requirements: {
      type: String,
      default: '',
      trim: true,
    },
    lost_reason: {
      type: String,
      default: '',
      trim: true,
    },
    converted_customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    converted_at: {
      type: Date,
      default: null,
    },
    followups: [followupSchema],
    next_followup_date: {
      type: Date,
      default: null,
    },
    last_contacted_at: {
      type: Date,
      default: null,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: String,
      default: 'Administrator',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
leadSchema.index({ status: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ next_followup_date: 1 });
leadSchema.index({ lead_source: 1 });
leadSchema.index({ is_deleted: 1 });

// Auto-generate lead number
leadSchema.pre('save', async function (next) {
  if (!this.lead_number) {
    const year = new Date().getFullYear();
    const seqKey = `lead_${year}`;
    const seq = await getNextSequence(seqKey, 'Lead', 'lead_number');
    this.lead_number = `LEAD-${year}-${String(seq).padStart(5, '0')}`;
  }

  // Auto-sync next_followup_date from latest scheduled followup
  if (this.followups && this.followups.length > 0) {
    const pendingFollowups = this.followups
      .filter((f) => f.status === 'scheduled')
      .sort((a, b) => new Date(a.followup_date) - new Date(b.followup_date));
    
    if (pendingFollowups.length > 0) {
      this.next_followup_date = pendingFollowups[0].followup_date;
    } else {
      this.next_followup_date = null;
    }

    // Last contacted date from completed followups
    const completedFollowups = this.followups
      .filter((f) => f.status === 'completed' && f.completed_at)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    
    if (completedFollowups.length > 0) {
      this.last_contacted_at = completedFollowups[0].completed_at;
    }
  }

  next();
});

module.exports = mongoose.model('Lead', leadSchema);
