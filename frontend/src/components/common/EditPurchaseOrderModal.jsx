import React, { useState, useEffect } from 'react';
import {
  Edit2,
  AlertCircle,
  Plus,
  Trash2,
  Package,
  Search,
  Building,
  CheckCircle2,
  Clock,
  History,
} from 'lucide-react';
import Modal from './Modal';
import ProductPickerModal from './ProductPickerModal';
import SupplierPickerModal from './SupplierPickerModal';
import { ft, St, Dt } from '../../services/procurementService';

export default function EditPurchaseOrderModal({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess = () => {},
}) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dropdown Lookups
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Modals
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIndex, setPickerIndex] = useState(null);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    warehouse_id: '',
    expected_delivery_date: '',
    payment_terms: 'Net 30 Days',
    delivery_terms: 'FOB Destination',
    is_interstate: false,
    notes: '',
    remarks: '',
    edit_reason: 'Updated via PO Editor',
    items: [],
  });

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadLookups();
      initForm();
    }
  }, [isOpen, purchaseOrder]);

  const loadLookups = async () => {
    try {
      setLoading(true);
      const [supRes, whRes, prodRes] = await Promise.all([
        ft.getSuppliers({ limit: 100 }).catch(() => ({ data: [] })),
        St.getWarehouses().catch(() => ({ data: [] })),
        Dt.getProducts({ limit: 200, view: 'color' }).catch(() => ({ data: [] })),
      ]);

      const supList = Array.isArray(supRes.data) ? supRes.data : [];
      setSuppliers(supList);

      const whList = whRes?.data?.warehouses || whRes?.data || whRes?.warehouses || [];
      setWarehouses(Array.isArray(whList) ? whList : []);

      let prodList = Array.isArray(prodRes.data) ? prodRes.data : [];
      if (prodList.length === 0) {
        const fallback = await Dt.getProducts({ limit: 100 }).catch(() => ({ data: [] }));
        prodList = Array.isArray(fallback.data) ? fallback.data : [];
      }
      setProducts(prodList);
    } catch (err) {
      console.error('Error loading lookups for PO Edit:', err);
    } finally {
      setLoading(false);
    }
  };

  const initForm = () => {
    if (!purchaseOrder) return;
    setErrorMessage('');

    const formattedItems = (purchaseOrder.items || []).map((it) => ({
      _id: it._id,
      product_id: it.product_id?._id || it.product_id || '',
      description: it.description || it.product_id?.product_name || 'Item',
      ordered_qty: Number(it.ordered_qty || 1),
      received_qty: Number(it.received_qty || 0),
      rate: Number(it.rate || it.unit_rate || 0),
      discount_percent: Number(it.discount_percent || 0),
      gst_rate: Number(it.gst_rate !== undefined ? it.gst_rate : 18),
    }));

    setFormData({
      supplier_id: purchaseOrder.supplier_id?._id || purchaseOrder.supplier_id || '',
      warehouse_id: purchaseOrder.warehouse_id?._id || purchaseOrder.warehouse_id || '',
      expected_delivery_date: purchaseOrder.expected_delivery_date
        ? new Date(purchaseOrder.expected_delivery_date).toISOString().split('T')[0]
        : '',
      payment_terms: purchaseOrder.payment_terms || 'Net 30 Days',
      delivery_terms: purchaseOrder.delivery_terms || 'FOB Destination',
      is_interstate: Boolean(purchaseOrder.is_interstate),
      notes: purchaseOrder.notes || '',
      remarks: purchaseOrder.remarks || '',
      edit_reason: 'Updated via PO Editor',
      items: formattedItems.length > 0 ? formattedItems : [
        { product_id: '', description: '', ordered_qty: 1, received_qty: 0, rate: 0, discount_percent: 0, gst_rate: 18 }
      ],
    });
  };

  const isPartiallyReceived = purchaseOrder?.status === 'partially_received' ||
    (purchaseOrder?.items || []).some((it) => (it.received_qty || 0) > 0);

  const handleAddItemRow = () => {
    const defaultProduct = products[0];
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: defaultProduct?._id || '',
          description: defaultProduct?.product_name || '',
          ordered_qty: 10,
          received_qty: 0,
          rate: defaultProduct?.purchase_rate || 100,
          discount_percent: 0,
          gst_rate: defaultProduct?.gst_rate || 18,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    const item = formData.items[index];
    if (item && item.received_qty > 0) {
      alert(`Cannot remove item "${item.description}" because ${item.received_qty} units have already been received into inventory.`);
      return;
    }
    if (formData.items.length === 1) {
      alert('A Purchase Order must contain at least one line item.');
      return;
    }
    const updated = formData.items.filter((_, idx) => idx !== index);
    setFormData({ ...formData, items: updated });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;

    if (field === 'ordered_qty') {
      const minQty = Number(updated[index].received_qty || 0);
      if (Number(value) < minQty) {
        alert(`Ordered quantity cannot be reduced below ${minQty} (already received in warehouse).`);
        updated[index].ordered_qty = minQty;
      }
    }

    setFormData({ ...formData, items: updated });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    formData.items.forEach((it) => {
      const qty = Number(it.ordered_qty || 0);
      const rate = Number(it.rate || 0);
      const discount = (rate * Number(it.discount_percent || 0)) / 100;
      const netRate = rate - discount;
      const taxable = qty * netRate;
      const gst = (taxable * Number(it.gst_rate || 0)) / 100;

      subtotal += taxable;
      totalTax += gst;
    });

    const grandTotal = Math.round(subtotal + totalTax);
    return { subtotal, totalTax, grandTotal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.supplier_id) {
      setErrorMessage('Please select a Supplier.');
      return;
    }
    if (!formData.warehouse_id) {
      setErrorMessage('Please select a Delivery Warehouse.');
      return;
    }

    // Validate item quantities against received quantities
    for (const it of formData.items) {
      if (Number(it.ordered_qty) <= 0) {
        setErrorMessage(`Ordered quantity for "${it.description || 'item'}" must be greater than 0.`);
        return;
      }
      if (Number(it.ordered_qty) < Number(it.received_qty || 0)) {
        setErrorMessage(
          `Ordered quantity for "${it.description}" cannot be less than already received quantity (${it.received_qty}).`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        supplier_id: formData.supplier_id,
        warehouse_id: formData.warehouse_id,
        expected_delivery_date: formData.expected_delivery_date || null,
        payment_terms: formData.payment_terms,
        delivery_terms: formData.delivery_terms,
        is_interstate: formData.is_interstate,
        notes: formData.notes,
        remarks: formData.remarks,
        edit_reason: formData.edit_reason.trim() || 'PO updated via PO Editor',
        items: formData.items.map((it) => ({
          _id: it._id,
          product_id: it.product_id,
          description: it.description,
          ordered_qty: Number(it.ordered_qty),
          rate: Number(it.rate),
          discount_percent: Number(it.discount_percent || 0),
          gst_rate: Number(it.gst_rate || 18),
        })),
      };

      const res = await ft.updateOrder(purchaseOrder._id, payload);
      alert('🎉 Purchase Order updated successfully! Totals and pending quantities recalculated.');
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update Purchase Order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Purchase Order: ${purchaseOrder?.po_number || ''}`}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans text-slate-800">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isPartiallyReceived && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Partially Received Order Safeguard</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Goods have already been partially received against this PO. Supplier is locked to prevent broken delivery records, and order quantities cannot be reduced below received quantities.
              </p>
            </div>
          </div>
        )}

        {/* Supplier & Warehouse Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Supplier */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">
                Supplier <span className="text-rose-500">*</span>
              </label>
              {!isPartiallyReceived && (
                <button
                  type="button"
                  onClick={() => setSupplierPickerOpen(true)}
                  className="text-brand font-bold text-[11px] hover:underline flex items-center gap-1"
                >
                  <Search className="w-3 h-3" /> Find
                </button>
              )}
            </div>
            <select
              disabled={isPartiallyReceived}
              required
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none ${
                isPartiallyReceived ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
              }`}
            >
              <option value="">Select a supplier...</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.supplier_name} ({s.supplier_code || 'SUP'})
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Warehouse (from Centralized Master) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Delivery Warehouse <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-white font-medium"
            >
              <option value="">Select storage warehouse...</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.warehouse_name} ({w.warehouse_code}) {w.is_default ? '⭐ Default' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Expected Delivery Date</label>
            <input
              type="date"
              value={formData.expected_delivery_date}
              onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none font-semibold"
            />
          </div>
        </div>

        {/* Payment & Delivery Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
            <select
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-white"
            >
              <option value="Immediate / Advance">Immediate / Advance</option>
              <option value="Net 15 Days">Net 15 Days</option>
              <option value="Net 30 Days">Net 30 Days</option>
              <option value="Net 45 Days">Net 45 Days</option>
              <option value="Net 60 Days">Net 60 Days</option>
              <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Delivery Terms</label>
            <input
              type="text"
              value={formData.delivery_terms}
              onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
              placeholder="e.g. FOB Destination, Door Delivery"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
            />
          </div>
        </div>

        {/* Order Line Items Table */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Ordered Products & Quantities
            </h4>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="text-brand font-bold hover:underline flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product Row
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="p-2 w-10 text-center">#</th>
                  <th className="p-2">Product Description</th>
                  <th className="p-2 w-24 text-center">Ordered Qty</th>
                  <th className="p-2 w-20 text-center">Recv Qty</th>
                  <th className="p-2 w-24 text-right">Rate (₹)</th>
                  <th className="p-2 w-20 text-center">Disc %</th>
                  <th className="p-2 w-20 text-center">GST %</th>
                  <th className="p-2 w-28 text-right">Amount (₹)</th>
                  <th className="p-2 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {formData.items.map((it, idx) => {
                  const qty = Number(it.ordered_qty || 0);
                  const rate = Number(it.rate || 0);
                  const disc = (rate * Number(it.discount_percent || 0)) / 100;
                  const taxable = qty * (rate - disc);
                  const gst = (taxable * Number(it.gst_rate || 0)) / 100;
                  const lineTotal = Math.round(taxable + gst);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Product description..."
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-semibold focus:border-brand outline-none"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={Number(it.received_qty || 1)}
                          required
                          value={it.ordered_qty}
                          onChange={(e) => handleItemChange(idx, 'ordered_qty', e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-center font-bold font-mono focus:border-brand outline-none"
                        />
                      </td>
                      <td className="p-2 text-center font-mono font-semibold text-slate-500">
                        {it.received_qty > 0 ? (
                          <span className="text-emerald-700 font-bold">{it.received_qty}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={it.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-right font-mono font-bold focus:border-brand outline-none"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={it.discount_percent}
                          onChange={(e) => handleItemChange(idx, 'discount_percent', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-slate-200 rounded text-center font-mono focus:border-brand outline-none"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <select
                          value={it.gst_rate}
                          onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                          className="px-1.5 py-1 border border-slate-200 rounded text-xs focus:border-brand outline-none bg-white font-medium"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={it.received_qty > 0}
                          className={`p-1 rounded transition ${
                            it.received_qty > 0
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title={it.received_qty > 0 ? 'Cannot remove received item' : 'Remove item'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Reason & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Edit Audit Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.edit_reason}
              onChange={(e) => setFormData({ ...formData, edit_reason: e.target.value })}
              placeholder="e.g. Revised order quantity and rates per vendor call"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional remarks or instructions..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
            />
          </div>
        </div>

        {/* Totals & Submit */}
        {(() => {
          const { subtotal, totalTax, grandTotal } = calculateTotals();
          return (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 font-sans block text-[10px]">Subtotal:</span>
                  <span className="font-bold text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px]">GST Total:</span>
                  <span className="font-bold text-slate-800">₹{totalTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="pl-3 border-l border-slate-200">
                  <span className="text-brand font-sans block text-[10px] font-bold">New PO Total:</span>
                  <span className="font-black text-brand text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-600 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving Changes...' : 'Save Updated Purchase Order'}</span>
                </button>
              </div>
            </div>
          );
        })()}
      </form>

      {/* Supplier Picker Modal */}
      <SupplierPickerModal
        isOpen={supplierPickerOpen}
        onClose={() => setSupplierPickerOpen(false)}
        onSelectSupplier={(sup) => {
          setFormData((prev) => ({ ...prev, supplier_id: sup._id }));
        }}
        suppliers={suppliers}
        selectedSupplierId={formData.supplier_id}
      />
    </Modal>
  );
}
