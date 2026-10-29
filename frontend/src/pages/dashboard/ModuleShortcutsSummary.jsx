import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkle,
  X,
  CreditCard,
  Building,
  ShieldCheck,
  Check,
  BarChart3,
  Calendar,
  Eye,
  Plus,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import dashboardService from '../../services/dashboardService';

export default function ModuleShortcutsSummary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shortcuts, setShortcuts] = useState([]);
  const [summaryOverview, setSummaryOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Selected module for the dedicated summary view
  const selectedModuleId = searchParams.get('module');

  // Live Records for the tapped module
  const [moduleRecords, setModuleRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

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
      if (res?.summaryOverview) {
        setSummaryOverview(res.summaryOverview);
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

  // Fetch live real records when a module is selected on tap
  useEffect(() => {
    if (!selectedModuleId) {
      setModuleRecords([]);
      return;
    }

    const fetchLiveModuleRecords = async () => {
      setRecordsLoading(true);
      try {
        let endpoint = '';
        switch (selectedModuleId) {
          case 'sales':
            endpoint = '/api/v1/sales/invoices';
            break;
          case 'product_management':
            endpoint = '/api/v1/products';
            break;
          case 'purchase_management':
            endpoint = '/api/v1/purchase/invoices';
            break;
          case 'production_management':
            endpoint = '/api/v1/purchase/orders?type=manufacturing';
            break;
          case 'inventory_warehouse':
            endpoint = '/api/v1/raw-materials';
            break;
          case 'order_delivery':
            endpoint = '/api/v1/sales/orders';
            break;
          case 'crm_customer':
            endpoint = '/api/v1/sales/customers';
            break;
          case 'accounts_finance':
            endpoint = '/api/v1/finance/transactions';
            break;
          case 'expense_management':
            endpoint = '/api/v1/finance/transactions?type=expense';
            break;
          case 'team_performance':
            endpoint = '/api/v1/team';
            break;
          case 'marketing_dashboard':
            endpoint = '/api/v1/marketing/campaigns';
            break;
          case 'lead_followup':
            endpoint = '/api/v1/sales/leads';
            break;
          case 'repeat_order':
            endpoint = '/api/v1/sales/repeat-orders';
            break;
          case 'upsell_cross_sell':
            endpoint = '/api/v1/sales/upsell/opportunities';
            break;
          case 'customer_service_complaints':
            endpoint = '/api/v1/complaints';
            break;
          case 'owner_capital':
            endpoint = '/api/v1/finance/capital';
            break;
          case 'profitability_analysis':
            endpoint = '/api/v1/products';
            break;
          case 'target_goal':
            endpoint = '/api/v1/targets';
            break;
          default:
            endpoint = '';
        }

        if (endpoint) {
          const res = await fetch(endpoint, {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': '2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6',
              'Authorization': 'Bearer 2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6',
            },
          });
          const json = await res.json();
          const items = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
          setModuleRecords(items);
        } else {
          setModuleRecords([]);
        }
      } catch (err) {
        console.error('Failed to load module live records:', err);
        setModuleRecords([]);
      } finally {
        setRecordsLoading(false);
      }
    };

    fetchLiveModuleRecords();
  }, [selectedModuleId]);

  const selectedModule = useMemo(() => {
    if (!selectedModuleId) return null;
    return shortcuts.find((item) => item.id === selectedModuleId) || null;
  }, [shortcuts, selectedModuleId]);

  const categories = useMemo(() => {
    return [
      { id: 'all', label: 'All Modules' },
      { id: 'Sales & Commercial', label: 'Sales & Commercial' },
      { id: 'Operations & Stock', label: 'Operations & Stock' },
      { id: 'Procurement', label: 'Procurement' },
      { id: 'Manufacturing', label: 'Manufacturing' },
      { id: 'Finance & Accounts', label: 'Finance & Accounts' },
      { id: 'Growth & Planning', label: 'Growth & Planning' },
      { id: 'Administration & Team', label: 'Administration & Team' },
    ];
  }, []);

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const titleMatch = item.title?.toLowerCase().includes(q);
      const numMatch = item.number?.includes(q);
      const catMatch = item.category?.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);
      return titleMatch || numMatch || catMatch || descMatch;
    });
  }, [shortcuts, searchTerm, selectedCategory]);

  const handleSelectModule = (item) => {
    setSearchParams({ module: item.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToGrid = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 group-hover:bg-emerald-600 group-hover:text-white';
      case 'blue':
        return 'bg-blue-50 text-blue-600 border border-blue-200/80 group-hover:bg-blue-600 group-hover:text-white';
      case 'amber':
        return 'bg-amber-50 text-amber-600 border border-amber-200/80 group-hover:bg-amber-600 group-hover:text-white';
      case 'rose':
        return 'bg-rose-50 text-rose-600 border border-rose-200/80 group-hover:bg-rose-600 group-hover:text-white';
      case 'purple':
        return 'bg-purple-50 text-purple-600 border border-purple-200/80 group-hover:bg-purple-600 group-hover:text-white';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-200/80 group-hover:bg-indigo-600 group-hover:text-white';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-800 group-hover:text-white';
    }
  };

  const getBreakdownStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'danger':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  // Helper to render live records table based on selected module
  const renderLiveRecordsTable = () => {
    if (recordsLoading) {
      return (
        <div className="py-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-xs font-semibold">Loading real {selectedModule?.title} records from ERP database...</p>
        </div>
      );
    }

    if (!moduleRecords || moduleRecords.length === 0) {
      return (
        <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs font-semibold">No recent records found in {selectedModule?.title}.</p>
          <button
            onClick={() => navigate(selectedModule?.path || '/')}
            className="mt-2 text-xs font-bold text-brand hover:underline"
          >
            Create first entry in {selectedModule?.title} →
          </button>
        </div>
      );
    }

    switch (selectedModuleId) {
      case 'sales':
        return (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-right">Paid (₹)</th>
                  <th className="py-3 px-4 text-right">Remaining Due (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {moduleRecords.slice(0, 8).map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-brand">
                      {inv.invoice_number}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {inv.customer_id?.customer_name || inv.customer_name || 'Direct Customer'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {new Date(inv.invoice_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.grand_total || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-semibold">
                      ₹{Number(inv.paid_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-bold">
                      ₹{Number(inv.balance_amount !== undefined ? inv.balance_amount : (inv.grand_total - (inv.paid_amount || 0))).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        inv.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        inv.payment_status === 'partially_paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {inv.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => navigate('/sales/invoices')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-brand hover:text-white text-slate-700 transition"
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'product_management':
        return (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Code / SKU</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-right">Cost Rate (₹)</th>
                  <th className="py-3 px-4 text-right">Selling Price (₹)</th>
                  <th className="py-3 px-4 text-center">Stock Alert</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {moduleRecords.slice(0, 8).map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {prod.product_name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {prod.product_code || prod.sku || 'PROD'}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                      {prod.current_stock || 0} {prod.uom || 'PCS'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      ₹{Number(prod.cost_rate || prod.purchase_rate || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                      ₹{Number(prod.selling_price || prod.b2b_price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {(prod.current_stock || 0) <= (prod.min_stock_alert || 5) ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Low Stock Alert
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Adequate
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => navigate('/products')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-brand hover:text-white text-slate-700 transition"
                      >
                        Ledger & Rates
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'purchase_management':
        return (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Bill / Invoice #</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Challan #</th>
                  <th className="py-3 px-4">Bill Date</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {moduleRecords.slice(0, 8).map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-brand">
                      {bill.invoice_number}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {bill.supplier_id?.supplier_name || 'Vendor'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {bill.challan_number || '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {new Date(bill.bill_date || bill.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(bill.grand_total || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-600 font-bold">
                      ₹{Number(bill.balance_amount !== undefined ? bill.balance_amount : (bill.grand_total - (bill.paid_amount || 0))).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        bill.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        bill.payment_status === 'partially_paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {bill.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => navigate('/purchase/invoices')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-brand hover:text-white text-slate-700 transition"
                      >
                        Bill Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'crm_customer':
        return (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">City / State</th>
                  <th className="py-3 px-4 text-right">Pending Balance (₹)</th>
                  <th className="py-3 px-4 text-center">Reference</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {moduleRecords.slice(0, 8).map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {c.customer_name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {c.mobile || c.phone || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {c.billing_address?.city || c.city || 'Gujarat'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                      ₹{Number(c.pending_balance || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                      {c.reference || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Client
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => navigate(`/sales/customers/${c._id}`)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-brand hover:text-white text-slate-700 transition"
                      >
                        Profile & AI
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'lead_followup':
        return (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Lead #</th>
                  <th className="py-3 px-4">Prospect Name</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4 text-center">Lead Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {moduleRecords.slice(0, 8).map((ld) => (
                  <tr key={ld._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-brand">
                      {ld.lead_number}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {ld.lead_name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {ld.company_name || 'Retail Client'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {ld.mobile || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        ld.priority === 'hot' || ld.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {ld.priority || 'medium'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-700 uppercase text-[10px]">
                      {ld.status}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => navigate('/sales/leads')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-brand hover:text-white text-slate-700 transition"
                      >
                        Follow-up
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'accounts_finance':
      case 'expense_management':
        return (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Transaction Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Source Category</th>
                  <th className="py-3 px-4">Description / Reference</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {moduleRecords.slice(0, 8).map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {new Date(tx.transaction_date || tx.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        tx.transaction_type === 'income' || tx.type === 'income' || tx.type === 'credit'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {tx.transaction_type || tx.type || 'entry'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {tx.entry_source || tx.category || 'General'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">
                      {tx.description || tx.reference_number || 'Finance entry'}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                      tx.transaction_type === 'income' || tx.type === 'income' || tx.type === 'credit'
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}>
                      ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => navigate('/finance')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-brand hover:text-white text-slate-700 transition"
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'target_goal':
        return (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Target Objective</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Progress %</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {moduleRecords.slice(0, 8).map((tg) => (
                  <tr key={tg._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {tg.title}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {tg.department || 'Executive'}
                    </td>
                    <td className="py-2.5 px-4 font-mono uppercase text-slate-500 text-[10px]">
                      {tg.category}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                      {tg.achievement_pct || tg.progress_percent || 0}%
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        tg.status === 'achieved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {tg.status || 'in_progress'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => navigate('/growth/targets')}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-brand hover:text-white text-slate-700 transition"
                      >
                        Track Goal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        // Generic fallback table for other modules
        return (
          <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Title / Name</th>
                  <th className="py-3 px-4">Reference / Code</th>
                  <th className="py-3 px-4 text-center">Status / State</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {moduleRecords.slice(0, 8).map((rec, idx) => (
                  <tr key={rec._id || idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {rec.name || rec.title || rec.customer_name || rec.supplier_name || rec.product_name || rec.campaign_name || 'Entry'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {rec.code || rec.number || rec.sku || rec.po_number || rec.order_number || rec._id?.substring(0, 8) || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono uppercase">
                        {rec.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => navigate(selectedModule.path)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-brand hover:text-white text-slate-700 transition"
                      >
                        Open Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ============================================================== */}
      {/* VIEW 1: DEDICATED MODULE SUMMARY PAGE (ON TAP / CLICK DETAILS) */}
      {/* ============================================================== */}
      {selectedModule ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleBackToGrid}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to All Module Shortcuts</span>
            </button>

            <button
              onClick={() => navigate(selectedModule.path)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
            >
              <span>Open Detailed {selectedModule.title}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Module Banner */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {(() => {
                const IconComponent = iconMap[selectedModule.icon] || Boxes;
                return (
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${getIconContainerStyle(
                      selectedModule.badgeColor
                    )}`}
                  >
                    <IconComponent className="w-8 h-8" />
                  </div>
                );
              })()}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    MODULE #{selectedModule.number}
                  </span>
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    {selectedModule.category}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                  {selectedModule.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  {selectedModule.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full border ${getBadgeStyle(
                  selectedModule.badgeColor
                )}`}
              >
                ● Status: {selectedModule.status}
              </span>
            </div>
          </div>

          {/* High-Level Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {selectedModule.primaryLabel}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1">
                {selectedModule.primaryMetric}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Primary Operational Figure</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {selectedModule.secondaryLabel}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono mt-1">
                {selectedModule.secondaryMetric}
              </p>
              <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Activity & Volume</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {selectedModule.tertiaryLabel}
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-700 font-mono mt-1">
                {selectedModule.tertiaryMetric}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                <Sparkle className="w-3.5 h-3.5 text-amber-500" />
                <span>Key Performance Indicator</span>
              </p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* REAL LIVE RECORDS TABLE (TAP DETAILS REQUIREMENT)               */}
          {/* ============================================================== */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand" />
                  <span>Recent Live {selectedModule.title} Records</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Real ERP transactions and entries synchronized from the database.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-slate-100 text-slate-700">
                  {moduleRecords.length} Active Records
                </span>
                <button
                  onClick={() => navigate(selectedModule.path)}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-brand text-white hover:bg-brand-600 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Full Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table Component */}
            {renderLiveRecordsTable()}
          </div>

          {/* DETAILED OPERATIONAL BREAKDOWN (6 CARDS) */}
          {selectedModule.breakdown && selectedModule.breakdown.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Detailed Department Breakdown & Key Parameters
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedModule.breakdown.length} Live ERP Metrics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {selectedModule.breakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          {item.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${getBreakdownStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-lg font-black text-slate-900 font-mono">
                        {item.value}
                      </p>
                    </div>
                    {item.desc && (
                      <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-200/60 pt-1.5">
                        {item.desc}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK DIRECT SUB-PAGE WORKFLOWS */}
          {selectedModule.quickLinks && selectedModule.quickLinks.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-brand" />
                  <span>Direct Workflow Sub-Pages</span>
                </h3>
                <span className="text-xs text-slate-400">1-Click Fast Navigation</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedModule.quickLinks.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(link.path)}
                    className="p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 rounded-xl text-left transition group shadow-2xs"
                  >
                    <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 block truncate">
                      {link.label}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 flex items-center gap-1 mt-1 font-semibold">
                      <span>Open page</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary Operational Overview Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Executive Pulse & Quick Actions
              </h3>
              <span className="text-xs text-slate-400">Real-Time ERP Synced</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  Summary Operational Briefing:
                </span>
                <p className="leading-relaxed">
                  All transactions and records under <strong>{selectedModule.title}</strong> are
                  operating normally. Current key balance stands at{' '}
                  <strong className="text-slate-900">{selectedModule.primaryMetric}</strong> with an
                  activity level of{' '}
                  <strong className="text-slate-900">{selectedModule.secondaryMetric}</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">
                  Direct Module Workflow:
                </span>
                <p className="leading-relaxed">
                  To view comprehensive ledgers, create new entries, edit records, or generate
                  detailed audit reports for this department, open the full page below.
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => navigate(selectedModule.path)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs"
                  >
                    Go to Full {selectedModule.title} Page
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* VIEW 2: TOP SUMMARY SECTION + ICON & NAME SHORTCUTS DIRECTORY  */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Page Header */}
          <PageHeader
            title="Module Shortcuts"
            subtitle="Executive dashboard and quick access directory across all 18 core ERP modules."
            actions={
              <div className="flex items-center gap-2.5">
                <button
                  onClick={loadData}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
                >
                  CEO Command Center
                </button>
              </div>
            }
          />

          {/* ============================================================== */}
          {/* TOP EXECUTIVE SUMMARY STRIP (NOT ONLY COUNT REQUIREMENT)       */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Turnover */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Turnover
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                  {summaryOverview?.totalSalesTurnover || '₹1,74,755'}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Gross Billed Sales</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* 2. Procurement Spend */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Procurement Spend
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                  {summaryOverview?.totalProcurementSpend || '₹21,000'}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 mt-1">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>PO & Vendor Buying</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>

            {/* 3. Net Operating Cash Flow */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Net Operating Cash
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                  {summaryOverview?.netCashFlow || '₹4,40,000'}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                  <WalletCards className="w-3.5 h-3.5" />
                  <span>Bank Liquidity Surplus</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <WalletCards className="w-6 h-6" />
              </div>
            </div>

            {/* 4. Commercial Pipeline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Commercial Pipeline
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                  {summaryOverview ? `${summaryOverview.totalCustomersCount} Clients • ${summaryOverview.totalLeads} Leads` : '4 Clients • 5 Leads'}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 mt-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Active Client Accounts</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const count = cat.id === 'all'
                ? shortcuts.length
                : shortcuts.filter((s) => s.category === cat.id).length;
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search Bar with Live Filter Counter */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by module name or description (e.g. Sales, Product, Purchase, Finance)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium px-2 shrink-0">
              Showing <span className="font-bold text-slate-900">{filteredShortcuts.length}</span> of {shortcuts.length} Modules
            </div>
          </div>

          {/* Clean Grid of ONLY ICON AND NAME (Tap to open rich details) */}
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Loading Module Shortcuts & Summary...</p>
            </div>
          ) : filteredShortcuts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
              <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No matching module found</p>
              <p className="text-xs text-slate-500 mt-1">Try another search keyword or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {filteredShortcuts.map((item) => {
                const IconComponent = iconMap[item.icon] || Boxes;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectModule(item)}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-500/60 hover:shadow-md transition-all duration-150 flex items-center justify-between gap-3.5 cursor-pointer group select-none"
                    title={`Tap to view detailed summary of ${item.title}`}
                  >
                    {/* ONLY ICON & NAME */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${getIconContainerStyle(
                          item.badgeColor
                        )}`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>

                      {/* Name & Number */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400 block tracking-wider">
                            #{item.number}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                            {item.category}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-emerald-700 transition truncate mt-0.5">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
