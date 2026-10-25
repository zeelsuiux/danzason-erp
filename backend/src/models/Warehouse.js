const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema(
  {
    warehouse_name: {
      type: String,
      required: true,
      trim: true,
    },
    warehouse_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    warehouse_type: {
      type: String,
      enum: ['central', 'regional', 'retail', 'transit'],
      default: 'central',
    },
    address: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    contact_person: {
      type: String,
      default: '',
      trim: true,
    },
    mobile: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    description: {
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

warehouseSchema.index({ warehouse_code: 1 }, { unique: true, sparse: true });
warehouseSchema.index({ is_default: 1 });
warehouseSchema.index({ status: 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);
