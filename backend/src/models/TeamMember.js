const mongoose = require('mongoose');
const { getNextSequence } = require('./Counter');

const modulePermissionSchema = new mongoose.Schema(
  {
    view: { type: Boolean, default: true },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const teamMemberSchema = new mongoose.Schema(
  {
    member_code: {
      type: String,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      default: 'Sales & CRM',
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      required: true,
      trim: true,
      default: 'junior',
    },
    hierarchy_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HierarchyLevel',
      default: null,
    },
    reports_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      default: null,
    },
    role_name: {
      type: String,
      default: 'Sales Executive',
      trim: true,
    },
    // Granular Department Operation Permissions (View, Add, Edit, Delete)
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    // Monthly Targets for Multi-Parameter Performance Tracking
    monthly_targets: {
      // Sales & CRM Targets
      leads_target: { type: Number, default: 20 },
      revenue_target: { type: Number, default: 300000 },
      followups_target: { type: Number, default: 50 },
      // Procurement & Purchase Targets
      pos_target: { type: Number, default: 12 },
      procurement_target: { type: Number, default: 250000 },
      bills_target: { type: Number, default: 15 },
      // Manufacturing & Job Work Targets
      mpos_target: { type: Number, default: 10 },
      production_units_target: { type: Number, default: 2000 },
      // Finance & Accounts Targets
      collections_target: { type: Number, default: 350000 },
      disbursements_target: { type: Number, default: 250000 },
      vouchers_target: { type: Number, default: 30 },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_leave'],
      default: 'active',
    },
    joining_date: {
      type: Date,
      default: Date.now,
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate Member Code (e.g. TM-001)
teamMemberSchema.pre('save', async function (next) {
  if (!this.member_code) {
    const seq = await getNextSequence('team_member', 'TeamMember', 'member_code');
    this.member_code = `TM-${String(seq).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);
