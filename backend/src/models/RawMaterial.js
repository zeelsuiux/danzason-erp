const mongoose = require('mongoose');

const warehouseStockSchema = new mongoose.Schema(
  {
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    warehouse_name: {
      type: String,
      default: '',
    },
    current_stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const supplierStockSchema = new mongoose.Schema(
  {
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplier_name: {
      type: String,
      default: '',
    },
    current_stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    consumed_stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    pending_return_stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const rawMaterialSchema = new mongoose.Schema(
  {
    material_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    material_name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Fabric',
      trim: true,
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    uom: {
      type: String,
      default: 'KG',
      uppercase: true,
      trim: true,
    },
    purchase_unit: {
      type: String,
      default: 'KG',
      uppercase: true,
      trim: true,
    },
    stock_unit: {
      type: String,
      default: 'KG',
      uppercase: true,
      trim: true,
    },
    conversion_factor: {
      type: Number,
      default: 1,
    },
    default_supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    purchase_rate: {
      type: Number,
      default: 0,
      min: 0,
    },
    cost_rate: {
      type: Number,
      default: 0,
      min: 0,
    },
    min_stock_level: {
      type: Number,
      default: 5,
    },
    reorder_level: {
      type: Number,
      default: 10,
    },
    opening_stock: {
      type: Number,
      default: 0,
    },
    opening_stock_value: {
      type: Number,
      default: 0,
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    hsn_code: {
      type: String,
      default: '5208',
      trim: true,
    },
    gst_rate: {
      type: Number,
      default: 5,
    },
    // Stock Distribution
    warehouse_stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    supplier_stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    in_transit_stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    warehouse_balances: [warehouseStockSchema],
    supplier_balances: [supplierStockSchema],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    notes: {
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

// Auto-generate code if empty
rawMaterialSchema.pre('save', async function (next) {
  if (!this.material_code) {
    const count = await mongoose.model('RawMaterial').countDocuments();
    this.material_code = `RM-${String(count + 1).padStart(3, '0')}`;
  }

  // Calculate total company-owned stock
  this.total_stock =
    Number(this.warehouse_stock || 0) +
    Number(this.supplier_stock || 0) +
    Number(this.in_transit_stock || 0);

  next();
});

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
