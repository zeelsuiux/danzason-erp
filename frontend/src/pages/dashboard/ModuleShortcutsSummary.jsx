import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import dashboardService from '../../services/dashboardService';

export default function ModuleShortcutsSummary() {
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

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

  const categories = useMemo(() => {
    const cats = ['all'];
    shortcuts.forEach((item) => {
      if (item.category && !cats.includes(item.category)) {
        cats.push(item.category);
      }
    });
    return cats;
  }, [shortcuts]);

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const numMatch = item.number?.includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const catMatch = item.category?.toLowerCase().includes(query);
        return titleMatch || numMatch || descMatch || catMatch;
      }
      return true;
    });
  }, [shortcuts, activeCategory, searchTerm]);

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

  const getCardIconBg = (color) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-100/80 text-emerald-700';
      case 'blue':
        return 'bg-blue-100/80 text-blue-700';
      case 'amber':
        return 'bg-amber-100/80 text-amber-700';
      case 'rose':
        return 'bg-rose-100/80 text-rose-700';
      case 'purple':
        return 'bg-purple-100/80 text-purple-700';
      case 'indigo':
        return 'bg-indigo-100/80 text-indigo-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Page Header */}
      <PageHeader
        title="Quick Shortcuts & Module Summaries"
        subtitle="High-level KPI pulse, quick health summaries, and 1-click navigation across all core enterprise ERP modules."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Pulse'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition shadow-sm"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              CEO Command Center
            </button>
          </div>
        }
      />

      {/* Top Aggregated Pulse Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0b1329] to-slate-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> Executive Operational Pulse
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Enterprise Cockpit & Quick Shortcuts
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
              Real-time summary snapshot of all 18 business pillars. Tap any card below to launch the dedicated full-page workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Modules
              </span>
              <span className="text-xl font-extrabold text-white">18 Pillars</span>
            </div>
            <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                System Status
              </span>
              <span className="text-xl font-extrabold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 100% Live
              </span>
            </div>
            <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Sync Engine
              </span>
              <span className="text-xl font-extrabold text-blue-400">Real-Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                activeCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? `All Modules (${shortcuts.length})` : cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search module or metric..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Shortcuts Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading Module Summaries...</p>
        </div>
      ) : filteredShortcuts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
          <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No matching module shortcuts found</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting the category filter or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShortcuts.map((item) => {
            const IconComponent = iconMap[item.icon] || Boxes;

            return (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group"
              >
                {/* Card Header */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition group-hover:scale-105 ${getCardIconBg(
                          item.badgeColor
                        )}`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-wider">
                          MODULE #{item.number}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 block -mt-0.5">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${getBadgeStyle(
                        item.badgeColor
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition flex items-center gap-1.5">
                      {item.title}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-600" />
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* 3 Summary KPI Tiles */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    {/* Metric 1 */}
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-medium text-slate-400 block truncate">
                        {item.primaryLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-900 font-mono mt-0.5 block truncate">
                        {item.primaryMetric}
                      </span>
                    </div>

                    {/* Metric 2 */}
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-medium text-slate-400 block truncate">
                        {item.secondaryLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block truncate">
                        {item.secondaryMetric}
                      </span>
                    </div>

                    {/* Metric 3 */}
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] font-medium text-slate-400 block truncate">
                        {item.tertiaryLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-700 font-mono mt-0.5 block truncate">
                        {item.tertiaryMetric}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:bg-emerald-50/50 group-hover:text-emerald-800 transition">
                  <span className="flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                    Open Detailed Module
                  </span>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-slate-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition shadow-2xs">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
