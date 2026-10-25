import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Building2,
  Boxes,
  ArrowRight,
  TrendingUp,
  Truck,
  ShieldCheck,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatsCard from '../../components/common/StatsCard';
import StatusBadge from '../../components/common/StatusBadge';
import { rawMaterialApi, warehouseApi, purchaseApi } from '../../services/procurementService';

export default function RawMaterialCatalog() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [stats, setStats] = useState({
    totalMaterials: 0,
    totalWarehouseStock: 0,
    totalSupplierStock: 0,
    totalInTransitStock: 0,
    totalCompanyStock: 0,
  });

  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    material_code: '',
    material_name: '',
    category: 'Fabric',
    subcategory: '',
    description: '',
    uom: 'KG',
    default_supplier_id: '',
    warehouse_id: '',
    purchase_rate: '',
    min_stock_level: 5,
    reorder_level: 10,
    opening_stock: '',
    hsn_code: '5208',
    gst_rate: 5,
    notes: '',
  });

  useEffect(() => {
    loadMaterials();
    loadDropdowns();
  }, [selectedCategory, selectedWarehouse, selectedStatus]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        warehouse_id: selectedWarehouse !== 'all' ? selectedWarehouse : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };
      const res = await rawMaterialApi.getRawMaterials(params);
      if (res && res.success) {
        setMaterials(res.data || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load raw materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [whRes, supRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        purchaseApi.getSuppliers(),
      ]);
      const whList =
        whRes?.data?.warehouses ||
        whRes?.warehouses ||
        (Array.isArray(whRes?.data) ? whRes.data : []);
      setWarehouses(Array.isArray(whList) ? whList : []);

      const supList = Array.isArray(supRes?.data)
        ? supRes.data
        : supRes?.data?.suppliers || [];
      setSuppliers(Array.isArray(supList) ? supList : []);
    } catch (e) {
      console.error('Failed to load dropdowns:', e);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMaterials();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedWarehouse('all');
    setSelectedStatus('all');
    setTimeout(() => loadMaterials(), 50);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.material_name.trim()) {
      setFormError('Raw Material Name is required.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError('');
      await rawMaterialApi.createRawMaterial({
        ...formData,
        purchase_rate: Number(formData.purchase_rate) || 0,
        opening_stock: Number(formData.opening_stock) || 0,
        min_stock_level: Number(formData.min_stock_level) || 0,
        reorder_level: Number(formData.reorder_level) || 0,
        gst_rate: Number(formData.gst_rate) || 5,
      });
      setIsModalOpen(false);
      setFormData({
        material_code: '',
        material_name: '',
        category: 'Fabric',
        subcategory: '',
        description: '',
        uom: 'KG',
        default_supplier_id: '',
        warehouse_id: '',
        purchase_rate: '',
        min_stock_level: 5,
        reorder_level: 10,
        opening_stock: '',
        hsn_code: '5208',
        gst_rate: 5,
        notes: '',
      });
      loadMaterials();
    } catch (err) {
      setFormError(err.message || 'Failed to create raw material');
    } finally {
      setSubmitting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!materials.length) return;
    const headers = [
      'Material Code',
      'Material Name',
      'Category',
      'UOM',
      'Warehouse Stock',
      'Supplier-Held Stock',
      'In-Transit Stock',
      'Total Company Stock',
      'Purchase Rate',
      'Status',
    ];
    const rows = materials.map((m) => [
      m.material_code,
      `"${m.material_name}"`,
      m.category,
      m.uom,
      m.warehouse_stock || 0,
      m.supplier_stock || 0,
      m.in_transit_stock || 0,
      m.total_stock || 0,
      m.purchase_rate || 0,
      m.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `raw_materials_catalog_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title="Raw Material Catalog & Job Work Inventory"
        subtitle="Track company-owned raw materials across internal warehouses, external manufacturing suppliers & in-transit returns."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Raw Material</span>
            </button>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatsCard
          title="Total Raw Materials"
          value={Number(stats?.totalMaterials || 0).toLocaleString('en-IN')}
          subtitle="Catalog SKU count"
          icon={Layers}
          color="brand"
        />
        <StatsCard
          title="Warehouse Stock"
          value={Number(stats?.totalWarehouseStock || 0).toLocaleString('en-IN')}
          subtitle="Immediately Available"
          icon={Boxes}
          color="emerald"
        />
        <StatsCard
          title="Supplier-Held Stock"
          value={Number(stats?.totalSupplierStock || 0).toLocaleString('en-IN')}
          subtitle="At Job-Work Suppliers"
          icon={Building2}
          color="amber"
        />
        <StatsCard
          title="In-Transit Stock"
          value={Number(stats?.totalInTransitStock || 0).toLocaleString('en-IN')}
          subtitle="Dispatched Returns"
          icon={Truck}
          color="blue"
        />
        <StatsCard
          title="Total Company-Owned"
          value={Number(stats?.totalCompanyStock || 0).toLocaleString('en-IN')}
          subtitle="Total Auditable Units"
          icon={ShieldCheck}
          color="purple"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code, material name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-emerald-500 font-medium text-slate-800"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              <option value="Fabric">Fabric</option>
              <option value="Yarn">Yarn</option>
              <option value="Thread">Thread</option>
              <option value="Trims">Trims & Labels</option>
              <option value="Buttons">Buttons / Zips</option>
              <option value="Packaging">Packaging</option>
            </select>

            {/* Warehouse Filter */}
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Warehouses</option>
              {(Array.isArray(warehouses) ? warehouses : []).map((w) => (
                <option key={w._id} value={w._id}>
                  {w.warehouse_name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

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

      {/* Raw Materials Catalog Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5">Raw Material</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Unit (UOM)</th>
                <th className="p-3.5 text-right bg-emerald-50/50">Warehouse Stock</th>
                <th className="p-3.5 text-right bg-amber-50/50">Supplier-Held</th>
                <th className="p-3.5 text-right bg-blue-50/50">In-Transit</th>
                <th className="p-3.5 text-right bg-purple-50/50 font-bold">Total Company-Owned</th>
                <th className="p-3.5 text-right">Purchase Rate (₹)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading Raw Material Catalog...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No raw materials found matching your filters.
                  </td>
                </tr>
              ) : (
                materials.map((m) => {
                  const whStock = Number(m.warehouse_stock || 0);
                  const supStock = Number(m.supplier_stock || 0);
                  const transitStock = Number(m.in_transit_stock || 0);
                  const totalCompany = Number(m.total_stock || whStock + supStock + transitStock);

                  return (
                    <tr
                      key={m._id}
                      onClick={() => navigate(`/raw-materials/${m._id}/ledger`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition group"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {m.material_name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {m.material_code}
                          {m.default_supplier_id && (
                            <span className="ml-2 text-slate-500">
                              • Supplier:{' '}
                              {typeof m.default_supplier_id === 'object'
                                ? m.default_supplier_id?.supplier_name
                                : m.default_supplier_id}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {m.category}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-600">{m.uom}</td>

                      {/* Warehouse Immediately Available */}
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30 text-sm">
                        {whStock.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-emerald-600">{m.uom}</span>
                      </td>

                      {/* Supplier-Held Stock */}
                      <td className="p-3.5 text-right font-mono font-bold text-amber-700 bg-amber-50/30 text-sm">
                        {supStock > 0 ? (
                          <>
                            {supStock.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-amber-600">{m.uom}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </td>

                      {/* In-Transit Returns */}
                      <td className="p-3.5 text-right font-mono font-bold text-blue-700 bg-blue-50/30 text-sm">
                        {transitStock > 0 ? (
                          <>
                            {transitStock.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-blue-600">{m.uom}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </td>

                      {/* Total Company-Owned Balance */}
                      <td className="p-3.5 text-right font-mono font-black text-purple-900 bg-purple-50/40 text-sm">
                        {totalCompany.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-purple-700">{m.uom}</span>
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                        ₹{(m.purchase_rate || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5 text-center">
                        <StatusBadge status={m.status || 'active'} />
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                          <span>Ledger</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD RAW MATERIAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Create New Raw Material</h3>
                  <p className="text-xs text-slate-500">
                    Add raw material SKU with opening stock, warehouse & costing parameters.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Material Code / SKU (Auto or Custom)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RM-001 (Blank = Auto generated)"
                    value={formData.material_code}
                    onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono uppercase focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Raw Material Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100% Combed Cotton Fabric"
                    value={formData.material_name}
                    onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:border-emerald-500 outline-none"
                  >
                    <option value="Fabric">Fabric</option>
                    <option value="Yarn">Yarn</option>
                    <option value="Thread">Thread</option>
                    <option value="Trims">Trims & Labels</option>
                    <option value="Buttons">Buttons</option>
                    <option value="Zippers">Zippers</option>
                    <option value="Packaging">Packaging Material</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measurement (UOM)</label>
                  <select
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono font-bold focus:border-emerald-500 outline-none"
                  >
                    <option value="KG">KG (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="SPOOL">SPOOL (Spools/Cones)</option>
                    <option value="ROLL">ROLL (Rolls)</option>
                    <option value="BOX">BOX (Boxes)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default Supplier</label>
                  <select
                    value={formData.default_supplier_id}
                    onChange={(e) => setFormData({ ...formData, default_supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select Default Supplier (Optional)...</option>
                    {(Array.isArray(suppliers) ? suppliers : []).map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.supplier_name} {s.supplier_code ? `(${s.supplier_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opening Warehouse</label>
                  <select
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select Warehouse...</option>
                    {(Array.isArray(warehouses) ? warehouses : []).map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.warehouse_name} {w.warehouse_code ? `(${w.warehouse_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase / Cost Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 200"
                    value={formData.purchase_rate}
                    onChange={(e) => setFormData({ ...formData, purchase_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={formData.opening_stock}
                    onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN/SAC Code</label>
                  <input
                    type="text"
                    placeholder="5208"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono focus:border-emerald-500 outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description & Specifications</label>
                <textarea
                  rows={2}
                  placeholder="Fabric GSM, width, yarn count, finish, technical notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Raw Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
