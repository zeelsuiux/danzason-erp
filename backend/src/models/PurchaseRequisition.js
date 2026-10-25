const mongoose = require('mongoose');

const requisitionItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    requested_qty: {
      type: Number,
      required: true,
      min: 1,
    },
    estimated_rate: {
      type: Number,
      default: 0,
    },
    total_amount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const purchaseRequisitionSchema = new mongoose.Schema(
  {
    requisition_number: {
      type: String,
      trim: true,
    },
    requisition_date: {
      type: Date,
      default: Date.now,
    },
    department: {
      type: String,
      default: 'Production',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    reason_for_request: {
      type: String,
      enum: ['min_reorder_level', 'urgent_order', 'replenishment', 'production_shortage', 'custom'],
      default: 'min_reorder_level',
    },
    items: [requisitionItemSchema],
    total_estimated_cost: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'converted_to_po'],
      default: 'submitted',
    },
    requested_by: {
      type: String,
      default: 'Operations Staff',
    },
    approval_notes: {
      type: String,
      default: '',
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

purchaseRequisitionSchema.pre('save', async function (next) {
  if (!this.requisition_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PurchaseRequisition').countDocuments();
    this.requisition_number = `PR-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  // calculate total estimated cost
  if (this.items && this.items.length) {
    this.total_estimated_cost = this.items.reduce((sum, it) => {
      it.total_amount = (it.requested_qty || 0) * (it.estimated_rate || 0);
      return sum + it.total_amount;
    }, 0);
  }
  next();
});

module.exports = mongoose.model('PurchaseRequisition', purchaseRequisitionSchema);
