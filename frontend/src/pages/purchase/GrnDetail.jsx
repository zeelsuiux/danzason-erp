import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Building,
  Truck,
  FileText,
  FileCheck2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { ft, St } from '../../services/procurementService';

export default function GrnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);

  // Post to stock modal
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [postingRemarks, setPostingRemarks] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (!id || id === 'new' || id === 'create') {
      navigate('/purchase/grn', { replace: true });
      return;
    }
    loadGrn();
    loadWarehouses();
  }, [id]);

  const loadGrn = async () => {
    try {
      setLoading(true);
      const res = await ft.getGrnById(id);
      setGrn(res.data);
      if (res.data?.warehouse_id?._id) {
        setSelectedWarehouseId(res.data.warehouse_id._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await St.getWarehouses();
      const list = res?.data?.warehouses || res?.data || [];
      setWarehouses(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostToStock = async (e) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      alert('Please select destination warehouse.');
      return;
    }

    try {
      setIsPosting(true);
      await ft.postGrnToStock(id, {
        warehouse_id: selectedWarehouseId,
        remarks: postingRemarks,
      });
      setIsPostModalOpen(false);
      await loadGrn();
      alert('GRN items successfully posted into Inventory!');
    } catch (err) {
      alert(err.message || 'Error posting GRN to inventory');
    } finally {
      setIsPosting(false);
    }
  };

  if (loading || !grn) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      <PageHeader
        title={`Goods Receipt: ${grn.grn_number}`}
        subtitle={`Inward material received on ${new Date(grn.grn_date).toLocaleDateString('en-IN')}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'GRN', href: '/purchase/grn' },
          { label: grn.grn_number },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/purchase/grn')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {!grn.stock_posted && (
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-600 text-white shadow-sm transition"
              >
                <CheckCircle className="w-4 h-4" />
                Post GRN to Stock
              </button>
            )}
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Posted</p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                grn.stock_posted
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {grn.stock_posted ? 'Stock Updated in Ledger' : 'Pending Inward Post'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {grn.supplier_id?.supplier_name || 'Vendor'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            PO: <span className="font-mono font-medium text-slate-700">{grn.po_id?.po_number || 'Direct'}</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receiving Warehouse</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {grn.warehouse_id?.warehouse_name || 'Central Warehouse'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Challan / Vehicle</p>
          <p className="text-sm font-mono font-semibold text-slate-900 mt-1">
            {grn.vendor_challan_no || 'No Challan #'}
          </p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{grn.vehicle_number || 'N/A'}</p>
        </div>
      </div>

      {/* Line Items Received */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Inward Material Line Items</h2>
          <span className="text-xs font-semibold text-slate-500">
            {grn.items?.length || 0} Products Received
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-3 text-center">Received Qty</th>
                <th className="py-3 px-3 text-center">Accepted Qty</th>
                <th className="py-3 px-3 text-center">Rejected Qty</th>
                <th className="py-3 px-4">Batch / Lot Number</th>
                <th className="py-3 px-4 text-center">QC Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-mono">
              {grn.items?.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-sans">
                    <p className="font-semibold text-slate-900 text-sm">
                      {it.product_id?.product_name || 'Material'}
                    </p>
                    {it.product_id?.product_code && (
                      <p className="text-xs font-mono text-slate-400 mt-0.5">
                        {it.product_id.product_code}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-900 text-sm">
                    {it.received_qty}
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-700 font-semibold text-sm">
                    {it.accepted_qty || it.received_qty}
                  </td>
                  <td className="py-3 px-3 text-center text-rose-600 font-semibold text-sm">
                    {it.rejected_qty || 0}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium text-xs">
                      {it.batch_number || 'DEFAULT-BATCH'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={it.qc_status || 'passed'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attachment Preview (if any) */}
      {grn.file_data && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm uppercase mb-3">Challan Document Attachment</h3>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="font-mono text-sm text-slate-700">
              {grn.attachment_name || 'Delivery_Challan_Document'}
            </span>
            <a
              href={grn.file_data}
              target="_blank"
              rel="noreferrer"
              download={grn.attachment_name || 'challan'}
              className="text-brand hover:underline font-bold text-sm inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" /> View / Download Document
            </a>
          </div>
        </div>
      )}

      {/* Post to Stock Modal */}
      <Modal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        title="Post Goods Receipt to Inventory Stock"
        size="md"
      >
        <form onSubmit={handlePostToStock} className="space-y-4 text-sm">
          <p className="text-slate-700 leading-relaxed">
            Confirming this action will increment physical inventory quantities of all accepted items in the selected warehouse and record the inward transaction. This action cannot be undone.
          </p>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5 text-sm">
              Destination Warehouse <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none font-medium"
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
            <label className="block font-bold text-slate-700 mb-1.5 text-sm">Posting Remarks</label>
            <textarea
              rows={3}
              value={postingRemarks}
              onChange={(e) => setPostingRemarks(e.target.value)}
              placeholder="e.g. Stock posted to Bin A-12 after QC clearance"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none font-medium"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPostModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPosting}
              className="px-5 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2 shadow-sm transition"
            >
              {isPosting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Confirm Inward Stock Post
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
