import React, { useEffect, useState } from 'react';
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { ft, St, Dt } from '../../services/procurementService';

export default function PurchaseRequisitions() {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Lookups
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form
  const initialForm = {
    department: 'Production',
    priority: 'medium',
    warehouse_id: '',
    reason_for_request: 'min_reorder_level',
    requested_by: 'Operations Staff',
    items: [{ product_id: '', requested_qty: 10, estimated_rate: 0 }],
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadRequisitions(pagination.page);
  }, [pagination.page]);

  const loadLookups = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        St.getWarehouses(),
        Dt.getProducts({ limit: 100 }),
      ]);
      const whList = whRes?.data?.warehouses || whRes?.data || [];
      const prodList = prodRes?.data?.products || prodRes?.data || [];
      setWarehouses(Array.isArray(whList) ? whList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);

      if (whList.length > 0) {
        setFormData((prev) => ({
          ...prev,
          warehouse_id: whList[0]._id,
          items: [{ product_id: prodList[0]?._id || '', requested_qty: 10, estimated_rate: prodList[0]?.purchase_rate || 0 }],
        }));
      }
    } catch (err) {
      console.error('Error loading lookups:', err);
    }
  };

  const loadRequisitions = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getRequisitions({ page, limit: 10 });
      const list = Array.isArray(res.data) ? res.data : [];
      setRequisitions(list);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { product_id: products[0]?._id || '', requested_qty: 10, estimated_rate: products[0]?.purchase_rate || 0 },
      ],
    }));
  };

  const handleRemoveItemRow = (idx) => {
    if (formData.items.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleProductSelect = (idx, prodId) => {
    const prod = products.find((p) => p._id === prodId);
    const newItems = [...formData.items];
    newItems[idx].product_id = prodId;
    newItems[idx].estimated_rate = prod?.purchase_rate || 0;
    setFormData({ ...formData, items: newItems });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await ft.createRequisition(formData);
      setIsCreateOpen(false);
      setFormData(initialForm);
      loadRequisitions(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to submit requisition');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalAction = async (status) => {
    if (!selectedPR) return;
    try {
      setSubmitting(true);
      await ft.approveRequisition(selectedPR._id, {
        status,
        approval_notes: approvalNotes,
      });
      setIsReviewOpen(false);
      loadRequisitions(pagination.page);
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'PR #',
      key: 'requisition_number',
      cellClassName: 'font-mono font-semibold text-slate-900 text-sm',
    },
    {
      header: 'Date',
      key: 'requisition_date',
      render: (val) => <span className="text-xs text-slate-600">{new Date(val).toLocaleDateString('en-IN')}</span>,
    },
    {
      header: 'Department',
      key: 'department',
      render: (val) => (
        <span className="font-semibold text-slate-800 text-sm">{val || 'Production'}</span>
      ),
    },
    {
      header: 'Priority',
      key: 'priority',
      render: (val) => {
        const color =
          val === 'urgent'
            ? 'bg-rose-100 text-rose-800 font-bold'
            : val === 'high'
            ? 'bg-amber-100 text-amber-800 font-semibold'
            : 'bg-slate-100 text-slate-700 font-medium';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-semibold ${color}`}>
            {val}
          </span>
        );
      },
    },
    {
      header: 'Requested By',
      key: 'requested_by',
      render: (val) => <span className="text-xs text-slate-600">{val}</span>,
    },
    {
      header: 'Estimated Cost',
      key: 'total_estimated_cost',
      render: (val) => (
        <span className="font-mono font-semibold text-slate-900 text-sm">
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Purchase Requisitions (PR)"
        subtitle="Internal purchase demands generated from low stock thresholds, BOM shortages, or departmental requests."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Requisitions' },
        ]}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Requisition
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={requisitions}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => {
                setSelectedPR(row);
                setApprovalNotes(row.approval_notes || '');
                setIsReviewOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition inline-flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4" /> Review / View
            </button>
          </div>
        )}
      />

      {/* Create PR Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Internal Purchase Requisition (PR)"
        size="xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none font-medium"
              >
                <option value="Production">Production</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inventory">Inventory</option>
                <option value="Operations">Operations</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none font-medium"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Target Warehouse</label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none font-medium"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.warehouse_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5 text-sm">Reason For Request</label>
            <select
              value={formData.reason_for_request}
              onChange={(e) => setFormData({ ...formData, reason_for_request: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none font-medium"
            >
              <option value="min_reorder_level">Safety Stock / Min Reorder Threshold</option>
              <option value="urgent_order">Urgent Production Order Demands</option>
              <option value="replenishment">Periodic Replenishment</option>
              <option value="production_shortage">BOM Shortage Detected</option>
            </select>
          </div>

          {/* Line Items */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                Items Requested
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-sm font-bold text-brand hover:underline inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="p-3">Product / Material</th>
                    <th className="p-3 w-32">Requested Qty</th>
                    <th className="p-3 w-36">Est. Rate (₹)</th>
                    <th className="p-3 w-36 text-right">Est. Total (₹)</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <select
                          value={it.product_id}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-brand font-medium"
                        >
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.product_name} ({p.product_code})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={it.requested_qty}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].requested_qty = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-brand text-center font-bold"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={it.estimated_rate}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].estimated_rate = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-brand font-mono text-right font-semibold"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{(it.requested_qty * it.estimated_rate).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-center">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Requisition'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review & Approve Modal */}
      {selectedPR && (
        <Modal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          title={`Review Requisition: ${selectedPR.requisition_number}`}
          size="lg"
        >
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">
                  Department
                </span>
                <span className="font-bold text-slate-900 text-base">{selectedPR.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">
                  Priority
                </span>
                <span className="font-bold text-rose-700 uppercase text-sm">{selectedPR.priority}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">
                  Requested By
                </span>
                <span className="text-slate-800 font-semibold text-sm">{selectedPR.requested_by}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider mb-1">
                  Status
                </span>
                <StatusBadge status={selectedPR.status} />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-100 font-bold text-slate-800 text-sm uppercase tracking-wide">
                Requested Items
              </div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {selectedPR.items?.map((it, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-base">
                        {it.product_id?.product_name || 'Material'}
                      </p>
                      <p className="text-slate-600 font-mono text-sm mt-0.5">
                        {it.requested_qty} units @ ₹{it.estimated_rate}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-base">
                      ₹{Number(it.total_amount || it.requested_qty * it.estimated_rate).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Approver Comments</label>
              <textarea
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Approval rationale or rejection reason..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none font-medium"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Close
              </button>
              {selectedPR.status !== 'approved' && selectedPR.status !== 'converted_to_po' && (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleApprovalAction('rejected')}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 text-sm transition"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovalAction('approved')}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-lg bg-brand text-white font-bold hover:bg-brand-600 text-sm shadow-sm transition"
                  >
                    Approve PR
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
