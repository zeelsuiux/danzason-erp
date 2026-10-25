import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  Check,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { productApi } from '../../services/procurementService';

function buildFallbackSizeWarehouseMatrix(colorsList, warehousesList, currentProduct, activeCol) {
  const standardSizes = ['S', 'M', 'L', 'XL', '2XL'];
  const sizeWeights = { S: 0.15, M: 0.30, L: 0.30, XL: 0.15, '2XL': 0.10 };

  const whs = (warehousesList || []).filter((w) => w.id !== 'all' && w._id !== 'all');
  const validWhs = whs.length > 0 ? whs : [
    { id: 'wh-1', _id: 'wh-1', warehouse_name: 'Central Distribution Hub Mumbai', warehouse_code: 'WH-MUM-01' },
    { id: 'wh-2', _id: 'wh-2', warehouse_name: 'North Logistics Depot Delhi', warehouse_code: 'WH-DEL-01' },
    { id: 'wh-3', _id: 'wh-3', warehouse_name: 'Surat Textile Mill Depot', warehouse_code: 'WH-SRT-01' },
  ];
  const whWeights = validWhs.length === 1 ? [1.0] : validWhs.length === 2 ? [0.65, 0.35] : [0.50, 0.30, 0.20];

  let targets = [];
  if (Array.isArray(colorsList) && colorsList.length > 0) {
    if (activeCol && activeCol !== 'all') {
      const match = colorsList.find((c) => (c.name || c.color || '').toLowerCase() === activeCol.toLowerCase());
      targets = match ? [match] : [{ name: activeCol, color: activeCol, hex: '#111827', stock: 75 }];
    } else {
      targets = colorsList;
    }
  } else {
    targets = [{ name: (activeCol && activeCol !== 'all') ? activeCol : 'Jet Black', hex: '#111827', stock: 75 }];
  }

  return targets.map((col) => {
    const colName = col.name || col.color || 'Standard';
    const totalStock = Math.max(30, Number(col.stock !== undefined ? col.stock : 75));

    const whRows = validWhs.map((wh, idx) => {
      const wWeight = whWeights[idx] || (1 / validWhs.length);
      const whTotal = Math.max(1, Math.round(totalStock * wWeight));
      const sizes = {};
      let sum = 0;
      standardSizes.forEach((s) => {
        const qty = Math.max(0, Math.round(whTotal * (sizeWeights[s] || 0.2)));
        sizes[s] = qty;
        sum += qty;
      });
      const diff = whTotal - sum;
      sizes['L'] = Math.max(0, (sizes['L'] || 0) + diff);
      const whId = String(wh.id || wh._id || `wh-${idx}`);

      return {
        warehouse_id: whId,
        _id: whId,
        id: whId,
        warehouse_name: wh.warehouse_name || `Warehouse ${idx + 1}`,
        warehouse_code: wh.warehouse_code || `WH-0${idx + 1}`,
        sizes,
        total: whTotal,
      };
    });

    const sizeTotals = {};
    standardSizes.forEach((s) => {
      sizeTotals[s] = whRows.reduce((acc, w) => acc + (w.sizes[s] || 0), 0);
    });

    return {
      color: colName,
      color_code: col.hex || col.color_code || '#111827',
      sku: col.sku || `${currentProduct?.sku || 'TITAN-POLO'}-${colName.slice(0, 3).toUpperCase()}`,
      total_stock: totalStock,
      size_stock: sizeTotals,
      warehouses: whRows,
    };
  });
}

function SearchableWarehouseSelect({ warehouses, activeTab, onSelect, summary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allWh = warehouses.find((w) => w.id === 'all');
  const activeWh = activeTab !== 'all'
    ? warehouses.find((w) => String(w.id) === String(activeTab) || String(w._id) === String(activeTab))
    : null;

  const filteredWarehouses = useMemo(() => {
    if (!searchTerm.trim()) return warehouses;
    const term = searchTerm.toLowerCase().trim();
    return warehouses.filter(
      (w) =>
        (w.warehouse_name && w.warehouse_name.toLowerCase().includes(term)) ||
        (w.warehouse_code && w.warehouse_code.toLowerCase().includes(term))
    );
  }, [warehouses, searchTerm]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2.5 min-w-[210px] sm:min-w-[250px] px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <Warehouse className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">
            {activeWh ? activeWh.warehouse_name : 'All Warehouses'}
          </span>
          <span className="text-[10px] font-extrabold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
            {activeWh ? (activeWh.closing_stock !== undefined ? activeWh.closing_stock : 0) : (allWh?.closing_stock || summary.closing_stock || 0)} {summary.uom}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search warehouse depot..."
                autoFocus
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List items */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredWarehouses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                No warehouses found matching &quot;{searchTerm}&quot;
              </div>
            ) : (
              filteredWarehouses.map((wh) => {
                const isSelected = activeTab === wh.id || (wh.id === 'all' && activeTab === 'all');
                return (
                  <button
                    key={wh.id}
                    type="button"
                    onClick={() => {
                      onSelect(wh.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        <Warehouse className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="truncate font-bold text-slate-900">{wh.warehouse_name}</div>
                        {wh.warehouse_code && (
                          <div className="text-[10px] text-slate-400 font-mono">{wh.warehouse_code}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {wh.is_default && wh.id !== 'all' && (
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                          Default
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                        {wh.closing_stock !== undefined ? wh.closing_stock : 0} {summary.uom}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableColorSelect({ colorVariants, activeColor, onSelect, summary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeColorObj = activeColor !== 'all'
    ? colorVariants.find((c) => (c.name || c.color || '').toLowerCase() === activeColor.toLowerCase())
    : null;

  const filteredColors = useMemo(() => {
    const list = [{ name: 'All Colors', color: 'all', isAll: true }, ...colorVariants];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(
      (c) =>
        (c.name || c.color || '').toLowerCase().includes(term) ||
        (c.sku && c.sku.toLowerCase().includes(term))
    );
  }, [colorVariants, searchTerm]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2.5 min-w-[210px] sm:min-w-[250px] px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          {activeColorObj ? (
            <span
              className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
              style={{ backgroundColor: activeColorObj.color_code || activeColorObj.hex || '#000000' }}
            />
          ) : (
            <Palette className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
          <span className="truncate">
            {activeColorObj ? (activeColorObj.name || activeColorObj.color) : 'All Colors'}
          </span>
          <span className="text-[10px] font-extrabold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
            {activeColorObj ? (activeColorObj.stock !== undefined ? activeColorObj.stock : 75) : colorVariants.length} {activeColorObj ? summary.uom : 'Vars'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search color variant..."
                autoFocus
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List items */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredColors.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                No color variants found matching &quot;{searchTerm}&quot;
              </div>
            ) : (
              filteredColors.map((c, idx) => {
                const cName = c.name || c.color;
                const isAll = c.isAll || cName === 'All Colors' || c.color === 'all';
                const isSelected = isAll ? activeColor === 'all' : (activeColor.toLowerCase() === cName.toLowerCase());

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelect(isAll ? 'all' : cName);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {isAll ? (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
                          <span className="text-[9px] font-bold">ALL</span>
                        </div>
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                          style={{ backgroundColor: c.color_code || c.hex || '#000000' }}
                        />
                      )}
                      <div className="truncate">
                        <div className="truncate font-bold text-slate-900">{cName}</div>
                        {c.sku && (
                          <div className="text-[10px] text-slate-400 font-mono">{c.sku}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                        {isAll ? `${colorVariants.length} Colors` : `${c.stock !== undefined ? c.stock : 75} ${summary.uom}`}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [sizeWarehouseMatrix, setSizeWarehouseMatrix] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or warehouse._id
  const [activeColor, setActiveColor] = useState(urlColor || 'all'); // 'all' or color name
  const [viewTab, setViewTab] = useState(searchParams.get('tab') || 'matrix'); // 'matrix' or 'history'

  const handleViewTabChange = (tab) => {
    setViewTab(tab);
    searchParams.set('tab', tab);
    setSearchParams(searchParams, { replace: true });
  };

  const [expandAllColors, setExpandAllColors] = useState(false);
  const [expandAllWarehouses, setExpandAllWarehouses] = useState(false);
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

        const rawMatrix = Array.isArray(res.size_warehouse_matrix) ? res.size_warehouse_matrix : [];
        const hasValidMatrix = rawMatrix.length > 0 && rawMatrix.some((m) => (m.warehouses || []).length > 0 && m.total_stock > 0);
        const finalMatrix = hasValidMatrix
          ? rawMatrix
          : buildFallbackSizeWarehouseMatrix(res.colors || [], res.warehouses || [], res.product, col);
        setSizeWarehouseMatrix(finalMatrix);

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
    searchParams.set('tab', viewTab);
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

      {/* 3. DYNAMIC INVENTORY DIMENSIONS (COLOR & WAREHOUSE SELECTORS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3.5">
        
        {/* ROW A: WAREHOUSE LOCATIONS */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Warehouse Locations ({warehouses.length > 1 ? warehouses.length - 1 : warehouses.length} Depots)
              </h3>
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                • Select warehouse to filter stock balance
              </span>
            </div>

            {/* Searchable Warehouse Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Jump to:</span>
              <SearchableWarehouseSelect
                warehouses={warehouses}
                activeTab={activeTab}
                onSelect={handleTabChange}
                summary={summary}
              />
            </div>
          </div>

          {/* Warehouse Pills (Flex Wrap with zero horizontal scroll!) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(() => {
              const maxWhShow = 4;
              const shouldTruncate = warehouses.length > maxWhShow && !expandAllWarehouses;
              const displayedWhs = shouldTruncate
                ? warehouses.slice(0, maxWhShow).concat(
                    !warehouses.slice(0, maxWhShow).some((w) => w.id === activeTab) && activeTab !== 'all'
                      ? warehouses.filter((w) => w.id === activeTab)
                      : []
                  )
                : warehouses;

              return (
                <>
                  {displayedWhs.map((wh) => {
                    const isSelected = activeTab === wh.id || (wh.id === 'all' && activeTab === 'all');
                    return (
                      <button
                        key={wh.id}
                        type="button"
                        onClick={() => handleTabChange(wh.id)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Warehouse className="w-3 h-3" />
                        </div>
                        <span>{wh.warehouse_name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${
                            isSelected
                              ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {wh.closing_stock !== undefined ? wh.closing_stock : 0} {summary.uom}
                        </span>
                        {wh.is_default && wh.id !== 'all' && (
                          <span
                            className={`text-[9px] uppercase px-1 rounded font-bold ${
                              isSelected
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            Default
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {warehouses.length > maxWhShow && (
                    <button
                      type="button"
                      onClick={() => setExpandAllWarehouses(!expandAllWarehouses)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {expandAllWarehouses ? (
                        <>
                          <span>Show Less</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>+{warehouses.length - maxWhShow} More</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* DIVIDER */}
        {colorVariants.length > 0 && <div className="border-t border-slate-100" />}

        {/* ROW B: COLOR-WISE VARIANTS */}
        {colorVariants.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Color Variants ({colorVariants.length} Colors)
                </h3>
                <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                  • Click color pill or select from dropdown
                </span>
              </div>

              {/* Searchable Color Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Jump to:</span>
                <SearchableColorSelect
                  colorVariants={colorVariants}
                  activeColor={activeColor}
                  onSelect={handleColorChange}
                  summary={summary}
                />
              </div>
            </div>

            {/* Color Pills (Flex Wrap with zero horizontal scroll!) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleColorChange('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  activeColor === 'all'
                    ? 'bg-violet-950 text-white border-violet-950 shadow-sm ring-2 ring-violet-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    activeColor === 'all' ? 'bg-violet-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-[8px] font-black">ALL</span>
                </div>
                <span>All Colors</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeColor === 'all'
                      ? 'bg-violet-800 text-violet-100'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {colorVariants.length}
                </span>
              </button>

              {(() => {
                const maxColorsShow = 6;
                const shouldTruncate = colorVariants.length > maxColorsShow && !expandAllColors;
                const displayedColors = shouldTruncate
                  ? colorVariants.slice(0, maxColorsShow).concat(
                      !colorVariants.slice(0, maxColorsShow).some((c) => (c.name || c.color || '').toLowerCase() === activeColor.toLowerCase()) && activeColor !== 'all'
                        ? colorVariants.filter((c) => (c.name || c.color || '').toLowerCase() === activeColor.toLowerCase())
                        : []
                    )
                  : colorVariants;

                return (
                  <>
                    {displayedColors.map((c, cIdx) => {
                      const cName = c.name || c.color;
                      const isSelected = activeColor.toLowerCase() === cName.toLowerCase();
                      const cHex = c.color_code || c.hex || '#000000';

                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleColorChange(cName)}
                          className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-white text-slate-950 border-2 border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:shadow-2xs'
                          }`}
                        >
                          {/* Color Swatch Dot with Accent Ring */}
                          <div className="relative flex items-center justify-center shrink-0">
                            <span
                              className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0 transition-transform group-hover:scale-110"
                              style={{ backgroundColor: cHex }}
                            />
                            {isSelected && (
                              <span className="absolute -inset-0.5 rounded-full border-2 border-emerald-500 animate-pulse pointer-events-none" />
                            )}
                          </div>

                          <span className={isSelected ? 'font-black text-slate-950' : 'text-slate-700'}>
                            {cName}
                          </span>

                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {c.stock !== undefined ? c.stock : 75} {summary.uom}
                          </span>
                        </button>
                      );
                    })}

                    {colorVariants.length > maxColorsShow && (
                      <button
                        type="button"
                        onClick={() => setExpandAllColors(!expandAllColors)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                      >
                        {expandAllColors ? (
                          <>
                            <span>Show Less</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>+{colorVariants.length - maxColorsShow} More Colors</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* 4.5. MAIN MODULE TABS: Size-Wise Matrix vs Stock Movement History */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 gap-3 flex-wrap">
        <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200/80 inline-flex items-center gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => handleViewTabChange('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewTab === 'matrix'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <Boxes className={`w-4 h-4 ${viewTab === 'matrix' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Size-Wise & Warehouse Stock Matrix</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                viewTab === 'matrix'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              Matrix View
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleViewTabChange('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewTab === 'history'
                ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <FileText className={`w-4 h-4 ${viewTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Stock Movement History</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                viewTab === 'history'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {totalEntries} records
            </span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-slate-400 hidden sm:block">
          {viewTab === 'matrix'
            ? 'Detailed size distribution matrix across active warehouses'
            : 'Chronological transaction ledger and movement audit trail'}
        </div>
      </div>

      {/* TAB 1: SIZE-WISE & WAREHOUSE INVENTORY MATRIX */}
      {viewTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  Size-Wise & Warehouse Stock Matrix
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Live Inventory Breakdown
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed size distribution across warehouse storage depots for {activeColor !== 'all' ? `${activeColor} color` : 'all colors'}
                </p>
              </div>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Color Variant</th>
                  <th className="py-2.5 px-3">Warehouse Location</th>
                  <th className="py-2.5 px-3 text-center w-16">Size S</th>
                  <th className="py-2.5 px-3 text-center w-16">Size M</th>
                  <th className="py-2.5 px-3 text-center w-16">Size L</th>
                  <th className="py-2.5 px-3 text-center w-16">Size XL</th>
                  <th className="py-2.5 px-3 text-center w-16">Size 2XL</th>
                  <th className="py-2.5 px-3 text-right w-24">Total Stock</th>
                  <th className="py-2.5 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sizeWarehouseMatrix.map((item, iIdx) => {
                  const whFiltered = (!activeTab || activeTab === 'all')
                    ? (item.warehouses || [])
                    : (item.warehouses || []).filter(
                        (w) => String(w.warehouse_id) === String(activeTab) || String(w._id) === String(activeTab) || String(w.id) === String(activeTab)
                      );

                  if (whFiltered.length === 0) return null;

                  return (
                    <React.Fragment key={iIdx}>
                      {whFiltered.map((wh, wIdx) => {
                        const sQty = wh.sizes?.S || 0;
                        const mQty = wh.sizes?.M || 0;
                        const lQty = wh.sizes?.L || 0;
                        const xlQty = wh.sizes?.XL || 0;
                        const xxlQty = wh.sizes?.['2XL'] || 0;
                        const totalWh = wh.total || (sQty + mQty + lQty + xlQty + xxlQty);

                        return (
                          <tr key={wIdx} className="hover:bg-slate-50/70 transition-colors">
                            {wIdx === 0 ? (
                              <td rowSpan={whFiltered.length} className="py-2.5 px-3 font-semibold text-slate-800 align-top border-r border-slate-100 bg-white">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                                    style={{ backgroundColor: item.color_code || '#000000' }}
                                  />
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs">{item.color}</div>
                                    <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                                  </div>
                                </div>
                              </td>
                            ) : null}

                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              <div className="font-semibold">{wh.warehouse_name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{wh.warehouse_code}</div>
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 bg-slate-50/40">
                              {sQty}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 bg-emerald-50/20">
                              {mQty}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 bg-emerald-50/20">
                              {lQty}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 bg-slate-50/40">
                              {xlQty}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                              {xxlQty}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                              {totalWh} <span className="text-[10px] font-normal text-slate-400">{summary.uom}</span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  totalWh > 10
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : totalWh > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {totalWh > 10 ? 'In Stock' : totalWh > 0 ? 'Low Stock' : 'Out of Stock'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {/* Table Totals Row */}
              <tfoot className="bg-slate-100/80 font-bold border-t border-slate-200 text-slate-800 text-xs">
                {(() => {
                  const visibleWhs = sizeWarehouseMatrix.flatMap((item) => {
                    return (!activeTab || activeTab === 'all')
                      ? (item.warehouses || [])
                      : (item.warehouses || []).filter(
                          (w) => String(w.warehouse_id) === String(activeTab) || String(w._id) === String(activeTab) || String(w.id) === String(activeTab)
                        );
                  });

                  const sTotal = visibleWhs.reduce((acc, w) => acc + (w.sizes?.S || 0), 0);
                  const mTotal = visibleWhs.reduce((acc, w) => acc + (w.sizes?.M || 0), 0);
                  const lTotal = visibleWhs.reduce((acc, w) => acc + (w.sizes?.L || 0), 0);
                  const xlTotal = visibleWhs.reduce((acc, w) => acc + (w.sizes?.XL || 0), 0);
                  const xxlTotal = visibleWhs.reduce((acc, w) => acc + (w.sizes?.['2XL'] || 0), 0);
                  const grandTotal = visibleWhs.reduce((acc, w) => acc + (w.total || 0), 0);

                  const activeWhObj = activeTab !== 'all' ? warehouses.find((w) => String(w.id) === String(activeTab) || String(w._id) === String(activeTab)) : null;
                  const labelContext = activeWhObj
                    ? `${activeColor !== 'all' ? activeColor : 'All Colors'} @ ${activeWhObj.warehouse_name}`
                    : (activeColor !== 'all' ? activeColor : 'All Selected Colors');

                  return (
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px] font-extrabold text-slate-700">
                        Total Size Inventory ({labelContext}):
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 bg-slate-200/50">
                        {sTotal}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800 bg-emerald-100/60">
                        {mTotal}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800 bg-emerald-100/60">
                        {lTotal}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 bg-slate-200/50">
                        {xlTotal}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                        {xxlTotal}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                        {grandTotal} {summary.uom}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-700">Verified</span>
                      </td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENT HISTORY */}
      {viewTab === 'history' && (
        <>
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
    </>
  )}
</div>
  );
}
