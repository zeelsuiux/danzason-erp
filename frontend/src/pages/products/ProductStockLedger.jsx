import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Warehouse,
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Building2,
  RefreshCw,
  Tag,
  Boxes,
  Palette,
  Check
} from 'lucide-react';
import { productApi } from '../../services/procurementService';

export default function ProductStockLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlColor = searchParams.get('color');

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [colorVariants, setColorVariants] = useState([]);
  const [activeVariant, setActiveVariant] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or warehouse._id
  const [activeColor, setActiveColor] = useState(urlColor || 'all'); // 'all' or color name
  const [summary, setSummary] = useState({
    opening_stock: 0,
    total_in: 0,
    total_out: 0,
    closing_stock: 0,
    uom: 'PCS',
  });
  const [entries, setEntries] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Sync state if URL param changes
  useEffect(() => {
    const c = searchParams.get('color');
    if (c) {
      setActiveColor(c);
    }
  }, [searchParams]);

  useEffect(() => {
    if (id) {
      loadLedgerData(activeTab, activeColor);
    }
  }, [id, activeTab, activeColor, typeFilter, startDate, endDate]);

  const loadLedgerData = async (whId = activeTab, col = activeColor) => {
    try {
      setLoading(true);
      const params = {
        warehouse_id: whId === 'all' ? undefined : whId,
        color: col !== 'all' ? col : undefined,
        sku: searchParams.get('sku') || undefined,
        transaction_type: typeFilter !== 'all' ? typeFilter : undefined,
        search: search.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      const res = await productApi.getProductLedger(id, params);
      if (res && res.success) {
        setProduct(res.product);
        setWarehouses(res.warehouses || []);
        setColorVariants(res.colors || []);
        setActiveVariant(res.active_variant || null);
        setSummary(res.summary || {
          opening_stock: 0,
          total_in: 0,
          total_out: 0,
          closing_stock: 0,
          uom: res.product?.uom || 'PCS',
        });
        setEntries(res.entries || []);

        if (res.product?._id && res.product._id !== id) {
          const cQuery = col !== 'all'
            ? `?color=${encodeURIComponent(col)}&sku=${encodeURIComponent(res.active_variant?.sku || searchParams.get('sku') || '')}`
            : '';
          navigate(`/products/${res.product._id}/ledger${cQuery}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('Failed to load product stock ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLedgerData(activeTab, activeColor);
  };

  const handleTabChange = (whId) => {
    setActiveTab(whId);
    setCurrentPage(1);
  };

  const handleColorChange = (colorName) => {
    setActiveColor(colorName);
    setCurrentPage(1);
    if (colorName === 'all') {
      searchParams.delete('color');
      searchParams.delete('sku');
      setSearchParams(searchParams, { replace: true });
    } else {
      const match = colorVariants.find(
        (c) => c.name?.toLowerCase() === colorName.toLowerCase() || c.color?.toLowerCase() === colorName.toLowerCase()
      );
      searchParams.set('color', colorName);
      if (match?.sku) {
        searchParams.set('sku', match.sku);
      }
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setActiveTab('all');
    setActiveColor('all');
    searchParams.delete('color');
    searchParams.delete('sku');
    setSearchParams(searchParams, { replace: true });
    loadLedgerData('all', 'all');
  };

  // Client-side text search fallback
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const term = search.toLowerCase().trim();
    return entries.filter(
      (e) =>
        (e.reference_number && e.reference_number.toLowerCase().includes(term)) ||
        (e.party_name && e.party_name.toLowerCase().includes(term)) ||
        (e.remarks && e.remarks.toLowerCase().includes(term)) ||
        (e.transaction_type && e.transaction_type.toLowerCase().includes(term)) ||
        (e.warehouse_name && e.warehouse_name.toLowerCase().includes(term)) ||
        (e.color && e.color.toLowerCase().includes(term))
    );
  }, [entries, search]);

  // Pagination calculation
  const totalEntries = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredEntries.length) return;
    const headers = [
      'Sr. No.',
      'Date',
      'Transaction Type',
      'Reference No.',
      'Color Variant',
      'Supplier / Customer',
      'Warehouse',
      'Stock In (+)',
      'Stock Out (-)',
      'Balance Stock',
      'Rate (INR)',
      'Remarks',
    ];

    const rows = filteredEntries.map((row, idx) => [
      idx + 1,
      new Date(row.date).toLocaleDateString('en-IN'),
      row.transaction_type,
      `"${row.reference_number || '-'}"`,
      `"${row.color || activeColor || '-'}"`,
      `"${row.party_name || '-'}"`,
      `"${row.warehouse_name || '-'}"`,
      row.in_qty || 0,
      row.out_qty || 0,
      row.balance || 0,
      row.rate || 0,
      `"${(row.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Stock_Ledger_${product?.sku || 'Product'}_${activeColor}_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeWarehouseObj = warehouses.find((w) => w.id === activeTab || w._id === activeTab);
  const activeColorObj = colorVariants.find(
    (c) => c.name?.toLowerCase() === activeColor.toLowerCase() || c.color?.toLowerCase() === activeColor.toLowerCase()
  );

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="Back to Product & Inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                Product Stock Ledger
              </span>
              <span className="text-xs text-slate-400 font-medium">|</span>
              <span className="text-xs font-medium text-slate-500">
                Color-wise & Warehouse Movement Audit
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{product?.title || product?.product_name || 'Loading Product Ledger...'}</span>
              {activeColor !== 'all' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white"
                    style={{ backgroundColor: activeColorObj?.color_code || activeColorObj?.hex || '#000000' }}
                  />
                  <span>{activeColor} Variant</span>
                </span>
              )}
              {product?.category && (
                <span className="text-xs font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  {product.category}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => loadLedgerData(activeTab, activeColor)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-emerald-700 transition-colors shadow-xs"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Product Details & Stock Summary Card */}
      {product && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Product Meta */}
            <div className="lg:col-span-5 flex items-start gap-3.5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-5">
              <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-2xs relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=120&auto=format&fit=crop&q=60';
                    }}
                  />
                ) : (
                  <Package className="w-7 h-7 text-emerald-600" />
                )}
                {activeColor !== 'all' && activeColorObj && (
                  <span
                    className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"
                    style={{ backgroundColor: activeColorObj.color_code || activeColorObj.hex }}
                    title={activeColor}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-slate-900 text-sm uppercase tracking-tight truncate">
                  {product.title || product.product_name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    SKU: {activeColorObj?.sku || product.sku || product.product_code || '-'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    UOM: <strong className="text-slate-800">{product.uom || 'PCS'}</strong>
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Base Rate: <strong className="text-slate-800">₹{product.price || 0}</strong>
                  </span>
                </div>
                {activeColor !== 'all' ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Color Filter Active: {activeColor} ({activeColorObj?.stock ?? summary.closing_stock} {summary.uom})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleColorChange('all')}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-700 underline"
                    >
                      Clear Color
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">
                    Showing consolidated inventory across all {colorVariants.length} color variants
                  </p>
                )}
              </div>
            </div>

            {/* Live Stock Summary Cards for Active Selection */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Opening Stock
                </p>
                <p className="text-lg font-extrabold text-slate-800 mt-0.5">
                  {summary.opening_stock} <span className="text-xs font-normal text-slate-400">{summary.uom}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Initial Balance</p>
              </div>

              <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/80">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Stock In (+)</span>
                </p>
                <p className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  +{summary.total_in} <span className="text-xs font-normal text-emerald-600/70">{summary.uom}</span>
                </p>
                <p className="text-[10px] text-emerald-600/70 mt-0.5">Purchase / Returns</p>
              </div>

              <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-200/80">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Stock Out (-)</span>
                </p>
                <p className="text-lg font-extrabold text-rose-700 mt-0.5">
                  -{summary.total_out} <span className="text-xs font-normal text-rose-600/70">{summary.uom}</span>
                </p>
                <p className="text-[10px] text-rose-600/70 mt-0.5">Sales / Dispatch</p>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-3 border border-slate-900 shadow-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Closing Balance</span>
                </p>
                <p className="text-lg font-extrabold text-white mt-0.5">
                  {summary.closing_stock} <span className="text-xs font-normal text-slate-300">{summary.uom}</span>
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold mt-0.5 truncate">
                  {activeColor !== 'all' ? `${activeColor}` : 'All Colors'} • {activeTab === 'all' ? 'All WH' : activeWarehouseObj?.warehouse_code || 'Warehouse'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC COLOR-WISE VARIANTS TABS */}
      {colorVariants.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-2 pt-1">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Color-wise Selection ({colorVariants.length} Colors)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Click any color to view its specific stock ledger & movements
            </span>
          </div>

          {/* Color Pills Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => handleColorChange('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                activeColor === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>All Colors</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeColor === 'all' ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {colorVariants.length}
              </span>
            </button>

            {colorVariants.map((c, cIdx) => {
              const cName = c.name || c.color;
              const isSelected = activeColor.toLowerCase() === cName.toLowerCase();
              return (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => handleColorChange(cName)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs shrink-0"
                    style={{ backgroundColor: c.color_code || c.hex || '#000000' }}
                  />
                  <span>{cName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      isSelected
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {c.stock !== undefined ? c.stock : 75} {summary.uom}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. DYNAMIC WAREHOUSE TABS — STRICTLY INSIDE PRODUCT LEDGER PAGE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-2 pt-1">
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Warehouse Locations (Dynamic Master)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Click any warehouse tab to filter ledger & recalculate running balance
          </span>
        </div>

        {/* Tab Buttons Row: All | Warehouse A | Warehouse B | ... */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {warehouses.map((wh) => {
            const isSelected = activeTab === wh.id || (wh.id === 'all' && activeTab === 'all');
            return (
              <button
                key={wh.id}
                type="button"
                onClick={() => handleTabChange(wh.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{wh.warehouse_name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isSelected
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {wh.closing_stock !== undefined ? wh.closing_stock : 0} {summary.uom}
                </span>
                {wh.is_default && wh.id !== 'all' && (
                  <span
                    className={`text-[9px] uppercase px-1 rounded ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    Default
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Filters, Search and Actions Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Reference Number, Color, Supplier/Customer, Remarks..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Transaction Type Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:bg-white focus:border-emerald-500"
            >
              <option value="all">All Movements</option>
              <option value="opening">Opening Stock</option>
              <option value="purchase">Purchase (Inward)</option>
              <option value="purchase_return">Purchase Return (Outward)</option>
              <option value="sales">Sales (Outward)</option>
              <option value="sales_return">Sales Return (Inward)</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-hidden"
                title="Start Date"
              />
              <span className="text-slate-300 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-hidden"
                title="End Date"
              />
            </div>

            {(search || typeFilter !== 'all' || startDate || endDate || activeTab !== 'all' || activeColor !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 6. Enterprise Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Stock Movement History
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({totalEntries} records found)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeColor !== 'all' && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Color: <strong>{activeColor}</strong>
              </span>
            )}
            <span className="text-[11px] font-medium text-slate-500">
              Warehouse: <strong className="text-slate-800">{activeWarehouseObj?.warehouse_name || 'All Warehouses'}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4">Reference No.</th>
                <th className="py-3 px-3">Color Variant</th>
                <th className="py-3 px-4">Supplier / Customer</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-3 text-right text-emerald-700 font-extrabold">Stock In (+)</th>
                <th className="py-3 px-3 text-right text-rose-700 font-extrabold">Stock Out (-)</th>
                <th className="py-3 px-3 text-right text-slate-900 font-extrabold">Balance Stock</th>
                <th className="py-3 px-3 text-right">Rate</th>
                <th className="py-3 px-4">Remarks / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <RefreshCw className="w-7 h-7 animate-spin text-emerald-600 mb-2" />
                      <p className="text-xs font-bold text-slate-700">Loading stock movements...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-10 h-10 stroke-[1.2] text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-700">No stock movements found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {activeColor !== 'all'
                          ? `No transactions recorded for color variant "${activeColor}" in ${activeWarehouseObj?.warehouse_name || 'selected warehouse'}.`
                          : 'Try adjusting your filters or date range.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                  const isIn = Number(row.in_qty || 0) > 0;
                  const isOut = Number(row.out_qty || 0) > 0;

                  // Badge styles by movement type
                  let typeBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (row.type_key === 'purchase' || row.type_key === 'sales_return') {
                    typeBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
                  } else if (row.type_key === 'sales' || row.type_key === 'purchase_return') {
                    typeBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200/80';
                  } else if (row.type_key === 'opening') {
                    typeBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200/80';
                  }

                  const rowColorObj = colorVariants.find(
                    (c) => (c.name && row.color && c.name.toLowerCase() === row.color.toLowerCase()) ||
                           (c.color && row.color && c.color.toLowerCase() === row.color.toLowerCase())
                  );

                  return (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-slate-50/70 transition-colors text-xs"
                    >
                      {/* Sr. No. */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {globalIdx}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {new Date(row.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {new Date(row.date).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>

                      {/* Movement Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${typeBadgeClass}`}
                        >
                          {row.transaction_type}
                        </span>
                      </td>

                      {/* Reference Number */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {row.reference_number || '-'}
                        </span>
                      </td>

                      {/* Color Variant */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {row.color ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-slate-300"
                              style={{ backgroundColor: rowColorObj?.color_code || rowColorObj?.hex || '#111827' }}
                            />
                            <span>{row.color}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Supplier / Customer */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 truncate max-w-[180px]">
                          {row.party_name || '-'}
                        </p>
                        {row.party_type && (
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {row.party_type}
                          </span>
                        )}
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {row.warehouse_name || '-'}
                          </span>
                        </div>
                        {row.warehouse_code && (
                          <span className="text-[10px] font-mono text-slate-400 ml-5">
                            [{row.warehouse_code}]
                          </span>
                        )}
                      </td>

                      {/* In Qty */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-emerald-600 text-xs">
                        {isIn ? `+${row.in_qty}` : '-'}
                      </td>

                      {/* Out Qty */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-rose-600 text-xs">
                        {isOut ? `-${row.out_qty}` : '-'}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded font-extrabold text-slate-900 bg-slate-100 border border-slate-200">
                          {row.balance !== undefined ? row.balance : '-'} {summary.uom}
                        </span>
                      </td>

                      {/* Rate */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-semibold text-slate-700">
                        {row.rate ? `₹${Number(row.rate).toFixed(2)}` : '-'}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4 max-w-[240px]">
                        <p className="text-slate-600 truncate text-[11px]" title={row.remarks}>
                          {row.remarks || '-'}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 7. Pagination Footer */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <span>
            Showing {paginatedEntries.length} of {totalEntries} transaction entries
            {activeColor !== 'all' && ` (Filtered by color: ${activeColor})`}
            {activeTab !== 'all' && ` (Warehouse: ${activeWarehouseObj?.warehouse_name})`}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
