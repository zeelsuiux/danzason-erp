const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
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
    hsn_code: {
      type: String,
      default: '6109',
    },
    ordered_qty: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    uom: {
      type: String,
      default: 'PCS',
    },
    unit_rate: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    final_discount_share: {
      type: Number,
      default: 0,
    },
    taxable_amount: {
      type: Number,
      default: 0,
    },
    gst_rate: {
      type: Number,
      default: 5,
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

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    invoice_number: {
      type: String,
      trim: true,
    },
    vendor_bill_number: {
      type: String,
      trim: true,
      default: '',
    },
    supplier_invoice_number: {
      type: String,
      trim: true,
      default: '',
    },
    challan_number: {
      type: String,
      trim: true,
      default: '',
    },
    challan_date: {
      type: Date,
      default: null,
    },
    bill_date: {
      type: Date,
      default: Date.now,
    },
    supplier_invoice_date: {
      type: Date,
      default: null,
    },
    due_date: {
      type: Date,
      default: null,
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
    po_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
    manufacturing_po_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
    purchase_type: {
      type: String,
      enum: ['standard', 'raw_material', 'manufacturing'],
      default: 'standard',
    },
    is_service_bill: {
      type: Boolean,
      default: false,
    },
    grn_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoodsReceiptNote',
      default: null,
    },
    grn_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GoodsReceiptNote',
      },
    ],
    items: [invoiceItemSchema],
    // Final Bill Discount Fields
    final_discount_type: {
      type: String,
      enum: ['none', 'percentage', 'fixed'],
      default: 'none',
    },
    final_discount_value: {
      type: Number,
      default: 0,
    },
    final_discount_amount: {
      type: Number,
      default: 0,
    },
    taxable_amount_after_discount: {
      type: Number,
      default: 0,
    },
    discount_total: {
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
    shipping_charges: {
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
    paid_amount: {
      type: Number,
      default: 0,
    },
    balance_amount: {
      type: Number,
      default: 0,
    },
    payment_terms: {
      type: String,
      default: 'Net 30 Days',
    },
    payment_status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
    },
    tds_applicable: {
      type: Boolean,
      default: false,
    },
    tds_rate: {
      type: Number,
      default: 0,
    },
    tds_amount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'posted', 'cancelled'],
      default: 'posted',
    },
    remarks: {
      type: String,
      default: '',
    },
    payments: [
      {
        amount: { type: Number, required: true },
        payment_date: { type: Date, default: Date.now },
        payment_mode: { type: String, default: 'Bank Transfer' },
        reference_number: { type: String, default: '' },
        remarks: { type: String, default: '' },
        created_at: { type: Date, default: Date.now },
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

purchaseInvoiceSchema.pre('save', async function (next) {
  // Sync vendor_bill_number and supplier_invoice_number
  if (!this.vendor_bill_number && this.supplier_invoice_number) {
    this.vendor_bill_number = this.supplier_invoice_number;
  }
  if (!this.supplier_invoice_number && this.vendor_bill_number) {
    this.supplier_invoice_number = this.vendor_bill_number;
  }

  // Automatic PB Number Generation in FY Format: PB-YYYY-YY-XXXX
  if (!this.invoice_number) {
    try {
      const { getNextSequence } = require('./Counter');
      const now = this.bill_date ? new Date(this.bill_date) : new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const fyStart = currentMonth >= 4 ? currentYear : currentYear - 1;
      const fyEnd = (fyStart + 1) % 100;
      const fyString = `${fyStart}-${String(fyEnd).padStart(2, '0')}`;
      const seq = await getNextSequence(`purchase_bill_${fyString}`, 'PurchaseInvoice', 'invoice_number');
      this.invoice_number = `PB-${fyString}-${String(seq).padStart(4, '0')}`;
    } catch (err) {
      return next(err);
    }
  }

  // Calculate totals & proportional final bill discount
  if (this.items && this.items.length) {
    let grossSubtotal = 0;
    let itemDiscTotal = 0;

    // First pass: Compute gross subtotal and item discounts
    this.items.forEach((item) => {
      const lineGross = (Number(item.quantity) || 0) * (Number(item.unit_rate) || 0);
      const lineDisc = Number(item.discount) || 0;
      grossSubtotal += lineGross;
      itemDiscTotal += lineDisc;
    });

    // Compute Final Bill Discount
    const discType = this.final_discount_type || 'none';
    const discVal = Number(this.final_discount_value) || 0;
    let computedFinalDiscount = 0;

    if (discType === 'percentage') {
      computedFinalDiscount = (grossSubtotal * Math.min(100, Math.max(0, discVal))) / 100;
    } else if (discType === 'fixed') {
      computedFinalDiscount = Math.min(grossSubtotal, Math.max(0, discVal));
    }

    this.final_discount_amount = Number(computedFinalDiscount.toFixed(2));

    // Second pass: Distribute final bill discount proportionately across items and compute GST
    let taxableTotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    this.items.forEach((item) => {
      const lineGross = (Number(item.quantity) || 0) * (Number(item.unit_rate) || 0);
      const ratio = grossSubtotal > 0 ? lineGross / grossSubtotal : 0;
      const itemFinalDiscountShare = Number((ratio * computedFinalDiscount).toFixed(2));
      item.final_discount_share = itemFinalDiscountShare;

      const lineDisc = Number(item.discount) || 0;
      const taxable = Math.max(0, lineGross - lineDisc - itemFinalDiscountShare);
      item.taxable_amount = Number(taxable.toFixed(2));

      const gst = Number(item.gst_rate) || 0;
      const gstAmt = (item.taxable_amount * gst) / 100;

      // Check intra-state (CGST+SGST) vs inter-state (IGST)
      const isInterState = this.igst_total > 0 || item.igst_amount > 0;
      if (isInterState) {
        item.cgst_amount = 0;
        item.sgst_amount = 0;
        item.igst_amount = Number(gstAmt.toFixed(2));
      } else {
        item.cgst_amount = Number(((gstAmt) / 2).toFixed(2));
        item.sgst_amount = Number(((gstAmt) / 2).toFixed(2));
        item.igst_amount = 0;
      }

      item.total_amount = Number(
        (item.taxable_amount + item.cgst_amount + item.sgst_amount + item.igst_amount).toFixed(2)
      );

      taxableTotal += item.taxable_amount;
      cgst += item.cgst_amount;
      sgst += item.sgst_amount;
      igst += item.igst_amount;
    });

    this.discount_total = Number((itemDiscTotal + this.final_discount_amount).toFixed(2));
    this.taxable_amount = Number(taxableTotal.toFixed(2));
    this.taxable_amount_after_discount = Number(taxableTotal.toFixed(2));
    this.cgst_total = Number(cgst.toFixed(2));
    this.sgst_total = Number(sgst.toFixed(2));
    this.igst_total = Number(igst.toFixed(2));

    const totalBeforeRound =
      this.taxable_amount +
      this.cgst_total +
      this.sgst_total +
      this.igst_total +
      (Number(this.shipping_charges) || 0);

    this.grand_total = Math.round(totalBeforeRound);
    this.round_off = Number((this.grand_total - totalBeforeRound).toFixed(2));
  }

  if (this.balance_amount === undefined || this.balance_amount === null) {
    this.balance_amount = this.grand_total - (this.paid_amount || 0);
  }

  next();
});

purchaseInvoiceSchema.index({ invoice_number: 1 }, { unique: true, sparse: true });
purchaseInvoiceSchema.index({ supplier_id: 1, is_deleted: 1 });
purchaseInvoiceSchema.index({ po_id: 1 });
purchaseInvoiceSchema.index({ payment_status: 1 });

module.exports = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);
