import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Package,
  Search,
  Sparkles,
  PhoneCall,
  LayoutDashboard,
  Truck,
  CheckCircle,
} from 'lucide-react';

export default function VisitorNavbar({ cartCount = 0, onOpenCart }) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      {/* Top micro banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white text-[11px] font-medium py-1.5 px-4 text-center tracking-wide">
        <span className="text-emerald-400 font-bold mr-1">Danza Son Activewear:</span> Direct B2B Wholesale & Retail Portal | Minimum Order 1 Box | Fast Pan-India Dispatch
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/store" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40 group-hover:scale-105 transition-transform">
            D
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight block">
                DANZA-SON
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded border border-emerald-300">
                STORE
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase block -mt-1">
              Ur Path Ur Style
            </span>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-600">
          <Link
            to="/store"
            className={`px-3 py-2 rounded-xl transition ${
              location.pathname === '/store' || location.pathname === '/'
                ? 'bg-emerald-50 text-emerald-800'
                : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Catalog
          </Link>
          <Link
            to="/track"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              location.pathname === '/track'
                ? 'bg-emerald-50 text-emerald-800'
                : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Track Order</span>
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {/* Cart / Inquiry button */}
          {onOpenCart && (
            <button
              onClick={onOpenCart}
              type="button"
              className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Bulk Inquiry</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Quick link to Admin ERP Dashboard */}
          <Link
            to="/sales/orders"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-xs font-bold transition shadow-2xs"
            title="Open Admin ERP Portal"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Admin ERP</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
