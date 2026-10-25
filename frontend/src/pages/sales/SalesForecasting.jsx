import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  Layers,
  ShoppingBag,
  DollarSign,
  Sparkles,
  Calendar,
  Sliders,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Building,
  Tag,
  Scissors,
  BarChart3,
  PieChart,
  RefreshCw,
  FileText,
  X,
  Target,
  Factory,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import salesForecastService from '../../services/salesForecastService';

export default function SalesForecasting() {
  // ======================== STATE ========================
  const [forecasts, setForecasts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('quarterly'); // 'quarterly' | 'categories' | 'territories' | 'plans'
  const [search, setSearch] = useState('');
  const [fyFilter, setFyFilter] = useState('2026-2027');
  const [statusFilter, setStatusFilter] = useState('all');

  // Interactive What-If Simulator
  const [growthSlider, setGrowthSlider] = useState(15);
  const [simulatedData, setSimulatedData] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const initialForm = {
    title: '',
    financial_year: '2026-2027',
    period_type: 'quarterly',
    period_name: '',
    season: 'festive_diwali',
    confidence_level: 'realistic',
    target_revenue: 5000000,
    projected_revenue: 5800000,
    target_units: 25000,
    projected_units: 28500,
    estimated_fabric_kg: 7125,
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // ======================== LOADERS ========================
  useEffect(() => {
    loadForecasts();
    loadStats();
  }, [fyFilter, statusFilter]);

  useEffect(() => {
    runSimulation(growthSlider);
  }, [growthSlider]);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const params = {
        financial_year: fyFilter !== 'all' ? fyFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search.trim() || undefined,
        limit: 100,
      };
      const res = await salesForecastService.getForecasts(params);
      setForecasts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load forecasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const res = await salesForecastService.getForecastStats();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load forecast stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const runSimulation = async (growthRate) => {
    try {
      setSimulating(true);
      const res = await salesForecastService.simulateGrowth(growthRate);
      if (res?.data) {
        setSimulatedData(res.data);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  // ======================== HANDLERS ========================
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedForecast(null);
    setFormData(initialForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setModalMode('edit');
    setSelectedForecast(item);
    setFormData({
      title: item.title || '',
      financial_year: item.financial_year || '2026-2027',
      period_type: item.period_type || 'quarterly',
      period_name: item.period_name || '',
      season: item.season || 'regular',
      confidence_level: item.confidence_level || 'realistic',
      target_revenue: item.target_revenue || 0,
      projected_revenue: item.projected_revenue || 0,
      target_units: item.target_units || 0,
      projected_units: item.projected_units || 0,
      estimated_fabric_kg: item.estimated_fabric_kg || 0,
      notes: item.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.title.trim()) {
      setFormError('Please enter a forecast title.');
      return;
    }
    if (!formData.period_name.trim()) {
      setFormError('Please enter a period name (e.g. Q3 2026 or October).');
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === 'create') {
        await salesForecastService.createForecast(formData);
      } else {
        await salesForecastService.updateForecast(selectedForecast._id, formData);
      }
      setIsModalOpen(false);
      loadForecasts();
      loadStats();
    } catch (err) {
      setFormError(err.message || 'Failed to save forecast plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to archive forecast plan "${item.title}"?`)) return;
    try {
      await salesForecastService.deleteForecast(item._id);
      loadForecasts();
      loadStats();
    } catch (err) {
      alert(`Could not delete forecast: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (!forecasts.length) {
      alert('No forecast plans available to export.');
      return;
    }

    const headers = [
      'Forecast Code',
      'Title',
      'FY',
      'Period',
      'Season',
      'Target Revenue',
      'Projected Revenue',
      'Projected Units',
      'Estimated Fabric Kg',
      'Confidence',
      'Status',
    ];

    const rows = forecasts.map((f) => [
      `"${f.forecast_code || ''}"`,
      `"${f.title || ''}"`,
      `"${f.financial_year || ''}"`,
      `"${f.period_name || ''}"`,
      `"${f.season || ''}"`,
      f.target_revenue || 0,
      f.projected_revenue || 0,
      f.projected_units || 0,
      f.estimated_fabric_kg || 0,
      `"${f.confidence_level || ''}"`,
      `"${f.status || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DanzaSon_Sales_Forecast_${fyFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered forecasts for Plans tab
  const filteredForecasts = useMemo(() => {
    if (!search.trim()) return forecasts;
    const q = search.toLowerCase().trim();
    return forecasts.filter(
      (f) =>
        f.title?.toLowerCase().includes(q) ||
        f.forecast_code?.toLowerCase().includes(q) ||
        f.period_name?.toLowerCase().includes(q) ||
        f.season?.toLowerCase().includes(q)
    );
  }, [forecasts, search]);

  // Season Helper
  const getSeasonBadge = (season) => {
    switch (season) {
      case 'festive_diwali':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            🪔 Festive & Diwali
          </span>
        );
      case 'summer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
            ☀️ Summer Season
          </span>
        );
      case 'winter':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            ❄️ Winter Fleece Peak
          </span>
        );
      case 'wedding_spring':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            🌸 Wedding & Spring
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            📦 Regular Cycle
          </span>
        );
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Plan
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Reviewed
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  // Table Columns for Plans list
  const columns = [
    {
      header: 'Forecast Code & Period',
      key: 'forecast_code',
      render: (_, f) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold text-slate-900">{f.forecast_code}</span>
            <span className="font-sans text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              FY {f.financial_year}
            </span>
          </div>
          <div className="font-semibold text-xs text-slate-800">{f.period_name}</div>
        </div>
      ),
    },
    {
      header: 'Title & Seasonality',
      key: 'title',
      render: (_, f) => (
        <div className="space-y-1 max-w-[280px]">
          <div className="text-xs font-bold text-slate-900 line-clamp-1" title={f.title}>
            {f.title}
          </div>
          <div>{getSeasonBadge(f.season)}</div>
        </div>
      ),
    },
    {
      header: 'Target vs Projected (₹)',
      key: 'revenue',
      render: (_, f) => {
        const gap = Number(f.projected_revenue || 0) - Number(f.target_revenue || 0);
        const gapPct = f.target_revenue > 0 ? ((gap / f.target_revenue) * 100).toFixed(1) : 0;
        return (
          <div className="space-y-0.5">
            <div className="font-mono text-xs font-black text-slate-900">
              ₹{Number(f.projected_revenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500">
              Target: ₹{Number(f.target_revenue || 0).toLocaleString('en-IN')}{' '}
              <span
                className={`font-bold ml-1 ${
                  gap >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                ({gap >= 0 ? `+${gapPct}%` : `${gapPct}%`})
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Volume & Fabric Demand',
      key: 'units',
      render: (_, f) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-mono font-bold text-slate-900">
            {Number(f.projected_units || 0).toLocaleString('en-IN')} pcs
          </div>
          <div className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
            <Scissors className="w-3 h-3 text-indigo-500" />
            {Number(f.estimated_fabric_kg || 0).toLocaleString('en-IN')} kg fabric
          </div>
        </div>
      ),
    },
    {
      header: 'Status & Confidence',
      key: 'status',
      render: (_, f) => (
        <div className="space-y-1">
          <div>{getStatusBadge(f.status)}</div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Outlook: <strong className="text-slate-800">{f.confidence_level}</strong>
          </div>
        </div>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (_, f) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleOpenEditModal(f)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(f)}
            className="px-2 py-1 text-xs font-semibold rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Archive plan"
          >
            Archive
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full font-sans pb-10">
      {/* Top Page Header */}
      <PageHeader
        title="Sales & Business Forecasting"
        subtitle="Project garment wholesale demand, production volume targets, raw fabric consumption, and interactive What-If growth scenarios."
        breadcrumbs={[
          { label: 'Sales & CRM', link: '/sales/leads' },
          { label: 'Business Forecasting' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> New Forecast Plan
            </button>
          </div>
        }
      />

      {/* Top 5 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Projected Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Projected Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 truncate">
            {statsLoading ? '...' : `₹${Number(stats?.totalProjectedRevenue || 0).toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            +{stats?.revenueGrowthPct || 0}% above target budget
          </div>
        </div>

        {/* Target Revenue Budget */}
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Target Budget</span>
            <Target className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-800 truncate">
            {statsLoading ? '...' : `₹${Number(stats?.totalTargetRevenue || 0).toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Baseline Annual Sales Target
          </div>
        </div>

        {/* Volume Forecast (Pcs) */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 shadow-soft">
          <div className="flex items-center justify-between text-blue-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Unit Volume</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-900">
            {statsLoading ? '...' : `${Number(stats?.totalProjectedUnits || 0).toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 font-medium">
            Garment pieces to manufacture
          </div>
        </div>

        {/* Fabric Requirement (Kgs) */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 shadow-soft">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Fabric Demand</span>
            <Scissors className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-900">
            {statsLoading ? '...' : `${Number(stats?.totalEstimatedFabricKg || 0).toLocaleString('en-IN')} kg`}
          </div>
          <div className="text-[11px] text-indigo-700 mt-1 font-medium">
            Greige & finished fabric required
          </div>
        </div>

        {/* Pipeline Coverage */}
        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 shadow-soft">
          <div className="flex items-center justify-between text-purple-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Weighted Pipeline</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-900 truncate">
            {statsLoading ? '...' : `₹${Number(stats?.totalWeightedPipeline || 0).toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-purple-700 mt-1 font-medium">
            {stats?.pipelineCoverageRatio || 0}% active lead deal coverage
          </div>
        </div>
      </div>

      {/* Interactive What-If Growth Scenario Simulator */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0d1627] to-slate-900 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sliders className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Interactive What-If Growth Scenario Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simulate festive surges, market expansion, or recession adjustments. Instantly projects factory load and fabric demand.
            </p>
          </div>

          {/* Quick Scenario Preset Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { label: 'Conservative (-10%)', val: -10 },
              { label: 'Baseline (0%)', val: 0 },
              { label: 'Moderate (+15%)', val: 15 },
              { label: 'Festive Surge (+30%)', val: 30 },
              { label: 'Diwali Peak (+45%)', val: 45 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setGrowthSlider(p.val)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition whitespace-nowrap ${
                  growthSlider === p.val
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slider & Dynamic Result Grid */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Slider input */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Simulated Growth Parameter</span>
              <span
                className={`font-mono text-sm px-2 py-0.5 rounded ${
                  growthSlider >= 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {growthSlider >= 0 ? `+${growthSlider}%` : `${growthSlider}%`}
              </span>
            </div>
            <input
              type="range"
              min="-25"
              max="60"
              step="5"
              value={growthSlider}
              onChange={(e) => setGrowthSlider(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-25% (Slump)</span>
              <span>0% (Baseline)</span>
              <span>+60% (Max Boom)</span>
            </div>
          </div>

          {/* Dynamic Calculated Outputs */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Projected Revenue */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Simulated Revenue
              </span>
              <span className="text-lg font-black font-mono text-white mt-0.5 block truncate">
                ₹{Number(simulatedData?.simulatedRevenue || 0).toLocaleString('en-IN')}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  (simulatedData?.revenueDelta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {(simulatedData?.revenueDelta || 0) >= 0 ? '+' : ''}₹
                {Number(simulatedData?.revenueDelta || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Total Units */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Garment Units
              </span>
              <span className="text-lg font-black font-mono text-white mt-0.5 block">
                {Number(simulatedData?.simulatedUnits || 0).toLocaleString('en-IN')}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  (simulatedData?.unitsDelta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {(simulatedData?.unitsDelta || 0) >= 0 ? '+' : ''}
                {Number(simulatedData?.unitsDelta || 0).toLocaleString('en-IN')} pcs
              </span>
            </div>

            {/* Fabric Required */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Raw Fabric (Kg)
              </span>
              <span className="text-lg font-black font-mono text-indigo-300 mt-0.5 block">
                {Number(simulatedData?.simulatedFabricKg || 0).toLocaleString('en-IN')} kg
              </span>
              <span className="text-[10px] text-slate-400">Advance mill booking</span>
            </div>

            {/* Factory Capacity Load */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Factory Capacity
              </span>
              <span className="text-lg font-black font-mono text-emerald-400 mt-0.5 block">
                {simulatedData?.capacityUtilizationPct || 0}%
              </span>
              <span className="text-[10px] text-slate-400">
                {Number(simulatedData?.capacityUtilizationPct || 0) > 100
                  ? '⚠️ Requires 2nd Shift / Job Work'
                  : 'Single Shift Optimal'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container Card with Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-4 pt-2 gap-2 overflow-x-auto">
          {[
            { id: 'quarterly', label: 'Quarterly Outlook & Seasons', icon: Calendar },
            { id: 'categories', label: 'Category & Fabric Demand', icon: Layers },
            { id: 'territories', label: 'Territories & Regional Hubs', icon: Building },
            { id: 'plans', label: 'All Forecast Plans', icon: FileText, count: forecasts.length },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap -mb-[1px] flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: QUARTERLY OUTLOOK */}
        {activeTab === 'quarterly' && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  FY {fyFilter} Quarterly Projection Roadmap
                </h3>
                <p className="text-xs text-slate-500">
                  Target vs Projected wholesale revenue along with raw material procurement timelines.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Financial Year:</span>
                <select
                  value={fyFilter}
                  onChange={(e) => setFyFilter(e.target.value)}
                  className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-none"
                >
                  <option value="2026-2027">2026 - 2027</option>
                  <option value="2025-2026">2025 - 2026</option>
                </select>
              </div>
            </div>

            {/* Quarters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(stats?.quarterlyData || []).map((q) => {
                const targetRev = Number(q.target_revenue || 0);
                const projRev = Number(q.projected_revenue || 0);
                const pct = targetRev > 0 ? ((projRev / targetRev) * 100).toFixed(0) : 100;
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-slate-900">{q.code}</span>
                      {getSeasonBadge(q.season)}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{q.period}</h4>
                      <div className="text-lg font-black font-mono text-emerald-700 mt-1">
                        ₹{projRev.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Target Budget: ₹{targetRev.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-600">
                        <span>Projected / Target</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            Number(pct) >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(Number(pct), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Units: <strong className="text-slate-800">{Number(q.projected_units || 0).toLocaleString('en-IN')}</strong>
                      </span>
                      <span className="text-indigo-700 font-semibold">
                        Fabric: <strong>{Number(q.estimated_fabric_kg || 0).toLocaleString('en-IN')} kg</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORY & FABRIC FORECAST */}
        {activeTab === 'categories' && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Product Category Demand & Fabric Consumption Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Helps production and fabric procurement plan yarn, knitting, and dyeing schedules in advance.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Garment Category</th>
                    <th className="p-3">Projected Units</th>
                    <th className="p-3">Projected Revenue</th>
                    <th className="p-3">Raw Fabric Requirement (Kg)</th>
                    <th className="p-3">Fabric Specification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {(stats?.categories || []).map((cat) => (
                    <tr key={cat.category} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        {cat.label}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {Number(cat.total_projected_units || 0).toLocaleString('en-IN')} pcs
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        ₹{Number(cat.total_projected_revenue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {Number(cat.total_fabric_kg || 0).toLocaleString('en-IN')} kg
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {cat.fabric_type || 'Standard Combed Cotton Blend'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TERRITORIES & REGIONAL HUBS */}
        {activeTab === 'territories' && (
          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Territory & Regional Wholesale Distribution Outlook
              </h3>
              <p className="text-xs text-slate-500">
                Projected regional demand based on distributor network, key B2B accounts, and regional festive dates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(stats?.territories || []).map((t) => (
                <div
                  key={t.region}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      {t.region}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                        t.outlook === 'high'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {t.outlook} growth
                    </span>
                  </div>

                  <div className="text-lg font-black font-mono text-slate-900">
                    ₹{Number(t.projected_revenue || 0).toLocaleString('en-IN')}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Target: ₹{Number(t.target_revenue || 0).toLocaleString('en-IN')}</span>
                    <span className="font-bold text-slate-700">{t.key_accounts_count} accounts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FORECAST PLANS LIST (DATATABLE) */}
        {activeTab === 'plans' && (
          <div>
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by code, title, period, season..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Plans</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="draft">Drafts</option>
                </select>
              </div>
            </div>

            {/* DataTable */}
            <DataTable
              columns={columns}
              data={filteredForecasts}
              loading={loading}
              emptyMessage="No forecast plans found for the selected criteria."
            />
          </div>
        )}
      </div>

      {/* ======================== MODAL: CREATE / EDIT FORECAST PLAN ======================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create New Business Forecast Plan' : 'Edit Forecast Plan'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Forecast Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Q3 Festive Surge & Sweatshirt Production Plan"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-xs font-semibold"
              />
            </div>

            {/* Financial Year */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Financial Year</label>
              <select
                value={formData.financial_year}
                onChange={(e) => setFormData({ ...formData, financial_year: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-white"
              >
                <option value="2026-2027">2026 - 2027</option>
                <option value="2025-2026">2025 - 2026</option>
                <option value="2027-2028">2027 - 2028</option>
              </select>
            </div>

            {/* Period Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Period Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Q3 (Oct - Dec 2026)"
                value={formData.period_name}
                onChange={(e) => setFormData({ ...formData, period_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-xs font-semibold"
              />
            </div>

            {/* Seasonality */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Season / Festive Category</label>
              <select
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-white"
              >
                <option value="festive_diwali">Festive & Diwali Boom</option>
                <option value="summer">Summer Pre-Season</option>
                <option value="winter">Winter & Fleece Peak</option>
                <option value="wedding_spring">Wedding & Spring</option>
                <option value="regular">Regular Distribution</option>
              </select>
            </div>

            {/* Confidence Level */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Outlook / Confidence</label>
              <select
                value={formData.confidence_level}
                onChange={(e) => setFormData({ ...formData, confidence_level: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-white"
              >
                <option value="realistic">Realistic (Expected baseline)</option>
                <option value="optimistic">Optimistic (High market surge)</option>
                <option value="conservative">Conservative (Risk protected)</option>
              </select>
            </div>

            {/* Target Revenue */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Revenue Budget (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.target_revenue}
                onChange={(e) => setFormData({ ...formData, target_revenue: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none font-mono text-xs font-bold"
              />
            </div>

            {/* Projected Revenue */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Projected Revenue (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.projected_revenue}
                onChange={(e) => setFormData({ ...formData, projected_revenue: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none font-mono text-xs font-bold text-emerald-700"
              />
            </div>

            {/* Projected Units */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Projected Units (Pcs)</label>
              <input
                type="number"
                min="0"
                value={formData.projected_units}
                onChange={(e) => {
                  const pcs = Number(e.target.value);
                  // Auto estimate fabric: ~0.25 kg per average piece
                  setFormData({
                    ...formData,
                    projected_units: pcs,
                    estimated_fabric_kg: Math.round(pcs * 0.25),
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none font-mono text-xs font-bold"
              />
            </div>

            {/* Estimated Fabric (Kg) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Estimated Fabric Required (Kg)</label>
              <input
                type="number"
                min="0"
                value={formData.estimated_fabric_kg}
                onChange={(e) => setFormData({ ...formData, estimated_fabric_kg: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none font-mono text-xs font-bold text-indigo-700"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Strategic Notes / Remarks</label>
              <textarea
                rows="2"
                placeholder="Market trends, raw yarn price outlook, client commitments..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Forecast Plan' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
