import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Scissors,
  Building,
  Warehouse,
  Calendar,
  Layers,
  Boxes,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  Send,
  Truck,
  RotateCcw,
  FileText,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { ft } from '../../services/procurementService';

export default function ProcessingOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractorIdFilter = searchParams.get('contractor_id');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadOrders(pagination.page);
  }, [pagination.page, search, statusFilter, contractorIdFilter]);

  const loadOrders = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getOrders({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        purchase_type: 'manufacturing',
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
      console.error('Failed to load processing orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Job Order (MPO #)',
      key: 'po_number',
      cellClassName: 'font-mono font-bold text-amber-900 text-sm',
      render: (val, row) => (
        <div>
          <span>{val}</span>
          <span className="block text-[10px] text-amber-800 font-sans font-semibold">
            Job Work Order
          </span>
        </div>
      ),
    },
    {
      header: 'Contractor / Karigar Unit',
      key: 'supplier_id',
      render: (sup) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{sup?.supplier_name || 'Contractor'}</span>
          </p>
          {sup?.gstin && (
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">GST: {sup.gstin}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Target Finished Good',
      key: 'finished_product_name',
      render: (val, row) => (
        <div>
          <p className="font-bold text-slate-900 text-xs flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{val || row.finished_product_id?.product_name || 'Finished Product'}</span>
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Ordered: {row.manufacturing_qty || 100} PCS @ ₹{row.manufacturing_rate || 20}/PCS
          </p>
        </div>
      ),
    },
    {
      header: 'Raw Materials Required',
      key: 'raw_materials_required',
      render: (rms) => {
        const count = Array.isArray(rms) ? rms.length : 0;
        const first = rms?.[0];
        return (
          <div className="text-xs">
            {first ? (
              <span className="font-medium text-slate-800">
                {first.material_name || first.raw_material_id?.material_name} ({first.planned_qty}{' '}
                {first.uom || 'KG'})
              </span>
            ) : (
              <span className="text-slate-400 italic">None specified</span>
            )}
            {count > 1 && (
              <span className="text-[10px] text-amber-700 font-mono ml-1">
                (+{count - 1} more)
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Progress (Completed / Received)',
      key: 'completed_qty',
      render: (val, row) => (
        <div className="text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-emerald-700">{row.received_qty || 0} PCS</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600">{row.manufacturing_qty || 0} PCS</span>
          </div>
          <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  ((row.received_qty || 0) / (row.manufacturing_qty || 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Labor Service Amount',
      key: 'grand_total',
      cellClassName: 'font-mono text-sm font-bold text-slate-900',
      render: (val, row) => {
        const amt = val || (row.manufacturing_qty || 0) * (row.manufacturing_rate || 0);
        return `₹${Number(amt).toLocaleString('en-IN')}`;
      },
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
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition"
          >
            <span>Manage Stages</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing & Job Work Orders"
        subtitle="Manage end-to-end job work: raw material issue, contractor consumption, finished goods inward, and unused fabric returns"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/processing/material-tracking')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span>Material Tracking</span>
            </button>
            <button
              onClick={() => navigate('/purchase-orders/create?type=manufacturing')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create Job Work Order (MPO)
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Job Orders
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {pagination.total || orders.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Across all job-work contractors</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Production</p>
          <p className="text-2xl font-black text-amber-700 mt-1 font-mono">
            {orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Active cutting & stitching batches</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Completed Batches
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {orders.filter((o) => o.status === 'completed').length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Finished goods received into stock</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Service Charges
          </p>
          <p className="text-2xl font-black text-amber-900 mt-1 font-mono">
            ₹
            {orders
              .reduce(
                (acc, o) =>
                  acc + (o.grand_total || (o.manufacturing_qty || 0) * (o.manufacturing_rate || 0)),
                0
              )
              .toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Labor & conversion cost</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by MPO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="ordered">Issued / In Progress</option>
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
          emptyMessage="No job work orders found. Click '+ Create Job Work Order (MPO)' to initiate manufacturing."
        />
      </div>
    </div>
  );
}
