import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Building2,
  Boxes,
  Truck,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatsCard from '../../components/common/StatsCard';
import { rawMaterialApi } from '../../services/procurementService';

export default function RawMaterialStockLedger() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState({
    warehouse_stock: 0,
    supplier_stock: 0,
    in_transit_stock: 0,
    total_company_balance: 0,
    total_consumed: 0,
    uom: 'KG',
    warehouse_balances: [],
    supplier_balances: [],
  });
  const [entries, setEntries] = useState([]);

  // Active filters
  const [activeTab, setActiveTab] = useState('all'); // 'all' or warehouse._id
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  useEffect(() => {
    if (id) {
      loadLedgerData();
    }
  }, [id, activeTab, selectedSupplier, typeFilter, startDate, endDate]);

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      const params = {
        warehouse_id: activeTab !== 'all' ? activeTab : undefined,
        supplier_id: selectedSupplier !== 'all' ? selectedSupplier : undefined,
        transaction_type: typeFilter !== 'all' ? typeFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search.trim() || undefined,
      };

      const res = await rawMaterialApi.getRawMaterialLedger(id, params);
      if (res && res.success) {
        setMaterial(res.raw_material);
        setWarehouses(res.warehouses || []);
        setSummary(res.summary || {});
        setEntries(res.entries || []);
      }
    } catch (err) {
      console.error('Failed to load raw material ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLedgerData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveTab('all');
    setSelectedSupplier('all');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setTimeout(() => loadLedgerData(), 50);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!entries.length) return;
    const headers = [
      'Date',
      'Transaction #',
      'Type',
      'Reference #',
      'Supplier / Party',
      'PO #',
      'Source',
      'Destination',
      'Qty In',
      'Qty Out',
      'UOM',
      'Warehouse Bal',
      'Supplier Bal',
      'In-Transit Bal',
      'Total Company Bal',
      'Return Status',
      'Remarks',
    ];
    const rows = entries.map((e) => [
      new Date(e.date).toLocaleString('en-IN'),
      e.transaction_number,
      e.transaction_type,
      `"${e.reference_no || ''}"`,
      `"${e.supplier_name || ''}"`,
      e.po_number || '',
      `"${e.source_location || ''}"`,
      `"${e.destination_location || ''}"`,
      e.qty_in || 0,
      e.qty_out || 0,
      e.uom || 'KG',
      e.warehouse_balance || 0,
      e.supplier_balance || 0,
      e.in_transit_balance || 0,
      e.total_company_balance || 0,
      e.return_status || 'none',
      `"${(e.remarks || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${material?.material_code || 'raw_material'}_ledger_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination slice
  const totalPages = Math.ceil(entries.length / rowsPerPage);
  const paginatedEntries = entries.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header with Back button */}
      <PageHeader
        title={
          material
            ? `${material.material_name} (${material.material_code})`
            : 'Raw Material Stock Ledger'
        }
        subtitle="Complete auditable stock ledger: Track inventory movements between Warehouses, Manufacturing Job-Workers, and In-Transit Returns."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Raw Materials', href: '/raw-materials' },
          { label: material?.material_code || 'Ledger' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/raw-materials')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Catalog</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Ledger</span>
            </button>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatsCard
          title="Warehouse Stock"
          value={`${(summary.warehouse_stock || 0).toLocaleString('en-IN')} ${summary.uom || 'KG'}`}
          subtitle="Immediately Available"
          icon={Boxes}
          color="emerald"
        />
        <StatsCard
          title="Supplier-Held Stock"
          value={`${(summary.supplier_stock || 0).toLocaleString('en-IN')} ${summary.uom || 'KG'}`}
          subtitle="With Manufacturing Suppliers"
          icon={Building2}
          color="amber"
        />
        <StatsCard
          title="In-Transit Stock"
          value={`${(summary.in_transit_stock || 0).toLocaleString('en-IN')} ${summary.uom || 'KG'}`}
          subtitle="Dispatched from Suppliers"
          icon={Truck}
          color="blue"
        />
        <StatsCard
          title="Total Consumed"
          value={`${(summary.total_consumed || 0).toLocaleString('en-IN')} ${summary.uom || 'KG'}`}
          subtitle="Production Consumed"
          icon={Clock}
          color="slate"
        />
        <StatsCard
          title="Total Company Stock"
          value={`${(summary.total_company_balance || 0).toLocaleString('en-IN')} ${summary.uom || 'KG'}`}
          subtitle="Total Company-Owned"
          icon={ShieldCheck}
          color="purple"
        />
      </div>

      {/* WAREHOUSE TABS (Prompt Section 7: All Warehouses | Warehouse 1 | Warehouse 2 ...) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-emerald-600" />
            <span>Warehouse Filter Tabs</span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Click a warehouse to isolate physical warehouse movements
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Warehouses</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {(summary.warehouse_stock || 0).toLocaleString('en-IN')} {summary.uom}
            </span>
          </button>

          {(summary.warehouse_balances || []).map((wb) => {
            const whId = (wb.warehouse_id?._id || wb.warehouse_id || '').toString();
            const isSelected = activeTab === whId;
            return (
              <button
                key={whId || wb.warehouse_name}
                type="button"
                onClick={() => {
                  setActiveTab(whId);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{wb.warehouse_name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {(wb.current_stock || 0).toLocaleString('en-IN')} {summary.uom}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUPPLIER-HELD MATERIAL SUMMARY (Prompt Section 8: Supplier-wise Material Ledger) */}
      {(summary.supplier_balances || []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Supplier-Wise Material Balances</span>
            </span>
            <span className="text-slate-500 text-[11px]">
              Material owned by company held at external job-work facilities
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.supplier_balances.map((sb) => {
              const supId = (sb.supplier_id?._id || sb.supplier_id || '').toString();
              return (
                <div
                  key={supId || sb.supplier_name}
                  onClick={() => setSelectedSupplier(supId)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedSupplier === supId
                      ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/60'
                  }`}
                >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{sb.supplier_name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">{sb.supplier_code}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    {sb.current_stock} {summary.uom} Held
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 font-sans block text-[10px]">Consumed:</span>
                    <span className="font-semibold text-slate-700">{sb.consumed_stock} {summary.uom}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block text-[10px]">Pending Return:</span>
                    <span className="font-semibold text-amber-600">{sb.current_stock} {summary.uom}</span>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search transaction #, reference, PO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 font-medium text-slate-800"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Transaction Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Transaction Types</option>
              <option value="Opening Stock">Opening Stock</option>
              <option value="Purchase Inward">Purchase Inward</option>
              <option value="Purchase Return">Purchase Return</option>
              <option value="Manufacturing Issue">Manufacturing Issue</option>
              <option value="Production Consumption">Production Consumption</option>
              <option value="Material Return Dispatched">Material Return Dispatched</option>
              <option value="Material Return Received">Material Return Received</option>
            </select>

            {/* Supplier Filter */}
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Suppliers</option>
              {(summary.supplier_balances || []).map((sb) => (
                <option key={sb.supplier_id} value={sb.supplier_id.toString()}>
                  {sb.supplier_name}
                </option>
              ))}
            </select>

            {/* Date Pickers */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-[11px] outline-none"
              title="Start Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-[11px] outline-none"
              title="End Date"
            />

            <button
              type="button"
              onClick={handleResetFilters}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition"
              title="Reset Filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* AUDITABLE LEDGER TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1050px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Txn #</th>
                <th className="p-3">Transaction Type</th>
                <th className="p-3">Reference / PO</th>
                <th className="p-3">Party / Supplier</th>
                <th className="p-3">Source &rarr; Destination</th>
                <th className="p-3 text-right">In (+)</th>
                <th className="p-3 text-right">Out (-)</th>
                <th className="p-3 text-right bg-emerald-50/50">Wh Bal</th>
                <th className="p-3 text-right bg-amber-50/50">Supp Bal</th>
                <th className="p-3 text-right bg-blue-50/50">Transit</th>
                <th className="p-3 text-right bg-purple-50/50 font-bold">Total Stock</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading transaction ledger...
                  </td>
                </tr>
              ) : paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    No transactions recorded matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((e) => {
                  const isIn = Number(e.qty_in || 0) > 0;
                  const isOut = Number(e.qty_out || 0) > 0;

                  // Type badge colors
                  let typeBg = 'bg-slate-100 text-slate-700';
                  if (e.transaction_type === 'Opening Stock') typeBg = 'bg-slate-100 text-slate-700 font-bold';
                  if (e.transaction_type === 'Purchase Inward') typeBg = 'bg-emerald-100 text-emerald-800 font-bold';
                  if (e.transaction_type === 'Manufacturing Issue') typeBg = 'bg-amber-100 text-amber-800 font-bold';
                  if (e.transaction_type === 'Production Consumption') typeBg = 'bg-rose-100 text-rose-800 font-bold';
                  if (e.transaction_type === 'Material Return Dispatched') typeBg = 'bg-blue-100 text-blue-800 font-bold';
                  if (e.transaction_type === 'Material Return Received') typeBg = 'bg-purple-100 text-purple-800 font-bold';

                  return (
                    <tr key={e._id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {new Date(e.date).toLocaleDateString('en-IN')}{' '}
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(e.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900 text-xs">
                        {e.transaction_number}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${typeBg}`}>
                          {e.transaction_type}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="font-mono font-semibold text-slate-800">{e.reference_no || '—'}</div>
                        {e.po_number && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded block mt-0.5">
                            PO: {e.po_number}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-800">{e.supplier_name || '—'}</div>
                      </td>

                      <td className="p-3 text-[11px]">
                        <span className="text-slate-600">{e.source_location || '—'}</span>
                        <span className="text-slate-400 mx-1">&rarr;</span>
                        <span className="font-semibold text-slate-800">{e.destination_location || '—'}</span>
                      </td>

                      {/* In Qty */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {isIn ? `+${e.qty_in} ${e.uom}` : '—'}
                      </td>

                      {/* Out Qty */}
                      <td className="p-3 text-right font-mono font-bold text-rose-600">
                        {isOut ? `-${e.qty_out} ${e.uom}` : '—'}
                      </td>

                      {/* Warehouse Running Bal */}
                      <td className="p-3 text-right font-mono font-semibold text-emerald-800 bg-emerald-50/30">
                        {e.warehouse_balance}
                      </td>

                      {/* Supplier Running Bal */}
                      <td className="p-3 text-right font-mono font-semibold text-amber-800 bg-amber-50/30">
                        {e.supplier_balance}
                      </td>

                      {/* In-Transit Bal */}
                      <td className="p-3 text-right font-mono font-semibold text-blue-800 bg-blue-50/30">
                        {e.in_transit_balance || 0}
                      </td>

                      {/* Total Company Running Bal */}
                      <td className="p-3 text-right font-mono font-black text-purple-900 bg-purple-50/40">
                        {e.total_company_balance}
                      </td>

                      <td className="p-3 text-center">
                        {e.return_status && e.return_status !== 'none' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {e.return_status}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Recorded</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(currentPage * rowsPerPage, entries.length)} of {entries.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-mono font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
