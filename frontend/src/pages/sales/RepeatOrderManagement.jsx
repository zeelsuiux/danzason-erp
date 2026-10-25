import React, { useEffect, useState, useMemo } from 'react';
import {
  RotateCw,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ShoppingBag,
  UserCheck,
  Search,
  Filter,
  Plus,
  Phone,
  MessageSquare,
  Mail,
  FileText,
  ChevronRight,
  Boxes,
  Check,
  X,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
  ChevronDown,
  Building2,
  Users,
  Award,
  Zap,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import repeatOrderService from '../../services/repeatOrderService';

export default function RepeatOrderManagement() {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'cadence' | 'quick_reorder'
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [repeatOrders, setRepeatOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pastInvoices, setPastInvoices] = useState([]);

  // Filters for Pipeline Tab
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLogContactModalOpen, setIsLogContactModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Log Contact Form State
  const [contactForm, setContactForm] = useState({
    channel: 'phone',
    outcome: 'interested',
    summary: '',
    logged_by: 'Key Account Manager',
  });

  // Create / Schedule Order Form State
  const [createForm, setCreateForm] = useState({
    customer_id: '',
    customer_name: '',
    company_name: '',
    phone: '',
    email: '',
    product_id: '',
    product_name: '',
    sku: '',
    color: 'Jet Black',
    repeat_frequency_days: 30,
    loyalty_discount_percent: 5,
    unit_price: 450,
    sizes: { S: 25, M: 60, L: 65, XL: 30, '2XL': 20 },
    priority: 'medium',
    notes: '',
  });

  // 1-Click Quick Reorder Form State
  const [quickForm, setQuickForm] = useState({
    selected_invoice_id: '',
    repeat_frequency_days: 30,
    loyalty_discount_percent: 5,
  });

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, ordersRes, custRes, prodRes, invRes] = await Promise.all([
        repeatOrderService.getAnalytics().catch(() => ({ data: null })),
        repeatOrderService.getRepeatOrders().catch(() => ({ data: [] })),
        repeatOrderService.getCustomers({ limit: 100 }).catch(() => ({ data: [] })),
        repeatOrderService.getProducts({ limit: 100 }).catch(() => ({ data: [] })),
        repeatOrderService.getPastInvoices({ limit: 50 }).catch(() => ({ data: [] })),
      ]);

      if (analyticsRes?.data) setAnalytics(analyticsRes.data);
      if (ordersRes?.data) setRepeatOrders(ordersRes.data);
      if (custRes?.data) setCustomers(Array.isArray(custRes.data) ? custRes.data : custRes.data.customers || []);
      if (prodRes?.data) setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || []);
      if (invRes?.data) setPastInvoices(Array.isArray(invRes.data) ? invRes.data : invRes.data.invoices || []);
    } catch (err) {
      console.error('Failed to load repeat orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered orders for Pipeline
  const filteredOrders = useMemo(() => {
    return repeatOrders.filter((ro) => {
      if (statusFilter !== 'all' && ro.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && ro.priority !== priorityFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const matchesName = (ro.customer_name || '').toLowerCase().includes(s);
        const matchesCompany = (ro.company_name || '').toLowerCase().includes(s);
        const matchesNumber = (ro.repeat_order_number || '').toLowerCase().includes(s);
        const matchesPhone = (ro.phone || '').toLowerCase().includes(s);
        const matchesProduct = (ro.items || []).some((it) => (it.product_name || '').toLowerCase().includes(s));
        if (!matchesName && !matchesCompany && !matchesNumber && !matchesPhone && !matchesProduct) return false;
      }
      return true;
    });
  }, [repeatOrders, statusFilter, priorityFilter, search]);

  // Customer Cadence Grouping
  const customerCadences = useMemo(() => {
    const map = new Map();
    repeatOrders.forEach((ro) => {
      const cId = ro.customer_id?._id || ro.customer_id || ro.customer_name;
      if (!map.has(cId)) {
        map.set(cId, {
          customer_id: cId,
          customer_name: ro.customer_name,
          company_name: ro.company_name,
          phone: ro.phone,
          email: ro.email,
          orders_count: 0,
          total_revenue: 0,
          frequencies: [],
          latest_status: ro.status,
          next_expected_date: ro.expected_reorder_date,
          active_order: ro,
        });
      }
      const record = map.get(cId);
      record.orders_count += 1;
      record.total_revenue += Number(ro.final_amount || 0);
      record.frequencies.push(Number(ro.repeat_frequency_days || 30));
    });

    return Array.from(map.values()).map((c) => {
      const avgFreq = Math.round(c.frequencies.reduce((a, b) => a + b, 0) / Math.max(1, c.frequencies.length));
      return {
        ...c,
        avg_frequency_days: avgFreq,
      };
    });
  }, [repeatOrders]);

  // Handle Create Repeat Order
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const totalQ = Object.values(createForm.sizes).reduce((acc, q) => acc + Number(q || 0), 0);
      const payload = {
        customer_id: createForm.customer_id,
        customer_name: createForm.customer_name,
        company_name: createForm.company_name,
        phone: createForm.phone,
        email: createForm.email,
        repeat_frequency_days: Number(createForm.repeat_frequency_days),
        loyalty_discount_percent: Number(createForm.loyalty_discount_percent),
        priority: createForm.priority,
        notes: createForm.notes,
        items: [
          {
            product_id: createForm.product_id || null,
            product_name: createForm.product_name,
            sku: createForm.sku,
            color: createForm.color,
            sizes: createForm.sizes,
            quantity: totalQ,
            unit_price: Number(createForm.unit_price),
            total_price: totalQ * Number(createForm.unit_price),
          },
        ],
      };

      await repeatOrderService.createRepeatOrder(payload);
      setIsCreateModalOpen(false);
      loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to create repeat order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Quick Generate from past Invoice
  const handleQuickReorderSubmit = async (e) => {
    e.preventDefault();
    if (!quickForm.selected_invoice_id) {
      alert('Please select a past invoice to replicate');
      return;
    }
    try {
      setActionLoading(true);
      await repeatOrderService.generateFromPastOrder({
        invoice_id: quickForm.selected_invoice_id,
        repeat_frequency_days: Number(quickForm.repeat_frequency_days),
        loyalty_discount_percent: Number(quickForm.loyalty_discount_percent),
      });
      alert('Repeat order generated successfully!');
      setActiveTab('pipeline');
      loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to generate repeat order');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Log Contact
  const handleLogContactSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      await repeatOrderService.logContact(selectedOrder._id, contactForm);
      setIsLogContactModalOpen(false);
      setContactForm({
        channel: 'phone',
        outcome: 'interested',
        summary: '',
        logged_by: 'Key Account Manager',
      });
      loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to log contact');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Convert to Sales Invoice
  const handleConvertConfirmed = async () => {
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      const res = await repeatOrderService.convertToInvoice(selectedOrder._id);
      setIsConvertModalOpen(false);
      alert(`Order converted successfully to Sales Invoice ${res.data?.invoice?.invoice_number || 'New Invoice'}!`);
      loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to convert order to invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'due_soon':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">Due Soon</span>;
      case 'overdue':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">Overdue (At Risk)</span>;
      case 'contacted':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">In Contact</span>;
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">Confirmed</span>;
      case 'invoiced':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">Invoiced</span>;
      case 'skipped':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">Skipped</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">High AOV</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">Standard</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">Normal</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section */}
      <PageHeader
        title="Repeat Order Management"
        subtitle="Automated B2B customer re-order tracking, repurchase cadence intelligence, and 1-click reorder execution"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('quick_reorder')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>1-Click Reorder</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Re-order</span>
          </button>
        </div>
      </PageHeader>

      {/* 2. Executive Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Repeat Order Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{(analytics?.total_repeat_revenue || 319960).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{(analytics?.total_units_moved || 1480).toLocaleString('en-IN')} pcs reordered</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Repeat Order Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <RotateCw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {analytics?.repeat_order_rate || 68}%
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Across B2B wholesale client accounts
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Re-orders Due (7-14 Days)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight">
            {analytics?.due_soon_count !== undefined ? analytics.due_soon_count : 1} Clients
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Active repurchase window open
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              At-Risk / Overdue Re-orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 tracking-tight">
            {analytics?.overdue_at_risk_count !== undefined ? analytics.overdue_at_risk_count : 1} Accounts
          </div>
          <p className="text-[11px] text-rose-600 font-medium mt-1">
            Requires immediate sales intervention
          </p>
        </div>
      </div>

      {/* 3. Executive Segmented Navigation Switcher */}
      <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200/80 inline-flex items-center gap-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'pipeline'
              ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${activeTab === 'pipeline' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Active Re-order Pipeline</span>
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
            {repeatOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cadence')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'cadence'
              ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeTab === 'cadence' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span>Customer Cadence Intelligence</span>
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
            {customerCadences.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quick_reorder')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'quick_reorder'
              ? 'bg-white text-amber-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Zap className={`w-4 h-4 ${activeTab === 'quick_reorder' ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>1-Click Past Order Duplicator</span>
        </button>
      </div>

      {/* 4. TAB CONTENT */}
      {/* TAB 1: REPEAT ORDER PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search repeat orders by client, order #, SKU or phone..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:bg-white focus:border-emerald-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="due_soon">Due Soon</option>
                  <option value="overdue">Overdue (At Risk)</option>
                  <option value="contacted">In Contact</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="skipped">Skipped</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:bg-white focus:border-emerald-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High AOV</option>
                  <option value="medium">Standard</option>
                  <option value="normal">Normal</option>
                </select>

                {(search || statusFilter !== 'all' || priorityFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                      setPriorityFilter('all');
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Repeat Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-200">
                    <th className="py-3 px-3">Order Code</th>
                    <th className="py-3 px-3">Customer & Company</th>
                    <th className="py-3 px-3">Product & Sizes</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="py-3 px-3 text-right">Value (INR)</th>
                    <th className="py-3 px-3 text-center">Cadence</th>
                    <th className="py-3 px-3">Expected Re-order</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Priority</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <RefreshCw className="w-7 h-7 animate-spin text-emerald-600 mb-2" />
                          <p className="text-xs font-bold text-slate-700">Loading repeat orders pipeline...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <ShoppingBag className="w-10 h-10 stroke-[1.2] text-slate-300 mb-2" />
                          <p className="text-sm font-bold text-slate-700">No repeat orders found</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try adjusting filters or generate a 1-click reorder</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ro) => {
                      const firstItem = ro.items && ro.items[0];
                      const daysDiff = Math.ceil((new Date(ro.expected_reorder_date) - new Date()) / 86400000);

                      return (
                        <tr key={ro._id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Order Code */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {ro.repeat_order_number}
                            </span>
                            {ro.original_order_number && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Ref: {ro.original_order_number}
                              </p>
                            )}
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{ro.customer_name}</div>
                            {ro.company_name && ro.company_name !== ro.customer_name && (
                              <div className="text-[11px] text-slate-500 font-semibold">{ro.company_name}</div>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono">{ro.phone || ro.email}</div>
                          </td>

                          {/* Product & Sizes */}
                          <td className="py-3 px-3 max-w-[200px]">
                            <div className="font-bold text-slate-800 truncate">
                              {firstItem?.product_name || 'Apparel Goods'}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 mt-0.5">
                              <span>Color: {firstItem?.color || 'Jet Black'}</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(ro);
                                  setIsDetailModalOpen(true);
                                }}
                                className="text-slate-500 hover:text-emerald-700 underline text-[10px]"
                              >
                                View Sizes
                              </button>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {ro.total_quantity} <span className="text-[10px] text-slate-400">PCS</span>
                          </td>

                          {/* Value */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="font-mono font-black text-slate-900">
                              ₹{(ro.final_amount || 0).toLocaleString('en-IN')}
                            </div>
                            {ro.loyalty_discount_percent > 0 && (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                {ro.loyalty_discount_percent}% loyalty discount applied
                              </div>
                            )}
                          </td>

                          {/* Cadence */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Every {ro.repeat_frequency_days} Days
                            </span>
                          </td>

                          {/* Expected Date & Countdown */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 text-[11px]">
                              {new Date(ro.expected_reorder_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] font-bold mt-0.5">
                              {daysDiff > 0 ? (
                                <span className="text-amber-700">Due in {daysDiff} days</span>
                              ) : daysDiff === 0 ? (
                                <span className="text-rose-700 font-black">Due Today</span>
                              ) : (
                                <span className="text-rose-700 font-black">Overdue by {Math.abs(daysDiff)} days</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {getStatusBadge(ro.status)}
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {getPriorityBadge(ro.priority)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Log Contact Button */}
                              <button
                                type="button"
                                title="Log Call or WhatsApp follow-up"
                                onClick={() => {
                                  setSelectedOrder(ro);
                                  setIsLogContactModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>

                              {/* WhatsApp Quick Link */}
                              {ro.phone && (
                                <a
                                  href={`https://wa.me/${ro.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                    `Hello ${ro.customer_name}, this is from Danzason ERP. Your scheduled repeat order for ${firstItem?.product_name || 'apparel stock'} is due. Would you like to confirm this order?`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat on WhatsApp"
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Convert to Invoice Button */}
                              {ro.status !== 'invoiced' ? (
                                <button
                                  type="button"
                                  title="Convert to Sales Invoice"
                                  onClick={() => {
                                    setSelectedOrder(ro);
                                    setIsConvertModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                                >
                                  Invoice
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  {ro.converted_invoice_number || 'INVOICED'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMER CADENCE INTELLIGENCE */}
      {activeTab === 'cadence' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                B2B Customer Purchase Cadences
              </h3>
              <p className="text-xs text-slate-500">
                Predicted repeat interval analysis to forecast wholesale inventory demand
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
              {customerCadences.length} Active Accounts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {customerCadences.map((c, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{c.customer_name}</h4>
                    {c.company_name && <p className="text-xs text-slate-500 font-semibold">{c.company_name}</p>}
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.phone}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    ~{c.avg_frequency_days} Days Cycle
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Lifetime Repeat Revenue</span>
                    <p className="font-mono font-black text-slate-900 mt-0.5">₹{c.total_revenue.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Repeat Frequency</span>
                    <p className="font-bold text-slate-800 mt-0.5">{c.orders_count} Reorders logged</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Next Due: <strong>{new Date(c.next_expected_date).toLocaleDateString('en-IN')}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(c.active_order);
                      setIsLogContactModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Contact</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: 1-CLICK PAST ORDER DUPLICATOR */}
      {activeTab === 'quick_reorder' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                1-Click Past Order Duplicator
              </h3>
              <p className="text-xs text-slate-500">
                Instantly duplicate a historical sales invoice into a scheduled repeat order with automatic size breakdowns
              </p>
            </div>
          </div>

          <form onSubmit={handleQuickReorderSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Past Sales Invoice to Duplicate *
              </label>
              <select
                value={quickForm.selected_invoice_id}
                onChange={(e) => setQuickForm({ ...quickForm, selected_invoice_id: e.target.value })}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:border-emerald-500"
              >
                <option value="">-- Choose Past Invoice --</option>
                {pastInvoices.map((inv) => (
                  <option key={inv._id} value={inv._id}>
                    {inv.invoice_number} • {inv.customer_id?.customer_name || inv.customer_name || 'Client'} • ₹{(inv.total_amount || 0).toLocaleString('en-IN')} (Dated: {new Date(inv.invoice_date || inv.createdAt).toLocaleDateString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Repeat Cadence Interval (Days)
                </label>
                <select
                  value={quickForm.repeat_frequency_days}
                  onChange={(e) => setQuickForm({ ...quickForm, repeat_frequency_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white"
                >
                  <option value={15}>15 Days (High Frequency)</option>
                  <option value={30}>30 Days (Monthly)</option>
                  <option value={45}>45 Days (Bi-monthly)</option>
                  <option value={60}>60 Days (Seasonal)</option>
                  <option value={90}>90 Days (Quarterly)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Repeat Customer Loyalty Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={quickForm.loyalty_discount_percent}
                  onChange={(e) => setQuickForm({ ...quickForm, loyalty_discount_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{actionLoading ? 'Generating Repeat Order...' : 'Generate 1-Click Repeat Order'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: CREATE / SCHEDULE REPEAT ORDER */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Repeat Order"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Account *</label>
              <select
                required
                value={createForm.customer_id}
                onChange={(e) => {
                  const match = customers.find((c) => c._id === e.target.value);
                  setCreateForm({
                    ...createForm,
                    customer_id: e.target.value,
                    customer_name: match?.customer_name || '',
                    company_name: match?.company_name || match?.customer_name || '',
                    phone: match?.mobile || match?.phone || '',
                    email: match?.email || '',
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.customer_name} {c.company_name ? `(${c.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Product Style *</label>
              <select
                required
                value={createForm.product_id}
                onChange={(e) => {
                  const match = products.find((p) => p._id === e.target.value);
                  setCreateForm({
                    ...createForm,
                    product_id: e.target.value,
                    product_name: match?.title || match?.product_name || '',
                    sku: match?.sku || '',
                    unit_price: Number(match?.price || match?.selling_rate || 450),
                    color: (match?.colors && match?.colors[0]?.name) || 'Jet Black',
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white"
              >
                <option value="">-- Choose Product --</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title || p.product_name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Size Breakdown Inputs */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
              Apparel Size Breakdown Matrix (Pieces)
            </label>
            <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {['S', 'M', 'L', 'XL', '2XL'].map((sz) => (
                <div key={sz} className="text-center">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">Size {sz}</span>
                  <input
                    type="number"
                    min="0"
                    value={createForm.sizes[sz] || 0}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        sizes: { ...createForm.sizes, [sz]: Number(e.target.value) },
                      })
                    }
                    className="w-full px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-right text-slate-500 font-bold mt-1">
              Total Order Quantity: {Object.values(createForm.sizes).reduce((a, b) => a + Number(b || 0), 0)} PCS
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cadence (Days)</label>
              <select
                value={createForm.repeat_frequency_days}
                onChange={(e) => setCreateForm({ ...createForm, repeat_frequency_days: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
              >
                <option value={15}>15 Days</option>
                <option value={30}>30 Days</option>
                <option value={45}>45 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Loyalty Discount %</label>
              <input
                type="number"
                min="0"
                max="25"
                value={createForm.loyalty_discount_percent}
                onChange={(e) => setCreateForm({ ...createForm, loyalty_discount_percent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
              >
                <option value="high">High AOV</option>
                <option value="medium">Medium</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="e.g. Client requested sample swatches before dispatch..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
            >
              {actionLoading ? 'Saving...' : 'Save Re-order Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: LOG CONTACT & OUTREACH */}
      <Modal
        isOpen={isLogContactModalOpen}
        onClose={() => setIsLogContactModalOpen(false)}
        title={`Log Customer Follow-up (${selectedOrder?.customer_name || ''})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleLogContactSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Communication Channel *</label>
            <select
              value={contactForm.channel}
              onChange={(e) => setContactForm({ ...contactForm, channel: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
            >
              <option value="phone">Phone Call</option>
              <option value="whatsapp">WhatsApp Message</option>
              <option value="email">Email</option>
              <option value="meeting">In-Person Meeting</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Call / Pitch Outcome *</label>
            <select
              value={contactForm.outcome}
              onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
            >
              <option value="confirmed">Confirmed (Order Accepted)</option>
              <option value="interested">Interested (Reviewing Stock)</option>
              <option value="follow_up_needed">Follow-up Needed</option>
              <option value="declined">Declined (Skipping this cycle)</option>
              <option value="no_response">No Response / Unreachable</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Call Summary</label>
            <textarea
              rows={3}
              required
              value={contactForm.summary}
              onChange={(e) => setContactForm({ ...contactForm, summary: e.target.value })}
              placeholder="e.g. Spoke with purchaser. Confirmed 250 pcs in Navy Blue with 5% discount."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLogContactModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
            >
              {actionLoading ? 'Logging...' : 'Save Follow-up'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: VIEW ORDER & SIZE MATRIX DETAIL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Order Details • ${selectedOrder?.repeat_order_number || ''}`}
        maxWidth="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Client Account</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedOrder.customer_name}</p>
                <p className="text-slate-500 text-[11px]">{selectedOrder.phone || selectedOrder.email}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Repeat Schedule</span>
                <p className="font-bold text-slate-900 mt-0.5">Every {selectedOrder.repeat_frequency_days} Days</p>
                <p className="text-emerald-700 font-semibold text-[11px]">Due: {new Date(selectedOrder.expected_reorder_date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Items & Sizes Table */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                Order Items & Size Matrix
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">S</th>
                      <th className="p-2 text-center">M</th>
                      <th className="p-2 text-center">L</th>
                      <th className="p-2 text-center">XL</th>
                      <th className="p-2 text-center">2XL</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.items || []).map((it, i) => (
                      <tr key={i}>
                        <td className="p-2">
                          <div className="font-bold text-slate-900">{it.product_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Color: {it.color} • {it.sku}</div>
                        </td>
                        <td className="p-2 text-center font-mono font-bold bg-slate-50/50">{it.sizes?.S || 0}</td>
                        <td className="p-2 text-center font-mono font-bold bg-emerald-50/20">{it.sizes?.M || 0}</td>
                        <td className="p-2 text-center font-mono font-bold bg-emerald-50/20">{it.sizes?.L || 0}</td>
                        <td className="p-2 text-center font-mono font-bold bg-slate-50/50">{it.sizes?.XL || 0}</td>
                        <td className="p-2 text-center font-mono font-bold">{it.sizes?.['2XL'] || 0}</td>
                        <td className="p-2 text-right font-mono font-black text-slate-900">{it.quantity} PCS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-mono font-bold">₹{selectedOrder.subtotal_amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Loyalty Discount ({selectedOrder.loyalty_discount_percent}%):</span>
                <span className="font-mono font-bold">-₹{selectedOrder.discount_amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-slate-900 text-sm">
                <span>Total Payable:</span>
                <span className="font-mono text-emerald-700">₹{selectedOrder.final_amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Communication Log */}
            {selectedOrder.communications_log && selectedOrder.communications_log.length > 0 && (
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Follow-up History
                </h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {selectedOrder.communications_log.map((log, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 capitalize">[{log.channel}] </span>
                        <span className="text-slate-600">{log.summary}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {new Date(log.date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL 4: CONVERT TO SALES INVOICE CONFIRMATION */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Confirm Repeat Order Dispatch & Invoice"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to convert repeat order{' '}
            <strong className="text-slate-900 font-mono">{selectedOrder?.repeat_order_number}</strong> into an official
            Sales Invoice? This will deduct verified stock from inventory and generate an invoice record for customer{' '}
            <strong>{selectedOrder?.customer_name}</strong>.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs space-y-1">
            <p className="font-bold text-emerald-900">Total Invoice Amount: ₹{selectedOrder?.final_amount?.toLocaleString('en-IN')}</p>
            <p className="text-emerald-700">Total Quantity: {selectedOrder?.total_quantity} PCS with 5% GST applied</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsConvertModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConvertConfirmed}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
            >
              {actionLoading ? 'Converting...' : 'Generate Sales Invoice'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
