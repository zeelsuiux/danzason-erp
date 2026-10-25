import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, AlertCircle, CheckCircle2, ArrowRight, PackageCheck } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { ft, St } from '../../services/procurementService';

export default function ConvertPoToBillModal({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess = () => {},
}) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [vendorBillNumber, setVendorBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (purchaseOrder) {
      setWarehouseId(purchaseOrder.warehouse_id?._id || purchaseOrder.warehouse_id || '');
      setVendorBillNumber(purchaseOrder.vendor_bill_number || `BILL-${purchaseOrder.po_number || '2026'}`);
      const poItems = (purchaseOrder.items || []).map((it) => {
        const ordered = Number(it.ordered_qty || 0);
        const received = Number(it.received_qty || 0);
        const pending = it.pending_qty !== undefined ? Number(it.pending_qty) : Math.max(0, ordered - received);
        return {
          po_item_id: it._id,
          product_id: it.product_id?._id || it.product_id,
          description: it.product_id?.product_name || it.description || 'Apparel Item',
          quantity: pending > 0 ? pending : ordered,
          unit_rate: Number(it.rate || it.unit_rate || 0),
          gst_rate: Number(it.gst_rate || 5),
          uom: it.uom || 'PCS',
        };
      });
      setItems(poItems);
    }
  }, [purchaseOrder]);

  const loadWarehouses = async () => {
    try {
      const res = await St.getWarehouses();
      const list = res?.data?.warehouses || res?.data || [];
      const arr = Array.isArray(list) ? list : [];
      setWarehouses(arr);
      const def = arr.find((w) => w.is_default);
      if (def) {
        setWarehouseId((prev) => prev || def._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQtyChange = (idx, qty) => {
    const updated = [...items];
    updated[idx].quantity = Math.max(0, Number(qty) || 0);
    setItems(updated);
  };

  const handleRateChange = (idx, rate) => {
    const updated = [...items];
    updated[idx].unit_rate = Math.max(0, Number(rate) || 0);
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, it) => {
      const lineTaxable = (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0);
      const lineGst = (lineTaxable * (Number(it.gst_rate) || 5)) / 100;
      return sum + lineTaxable + lineGst;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorBillNumber.trim()) {
      setErrorMessage('Vendor Bill / Invoice Number is required.');
      return;
    }

    const validItems = items.filter((it) => it.quantity > 0);
    if (validItems.length === 0) {
      setErrorMessage('At least one item must have a quantity greater than 0.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const payload = {
        po_id: purchaseOrder._id,
        supplier_id: purchaseOrder.supplier_id?._id || purchaseOrder.supplier_id,
        warehouse_id: warehouseId,
        vendor_bill_number: vendorBillNumber.trim(),
        bill_date: billDate,
        due_date: dueDate,
        remarks: remarks.trim() || `Inward against PO ${purchaseOrder.po_number}`,
        items: validItems.map((it) => ({
          product_id: it.product_id,
          description: it.description,
          quantity: it.quantity,
          unit_rate: it.unit_rate,
          gst_rate: it.gst_rate,
          uom: it.uom,
        })),
      };

      const res = await ft.createInvoice(payload);
      onSuccess(res.data);
      onClose();
      navigate('/purchase/invoices');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record purchase bill and inward stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Inward Stock & Generate Bill: ${purchaseOrder?.po_number || ''}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans text-slate-800">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {purchaseOrder?.items?.some((it) => (it.received_qty || 0) > 0) && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-2.5">
            <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <p className="font-bold text-xs">Single Consolidated Purchase Bill Flow</p>
              <p className="text-[11px] text-blue-700">
                This Purchase Order has previous partial deliveries. As per ERP business rules, this new delivery will be consolidated directly into the existing Purchase Bill. No duplicate bill will be created.
              </p>
            </div>
          </div>
        )}

        {/* Bill Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Vendor Bill / Invoice # <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={vendorBillNumber}
              onChange={(e) => setVendorBillNumber(e.target.value)}
              placeholder="e.g. BILL-98765"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Bill Date</label>
            <input
              type="date"
              required
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none font-semibold"
            />
          </div>
        </div>

        {/* Destination Warehouse */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Receiving Warehouse
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-white font-medium"
          >
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.warehouse_name} ({w.city || 'Central Hub'})
              </option>
            ))}
          </select>
        </div>

        {/* Items Table */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Received Items & Inward Quantities
            </h4>
            <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ⚡ Stock will be auto-incremented in inventory
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5 w-24 text-center">Inward Qty</th>
                  <th className="p-2.5 w-16 text-center">UOM</th>
                  <th className="p-2.5 w-28 text-right">Rate (₹)</th>
                  <th className="p-2.5 w-28 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => {
                  const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-900">{it.description}</td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={it.quantity}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-center font-bold font-mono focus:border-brand outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-500">{it.uom}</td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.unit_rate}
                          onChange={(e) => handleRateChange(idx, e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-right font-mono font-bold focus:border-brand outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total & Action */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <div>
            <span className="text-xs text-slate-500 font-semibold">Estimated Total Amount:</span>
            <span className="text-base font-black text-emerald-700 font-mono ml-2">
              ₹{Math.round(calculateTotal()).toLocaleString('en-IN')}
            </span>
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
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              <span>{loading ? 'Processing...' : '⚡ Inward Stock & Create Bill'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
