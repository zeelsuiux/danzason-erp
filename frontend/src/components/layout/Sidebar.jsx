import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Users,
  Settings,
  MessageSquareDiff,
  ShoppingCart,
  Receipt,
  RotateCcw,
  UserCheck,
  ShoppingBag,
  Boxes,
  FileSpreadsheet,
  Layers,
  Scissors,
  Truck,
  Building,
  WalletCards,
  UserPlus,
  Award,
  Sparkles,
  RotateCw,
  Headphones,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  // 1. Purchase (Raw Material & Products combined)
  const purchaseMenuItems = [
    { name: 'Suppliers', path: '/purchase/suppliers', icon: Users },
    { name: 'Quotations', path: '/purchase/inquiries', icon: MessageSquareDiff },
    { name: 'Purchase Orders', path: '/purchase/orders', icon: ShoppingCart },
    { name: 'Purchase Bills', path: '/purchase/invoices', icon: Receipt },
    { name: 'Purchase Returns', path: '/purchase/returns', icon: RotateCcw },
    { name: 'Settings', path: '/purchase/settings', icon: Settings },
  ];

  // 2. Job Work (Contractors & Manufacturing)
  const jobWorkMenuItems = [
    { name: 'Contractors', path: '/processing/contractors', icon: Building },
    { name: 'Job Quotations', path: '/processing/quotations', icon: MessageSquareDiff },
    { name: 'Job Orders (MPO)', path: '/processing/orders', icon: Scissors },
    { name: 'Material Tracking', path: '/processing/material-tracking', icon: Truck },
    { name: 'Job Bills', path: '/processing/bills', icon: Receipt },
  ];

  // 3. Inventory & Catalog
  const catalogMenuItems = [
    { name: 'Products', path: '/products', icon: Boxes },
    { name: 'Raw Materials', path: '/raw-materials', icon: Layers },
    { name: 'Stock Ledger', path: '/raw-materials/stock-ledger', icon: FileSpreadsheet },
  ];

  // 4. Sales & CRM
  const salesMenuItems = [
    { name: 'Leads & Follow-ups', path: '/sales/leads', icon: UserPlus },
    { name: 'Customers', path: '/sales/customers', icon: UserCheck },
    { name: 'Sales Orders', path: '/sales/quotations', icon: ShoppingBag },
    { name: 'Sales Invoices', path: '/sales/invoices', icon: Receipt },
    { name: 'Upsell & Cross-sell', path: '/sales/upsell', icon: Sparkles },
    { name: 'Repeat Orders', path: '/sales/repeat-orders', icon: RotateCw },
    { name: 'Customer Service & Complaints', path: '/sales/complaints', icon: Headphones },
  ];

  // 5. Finance
  const financeMenuItems = [
    { name: 'Finance', path: '/finance', icon: WalletCards },
  ];

  // 6. Team & Performance
  const teamMenuItems = [
    { name: 'Team & Performance', path: '/team', icon: Award },
  ];

  const renderNavGroup = (title, items) => (
    <div className="space-y-1">
      <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
        {title}
      </div>

      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-gradient-to-b from-slate-950 via-[#0b1329] to-slate-950 text-slate-300 z-40 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex flex-col border-r border-slate-800/80 shadow-2xl`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-700 flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/30">
              D
            </div>
            <div>
              <span className="font-bold text-white text-[15px] tracking-tight block">
                DANZA-SON
              </span>
              <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase block -mt-0.5 flex items-center gap-1">
                Ur Path Ur Style
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* 1. Purchase (Raw Material & Products combined) */}
          {renderNavGroup('Purchase', purchaseMenuItems)}

          {/* 2. Job Work */}
          {renderNavGroup('Job Work', jobWorkMenuItems)}

          {/* 3. Inventory & Catalog */}
          {renderNavGroup('Inventory & Catalog', catalogMenuItems)}

          {/* 4. Sales & CRM */}
          {renderNavGroup('Sales & CRM', salesMenuItems)}

          {/* 5. Finance */}
          {renderNavGroup('Finance', financeMenuItems)}

          {/* 6. Team & Performance */}
          {renderNavGroup('Team & Access', teamMenuItems)}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
          <NavLink
            to="/purchase/settings"
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 hover:bg-slate-800/80 hover:border-slate-700 transition group"
            title="Settings"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-slate-600">
                  AD
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">Administrator</p>
                <p className="text-[10px] text-slate-400 truncate font-mono">admin@danzaerp.com</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition shrink-0" />
          </NavLink>
        </div>
      </aside>
    </>
  );
}
