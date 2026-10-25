import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, AlertCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { ft, St } from '../../services/procurementService';

export default function ConvertPoToGrnModal({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess = () => {},
}) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [remarks, setRemarks] = useState('');

  // Attachment
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState('');
  const [fileData, setFileData] = useState('');

  // Items
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (purchaseOrder) {
      setWarehouseId(purchaseOrder.warehouse_id?._id || purchaseOrder.warehouse_id || '');
      const poItems = (purchaseOrder.items || []).map((it) => {
        const ordered = Number(it.ordered_qty || 0);
        const received = Number(it.received_qty || 0);
        const pending = it.pending_qty !== undefined ? Number(it.pending_qty) : Math.max(0, ordered - received);
        return {
          po_item_id: it._id,
          product_id: it.product_id?._id || it.product_id,
          product_name: it.product_id?.product_name || it.description || 'Material',
          product_code: it.product_id?.product_code || '',
          ordered_qty: ordered,
          already_received_qty: received,
          pending_qty: pending,
          received_qty: pending > 0 ? pending : 0,
          unit_rate: Number(it.rate || it.unit_rate || 0),
          batch_number: '',
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds 8MB limit.');
      return;
    }
    setAttachmentName(file.name);
    setAttachmentType(file.type || 'application/pdf');

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleItemQtyChange = (idx, qty) => {
    const newItems = [...items];
    newItems[idx].received_qty = Math.max(0, Number(qty) || 0);
    setItems(newItems);
  };

  const handleBatchChange = (idx, batch) => {
    const newItems = [...items];
    newItems[idx].batch_number = batch;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warehouseId) {
      setErrorMessage('Please select destination warehouse.');
      return;
    }

    const validItems = items.filter((it) => it.received_qty > 0);
    if (validItems.length === 0) {
      setErrorMessage('At least one item must have a received quantity greater than 0.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const payload = {
        po_id: purchaseOrder._id,
        supplier_id: purchaseOrder.supplier_id?._id || purchaseOrder.supplier_id,
        warehouse_id: warehouseId,
        grn_date: grnDate,
        vendor_challan_no: challanNo.trim(),
        vendor_challan_date: challanDate || null,
        vehicle_number: vehicleNumber.trim(),
        driver_name: driverName.trim(),
        remarks: remarks.trim(),
        file_data: fileData || undefined,
        attachment_name: attachmentName || undefined,
        attachment_type: attachmentType || undefined,
        items: validItems.map((it) => ({
          po_item_id: it.po_item_id,
          product_id: it.product_id,
          received_qty: it.received_qty,
          accepted_qty: it.received_qty,
          unit_rate: it.unit_rate,
          batch_number: it.batch_number.trim(),
        })),
      };

      const res = await ft.createGrn(payload);
      const createdGrn = res.data || res;
      onSuccess(createdGrn);
      onClose();
      if (createdGrn?._id) {
        navigate(`/purchase/grn/${createdGrn._id}`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create Goods Receipt Note.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Convert Purchase Order to GRN: ${purchaseOrder?.po_number || ''}`}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">
              Receiving Warehouse <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
            >
              <option value="">Select Warehouse...</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">GRN Receiving Date</label>
            <input
              type="date"
              required
              value={grnDate}
              onChange={(e) => setGrnDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">Vendor Delivery Challan #</label>
            <input
              type="text"
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              placeholder="e.g. CH-2026-99"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">Vehicle / Lorry #</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. GJ-01-AB-1234"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">Driver Name / Transporter</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="e.g. Ramesh Singh"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-sm">Attach Challan / Receipt</label>
            {attachmentName ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
                <span className="truncate max-w-[150px] font-mono text-xs">{attachmentName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentName('');
                    setFileData('');
                  }}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer text-sm">
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Upload PDF / Image</span>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Line items inward table */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
              Physical Receiving Quantities
            </h4>
            <span className="text-slate-500 text-xs font-semibold">Supports Partial Inward Receiving</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Item Name</th>
                  <th className="p-2.5 text-center w-24">Ordered</th>
                  <th className="p-2.5 text-center w-24">Received</th>
                  <th className="p-2.5 text-center w-24">Pending</th>
                  <th className="p-2.5 text-center w-28">This Inward Qty</th>
                  <th className="p-2.5 w-36">Batch / Lot #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5">
                      <p className="font-semibold text-slate-900 text-sm">{it.product_name}</p>
                      {it.product_code && <p className="text-[11px] font-mono text-slate-400">{it.product_code}</p>}
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-700 font-mono text-sm">{it.ordered_qty}</td>
                    <td className="p-2.5 text-center font-semibold text-emerald-600 font-mono text-sm">{it.already_received_qty}</td>
                    <td className="p-2.5 text-center font-semibold text-rose-600 font-mono text-sm">{it.pending_qty}</td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max={it.pending_qty > 0 ? it.pending_qty : it.ordered_qty}
                        value={it.received_qty}
                        onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                        className="w-20 px-2 py-1 text-center font-semibold border border-slate-200 rounded text-sm font-mono outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={it.batch_number}
                        onChange={(e) => handleBatchChange(idx, e.target.value)}
                        placeholder="e.g. BATCH-A1"
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono outline-none focus:border-brand"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1 text-sm">Inspection / Receiving Remarks</label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Driver note, packaging seal status, visual condition..."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save & Generate GRN
          </button>
        </div>
      </form>
    </Modal>
  );
}
