import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
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
  Megaphone,
  TrendingUp,
  Landmark,
  Target,
  ChevronDown,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  // Navigation Group Definitions
  const navigationGroups = [
    {
      id: 'sales',
      title: 'Sales & CRM',
      icon: ShoppingBag,
      items: [
        { name: 'Sales Orders', path: '/sales/quotations', icon: ShoppingBag },
        { name: 'Sales Invoices', path: '/sales/invoices', icon: Receipt },
        { name: 'Customers', path: '/sales/customers', icon: UserCheck },
        { name: 'Leads & Follow-ups', path: '/sales/leads', icon: UserPlus },
        { name: 'Sales / Business Forecasting', path: '/sales/forecasting', icon: TrendingUp },
        { name: 'Repeat Orders', path: '/sales/repeat-orders', icon: RotateCw },
        { name: 'Upsell & Cross-sell', path: '/sales/upsell', icon: Sparkles },
        { name: 'Customer Service & Complaints', path: '/sales/complaints', icon: Headphones },
      ],
    },
    {
      id: 'purchase',
      title: 'Purchase & Procurement',
      icon: ShoppingCart,
      items: [
        { name: 'Purchase Orders', path: '/purchase/orders', icon: ShoppingCart },
        { name: 'Purchase Bills', path: '/purchase/invoices', icon: Receipt },
        { name: 'Suppliers', path: '/purchase/suppliers', icon: Users },
        { name: 'Supplier Quotations', path: '/purchase/inquiries', icon: MessageSquareDiff },
        { name: 'Purchase Returns', path: '/purchase/returns', icon: RotateCcw },
      ],
    },
    {
      id: 'jobwork',
      title: 'Job Work & Processing',
      icon: Scissors,
      items: [
        { name: 'Job Orders (MPO)', path: '/processing/orders', icon: Scissors },
        { name: 'Material Tracking', path: '/processing/material-tracking', icon: Truck },
        { name: 'Job Bills', path: '/processing/bills', icon: Receipt },
        { name: 'Contractors', path: '/processing/contractors', icon: Building },
        { name: 'Job Quotations', path: '/processing/quotations', icon: MessageSquareDiff },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock',
      icon: Layers,
      items: [
        { name: 'Products Catalog', path: '/products', icon: Boxes },
        { name: 'Raw Materials', path: '/raw-materials', icon: Layers },
        { name: 'Stock Ledger', path: '/raw-materials/stock-ledger', icon: FileSpreadsheet },
      ],
    },
    {
      id: 'finance',
      title: 'Finance & Capital',
      icon: WalletCards,
      items: [
        { name: 'Finance Overview', path: '/finance', icon: WalletCards },
        { name: 'Owner Capital & Drawings', path: '/finance/capital', icon: Landmark },
      ],
    },
    {
      id: 'growth',
      title: 'Growth & Planning',
      icon: Target,
      items: [
        { name: 'Target & Goal Management', path: '/growth/targets', icon: Target },
        { name: 'Marketing Dashboard', path: '/marketing', icon: Megaphone },
        { name: 'Sales Forecasting', path: '/sales/forecasting', icon: TrendingUp },
      ],
    },
    {
      id: 'admin',
      title: 'Administration & Access',
      icon: Settings,
      items: [
        { name: 'Team & Access', path: '/team', icon: Award },
        { name: 'Purchase Settings', path: '/purchase/settings', icon: Settings },
      ],
    },
  ];

  // Determine which group should be open based on the current URL
  const getInitialOpenGroup = () => {
    const currentPath = location.pathname.toLowerCase();
    for (const group of navigationGroups) {
      if (group.items.some((item) => currentPath.startsWith(item.path))) {
        return group.id;
      }
    }
    return 'sales'; // Default open group
  };

  // State to manage which accordion section is expanded
  const [openGroup, setOpenGroup] = useState(getInitialOpenGroup);

  // Automatically expand group when URL changes
  useEffect(() => {
    const currentPath = location.pathname.toLowerCase();
    for (const group of navigationGroups) {
      if (group.items.some((item) => currentPath.startsWith(item.path))) {
        setOpenGroup(group.id);
        break;
      }
    }
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setOpenGroup((prev) => (prev === groupId ? null : groupId));
  };

  // Check if group contains the active route
  const isGroupActive = (group) => {
    const currentPath = location.pathname.toLowerCase();
    return group.items.some((item) => currentPath.startsWith(item.path));
  };

  return (
    <>
      {/* Mobile / Tablet overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-gradient-to-b from-slate-950 via-[#0b1329] to-slate-950 text-slate-300 z-40 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Standalone Dashboard Link (Direct 1-click access) */}
          <div className="pb-2 border-b border-slate-800/80 mb-2">
            <NavLink
              to="/dashboard"
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>CEO Command Center</span>
            </NavLink>
          </div>

          {/* Collapsible Accordion Groups */}
          {navigationGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = openGroup === group.id;
            const hasActiveChild = isGroupActive(group);

            return (
              <div
                key={group.id}
                className={`rounded-xl transition-all duration-200 ${
                  isExpanded
                    ? 'bg-slate-900/80 border border-slate-800/90 shadow-xs'
                    : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Accordion Group Header Button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                    hasActiveChild && !isExpanded
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GroupIcon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        hasActiveChild ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-semibold truncate tracking-tight">
                      {group.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {/* Active child dot indicator */}
                    {hasActiveChild && !isExpanded && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" />
                    )}
                    <span className="text-[10px] font-mono text-slate-500 px-1 py-0.2 rounded bg-slate-800/60 font-semibold">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Submenu Items (Rendered smoothly when expanded) */}
                {isExpanded && (
                  <div className="px-2 pb-2 pt-0.5 space-y-0.5 border-t border-slate-800/50 mt-0.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => {
                            if (window.innerWidth < 1024) onClose();
                          }}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <ItemIcon
                                className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                  isActive ? 'text-white' : 'text-slate-500'
                                }`}
                              />
                              <span className="truncate">{item.name}</span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
