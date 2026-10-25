const mongoose = require('mongoose');

const hierarchyLevelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    rank: {
      type: Number,
      required: true,
      default: 1, // 1 = Highest seniority (e.g. Director), 5 = Junior/Trainee
    },
    can_supervise: {
      type: Boolean,
      default: false, // If true, can have junior staff report to them
    },
    requires_reporting: {
      type: Boolean,
      default: false, // If true, requires selecting a "Reports To" senior manager
    },
    badge_color: {
      type: String,
      enum: ['purple', 'blue', 'amber', 'rose', 'emerald', 'indigo', 'slate'],
      default: 'purple',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_system: {
      type: Boolean,
      default: false,
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

hierarchyLevelSchema.index({ rank: 1, name: 1 });
hierarchyLevelSchema.index({ code: 1, is_deleted: 1 });

module.exports = mongoose.model('HierarchyLevel', hierarchyLevelSchema);
