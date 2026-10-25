const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    product_name: {
      type: String,
      default: '',
    },
    sku: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    unit: {
      type: String,
      default: 'PCS',
    },
    purchased_qty: {
      type: Number,
      default: 0,
    },
    previously_returned_qty: {
      type: Number,
      default: 0,
    },
    available_qty: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0,
    },
    gst_rate: {
      type: Number,
      default: 18,
    },
    taxable_amount: {
      type: Number,
      default: 0,
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
    total: {
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

const purchaseReturnSchema = new mongoose.Schema(
  {
    return_number: {
      type: String,
      trim: true,
    },
    return_date: {
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
      default: null,
    },
    bill_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseInvoice',
      default: null,
    },
    original_invoice_number: {
      type: String,
      default: '',
      trim: true,
    },
    po_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
    grn_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoodsReceiptNote',
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    debit_note_number: {
      type: String,
      default: '',
      trim: true,
    },
    debit_note_date: {
      type: Date,
      default: null,
    },
    is_interstate: {
      type: Boolean,
      default: false,
    },
    items: [returnItemSchema],
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
      enum: ['draft', 'approved', 'completed'],
      default: 'approved',
    },
    notes: {
      type: String,
      default: '',
    },
    remarks: {
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

purchaseReturnSchema.pre('save', async function (next) {
  if (!this.return_number) {
    try {
      const { getNextSequence } = require('./Counter');
      const now = new Date(this.return_date || Date.now());
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const fyStart = month >= 4 ? year : year - 1;
      const fyEnd = String((fyStart + 1) % 100).padStart(2, '0');
      const fyString = `${fyStart}-${fyEnd}`;
      const seq = await getNextSequence(`pr_${fyString}`, 'PurchaseReturn', 'return_number');
      this.return_number = `PR-${fyString}-${String(seq).padStart(4, '0')}`;
    } catch (err) {
      // Fallback
      const count = await mongoose.model('PurchaseReturn').countDocuments();
      this.return_number = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
  }

  // Calculate items and totals
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  if (this.items && this.items.length) {
    this.items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.unit_price) || 0;
      item.taxable_amount = Number((qty * rate).toFixed(2));

      const gst = Number(item.gst_rate) || 0;
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

      item.total = Number((item.taxable_amount + item.cgst_amount + item.sgst_amount + item.igst_amount).toFixed(2));
      item.total_amount = item.total;
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

module.exports = mongoose.model('PurchaseReturn', purchaseReturnSchema);
