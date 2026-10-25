import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  ShieldCheck,
  Sparkles,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const userInitial = (user?.name?.[0] || 'D').toUpperCase();

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-all">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 lg:hidden transition"
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

        {/* User Profile Dropdown */}
        <div className="relative pl-3 border-l border-slate-200" ref={dropdownRef}>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100/80 transition text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-emerald-400/30">
                {userInitial}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight group-hover:text-emerald-700 transition">
                  {user?.name || 'Danza User'}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium leading-none mt-0.5 uppercase">
                  {user?.role || 'Staff'} • {user?.department || 'ERP'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition hidden sm:block" />
            </button>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              Sign In
            </Link>
          )}

          {/* Dropdown Menu */}
          {isDropdownOpen && isAuthenticated && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    {user?.role || 'User'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 truncate max-w-[140px]">
                    {user?.department || 'Danza Son'}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/purchase/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>ERP Settings & Masters</span>
                </Link>

                <Link
                  to="/team"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
                >
                  <Building className="w-4 h-4 text-slate-400" />
                  <span>Team & Organization</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out of Danza Son ERP</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
