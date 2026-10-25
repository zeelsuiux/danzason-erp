import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Scissors,
  Boxes,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Send,
  Building,
  Warehouse,
  Search,
  Eye,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { ft, rawMaterialApi } from '../../services/procurementService';

export default function ProcessingMaterialTracking() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderRes, rmRes] = await Promise.all([
        ft.getOrders({ limit: 50, purchase_type: 'manufacturing' }),
        rawMaterialApi.getMaterials(),
      ]);
      setOrders(Array.isArray(orderRes.data) ? orderRes.data : []);
      setRawMaterials(Array.isArray(rmRes.data) ? rmRes.data : []);
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute live aggregates across all active manufacturing orders
  let totalIssuedKG = 0;
  let totalConsumedKG = 0;
  let totalAtContractorsKG = 0;
  let totalInTransitReturnsKG = 0;
  let totalFinishedGoodsReceived = 0;

  (rawMaterials || []).forEach((rm) => {
    totalAtContractorsKG += Number(rm.supplier_stock || 0);
    totalInTransitReturnsKG += Number(rm.in_transit_stock || 0);
  });

  (orders || []).forEach((o) => {
    (o.material_issues || []).forEach((it) => {
      totalIssuedKG += Number(it.qty || 0);
    });
    (o.production_consumptions || []).forEach((pc) => {
      totalConsumedKG += Number(pc.qty_consumed || 0);
    });
    (o.finished_goods_receipts || []).forEach((fgr) => {
      totalFinishedGoodsReceived += Number(fgr.qty_received || 0);
    });
  });

  const columns = [
    {
      header: 'Job Order (MPO)',
      key: 'po_number',
      cellClassName: 'font-mono font-bold text-amber-900 text-sm',
    },
    {
      header: 'Contractor / Karigar',
      key: 'supplier_id',
      render: (sup) => (
        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{sup?.supplier_name || 'Contractor'}</span>
        </span>
      ),
    },
    {
      header: 'Target Finished Good',
      key: 'finished_product_name',
      render: (val, row) => (
        <div className="text-xs">
          <p className="font-bold text-slate-900">
            {val || row.finished_product_id?.product_name || 'Product'}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">Target: {row.manufacturing_qty || 100} PCS</p>
        </div>
      ),
    },
    {
      header: 'Material Issued',
      key: 'material_issues',
      render: (issues, row) => {
        const sum = (issues || []).reduce((acc, it) => acc + (it.qty || 0), 0);
        return (
          <span className="font-mono text-xs font-bold text-slate-900">
            {sum > 0 ? `${sum} KG` : '0 KG'}
          </span>
        );
      },
    },
    {
      header: 'Material Consumed',
      key: 'production_consumptions',
      render: (cons) => {
        const sum = (cons || []).reduce((acc, it) => acc + (it.qty_consumed || 0), 0);
        return (
          <span className="font-mono text-xs font-bold text-rose-700">
            {sum > 0 ? `${sum} KG` : '0 KG'}
          </span>
        );
      },
    },
    {
      header: 'FG Received (Warehouse)',
      key: 'finished_goods_receipts',
      render: (fgs, row) => (
        <div className="text-xs font-mono">
          <span className="font-bold text-emerald-700">{row.received_qty || 0} PCS</span>
          <span className="text-[10px] text-slate-400 block font-sans">Inward into stock</span>
        </div>
      ),
    },
    {
      header: 'Unused Returns Tracking',
      key: 'material_returns',
      render: (rets) => {
        const count = (rets || []).length;
        const inTransit = (rets || []).filter((r) => r.status === 'in_transit').length;
        const received = (rets || []).filter((r) => r.status === 'received').length;
        return (
          <div className="text-[11px] font-mono space-y-0.5">
            {count === 0 ? (
              <span className="text-slate-400 font-sans italic">No returns yet</span>
            ) : (
              <>
                {inTransit > 0 && (
                  <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 mr-1 font-bold">
                    {inTransit} In-Transit
                  </span>
                )}
                {received > 0 && (
                  <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {received} Received
                  </span>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      header: 'Action',
      key: 'actions',
      cellClassName: 'text-right',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/purchase/orders/${row._id}`)}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition"
        >
          <span>Manage Stages</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (o.po_number || '').toLowerCase().includes(term) ||
      (o.supplier_id?.supplier_name || '').toLowerCase().includes(term) ||
      (o.finished_product_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractor Material Tracking"
        subtitle="Live control tower for company-owned raw materials issued to external job-workers, consumed in production, finished goods receipts, and return lifecycle"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/processing/orders')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-600" />
              <span>Job Orders</span>
            </button>
            <button
              onClick={() => navigate('/raw-materials')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <Layers className="w-4 h-4" />
              Raw Material Stock
            </button>
          </div>
        }
      />

      {/* 5 Real-Time Tracking Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Material Issued
          </p>
          <p className="text-xl font-black text-slate-900 mt-1 font-mono">
            {totalIssuedKG.toFixed(2)} KG
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dispatched to contractors</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Consumed In Production
          </p>
          <p className="text-xl font-black text-rose-600 mt-1 font-mono">
            {totalConsumedKG.toFixed(2)} KG
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Used in cutting/stitching</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Stock At Contractors
          </p>
          <p className="text-xl font-black text-amber-700 mt-1 font-mono">
            {totalAtContractorsKG.toFixed(2)} KG
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Company fabric at workshops</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            In-Transit Returns
          </p>
          <p className="text-xl font-black text-blue-600 mt-1 font-mono">
            {totalInTransitReturnsKG.toFixed(2)} KG
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">On vehicle to warehouse</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Finished Goods Received
          </p>
          <p className="text-xl font-black text-emerald-600 mt-1 font-mono">
            {totalFinishedGoodsReceived} PCS
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Inwarded into inventory</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by MPO, contractor, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <span className="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded border border-amber-200">
          Live Tracking: Automatic Balance Reconciliation
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredOrders}
          loading={loading}
          emptyMessage="No active job-work material tracking records found."
        />
      </div>
    </div>
  );
}
