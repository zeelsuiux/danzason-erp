import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, RotateCcw, Building, Trash2, Edit2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { ft, St, Dt } from '../../services/procurementService';

export default function PurchaseReturns() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [purchaseTypeTab, setPurchaseTypeTab] = useState('all'); // 'all' | 'raw_material' | 'finished'
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Create Return Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const initialForm = {
    supplier_id: '',
    warehouse_id: '',
    reason: 'Damaged packaging and scratches on finish',
    items: [
      {
        product_id: '',
        description: '',
        quantity: 5,
        unit: 'PCS',
        unit_price: 100,
      },
    ],
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadReturns(pagination.page);
    loadLookups();
  }, [pagination.page]);

  const loadLookups = async () => {
    try {
      const [supRes, whRes, prodRes] = await Promise.all([
        ft.getSuppliers({ limit: 100 }),
        St.getWarehouses(),
        Dt.getProducts({ limit: 100 }),
      ]);
      const supList = Array.isArray(supRes.data) ? supRes.data : [];
      const whList = whRes?.data?.warehouses || whRes?.data || [];
      const prodList = prodRes?.data?.products || prodRes?.data || [];

      setSuppliers(supList);
      setWarehouses(Array.isArray(whList) ? whList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);

      if (supList.length > 0 && whList.length > 0 && prodList.length > 0) {
        setFormData((prev) => ({
          ...prev,
          supplier_id: supList[0]._id,
          warehouse_id: whList[0]._id,
          items: [
            {
              product_id: prodList[0]._id,
              description: prodList[0].product_name,
              quantity: 5,
              unit: prodList[0].uom || 'PCS',
              unit_price: prodList[0].purchase_rate || 100,
            },
          ],
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadReturns = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getReturns({ page, limit: 10 });
      const list = Array.isArray(res.data) ? res.data : [];
      setReturns(list);
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

  const handleProductSelect = (idx, prodId) => {
    const prod = products.find((p) => p._id === prodId);
    const newItems = [...formData.items];
    newItems[idx].product_id = prodId;
    newItems[idx].description = prod?.product_name || '';
    newItems[idx].unit_price = prod?.purchase_rate || 0;
    newItems[idx].unit = prod?.uom || 'PCS';
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItemRow = () => {
    const firstProd = products[0];
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: firstProd?._id || '',
          description: firstProd?.product_name || '',
          quantity: 1,
          unit: firstProd?.uom || 'PCS',
          unit_price: firstProd?.purchase_rate || 0,
        },
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

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      alert('Return reason is required.');
      return;
    }
    try {
      setSubmitting(true);
      await ft.createReturn(formData);
      setIsCreateOpen(false);
      loadReturns(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to record return');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Return #',
      key: 'return_number',
      cellClassName: 'font-mono font-semibold text-slate-900 text-sm',
    },
    {
      header: 'Date',
      key: 'return_date',
      render: (val) => <span className="text-xs text-slate-600">{new Date(val).toLocaleDateString('en-IN')}</span>,
    },
    {
      header: 'Supplier',
      key: 'supplier_id',
      render: (sup) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-brand shrink-0" />
            {sup?.supplier_name || 'Vendor'}
          </p>
        </div>
      ),
    },
    {
      header: 'Warehouse',
      key: 'warehouse_id',
      render: (wh) => <span className="text-xs text-slate-600">{wh?.warehouse_name || 'Central'}</span>,
    },
    {
      header: 'Grand Total',
      key: 'grand_total',
      cellClassName: 'font-semibold text-slate-900 font-mono text-sm',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const isRawMatReturn = (r) =>
    r.purchase_type === 'raw_material' ||
    Boolean(r.raw_material_id) ||
    r.items?.some((it) => it.item_type === 'raw_material' || it.raw_material_id);
  const isMfgReturn = (r) => r.purchase_type === 'manufacturing';

  const nonMfgReturns = returns.filter((r) => !isMfgReturn(r));
  const rawMaterialReturns = nonMfgReturns.filter((r) => isRawMatReturn(r));
  const finishedReturns = nonMfgReturns.filter((r) => !isRawMatReturn(r));

  const filteredReturns =
    purchaseTypeTab === 'all'
      ? nonMfgReturns
      : purchaseTypeTab === 'raw_material'
      ? rawMaterialReturns
      : finishedReturns;

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Purchase Returns & Rejections"
        subtitle="Manage materials returned to vendors with automatic stock deduction."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Returns' },
        ]}
        actions={
          <button
            onClick={() => navigate('/purchase-returns/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Purchase Return
          </button>
        }
      />

      {/* Tabs: All | Raw Material | Finished */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setPurchaseTypeTab('all')}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            purchaseTypeTab === 'all'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>All</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            purchaseTypeTab === 'all' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200/60 text-slate-500'
          }`}>
            {nonMfgReturns.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPurchaseTypeTab('raw_material')}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            purchaseTypeTab === 'raw_material'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Raw Material</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            purchaseTypeTab === 'raw_material' ? 'bg-blue-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
          }`}>
            {rawMaterialReturns.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPurchaseTypeTab('finished')}
          className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
            purchaseTypeTab === 'finished'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Finished</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            purchaseTypeTab === 'finished' ? 'bg-emerald-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
          }`}>
            {finishedReturns.length}
          </span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredReturns}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onRowClick={(row) => setSelectedReturn(row)}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setSelectedReturn(row)}
              className="p-1.5 text-slate-600 hover:text-brand hover:bg-emerald-50 rounded-lg transition"
              title="View Return Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/purchase-returns/edit/${row._id}`);
              }}
              className="p-1.5 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-lg transition"
              title="Edit Purchase Return"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Return Details Modal */}
      {selectedReturn && (
        <Modal
          isOpen={!!selectedReturn}
          onClose={() => setSelectedReturn(null)}
          title={`Purchase Return: ${selectedReturn.return_number || 'Details'}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Supplier</span>
                <span className="font-semibold text-slate-900">
                  {selectedReturn.supplier_id?.supplier_name || 'Vendor'}
                </span>
                <p className="text-xs text-slate-500">
                  {selectedReturn.supplier_id?.email || selectedReturn.supplier_id?.mobile}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Return Date & Status</span>
                <span className="font-medium text-slate-800 block">
                  {new Date(selectedReturn.return_date || Date.now()).toLocaleDateString('en-IN')}
                </span>
                <div className="mt-1">
                  <StatusBadge status={selectedReturn.status} />
                </div>
              </div>
            </div>

            {selectedReturn.reason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-xs font-semibold text-rose-900 block mb-0.5">Return Reason:</span>
                <p className="text-xs text-rose-800">{selectedReturn.reason}</p>
              </div>
            )}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                Returned Line Items
              </div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {selectedReturn.items && selectedReturn.items.length > 0 ? (
                  selectedReturn.items.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {it.product_id?.product_name || it.description || 'Product'}
                        </p>
                        <p className="text-slate-500 font-mono">
                          Qty: {it.quantity} {it.unit || 'units'} @ ₹{Number(it.unit_price || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        ₹{Number(it.total || it.quantity * it.unit_price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-3 text-xs text-slate-400 italic">No line items recorded.</p>
                )}
              </div>
              <div className="p-3 bg-slate-50 flex justify-between items-center border-t border-slate-200">
                <span className="font-bold text-xs text-slate-700">Total Return Value:</span>
                <span className="font-mono font-bold text-brand text-sm">
                  ₹{Number(selectedReturn.grand_total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Initiate Return Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Initiate Purchase Return to Vendor"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier / Vendor</label>
              <select
                required
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.supplier_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Source Warehouse</label>
              <select
                required
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.warehouse_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Return Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Reason for return: damaged goods, quality rejection, overshipment..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none resize-none"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                Items to Return
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 w-24">Return Qty</th>
                    <th className="p-2.5 w-28">Rate (₹)</th>
                    <th className="p-2.5 w-28 text-right">Debit Total (₹)</th>
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <select
                          value={it.product_id}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-brand"
                        >
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.product_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].quantity = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-brand text-center font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].unit_price = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-brand font-mono text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-800">
                        ₹{((it.quantity || 0) * (it.unit_price || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-center">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? 'Creating Debit Note...' : 'Record Purchase Return'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
