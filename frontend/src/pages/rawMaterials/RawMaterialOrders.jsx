import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ShoppingCart,
  Building,
  Warehouse,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { ft } from '../../services/procurementService';

export default function RawMaterialOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supplierIdFilter = searchParams.get('supplier_id');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadOrders(pagination.page);
  }, [pagination.page, search, statusFilter, supplierIdFilter]);

  const loadOrders = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getOrders({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        purchase_type: 'raw_material',
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
      console.error('Failed to load raw material orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'RM PO Number',
      key: 'po_number',
      cellClassName: 'font-mono font-bold text-blue-700 text-sm',
      render: (val, row) => (
        <div>
          <span>{val}</span>
          <span className="block text-[10px] text-blue-800 font-sans font-semibold">
            Raw Material PO
          </span>
        </div>
      ),
    },
    {
      header: 'PO Date',
      key: 'po_date',
      render: (val) => (
        <span className="text-xs text-slate-700 font-mono">
          {val ? new Date(val).toLocaleDateString('en-IN') : '—'}
        </span>
      ),
    },
    {
      header: 'Raw Material Supplier',
      key: 'supplier_id',
      render: (sup) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{sup?.supplier_name || 'Vendor'}</span>
          </p>
          {sup?.gstin && (
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">GST: {sup.gstin}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Receiving Warehouse',
      key: 'warehouse_id',
      render: (wh) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-700">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          <span>{wh?.warehouse_name || 'Main Warehouse'}</span>
        </span>
      ),
    },
    {
      header: 'Materials Ordered',
      key: 'items',
      render: (items) => {
        const count = Array.isArray(items) ? items.length : 0;
        const firstItem = items?.[0];
        return (
          <div className="text-xs">
            <span className="font-medium text-slate-900">
              {firstItem?.product_name || firstItem?.description || `${count} Materials`}
            </span>
            {count > 1 && (
              <span className="text-[10px] text-slate-500 font-mono ml-1">
                (+{count - 1} more)
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Total Amount',
      key: 'grand_total',
      cellClassName: 'font-mono text-sm font-bold text-slate-900',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Action',
      key: 'actions',
      cellClassName: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/purchase/orders/${row._id}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <button
            onClick={() => navigate(`/purchase-bills/create?po_id=${row._id}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            title="Create Inward Bill"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Inward Bill</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Material Purchase Orders"
        subtitle="Dedicated Purchase Orders for procuring Fabric, Yarn, Buttons, Thread, and Packaging raw materials"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/raw-materials/suppliers')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>RM Suppliers</span>
            </button>
            <button
              onClick={() => navigate('/purchase-orders/create?type=raw_material')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create RM Purchase Order
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total RM Orders</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {pagination.total || orders.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Purchases across all suppliers</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Delivery</p>
          <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
            {orders.filter((o) => o.status === 'ordered' || o.status === 'partially_received').length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Awaiting warehouse inward</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Orders</p>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {orders.filter((o) => o.status === 'completed' || o.status === 'inwarded').length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Fully inwarded to stock</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Procurement Value</p>
          <p className="text-2xl font-black text-blue-700 mt-1 font-mono">
            ₹{orders.reduce((acc, o) => acc + (o.grand_total || 0), 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Raw material spend</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="partially_received">Partially Received</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage="No raw material purchase orders found. Click '+ Create RM Purchase Order' to create one."
        />
      </div>
    </div>
  );
}
