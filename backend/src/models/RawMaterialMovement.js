const mongoose = require('mongoose');

const rawMaterialMovementSchema = new mongoose.Schema(
  {
    transaction_number: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    transaction_type: {
      type: String,
      required: true,
      enum: [
        'Opening Stock',
        'Purchase Inward',
        'Purchase Return',
        'Manufacturing Issue',
        'Material Issue to Supplier',
        'Production Consumption',
        'Material Return Dispatched',
        'Material Return Received',
        'Stock Adjustment',
      ],
      index: true,
    },
    reference_no: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    reference_type: {
      type: String,
      default: '',
    },
    raw_material_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: true,
      index: true,
    },
    material_code: {
      type: String,
      default: '',
    },
    material_name: {
      type: String,
      default: '',
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      index: true,
    },
    supplier_name: {
      type: String,
      default: '',
    },
    manufacturing_po_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
      index: true,
    },
    po_number: {
      type: String,
      default: '',
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
      index: true,
    },
    warehouse_name: {
      type: String,
      default: '',
    },
    source_location: {
      type: String,
      default: '',
    },
    destination_location: {
      type: String,
      default: '',
    },
    qty_in: {
      type: Number,
      default: 0,
    },
    qty_out: {
      type: Number,
      default: 0,
    },
    uom: {
      type: String,
      default: 'KG',
    },
    warehouse_balance: {
      type: Number,
      default: 0,
    },
    supplier_balance: {
      type: Number,
      default: 0,
    },
    in_transit_balance: {
      type: Number,
      default: 0,
    },
    total_company_balance: {
      type: Number,
      default: 0,
    },
    consumed_qty: {
      type: Number,
      default: 0,
    },
    return_status: {
      type: String,
      enum: ['none', 'pending', 'return_requested', 'in_transit', 'partially_received', 'received', 'cancelled'],
      default: 'none',
    },
    created_by: {
      type: String,
      default: 'Admin User',
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for ledger lookups
rawMaterialMovementSchema.index({ raw_material_id: 1, date: -1 });
rawMaterialMovementSchema.index({ warehouse_id: 1, raw_material_id: 1 });
rawMaterialMovementSchema.index({ supplier_id: 1, raw_material_id: 1 });

module.exports = mongoose.model('RawMaterialMovement', rawMaterialMovementSchema);
