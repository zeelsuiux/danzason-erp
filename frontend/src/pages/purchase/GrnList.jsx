import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PackageCheck, Eye, Building, Plus } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { ft } from '../../services/procurementService';

export default function GrnList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('po_id');

  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  useEffect(() => {
    loadGrns(pagination.page);
  }, [pagination.page, poId]);

  const loadGrns = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ft.getGrns({ page, limit: 10, po_id: poId || undefined });
      const list = Array.isArray(res.data) ? res.data : [];
      setGrns(list);
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

  const columns = [
    {
      header: 'GRN Number',
      key: 'grn_number',
      cellClassName: 'font-mono font-semibold text-slate-900 text-sm',
    },
    {
      header: 'Date',
      key: 'grn_date',
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
      header: 'PO Ref #',
      key: 'po_id',
      render: (po) => (
        <span className="font-mono font-medium text-slate-800 text-xs">
          {po?.po_number || 'Direct'}
        </span>
      ),
    },
    {
      header: 'Challan #',
      key: 'vendor_challan_no',
      cellClassName: 'font-mono text-xs text-slate-600',
      render: (val) => val || '—',
    },
    {
      header: 'Stock Posted',
      key: 'stock_posted',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
            val ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}
        >
          {val ? 'Posted' : 'Pending'}
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
        title="Goods Receipts (GRN)"
        subtitle="Inward material inspection challans recording physical arrival of goods against purchase orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'GRN' },
        ]}
        actions={
          <button
            onClick={() => navigate('/purchase/orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Receive Inward via PO
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={grns}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onRowClick={(row) => navigate(`/purchase/grn/${row._id}`)}
        actions={(row) => (
          <button
            onClick={() => navigate(`/purchase/grn/${row._id}`)}
            className="p-1.5 text-slate-600 hover:text-brand hover:bg-emerald-50 rounded-lg transition"
            title="View GRN Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      />
    </div>
  );
}
