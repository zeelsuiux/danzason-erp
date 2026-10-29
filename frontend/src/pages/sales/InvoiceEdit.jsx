import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Building,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign,
  Clock,
  Package,
  Lock,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SearchableSelect from '../../components/common/SearchableSelect';
import StatusBadge from '../../components/common/StatusBadge';
import ProductSearchDropdown from '../../components/common/ProductSearchDropdown';
import { salesApi, Dt, St } from '../../services/procurementService';
import { calculateDynamicUnitPrice, detectCustomerChannel, matchProductVariant } from '../../utils/pricingRules';

export default function InvoiceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pricingRules, setPricingRules] = useState(null);
  const [pricingTier, setPricingTier] = useState('B2B'); // 'B2B' | 'B2C'
  const [finalDiscountType, setFinalDiscountType] = useState('fixed'); // 'percentage' | 'fixed'
  const [finalDiscountValue, setFinalDiscountValue] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIndex, setPickerIndex] = useState(null);

  // Form State
  const [form, setForm] = useState({
    customer_id: '',
    place_of_supply: 'Gujarat',
    invoice_date: '',
    due_date: '',
    notes: '',
    items: [],
    // Settlement options
    pay_mode_type: 'single', // 'single' | 'split'
    payment_amount: 0,
    payment_mode: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    payment_reference: '',
    split_cash: 0,
    split_online: 0,
  });

  useEffect(() => {
    if (!id) {
      navigate('/sales/invoices', { replace: true });
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, custRes, prodRes, pricingRes] = await Promise.all([
        salesApi.getInvoiceById(id),
        salesApi.getCustomers({ limit: 100 }).catch(() => ({ data: [] })),
        Dt.getProducts({ limit: 200, view: 'color' }).catch(() => ({ data: [] })),
        St.getPricingRules().catch(() => ({ data: null })),
      ]);

      const inv = invRes.data;
      setInvoice(inv);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      if (pricingRes?.data) {
        setPricingRules(pricingRes.data);
      }
      let prodList = Array.isArray(prodRes.data) ? prodRes.data : [];
      if (prodList.length === 0) {
        const fallback = await Dt.getProducts({ limit: 100 }).catch(() => ({ data: [] }));
        prodList = Array.isArray(fallback.data) ? fallback.data : [];
      }
      setProducts(prodList);

      const detectedTier = inv.pricing_tier || (['B2C', 'RETAIL', 'D2C'].includes(String(inv.customer_id?.customer_type).toUpperCase()) ? 'B2C' : 'B2B');
      setPricingTier(detectedTier);
      setFinalDiscountType(inv.final_discount_type || 'fixed');
      setFinalDiscountValue(inv.final_discount_value || 0);

      const existingItems =
        inv.items && inv.items.length > 0
          ? inv.items.map((it) => ({
              product_id: it.product_id?._id || it.product_id || '',
              product_name: it.product_name || '',
              hsn_code: it.hsn_code || '6109',
              quantity: it.quantity || 1,
              uom: it.uom || 'PCS',
              unit_price: it.unit_price || 0,
              discount_type: it.discount_amount > 0 && (!it.discount_percentage || it.discount_percentage === 0) ? 'amount' : 'percentage',
              discount_percentage: it.discount_percentage || 0,
              discount_amount: it.discount_amount || 0,
              gst_rate: it.gst_rate !== undefined ? it.gst_rate : 5,
            }))
          : [
              {
                product_id: '',
                product_name: '',
                hsn_code: '6109',
                quantity: 1,
                uom: 'PCS',
                unit_price: 0,
                discount_type: 'percentage',
                discount_percentage: 0,
                discount_amount: 0,
                gst_rate: 5,
              },
            ];

      setForm({
        customer_id: inv.customer_id?._id || inv.customer_id || '',
        place_of_supply: inv.place_of_supply || inv.customer_id?.billing_address?.state || 'Gujarat',
        invoice_date: inv.invoice_date ? new Date(inv.invoice_date).toISOString().split('T')[0] : '',
        due_date: inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : '',
        notes: inv.notes || '',
        items: existingItems,
        pay_mode_type: 'single',
        payment_amount: 0,
        payment_mode: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        payment_reference: '',
        split_cash: 0,
        split_online: 0,
      });
    } catch (err) {
      console.error('Failed to load invoice edit data:', err);
      alert('Failed to load invoice details: ' + (err.message || 'Unknown error'));
      navigate('/sales/invoices');
    } finally {
      setLoading(false);
    }
  };

  // Add Item Row
  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          product_name: '',
          hsn_code: '6109',
          quantity: 1,
          uom: 'PCS',
          unit_price: 0,
          discount_type: 'percentage',
          discount_percentage: 0,
          discount_amount: 0,
          gst_rate: 5,
        },
      ],
    }));
  };

  // Pricing tier switcher: updates prices of all selected items
  const handlePricingTierChange = (newTier) => {
    setPricingTier(newTier);
    setForm((prev) => {
      const updated = prev.items.map((it) => {
        if (!it.product_id) return it;
        const prod = it.product_obj || matchProductVariant(products, it);
        if (!prod) return it;

        const dyn = calculateDynamicUnitPrice(
          prod,
          it.quantity || 1,
          newTier,
          pricingRules
        );
        const newRate = dyn.unitPrice;

        const gross = (Number(it.quantity) || 1) * newRate;
        let discAmt = it.discount_amount;
        if (it.discount_type === 'percentage') {
          discAmt = Number(((gross * (Number(it.discount_percentage) || 0)) / 100).toFixed(2));
        }

        return {
          ...it,
          unit_price: newRate,
          discount_amount: discAmt,
        };
      });
      return { ...prev, items: updated };
    });
  };

  const handleSelectCustomer = (custId) => {
    const cust = customers.find((c) => (c._id || c.id) === custId);
    let detectedTier = 'B2B';
    if (cust) {
      detectedTier = detectCustomerChannel(cust);
    }
    setForm((prev) => ({
      ...prev,
      customer_id: custId,
      place_of_supply: cust?.shipping_address?.state || cust?.billing_address?.state || prev.place_of_supply || 'Gujarat',
    }));
    handlePricingTierChange(detectedTier);
  };

  // Remove Item Row
  const handleRemoveItem = (index) => {
    if (form.items.length <= 1) {
      alert('Invoice must have at least one line item.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Update Item Field
  const handleItemChange = (index, field, value) => {
    const updated = [...form.items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'quantity') {
      const qty = Math.max(1, parseInt(value, 10) || 1);
      const it = updated[index];
      const prod = it.product_obj || matchProductVariant(products, it);
      if (prod) {
        const dyn = calculateDynamicUnitPrice(prod, qty, pricingTier, pricingRules);
        it.unit_price = dyn.unitPrice;
        it.pricing_info = dyn.pricingInfo;
      }
      const gross = qty * (Number(it.unit_price) || 0);
      if (updated[index].discount_type === 'percentage') {
        updated[index].discount_amount = Number(
          ((gross * (Number(updated[index].discount_percentage) || 0)) / 100).toFixed(2)
        );
      }
    }

    setForm((prev) => ({ ...prev, items: updated }));
  };

  // Dual discount handlers: % and ₹ support
  const handleItemDiscountChange = (index, val, type) => {
    const num = Math.max(0, parseFloat(val) || 0);
    const updated = [...form.items];
    const it = updated[index];
    const gross = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);

    if (type === 'percentage') {
      const pct = Math.min(100, num);
      const amt = Number(((gross * pct) / 100).toFixed(2));
      it.discount_type = 'percentage';
      it.discount_percentage = pct;
      it.discount_amount = amt;
    } else {
      const amt = Math.min(gross, num);
      const pct = gross > 0 ? Number(((amt / gross) * 100).toFixed(2)) : 0;
      it.discount_type = 'amount';
      it.discount_amount = amt;
      it.discount_percentage = pct;
    }

    setForm((prev) => ({ ...prev, items: updated }));
  };

  const handleToggleDiscountType = (index) => {
    const updated = [...form.items];
    const it = updated[index];
    it.discount_type = it.discount_type === 'amount' ? 'percentage' : 'amount';
    setForm((prev) => ({ ...prev, items: updated }));
  };

  // Select Product from catalogue
  const handleSelectProduct = (index, prod) => {
    const productObj =
      typeof prod === 'object' && prod !== null
        ? prod
        : products.find((p) => p._id === prod || p.id === prod || p.product_id === prod);

    const updated = [...form.items];
    if (productObj) {
      const qty = Number(updated[index].quantity) || 1;
      const dyn = calculateDynamicUnitPrice(productObj, qty, pricingTier, pricingRules);
      const rate = dyn.unitPrice;

      updated[index] = {
        ...updated[index],
        product_id: productObj.product_id || productObj._id || productObj.id,
        _variant_id: productObj._id,
        product_obj: productObj,
        product_name: productObj.product_name || productObj.title || '',
        sku: productObj.sku || productObj.sku_id || productObj.product_code || '',
        hsn_code: productObj.hsn_code || '6109',
        uom: productObj.uom || 'PCS',
        unit_price: rate,
        pricing_info: dyn.pricingInfo,
        purchase_rate: Number(productObj.purchase_rate || productObj.cost_rate || 0),
        cost_rate: Number(productObj.cost_rate || productObj.purchase_rate || 0),
        purchase_batches: productObj.purchase_batches || [],
        discount_type: updated[index].discount_type || 'percentage',
        discount_percentage: updated[index].discount_percentage || 0,
        discount_amount: updated[index].discount_amount || 0,
        gst_rate: productObj.gst_rate !== undefined ? productObj.gst_rate : 5,
        color_variant: productObj.color
          ? {
              color_name: productObj.color,
              color_code: productObj.color_code || '',
            }
          : updated[index].color_variant,
      };
    } else {
      updated[index] = {
        ...updated[index],
        product_id: '',
      };
    }
    setForm((prev) => ({ ...prev, items: updated }));
  };

  // Compute live totals
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let tax_total = 0;

    (form.items || []).forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.unit_price) || 0;
      const gross = qty * rate;
      const disc =
        it.discount_type === 'amount'
          ? Number(it.discount_amount) || 0
          : (gross * (Number(it.discount_percentage) || 0)) / 100;
      const taxable = Math.max(0, gross - disc);
      const gst = (taxable * (Number(it.gst_rate) || 5)) / 100;

      subtotal += gross;
      itemDiscountTotal += disc;
      tax_total += gst;
    });

    let finalDiscountAmt = 0;
    const finalVal = Number(finalDiscountValue) || 0;
    if (finalVal > 0) {
      if (finalDiscountType === 'percentage') {
        finalDiscountAmt = (subtotal * finalVal) / 100;
      } else {
        finalDiscountAmt = finalVal;
      }
    }

    const totalDiscount = Math.round(itemDiscountTotal + finalDiscountAmt);
    const grand_total = Math.round(
      Math.max(0, subtotal - totalDiscount) + tax_total + (invoice?.shipping_charges || 0)
    );

    const existingPaid = (invoice?.payments || []).reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0
    );
    const pendingBalance = Math.max(0, grand_total - existingPaid);

    return {
      subtotal: Math.round(subtotal),
      itemDiscountTotal: Math.round(itemDiscountTotal),
      finalDiscountAmt: Math.round(finalDiscountAmt),
      totalDiscount,
      tax_total: Math.round(tax_total),
      grand_total,
      existingPaid,
      pendingBalance,
    };
  };

  // Quick Payment Helper (Full Paid, 50%, Full Credit)
  const setQuickPayment = (type) => {
    const { pendingBalance } = calculateTotals();
    if (type === 'full') {
      if (form.pay_mode_type === 'split') {
        const half = Math.round(pendingBalance / 2);
        setForm((prev) => ({ ...prev, split_cash: half, split_online: pendingBalance - half }));
      } else {
        setForm((prev) => ({ ...prev, payment_amount: pendingBalance }));
      }
    } else if (type === 'half') {
      const half = Math.round(pendingBalance / 2);
      if (form.pay_mode_type === 'split') {
        setForm((prev) => ({
          ...prev,
          split_cash: Math.round(half / 2),
          split_online: half - Math.round(half / 2),
        }));
      } else {
        setForm((prev) => ({ ...prev, payment_amount: half }));
      }
    } else if (type === 'zero') {
      setForm((prev) => ({ ...prev, payment_amount: 0, split_cash: 0, split_online: 0 }));
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      alert('Please select a customer.');
      return;
    }
    if (form.items.some((it) => !it.product_id && !it._id)) {
      alert('All invoice items must be selected from the authoritative API product catalog.');
      return;
    }
    if (form.items.some((it) => !it.product_name?.trim())) {
      alert('All items must have a valid product name from the API catalog.');
      return;
    }

    try {
      setSubmitting(true);
      const isSplit = form.pay_mode_type === 'split';
      const payload = {
        customer_id: form.customer_id,
        pricing_tier: pricingTier,
        final_discount_type: finalDiscountType,
        final_discount_value: finalDiscountValue,
        place_of_supply: form.place_of_supply,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        notes: form.notes,
        items: form.items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          sku: it.sku,
          hsn_code: it.hsn_code,
          quantity: it.quantity,
          uom: it.uom,
          unit_price: it.unit_price,
          discount_percentage: it.discount_percentage,
          discount_amount: it.discount_amount,
          gst_rate: it.gst_rate,
        })),
        is_split_payment: isSplit,
        payment_amount: !isSplit ? Number(form.payment_amount) || 0 : 0,
        payment_mode: form.payment_mode,
        payment_date: form.payment_date,
        payment_reference: form.payment_reference,
        split_cash: isSplit ? Number(form.split_cash) || 0 : 0,
        split_online: isSplit ? Number(form.split_online) || 0 : 0,
      };

      await salesApi.updateInvoice(id, payload);
      alert('Invoice updated successfully!');
      navigate('/sales/invoices');
    } catch (err) {
      alert(err.message || 'Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-9 h-9 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-semibold">Loading Invoice Edit Form...</p>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <PageHeader
        title={`Edit Invoice: ${invoice.invoice_number}`}
        subtitle="Full dedicated invoice editor (My Metaji Style) — Modify items, customer, taxes & settlement."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Invoices', href: '/sales/invoices' },
          { label: `Edit ${invoice.invoice_number}` },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/sales/invoices')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Invoices</span>
            </button>
            <button
              type="submit"
              form="invoice-edit-form"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-brand text-white hover:bg-brand-600 transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving Changes...' : 'Save Invoice'}</span>
            </button>
          </div>
        }
      />

      <form id="invoice-edit-form" onSubmit={handleSubmit} className="space-y-6">
        {/* PANEL 1: INVOICE & CUSTOMER META */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-brand" />
            <span>Invoice & Customer Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Invoice Number</label>
              <input
                type="text"
                disabled
                value={invoice.invoice_number}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Customer Name <span className="text-rose-500">*</span></span>
                {form.customer_id && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                    {pricingTier} Customer
                  </span>
                )}
              </label>
              <SearchableSelect
                options={customers.map((c) => ({
                  value: c._id,
                  label: c.customer_name,
                  subLabel: `${c.customer_code} • ${c.customer_type || 'B2B'} • ${c.mobile || 'No Mobile'} • ${c.billing_address?.city || 'Gujarat'}`,
                }))}
                value={form.customer_id}
                onChange={(val) => handleSelectCustomer(val)}
                placeholder="Search & select customer..."
                allowClear={false}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Invoice Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block font-bold text-slate-700 mb-1">
                Place of Supply (Tax Computation)
              </label>
              <select
                value={form.place_of_supply}
                onChange={(e) => setForm({ ...form, place_of_supply: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand bg-white"
              >
                <option value="Gujarat">Gujarat (Intra-state: CGST + SGST)</option>
                <option value="Maharashtra">Maharashtra (Inter-state: IGST)</option>
                <option value="Rajasthan">Rajasthan (Inter-state: IGST)</option>
                <option value="Delhi">Delhi (Inter-state: IGST)</option>
                <option value="Madhya Pradesh">Madhya Pradesh (Inter-state: IGST)</option>
                <option value="Karnataka">Karnataka (Inter-state: IGST)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Notes / Terms (Shown on PDF)</label>
              <input
                type="text"
                placeholder="e.g. Goods once sold will not be taken back without original packaging..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        {/* PANEL 2: LINE ITEMS TABLE (EDITABLE) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Line Items & Pricing</h3>
              <p className="text-xs text-slate-500">
                Add, modify or remove product items. Rates and GST are recalculated live.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-brand hover:bg-emerald-100 transition border border-emerald-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[880px]">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[11px]">
                <tr>
                  <th className="p-3 w-80">Product Name / Description</th>
                  <th className="p-3 w-24 text-center">HSN/SAC</th>
                  <th className="p-3 w-20 text-center">Qty</th>
                  <th className="p-3 w-16 text-center">Unit</th>
                  <th className="p-3 w-28 text-right">Rate (₹)</th>
                  <th className="p-3 w-36 text-center">Discount (% / ₹)</th>
                  <th className="p-3 w-24 text-right">Taxable</th>
                  <th className="p-3 w-24 text-center">GST Rate</th>
                  <th className="p-3 w-28 text-right">Line Total</th>
                  <th className="p-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.items.map((it, idx) => {
                  const qty = Number(it.quantity) || 0;
                  const rate = Number(it.unit_price) || 0;
                  const gross = qty * rate;
                  const disc =
                    it.discount_type === 'amount'
                      ? Number(it.discount_amount) || 0
                      : (gross * (Number(it.discount_percentage) || 0)) / 100;
                  const lineTaxable = Math.max(0, gross - disc);
                  const lineGst = (lineTaxable * (Number(it.gst_rate) || 5)) / 100;
                  const lineTotal = Math.round(lineTaxable + lineGst);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 align-top min-w-[280px]">
                        <ProductSearchDropdown
                          products={products}
                          pricingTier={pricingTier}
                          selectedProduct={
                            it.product_obj ||
                            matchProductVariant(products, it) ||
                            (it.product_id
                              ? {
                                  product_name: it.product_name,
                                  sku: it.sku,
                                  uom: it.uom,
                                  b2b_price: it.unit_price,
                                  b2c_price: it.unit_price,
                                  selling_rate: it.unit_price,
                                  color: it.color_variant?.color_name,
                                }
                              : null)
                          }
                          onSelectProduct={(prod) => handleSelectProduct(idx, prod)}
                          onClear={() => handleSelectProduct(idx, null)}
                          placeholder="Search product by title, SKU or color..."
                        />
                      </td>

                      <td className="p-2.5 align-top">
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={it.hsn_code || '6109'}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-center font-mono text-xs bg-slate-100 text-slate-600 cursor-not-allowed"
                        />
                      </td>

                      <td className="p-2.5 align-top">
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-center font-mono font-bold text-sm outline-none focus:border-brand"
                        />
                      </td>

                      <td className="p-2.5 align-top">
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={it.uom || 'PCS'}
                          className="w-full px-1.5 py-1.5 border border-slate-200 rounded font-mono text-center text-xs bg-slate-100 text-slate-600 cursor-not-allowed"
                        />
                      </td>

                      <td className="p-2.5 align-top">
                        <div className="relative">
                          <input
                            type="number"
                            readOnly
                            disabled
                            value={it.unit_price}
                            title="Authoritative Price from API (Strictly Read-Only based on Tier)"
                            className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded text-right font-mono font-bold text-sm bg-slate-100 text-slate-700 cursor-not-allowed select-none"
                          />
                          <Lock className="w-3 h-3 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                        </div>
                        {it.pricing_info && (
                          <p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 mt-1 font-mono leading-tight">
                            {it.pricing_info}
                          </p>
                        )}
                      </td>

                      {/* Discount (% / ₹) Dual Mode */}
                      <td className="p-2.5 align-top">
                        <div className="space-y-1">
                          <div className="flex rounded border border-slate-200 overflow-hidden bg-white">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                it.discount_type === 'amount'
                                  ? it.discount_amount || ''
                                  : it.discount_percentage || ''
                              }
                              onChange={(e) =>
                                handleItemDiscountChange(idx, e.target.value, it.discount_type || 'percentage')
                              }
                              placeholder="0"
                              className="w-full px-2 py-1 text-right text-xs font-mono font-bold outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleToggleDiscountType(idx)}
                              className={`px-2 py-1 text-xs font-bold border-l transition ${
                                it.discount_type === 'amount'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}
                              title="Click to toggle between % and ₹"
                            >
                              {it.discount_type === 'amount' ? '₹' : '%'}
                            </button>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 text-right pr-1">
                            {it.discount_type === 'amount' ? (
                              <span>({it.discount_percentage || 0}% off)</span>
                            ) : (
                              <span>(-₹{Math.round(it.discount_amount || 0)})</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Taxable Amount */}
                      <td className="p-2.5 align-top text-right font-mono text-xs font-semibold text-slate-700 pt-3">
                        ₹{Math.round(lineTaxable).toLocaleString('en-IN')}
                      </td>

                      <td className="p-2.5 align-top">
                        <select
                          value={it.gst_rate}
                          onChange={(e) =>
                            handleItemChange(idx, 'gst_rate', Number(e.target.value))
                          }
                          className="w-full px-1.5 py-1.5 border border-slate-200 rounded font-mono text-center outline-none focus:border-brand bg-white"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>

                      <td className="p-2.5 align-top text-right font-mono font-bold text-slate-900 text-sm pt-3">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </td>

                      <td className="p-2.5 align-top text-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL 3: TOTALS & RECORD PAYMENT SETTLEMENT (My Metaji Style) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Invoice Totals & Settlement</h3>
              <p className="text-xs text-slate-500">
                Track payments, settlement installments, or record split payments (Cash + UPI).
              </p>
            </div>
          </div>

          {/* Final Bill Discount & Detailed Tax Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Final Bill Discount:</span>
                <div className="inline-flex rounded border border-slate-200 overflow-hidden text-xs font-bold bg-white">
                  <button
                    type="button"
                    onClick={() => setFinalDiscountType('percentage')}
                    className={`px-2.5 py-1 transition ${
                      finalDiscountType === 'percentage'
                        ? 'bg-brand text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    % Percent
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinalDiscountType('fixed')}
                    className={`px-2.5 py-1 transition ${
                      finalDiscountType === 'fixed'
                        ? 'bg-brand text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ₹ Fixed
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={finalDiscountValue || ''}
                  onChange={(e) => setFinalDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-28 px-3 py-1.5 text-right text-xs font-mono font-bold border border-slate-200 rounded-lg outline-none focus:border-brand bg-white"
                />
                {finalDiscountType === 'percentage' && Number(finalDiscountValue) > 0 && (
                  <span className="text-xs text-emerald-600 font-mono font-semibold">
                    (-₹{totals.finalDiscountAmt.toLocaleString('en-IN')})
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 font-mono">
              <div>
                <span className="text-slate-500 font-sans block">Gross Subtotal:</span>
                <span className="font-bold text-slate-800">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">Total Discount:</span>
                <span className="font-bold text-emerald-600">-₹{totals.totalDiscount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">GST Tax ({form.place_of_supply === 'Gujarat' ? 'CGST+SGST' : 'IGST'}):</span>
                <span className="font-bold text-slate-800">+₹{totals.tax_total.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">Net Grand Total:</span>
                <span className="font-bold text-brand">₹{totals.grand_total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center font-mono">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-sans font-semibold block">
                Grand Total (₹)
              </span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                ₹{totals.grand_total.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Taxable: ₹{totals.subtotal.toLocaleString('en-IN')} + GST: ₹
                {totals.tax_total.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-xs text-brand font-sans font-semibold block">
                Total Already Paid (₹)
              </span>
              <span className="text-2xl font-black text-brand block mt-1">
                ₹{totals.existingPaid.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-emerald-600 block mt-0.5 font-sans">
                {invoice.payments?.length || 0} recorded installment(s)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <span className="text-xs text-rose-700 font-sans font-semibold block">
                Pending Balance (₹)
              </span>
              <span className="text-2xl font-black text-rose-700 block mt-1">
                ₹{totals.pendingBalance.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-rose-600 block mt-0.5 font-sans">
                {totals.pendingBalance === 0 ? 'Fully Paid' : 'Receivable amount'}
              </span>
            </div>
          </div>

          {/* Record Settlement Box */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                Record Payment / Settlement (My Metaji Style)
              </span>

              {/* Quick Fill Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickPayment('full')}
                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shadow-2xs"
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPayment('half')}
                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shadow-2xs"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPayment('zero')}
                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shadow-2xs"
                >
                  Full Credit (₹0)
                </button>
              </div>
            </div>

            {/* Radio: Standard Mode vs Split Mode */}
            <div className="flex items-center gap-5 text-xs font-semibold">
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="edit_pay_mode_type"
                  checked={form.pay_mode_type === 'single'}
                  onChange={() => setForm((prev) => ({ ...prev, pay_mode_type: 'single' }))}
                  className="text-brand focus:ring-brand"
                />
                Standard Mode
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-brand font-bold">
                <input
                  type="radio"
                  name="edit_pay_mode_type"
                  checked={form.pay_mode_type === 'split'}
                  onChange={() => setForm((prev) => ({ ...prev, pay_mode_type: 'split' }))}
                  className="text-brand focus:ring-brand"
                />
                Split Payment (Cash + UPI)
              </label>
            </div>

            {/* Standard Mode Form */}
            {form.pay_mode_type === 'single' ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.payment_amount}
                    onChange={(e) =>
                      setForm({ ...form, payment_amount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:border-brand bg-white text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={form.payment_mode}
                    onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer / NEFT">Bank Transfer / NEFT / RTGS</option>
                    <option value="UPI / Online">UPI / Online / GPay</option>
                    <option value="Cheque / DD">Cheque / Demand Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-987654321"
                    value={form.payment_reference}
                    onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-800 outline-none focus:border-brand bg-white"
                  />
                </div>
              </div>
            ) : (
              /* Split Payment Mode (Cash + UPI) */
              <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cash Received (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.split_cash}
                      onChange={(e) =>
                        setForm({ ...form, split_cash: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:border-brand text-sm"
                      placeholder="Cash Amount"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      UPI / Online Received (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.split_online}
                      onChange={(e) =>
                        setForm({ ...form, split_online: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:border-brand text-sm"
                      placeholder="UPI Amount"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                  <span>
                    Total Now Paying:{' '}
                    <strong className="text-emerald-700 font-mono text-sm">
                      ₹{(
                        (Number(form.split_cash) || 0) + (Number(form.split_online) || 0)
                      ).toLocaleString('en-IN')}
                    </strong>
                  </span>
                  <span>
                    Remaining Balance After This:{' '}
                    <strong className="text-amber-700 font-mono text-sm">
                      ₹{Math.max(
                        0,
                        totals.pendingBalance -
                          ((Number(form.split_cash) || 0) + (Number(form.split_online) || 0))
                      ).toLocaleString('en-IN')}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Historical Payments Ledger */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Previous Payment History
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Mode</th>
                      <th className="p-2.5">Reference / Notes</th>
                      <th className="p-2.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.payments.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-700">
                          {new Date(p.payment_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800">{p.payment_mode}</td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {p.reference_number || p.notes || '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => navigate('/sales/invoices')}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
          >
            Cancel & Return
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving Invoice...' : 'Save & Update Invoice'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
