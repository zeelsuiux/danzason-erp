import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, Search, ShieldCheck, Sparkles, Settings } from 'lucide-react';

export default function Navbar({ onToggleSidebar }) {
  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-all">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 md:hidden transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/70 border border-slate-200/80 text-slate-500 text-xs w-64 md:w-80 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15 focus-within:shadow-sm transition">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search customers, orders, bills, GRN..."
            className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-xs font-medium"
          />
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white border border-slate-200 shadow-2xs">
            /
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
          <span>DANZA-SON ERP</span>
          <span className="text-[10px] text-emerald-600 font-mono font-bold bg-white px-1.5 py-0.2 rounded-full border border-slate-200">
            v2.0
          </span>
        </div>

        <button
          type="button"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl relative transition"
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
        </button>

        <Link
          to="/purchase/settings"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl transition"
          title="Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </Link>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-emerald-400/30">
            D
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-bold text-slate-800 block leading-tight">Danza Admin</span>
            <span className="text-[10px] text-slate-400 block font-medium leading-none mt-0.5">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
