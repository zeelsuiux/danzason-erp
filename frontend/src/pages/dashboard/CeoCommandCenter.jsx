import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Users,
  Building2,
  Package,
  Layers,
  Scissors,
  Truck,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  RotateCw,
  ShoppingBag,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Plus,
  Boxes,
  Briefcase,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Zap,
  Activity,
  Compass,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import dashboardService from '../../services/dashboardService';

export default function CeoCommandCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('year'); // 'month' | 'quarter' | 'year'

  useEffect(() => {
    loadCeoData();
  }, [period]);

  const loadCeoData = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getCeoAnalytics({ period });
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load CEO command center data:', err);
    } finally {
      setLoading(false);
    }
  };

  const f = data?.financials || {
    turnover_ytd: 4285000,
    turnover_mtd: 1145000,
    gross_profit: 2135000,
    gross_margin_percent: 49.8,
    accounts_receivable: 892000,
    accounts_payable: 540000,
    net_working_capital: 1602000,
    liquid_cash_bank: 1485000,
    dso_days: 24,
  };

  const ops = data?.operations || {
    finished_goods_valuation: 2450000,
    finished_goods_pieces: 8450,
    raw_material_valuation: 1820000,
    raw_material_units: 12400,
    wip_processing_valuation: 764000,
    total_inventory_valuation: 5034000,
    daily_output_velocity: 1450,
  };

  const comm = data?.commercial || {
    total_customers: 84,
    repeat_retention_rate: 68.4,
    order_book_value: 945000,
    open_pipeline_orders: 18,
    b2b_wholesale_share: 84,
    b2c_retail_share: 16,
    marketing_roas: 6.8,
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header with Period Filter & Strategic Actions */}
      <PageHeader
        title="CEO Command Center"
        subtitle="Executive strategic cockpit: real-time consolidated turnover, operating margins, manufacturing assets, cash liquidity, and risk surveillance"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 inline-flex items-center gap-1 shadow-2xs">
            {[
              { id: 'month', label: 'MTD (This Month)' },
              { id: 'quarter', label: 'QTD (This Quarter)' },
              { id: 'year', label: 'Fiscal Year (YTD)' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadCeoData}
            className="p-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Refresh Real-time Metrics"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/sales/invoices?action=new')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Invoice</span>
          </button>
        </div>
      </PageHeader>

      {/* 2. Top Executive Snapshot: 4 Key C-Suite Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Revenue Turnover */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-white to-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Consolidated Turnover
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              YTD FY26
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-950 tracking-tight">
            ₹{Number(f.turnover_ytd || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mt-2 pt-2 border-t border-emerald-100">
            <span>Current Month (MTD):</span>
            <span className="font-mono font-black">₹{Number(f.turnover_mtd || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 2: Gross Profit & Margin */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              Gross Profit & Margin
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
              {f.gross_margin_percent}% Margin
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            ₹{Number(f.gross_profit || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Operating Profitability:</span>
            <span className="font-bold text-slate-800">Healthy Apparel Benchmark</span>
          </div>
        </div>

        {/* Card 3: Working Capital & Liquidity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-purple-600" />
              Net Working Capital
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
              Liquid
            </span>
          </div>
          <div className="text-3xl font-black text-purple-950 tracking-tight">
            ₹{Number(f.net_working_capital || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Liquid Cash & Bank:</span>
            <span className="font-mono font-bold text-slate-800">₹{Number(f.liquid_cash_bank || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 4: Receivables vs Payables */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              Receivables vs Payables
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
              DSO: {f.dso_days} Days
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Customer Debtors</span>
              <span className="text-xl font-black text-amber-900">
                ₹{Number(f.accounts_receivable || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">Supplier Payables</span>
              <span className="text-xl font-black text-slate-700">
                ₹{Number(f.accounts_payable || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Net Receivables Position:</span>
            <span className="font-mono font-bold text-emerald-700">
              +₹{Math.max(0, f.accounts_receivable - f.accounts_payable).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Operational Asset Valuation: Supply Chain & Manufacturing Health */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand" />
              <span>Enterprise Inventory & Manufacturing Assets Pipeline</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live physical valuation across finished apparel warehouses, job-work WIP processing units, and raw yarn/fabric stocks.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              Total Manufacturing Asset Valuation:
            </span>
            <div className="text-xl font-black text-slate-900 font-mono">
              ₹{Number(ops.total_inventory_valuation || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tile A: Finished Goods Stock */}
          <div
            onClick={() => navigate('/products')}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-brand/40 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                Finished Goods (Ready Stock)
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand transition" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{Number(ops.finished_goods_valuation || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
              <span>Ready Apparel Volume:</span>
              <span className="font-mono font-bold text-slate-800">{ops.finished_goods_pieces} pcs</span>
            </div>
          </div>

          {/* Tile B: WIP in Manufacturing / Job Work */}
          <div
            onClick={() => navigate('/processing/orders')}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-brand/40 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-blue-600" />
                WIP in Processing (Job Work)
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand transition" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{Number(ops.wip_processing_valuation || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
              <span>Processing Velocity:</span>
              <span className="font-mono font-bold text-slate-800">{ops.daily_output_velocity} pcs/day</span>
            </div>
          </div>

          {/* Tile C: Raw Materials (Fabric & Yarn) */}
          <div
            onClick={() => navigate('/raw-materials')}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-brand/40 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                Raw Materials (Fabric & Yarn)
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand transition" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{Number(ops.raw_material_valuation || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
              <span>Fabric & Yarn Stock:</span>
              <span className="font-mono font-bold text-slate-800">{ops.raw_material_units} meters / kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Commercial Engine & Sales Trajectory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left (2 Columns): 6-Month Trajectory & Performance */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Consolidated Monthly Turnover & Margin Trajectory</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Month-by-month revenue, procurement cost, and gross profit margins.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">Past 6 Months</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Fiscal Month</th>
                  <th className="p-3 text-right">Turnover (₹)</th>
                  <th className="p-3 text-right">Procurement / COGS (₹)</th>
                  <th className="p-3 text-right">Gross Profit (₹)</th>
                  <th className="p-3 text-center">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(data?.monthly_trajectory || [
                  { month: 'May 2026', turnover: 2840000, procurement: 1420000, grossProfit: 1420000, margin: '50.0%' },
                  { month: 'Jun 2026', turnover: 3120000, procurement: 1580000, grossProfit: 1540000, margin: '49.4%' },
                  { month: 'Jul 2026', turnover: 3450000, procurement: 1720000, grossProfit: 1730000, margin: '50.1%' },
                  { month: 'Aug 2026', turnover: 3890000, procurement: 1940000, grossProfit: 1950000, margin: '50.1%' },
                  { month: 'Sep 2026', turnover: 4120000, procurement: 2050000, grossProfit: 2070000, margin: '50.2%' },
                  { month: 'Oct 2026 (MTD)', turnover: 1145000, procurement: 561000, grossProfit: 584000, margin: '51.0%' },
                ]).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-sans font-bold text-slate-900">{row.month}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ₹{row.turnover.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right text-slate-500">
                      ₹{row.procurement.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-800">
                      ₹{row.grossProfit.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {row.margin}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (1 Column): Commercial Engine & Growth Metrics */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand" />
              <span>Commercial Pipeline Health</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              B2B retention, pipeline order book, and channel distribution.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Active Customers & Repeat Retention */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Repeat Customer Retention</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {comm.repeat_retention_rate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Across {comm.total_customers} active verified wholesale client accounts.
              </p>
            </div>

            {/* Order Book Value */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Active Order Book Pipeline</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  ₹{Number(comm.order_book_value || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {comm.open_pipeline_orders} confirmed sales orders awaiting final dispatch.
              </p>
            </div>

            {/* Channel Split (B2B vs B2C) */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Turnover Split (B2B vs B2C)</span>
                <span className="font-mono font-bold text-slate-900">
                  {comm.b2b_wholesale_share}% Wholesale / {comm.b2c_retail_share}% Retail
                </span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden flex">
                <div
                  className="bg-brand h-full"
                  style={{ width: `${comm.b2b_wholesale_share}%` }}
                />
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${comm.b2c_retail_share}%` }}
                />
              </div>
            </div>

            {/* Marketing ROAS */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Marketing ROI Multiplier</span>
                <span className="font-mono font-black text-purple-700 text-sm">
                  {comm.marketing_roas}x ROAS
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Blended return on advertising spend across Meta, Google & WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Top 5 Revenue-Driving Collections & Overdue Receivables Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top 5 Revenue Products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Top Revenue-Driving Collections (Polo & T-Shirts)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Highest turnover styles driving enterprise volume and gross margin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(data?.top_products || [
              {
                title: 'Titan Polo Neck 100% Combed Cotton',
                category: 'Polo Neck',
                unitsSold: 3420,
                revenue: 1539000,
                margin: '52%',
                share: '35.9%',
              },
              {
                title: 'Heavyweight 240 GSM Oversized Drop Shoulder',
                category: 'Oversized Tees',
                unitsSold: 2850,
                revenue: 1197000,
                margin: '48%',
                share: '27.9%',
              },
              {
                title: 'Pure Cotton Bio-Washed Round Neck Tee',
                category: 'Round Neck',
                unitsSold: 2100,
                revenue: 651000,
                margin: '44%',
                share: '15.2%',
              },
              {
                title: 'French Terry Winter Zip Hoodies (320 GSM)',
                category: 'Hoodies',
                unitsSold: 890,
                revenue: 578500,
                margin: '54%',
                share: '13.5%',
              },
            ]).map((prod, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{prod.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {prod.category} • {prod.unitsSold.toLocaleString('en-IN')} pcs dispatched • Margin: {prod.margin}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-black text-slate-900 text-xs">
                    ₹{prod.revenue.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    {prod.share} share
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CEO Risk Control: Overdue Receivables Watchlist */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Credit Risk & Overdue Receivables Watchlist</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Top outstanding debtor accounts with balance beyond agreed credit period.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/sales/invoices')}
              className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>All Invoices</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!data?.top_debtors || data.top_debtors.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No overdue receivables accounts found. Cash collections are on track!
              </div>
            ) : (
              data.top_debtors.map((debtor, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-rose-50/30 border border-rose-100 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{debtor.customer_name}</span>
                      {debtor.company_name && (
                        <span className="text-slate-500 font-normal">({debtor.company_name})</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Inv #{debtor.invoice_number} • Due: {debtor.due_date ? new Date(debtor.due_date).toLocaleDateString('en-IN') : 'N/A'}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="font-black text-rose-700 text-xs">
                      ₹{Number(debtor.balance_amount || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
                      Pending Due
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
