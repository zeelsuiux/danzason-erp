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
  FileText,
  RefreshCw,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
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
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
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

  const getIconContainerStyle = (color) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs';
      case 'blue':
        return 'bg-blue-50 text-blue-600 border border-blue-200/60 shadow-xs';
      case 'amber':
        return 'bg-amber-50 text-amber-600 border border-amber-200/60 shadow-xs';
      case 'rose':
        return 'bg-rose-50 text-rose-600 border border-rose-200/60 shadow-xs';
      case 'purple':
        return 'bg-purple-50 text-purple-600 border border-purple-200/60 shadow-xs';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 shadow-xs';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200 shadow-xs';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        title="Module Shortcuts & Summary"
        subtitle="Quick access to all 18 core ERP modules with high-level summary KPIs and 1-click navigation."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-sm"
            >
              CEO Command Center
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? `All Modules (${shortcuts.length})` : cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search module name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Grid: 18 Modules with Name, Icon & Summary Data */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading Module Summaries...</p>
        </div>
      ) : filteredShortcuts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
          <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No matching modules found</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShortcuts.map((item) => {
            const IconComponent = iconMap[item.icon] || Boxes;

            return (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500/60 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group p-5 space-y-4"
              >
                {/* Header: Icon, Name and Number */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${getIconContainerStyle(
                          item.badgeColor
                        )}`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-400">
                            #{item.number}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {item.category}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition truncate mt-0.5">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border shrink-0 ${getBadgeStyle(
                        item.badgeColor
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-1">
                    {item.description}
                  </p>
                </div>

                {/* Summary Data Tiles (High-Level KPIs) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-medium text-slate-400 block truncate">
                      {item.primaryLabel}
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono mt-0.5 block truncate">
                      {item.primaryMetric}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-medium text-slate-400 block truncate">
                      {item.secondaryLabel}
                    </span>
                    <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block truncate">
                      {item.secondaryMetric}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] font-medium text-slate-400 block truncate">
                      {item.tertiaryLabel}
                    </span>
                    <span className="text-xs font-bold text-slate-700 font-mono mt-0.5 block truncate">
                      {item.tertiaryMetric}
                    </span>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    Open {item.title}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
