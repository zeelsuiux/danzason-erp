const mongoose = require('mongoose');

const supplierCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category_types: {
      type: [String],
      default: ['raw_material', 'finished'],
    },
    is_active: {
      type: Boolean,
      default: true,
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

supplierCategorySchema.pre('save', function (next) {
  if (!this.code && this.name) {
    this.code = this.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 10);
  }
  next();
});

module.exports = mongoose.model('SupplierCategory', supplierCategorySchema);
