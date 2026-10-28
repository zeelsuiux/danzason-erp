import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ShoppingCart,
  Eye,
  PackageCheck,
  Building,
  Trash2,
  AlertCircle,
  Edit2,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import ConvertPoToBillModal from './ConvertPoToBillModal';
import EditPurchaseOrderModal from '../../components/common/EditPurchaseOrderModal';
import SupplierPickerModal from '../../components/common/SupplierPickerModal';
import { ft, St, Dt } from '../../services/procurementService';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [purchaseTypeTab, setPurchaseTypeTab] = useState('all');
  const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);

  // Lookups
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [convertPo, setConvertPo] = useState(null);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [editPo, setEditPo] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const initialForm = {
    supplier_id: '',
    warehouse_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_terms: 'Net 30 Days',
    is_interstate: false,
    notes: '',
    items: [{ product_id: '', description: '', ordered_qty: 10, rate: 100, gst_rate: 18 }],
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadOrders(pagination.page);
  }, [pagination.page, search, statusFilter]);

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

      if (supList.length > 0 && whList.length > 0) {
        const defaultWh = whList.find((w) => w.is_default && w.status === 'active') || whList[0];
        setFormData((prev) => ({
          ...prev,
          supplier_id: supList[0]._id,
          warehouse_id: defaultWh ? defaultWh._id : whList[0]._id,
          items: [
            {
              product_id: prodList[0]?._id || '',
              description: prodList[0]?.product_name || '',
              ordered_qty: 10,
              rate: prodList[0]?.purchase_rate || 100,
              gst_rate: prodList[0]?.gst_rate || 18,
            },
          ],
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadOrders = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getOrders({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setOrders(list);
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
    const firstProd = products[0];
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: firstProd?._id || '',
          description: firstProd?.product_name || '',
          ordered_qty: 10,
          rate: firstProd?.purchase_rate || 100,
          gst_rate: firstProd?.gst_rate || 18,
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

  const handleProductSelect = (idx, prodId) => {
    const prod = products.find((p) => p._id === prodId);
    const newItems = [...formData.items];
    newItems[idx].product_id = prodId;
    newItems[idx].description = prod?.product_name || '';
    newItems[idx].rate = prod?.purchase_rate || 0;
    newItems[idx].gst_rate = prod?.gst_rate || 18;
    setFormData({ ...formData, items: newItems });
  };

  // Calculations for preview
  const calculateTotals = () => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    formData.items.forEach((it) => {
      const lineTaxable = (it.ordered_qty || 0) * (it.rate || 0);
      taxable += lineTaxable;
      const gst = it.gst_rate || 0;
      if (formData.is_interstate) {
        igst += (lineTaxable * gst) / 100;
      } else {
        cgst += (lineTaxable * (gst / 2)) / 100;
        sgst += (lineTaxable * (gst / 2)) / 100;
      }
    });

    const grand = Math.round(taxable + cgst + sgst + igst);
    return { taxable, cgst, sgst, igst, grand };
  };

  const totals = calculateTotals();

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      alert('Please select a supplier.');
      return;
    }
    if (!formData.warehouse_id) {
      alert('Please select a destination warehouse.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await ft.createOrder(formData);
      setIsCreateOpen(false);
      loadOrders(pagination.page);
      if (res.data?._id) {
        navigate(`/purchase/orders/${res.data._id}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'PO Number',
      key: 'po_number',
      cellClassName: 'font-mono font-semibold text-slate-900 text-sm',
      render: (val, row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>{val}</span>
          {row.purchase_type === 'manufacturing' ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 font-sans">
              Job Work
            </span>
          ) : row.purchase_type === 'raw_material' ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 font-sans">
              Raw Material
            </span>
          ) : null}
        </div>
      ),
    },
    {
      header: 'PO Date',
      key: 'po_date',
      render: (val) => <span className="text-xs text-slate-600">{new Date(val).toLocaleDateString('en-IN')}</span>,
    },
    {
      header: 'Supplier / Vendor',
      key: 'supplier_id',
      render: (sup) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-brand shrink-0" />
            {sup?.supplier_name || 'Vendor'}
          </p>
          {sup?.gstin && <p className="text-[11px] font-mono text-slate-400 mt-0.5">GST: {sup.gstin}</p>}
        </div>
      ),
    },
    {
      header: 'Warehouse',
      key: 'warehouse_id',
      render: (wh) => <span className="text-xs text-slate-600">{wh?.warehouse_name || 'Central'}</span>,
    },
    {
      header: 'Items Count',
      key: 'items',
      render: (items) => (
        <span className="text-xs font-medium text-slate-700 font-mono">
          {items?.length || 0} line items
        </span>
      ),
    },
    {
      header: 'Grand Total',
      key: 'grand_total',
      cellClassName: 'font-mono font-semibold text-slate-900 text-sm',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const nonManufacturingOrders = orders.filter((o) => o.purchase_type !== 'manufacturing');
  const rawMaterialOrders = orders.filter((o) => o.purchase_type === 'raw_material');
  const finishedOrders = orders.filter(
    (o) => !o.purchase_type || o.purchase_type === 'standard' || o.purchase_type === 'finished'
  );

  const tabScopedOrders =
    purchaseTypeTab === 'all'
      ? nonManufacturingOrders
      : purchaseTypeTab === 'raw_material'
      ? rawMaterialOrders
      : finishedOrders;

  const filteredOrders = tabScopedOrders.filter((o) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const matchPo = o.po_number?.toLowerCase().includes(term);
    const matchSuppName = o.supplier_id?.supplier_name?.toLowerCase().includes(term);
    const matchSuppCode = o.supplier_id?.supplier_code?.toLowerCase().includes(term);
    const matchItems = o.items?.some(
      (it) => it.product_name?.toLowerCase().includes(term) || it.sku?.toLowerCase().includes(term) || it.description?.toLowerCase().includes(term)
    );
    return matchPo || matchSuppName || matchSuppCode || matchItems;
  });

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Purchase Orders"
        subtitle="Commercial agreements issued to suppliers specifying products, quantities, prices, and delivery terms."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Orders' },
        ]}
        actions={
          <button
            onClick={() => navigate('/purchase-orders/create')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Purchase Order
          </button>
        }
      />

      {/* Purchase Tabs: All | Raw Material | Finished */}
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
            {nonManufacturingOrders.length}
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
            {rawMaterialOrders.length}
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
            {finishedOrders.length}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-72 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO Number..."
            className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand w-full sm:w-52"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partially_received">Partially Received</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onRowClick={(row) => navigate(`/purchase/orders/${row._id}`)}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => navigate(`/purchase/orders/${row._id}`)}
              className="p-1.5 text-slate-600 hover:text-brand hover:bg-emerald-50 rounded-lg transition"
              title="View PO Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            {row.status !== 'completed' && row.status !== 'cancelled' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/purchase-orders/edit/${row._id}`);
                }}
                className="p-1.5 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                title="Edit Purchase Order"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {row.status !== 'completed' && row.status !== 'cancelled' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/purchase-bills/create?po_id=${row._id}`);
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-brand hover:bg-emerald-600 hover:text-white transition inline-flex items-center gap-1 border border-emerald-200"
                title="Inward Stock & Generate Bill"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>⚡ Inward & Bill</span>
              </button>
            )}
          </div>
        )}
      />

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Purchase Order (PO)"
        size="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 text-sm">
                  Supplier / Vendor <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsSupplierPickerOpen(true)}
                  className="text-brand font-bold text-xs hover:underline flex items-center gap-1"
                >
                  <Search className="w-3 h-3" /> Find Supplier
                </button>
              </div>
              <div className="flex gap-1.5">
                <select
                  required
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplier_name} ({s.supplier_code || 'SUP'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsSupplierPickerOpen(true)}
                  className="px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 shrink-0"
                  title="Search & Find Supplier"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">
                Destination Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.warehouse_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">PO Issue Date</label>
              <input
                type="date"
                required
                value={formData.po_date}
                onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Expected Delivery Date</label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) =>
                  setFormData({ ...formData, expected_delivery_date: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Payment Terms</label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              >
                <option value="Immediate / Advance">Immediate / Advance</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 45 Days">Net 45 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5 pt-6">
              <input
                type="checkbox"
                id="is_interstate"
                checked={formData.is_interstate}
                onChange={(e) => setFormData({ ...formData, is_interstate: e.target.checked })}
                className="w-4 h-4 rounded text-brand focus:ring-brand"
              />
              <label htmlFor="is_interstate" className="font-semibold text-slate-700 cursor-pointer text-sm">
                Interstate (IGST Applicable)
              </label>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                Purchase Order Line Items
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
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3 w-28 text-center">Qty</th>
                    <th className="p-3 w-32 text-right">Rate (₹)</th>
                    <th className="p-3 w-28 text-center">GST %</th>
                    <th className="p-3 w-32 text-right">Taxable (₹)</th>
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
                          className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand font-medium"
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
                          value={it.ordered_qty}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].ordered_qty = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand text-center font-bold font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={it.rate}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].rate = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-2.5 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand font-mono text-right font-medium"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={it.gst_rate}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].gst_rate = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-2 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand text-center font-medium"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800 text-sm">
                        ₹{((it.ordered_qty || 0) * (it.rate || 0)).toLocaleString('en-IN')}
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

          {/* Totals Summary */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-sm">Notes / Instructions</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Include quality inspection requirements, transport instructions..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none"
              />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2 font-mono text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount:</span>
                <span className="font-semibold">₹{totals.taxable.toLocaleString('en-IN')}</span>
              </div>
              {formData.is_interstate ? (
                <div className="flex justify-between text-slate-600">
                  <span>IGST:</span>
                  <span className="font-semibold">₹{totals.igst.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST:</span>
                    <span className="font-semibold">₹{totals.cgst.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST:</span>
                    <span className="font-semibold">₹{totals.sgst.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-base">
                <span>Grand Total:</span>
                <span className="text-brand">₹{totals.grand.toLocaleString('en-IN')}</span>
              </div>
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
              {submitting ? 'Generating PO...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert to Bill & Inward Stock Modal */}
      {convertPo && (
        <ConvertPoToBillModal
          isOpen={isConvertOpen}
          onClose={() => {
            setIsConvertOpen(false);
            setConvertPo(null);
          }}
          purchaseOrder={convertPo}
          onSuccess={() => loadOrders(pagination.page)}
        />
      )}

      {/* Edit Purchase Order Modal */}
      {editPo && (
        <EditPurchaseOrderModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditPo(null);
          }}
          purchaseOrder={editPo}
          onSuccess={() => loadOrders(pagination.page)}
        />
      )}

      {/* Find Supplier Popup Modal */}
      <SupplierPickerModal
        isOpen={isSupplierPickerOpen}
        onClose={() => setIsSupplierPickerOpen(false)}
        onSelectSupplier={(sup) => {
          setFormData((prev) => ({ ...prev, supplier_id: sup._id }));
        }}
        suppliers={suppliers}
        selectedSupplierId={formData.supplier_id}
      />
    </div>
  );
}
