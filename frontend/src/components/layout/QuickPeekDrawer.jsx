import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Zap,
  Search,
  ExternalLink,
  ChevronRight,
  RefreshCw,
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
  ArrowRight,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';

export default function QuickPeekDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
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

  // Fetch live summary data
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getShortcutsSummary();
      if (res?.data) {
        setShortcuts(res.data);
      }
    } catch (err) {
      console.error('Failed to load quick peek shortcuts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && shortcuts.length === 0) {
      loadData();
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Categories
  const categories = useMemo(() => {
    const cats = ['all'];
    shortcuts.forEach((item) => {
      if (item.category && !cats.includes(item.category)) {
        cats.push(item.category);
      }
    });
    return cats;
  }, [shortcuts]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return shortcuts.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const tMatch = item.title?.toLowerCase().includes(q);
        const nMatch = item.number?.includes(q);
        const cMatch = item.category?.toLowerCase().includes(q);
        const dMatch = item.description?.toLowerCase().includes(q);
        return tMatch || nMatch || cMatch || dMatch;
      }
      return true;
    });
  }, [shortcuts, activeCategory, search]);

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-slate-900 text-slate-100 shadow-2xl flex flex-col border-l border-slate-800 animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-800/80 bg-slate-950/80 shrink-0 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white tracking-tight">
                      Quick Pulse & Shortcuts
                    </h2>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Instant micro-summary of all 18 core ERP pillars
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
                  title="Refresh metrics"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-xs font-mono"
                  title="Close (Esc)"
                >
                  <kbd className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-400">
                    ESC
                  </kbd>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Quick find by name or module # (e.g. 17 or repeat)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition capitalize ${
                    activeCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {cat === 'all' ? `All (${shortcuts.length})` : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Drawer Body - Scrollable 18 Modules List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800">
            {loading && shortcuts.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Aggregating live ERP data...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No matching modules found for "{search}"
              </div>
            ) : (
              filteredItems.map((item) => {
                const IconComponent = iconMap[item.icon] || Boxes;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 transition-all duration-150 cursor-pointer group flex items-center justify-between gap-3 shadow-xs"
                  >
                    {/* Left: Icon & Title */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 group-hover:border-emerald-500/50 transition">
                        <IconComponent className="w-4.5 h-4.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                            #{item.number}
                          </span>
                          <h3 className="font-bold text-white text-xs truncate group-hover:text-emerald-400 transition">
                            {item.title}
                          </h3>
                        </div>

                        {/* Summary Metrics */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span className="font-mono font-bold text-slate-200">
                            {item.primaryMetric}
                          </span>
                          <span>•</span>
                          <span className="truncate">{item.secondaryMetric}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Quick Jump */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-700 text-emerald-400">
                        {item.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(item.path);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-emerald-600 text-slate-400 hover:text-white border border-slate-700 hover:border-emerald-500 transition shadow-xs"
                        title="Jump to module"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              18/18 Modules Operational
            </span>
            <button
              onClick={() => handleNavigate('/shortcuts')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs flex items-center gap-1 transition"
            >
              Open Full Cockpit Grid <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
