import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Receipt,
  Scissors,
  Building,
  Warehouse,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { ft } from '../../services/procurementService';

export default function ProcessingBills() {
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
        purchase_type: 'manufacturing',
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
      console.error('Failed to load processing service bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Service Bill #',
      key: 'invoice_number',
      cellClassName: 'font-mono font-bold text-slate-900 text-sm',
      render: (val) => (
        <div>
          <span>{val}</span>
          <span className="block text-[10px] text-amber-800 font-sans font-semibold">
            Job Work Labor Service
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
      header: 'Job-Work Contractor',
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
      header: 'Related MPO',
      key: 'po_id',
      render: (po) => (
        <span className="font-mono text-xs font-semibold text-amber-800">
          {po?.po_number || 'Direct Service'}
        </span>
      ),
    },
    {
      header: 'Labor Charge Amount',
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
              bal > 0 ? 'text-amber-800' : 'text-emerald-700'
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
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition"
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
        title="Job Work Service Bills"
        subtitle="Manage service invoices for stitching, tailoring, dyeing, and processing without duplicate finished stock inwarding"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/processing/orders')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              <span>Job Orders</span>
            </button>
            <button
              onClick={() => navigate('/purchase-bills/create?type=manufacturing')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Record Service Bill
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Service Bills
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {pagination.total || invoices.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Job work labor invoices</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Service Billed
          </p>
          <p className="text-2xl font-black text-amber-800 mt-1 font-mono">
            ₹{invoices.reduce((acc, inv) => acc + (inv.grand_total || 0), 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Labor & conversion service value</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Pending Service Payouts
          </p>
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
          <p className="text-xs text-slate-400 mt-0.5">Payable to job-work contractors</p>
        </div>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-2xs">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold text-sm block">Non-Duplicate Inventory Accounting</span>
          These bills represent processing labor fees payable to external job-workers. Inward of Finished Goods into inventory is managed via physical arrival receipts to preserve 100% accurate stock records.
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
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <span className="text-[11px] bg-amber-100 text-amber-900 font-semibold px-2.5 py-1 rounded border border-amber-300">
          Job Work Classification: Pure Service Bill
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
          emptyMessage="No job work service bills found. Click '+ Record Service Bill' to record labor charges."
        />
      </div>
    </div>
  );
}
