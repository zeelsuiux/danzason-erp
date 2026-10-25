import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Building,
  Warehouse as WarehouseIcon,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Truck,
  CheckCircle2,
  RotateCcw,
  Receipt,
} from 'lucide-react';
import { ft, St, Dt } from '../../services/procurementService';
import ProductSearchDropdown from '../../components/common/ProductSearchDropdown';

export default function PurchaseReturnForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lookups
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [nextReturnNumber, setNextReturnNumber] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    return_number: '',
    return_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    warehouse_id: '',
    bill_id: '',
    original_invoice_number: '',
    debit_note_number: '',
    debit_note_date: new Date().toISOString().split('T')[0],
    reason: 'Damaged / Defective goods received',
    is_interstate: false,
    status: 'approved',
    notes: '',
    remarks: '',
    items: [
      {
        product_id: '',
        product_name: '',
        sku: '',
        description: '',
        purchased_qty: 0,
        previously_returned_qty: 0,
        available_qty: 0,
        quantity: 1,
        unit: 'PCS',
        unit_price: 0,
        gst_rate: 18,
      },
    ],
  });

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      loadReturnData(id);
    } else {
      loadNextReturnNumber();
    }
  }, [id, isEdit]);

  const loadLookups = async () => {
    try {
      const [supRes, whRes, prodRes, billRes] = await Promise.all([
        ft.getSuppliers({ limit: 200 }),
        St.getWarehouses(),
        Dt.getProducts({ limit: 300 }),
        ft.getInvoices({ limit: 100 }),
      ]);
      const supList = Array.isArray(supRes?.data) ? supRes.data : [];
      const whList =
        whRes?.data?.warehouses ||
        whRes?.warehouses ||
        (Array.isArray(whRes?.data) ? whRes.data : []);
      const prodList =
        prodRes?.data?.products ||
        (Array.isArray(prodRes?.data) ? prodRes.data : []);
      const billList = Array.isArray(billRes?.data) ? billRes.data : [];

      setSuppliers(supList);
      setWarehouses(Array.isArray(whList) ? whList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);
      setBills(billList);

      if (!isEdit) {
        const defaultWh = whList.find((w) => w.is_default && w.status === 'active') || whList[0];
        if (defaultWh) {
          setFormData((prev) => ({ ...prev, warehouse_id: defaultWh._id }));
        }
        if (supList.length > 0) {
          setFormData((prev) => ({ ...prev, supplier_id: supList[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to load lookups', err);
    }
  };

  const loadNextReturnNumber = async () => {
    try {
      const res = await ft.getNextReturnNumber();
      if (res.success && res.next_number) {
        setNextReturnNumber(res.next_number);
        setFormData((prev) => ({
          ...prev,
          return_number: res.next_number,
          debit_note_number: `DN-${res.next_number.replace('PR-', '')}`,
        }));
      }
    } catch (err) {
      console.warn('Could not fetch next return number', err);
    }
  };

  const loadReturnData = async (returnId) => {
    try {
      setInitialLoading(true);
      const res = await ft.getReturnById(returnId);
      const ret = res.data;
      if (!ret) throw new Error('Purchase return not found');

      setFormData({
        return_number: ret.return_number || '',
        return_date: ret.return_date ? new Date(ret.return_date).toISOString().split('T')[0] : '',
        supplier_id: ret.supplier_id?._id || ret.supplier_id || '',
        warehouse_id: ret.warehouse_id?._id || ret.warehouse_id || '',
        bill_id: ret.bill_id?._id || ret.bill_id || '',
        original_invoice_number: ret.original_invoice_number || '',
        debit_note_number: ret.debit_note_number || '',
        debit_note_date: ret.debit_note_date
          ? new Date(ret.debit_note_date).toISOString().split('T')[0]
          : '',
        reason: ret.reason || '',
        is_interstate: Boolean(ret.is_interstate),
        status: ret.status || 'approved',
        notes: ret.notes || '',
        remarks: ret.remarks || '',
        items: (ret.items && ret.items.length > 0
          ? ret.items
          : [{ product_id: '', description: '', quantity: 1, unit_price: 0, gst_rate: 18 }]
        ).map((item) => ({
          _id: item._id,
          product_id: item.product_id?._id || item.product_id || '',
          product_name: item.product_name || item.product_id?.product_name || item.product_id?.name || item.description || '',
          sku: item.sku || item.product_id?.sku || '',
          description: item.description || '',
          purchased_qty: Number(item.purchased_qty || 0),
          previously_returned_qty: Number(item.previously_returned_qty || 0),
          available_qty: Number(item.available_qty || (item.purchased_qty - item.previously_returned_qty) || item.quantity || 1),
          quantity: Number(item.quantity || 1),
          unit: item.unit || item.product_id?.uom || 'PCS',
          unit_price: Number(item.unit_price || 0),
          gst_rate: Number(item.gst_rate !== undefined ? item.gst_rate : 18),
        })),
      });
    } catch (err) {
      setError(err.message || 'Failed to load purchase return');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleBillSelect = (billId) => {
    const selectedBill = bills.find((b) => b._id === billId);
    if (!selectedBill) {
      setFormData((prev) => ({
        ...prev,
        bill_id: '',
        original_invoice_number: '',
      }));
      return;
    }

    const billItems = (selectedBill.items || []).map((bItem) => {
      const billedQty = Number(bItem.received_qty || bItem.quantity || 1);
      const prevRet = 0; // can be enhanced with bill return history
      const available = Math.max(0, billedQty - prevRet);
      return {
        product_id: bItem.product_id?._id || bItem.product_id || '',
        product_name: bItem.product_name || bItem.product_id?.product_name || bItem.product_id?.name || bItem.description || '',
        sku: bItem.sku || bItem.product_id?.sku || '',
        description: bItem.description || '',
        purchased_qty: billedQty,
        previously_returned_qty: prevRet,
        available_qty: available,
        quantity: Math.min(1, available),
        unit: bItem.uom || bItem.unit || 'PCS',
        unit_price: Number(bItem.unit_rate || bItem.rate || 0),
        gst_rate: Number(bItem.gst_rate !== undefined ? bItem.gst_rate : 18),
      };
    });

    setFormData((prev) => ({
      ...prev,
      bill_id: selectedBill._id,
      original_invoice_number: selectedBill.invoice_number || selectedBill.vendor_bill_number || '',
      supplier_id: selectedBill.supplier_id?._id || selectedBill.supplier_id || prev.supplier_id,
      warehouse_id: selectedBill.warehouse_id?._id || selectedBill.warehouse_id || prev.warehouse_id,
      is_interstate: Boolean(selectedBill.is_interstate),
      items: billItems.length > 0 ? billItems : prev.items,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handleProductSelect = (index, selectedProd) => {
    if (!selectedProd) return;
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        product_id: selectedProd._id,
        product_name: selectedProd.product_name || selectedProd.name || '',
        sku: selectedProd.sku || '',
        description: selectedProd.description || selectedProd.product_name || selectedProd.name || '',
        unit_price: Number(selectedProd.purchase_rate || selectedProd.cost_price || selectedProd.price || 0),
        unit: selectedProd.uom || 'PCS',
        gst_rate: Number(selectedProd.gst_rate !== undefined ? selectedProd.gst_rate : 18),
        available_qty: 9999,
        quantity: 1,
      };
      return { ...prev, items: updated };
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          product_name: '',
          sku: '',
          description: '',
          purchased_qty: 0,
          previously_returned_qty: 0,
          available_qty: 9999,
          quantity: 1,
          unit: 'PCS',
          unit_price: 0,
          gst_rate: 18,
        },
      ],
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) {
      alert('Return document must contain at least one product row');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Calculations
  const calculatedItems = formData.items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unit_price) || 0;
    const taxable = qty * rate;
    const gstRate = Number(item.gst_rate) || 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (formData.is_interstate) {
      igst = (taxable * gstRate) / 100;
    } else {
      const halfRate = gstRate / 2;
      cgst = (taxable * halfRate) / 100;
      sgst = (taxable * halfRate) / 100;
    }

    const total = taxable + cgst + sgst + igst;

    return {
      ...item,
      qty,
      rate,
      taxable,
      cgst,
      sgst,
      igst,
      total,
    };
  });

  const subtotalTaxable = calculatedItems.reduce((acc, it) => acc + it.taxable, 0);
  const totalCgst = calculatedItems.reduce((acc, it) => acc + it.cgst, 0);
  const totalSgst = calculatedItems.reduce((acc, it) => acc + it.sgst, 0);
  const totalIgst = calculatedItems.reduce((acc, it) => acc + it.igst, 0);
  const totalBeforeRound = subtotalTaxable + totalCgst + totalSgst + totalIgst;
  const grandTotal = Math.round(totalBeforeRound);
  const roundOff = Number((grandTotal - totalBeforeRound).toFixed(2));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.supplier_id) {
      setError('Please select a Supplier');
      return;
    }
    if (!formData.reason || !formData.reason.trim()) {
      setError('Please provide a Reason for Return');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      if (!it.product_id) {
        setError(`Please select a product on row #${i + 1}`);
        return;
      }
      const retQty = Number(it.quantity);
      if (retQty <= 0) {
        setError(`Return quantity must be greater than 0 on row #${i + 1}`);
        return;
      }
      if (it.available_qty && retQty > it.available_qty) {
        setError(`Row #${i + 1}: Return quantity (${retQty}) cannot exceed available quantity (${it.available_qty})`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        items: calculatedItems.map((it) => ({
          _id: it._id,
          product_id: it.product_id,
          product_name: it.product_name,
          sku: it.sku,
          description: it.description || it.product_name,
          unit: it.unit,
          purchased_qty: Number(it.purchased_qty || 0),
          previously_returned_qty: Number(it.previously_returned_qty || 0),
          available_qty: Number(it.available_qty || 0),
          quantity: Number(it.qty),
          unit_price: Number(it.rate),
          gst_rate: Number(it.gst_rate !== undefined ? it.gst_rate : 18),
        })),
      };

      if (isEdit) {
        await ft.updateReturn(id, payload);
        setSuccess('Purchase Return updated successfully');
      } else {
        await ft.createReturn(payload);
        setSuccess('Purchase Return & Debit Note created successfully. Stock deducted and supplier ledger credited.');
      }

      setTimeout(() => {
        navigate('/purchase-returns');
      }, 900);
    } catch (err) {
      setError(err.message || 'Failed to save purchase return');
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const selectedSupplier = suppliers.find((s) => s._id === formData.supplier_id);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/purchase-returns"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Purchase Returns
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {isEdit ? `Edit Purchase Return: ${formData.return_number}` : 'Create Purchase Return & Debit Note'}
              </h1>
              <p className="text-xs text-slate-500">
                Dedicated Full-Page Form • Stock Reversal • Debit Note Adjustment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/purchase-returns"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving Return...' : isEdit ? 'Update Purchase Return' : 'Save & Issue Debit Note'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Header Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-rose-600" />
                <h2 className="text-base font-bold text-slate-900">Return & Debit Note Header</h2>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.is_interstate}
                  onChange={(e) => setFormData({ ...formData, is_interstate: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Interstate Transaction (IGST Only)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Return Number</label>
                <input
                  type="text"
                  readOnly
                  value={formData.return_number || nextReturnNumber || 'PR-2026-27-0001 (Auto)'}
                  className="mt-1.5 block w-full rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 font-mono text-sm font-bold text-rose-900"
                />
                <span className="text-[11px] text-slate-400">Atomic FY sequence</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Return Date *</label>
                <input
                  type="date"
                  required
                  value={formData.return_date}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Debit Note Number</label>
                <input
                  type="text"
                  value={formData.debit_note_number}
                  onChange={(e) => setFormData({ ...formData, debit_note_number: e.target.value })}
                  placeholder="e.g. DN-2026-0001"
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Debit Note Date</label>
                <input
                  type="date"
                  value={formData.debit_note_date}
                  onChange={(e) => setFormData({ ...formData, debit_note_date: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {/* Linked Purchase Bill */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Select Purchase Bill / Supplier Invoice (Auto-loads items)
                </label>
                <select
                  value={formData.bill_id}
                  onChange={(e) => handleBillSelect(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="">Manual Return (Without linked bill)</option>
                  {bills.map((bill) => (
                    <option key={bill._id} value={bill._id}>
                      {bill.invoice_number} ({bill.vendor_bill_number ? `Vendor: ${bill.vendor_bill_number}` : ''}) - {bill.supplier_id?.supplier_name || 'Vendor'} - ₹{(bill.grand_total || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Supplier *</label>
                <select
                  required
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplier_name || s.name} {s.gstin ? `(${s.gstin})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Source Warehouse</label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.warehouse_name || w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-600">Reason for Return *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality defects, transit damage, wrong material supplied, excess shipment..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-rose-300 bg-rose-50/20 p-2.5 text-sm font-medium text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Returned Line Items */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-rose-600" />
                <h2 className="text-base font-bold text-slate-900">Returned Line Items</h2>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                <Plus className="h-4 w-4" /> Add Item Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">#</th>
                    <th className="min-w-[220px] px-3 py-3">Product / Item *</th>
                    <th className="w-24 px-3 py-3">SKU</th>
                    {formData.bill_id && <th className="w-20 px-3 py-3 text-right">Billed Qty</th>}
                    {formData.bill_id && <th className="w-20 px-3 py-3 text-right">Avail Qty</th>}
                    <th className="w-24 px-3 py-3 text-right">Return Qty *</th>
                    <th className="w-20 px-3 py-3">Unit</th>
                    <th className="w-24 px-3 py-3 text-right">Unit Rate (₹)</th>
                    <th className="w-24 px-3 py-3 text-right">Taxable (₹)</th>
                    <th className="w-20 px-3 py-3 text-right">GST %</th>
                    <th className="w-28 px-3 py-3 text-right">Total (₹)</th>
                    <th className="w-10 px-2 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <ProductSearchDropdown
                          products={products}
                          selectedProductId={item.product_id}
                          onSelect={(p) => handleProductSelect(idx, p)}
                          placeholder="Select / Search Product..."
                        />
                        <input
                          type="text"
                          placeholder="Batch / Specific Defect description..."
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 focus:border-rose-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.sku || 'N/A'}
                        </span>
                      </td>
                      {formData.bill_id && (
                        <td className="px-3 py-3 text-right font-medium text-slate-500">
                          {item.purchased_qty || '-'}
                        </td>
                      )}
                      {formData.bill_id && (
                        <td className="px-3 py-3 text-right font-bold text-emerald-600">
                          {item.available_qty || '-'}
                        </td>
                      )}
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-20 rounded border border-rose-300 px-2 py-1 text-right font-bold text-rose-800 focus:border-rose-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-center font-medium text-slate-700"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-right font-semibold text-slate-800 focus:border-rose-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">
                        ₹{item.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <select
                          value={item.gst_rate}
                          onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                          className="rounded border border-slate-200 px-1 py-1 text-right text-xs font-semibold text-slate-700"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-rose-700">
                        ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-slate-400 transition hover:text-rose-600"
                          title="Remove Row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-between items-center">
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add Item Row
              </button>
              <div className="text-xs text-slate-500 font-medium">
                Total Products: <span className="font-bold text-slate-800">{formData.items.length}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Summary & Debit Note Total */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Return Status & Remarks
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Return Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="draft">Draft (Not yet adjusted)</option>
                  <option value="approved">Approved & Deducted from Stock</option>
                  <option value="completed">Completed / Settled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Terms</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Gate pass number, return courier tracking, supplier credit acknowledgment..."
                  className="block w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Total Reversal Card */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/20 p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-rose-950 border-b border-rose-100 pb-2">
                Debit Note Reversal Summary
              </h2>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Taxable Amount Reversal:</span>
                <span className="font-semibold text-slate-800">
                  ₹{subtotalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {formData.is_interstate ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>IGST Reversal:</span>
                  <span className="font-semibold text-slate-800">
                    ₹{totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>CGST Reversal:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>SGST Reversal:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-xs text-slate-500">
                <span>Round Off:</span>
                <span className="font-mono">
                  {roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                </span>
              </div>

              <div className="border-t border-rose-200 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-rose-950">Debit Note Total (₹):</span>
                <span className="text-2xl font-black text-rose-700">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 pt-1">
                This amount will be deducted from supplier pending balance upon approval.
              </p>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              to="/purchase-returns"
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving Return...' : isEdit ? 'Update Purchase Return' : 'Save & Issue Debit Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
