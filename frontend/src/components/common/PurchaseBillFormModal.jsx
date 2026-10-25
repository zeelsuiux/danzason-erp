import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Building,
  Warehouse,
  Package,
  Search,
  FileText,
  CheckCircle,
  Save,
  AlertCircle,
  Receipt,
  Tag,
} from 'lucide-react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import ProductPickerModal from './ProductPickerModal';
import SupplierPickerModal from './SupplierPickerModal';
import { ft, Dt, St } from '../../services/procurementService';

const UOM_OPTIONS = ['PCS', 'MTR', 'KG', 'SET', 'BOX', 'ROL', 'NOS', 'PAIR', 'MTR/ROLL'];
const GST_RATES = [0, 5, 12, 18, 28];

export default function PurchaseBillFormModal({
  isOpen,
  onClose,
  initialBill = null, // if provided, edit mode; otherwise, create mode
  onSuccess = () => {},
}) {
  const isEdit = Boolean(initialBill && initialBill._id);

  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [defaultWhId, setDefaultWhId] = useState('');

  const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [activePickerRowIndex, setActivePickerRowIndex] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
    vendor_bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    supplier_id: '',
    warehouse_id: '',
    po_id: '',
    remarks: '',
    status: 'posted',
    items: [
      {
        product_id: '',
        sku: '',
        description: 'Commercial Material Inward',
        ordered_qty: 0,
        quantity: 1,
        uom: 'PCS',
        unit_rate: 1000,
        discount: 0,
        gst_rate: 18,
      },
    ],
  });

  // Load Lookups on open
  useEffect(() => {
    if (isOpen) {
      loadLookups();
    }
  }, [isOpen]);

  // Sync initialBill when editing
  useEffect(() => {
    if (isOpen && initialBill) {
      const itemsList =
        initialBill.items && initialBill.items.length > 0
          ? initialBill.items.map((it) => ({
              product_id: it.product_id?._id || it.product_id || '',
              sku: it.sku || it.product_id?.sku || '',
              description: it.description || it.product_id?.product_name || 'Material Item',
              ordered_qty: Number(it.ordered_qty || 0),
              quantity: Number(it.quantity || 1),
              uom: it.uom || 'PCS',
              unit_rate: Number(it.unit_rate || 0),
              discount: Number(it.discount || 0),
              gst_rate: Number(it.gst_rate !== undefined ? it.gst_rate : 18),
            }))
          : [
              {
                product_id: '',
                sku: '',
                description: 'Commercial Material Inward',
                ordered_qty: 0,
                quantity: 1,
                uom: 'PCS',
                unit_rate: 0,
                discount: 0,
                gst_rate: 18,
              },
            ];

      setForm({
        vendor_bill_number: initialBill.vendor_bill_number || '',
        bill_date: initialBill.bill_date
          ? new Date(initialBill.bill_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        due_date: initialBill.due_date
          ? new Date(initialBill.due_date).toISOString().split('T')[0]
          : '',
        supplier_id: initialBill.supplier_id?._id || initialBill.supplier_id || '',
        warehouse_id: initialBill.warehouse_id?._id || initialBill.warehouse_id || '',
        po_id: initialBill.po_id?._id || initialBill.po_id || '',
        remarks: initialBill.remarks || '',
        status: initialBill.status || 'posted',
        items: itemsList,
      });
      setErrorMsg('');
    } else if (isOpen && !initialBill) {
      // Reset to create mode defaults
      setForm({
        vendor_bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplier_id: '',
        warehouse_id: defaultWhId || '',
        po_id: '',
        remarks: '',
        status: 'posted',
        items: [
          {
            product_id: '',
            sku: '',
            description: '',
            ordered_qty: 0,
            quantity: 1,
            uom: 'PCS',
            unit_rate: 0,
            discount: 0,
            gst_rate: 18,
          },
        ],
      });
      setErrorMsg('');
    }
  }, [isOpen, initialBill, defaultWhId]);

  const loadLookups = async () => {
    try {
      const [supRes, poRes, prodRes, whRes] = await Promise.all([
        ft.getSuppliers({ limit: 100 }).catch(() => ({ data: [] })),
        ft.getOrders({ limit: 100 }).catch(() => ({ data: [] })),
        Dt.getProducts({ limit: 250, view: 'color' }).catch(() => ({ data: [] })),
        St.getWarehouses({ status: 'active' }).catch(() => ({ data: [] })),
      ]);

      const supList = Array.isArray(supRes.data) ? supRes.data : [];
      const poList = Array.isArray(poRes.data) ? poRes.data : [];
      let prodList = Array.isArray(prodRes.data) ? prodRes.data : [];
      if (prodList.length === 0) {
        const fallback = await Dt.getProducts({ limit: 100 }).catch(() => ({ data: [] }));
        prodList = Array.isArray(fallback.data) ? fallback.data : [];
      }
      const rawWh = whRes?.data?.warehouses || whRes?.data || [];
      const whList = Array.isArray(rawWh) ? rawWh : [];

      setSuppliers(supList);
      setOrders(poList);
      setProducts(prodList);
      setWarehouses(whList);

      const def = whList.find((w) => w.is_default);
      const chosenDefaultId = def ? def._id : whList[0]?._id || '';
      setDefaultWhId(chosenDefaultId);

      if (!initialBill) {
        setForm((prev) => ({
          ...prev,
          warehouse_id: prev.warehouse_id || chosenDefaultId,
          supplier_id: prev.supplier_id || (supList[0]?._id || ''),
        }));
      }
    } catch (err) {
      console.error('Failed to load lookups', err);
    }
  };

  // PO Selection Handler: Auto-fills supplier, warehouse, and items!
  const handlePoChange = (poId) => {
    if (!poId) {
      setForm((prev) => ({ ...prev, po_id: '' }));
      return;
    }
    const po = orders.find((o) => o._id === poId);
    if (!po) return;

    const poSupId = po.supplier_id?._id || po.supplier_id || '';
    const poWhId = po.warehouse_id?._id || po.warehouse_id || defaultWhId;

    const mappedItems =
      po.items && po.items.length > 0
        ? po.items.map((it) => {
            const p = it.product_id || {};
            const ordered = Number(it.ordered_qty || 0);
            const received = Number(it.received_qty || 0);
            const pending =
              it.pending_qty !== undefined ? Number(it.pending_qty) : Math.max(0, ordered - received);
            const rate = Number(it.rate || it.unit_rate || p.purchase_rate || 0);
            const gst = Number(it.gst_rate !== undefined ? it.gst_rate : 18);

            return {
              product_id: p._id || it.product_id || '',
              sku: p.sku || it.sku || '',
              description: it.description || p.product_name || p.title || 'Apparel / Material Item',
              ordered_qty: ordered,
              quantity: pending > 0 ? pending : ordered > 0 ? ordered : 1,
              uom: it.uom || p.unit || 'PCS',
              unit_rate: rate,
              discount: 0,
              gst_rate: gst,
            };
          })
        : [
            {
              product_id: '',
              sku: '',
              description: `Material against PO ${po.po_number || ''}`,
              ordered_qty: 0,
              quantity: 1,
              uom: 'PCS',
              unit_rate: 0,
              discount: 0,
              gst_rate: 18,
            },
          ];

    setForm((prev) => ({
      ...prev,
      po_id: poId,
      supplier_id: poSupId || prev.supplier_id,
      warehouse_id: poWhId || prev.warehouse_id,
      items: mappedItems,
    }));
  };

  // Item Changes
  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handleProductSelect = (index, prodId) => {
    const prod = products.find(
      (p) => p._id === prodId || p.id === prodId || p.product_id === prodId
    );
    if (prod) {
      setForm((prev) => {
        const updated = [...prev.items];
        updated[index] = {
          ...updated[index],
          product_id: prod._id || prod.id,
          sku: prod.sku || '',
          description: prod.product_name || prod.title || updated[index].description,
          unit_rate:
            Number(prod.purchase_rate || prod.selling_rate || prod.price) || updated[index].unit_rate,
          gst_rate: prod.gst_rate !== undefined ? Number(prod.gst_rate) : updated[index].gst_rate,
          uom: prod.unit || prod.uom || updated[index].uom || 'PCS',
        };
        return { ...prev, items: updated };
      });
    } else {
      handleItemChange(index, 'product_id', '');
    }
  };

  const handleCatalogProductChosen = (prod) => {
    if (activePickerRowIndex !== null && form.items[activePickerRowIndex]) {
      handleProductSelect(activePickerRowIndex, prod._id || prod.id);
    }
    setIsProductPickerOpen(false);
    setActivePickerRowIndex(null);
  };

  const handleAddItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          sku: '',
          description: '',
          ordered_qty: 0,
          quantity: 1,
          uom: 'PCS',
          unit_rate: 0,
          discount: 0,
          gst_rate: 18,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (form.items.length <= 1) {
      alert('A purchase bill must have at least one line item.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Calculations
  const calculateLine = (it) => {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const rate = Math.max(0, Number(it.unit_rate) || 0);
    const discount = Math.max(0, Number(it.discount) || 0);
    const lineGross = qty * rate;
    const taxable = Math.max(0, lineGross - discount);
    const gstRate = Number(it.gst_rate) || 0;
    const gstAmt = (taxable * gstRate) / 100;
    const lineTotal = taxable + gstAmt;
    return { lineGross, discount, taxable, gstAmt, lineTotal };
  };

  const summary = form.items.reduce(
    (acc, it) => {
      const c = calculateLine(it);
      acc.subtotal += c.lineGross;
      acc.discountTotal += c.discount;
      acc.taxableTotal += c.taxable;
      acc.gstTotal += c.gstAmt;
      acc.rawGrandTotal += c.lineTotal;
      return acc;
    },
    { subtotal: 0, discountTotal: 0, taxableTotal: 0, gstTotal: 0, rawGrandTotal: 0 }
  );

  const finalGrandTotal = Math.round(summary.rawGrandTotal);
  const roundOff = Number((finalGrandTotal - summary.rawGrandTotal).toFixed(2));
  const cgstTotal = Number((summary.gstTotal / 2).toFixed(2));
  const sgstTotal = Number((summary.gstTotal / 2).toFixed(2));

  // Submit Handler
  const handleSubmit = async (targetStatus = 'posted') => {
    setErrorMsg('');

    if (!form.vendor_bill_number.trim()) {
      setErrorMsg('Vendor Bill / Invoice # is required.');
      return;
    }
    if (!form.supplier_id) {
      setErrorMsg('Please select a Supplier / Vendor.');
      return;
    }
    if (!form.warehouse_id) {
      setErrorMsg('Please select a Destination Warehouse.');
      return;
    }
    if (!form.items || form.items.length === 0) {
      setErrorMsg('Please add at least one line item to the bill.');
      return;
    }

    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i];
      if (!it.description && !it.product_id) {
        setErrorMsg(`Item #${i + 1} requires a product or description.`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setErrorMsg(`Item #${i + 1} received quantity must be greater than 0.`);
        return;
      }
      if (Number(it.unit_rate) < 0) {
        setErrorMsg(`Item #${i + 1} rate cannot be negative.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        vendor_bill_number: form.vendor_bill_number.trim(),
        bill_date: form.bill_date,
        due_date: form.due_date,
        supplier_id: form.supplier_id,
        warehouse_id: form.warehouse_id,
        po_id: form.po_id || null,
        remarks: form.remarks,
        status: targetStatus,
        items: form.items.map((it) => ({
          product_id: it.product_id || null,
          sku: it.sku || '',
          description: it.description || 'Apparel Item',
          ordered_qty: Number(it.ordered_qty || 0),
          quantity: Number(it.quantity || 1),
          uom: it.uom || 'PCS',
          unit_rate: Number(it.unit_rate || 0),
          discount: Number(it.discount || 0),
          gst_rate: Number(it.gst_rate !== undefined ? it.gst_rate : 18),
        })),
      };

      if (isEdit) {
        await ft.updateInvoice(initialBill._id, payload);
      } else {
        await ft.createInvoice(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save purchase bill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? `Edit Purchase Bill: ${initialBill?.invoice_number || 'PINV'}`
          : 'Record Commercial Purchase Bill'
      }
      size="3xl"
    >
      <div className="space-y-5 text-xs text-slate-700">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: BILL HEADER & RELATIONSHIPS */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand" />
              <span>Bill Header & Commercial Information</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              {isEdit ? `Editing Bill ID: ${initialBill._id}` : 'New Commercial Inward Entry'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Vendor Bill Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Vendor Bill / Invoice # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.vendor_bill_number}
                onChange={(e) => setForm({ ...form, vendor_bill_number: e.target.value })}
                placeholder="e.g. BILL/2026/0491"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-800 outline-none focus:border-brand bg-white"
              />
            </div>

            {/* Bill Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bill Date</label>
              <input
                type="date"
                required
                value={form.bill_date}
                onChange={(e) => setForm({ ...form, bill_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand bg-white"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand bg-white"
              />
            </div>

            {/* Destination Warehouse */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Destination Warehouse</span>
                <span className="text-[10px] text-brand font-semibold">Central Master</span>
              </label>
              <select
                required
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand bg-white"
              >
                <option value="">Select Warehouse...</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.warehouse_name} ({wh.warehouse_code || 'WH'}) {wh.is_default ? '★ Default' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier / Vendor */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Supplier / Vendor <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsSupplierPickerOpen(true)}
                  className="text-brand font-bold text-xs hover:underline flex items-center gap-1"
                >
                  <Search className="w-3 h-3" /> Search Supplier
                </button>
              </div>
              <div className="flex gap-1.5">
                <select
                  required
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand bg-white"
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplier_name} ({s.supplier_code || 'SUP'}) - GST: {s.gstin || 'None'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsSupplierPickerOpen(true)}
                  className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shrink-0"
                  title="Search & Pick Supplier"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Linked Purchase Order (PO) */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Associated Purchase Order (PO Ref)</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Auto-populates items</span>
              </label>
              <select
                value={form.po_id}
                onChange={(e) => handlePoChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800 outline-none focus:border-brand bg-white"
              >
                <option value="">No PO Reference (Direct Inward Commercial Bill)</option>
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.po_number} • {o.supplier_id?.supplier_name || 'Supplier'} • ₹
                    {Number(o.grand_total || 0).toLocaleString('en-IN')} ({o.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: INVOICE-STYLE ITEMS TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Line Items Entry Table</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Invoice-style multi-row entry. Add products, specify quantities, rates, discounts and taxes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Item Row</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[960px]">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2.5 w-10 text-center">Sr.</th>
                  <th className="p-2.5 min-w-[220px]">Product / Catalog</th>
                  <th className="p-2.5 w-24 text-center">SKU</th>
                  <th className="p-2.5 min-w-[160px]">Description</th>
                  <th className="p-2.5 w-20 text-center">Ord. Qty</th>
                  <th className="p-2.5 w-24 text-center">Recv. Qty</th>
                  <th className="p-2.5 w-20 text-center">Unit</th>
                  <th className="p-2.5 w-24 text-right">Rate (₹)</th>
                  <th className="p-2.5 w-20 text-right">Disc (₹)</th>
                  <th className="p-2.5 w-20 text-center">GST %</th>
                  <th className="p-2.5 w-28 text-right">Amount (₹)</th>
                  <th className="p-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.items.map((it, idx) => {
                  const lineCalc = calculateLine(it);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      {/* 1. Sr. No. */}
                      <td className="p-2.5 text-center font-bold text-slate-500 font-mono">
                        {idx + 1}
                      </td>

                      {/* 2. Product */}
                      <td className="p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 min-w-0">
                            <SearchableSelect
                              options={products.map((p) => ({
                                value: p._id || p.id,
                                label: p.product_name || p.title,
                                subLabel: `SKU: ${p.sku || '—'} • ₹${p.purchase_rate || p.price || 0} • Stock: ${p.current_stock ?? '—'}`,
                              }))}
                              value={it.product_id}
                              onChange={(prodId) => handleProductSelect(idx, prodId)}
                              placeholder="Select product..."
                              allowClear={true}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePickerRowIndex(idx);
                              setIsProductPickerOpen(true);
                            }}
                            className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                            title="Browse Catalog"
                          >
                            <Package className="w-3 h-3" />
                            <span>Browse</span>
                          </button>
                        </div>
                      </td>

                      {/* 3. SKU */}
                      <td className="p-2.5 text-center">
                        <span className="font-mono text-[11px] font-bold text-slate-700 px-2 py-1 bg-slate-100 rounded border border-slate-200 block truncate max-w-[90px] mx-auto">
                          {it.sku || '—'}
                        </span>
                      </td>

                      {/* 4. Description */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Item specifications / remarks..."
                          className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-brand bg-slate-50/30"
                        />
                      </td>

                      {/* 5. Ordered Qty */}
                      <td className="p-2.5 text-center font-mono font-medium text-slate-500">
                        {it.ordered_qty > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                            {it.ordered_qty}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* 6. Received / Billed Qty */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={it.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, 'quantity', Number(e.target.value))
                          }
                          className="w-full px-2 py-1.5 rounded border border-slate-200 text-center font-mono font-bold text-slate-900 outline-none focus:border-brand"
                        />
                      </td>

                      {/* 7. Unit */}
                      <td className="p-2.5">
                        <select
                          value={it.uom || 'PCS'}
                          onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                          className="w-full px-1.5 py-1.5 rounded border border-slate-200 text-center font-bold text-slate-700 outline-none focus:border-brand bg-white"
                        >
                          {UOM_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 8. Rate */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={it.unit_rate}
                          onChange={(e) =>
                            handleItemChange(idx, 'unit_rate', Number(e.target.value))
                          }
                          className="w-full px-2 py-1.5 rounded border border-slate-200 text-right font-mono font-bold text-slate-900 outline-none focus:border-brand"
                        />
                      </td>

                      {/* 9. Discount */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.discount}
                          onChange={(e) =>
                            handleItemChange(idx, 'discount', Number(e.target.value))
                          }
                          className="w-full px-2 py-1.5 rounded border border-slate-200 text-right font-mono text-slate-800 outline-none focus:border-brand"
                        />
                      </td>

                      {/* 10. Tax / GST */}
                      <td className="p-2.5">
                        <select
                          value={it.gst_rate}
                          onChange={(e) =>
                            handleItemChange(idx, 'gst_rate', Number(e.target.value))
                          }
                          className="w-full px-1.5 py-1.5 rounded border border-slate-200 text-center font-bold text-slate-800 outline-none focus:border-brand bg-white"
                        >
                          {GST_RATES.map((g) => (
                            <option key={g} value={g}>
                              {g}%
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 11. Amount */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        ₹{lineCalc.lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* 12. Action */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={form.items.length <= 1}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-30 disabled:pointer-events-none"
                          title="Remove Row"
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

        {/* SECTION 3: NOTES & FINANCIAL SUMMARY BREAKDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notes / Terms */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-bold text-slate-700 text-xs">
              Bill Remarks / Transport / Notes
            </label>
            <textarea
              rows="3"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Inward transport details, payment terms, or batch inspections..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-brand bg-white"
            />
            <p className="text-[11px] text-slate-400 italic">
              Note: Commercial bill updates automatically adjust supplier ledger balance and reflect in stock reporting.
            </p>
          </div>

          {/* Financial Calculation Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5 shadow-sm">
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 flex justify-between items-center">
              <span>Financial Total Calculation</span>
              <span className="font-mono text-[10px] text-emerald-400">Live GST Computed</span>
            </h5>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="font-sans">Subtotal (Gross):</span>
                <span>₹{summary.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              {summary.discountTotal > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span className="font-sans">Item Discounts:</span>
                  <span>-₹{summary.discountTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-300">
                <span className="font-sans">Net Taxable Amount:</span>
                <span>₹{summary.taxableTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between text-slate-400 text-[11px]">
                <span className="font-sans">CGST + SGST (Estimated):</span>
                <span>₹{summary.gstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              {roundOff !== 0 && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span className="font-sans">Round Off:</span>
                  <span>{roundOff > 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-base text-emerald-400">
                <span className="font-sans text-xs tracking-wider uppercase text-white">Grand Total:</span>
                <span className="text-lg">₹{finalGrandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('draft')}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('posted')}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-lg bg-brand text-white hover:bg-brand-600 transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'Saving...'
                  : isEdit
                  ? 'Save Bill Changes'
                  : 'Finalize & Record Bill'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Catalog Picker Modal */}
      <ProductPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => {
          setIsProductPickerOpen(false);
          setActivePickerRowIndex(null);
        }}
        onSelectProduct={handleCatalogProductChosen}
        products={products}
      />

      {/* Supplier Picker Modal */}
      <SupplierPickerModal
        isOpen={isSupplierPickerOpen}
        onClose={() => setIsSupplierPickerOpen(false)}
        onSelectSupplier={(sup) => {
          setForm((prev) => ({ ...prev, supplier_id: sup._id }));
          setIsSupplierPickerOpen(false);
        }}
        suppliers={suppliers}
        selectedSupplierId={form.supplier_id}
      />
    </Modal>
  );
}
