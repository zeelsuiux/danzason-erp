import React, { useEffect, useState, useMemo } from 'react';
import {
  WalletCards,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Search,
  Filter,
  Download,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Clock,
  Sparkles,
  Printer,
  DollarSign,
  HelpCircle,
  Scissors,
  Tag,
  Building,
  Landmark,
  ShieldCheck,
  X,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import capitalService from '../../services/capitalService';

export default function OwnerCapitalManagement() {
  // ======================== STATE ========================
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'infusions' | 'drawings' | 'goods' | 'profit'
  const [search, setSearch] = useState('');
  const [fyFilter, setFyFilter] = useState('2026-2027');

  // Modal 1: Capital Infusion
  const [isInfusionModalOpen, setIsInfusionModalOpen] = useState(false);
  const [infusionSubmitting, setInfusionSubmitting] = useState(false);
  const [infusionError, setInfusionError] = useState('');
  const initialInfusionForm = {
    owner_name: 'Zeel Patel (Managing Director)',
    entry_type: 'capital_infusion',
    amount: 500000,
    date: new Date().toISOString().split('T')[0],
    payment_mode: 'bank_transfer',
    bank_or_cash_account: 'HDFC Bank Ltd - Current A/C #4409',
    reference_number: '',
    purpose_or_reason: 'Additional capital infusion for machine modernization & fabric working capital',
    financial_year: '2026-2027',
    notes: '',
  };
  const [infusionForm, setInfusionForm] = useState(initialInfusionForm);

  // Modal 2: Owner Drawing
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [drawingSubmitting, setDrawingSubmitting] = useState(false);
  const [drawingError, setDrawingError] = useState('');
  const initialDrawingForm = {
    owner_name: 'Zeel Patel (Managing Director)',
    entry_type: 'drawing_bank', // 'drawing_bank' | 'drawing_cash' | 'drawing_goods'
    amount: 100000,
    date: new Date().toISOString().split('T')[0],
    payment_mode: 'bank_transfer',
    bank_or_cash_account: 'HDFC Bank Ltd - Current A/C #4409',
    reference_number: '',
    purpose_or_reason: 'Personal and household drawings from capital account',
    goods_product_name: '100% Bio-Wash Round Neck T-Shirt',
    goods_quantity: 50,
    goods_cost_price: 180,
    financial_year: '2026-2027',
    notes: '',
  };
  const [drawingForm, setDrawingForm] = useState(initialDrawingForm);

  // Modal 3: Voucher View / Print Slip
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // ======================== LOADERS ========================
  useEffect(() => {
    loadEntries();
    loadStats();
  }, [activeTab, fyFilter]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const params = {
        financial_year: fyFilter !== 'all' ? fyFilter : undefined,
        entry_type: activeTab !== 'all' ? activeTab : undefined,
        search: search.trim() || undefined,
        limit: 100,
      };
      const res = await capitalService.getCapitalEntries(params);
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load capital entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const res = await capitalService.getCapitalStats();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load capital stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // ======================== HANDLERS ========================
  const handleOpenInfusionModal = () => {
    setInfusionForm(initialInfusionForm);
    setInfusionError('');
    setIsInfusionModalOpen(true);
  };

  const handleOpenDrawingModal = () => {
    setDrawingForm(initialDrawingForm);
    setDrawingError('');
    setIsDrawingModalOpen(true);
  };

  const handleInfusionSubmit = async (e) => {
    e.preventDefault();
    setInfusionError('');
    if (!infusionForm.amount || Number(infusionForm.amount) <= 0) {
      setInfusionError('Please enter a valid capital amount.');
      return;
    }
    if (!infusionForm.purpose_or_reason.trim()) {
      setInfusionError('Please enter the purpose or reason.');
      return;
    }

    try {
      setInfusionSubmitting(true);
      await capitalService.createCapitalEntry({
        ...infusionForm,
        amount: Number(infusionForm.amount),
        tax_treatment: 'Equity capital introduced by promoter - Added to capital ledger account.',
      });
      setIsInfusionModalOpen(false);
      loadEntries();
      loadStats();
    } catch (err) {
      setInfusionError(err.message || 'Failed to record capital infusion.');
    } finally {
      setInfusionSubmitting(false);
    }
  };

  const handleDrawingSubmit = async (e) => {
    e.preventDefault();
    setDrawingError('');

    let finalAmount = Number(drawingForm.amount);
    let goodsItems = [];

    if (drawingForm.entry_type === 'drawing_goods') {
      const qty = Number(drawingForm.goods_quantity || 0);
      const cost = Number(drawingForm.goods_cost_price || 0);
      if (qty <= 0 || cost <= 0) {
        setDrawingError('Please enter valid quantity and unit cost price for goods drawing.');
        return;
      }
      finalAmount = qty * cost;
      goodsItems = [
        {
          product_name: drawingForm.goods_product_name,
          quantity: qty,
          unit: 'pcs',
          unit_cost_price: cost,
          total_cost: finalAmount,
        },
      ];
    } else {
      if (finalAmount <= 0) {
        setDrawingError('Please enter a valid withdrawal amount.');
        return;
      }
    }

    try {
      setDrawingSubmitting(true);
      await capitalService.createCapitalEntry({
        owner_name: drawingForm.owner_name,
        entry_type: drawingForm.entry_type,
        amount: finalAmount,
        date: drawingForm.date,
        payment_mode:
          drawingForm.entry_type === 'drawing_goods'
            ? 'stock_adjustment'
            : drawingForm.payment_mode,
        bank_or_cash_account:
          drawingForm.entry_type === 'drawing_goods'
            ? 'Finished Goods Inventory Account'
            : drawingForm.bank_or_cash_account,
        reference_number: drawingForm.reference_number,
        purpose_or_reason: drawingForm.purpose_or_reason,
        goods_items: goodsItems,
        financial_year: drawingForm.financial_year,
        tax_treatment:
          drawingForm.entry_type === 'drawing_goods'
            ? 'Garment stock drawn for personal use at factory cost price - GST reversal treated'
            : 'Personal drawings from owner capital - Non tax-deductible under Sec 40(b)',
        notes: drawingForm.notes,
      });
      setIsDrawingModalOpen(false);
      loadEntries();
      loadStats();
    } catch (err) {
      setDrawingError(err.message || 'Failed to record owner drawing.');
    } finally {
      setDrawingSubmitting(false);
    }
  };

  const handleViewVoucher = (voucher) => {
    setSelectedVoucher(voucher);
    setIsVoucherModalOpen(true);
  };

  const handleCancelVoucher = async (voucher) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel / reverse voucher ${voucher.voucher_number} for ₹${Number(
          voucher.amount
        ).toLocaleString('en-IN')}?`
      )
    )
      return;
    try {
      await capitalService.cancelCapitalEntry(voucher._id);
      loadEntries();
      loadStats();
    } catch (err) {
      alert(`Could not cancel voucher: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (!entries.length) {
      alert('No capital or drawing entries to export.');
      return;
    }

    const headers = [
      'Voucher Number',
      'Date',
      'Owner / Partner',
      'Entry Type',
      'Direction',
      'Amount (₹)',
      'Payment Mode',
      'Account',
      'Reference #',
      'Purpose',
      'Status',
    ];

    const rows = entries.map((e) => [
      `"${e.voucher_number || ''}"`,
      `"${new Date(e.date).toLocaleDateString('en-IN')}"`,
      `"${e.owner_name || ''}"`,
      `"${e.entry_type || ''}"`,
      `"${e.transaction_direction || ''}"`,
      e.amount || 0,
      `"${e.payment_mode || ''}"`,
      `"${e.bank_or_cash_account || ''}"`,
      `"${e.reference_number || ''}"`,
      `"${(e.purpose_or_reason || '').replace(/"/g, '""')}"`,
      `"${e.status || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DanzaSon_Owner_Capital_Ledger_${fyFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered entries for search
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase().trim();
    return entries.filter(
      (e) =>
        e.voucher_number?.toLowerCase().includes(q) ||
        e.owner_name?.toLowerCase().includes(q) ||
        e.purpose_or_reason?.toLowerCase().includes(q) ||
        e.bank_or_cash_account?.toLowerCase().includes(q) ||
        e.reference_number?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // Entry Type Badge Helper
  const getEntryTypeBadge = (type, direction) => {
    switch (type) {
      case 'capital_infusion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Plus className="w-3 h-3 text-emerald-600" /> Capital Infusion
          </span>
        );
      case 'profit_allocation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600" /> Net Profit Share
          </span>
        );
      case 'interest_on_capital':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <TrendingUp className="w-3 h-3 text-indigo-600" /> Interest on Capital
          </span>
        );
      case 'drawing_bank':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Minus className="w-3 h-3 text-amber-600" /> Bank Drawing
          </span>
        );
      case 'drawing_cash':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
            <Minus className="w-3 h-3 text-orange-600" /> Cash Drawing
          </span>
        );
      case 'drawing_goods':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <Scissors className="w-3 h-3 text-rose-600" /> Garment Stock Drawing
          </span>
        );
      case 'director_remuneration':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Director Salary
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Voucher # & Date',
      key: 'voucher_number',
      render: (_, e) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-black text-slate-900">{e.voucher_number}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {new Date(e.date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      ),
    },
    {
      header: 'Owner / Partner & Reason',
      key: 'owner_name',
      render: (_, e) => (
        <div className="space-y-1 max-w-[280px]">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{e.owner_name}</span>
          </div>
          <div className="text-xs text-slate-600 font-medium line-clamp-1" title={e.purpose_or_reason}>
            {e.purpose_or_reason}
          </div>
          {e.goods_items?.length > 0 && (
            <div className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded inline-block">
              Stock: {e.goods_items[0].product_name} ({e.goods_items[0].quantity} {e.goods_items[0].unit})
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Transaction Type',
      key: 'entry_type',
      render: (_, e) => (
        <div className="space-y-1">
          <div>{getEntryTypeBadge(e.entry_type, e.transaction_direction)}</div>
          <div className="text-[10px] text-slate-500 font-mono">
            {e.payment_mode.replace(/_/g, ' ').toUpperCase()}
          </div>
        </div>
      ),
    },
    {
      header: 'Bank / Cash Account',
      key: 'account',
      render: (_, e) => (
        <div className="space-y-0.5 text-xs text-slate-700 max-w-[200px]">
          <div className="font-semibold truncate">{e.bank_or_cash_account}</div>
          {e.reference_number && (
            <div className="font-mono text-[10px] text-slate-500">Ref: {e.reference_number}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Amount (₹)',
      key: 'amount',
      className: 'text-right',
      render: (_, e) => {
        const isCredit = e.transaction_direction === 'credit';
        return (
          <div className="space-y-0.5 text-right">
            <div
              className={`font-mono text-sm font-black ${
                isCredit ? 'text-emerald-700' : 'text-amber-800'
              }`}
            >
              {isCredit ? '+' : '-'}₹{Number(e.amount || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isCredit ? 'Capital Infused' : 'Drawings Debit'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (_, e) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(ev) => ev.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleViewVoucher(e)}
            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-1 shadow-2xs"
            title="View & Print Official Voucher Slip"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Voucher
          </button>
          <button
            type="button"
            onClick={() => handleCancelVoucher(e)}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Cancel / Reverse Voucher"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full font-sans pb-10">
      {/* Top Page Header */}
      <PageHeader
        title="Owner Withdrawal & Capital Management"
        subtitle="Manage promoter equity capital infusion, partner drawings (cash, bank & stock), profit allocations, and net capital balances."
        breadcrumbs={[
          { label: 'Finance & Accounts', link: '/finance' },
          { label: 'Capital & Drawings' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export Ledger
            </button>
            <button
              type="button"
              onClick={handleOpenDrawingModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
            >
              <Minus className="w-4 h-4" /> Record Owner Drawing
            </button>
            <button
              type="button"
              onClick={handleOpenInfusionModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Record Capital Infusion
            </button>
          </div>
        }
      />

      {/* Top 5 Summary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Net Capital Balance */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Net Capital Balance</span>
            <Landmark className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 truncate">
            {statsLoading ? '...' : `₹${Number(stats?.netCapitalBalance || 0).toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-bold">
            Total Equity & Retained Capital
          </div>
        </div>

        {/* Total Capital Introduced */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-soft">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Capital Infused</span>
            <Plus className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-900 truncate">
            {statsLoading ? '...' : `₹${Number(stats?.totalCapitalInfused || 0).toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            Promoter & partner capital fund
          </div>
        </div>

        {/* Total Owner Drawings */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-soft">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Total Drawings (ઉપાડ)</span>
            <Minus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-900 truncate">
            {statsLoading ? '...' : `₹${Number(stats?.totalDrawings || 0).toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            Bank ₹{Number(stats?.totalBankDrawings || 0).toLocaleString('en-IN')} • Cash ₹{Number(stats?.totalCashDrawings || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Retained Profits Added */}
        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 shadow-soft">
          <div className="flex items-center justify-between text-purple-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Retained Net Profits</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-900 truncate">
            {statsLoading ? '...' : `₹${Number(stats?.totalProfitsAllocated || 0).toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-purple-700 mt-1 font-medium">
            Audited P&L profit transferred
          </div>
        </div>

        {/* Withdrawal vs Profit Ratio */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 shadow-soft">
          <div className="flex items-center justify-between text-blue-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Withdrawal Ratio</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-900">
            {statsLoading ? '...' : `${stats?.withdrawalVsProfitPct || 0}%`}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 font-medium">
            {Number(stats?.withdrawalVsProfitPct || 0) < 50
              ? '✅ Safe Liquidity Zone (<50%)'
              : '⚠️ High Withdrawal Alert'}
          </div>
        </div>
      </div>

      {/* Main Ledger Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        {/* Navigation Filter Tabs */}
        <div className="flex border-b border-slate-200 px-4 pt-2 gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Ledger Transactions' },
            { id: 'infusions', label: 'Capital Infusions (+)' },
            { id: 'drawings', label: 'Owner Drawings (-)' },
            { id: 'drawing_goods', label: 'Stock / Goods Drawings' },
            { id: 'profit_allocation', label: 'Profit Allocations' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap -mb-[1px] ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Financial Year Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Voucher #, owner name, reason, bank account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Financial Year:</span>
            <select
              value={fyFilter}
              onChange={(e) => setFyFilter(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none"
            >
              <option value="2026-2027">FY 2026-2027</option>
              <option value="2025-2026">FY 2025-2026</option>
              <option value="all">All Financial Years</option>
            </select>
          </div>
        </div>

        {/* Ledger DataTable */}
        <DataTable
          columns={columns}
          data={filteredEntries}
          loading={loading}
          emptyMessage="No capital transactions or drawings found."
        />
      </div>

      {/* ======================== MODAL 1: RECORD CAPITAL INFUSION ======================== */}
      <Modal
        isOpen={isInfusionModalOpen}
        onClose={() => setIsInfusionModalOpen(false)}
        title="Record Capital Infusion (+ મૂડી ઉમેરો)"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleInfusionSubmit} className="space-y-4">
          {infusionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{infusionError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Owner Name */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Partner / Owner Name</label>
              <input
                type="text"
                required
                value={infusionForm.owner_name}
                onChange={(e) => setInfusionForm({ ...infusionForm, owner_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-semibold text-xs"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Capital Infusion Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 500000"
                value={infusionForm.amount}
                onChange={(e) => setInfusionForm({ ...infusionForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-mono text-xs font-bold text-emerald-700"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={infusionForm.date}
                onChange={(e) => setInfusionForm({ ...infusionForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={infusionForm.payment_mode}
                onChange={(e) => setInfusionForm({ ...infusionForm, payment_mode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-white"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash Infusion</option>
                <option value="journal_entry">Journal Entry</option>
              </select>
            </div>

            {/* Bank or Cash Account */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Credited Account</label>
              <select
                value={infusionForm.bank_or_cash_account}
                onChange={(e) =>
                  setInfusionForm({ ...infusionForm, bank_or_cash_account: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-white"
              >
                <option value="HDFC Bank Ltd - Current A/C #4409">HDFC Bank Ltd - Current A/C #4409</option>
                <option value="SBI Current A/C #8812">SBI Current A/C #8812</option>
                <option value="Main Factory Cash Vault">Main Factory Cash Vault</option>
              </select>
            </div>

            {/* Reference Number */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Bank Reference / UTR Number</label>
              <input
                type="text"
                placeholder="e.g. HDFC-RTGS-992837"
                value={infusionForm.reference_number}
                onChange={(e) =>
                  setInfusionForm({ ...infusionForm, reference_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none font-mono text-xs"
              />
            </div>

            {/* Purpose */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Purpose / Remarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="2"
                required
                placeholder="e.g. Additional capital introduced for festival fabric purchase"
                value={infusionForm.purpose_or_reason}
                onChange={(e) =>
                  setInfusionForm({ ...infusionForm, purpose_or_reason: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInfusionModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={infusionSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-50"
            >
              {infusionSubmitting ? 'Saving...' : 'Record Capital Infusion'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================== MODAL 2: RECORD OWNER DRAWING ======================== */}
      <Modal
        isOpen={isDrawingModalOpen}
        onClose={() => setIsDrawingModalOpen(false)}
        title="Record Owner Drawing (- ઉપાડ નોંધો)"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleDrawingSubmit} className="space-y-4">
          {drawingError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{drawingError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Owner Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Partner / Owner</label>
              <input
                type="text"
                required
                value={drawingForm.owner_name}
                onChange={(e) => setDrawingForm({ ...drawingForm, owner_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none font-semibold text-xs"
              />
            </div>

            {/* Drawing Type */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Withdrawal Type</label>
              <select
                value={drawingForm.entry_type}
                onChange={(e) => setDrawingForm({ ...drawingForm, entry_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-white"
              >
                <option value="drawing_bank">Bank Withdrawal (Personal Drawings)</option>
                <option value="drawing_cash">Cash Vault Withdrawal</option>
                <option value="drawing_goods">Apparel / Garment Stock (At Cost)</option>
              </select>
            </div>

            {/* If Stock Drawing */}
            {drawingForm.entry_type === 'drawing_goods' ? (
              <>
                <div className="sm:col-span-2 p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-3">
                  <span className="font-bold text-rose-900 block text-xs">
                    Garment Stock Withdrawal Details
                  </span>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Garment Item Name</label>
                    <input
                      type="text"
                      value={drawingForm.goods_product_name}
                      onChange={(e) =>
                        setDrawingForm({ ...drawingForm, goods_product_name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Quantity (Pcs)</label>
                      <input
                        type="number"
                        min="1"
                        value={drawingForm.goods_quantity}
                        onChange={(e) =>
                          setDrawingForm({ ...drawingForm, goods_quantity: e.target.value })
                        }
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono text-xs font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Factory Unit Cost (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={drawingForm.goods_cost_price}
                        onChange={(e) =>
                          setDrawingForm({ ...drawingForm, goods_cost_price: e.target.value })
                        }
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono text-xs font-bold bg-white"
                      />
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs font-black text-rose-900">
                    Total Stock Debit: ₹
                    {(
                      Number(drawingForm.goods_quantity || 0) * Number(drawingForm.goods_cost_price || 0)
                    ).toLocaleString('en-IN')}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Amount */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Withdrawal Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 100000"
                    value={drawingForm.amount}
                    onChange={(e) => setDrawingForm({ ...drawingForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-amber-500 font-mono text-xs font-bold text-amber-800"
                  />
                </div>

                {/* Source Account */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Debited Account</label>
                  <select
                    value={drawingForm.bank_or_cash_account}
                    onChange={(e) =>
                      setDrawingForm({ ...drawingForm, bank_or_cash_account: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold bg-white"
                  >
                    <option value="HDFC Bank Ltd - Current A/C #4409">HDFC Bank Ltd - Current A/C #4409</option>
                    <option value="SBI Current A/C #8812">SBI Current A/C #8812</option>
                    <option value="Main Factory Cash Vault">Main Factory Cash Vault</option>
                  </select>
                </div>
              </>
            )}

            {/* Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={drawingForm.date}
                onChange={(e) => setDrawingForm({ ...drawingForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold"
              />
            </div>

            {/* Reference */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Cheque / UTR / Cash Voucher #</label>
              <input
                type="text"
                placeholder="e.g. CHQ-882910"
                value={drawingForm.reference_number}
                onChange={(e) =>
                  setDrawingForm({ ...drawingForm, reference_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none font-mono text-xs"
              />
            </div>

            {/* Purpose */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Reason / Purpose of Withdrawal <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Personal household expenses, children education fees, travel..."
                value={drawingForm.purpose_or_reason}
                onChange={(e) =>
                  setDrawingForm({ ...drawingForm, purpose_or_reason: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-semibold"
              />
            </div>

            {/* Tax treatment notice */}
            <div className="sm:col-span-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Note: Personal drawings are non-deductible as business expenditure under Section 40(b) of
                the Income Tax Act.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDrawingModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={drawingSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition shadow-sm disabled:opacity-50"
            >
              {drawingSubmitting ? 'Recording...' : 'Record Owner Drawing'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================== MODAL 3: OFFICIAL VOUCHER SLIP (PRINT READY) ======================== */}
      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Official Capital / Drawing Voucher Slip"
        maxWidth="max-w-xl"
      >
        {selectedVoucher && (
          <div className="space-y-5 text-xs font-sans">
            {/* Printable Voucher Paper */}
            <div className="p-6 border-2 border-slate-800 rounded-2xl bg-white shadow-sm space-y-4">
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    DANZA-SON APPARELS & TEXTILES
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Plot 104, Surat Textile Park, Surat, Gujarat • GSTIN: 24AAACD1234F1Z5
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white inline-block">
                    {selectedVoucher.voucher_number}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Date: {new Date(selectedVoucher.date).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Title & Type */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  VOUCHER TYPE:
                </span>
                <span className="font-black text-xs text-slate-900 uppercase">
                  {selectedVoucher.entry_type.replace(/_/g, ' ')} (
                  {selectedVoucher.transaction_direction.toUpperCase()})
                </span>
              </div>

              {/* Grid of Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Partner / Owner:
                  </span>
                  <span className="font-bold text-slate-900">{selectedVoucher.owner_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Payment Mode:
                  </span>
                  <span className="font-mono font-bold text-slate-800 uppercase">
                    {selectedVoucher.payment_mode.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Account Head:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedVoucher.bank_or_cash_account}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Reference / Ref #:
                  </span>
                  <span className="font-mono text-slate-800 font-bold">
                    {selectedVoucher.reference_number || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Purpose Narration */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Narration / Purpose:
                </span>
                <p className="text-xs text-slate-800 font-medium">
                  {selectedVoucher.purpose_or_reason}
                </p>
              </div>

              {/* Total Amount Box */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    {selectedVoucher.transaction_direction === 'credit'
                      ? 'Total Capital Infusion'
                      : 'Total Drawings Debit'}
                  </span>
                </div>
                <div className="font-mono text-xl font-black text-emerald-900">
                  ₹{Number(selectedVoucher.amount).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                  Partner / Owner Signature
                </div>
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                  Authorized Signatory / Accounts
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher Slip
              </button>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
