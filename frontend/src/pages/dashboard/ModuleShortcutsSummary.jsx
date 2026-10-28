import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Boxes,
  ShoppingCart,
  Scissors,
  Layers,
  Truck,
  Users,
  WalletCards,
  Award,
  Megaphone,
  UserPlus,
  RotateCw,
  Sparkles,
  Headphones,
  Landmark,
  TrendingUp,
  Target,
  FileText,
  RefreshCw,
  Search,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkle,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import dashboardService from '../../services/dashboardService';

export default function ModuleShortcutsSummary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected module for the dedicated summary view
  const selectedModuleId = searchParams.get('module');

  const iconMap = {
    Receipt: Receipt,
    Boxes: Boxes,
    ShoppingCart: ShoppingCart,
    Scissors: Scissors,
    Layers: Layers,
    Truck: Truck,
    Users: Users,
    WalletCards: WalletCards,
    Award: Award,
    Megaphone: Megaphone,
    UserPlus: UserPlus,
    RotateCw: RotateCw,
    Sparkles: Sparkles,
    Headphones: Headphones,
    Landmark: Landmark,
    TrendingUp: TrendingUp,
    Target: Target,
    FileText: FileText,
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      const res = await dashboardService.getShortcutsSummary();
      if (res?.data) {
        setShortcuts(res.data);
      }
    } catch (err) {
      console.error('Failed to load shortcuts summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedModule = useMemo(() => {
    if (!selectedModuleId) return null;
    return shortcuts.find((item) => item.id === selectedModuleId) || null;
  }, [shortcuts, selectedModuleId]);

  const filteredShortcuts = useMemo(() => {
    if (!searchTerm.trim()) return shortcuts;
    const q = searchTerm.toLowerCase();
    return shortcuts.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(q);
      const numMatch = item.number?.includes(q);
      const catMatch = item.category?.toLowerCase().includes(q);
      return titleMatch || numMatch || catMatch;
    });
  }, [shortcuts, searchTerm]);

  const handleSelectModule = (item) => {
    setSearchParams({ module: item.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToGrid = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getBadgeStyle = (color) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getIconContainerStyle = (color) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 group-hover:bg-emerald-600 group-hover:text-white';
      case 'blue':
        return 'bg-blue-50 text-blue-600 border border-blue-200/80 group-hover:bg-blue-600 group-hover:text-white';
      case 'amber':
        return 'bg-amber-50 text-amber-600 border border-amber-200/80 group-hover:bg-amber-600 group-hover:text-white';
      case 'rose':
        return 'bg-rose-50 text-rose-600 border border-rose-200/80 group-hover:bg-rose-600 group-hover:text-white';
      case 'purple':
        return 'bg-purple-50 text-purple-600 border border-purple-200/80 group-hover:bg-purple-600 group-hover:text-white';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-200/80 group-hover:bg-indigo-600 group-hover:text-white';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-800 group-hover:text-white';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ============================================================== */}
      {/* VIEW 1: DEDICATED MODULE SUMMARY PAGE (ON CLICK OF ANY MODULE) */}
      {/* ============================================================== */}
      {selectedModule ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToGrid}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Back to All Module Shortcuts
            </button>

            <button
              onClick={() => navigate(selectedModule.path)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
            >
              Open Detailed {selectedModule.title}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module Banner */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {(() => {
                const IconComponent = iconMap[selectedModule.icon] || Boxes;
                return (
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${getIconContainerStyle(
                      selectedModule.badgeColor
                    )}`}
                  >
                    <IconComponent className="w-8 h-8" />
                  </div>
                );
              })()}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    MODULE #{selectedModule.number}
                  </span>
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    {selectedModule.category}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                  {selectedModule.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  {selectedModule.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border ${getBadgeStyle(
                  selectedModule.badgeColor
                )}`}
              >
                ● Status: {selectedModule.status}
              </span>
            </div>
          </div>

          {/* High-Level Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {selectedModule.primaryLabel}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1">
                {selectedModule.primaryMetric}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Primary Operational Figure
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {selectedModule.secondaryLabel}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono mt-1">
                {selectedModule.secondaryMetric}
              </p>
              <p className="text-[11px] text-blue-600 font-medium mt-1">
                Activity Volume
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {selectedModule.tertiaryLabel}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-700 font-mono mt-1">
                {selectedModule.tertiaryMetric}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Key Performance Indicator
              </p>
            </div>
          </div>

          {/* Summary Operational Overview Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Executive Pulse & Quick Actions
              </h3>
              <span className="text-xs text-slate-400">Real-Time ERP Synced</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  Summary Operational Briefing:
                </span>
                <p className="leading-relaxed">
                  All transactions and records under <strong>{selectedModule.title}</strong> are
                  operating normally. Current key balance stands at{' '}
                  <strong className="text-slate-900">{selectedModule.primaryMetric}</strong> with an
                  activity level of{' '}
                  <strong className="text-slate-900">{selectedModule.secondaryMetric}</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  Direct Module Workflow:
                </span>
                <p className="leading-relaxed">
                  To view comprehensive ledgers, create new entries, edit records, or generate
                  detailed audit reports for this department, open the full page below.
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => navigate(selectedModule.path)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs"
                  >
                    Go to Full {selectedModule.title} Page
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* VIEW 2: ONLY ICON AND NAME DIRECTORY (ALL MODULES SHORTCUTS)   */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Page Header */}
          <PageHeader
            title="Module Shortcuts"
            subtitle="Click on any module icon or name below to view its executive summary."
            actions={
              <div className="flex items-center gap-2.5">
                <button
                  onClick={loadData}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
                >
                  CEO Command Center
                </button>
              </div>
            }
          />

          {/* Quick Search Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by module name (e.g. Sales, Product Management, Purchase)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium px-2 shrink-0">
              <span className="font-bold text-slate-800">{filteredShortcuts.length}</span> Modules
            </div>
          </div>

          {/* Clean Grid of ONLY ICON AND NAME */}
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Loading Module Shortcuts...</p>
            </div>
          ) : filteredShortcuts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
              <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No matching module found</p>
              <p className="text-xs text-slate-500 mt-1">Try another search keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {filteredShortcuts.map((item) => {
                const IconComponent = iconMap[item.icon] || Boxes;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectModule(item)}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-500/60 hover:shadow-md transition-all duration-150 flex items-center justify-between gap-3.5 cursor-pointer group select-none"
                  >
                    {/* ONLY ICON & NAME */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${getIconContainerStyle(
                          item.badgeColor
                        )}`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>

                      {/* Name & Number */}
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-slate-400 block tracking-wider">
                          #{item.number}
                        </span>
                        <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-emerald-700 transition truncate mt-0.5">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
