import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Tag,
  Key,
  Layers,
  Boxes,
  RefreshCw,
  Copy,
  Check,
  Filter,
  DollarSign,
  Info,
  Star,
  Sparkles,
  Palette,
  Grid,
  List,
  ChevronDown,
  ChevronRight,
  Lock,
  FileText,
  Warehouse,
  Calculator,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { productApi, ft } from '../../services/procurementService';

export default function ProductsList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('color'); // 'color' (Color-wise) or 'style' (Grouped)
  const [expandedRows, setExpandedRows] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isColorsModalOpen, setIsColorsModalOpen] = useState(false);
  const [isApiInfoModalOpen, setIsApiInfoModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Requirement 7: Sales Rate Auto-Management Modal
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingProduct, setPricingProduct] = useState(null);
  const [pricingRule, setPricingRule] = useState({ method: 'markup', value: 20 });
  const [manualOverrideRate, setManualOverrideRate] = useState('');
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingLiveCost, setPricingLiveCost] = useState(150);

  const handleOpenPricingModal = async (prod, e) => {
    if (e) e.stopPropagation();
    setPricingProduct(prod);
    setManualOverrideRate('');
    const pId = prod.product_id || prod._id || prod.id;
    try {
      const res = await fetch(`/api/v1/products/${pId}/pricing`);
      const resData = await res.json();
      if (resData.success && resData.data) {
        setPricingLiveCost(resData.data.current_purchase_rate || prod.purchase_rate || 150);
        setPricingRule({
          method: resData.data.pricing_rule?.method || 'markup',
          value: resData.data.pricing_rule?.value !== undefined ? resData.data.pricing_rule.value : 20,
        });
      } else {
        setPricingLiveCost(prod.purchase_rate || 150);
        setPricingRule(prod.pricing_rule || { method: 'markup', value: 20 });
      }
    } catch (err) {
      setPricingLiveCost(prod.purchase_rate || 150);
      setPricingRule(prod.pricing_rule || { method: 'markup', value: 20 });
    }
    setIsPricingModalOpen(true);
  };

  const handleSavePricingRule = async (applyToSelling = false) => {
    if (!pricingProduct) return;
    const pId = pricingProduct.product_id || pricingProduct._id || pricingProduct.id;
    try {
      setPricingSaving(true);
      const res = await fetch(`/api/v1/products/${pId}/pricing-rule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: pricingRule.method,
          value: Number(pricingRule.value) || 0,
          apply_to_selling_rate: applyToSelling,
          manual_override_rate: manualOverrideRate ? Number(manualOverrideRate) : null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(
          applyToSelling
            ? 'Selling rate updated for future orders. Previously issued historical invoices remain unchanged.'
            : 'Pricing rule saved successfully.'
        );
        setIsPricingModalOpen(false);
        loadProducts();
      } else {
        alert(result.message || 'Failed to update pricing rule');
      }
    } catch (err) {
      alert(err.message || 'Failed to update pricing rule');
    } finally {
      setPricingSaving(false);
    }
  };

  const toggleRowExpansion = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const commonColors = [
    { name: 'Black', hex: '#111827' },
    { name: 'Jet Black', hex: '#111827' },
    { name: 'Navy Blue', hex: '#1e3a8a' },
    { name: 'Arctic White', hex: '#f8fafc' },
    { name: 'Deep Maroon', hex: '#831843' },
    { name: 'Olive Green', hex: '#3f6212' },
    { name: 'Melange Grey', hex: '#9ca3af' },
    { name: 'Charcoal Anthracite', hex: '#374151' },
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Crimson Red', hex: '#dc2626' },
    { name: 'Sand Beige', hex: '#d4b996' },
    { name: 'Sky Blue', hex: '#0ea5e9' },
    { name: 'Wine Burgundy', hex: '#701a75' },
    { name: 'Military Olive', hex: '#365314' },
    { name: 'Dark Slate', hex: '#334155' },
    { name: 'Cobalt Blue', hex: '#1d4ed8' },
    { name: 'Rust Orange', hex: '#c2410c' },
    { name: 'Mustard Yellow', hex: '#ca8a04' },
    { name: 'Lavender Dusk', hex: '#a855f7' },
    { name: 'Classic Black', hex: '#000000' },
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Bottle Green', hex: '#064e3b' },
    { name: 'Coral Peach', hex: '#fb923c' },
  ];

  const standardSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Free Size'];

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts(pagination.page);
  }, [pagination.page, search, categoryFilter, typeFilter, colorFilter, sizeFilter, statusFilter, viewMode]);

  const loadCategories = async () => {
    try {
      const res = await ft.getCategories();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setCategories(res.data);
      } else {
        setCategories([
          { name: 'T-SHIRT' },
          { name: 'TRACKPANT' },
          { name: 'TRACKSUIT' },
          { name: 'CAP' },
          { name: 'CO-ORD SET' },
          { name: 'SHIRTS' },
          { name: 'HOODIES' },
        ]);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategories([
        { name: 'T-SHIRT' },
        { name: 'TRACKPANT' },
        { name: 'TRACKSUIT' },
        { name: 'CAP' },
        { name: 'CO-ORD SET' },
        { name: 'SHIRTS' },
        { name: 'HOODIES' },
      ]);
    }
  };

  const loadProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: viewMode === 'color' ? 15 : 10,
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        types: typeFilter || undefined,
        color: colorFilter || undefined,
        size: sizeFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        view: viewMode,
      };

      const res = await productApi.getProducts(params);
      const list = res.data || res.products || [];
      setProducts(Array.isArray(list) ? list : []);

      if (res.pagination) {
        setPagination({
          page: res.pagination.page,
          limit: res.pagination.limit,
          total: res.pagination.total,
          totalPages: res.pagination.pages,
        });
      } else if (res.total !== undefined) {
        const lim = viewMode === 'color' ? 15 : 10;
        setPagination((prev) => ({
          ...prev,
          page,
          limit: lim,
          total: res.total,
          totalPages: Math.ceil(res.total / lim),
        }));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (prod, e) => {
    if (e) e.stopPropagation();
    setSelectedProduct(prod);
    setIsDetailModalOpen(true);
  };

  const handleOpenColors = (prod, e) => {
    if (e) e.stopPropagation();
    setSelectedProduct(prod);
    setIsColorsModalOpen(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header matching ERP Portal screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Product & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Manage apparel products, suggested sales rates, color/size variants, and warehouse stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (products.length > 0) {
                handleOpenPricingModal(products[0]);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-xs"
            title="Sales Rate Auto-Management from Purchase Rate"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-700" />
            <span>Rate Management</span>
          </button>
          {/* View Mode Toggle: Grouped Styles vs Color-wise */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setViewMode('style');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'style'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Style View</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('color');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'color'
                  ? 'bg-[#10b981] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color-wise View</span>
            </button>
          </div>

          <button
            onClick={() => setIsApiInfoModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <Key className="w-3.5 h-3.5 text-emerald-600" />
            <span>CRM API</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>API Read-Only</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar matching screenshot */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search input with search icon */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              viewMode === 'color'
                ? 'Search by Title, Color, SKU, Description...'
                : 'Search by Title, SKU, Description...'
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden border-0 bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
          {/* Categories dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">All Categories</option>
            {categories.map((c) => {
              const name = c.name || c;
              return (
                <option key={name} value={name}>
                  {name}
                </option>
              );
            })}
          </select>

          {/* Color Filter */}
          <select
            value={colorFilter}
            onChange={(e) => {
              setColorFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">All Colors</option>
            {commonColors.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>

          {/* Size Filter Dropdown */}
          <select
            value={sizeFilter}
            onChange={(e) => {
              setSizeFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-hidden transition ${
              sizeFilter
                ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 font-bold'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <option value="">All Sizes</option>
            {standardSizes.map((sz) => (
              <option key={sz} value={sz}>
                Size {sz}
              </option>
            ))}
          </select>

          {/* Types dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">All Types</option>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
          </select>

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="featured">Featured Only</option>
            <option value="new_arrival">New Arrivals</option>
          </select>
        </div>
      </div>

      {/* Active Filters Pill Bar */}
      {(categoryFilter || colorFilter || sizeFilter || typeFilter || statusFilter !== 'all' || search) && (
        <div className="flex items-center gap-2 flex-wrap text-xs px-1">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Active Filters:</span>
          {sizeFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs shadow-2xs">
              Size: {sizeFilter}
              <button
                type="button"
                onClick={() => {
                  setSizeFilter('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="hover:text-emerald-950 font-black ml-0.5"
                title="Remove size filter"
              >
                ×
              </button>
            </span>
          )}
          {categoryFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
              Category: {categoryFilter}
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="hover:text-slate-900 font-black ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {colorFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
              Color: {colorFilter}
              <button
                type="button"
                onClick={() => {
                  setColorFilter('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="hover:text-slate-900 font-black ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {typeFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
              Type: {typeFilter}
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="hover:text-slate-900 font-black ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
              Status: {statusFilter}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="hover:text-slate-900 font-black ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
              Search: "{search}"
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="hover:text-slate-900 font-black ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('');
              setColorFilter('');
              setSizeFilter('');
              setTypeFilter('');
              setStatusFilter('all');
              setSearch('');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline ml-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Table matching user's screenshot exactly with color-wise & style support */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-600 font-bold text-xs bg-slate-50/50">
                {viewMode === 'style' && (
                  <th className="py-3.5 px-3 font-bold text-slate-700 w-10 text-center"></th>
                )}
                <th className="py-3.5 px-4 font-bold text-slate-700 w-20">Image</th>
                <th className="py-3.5 px-4 font-bold text-slate-700 min-w-[220px]">
                  {viewMode === 'color' ? 'Product / Color & SKU' : 'Product / SKU'}
                </th>
                <th className="py-3.5 px-4 font-bold text-slate-700 min-w-[120px]">Category</th>
                <th className="py-3.5 px-4 font-bold text-slate-700 min-w-[130px]">Price & MRP</th>
                <th className="py-3.5 px-4 font-bold text-slate-700 min-w-[100px]">Types</th>
                <th className="py-3.5 px-4 font-bold text-slate-700 min-w-[180px]">
                  {viewMode === 'color' ? 'Color Swatch & Sizes' : 'Variants'}
                </th>
                <th className="py-3.5 px-4 font-bold text-slate-700 min-w-[90px]">Stock</th>
                <th className="py-3.5 px-4 font-bold text-slate-700 min-w-[120px]">Status</th>
                <th className="py-3.5 px-4 text-right font-bold text-slate-700 w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={viewMode === 'style' ? 10 : 9} className="py-20 text-center">
                    <div className="inline-flex items-center gap-2.5 text-slate-500 font-medium text-xs">
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      Loading {viewMode === 'color' ? 'color-wise variants' : 'apparel products'}...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'style' ? 10 : 9} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-10 h-10 stroke-[1.2] text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-700">No products found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((row) => {
                  const rowId = row._id || row.id;
                  const price = Number(row.price ?? row.selling_rate ?? 0);
                  const mrp = Number(row.mrp ?? (price > 0 ? Math.round(price * 1.8) : 0));
                  const discount =
                    row.discount_percent ??
                    (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
                  const types = Array.isArray(row.types) && row.types.length > 0 ? row.types : ['B2B', 'B2C'];
                  const variantCount = row.variant_count || (row.variants ? row.variants.length : 1);
                  const colors = Array.isArray(row.colors) ? row.colors : [];
                  const isExpanded = Boolean(expandedRows[rowId]);

                  return (
                    <React.Fragment key={rowId}>
                      <tr
                        onClick={() => {
                          const cParam = row.color
                            ? `?color=${encodeURIComponent(row.color)}&sku=${encodeURIComponent(row.sku || '')}`
                            : '';
                          navigate(`/products/${row.product_id || row._id || row.id}/ledger${cParam}`);
                        }}
                        className={`hover:bg-slate-50/70 cursor-pointer transition-colors text-xs ${
                          isExpanded ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        {/* Expand Accordion Toggle for Style View */}
                        {viewMode === 'style' && (
                          <td className="py-3 px-3 text-center" onClick={(e) => toggleRowExpansion(rowId, e)}>
                            <button
                              type="button"
                              className="p-1 text-slate-400 hover:text-emerald-700 rounded-md hover:bg-slate-100 transition-colors"
                              title={isExpanded ? 'Collapse color variants' : 'Expand color variants'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}

                        {/* Image Thumbnail */}
                        <td className="py-3 px-4">
                          <div className="w-11 h-11 rounded-lg border border-slate-200/90 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-2xs relative">
                            {row.image ? (
                              <img
                                src={row.image}
                                alt={row.title || row.product_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=100&auto=format&fit=crop&q=60';
                                }}
                              />
                            ) : (
                              <Package className="w-5 h-5 text-emerald-600" />
                            )}
                            {/* Color swatch corner badge */}
                            {row.color_code && (
                              <span
                                className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border border-white shadow-xs"
                                style={{ backgroundColor: row.color_code }}
                                title={row.color}
                              />
                            )}
                          </div>
                        </td>

                        {/* Product / SKU */}
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-slate-900 uppercase tracking-tight text-[13px]">
                            {row.title || row.product_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">
                              SKU: {row.sku || row.sku_id || row.product_code}
                            </p>
                            {row.color && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200"
                                title={`Color: ${row.color}`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full border border-slate-300"
                                  style={{ backgroundColor: row.color_code || '#000000' }}
                                />
                                {row.color}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category Pill */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                            {(row.category || row.category_id?.name || 'T-SHIRT').toUpperCase()}
                          </span>
                        </td>

                        {/* Price & MRP */}
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-slate-900 text-[13px]">
                            ₹{price.toFixed(2)}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span className="line-through">₹{mrp}</span>
                            <span className="text-emerald-600 font-bold">{discount}% OFF</span>
                          </p>
                        </td>

                        {/* Types */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {types.map((t) => (
                              <span
                                key={t}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t === 'B2B'
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200/80'
                                    : 'bg-rose-50 text-rose-600 border border-rose-200/80'
                                }`}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Variants / Color Swatches */}
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          {viewMode === 'color' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                                  style={{ backgroundColor: row.color_code || '#000000' }}
                                />
                                <span className="font-bold text-slate-800 text-xs">{row.color}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                <span className="text-[10px] text-slate-400 mr-0.5">Sizes:</span>
                                {(row.sizes || ['S', 'M', 'L', 'XL', '2XL']).map((sz) => {
                                  const isSelected = sizeFilter && sz.toLowerCase() === sizeFilter.toLowerCase();
                                  return (
                                    <span
                                      key={sz}
                                      onClick={() => {
                                        setSizeFilter(isSelected ? '' : sz);
                                        setPagination((prev) => ({ ...prev, page: 1 }));
                                      }}
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono cursor-pointer transition ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                      }`}
                                      title={isSelected ? 'Clear size filter' : `Filter by size ${sz}`}
                                    >
                                      {sz}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {/* Pill with button to toggle inline expansion or open colors modal */}
                              <button
                                onClick={(e) => toggleRowExpansion(rowId, e)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 transition-colors"
                              >
                                <Palette className="w-3 h-3 text-emerald-600" />
                                <span>{variantCount} Colors/Variants</span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-emerald-700 ml-0.5" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-emerald-700 ml-0.5" />
                                )}
                              </button>

                              {/* Color Swatch Dots Preview */}
                              {colors.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap max-w-[170px]">
                                  {colors.slice(0, 7).map((c, i) => (
                                    <span
                                      key={i}
                                      title={c.name}
                                      className="w-3 h-3 rounded-full border border-slate-300/80 shadow-2xs hover:scale-125 transition-transform cursor-pointer"
                                      style={{ backgroundColor: c.hex }}
                                      onClick={(e) => toggleRowExpansion(rowId, e)}
                                    />
                                  ))}
                                  {colors.length > 7 && (
                                    <span
                                      onClick={(e) => toggleRowExpansion(rowId, e)}
                                      className="text-[9px] font-bold text-slate-400 hover:text-emerald-700 cursor-pointer"
                                    >
                                      +{colors.length - 7}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 text-[12px]">
                            {row.current_stock ?? 50}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">PCS</span>
                          {viewMode === 'color' && (
                            <button
                              type="button"
                              onClick={(e) => toggleRowExpansion(rowId, e)}
                              className={`block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded transition ${
                                isExpanded
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                              }`}
                              title={isExpanded ? 'Hide Size & Warehouse Breakdown' : 'Show Size & Warehouse Breakdown'}
                            >
                              {isExpanded ? 'Hide Sizes' : 'Sizes & WH'}
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                              Active
                            </span>
                            {row.is_featured && (
                              <p className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
                                <span>★</span> Featured
                              </p>
                            )}
                            {row.is_new !== false && (
                              <p className="text-[11px] font-semibold text-blue-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                New Arrival
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                const cParam = row.color
                                  ? `?color=${encodeURIComponent(row.color)}&sku=${encodeURIComponent(row.sku || '')}`
                                  : '';
                                navigate(`/products/${row.product_id || row._id || row.id}/ledger${cParam}`);
                              }}
                              title={row.color ? `Open Stock Ledger for ${row.color}` : 'Open Product Stock Ledger'}
                              className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{row.color ? `${row.color} Ledger` : 'Ledger'}</span>
                            </button>
                            <button
                              onClick={(e) => handleOpenDetail(row, e)}
                              title="View Product Details"
                              className="px-2 py-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Size-Wise & Warehouse Breakdown in Color View */}
                      {viewMode === 'color' && isExpanded && (
                        <tr className="bg-emerald-50/20 border-y border-emerald-100">
                          <td colSpan={9} className="p-3 pl-8 pr-6">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <Warehouse className="w-4 h-4 text-emerald-600" />
                                  <span className="text-xs font-bold text-slate-800">
                                    Size & Warehouse Stock Breakdown — {row.product_name}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    Total: {row.current_stock ?? 50} PCS
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-slate-400 font-semibold">
                                  SKU: {row.sku || row.sku_id}
                                </span>
                              </div>

                              {/* Warehouse Size Breakdown Table */}
                              <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                      <th className="py-2 px-3">Warehouse Location</th>
                                      <th className="py-2 px-3 text-center w-14">Size S</th>
                                      <th className="py-2 px-3 text-center w-14">Size M</th>
                                      <th className="py-2 px-3 text-center w-14">Size L</th>
                                      <th className="py-2 px-3 text-center w-14">Size XL</th>
                                      <th className="py-2 px-3 text-center w-14">Size 2XL</th>
                                      <th className="py-2 px-3 text-right w-20">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(row.warehouse_stock || []).map((wh, wIdx) => (
                                      <tr key={wIdx} className="hover:bg-slate-50/60 transition">
                                        <td className="py-2 px-3 font-medium text-slate-800">
                                          <div className="font-semibold text-xs">{wh.warehouse_name}</div>
                                          <div className="font-mono text-[10px] text-slate-400">{wh.warehouse_code}</div>
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 bg-slate-50/50">
                                          {wh.sizes?.S ?? 0}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 bg-emerald-50/30">
                                          {wh.sizes?.M ?? 0}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 bg-emerald-50/30">
                                          {wh.sizes?.L ?? 0}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 bg-slate-50/50">
                                          {wh.sizes?.XL ?? 0}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                                          {wh.sizes?.['2XL'] ?? 0}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">
                                          {wh.total ?? 0} PCS
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-slate-100/70 font-bold border-t border-slate-200 text-[11px] text-slate-800">
                                    <tr>
                                      <td className="py-2 px-3 uppercase tracking-wider text-[10px] font-bold text-slate-600">
                                        Color Totals Across Warehouses:
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-black text-slate-900">
                                        {row.size_stock?.S ?? 0}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-black text-emerald-800 bg-emerald-100/50">
                                        {row.size_stock?.M ?? 0}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-black text-emerald-800 bg-emerald-100/50">
                                        {row.size_stock?.L ?? 0}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-black text-slate-900">
                                        {row.size_stock?.XL ?? 0}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-black text-slate-900">
                                        {row.size_stock?.['2XL'] ?? 0}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                                        {row.current_stock ?? 50} PCS
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Expandable Color Variants Row in Style View */}
                      {viewMode === 'style' && isExpanded && (
                        <tr className="bg-slate-50/70 border-y border-emerald-100">
                          <td colSpan={10} className="p-3 pl-12 pr-6">
                            <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <Palette className="w-4 h-4 text-emerald-600" />
                                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                    {row.title || row.product_name} — Color-wise Variants ({row.variants?.length || row.colors?.length || 0} Colors)
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Base Rate: ₹{price} | MRP: ₹{mrp}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto p-1">
                                {(row.variants && row.variants.length > 0
                                  ? row.variants
                                  : (row.colors || []).map((c, i) => ({
                                      color: c.name,
                                      color_code: c.hex,
                                      sku: `${row.sku || row.product_name}-${c.name.slice(0, 3).toUpperCase()}`,
                                      price: price,
                                      mrp: mrp,
                                      stock: 50,
                                      sizes: ['S', 'M', 'L', 'XL', '2XL'],
                                    }))
                                ).map((v, vIdx) => {
                                  const cName = v.color || v.name;
                                  const cSku = v.sku || `${row.sku || row.product_code}-${(cName || '').slice(0, 3).toUpperCase()}`;

                                  return (
                                    <div
                                      key={vIdx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/products/${row.product_id || row._id || row.id}/ledger?color=${encodeURIComponent(cName)}&sku=${encodeURIComponent(cSku)}`);
                                      }}
                                      title={`Click to view Stock Ledger for ${cName}`}
                                      className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-400 hover:shadow-xs transition-all text-xs flex items-center justify-between cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0 group-hover:scale-125 transition-transform"
                                          style={{ backgroundColor: v.color_code || v.hex || '#000000' }}
                                        />
                                        <div>
                                          <p className="font-bold text-slate-800 text-[11px] leading-tight group-hover:text-emerald-700 transition-colors">
                                            {cName}
                                          </p>
                                          <p className="text-[10px] text-emerald-600 font-mono font-medium">
                                            {cSku}
                                          </p>
                                          <div className="flex items-center gap-1 text-[9px] font-mono mt-1 text-slate-500 flex-wrap">
                                            <span className="bg-slate-200/60 px-1 py-0.2 rounded font-bold text-slate-700">S:{v.size_stock?.S ?? 11}</span>
                                            <span className="bg-emerald-100/70 px-1 py-0.2 rounded font-bold text-emerald-800">M:{v.size_stock?.M ?? 23}</span>
                                            <span className="bg-emerald-100/70 px-1 py-0.2 rounded font-bold text-emerald-800">L:{v.size_stock?.L ?? 23}</span>
                                            <span className="bg-slate-200/60 px-1 py-0.2 rounded font-bold text-slate-700">XL:{v.size_stock?.XL ?? 11}</span>
                                            <span className="bg-slate-200/60 px-1 py-0.2 rounded font-bold text-slate-700">2XL:{v.size_stock?.['2XL'] ?? 8}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-slate-900 text-[11px]">
                                          ₹{v.price || price}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium group-hover:text-emerald-700 transition-colors">
                                          {v.stock ?? 75} in stock →
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing {products.length} of {pagination.total} {viewMode === 'color' ? 'color variants' : 'products'}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Colors Breakdown Modal */}
      <Modal
        isOpen={isColorsModalOpen}
        onClose={() => setIsColorsModalOpen(false)}
        title={selectedProduct ? `${selectedProduct.title || selectedProduct.product_name} - All Colors & Variants` : 'Color Variants'}
        size="xl"
      >
        {selectedProduct && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase">
                  {selectedProduct.title || selectedProduct.product_name}
                </h4>
                <p className="text-xs text-slate-500">
                  Total Variants: <span className="font-bold text-emerald-600">{selectedProduct.variant_count || (selectedProduct.variants ? selectedProduct.variants.length : 0)} Colors</span> | Price: ₹{selectedProduct.price} (MRP: ₹{selectedProduct.mrp})
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-bold text-xs">
                {selectedProduct.category}
              </span>
            </div>

            {/* Grid of All Color Variants */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(selectedProduct.variants && selectedProduct.variants.length > 0
                ? selectedProduct.variants
                : selectedProduct.colors || []
              ).map((v, idx) => {
                const colorName = v.color || v.name;
                const colorCode = v.color_code || v.hex || '#000000';
                const vSku = v.sku || `${selectedProduct.sku}-${colorName.slice(0, 3).toUpperCase()}`;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setIsColorsModalOpen(false);
                      navigate(`/products/${selectedProduct.product_id || selectedProduct._id || selectedProduct.id}/ledger?color=${encodeURIComponent(colorName)}&sku=${encodeURIComponent(vSku)}`);
                    }}
                    title={`Click to view Stock Ledger for ${colorName}`}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-400 hover:shadow-xs transition-all flex items-start gap-3 cursor-pointer group"
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0 mt-0.5"
                      style={{ backgroundColor: colorCode }}
                      title={colorName}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs truncate">{colorName}</p>
                      <p className="font-mono text-[10px] text-slate-500 uppercase mt-0.5">
                        SKU: {vSku}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1.5 pt-1.5 border-t border-slate-100">
                        <span className="font-bold text-slate-800">₹{v.price || selectedProduct.price}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold">
                          Stock: {v.stock || 50}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsColorsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>



      {/* Product Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Product Details"
        size="md"
      >
        {selectedProduct && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                {selectedProduct.image ? (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-7 h-7 text-emerald-600" />
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase">
                  {selectedProduct.title || selectedProduct.product_name}
                </h3>
                <p className="text-xs font-bold text-emerald-600 uppercase mt-0.5">
                  SKU: {selectedProduct.sku || selectedProduct.sku_id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Category</span>
                <span className="text-slate-900 font-extrabold text-xs block mt-0.5">
                  {selectedProduct.category}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Selling Price</span>
                <span className="text-slate-900 font-extrabold text-xs block mt-0.5">
                  ₹{Number(selectedProduct.price || selectedProduct.selling_rate || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">MRP & Discount</span>
                <span className="text-slate-900 font-extrabold text-xs block mt-0.5">
                  ₹{selectedProduct.mrp || 0} ({selectedProduct.discount_percent || 0}% OFF)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Variants</span>
                <span className="text-emerald-700 font-extrabold text-xs block mt-0.5">
                  {selectedProduct.variant_count || 1} Colors/Variants
                </span>
              </div>
            </div>

            {/* Sales Rate Auto-Management trigger */}
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 flex items-center justify-between">
              <div>
                <span className="text-emerald-800 font-bold text-xs block">Sales Rate Auto-Management</span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                  Purchase Cost: ₹{Number(selectedProduct.purchase_rate || 150).toFixed(2)} | Markup/Margin formula
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenPricingModal(selectedProduct);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculate & Manage</span>
              </button>
            </div>

            {/* Color Swatches list if available */}
            {selectedProduct.colors && selectedProduct.colors.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-2">Available Colors ({selectedProduct.colors.length}):</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedProduct.colors.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-slate-50 border border-slate-200"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-300"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Size & Warehouse Stock Matrix */}
            {selectedProduct.warehouse_stock && selectedProduct.warehouse_stock.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <Warehouse className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Warehouse & Size Inventory Matrix</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Stock by Depot</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-1.5 px-2.5">Warehouse</th>
                        <th className="py-1.5 px-2 text-center">S</th>
                        <th className="py-1.5 px-2 text-center">M</th>
                        <th className="py-1.5 px-2 text-center">L</th>
                        <th className="py-1.5 px-2 text-center">XL</th>
                        <th className="py-1.5 px-2 text-center">2XL</th>
                        <th className="py-1.5 px-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProduct.warehouse_stock.map((wh, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2.5 font-medium text-slate-800 truncate max-w-[130px]">
                            {wh.warehouse_name}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700 bg-slate-50/40">
                            {wh.sizes?.S ?? 0}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700 bg-emerald-50/20">
                            {wh.sizes?.M ?? 0}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700 bg-emerald-50/20">
                            {wh.sizes?.L ?? 0}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700 bg-slate-50/40">
                            {wh.sizes?.XL ?? 0}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700">
                            {wh.sizes?.['2XL'] ?? 0}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-extrabold text-slate-900">
                            {wh.total ?? 0} PCS
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate(`/products/${selectedProduct._id || selectedProduct.id}/ledger`);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open Stock Ledger</span>
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* CRM API Key Modal */}
      <Modal
        isOpen={isApiInfoModalOpen}
        onClose={() => setIsApiInfoModalOpen(false)}
        title="Danza Son CRM API Key"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 font-medium">
            Use this token in Postman or external client to fetch or manage apparel products:
          </p>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs flex items-center justify-between">
            <span className="truncate mr-2 text-slate-800">
              2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText('2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6');
                setCopiedToken(true);
                setTimeout(() => setCopiedToken(false), 2000);
              }}
              className="px-2.5 py-1 rounded bg-[#10b981] text-white text-[11px] font-bold shrink-0"
            >
              {copiedToken ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-1">
            <p className="text-emerald-400">GET /api/admin/product</p>
            <p className="text-emerald-400">GET /api/admin/product?view=color</p>
            <p className="text-emerald-400">GET /api/admin/product/:id</p>
            <p className="text-slate-400 text-[11px]">Header: x-api-key: [TOKEN]</p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsApiInfoModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* REQUIREMENT 7: SALES RATE AUTO-MANAGEMENT MODAL */}
      {isPricingModalOpen && pricingProduct && (
        <Modal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          title={`Sales Rate Management: ${pricingProduct.title || pricingProduct.product_name}`}
          size="lg"
        >
          {(() => {
            const cost = Number(pricingLiveCost || pricingProduct.purchase_rate || 150);
            const val = Number(pricingRule.value) || 0;
            const markupRate = Math.round(cost * (1 + val / 100));
            const marginRate = val < 100 ? Math.round(cost / (1 - val / 100)) : cost * 2;
            const suggestedRate = pricingRule.method === 'margin' ? marginRate : markupRate;

            return (
              <div className="space-y-4 text-xs font-sans text-slate-800">
                {/* Product Summary Header */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 uppercase">
                      {pricingProduct.title || pricingProduct.product_name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Code: {pricingProduct.product_code} | Category: {pricingProduct.category || 'Apparel'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Approved Rate</span>
                    <span className="text-base font-extrabold font-mono text-slate-900">
                      ₹{Number(pricingProduct.price || pricingProduct.selling_rate || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 3 Metrics: Purchase Cost, Cost Rate, Method */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Purchase Rate (Live)</span>
                    <span className="text-lg font-black font-mono text-blue-700 block mt-0.5">
                      ₹{cost.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400">Fetched from recent purchase bills</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Base Cost Rate</span>
                    <span className="text-lg font-black font-mono text-slate-800 block mt-0.5">
                      ₹{cost.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400">Inventory valuation base cost</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-emerald-200 bg-emerald-50/30 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">Suggested Sales Rate</span>
                    <span className="text-lg font-black font-mono text-emerald-700 block mt-0.5">
                      ₹{suggestedRate.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">Auto-computed by formula</span>
                  </div>
                </div>

                {/* Formula Mode Selector: Markup vs Margin */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Pricing Calculation Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPricingRule({ ...pricingRule, method: 'markup' })}
                      className={`p-3 rounded-xl border text-left transition ${
                        pricingRule.method === 'markup'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-extrabold text-xs block text-slate-900">Markup on Cost</span>
                      <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                        Sales Rate = Cost × (1 + Markup %)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPricingRule({ ...pricingRule, method: 'margin' })}
                      className={`p-3 rounded-xl border text-left transition ${
                        pricingRule.method === 'margin'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-extrabold text-xs block text-slate-900">Profit Margin on Sale</span>
                      <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                        Sales Rate = Cost ÷ (1 − Margin %)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Percentage Slider / Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {pricingRule.method === 'markup' ? 'Markup Percentage (%)' : 'Target Margin Percentage (%)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={pricingRule.value}
                        onChange={(e) => setPricingRule({ ...pricingRule, value: Number(e.target.value) })}
                        className="w-28 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold font-mono focus:border-emerald-600 outline-none"
                      />
                      <span className="text-sm font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Manual Override Rate (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-500">₹</span>
                      <input
                        type="number"
                        placeholder={`Suggested: ₹${suggestedRate}`}
                        value={manualOverrideRate}
                        onChange={(e) => setManualOverrideRate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold font-mono focus:border-emerald-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Transparency Breakdown Box */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-1">
                  <span className="font-sans font-bold text-slate-700 block">Calculation Breakdown:</span>
                  {pricingRule.method === 'markup' ? (
                    <p className="text-slate-600">
                      ₹{cost} × (1 + {val} / 100) = ₹{cost} × {(1 + val / 100).toFixed(2)} = <strong className="text-emerald-700">₹{markupRate}</strong>
                    </p>
                  ) : (
                    <p className="text-slate-600">
                      ₹{cost} ÷ (1 − {val} / 100) = ₹{cost} ÷ {((100 - val) / 100).toFixed(2)} = <strong className="text-emerald-700">₹{marginRate}</strong>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 font-sans mt-1">
                    * Guaranteed Integrity: Updating suggested or approved rates applies only to upcoming quotations and orders. Historical invoices will never be altered.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsPricingModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pricingSaving}
                      onClick={() => handleSavePricingRule(false)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-800 font-bold hover:bg-slate-100 transition shadow-xs"
                    >
                      {pricingSaving ? 'Saving...' : 'Save Rule Only'}
                    </button>
                    <button
                      type="button"
                      disabled={pricingSaving}
                      onClick={() => handleSavePricingRule(true)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-xs"
                    >
                      {pricingSaving ? 'Applying...' : 'Apply to Selling Price'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
