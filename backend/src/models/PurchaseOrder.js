const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
      default: null,
    },
    raw_material_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      default: null,
    },
    item_type: {
      type: String,
      enum: ['product', 'raw_material', 'manufacturing_service'],
      default: 'product',
    },
    item_name: {
      type: String,
      default: '',
    },
    uom: {
      type: String,
      default: 'PCS',
    },
    description: {
      type: String,
      default: '',
    },
    ordered_qty: {
      type: Number,
      required: true,
      min: 1,
    },
    received_qty: {
      type: Number,
      default: 0,
    },
    pending_qty: {
      type: Number,
      default: function () {
        return this.ordered_qty;
      },
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    discount_percent: {
      type: Number,
      default: 0,
    },
    taxable_amount: {
      type: Number,
      default: 0,
    },
    gst_rate: {
      type: Number,
      default: 18,
    },
    cgst_amount: {
      type: Number,
      default: 0,
    },
    sgst_amount: {
      type: Number,
      default: 0,
    },
    igst_amount: {
      type: Number,
      default: 0,
    },
    total_amount: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    po_number: {
      type: String,
      trim: true,
    },
    po_date: {
      type: Date,
      default: Date.now,
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    pr_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequisition',
      default: null,
    },
    expected_delivery_date: {
      type: Date,
      default: null,
    },
    payment_terms: {
      type: String,
      default: 'Net 30 Days',
    },
    delivery_terms: {
      type: String,
      default: 'FOB Destination',
    },
    reference_no: {
      type: String,
      default: '',
    },
    billing_address: {
      type: String,
      default: '',
    },
    shipping_address: {
      type: String,
      default: '',
    },
    is_interstate: {
      type: Boolean,
      default: false,
    },
    purchase_type: {
      type: String,
      enum: ['standard', 'raw_material', 'manufacturing'],
      default: 'standard',
    },
    // Manufacturing / Job Work Purchasing Fields
    finished_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    finished_product_name: {
      type: String,
      default: '',
    },
    manufacturing_rate: {
      type: Number,
      default: 0,
      min: 0,
    },
    manufacturing_qty: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed_qty: {
      type: Number,
      default: 0,
    },
    received_qty: {
      type: Number,
      default: 0,
    },
    raw_materials_required: [
      {
        raw_material_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RawMaterial',
          required: true,
        },
        material_code: { type: String, default: '' },
        material_name: { type: String, default: '' },
        uom: { type: String, default: 'KG' },
        cost_rate: { type: Number, default: 0 },
        planned_qty: { type: Number, required: true },
        issued_qty: { type: Number, default: 0 },
        consumed_qty: { type: Number, default: 0 },
        unused_qty: { type: Number, default: 0 },
        returned_qty: { type: Number, default: 0 },
        pending_at_supplier_qty: { type: Number, default: 0 },
      },
    ],
    material_issues: [
      {
        issue_number: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
        warehouse_name: { type: String, default: '' },
        items: [
          {
            raw_material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
            material_name: { type: String, default: '' },
            qty: { type: Number, required: true },
            uom: { type: String, default: 'KG' },
          },
        ],
        remarks: { type: String, default: '' },
        created_by: { type: String, default: 'Admin' },
      },
    ],
    production_consumptions: [
      {
        consumption_number: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        completed_finished_qty: { type: Number, required: true },
        items: [
          {
            raw_material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
            material_name: { type: String, default: '' },
            consumed_qty: { type: Number, required: true },
            uom: { type: String, default: 'KG' },
          },
        ],
        remarks: { type: String, default: '' },
        created_by: { type: String, default: 'Admin' },
      },
    ],
    finished_goods_receipts: [
      {
        receipt_number: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
        warehouse_name: { type: String, default: '' },
        received_qty: { type: Number, required: true },
        rejected_qty: { type: Number, default: 0 },
        remarks: { type: String, default: '' },
        created_by: { type: String, default: 'Admin' },
      },
    ],
    material_returns: [
      {
        return_number: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        raw_material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
        material_name: { type: String, default: '' },
        requested_qty: { type: Number, required: true },
        dispatched_qty: { type: Number, default: 0 },
        received_qty: { type: Number, default: 0 },
        uom: { type: String, default: 'KG' },
        warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
        warehouse_name: { type: String, default: '' },
        status: {
          type: String,
          enum: [
            'pending',
            'return_requested',
            'in_transit',
            'partially_received',
            'received',
            'cancelled',
          ],
          default: 'return_requested',
        },
        dispatch_date: { type: Date, default: null },
        receipt_date: { type: Date, default: null },
        received_by: { type: String, default: '' },
        remarks: { type: String, default: '' },
        created_by: { type: String, default: 'Admin' },
      },
    ],
    items: [purchaseOrderItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    taxable_amount: {
      type: Number,
      default: 0,
    },
    cgst_total: {
      type: Number,
      default: 0,
    },
    sgst_total: {
      type: Number,
      default: 0,
    },
    igst_total: {
      type: Number,
      default: 0,
    },
    round_off: {
      type: Number,
      default: 0,
    },
    grand_total: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'partially_received', 'received', 'completed', 'cancelled'],
      default: 'sent',
    },
    notes: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
    },
    revision_history: [
      {
        edited_at: { type: Date, default: Date.now },
        edited_by: { type: String, default: 'Admin' },
        reason: { type: String, default: 'Purchase order updated' },
        previous_grand_total: { type: Number },
        previous_items_count: { type: Number },
        notes: { type: String, default: '' },
      },
    ],
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

purchaseOrderSchema.pre('save', async function (next) {
  if (!this.po_number) {
    try {
      const { getNextSequence } = require('./Counter');
      const now = new Date(this.po_date || Date.now());
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const fyStart = month >= 4 ? year : year - 1;
      const fyEnd = String((fyStart + 1) % 100).padStart(2, '0');
      const fyString = `${fyStart}-${fyEnd}`;
      const prefix = this.purchase_type === 'manufacturing' ? 'MPO' : 'PO';
      const seq = await getNextSequence(`${prefix.toLowerCase()}_${fyString}`, 'PurchaseOrder', 'po_number');
      this.po_number = `${prefix}-${fyString}-${String(seq).padStart(4, '0')}`;
    } catch (err) {
      return next(err);
    }
  }

  // Calculate line items and totals
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  if (this.items && this.items.length) {
    this.items.forEach((item) => {
      const discount = (item.rate * (item.discount_percent || 0)) / 100;
      const netRate = item.rate - discount;
      item.taxable_amount = Number((item.ordered_qty * netRate).toFixed(2));
      item.pending_qty = Math.max(0, (item.ordered_qty || 0) - (item.received_qty || 0));

      const gst = item.gst_rate || 0;
      if (this.is_interstate) {
        item.cgst_amount = 0;
        item.sgst_amount = 0;
        item.igst_amount = Number(((item.taxable_amount * gst) / 100).toFixed(2));
        igstTotal += item.igst_amount;
      } else {
        const halfGst = gst / 2;
        item.cgst_amount = Number(((item.taxable_amount * halfGst) / 100).toFixed(2));
        item.sgst_amount = Number(((item.taxable_amount * halfGst) / 100).toFixed(2));
        item.igst_amount = 0;
        cgstTotal += item.cgst_amount;
        sgstTotal += item.sgst_amount;
      }

      item.total_amount = Number(
        (item.taxable_amount + item.cgst_amount + item.sgst_amount + item.igst_amount).toFixed(2)
      );
      subtotal += item.taxable_amount;
    });
  }

  this.taxable_amount = Number(subtotal.toFixed(2));
  this.subtotal = Number(subtotal.toFixed(2));
  this.cgst_total = Number(cgstTotal.toFixed(2));
  this.sgst_total = Number(sgstTotal.toFixed(2));
  this.igst_total = Number(igstTotal.toFixed(2));

  const totalBeforeRound = this.taxable_amount + this.cgst_total + this.sgst_total + this.igst_total;
  const rounded = Math.round(totalBeforeRound);
  this.round_off = Number((rounded - totalBeforeRound).toFixed(2));
  this.grand_total = rounded;

  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
