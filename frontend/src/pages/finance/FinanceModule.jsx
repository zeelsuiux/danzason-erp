import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
  Edit2,
  Trash2,
  RotateCcw,
  Layers,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  UserCheck,
  Users,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Printer,
  DollarSign,
  PieChart,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import financeService from '../../services/financeService';

export default function FinanceModule() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: 'overview' | 'all' | 'income' | 'expenses' | 'profitability' | 'reports'
  const currentTab = useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/finance/transactions')) return 'all';
    if (p.includes('/finance/income')) return 'income';
    if (p.includes('/finance/expenses')) return 'expenses';
    if (p.includes('/finance/profitability')) return 'profitability';
    if (p.includes('/finance/reports')) return 'reports';
    const queryTab = searchParams.get('tab');
    if (queryTab && ['overview', 'all', 'income', 'expenses', 'profitability', 'reports'].includes(queryTab)) {
      return queryTab;
    }
    return 'overview';
  }, [location.pathname, searchParams]);

  const setActiveTab = (tab) => {
    if (tab === 'overview') navigate('/finance');
    else if (tab === 'all') navigate('/finance/transactions');
    else if (tab === 'income') navigate('/finance/income');
    else if (tab === 'expenses') navigate('/finance/expenses');
    else if (tab === 'profitability') navigate('/finance/profitability');
    else if (tab === 'reports') navigate('/finance/reports');
    else navigate(`/finance?tab=${tab}`);
  };

  // ======================== STATE ========================
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Profitability Analysis State
  const [profitability, setProfitability] = useState(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [profitCategoryFilter, setProfitCategoryFilter] = useState('all');
  const [profitSubTab, setProfitSubTab] = useState('products'); // 'products' | 'customers' | 'categories' | 'cost_structure' | 'monthly'
  const [productSearch, setProductSearch] = useState('');
  const [productHealthFilter, setProductHealthFilter] = useState('all');

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [filteredTotals, setFilteredTotals] = useState({ income: 0, expenses: 0, net: 0 });

  // Masters
  const [masters, setMasters] = useState({
    incomeCategories: [],
    expenseCategories: [],
    accounts: [],
    paymentMethods: [],
  });

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    datePreset: 'this_month', // 'all', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'custom'
    startDate: '',
    endDate: '',
    source: 'all',
    category: 'all',
    paymentMethod: 'all',
    accountName: 'all',
    status: 'confirmed',
    minAmount: '',
    maxAmount: '',
  });

  // Modals State
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Manual Transaction Form
  const initialForm = {
    transaction_type: 'income',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    category: '',
    party_name: '',
    party_type: 'other',
    payment_method: 'Bank Transfer',
    account_name: 'Primary Bank Account (HDFC Bank - Current A/c #5020001)',
    reference_number: '',
    description: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // Reports Tab State
  const [selectedReportType, setSelectedReportType] = useState('income_vs_expense');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // ======================== LOADERS ========================
  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    loadOverview();
  }, [filters.datePreset, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (currentTab !== 'overview' && currentTab !== 'reports' && currentTab !== 'profitability') {
      loadTransactions(1);
    }
  }, [currentTab, pagination.page, filters]);

  useEffect(() => {
    if (currentTab === 'reports') {
      loadReport();
    }
  }, [currentTab, selectedReportType, filters.datePreset, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (currentTab === 'profitability') {
      loadProfitability();
    }
  }, [currentTab, filters.datePreset, filters.startDate, filters.endDate, profitCategoryFilter]);

  const loadProfitability = async () => {
    try {
      setProfitLoading(true);
      const res = await financeService.getProfitability({
        date_preset: filters.datePreset,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        category: profitCategoryFilter !== 'all' ? profitCategoryFilter : undefined,
      });
      if (res?.data) {
        setProfitability(res.data);
      }
    } catch (err) {
      console.error('Failed to load profitability analysis:', err);
    } finally {
      setProfitLoading(false);
    }
  };

  const loadMasters = async () => {
    try {
      const res = await financeService.getMasters();
      if (res?.data) {
        setMasters(res.data);
      }
    } catch (err) {
      console.error('Failed to load finance masters:', err);
    }
  };

  const loadOverview = async () => {
    try {
      setOverviewLoading(true);
      const res = await financeService.getOverview({
        date_preset: filters.datePreset,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
      });
      if (res?.data) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error('Failed to load finance overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleSyncBills = async () => {
    try {
      setSyncing(true);
      await financeService.syncBills();
      if (currentTab === 'profitability') {
        await loadProfitability();
      } else if (currentTab === 'overview') {
        await loadOverview();
      } else {
        await loadTransactions(1);
      }
    } catch (err) {
      console.error('Failed to sync bills:', err);
    } finally {
      setSyncing(false);
    }
  };

  const loadTransactions = async (page = pagination.page) => {
    try {
      setTxLoading(true);

      let effectiveType = 'all';
      if (currentTab === 'income') effectiveType = 'income';
      if (currentTab === 'expenses') effectiveType = 'expense';

      const res = await financeService.getTransactions({
        page,
        limit: pagination.limit,
        type: effectiveType,
        source: filters.source !== 'all' ? filters.source : undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        payment_method: filters.paymentMethod !== 'all' ? filters.paymentMethod : undefined,
        account_name: filters.accountName !== 'all' ? filters.accountName : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        search: filters.search.trim() || undefined,
        min_amount: filters.minAmount || undefined,
        max_amount: filters.maxAmount || undefined,
        date_preset: filters.datePreset,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
      });

      setTransactions(Array.isArray(res.data) ? res.data : []);
      if (res.meta) {
        setPagination((prev) => ({
          ...prev,
          page: res.meta.page,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        }));
        if (res.meta.filteredTotals) {
          setFilteredTotals(res.meta.filteredTotals);
        }
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      setReportLoading(true);
      const res = await financeService.getReports({
        report_type: selectedReportType,
        date_preset: filters.datePreset,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
      });
      setReportData(res?.data || null);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  // ======================== MODAL HANDLERS ========================
  const handleOpenAddIncome = () => {
    setFormData({
      ...initialForm,
      transaction_type: 'income',
      category: masters.incomeCategories[0] || 'Other Business Income',
      party_name: '',
      party_type: 'customer',
    });
    setFormError('');
    setIsIncomeModalOpen(true);
  };

  const handleOpenAddExpense = () => {
    setFormData({
      ...initialForm,
      transaction_type: 'expense',
      category: masters.expenseCategories[0] || 'Office Rent',
      party_name: '',
      party_type: 'supplier',
    });
    setFormError('');
    setIsExpenseModalOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setSelectedTx(tx);
    setFormData({
      transaction_type: tx.transaction_type,
      amount: tx.amount,
      transaction_date: tx.transaction_date ? tx.transaction_date.split('T')[0] : '',
      category: tx.category,
      party_name: tx.party_name || '',
      party_type: tx.party_type || 'other',
      payment_method: tx.payment_method || 'Bank Transfer',
      account_name: tx.account_name || 'Primary Bank Account (HDFC Bank - Current A/c #5020001)',
      reference_number: tx.reference_number || '',
      description: tx.description || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenView = (tx) => {
    setSelectedTx(tx);
    setIsViewModalOpen(true);
  };

  const handleOpenCancel = (tx) => {
    setSelectedTx(tx);
    setCancelReason('');
    setFormError('');
    setIsCancelModalOpen(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }
    if (!formData.category) {
      setFormError('Please select a category.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');
      if (selectedTx && isEditModalOpen) {
        await financeService.updateTransaction(selectedTx._id, formData);
        setIsEditModalOpen(false);
      } else {
        await financeService.createTransaction(formData);
        setIsIncomeModalOpen(false);
        setIsExpenseModalOpen(false);
      }
      loadOverview();
      loadTransactions(1);
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    try {
      setFormSubmitting(true);
      setFormError('');
      await financeService.cancelTransaction(selectedTx._id, { reason: cancelReason });
      setIsCancelModalOpen(false);
      loadOverview();
      loadTransactions();
    } catch (err) {
      setFormError(err.message || 'Failed to cancel transaction');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      datePreset: 'this_month',
      startDate: '',
      endDate: '',
      source: 'all',
      category: 'all',
      paymentMethod: 'all',
      accountName: 'all',
      status: 'confirmed',
      minAmount: '',
      maxAmount: '',
    });
  };

  const handleExportCSV = (records, filename = 'finance_transactions.csv') => {
    if (!records || records.length === 0) {
      alert('No records available to export.');
      return;
    }
    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Category',
      'Party Name',
      'Source Module',
      'Reference / Bill No',
      'Amount (INR)',
      'Payment Method',
      'Cash / Bank Account',
      'Status',
      'Notes / Description',
    ];
    const rows = records.map((r) => [
      r.transaction_number || r._id,
      r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('en-IN') : '',
      r.transaction_type?.toUpperCase(),
      `"${r.category || ''}"`,
      `"${r.party_name || ''}"`,
      r.entry_source,
      `"${r.reference_number || r.bill_number || ''}"`,
      r.amount,
      r.payment_method,
      `"${r.account_name || ''}"`,
      r.status,
      `"${(r.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatINR = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const handleGenericExportCSV = (records, filename) => {
    if (!records || records.length === 0) {
      alert('No data available to export.');
      return;
    }
    const headers = Object.keys(records[0]);
    const csvRows = [headers.join(',')];
    records.forEach((row) => {
      const values = headers.map((header) => {
        const val = row[header] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportProfitabilityCSV = () => {
    if (!profitability) return;
    if (profitSubTab === 'products') {
      const rows = (profitability.products || []).map((p) => ({
        'Product Name': p.name,
        'SKU / Code': p.code,
        'Category': p.category,
        'Units Sold': p.unitsSold,
        'Avg Selling Price': p.averagePrice,
        'Unit Cost': p.unitCostAvg,
        'Total Turnover': p.revenue,
        'Total Cost (COGS)': p.cost,
        'Gross Profit': p.grossProfit,
        'Gross Margin %': p.grossMargin + '%',
        'Health Status': p.profitStatus,
      }));
      handleGenericExportCSV(rows, 'Product_Profitability_Analysis.csv');
    } else if (profitSubTab === 'customers') {
      const rows = (profitability.customers || []).map((c) => ({
        'Customer Name': c.name,
        'Customer Code': c.code,
        'City': c.city,
        'Invoices': c.invoiceCount,
        'Total Turnover': c.revenue,
        'Garment COGS': c.cost,
        'Gross Profit Contributed': c.profit,
        'Gross Margin %': c.grossMargin + '%',
        'Share of Total Profit %': c.profitSharePct + '%',
        'Client Tier': c.tier,
      }));
      handleGenericExportCSV(rows, 'Customer_80_20_Profitability.csv');
    } else if (profitSubTab === 'categories') {
      const rows = (profitability.categories || []).map((cat) => ({
        'Category': cat.category,
        'Units Sold': cat.units,
        'Turnover': cat.revenue,
        'COGS': cat.cost,
        'Gross Profit': cat.grossProfit,
        'Gross Margin %': cat.grossMargin + '%',
        'Turnover Share %': cat.sharePct + '%',
      }));
      handleGenericExportCSV(rows, 'Category_Profitability_Analysis.csv');
    } else {
      const rows = (profitability.monthlyTrends || []).map((m) => ({
        'Month': m.label || m.key,
        'Turnover': m.revenue,
        'Garment COGS': m.cogs,
        'Overhead OPEX': m.opex,
        'Gross Profit': m.grossProfit,
        'Net Profit': m.netProfit,
        'Gross Margin %': m.grossMarginPct + '%',
        'Net Margin %': m.netMarginPct + '%',
      }));
      handleGenericExportCSV(rows, 'Monthly_Profitability_Trends.csv');
    }
  };

  // ======================== TABLE COLUMNS ========================
  const columns = useMemo(
    () => [
      {
        header: 'Transaction ID & Date',
        key: 'transaction_number',
        cellClassName: 'font-mono text-xs font-bold text-slate-900',
        render: (val, row) => (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-900">{val || 'TX'}</span>
              {!row.is_manual && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  AUTO
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5 font-sans">
              {row.transaction_date ? new Date(row.transaction_date).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
        ),
      },
      {
        header: 'Type',
        key: 'transaction_type',
        render: (val) => (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
              val === 'income'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {val === 'income' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            {val === 'income' ? 'Income / Receipt' : 'Expense / Payment'}
          </span>
        ),
      },
      {
        header: 'Category',
        key: 'category',
        render: (val) => <span className="font-semibold text-slate-800 text-xs">{val}</span>,
      },
      {
        header: 'Party / Source',
        key: 'party_name',
        render: (val, row) => (
          <div>
            <p className="font-bold text-slate-900 text-xs flex items-center gap-1">
              {row.party_type === 'customer' ? (
                <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              ) : row.party_type === 'contractor' ? (
                <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              ) : (
                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              )}
              {val || 'Direct Party'}
            </p>
            <p className="text-[10px] text-slate-400 capitalize mt-0.5">
              Source: {row.entry_source?.replace(/_/g, ' ')}
            </p>
          </div>
        ),
      },
      {
        header: 'Reference',
        key: 'reference_number',
        cellClassName: 'font-mono text-xs text-slate-600',
        render: (val, row) => {
          const ref = val || row.bill_number;
          if (!ref) return <span className="text-slate-300">—</span>;

          let targetUrl = null;
          if (row.entry_source === 'sales_bill' && row.bill_id) {
            targetUrl = `/sales/invoices`;
          } else if (row.entry_source === 'raw_material_purchase' && row.bill_id) {
            targetUrl = `/purchase-bills`;
          } else if (row.entry_source === 'job_work_purchase' && row.bill_id) {
            targetUrl = `/processing/bills`;
          } else if (row.entry_source === 'finished_purchase' && row.bill_id) {
            targetUrl = `/purchase-bills`;
          }

          return targetUrl ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(targetUrl);
              }}
              className="text-brand hover:underline font-bold inline-flex items-center gap-1"
              title="View original bill"
            >
              <span>{ref}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : (
            <span>{ref}</span>
          );
        },
      },
      {
        header: 'Amount',
        key: 'amount',
        cellClassName: 'font-mono text-right',
        render: (val, row) => {
          const isIncome = row.transaction_type === 'income';
          return (
            <div className="text-right">
              <span
                className={`font-extrabold text-sm ${
                  isIncome ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {isIncome ? '+' : '-'}₹{Number(val || 0).toLocaleString('en-IN')}
              </span>
            </div>
          );
        },
      },
      {
        header: 'Payment Method & Account',
        key: 'payment_method',
        render: (val, row) => (
          <div className="text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-slate-400" /> {val || 'Cash'}
            </span>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">
              {row.account_name || 'Main Account'}
            </p>
          </div>
        ),
      },
      {
        header: 'Status',
        key: 'status',
        render: (val) => (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              val === 'confirmed'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200 line-through'
            }`}
          >
            {val === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {val}
          </span>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="space-y-5 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Finance Management"
        subtitle="Unified financial control center: automated income from sales, expenses from purchases, manual ledgers, cash flow, and reports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Finance' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenAddIncome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Income
            </button>

            <button
              type="button"
              onClick={handleOpenAddExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition"
            >
              <Minus className="w-4 h-4" /> Add Expense
            </button>

            <button
              type="button"
              onClick={() => handleExportCSV(transactions)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
              title="Export Current Transactions to CSV"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        }
      />

      {/* Main Tabs Navigation: Overview | All Transactions | Income | Expenses | Reports */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
            currentTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
            currentTab === 'all'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <WalletCards className="w-4 h-4" />
          <span>All Transactions</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200 text-slate-700">
            {currentTab === 'all' ? pagination.total : '•'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
            currentTab === 'income'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          <span>Income</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            currentTab === 'income' ? 'bg-emerald-500/30 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {currentTab === 'income' ? pagination.total : '•'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
            currentTab === 'expenses'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Expenses</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            currentTab === 'expenses' ? 'bg-rose-500/30 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {currentTab === 'expenses' ? pagination.total : '•'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profitability')}
          className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 font-medium ${
            currentTab === 'profitability'
              ? 'bg-emerald-700 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-300" />
          <span>Profitability Analysis</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 font-bold uppercase tracking-wider">
            Live
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
            currentTab === 'reports'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Reports</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: OVERVIEW & DASHBOARD */}
      {/* ==================================================================== */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Quick Filters for Dashboard */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Calendar className="w-4 h-4 text-brand" />
              <span>Reporting Period:</span>
              <select
                value={filters.datePreset}
                onChange={(e) => setFilters({ ...filters, datePreset: e.target.value })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:border-brand"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
                <option value="all">All Time (Life-to-Date)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={loadOverview}
              className="text-xs text-brand font-bold hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh Overview
            </button>
          </div>

          {/* 7 Core KPI Summary Cards (Requirement 6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Income */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Income / Receipts
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-emerald-700 font-mono mt-3">
                ₹{Number(overview?.summary?.totalIncome || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Real cash & bank received</p>
            </div>

            {/* Card 2: Total Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Expenses / Paid
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-rose-700 font-mono mt-3">
                ₹{Number(overview?.summary?.totalExpenses || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Purchases, job work & overheads</p>
            </div>

            {/* Card 3: Net Cash Flow */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Net Cash Flow
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  (overview?.summary?.netCashFlow || 0) >= 0
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className={`text-2xl font-extrabold font-mono mt-3 ${
                (overview?.summary?.netCashFlow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {(overview?.summary?.netCashFlow || 0) >= 0 ? '+' : '-'}₹{Math.abs(overview?.summary?.netCashFlow || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Receipts minus Payments</p>
            </div>

            {/* Card 4: Closing Balance */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-md border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Closing Cash & Bank
                </span>
                <div className="w-8 h-8 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center">
                  <WalletCards className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-white font-mono mt-3">
                ₹{Number(overview?.summary?.closingBalance || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Opening ₹{Number(overview?.summary?.openingBalance || 0).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Card 5: Total Receivables */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Receivables
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-blue-700 font-mono mt-3">
                ₹{Number(overview?.summary?.totalReceivables || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Pending customer invoices</p>
            </div>

            {/* Card 6: Total Payables */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Payables
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-amber-700 font-mono mt-3">
                ₹{Number(overview?.summary?.totalPayables || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">RM, Finished & Job Work dues</p>
            </div>

            {/* Card 7: Payables Segmentation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Payables Breakdown by Purchase Type
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                  <span className="text-[10px] text-blue-700 font-bold block">Raw Material</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    ₹{Number(overview?.summary?.payablesBreakdown?.rawMaterial || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold block">Finished Goods</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    ₹{Number(overview?.summary?.payablesBreakdown?.finished || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                  <span className="text-[10px] text-amber-700 font-bold block">Job Work Processing</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">
                    ₹{Number(overview?.summary?.payablesBreakdown?.jobWork || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trends Table & Visual Bars */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Monthly Cash Flow Trend (Last 6 Months)</h4>
                <p className="text-xs text-slate-500">Comparative track of actual receipts vs payments</p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                Accrual Protected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
              {(overview?.monthlyTrends || []).map((m) => (
                <div key={m.key} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">{m.month}</span>
                  <div className="text-[11px] font-mono">
                    <span className="text-emerald-700 block font-semibold">+₹{m.income.toLocaleString('en-IN')}</span>
                    <span className="text-rose-700 block font-semibold">-₹{m.expense.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200 text-[10px] font-mono font-bold">
                    <span className={m.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      Net: ₹{m.net.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Recent Financial Transactions</h4>
                <p className="text-xs text-slate-500">Latest confirmed payments & receipts</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="text-xs text-brand font-bold hover:underline flex items-center gap-1"
              >
                View All Ledger <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {(overview?.recentTransactions || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No financial transactions recorded yet. Click '+ Add Income' or '+ Add Expense' to record your first entry.
                </div>
              ) : (
                overview.recentTransactions.map((tx) => (
                  <div key={tx._id} className="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/80 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        tx.transaction_type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.transaction_type === 'income' ? '+' : '-'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{tx.party_name || 'Party'}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-slate-600">{tx.transaction_number}</span>
                          <span>•</span>
                          <span>{tx.category}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{new Date(tx.transaction_date).toLocaleDateString('en-IN')}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-extrabold text-sm block ${
                        tx.transaction_type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {tx.transaction_type === 'income' ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        via {tx.payment_method}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TABS 2, 3, 4: ALL TRANSACTIONS / INCOME / EXPENSES */}
      {/* ==================================================================== */}
      {(currentTab === 'all' || currentTab === 'income' || currentTab === 'expenses') && (
        <div className="space-y-4">
          {/* Complete Rich Filtering Bar (Requirement 7) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="flex items-center gap-2 w-full sm:w-80 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search party, ID, bill, UTR ref..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 font-medium"
                />
              </div>

              {/* Date Preset Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={filters.datePreset}
                  onChange={(e) => setFilters({ ...filters, datePreset: e.target.value })}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="last_week">Last Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_year">This Year</option>
                  <option value="custom">Custom Date Range</option>
                  <option value="all">All Dates</option>
                </select>

                {filters.datePreset === 'custom' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  title="Reset all filters"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Secondary Granular Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              {/* Source Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Source Module</label>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
                >
                  <option value="all">All Sources</option>
                  <option value="manual">Manual Entries Only</option>
                  <option value="sales_bill">Sales Invoices</option>
                  <option value="raw_material_purchase">Raw Material Purchase</option>
                  <option value="finished_purchase">Finished Goods Purchase</option>
                  <option value="job_work_purchase">Job Work / Processing</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
                >
                  <option value="all">All Categories</option>
                  {[...masters.incomeCategories, ...masters.expenseCategories].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Payment Method</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
                >
                  <option value="all">All Methods</option>
                  {masters.paymentMethods.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
                >
                  <option value="confirmed">Confirmed Only</option>
                  <option value="cancelled">Cancelled Only</option>
                  <option value="all">All (Confirmed + Cancelled)</option>
                </select>
              </div>

              {/* Amount Range */}
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Min ₹</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Max ₹</label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Filtered Totals Summary Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/50 p-2 rounded-lg">
              <span>Matching Filter Results: {pagination.total} Records</span>
              <div className="flex items-center gap-4 font-mono">
                {(currentTab === 'all' || currentTab === 'income') && (
                  <span className="text-emerald-700">
                    Receipts: ₹{filteredTotals.income.toLocaleString('en-IN')}
                  </span>
                )}
                {(currentTab === 'all' || currentTab === 'expenses') && (
                  <span className="text-rose-700">
                    Payments: ₹{filteredTotals.expenses.toLocaleString('en-IN')}
                  </span>
                )}
                {currentTab === 'all' && (
                  <span className={filteredTotals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    Net: {filteredTotals.net >= 0 ? '+' : '-'}₹{Math.abs(filteredTotals.net).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Transaction Ledger Table (Requirement 8) */}
          <DataTable
            columns={columns}
            data={transactions}
            loading={txLoading}
            pagination={pagination}
            onPageChange={(p) => loadTransactions(p)}
            onRowClick={(row) => handleOpenView(row)}
            emptyMessage="No financial transactions match the selected filters."
            actions={(tx) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenView(tx)}
                  className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                  title="View Transaction Details & Audit Trail"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {tx.is_manual && tx.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(tx)}
                    className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                    title="Edit Manual Transaction"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}

                {tx.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleOpenCancel(tx)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Cancel & Reverse Transaction"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: FINANCIAL REPORTS SUITE (Requirement 11) */}
      {/* ==================================================================== */}
      {currentTab === 'reports' && (
        <div className="space-y-5">
          {/* Reports Header & Report Type Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Financial Reports & Statements</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a report type and date range to view actual ledger summaries or export to CSV.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filters.datePreset}
                  onChange={(e) => setFilters({ ...filters, datePreset: e.target.value })}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-brand"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_year">This Year</option>
                  <option value="all">All Dates</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (Array.isArray(reportData)) {
                      handleExportCSV(reportData, `${selectedReportType}_report.csv`);
                    } else {
                      window.print();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 transition shadow-sm"
                >
                  <Download className="w-4 h-4" /> Export Report
                </button>
              </div>
            </div>

            {/* Report Type Pills */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
              {[
                { id: 'income_vs_expense', label: 'Income vs Expense Summary' },
                { id: 'income_report', label: 'Detailed Income Report' },
                { id: 'expense_report', label: 'Detailed Expense Report' },
                { id: 'category_expense', label: 'Category-wise Expenses' },
                { id: 'customer_receipts', label: 'Customer Receipts Summary' },
                { id: 'supplier_payments', label: 'Supplier Payments Summary' },
                { id: 'receivables_summary', label: 'Outstanding Receivables (Customers)' },
                { id: 'payables_summary', label: 'Outstanding Payables (Suppliers)' },
                { id: 'job_work_payments', label: 'Job Work Processing Payments' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReportType(r.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    selectedReportType === r.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Report Viewer Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5">
            {reportLoading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">Generating financial statement...</p>
              </div>
            ) : selectedReportType === 'income_vs_expense' ? (
              <div className="space-y-6 max-w-2xl mx-auto py-4">
                <div className="text-center space-y-1">
                  <h4 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                    Danza-Son Apparel — Cash Flow Statement
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Period: {filters.datePreset.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-200 text-sm">
                  <div className="p-3.5 px-5 flex items-center justify-between bg-emerald-50/50">
                    <span className="font-bold text-emerald-900 flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-emerald-600" /> Total Operational Receipts (Income)
                    </span>
                    <span className="font-mono font-extrabold text-emerald-800 text-base">
                      ₹{Number(reportData?.totalIncome || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3.5 px-5 flex items-center justify-between bg-rose-50/50">
                    <span className="font-bold text-rose-900 flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-rose-600" /> Total Operational Payments (Expenses)
                    </span>
                    <span className="font-mono font-extrabold text-rose-800 text-base">
                      ₹{Number(reportData?.totalExpenses || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-4 px-5 flex items-center justify-between bg-slate-900 text-white font-bold">
                    <span className="text-sm">Net Cash Surplus / (Deficit)</span>
                    <span className="font-mono text-lg text-emerald-400">
                      ₹{Number(reportData?.netSurplus || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ) : Array.isArray(reportData) && reportData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No financial data found for this report within the selected date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Reference / Name</th>
                      <th className="p-3">Details / Category</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                      <th className="p-3">Date / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(reportData) &&
                      reportData.map((item, idx) => {
                        const name = item.party_name || item._id || item.invoice_number || 'Record';
                        const details = item.category || item.remarks || item.customer_id?.customer_name || item.supplier_id?.supplier_name || 'Details';
                        const amt = item.amount || item.totalAmount || item.totalReceived || item.totalPaid || item.balance_amount || 0;
                        const date = item.transaction_date || item.lastReceiptDate || item.lastPaymentDate || item.due_date;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-3 font-bold text-slate-900">{typeof name === 'object' ? JSON.stringify(name) : name}</td>
                            <td className="p-3 text-slate-600">{details}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                              ₹{Number(amt).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              {date ? new Date(date).toLocaleDateString('en-IN') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: COMPREHENSIVE PROFITABILITY ANALYSIS & MARGIN ENGINE */}
      {/* ==================================================================== */}
      {currentTab === 'profitability' && (
        <div className="space-y-6">
          {/* Header & Controls Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      Profitability & Margin Analysis
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        Profitability Analysis
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time Garment COGS, Gross Margin %, Operating EBITDA, 80/20 Customer Pareto, and Break-Even Analysis
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-500 ml-2" />
                  <select
                    value={filters.datePreset}
                    onChange={(e) => setFilters({ ...filters, datePreset: e.target.value })}
                    className="px-2.5 py-1.5 text-xs font-bold bg-transparent text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_year">This Year</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSyncBills}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                  title="Recalculate & Sync from Billing Invoices"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Sync Invoices</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportProfitabilityCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {profitLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-semibold text-slate-700">Calculating Garment Margins & Profitability...</p>
              <p className="text-xs text-slate-400 mt-1">Aggregating Sales Invoices, COGS, and Overhead Ledgers</p>
            </div>
          ) : (
            <>
              {/* TOP 6 EXECUTIVE KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* 1. Gross Revenue */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Sales</span>
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <ShoppingBag className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {formatINR(profitability?.summary?.grossRevenue)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{profitability?.summary?.totalUnitsSold || 0} PCS Sold</span>
                    <span className="font-semibold text-slate-700">{profitability?.summary?.totalInvoices || 0} Invoices</span>
                  </div>
                </div>

                {/* 2. Direct Garment COGS */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total COGS</span>
                    <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <Layers className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-900">
                    {formatINR(profitability?.summary?.totalCOGS)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Direct Materials & Garment Manufacturing
                  </div>
                </div>

                {/* 3. Gross Profit & Margin */}
                <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Gross Profit</span>
                    <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-700">
                    {formatINR(profitability?.summary?.grossProfit)}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800">
                      {profitability?.summary?.grossMarginPercentage || 0}% Margin
                    </span>
                    <div className="w-16 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, profitability?.summary?.grossMarginPercentage || 0))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 4. Operating Overhead (OPEX) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Overhead OPEX</span>
                    <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-rose-900">
                    {formatINR(profitability?.summary?.operatingExpenses)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Salaries, Rent, Power & Logistics
                  </div>
                </div>

                {/* 5. Net Operating Profit / EBITDA */}
                <div className={`p-4 rounded-2xl border shadow-2xs ${
                  (profitability?.summary?.netProfit || 0) >= 0
                    ? 'bg-white border-emerald-300'
                    : 'bg-white border-amber-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Profit</span>
                    <span className={`p-1.5 rounded-lg ${
                      (profitability?.summary?.netProfit || 0) >= 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <WalletCards className="w-4 h-4" />
                    </span>
                  </div>
                  <div className={`text-xl font-bold font-mono ${
                    (profitability?.summary?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-amber-800'
                  }`}>
                    {formatINR(profitability?.summary?.netProfit)}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-600">
                    Net Margin: {profitability?.summary?.netMarginPercentage || 0}%
                  </div>
                </div>

                {/* 6. Break-Even Target */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Break-Even Sales</span>
                    <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-purple-900">
                    {formatINR(profitability?.summary?.breakEvenRevenue)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Revenue to Cover All Overheads
                  </div>
                </div>
              </div>

              {/* PROFITABILITY SUB-TABS NAVIGATION */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
                {[
                  { id: 'products', label: 'Garment / Product Margins', sub: 'Profit by Product', icon: ShoppingBag },
                  { id: 'customers', label: '80/20 Customer Pareto', sub: 'Profit by Customer', icon: Users },
                  { id: 'categories', label: 'Category Breakdown', sub: 'Category Breakdown', icon: Layers },
                  { id: 'cost_structure', label: 'Cost Structure Waterfall', sub: 'Cost Distribution', icon: BarChart3 },
                  { id: 'monthly', label: 'Monthly Trends', sub: 'Monthly Trends', icon: Calendar },
                ].map((st) => {
                  const Icon = st.icon;
                  const isActive = profitSubTab === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setProfitSubTab(st.id)}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-2 shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{st.label}</span>
                      <span className={`text-[10px] font-normal ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                        ({st.sub})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ============================================================ */}
              {/* SUB-VIEW 1: PRODUCT / GARMENT MARGINS */}
              {/* ============================================================ */}
              {profitSubTab === 'products' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search product or SKU..."
                          className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-brand w-56"
                        />
                      </div>

                      <select
                        value={productHealthFilter}
                        onChange={(e) => setProductHealthFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
                      >
                        <option value="all">All Margins</option>
                        <option value="High Margin">High Margin (&gt; 35%)</option>
                        <option value="Healthy">Healthy (20% - 35%)</option>
                        <option value="Low Margin">Low Margin (0% - 20%)</option>
                        <option value="Loss">Loss (&lt; 0%)</option>
                      </select>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      Showing {
                        (profitability?.products || []).filter((p) => {
                          const matchSearch = (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
                            (p.code || '').toLowerCase().includes(productSearch.toLowerCase());
                          const matchHealth = productHealthFilter === 'all' || p.profitStatus === productHealthFilter;
                          return matchSearch && matchHealth;
                        }).length
                      } garments
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Garment / Product</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-right">Units Sold</th>
                          <th className="p-3 text-right">Avg Selling Price</th>
                          <th className="p-3 text-right">Unit Cost (COGS)</th>
                          <th className="p-3 text-right">Turnover</th>
                          <th className="p-3 text-right">Total Cost</th>
                          <th className="p-3 text-right">Gross Profit</th>
                          <th className="p-3 text-right">Margin %</th>
                          <th className="p-3 text-center">Profit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(profitability?.products || [])
                          .filter((p) => {
                            const matchSearch = (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
                              (p.code || '').toLowerCase().includes(productSearch.toLowerCase());
                            const matchHealth = productHealthFilter === 'all' || p.profitStatus === productHealthFilter;
                            return matchSearch && matchHealth;
                          })
                          .map((prod, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 font-bold text-slate-900">
                                <div>{prod.name}</div>
                                <span className="font-mono text-[10px] text-slate-400 font-normal">{prod.code}</span>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                  {prod.category}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                {prod.unitsSold}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-700">
                                {formatINR(prod.averagePrice)}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-500">
                                {formatINR(prod.unitCostAvg)}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                {formatINR(prod.revenue)}
                              </td>
                              <td className="p-3 text-right font-mono text-amber-900">
                                {formatINR(prod.cost)}
                              </td>
                              <td className={`p-3 text-right font-mono font-bold ${
                                prod.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}>
                                {formatINR(prod.grossProfit)}
                              </td>
                              <td className="p-3 text-right">
                                <span className={`font-mono font-bold ${
                                  prod.grossMargin >= 35
                                    ? 'text-emerald-700'
                                    : prod.grossMargin >= 20
                                    ? 'text-teal-700'
                                    : prod.grossMargin >= 0
                                    ? 'text-amber-700'
                                    : 'text-rose-600'
                                }`}>
                                  {prod.grossMargin}%
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  prod.profitStatus === 'High Margin'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : prod.profitStatus === 'Healthy'
                                    ? 'bg-teal-100 text-teal-800'
                                    : prod.profitStatus === 'Low Margin'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {prod.profitStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* SUB-VIEW 2: CUSTOMER 80/20 PARETO ATTRIBUTION */}
              {/* ============================================================ */}
              {profitSubTab === 'customers' && (
                <div className="space-y-4">
                  {/* Pareto Insight Alert */}
                  <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wider">
                        80/20 Pareto Profit Rule
                      </h4>
                      <p className="text-xs text-indigo-900/80 mt-1">
                        In wholesale distribution, Tier 1 clients typically contribute the top 80% of revenue and net margin.
                        Prioritize credit and delivery allocation to high-margin Tier 1 buyers below.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Customer / Buyer</th>
                            <th className="p-3">Location</th>
                            <th className="p-3 text-right">Invoices</th>
                            <th className="p-3 text-right">Invoiced Sales</th>
                            <th className="p-3 text-right">Garment COGS</th>
                            <th className="p-3 text-right">Profit Contribution</th>
                            <th className="p-3 text-right">Margin %</th>
                            <th className="p-3 text-right">Profit Share</th>
                            <th className="p-3 text-center">Tier Classification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(profitability?.customers || []).map((cust, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 font-bold text-slate-900">
                                <div>{cust.name}</div>
                                <span className="font-mono text-[10px] text-slate-400 font-normal">{cust.code}</span>
                              </td>
                              <td className="p-3 text-slate-600">{cust.city}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-800">{cust.invoiceCount}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                {formatINR(cust.revenue)}
                              </td>
                              <td className="p-3 text-right font-mono text-amber-900">
                                {formatINR(cust.cost)}
                              </td>
                              <td className={`p-3 text-right font-mono font-bold ${
                                cust.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}>
                                {formatINR(cust.profit)}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-800">
                                {cust.grossMargin}%
                              </td>
                              <td className="p-3 text-right font-mono text-slate-600">
                                {cust.profitSharePct}%
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  cust.tier?.includes('Tier 1')
                                    ? 'bg-purple-100 text-purple-800'
                                    : cust.tier?.includes('Tier 2')
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {cust.tier}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* SUB-VIEW 3: CATEGORY PROFITABILITY BREAKDOWN */}
              {/* ============================================================ */}
              {profitSubTab === 'categories' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(profitability?.categories || []).map((cat, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{cat.category}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md">
                            {cat.units} PCS Sold
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Turnover</div>
                            <div className="text-sm font-bold font-mono text-slate-900">{formatINR(cat.revenue)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Gross Profit</div>
                            <div className="text-sm font-bold font-mono text-emerald-700">{formatINR(cat.grossProfit)}</div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>Gross Margin</span>
                            <span className="font-bold text-emerald-700">{cat.grossMargin}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, cat.grossMargin))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* SUB-VIEW 4: COST STRUCTURE WATERFALL */}
              {/* ============================================================ */}
              {profitSubTab === 'cost_structure' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Company Expenditure Waterfall</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Breakdown of total company expenditures between Direct COGS and Operating Overheads.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {(profitability?.costStructure || []).map((cs, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cs.type === 'cogs' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                            <span>{cs.name}</span>
                          </span>
                          <span className="font-mono">
                            {formatINR(cs.amount)} <span className="text-slate-400 font-normal">({cs.percentage}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cs.type === 'cogs' ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, cs.percentage))}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* SUB-VIEW 5: MONTHLY TRENDS */}
              {/* ============================================================ */}
              {profitSubTab === 'monthly' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="font-bold text-slate-900 text-sm">Month-over-Month Profitability Timeline</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Monthly history of Gross Sales, Material Costs, Business Expenses, and Net Profit.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Month</th>
                          <th className="p-3 text-right">Units Sold</th>
                          <th className="p-3 text-right">Total Sales</th>
                          <th className="p-3 text-right">Material Cost</th>
                          <th className="p-3 text-right">Expenses</th>
                          <th className="p-3 text-right">Gross Profit</th>
                          <th className="p-3 text-right">Profit Margin %</th>
                          <th className="p-3 text-right">Net Profit</th>
                          <th className="p-3 text-right">Net Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(profitability?.monthlyTrends || []).map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-bold text-slate-900">{m.label || m.key}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">{m.units}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">{formatINR(m.revenue)}</td>
                            <td className="p-3 text-right font-mono text-amber-900">{formatINR(m.cogs)}</td>
                            <td className="p-3 text-right font-mono text-rose-800">{formatINR(m.opex)}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatINR(m.grossProfit)}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">{m.grossMarginPct}%</td>
                            <td className={`p-3 text-right font-mono font-bold ${
                              m.netProfit >= 0 ? 'text-emerald-700' : 'text-amber-800'
                            }`}>
                              {formatINR(m.netProfit)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">{m.netMarginPct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD / EDIT TRANSACTION (MANUAL INCOME & EXPENSE) */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isIncomeModalOpen || isExpenseModalOpen || isEditModalOpen}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setIsExpenseModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={
          isEditModalOpen
            ? `Edit Transaction: ${selectedTx?.transaction_number}`
            : formData.transaction_type === 'income'
            ? 'Add Manual Income / Receipt'
            : 'Add Manual Expense / Payment'
        }
        size="lg"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4 text-sm">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g. 5000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                Transaction Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-brand outline-none"
              >
                <option value="">Select Category</option>
                {(formData.transaction_type === 'income'
                  ? masters.incomeCategories
                  : masters.expenseCategories
                ).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                {formData.transaction_type === 'income' ? 'Received From (Payer)' : 'Paid To (Payee / Vendor)'}
              </label>
              <input
                type="text"
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                placeholder={formData.transaction_type === 'income' ? 'Client or payer name' : 'Vendor or recipient name'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-brand outline-none"
              >
                {masters.paymentMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Cash / Bank Account</label>
              <select
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-brand outline-none"
              >
                {masters.accounts.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">Reference / Cheque / UTR Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="e.g. UTR-829104, CHQ-0021, etc."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">Description & Notes</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Internal remarks regarding this financial transaction..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsIncomeModalOpen(false);
                setIsExpenseModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className={`px-5 py-2 rounded-xl text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm ${
                formData.transaction_type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {formSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isEditModalOpen ? 'Save Changes' : formData.transaction_type === 'income' ? 'Record Income' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: VIEW TRANSACTION DETAILS & AUDIT LOG (Requirement 8) */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Transaction Details: ${selectedTx?.transaction_number || 'Details'}`}
        size="lg"
      >
        {selectedTx && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount Transacted</span>
                <span
                  className={`text-2xl font-extrabold font-mono ${
                    selectedTx.transaction_type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {selectedTx.transaction_type === 'income' ? '+' : '-'}₹{Number(selectedTx.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    selectedTx.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedTx.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedTx.category}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Party</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedTx.party_name}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Source Module</span>
                <span className="font-semibold text-slate-700 capitalize mt-0.5 block">
                  {selectedTx.entry_source?.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Reference / Bill</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                  {selectedTx.reference_number || selectedTx.bill_number || 'Direct Entry'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Mode</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedTx.payment_method}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Account</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">{selectedTx.account_name}</span>
              </div>
            </div>

            {selectedTx.description && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Notes / Description</span>
                <p className="text-slate-700 font-medium whitespace-pre-wrap">{selectedTx.description}</p>
              </div>
            )}

            {/* Audit Trail */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Immutable Audit History
              </span>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-[11px]">
                {(selectedTx.audit_history || []).map((h, i) => (
                  <div key={i} className="p-2.5 bg-white flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">{h.action}</span>
                      <span className="text-slate-500">{h.reason}</span>
                    </div>
                    <div className="text-right font-mono text-[10px] text-slate-400">
                      <span>{new Date(h.changed_at).toLocaleString('en-IN')}</span>
                      <span className="block text-slate-500 font-bold">{h.changed_by}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: REVERSE / CANCEL TRANSACTION (Requirement 9) */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Confirm Reversal & Cancellation"
        size="md"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Financial Audit Reversal Notice</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Cancelling this transaction will reverse ₹{Number(selectedTx?.amount || 0).toLocaleString('en-IN')} and restore the associated invoice balance. This action cannot be erased from the audit log.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">
              Reason for Cancellation / Reversal <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Provide a mandatory reason for this reversal..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-brand outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Nevermind
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition flex items-center gap-1.5 shadow-sm"
            >
              {formSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Confirm Reversal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
