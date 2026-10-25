import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Receipt,
  Building,
  Warehouse,
  Calendar,
  Layers,
  FileSpreadsheet,
  CreditCard,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { ft } from '../../services/procurementService';

export default function RawMaterialBills() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInvoices(pagination.page);
  }, [pagination.page, search]);

  const loadInvoices = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getInvoices({
        page,
        limit: 10,
        search: search.trim() || undefined,
        purchase_type: 'raw_material',
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setInvoices(list);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
      }
    } catch (err) {
      console.error('Failed to load raw material bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'System Bill #',
      key: 'invoice_number',
      cellClassName: 'font-mono font-bold text-slate-900 text-sm',
      render: (val) => (
        <div>
          <span>{val}</span>
          <span className="block text-[10px] text-blue-800 font-sans font-semibold">
            Raw Material Inward
          </span>
        </div>
      ),
    },
    {
      header: 'Vendor Bill #',
      key: 'vendor_bill_number',
      cellClassName: 'font-mono text-xs text-slate-700',
    },
    {
      header: 'Bill Date',
      key: 'bill_date',
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
      header: 'Bill Amount',
      key: 'grand_total',
      cellClassName: 'font-mono text-sm font-bold text-slate-900',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Paid Amount',
      key: 'paid_amount',
      cellClassName: 'font-mono text-xs font-semibold text-emerald-700',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Balance Due',
      key: 'balance_amount',
      render: (val, row) => {
        const bal = val !== undefined ? val : (row.grand_total || 0) - (row.paid_amount || 0);
        return (
          <span
            className={`font-mono text-sm font-bold ${
              bal > 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            ₹{Number(bal || 0).toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      header: 'Payment Status',
      key: 'payment_status',
      render: (_, row) => {
        const bal =
          row.balance_amount !== undefined
            ? row.balance_amount
            : (row.grand_total || 0) - (row.paid_amount || 0);
        const status = bal <= 0 ? 'paid' : row.paid_amount > 0 ? 'partial' : 'unpaid';
        return <StatusBadge status={status} />;
      },
    },
    {
      header: 'Action',
      key: 'actions',
      cellClassName: 'text-right',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/purchase-bills/edit/${row._id}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Material Purchase Bills"
        subtitle="Manage supplier bills for fabric, yarn, thread, trims, and packaging raw materials"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/raw-materials/orders')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>RM Orders</span>
            </button>
            <button
              onClick={() => navigate('/purchase-bills/create?type=raw_material')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create RM Purchase Bill
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total RM Bills</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {pagination.total || invoices.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Raw material inward invoices</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Inward Value</p>
          <p className="text-2xl font-black text-blue-700 mt-1 font-mono">
            ₹{invoices.reduce((acc, inv) => acc + (inv.grand_total || 0), 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Physical stock inward value</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Balance Due</p>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">
            ₹
            {invoices
              .reduce(
                (acc, inv) =>
                  acc +
                  (inv.balance_amount !== undefined
                    ? inv.balance_amount
                    : (inv.grand_total || 0) - (inv.paid_amount || 0)),
                0
              )
              .toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Pending payment to RM suppliers</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bill number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded border border-blue-200">
          Raw Material Bills: Auto Inward into Warehouse Inventory
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={invoices}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage="No raw material bills found. Click '+ Create RM Purchase Bill' to inward stock."
        />
      </div>
    </div>
  );
}
