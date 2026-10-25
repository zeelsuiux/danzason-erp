import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  RotateCw,
  Phone,
  PhoneCall,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ShoppingBag,
  Search,
  Filter,
  Plus,
  MessageSquare,
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
  Building2,
  Users,
  Zap,
  Trash2,
  Edit3,
  History,
  ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import repeatOrderService from '../../services/repeatOrderService';

export default function RepeatOrderManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active Tab: 'due_7_days' (Requirements due within 7 days) | 'all' | 'contacted' | 'converted'
  const [activeTab, setActiveTab] = useState('due_7_days');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [repeatOrders, setRepeatOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Search and Priority Filter
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Log Call Form State
  const [callForm, setCallForm] = useState({
    caller_name: 'Key Account Manager',
    outcome: 'interested',
    client_answer: '',
    postponed_repeat_date: '',
    next_follow_up_date: '',
  });

  // Convert to Order Form State (Editable Line Items)
  const [convertForm, setConvertForm] = useState({
    warehouse_id: '',
    notes: '',
    next_approx_repeat_date: '',
    items: [],
  });

  // Manual Schedule Repeat Order Form State
  const [createForm, setCreateForm] = useState({
    customer_id: '',
    customer_name: '',
    company_name: '',
    phone: '',
    email: '',
    product_id: '',
    product_name: '',
    sku: '',
    color: 'Standard',
    expected_reorder_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    unit_price: 450,
    sizes: { S: 20, M: 50, L: 50, XL: 20, '2XL': 10 },
    priority: 'medium',
    notes: '',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, ordersRes, custRes, prodRes, whRes] = await Promise.all([
        repeatOrderService.getAnalytics().catch(() => ({ data: null })),
        repeatOrderService.getRepeatOrders({ limit: 100 }).catch(() => ({ data: [] })),
        repeatOrderService.getCustomers({ limit: 100 }).catch(() => ({ data: [] })),
        repeatOrderService.getProducts({ limit: 100 }).catch(() => ({ data: [] })),
        repeatOrderService.getWarehouses().catch(() => ({ data: [] })),
      ]);

      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      }
      if (ordersRes?.data) {
        setRepeatOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      }
      if (custRes?.data) {
        setCustomers(Array.isArray(custRes.data) ? custRes.data : custRes.data.customers || []);
      }
      if (prodRes?.data) {
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || []);
      }
      if (whRes?.data) {
        setWarehouses(Array.isArray(whRes.data) ? whRes.data : whRes.data.warehouses || []);
      }
    } catch (err) {
      console.error('Failed to load repeat order data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return repeatOrders.filter((ro) => {
      const expDate = ro.expected_reorder_date ? new Date(ro.expected_reorder_date) : null;
      let daysRemaining = 999;
      if (expDate) {
        daysRemaining = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Tab Filtering
      if (activeTab === 'due_7_days') {
        const isNotFinal = !['converted', 'invoiced', 'skipped'].includes(ro.status);
        if (!isNotFinal || daysRemaining > 7) return false;
      } else if (activeTab === 'contacted') {
        if (ro.status !== 'contacted') return false;
      } else if (activeTab === 'converted') {
        if (!['converted', 'invoiced'].includes(ro.status)) return false;
      }

      // Priority Filter
      if (priorityFilter !== 'all' && ro.priority !== priorityFilter) return false;

      // Text Search
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const matchesClient = (ro.customer_name || '').toLowerCase().includes(s);
        const matchesCompany = (ro.company_name || '').toLowerCase().includes(s);
        const matchesNumber = (ro.repeat_order_number || '').toLowerCase().includes(s);
        const matchesOrig = (ro.original_order_number || '').toLowerCase().includes(s);
        const matchesPhone = (ro.phone || '').toLowerCase().includes(s);
        const matchesProduct = (ro.items || []).some((it) => (it.product_name || '').toLowerCase().includes(s));
        if (!matchesClient && !matchesCompany && !matchesNumber && !matchesOrig && !matchesPhone && !matchesProduct) {
          return false;
        }
      }

      return true;
    });
  }, [repeatOrders, activeTab, priorityFilter, search]);

  // Open Log Call Modal
  const handleOpenLogCall = (order) => {
    setSelectedOrder(order);
    setCallForm({
      caller_name: 'Key Account Manager',
      outcome: 'interested',
      client_answer: '',
      postponed_repeat_date: '',
      next_follow_up_date: '',
    });
    setIsLogCallModalOpen(true);
  };

  // Submit Call Feedback
  const handleLogCallSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!callForm.client_answer.trim()) {
      alert('Please enter what the client answered during the call');
      return;
    }

    try {
      setActionLoading(true);
      await repeatOrderService.logContact(selectedOrder._id, {
        channel: 'phone',
        outcome: callForm.outcome,
        client_answer: callForm.client_answer,
        summary: callForm.client_answer,
        logged_by: callForm.caller_name,
        next_follow_up_date: callForm.next_follow_up_date || null,
        postponed_repeat_date: callForm.postponed_repeat_date || null,
      });

      alert('Call details and client response saved successfully!');
      setIsLogCallModalOpen(false);
      loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to save call details');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Call History Modal
  const handleOpenHistory = (order) => {
    setSelectedOrder(order);
    setIsHistoryModalOpen(true);
  };

  // Open Convert to Order Modal (Initialize editable items)
  const handleOpenConvertModal = (order) => {
    setSelectedOrder(order);

    const initialItems = (order.items || []).map((it, idx) => {
      const sizes = it.sizes || { S: 0, M: 0, L: 0, XL: 0, '2XL': 0 };
      const qty = it.quantity || Object.values(sizes).reduce((acc, q) => acc + Number(q || 0), 0) || 1;
      const rate = Number(it.unit_price || 450);
      const gstRate = 5;
      const taxable = qty * rate;
      const gstAmt = Math.round((taxable * gstRate) / 100);

      return {
        id: it._id || `item_${idx}`,
        product_id: it.product_id?._id || it.product_id || null,
        product_name: it.product_name || 'Apparel Product',
        sku: it.sku || '6109',
        color: it.color || 'Standard',
        sizes: { ...sizes },
        quantity: qty,
        unit_price: rate,
        gst_rate: gstRate,
        taxable_amount: taxable,
        gst_amount: gstAmt,
        total_amount: taxable + gstAmt,
      };
    });

    setConvertForm({
      warehouse_id: order.warehouse_id?._id || order.warehouse_id || (warehouses[0]?._id || ''),
      notes: `Re-order generated from requirement ${order.repeat_order_number}`,
      next_approx_repeat_date: '',
      items: initialItems.length > 0 ? initialItems : [
        {
          id: 'item_0',
          product_id: null,
          product_name: 'Polo Neck T-Shirt',
          sku: '6109',
          color: 'Standard',
          sizes: { S: 20, M: 50, L: 50, XL: 20, '2XL': 10 },
          quantity: 150,
          unit_price: 450,
          gst_rate: 5,
          taxable_amount: 150 * 450,
          gst_amount: Math.round((150 * 450 * 5) / 100),
          total_amount: 150 * 450 + Math.round((150 * 450 * 5) / 100),
        },
      ],
    });

    setIsConvertModalOpen(true);
  };

  // Convert Modal: Update Size Quantity
  const handleUpdateItemSize = (itemIndex, sizeKey, newQty) => {
    setConvertForm((prev) => {
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[itemIndex] };
      const updatedSizes = { ...item.sizes, [sizeKey]: Math.max(0, parseInt(newQty, 10) || 0) };
      const totalQuantity = Object.values(updatedSizes).reduce((acc, q) => acc + Number(q || 0), 0);
      const taxable = totalQuantity * Number(item.unit_price || 0);
      const gstAmt = Math.round((taxable * (item.gst_rate || 5)) / 100);

      item.sizes = updatedSizes;
      item.quantity = totalQuantity;
      item.taxable_amount = taxable;
      item.gst_amount = gstAmt;
      item.total_amount = taxable + gstAmt;

      updatedItems[itemIndex] = item;
      return { ...prev, items: updatedItems };
    });
  };

  // Convert Modal: Update Unit Price or Direct Quantity
  const handleUpdateItemField = (itemIndex, field, value) => {
    setConvertForm((prev) => {
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[itemIndex] };
      item[field] = value;

      const qty = Number(item.quantity) || 0;
      const rate = Number(item.unit_price) || 0;
      const taxable = qty * rate;
      const gstAmt = Math.round((taxable * (item.gst_rate || 5)) / 100);

      item.taxable_amount = taxable;
      item.gst_amount = gstAmt;
      item.total_amount = taxable + gstAmt;

      updatedItems[itemIndex] = item;
      return { ...prev, items: updatedItems };
    });
  };

  // Convert Modal: Remove Item Row
  const handleRemoveConvertItem = (itemIndex) => {
    if (convertForm.items.length <= 1) {
      alert('Order must contain at least one product item');
      return;
    }
    setConvertForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== itemIndex),
    }));
  };

  // Convert Modal: Add Product Row
  const handleAddConvertItem = () => {
    const newItem = {
      id: `item_${Date.now()}`,
      product_id: null,
      product_name: 'Additional Product',
      sku: '6109',
      color: 'Standard',
      sizes: { S: 10, M: 25, L: 25, XL: 10, '2XL': 5 },
      quantity: 75,
      unit_price: 450,
      gst_rate: 5,
      taxable_amount: 75 * 450,
      gst_amount: Math.round((75 * 450 * 5) / 100),
      total_amount: 75 * 450 + Math.round((75 * 450 * 5) / 100),
    };

    setConvertForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  // Convert Modal: Calculations
  const convertTotals = useMemo(() => {
    const totalQty = convertForm.items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
    const subtotal = convertForm.items.reduce((acc, it) => acc + Number(it.taxable_amount || 0), 0);
    const gstTotal = convertForm.items.reduce((acc, it) => acc + Number(it.gst_amount || 0), 0);
    const grandTotal = subtotal + gstTotal;

    return { totalQty, subtotal, gstTotal, grandTotal };
  }, [convertForm.items]);

  // Submit Conversion to Invoice / Sales Order
  const handleConfirmConversion = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (convertForm.items.length === 0) {
      alert('Please add at least one product item with quantities');
      return;
    }

    try {
      setActionLoading(true);
      const res = await repeatOrderService.convertToInvoice(selectedOrder._id, {
        items: convertForm.items,
        warehouse_id: convertForm.warehouse_id,
        notes: convertForm.notes,
        next_approx_repeat_date: convertForm.next_approx_repeat_date || null,
      });

      const invNumber = res?.data?.invoice?.invoice_number || 'INV-SALES';
      alert(`Success! Repeat requirement successfully converted to Tax Invoice ${invNumber}`);
      setIsConvertModalOpen(false);
      loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to convert order');
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Schedule Submit
  const handleManualCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.customer_id) {
      alert('Please select a customer');
      return;
    }

    try {
      setActionLoading(true);
      const totalQ = Object.values(createForm.sizes).reduce((acc, q) => acc + Number(q || 0), 0);
      const payload = {
        customer_id: createForm.customer_id,
        customer_name: createForm.customer_name,
        company_name: createForm.company_name,
        phone: createForm.phone,
        email: createForm.email,
        expected_reorder_date: createForm.expected_reorder_date,
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
      alert('Repeat requirement successfully scheduled!');
      setIsCreateModalOpen(false);
      loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to schedule repeat requirement');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Repeat Sales & Re-order Management"
        subtitle="Track client approximate repeat dates, 7-day requirement alerts, call outcomes, and 1-click order conversion with editable quantities"
      >
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Repeat Requirement</span>
        </button>
      </PageHeader>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: 7-Day Requirement Alert */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Requirements Due (7 Days)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-950 tracking-tight">
            {analytics?.due_7_days_count !== undefined ? analytics.due_7_days_count : 2}
          </div>
          <p className="text-[11px] text-amber-800 font-semibold mt-1">
            Clients requiring immediate team call
          </p>
        </div>

        {/* Card 2: Overdue / At Risk */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Overdue Dates
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-700 tracking-tight">
            {analytics?.overdue_at_risk_count !== undefined ? analytics.overdue_at_risk_count : 1}
          </div>
          <p className="text-[11px] text-rose-600 font-medium mt-1">
            Repeat date passed without re-order
          </p>
        </div>

        {/* Card 3: In Follow-Up / Contacted */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              In Follow-Up Discussion
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {repeatOrders.filter((r) => r.status === 'contacted').length}
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">
            Client responses & notes recorded
          </p>
        </div>

        {/* Card 4: Converted to Invoice */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Converted to Order / Bill
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 tracking-tight">
            {repeatOrders.filter((r) => ['converted', 'invoiced'].includes(r.status)).length}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            Successfully re-billed & dispatched
          </p>
        </div>
      </div>

      {/* 3. Navigation Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200/80 inline-flex items-center gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('due_7_days')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'due_7_days'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Due in 7 Days / Call Needed</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-mono">
              {
                repeatOrders.filter((r) => {
                  const d = r.expected_reorder_date ? new Date(r.expected_reorder_date) : null;
                  if (!d || ['converted', 'invoiced', 'skipped'].includes(r.status)) return false;
                  const diff = Math.ceil((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
                  return diff <= 7;
                }).length
              }
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>All Repeat Requirements</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {repeatOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacted')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'contacted'
                ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
            <span>In Discussion / Contacted</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('converted')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'converted'
                ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Converted to Order</span>
          </button>
        </div>

        {/* Search & Priority Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search client, invoice, phone, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand w-64 shadow-2xs"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden shadow-2xs"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
          </select>
        </div>
      </div>

      {/* 4. Repeat Requirements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 w-10 text-center text-slate-400">#</th>
                <th className="p-3.5 min-w-[200px]">Client / Company</th>
                <th className="p-3.5 min-w-[130px]">Original Invoice</th>
                <th className="p-3.5 min-w-[160px]">Approx Repeat Date & Alert</th>
                <th className="p-3.5 min-w-[190px]">Products & Sizes</th>
                <th className="p-3.5 min-w-[210px]">Latest Client Response</th>
                <th className="p-3.5 min-w-[190px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                    Loading repeat sales requirements...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="max-w-sm mx-auto text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <RotateCw className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">No Repeat Requirements Found</h4>
                      <p className="text-xs text-slate-500">
                        {activeTab === 'due_7_days'
                          ? 'No client requirements are due within the 7-day call window right now.'
                          : 'No matching repeat sales found for the selected criteria.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ro, idx) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const expDate = ro.expected_reorder_date ? new Date(ro.expected_reorder_date) : null;
                  let daysRemaining = null;
                  let isRequirementDue = false;
                  let isOverdue = false;

                  if (expDate) {
                    daysRemaining = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
                    if (daysRemaining <= 7 && !['converted', 'invoiced', 'skipped'].includes(ro.status)) {
                      isRequirementDue = true;
                    }
                    if (daysRemaining < 0 && !['converted', 'invoiced', 'skipped'].includes(ro.status)) {
                      isOverdue = true;
                    }
                  }

                  const logs = Array.isArray(ro.communications_log) ? ro.communications_log : [];
                  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
                  const isConverted = ['converted', 'invoiced'].includes(ro.status);

                  return (
                    <tr
                      key={ro._id}
                      className={`transition-colors ${
                        isOverdue
                          ? 'bg-rose-50/40 hover:bg-rose-50/70'
                          : isRequirementDue
                          ? 'bg-amber-50/40 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="p-3.5 text-center text-slate-400 font-mono font-bold text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Client / Company */}
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{ro.customer_name}</span>
                          {ro.priority === 'high' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800">
                              High AOV
                            </span>
                          )}
                        </div>
                        {ro.company_name && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {ro.company_name}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {ro.phone ? (
                            <a
                              href={`tel:${ro.phone}`}
                              className="text-[11px] font-bold text-slate-700 hover:text-brand flex items-center gap-1"
                              title="Click to Call"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{ro.phone}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">No phone</span>
                          )}
                        </div>
                      </td>

                      {/* Original Invoice */}
                      <td className="p-3.5">
                        {ro.original_order_number ? (
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {ro.original_order_number}
                          </div>
                        ) : (
                          <div className="font-mono text-xs text-slate-500">
                            {ro.repeat_order_number}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {ro.last_order_date
                            ? `Billed: ${new Date(ro.last_order_date).toLocaleDateString('en-IN')}`
                            : 'Initial order'}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                          ₹{Number(ro.final_amount || ro.subtotal_amount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Approx Repeat Date & Alert */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {expDate ? expDate.toLocaleDateString('en-IN') : 'Not Set'}
                          </span>
                        </div>

                        <div className="mt-1">
                          {isConverted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3" /> Converted ({ro.converted_invoice_number || 'INV'})
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Overdue by {Math.abs(daysRemaining)} days
                            </span>
                          ) : isRequirementDue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Requirement Due ({daysRemaining === 0 ? 'Today' : `${daysRemaining} days left`})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              <Clock className="w-3 h-3 text-slate-400" /> In {daysRemaining} days
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Products & Sizes */}
                      <td className="p-3.5">
                        {(ro.items || []).slice(0, 2).map((item, itIdx) => (
                          <div key={itIdx} className="mb-1 text-[11px]">
                            <span className="font-bold text-slate-800">
                              {item.product_name}
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Total: {item.quantity} pcs
                              {item.sizes && (
                                <span className="ml-1 text-slate-400">
                                  ({Object.entries(item.sizes)
                                    .filter(([_, q]) => q > 0)
                                    .map(([s, q]) => `${s}:${q}`)
                                    .join(' ')}
                                  )
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </td>

                      {/* Latest Client Response */}
                      <td className="p-3.5">
                        {latestLog ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  latestLog.outcome === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : latestLog.outcome === 'interested'
                                    ? 'bg-blue-100 text-blue-800'
                                    : latestLog.outcome === 'stock_available'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {latestLog.outcome.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(latestLog.date).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium line-clamp-2 italic">
                              "{latestLog.client_answer || latestLog.summary}"
                            </p>
                            <div className="text-[10px] text-slate-400">
                              By {latestLog.logged_by || 'Sales Rep'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px] italic flex items-center gap-1">
                            <span>No call logged yet</span>
                          </div>
                        )}
                      </td>

                      {/* Actions: 1. Log Call, 2. History, 3. Convert to Order */}
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Action 1: Log Call & Answer */}
                        <button
                          type="button"
                          onClick={() => handleOpenLogCall(ro)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition inline-flex items-center gap-1 cursor-pointer"
                          title="Log Call Outcome & Client Response"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Log Call</span>
                        </button>

                        {/* Action 2: Call History */}
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(ro)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition inline-flex items-center"
                          title="View Call History"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Action 3: Convert to Order with Editable Quantities */}
                        {!isConverted ? (
                          <button
                            type="button"
                            onClick={() => handleOpenConvertModal(ro)}
                            className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title="Convert to Live Order / Invoice with Full Quantity Control"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Convert to Order</span>
                          </button>
                        ) : (
                          <span className="px-2 py-1 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                            Converted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: LOG CALL & CLIENT'S ANSWER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isLogCallModalOpen}
        onClose={() => setIsLogCallModalOpen(false)}
        title="Log Client Call & Response"
        maxWidth="max-w-xl"
      >
        {selectedOrder && (
          <form onSubmit={handleLogCallSubmit} className="space-y-4 text-xs">
            {/* Client Context Bar */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <h4 className="font-black text-slate-900 text-sm">
                  {selectedOrder.customer_name}
                </h4>
                <p className="text-slate-500 text-[11px]">
                  {selectedOrder.company_name || 'Valued Client'} • Phone: {selectedOrder.phone || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Approx Repeat Date
                </span>
                <div className="font-bold text-slate-800 text-xs">
                  {selectedOrder.expected_reorder_date
                    ? new Date(selectedOrder.expected_reorder_date).toLocaleDateString('en-IN')
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Caller Name & Call Outcome */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Team Member (Caller) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={callForm.caller_name}
                  onChange={(e) => setCallForm({ ...callForm, caller_name: e.target.value })}
                  placeholder="Your Name (e.g. Rahul Sharma)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Call Outcome <span className="text-rose-500">*</span>
                </label>
                <select
                  value={callForm.outcome}
                  onChange={(e) => setCallForm({ ...callForm, outcome: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-brand outline-none"
                >
                  <option value="interested">Interested - Wants Repeat Order</option>
                  <option value="confirmed">Confirmed - Ready to Convert</option>
                  <option value="call_back_later">Client Busy - Call Back Later</option>
                  <option value="stock_available">Stock Still Available (Postponed)</option>
                  <option value="not_interested">Not Interested / Skipped</option>
                </select>
              </div>
            </div>

            {/* Client's Answer / What did the client say? */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Client's Answer / Discussion Details <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows="3"
                value={callForm.client_answer}
                onChange={(e) => setCallForm({ ...callForm, client_answer: e.target.value })}
                placeholder="Write what the client answered during the call (e.g. Client stated they still have 35 pcs left, requested to call next Tuesday for summer polo re-order)..."
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-brand outline-none"
              />
            </div>

            {/* Optional Postponed Date & Follow-up Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>New / Postponed Repeat Date</span>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </label>
                <input
                  type="date"
                  value={callForm.postponed_repeat_date}
                  onChange={(e) => setCallForm({ ...callForm, postponed_repeat_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Next Follow-up Call Date</span>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </label>
                <input
                  type="date"
                  value={callForm.next_follow_up_date}
                  onChange={(e) => setCallForm({ ...callForm, next_follow_up_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-brand outline-none"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLogCallModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-600 transition shadow-xs flex items-center gap-1.5"
              >
                {actionLoading ? 'Saving...' : 'Save Call Response'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CALL & CLIENT RESPONSE HISTORY TIMELINE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Client Call & Feedback History"
        maxWidth="max-w-lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="font-bold text-slate-900 text-xs">{selectedOrder.customer_name}</div>
              <div className="text-[11px] text-slate-500">
                Requirement Code: {selectedOrder.repeat_order_number} • Approx Date:{' '}
                {selectedOrder.expected_reorder_date
                  ? new Date(selectedOrder.expected_reorder_date).toLocaleDateString('en-IN')
                  : 'N/A'}
              </div>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {(!selectedOrder.communications_log || selectedOrder.communications_log.length === 0) ? (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  No call logs recorded yet for this client.
                </div>
              ) : (
                selectedOrder.communications_log
                  .slice()
                  .reverse()
                  .map((log, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            log.outcome === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.outcome === 'interested'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.outcome.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.date).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium">
                        "{log.client_answer || log.summary}"
                      </p>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>Called by: {log.logged_by || 'Sales Rep'}</span>
                        {log.next_follow_up_date && (
                          <span className="font-bold text-blue-600">
                            Follow-up: {new Date(log.next_follow_up_date).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CONVERT REPEAT TO ORDER (FULL EDITABLE LINE ITEMS & QUANTITIES) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Repeat Requirement to Live Order"
        maxWidth="max-w-4xl"
      >
        {selectedOrder && (
          <form onSubmit={handleConfirmConversion} className="space-y-5 text-xs">
            {/* Client & Destination Summary */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Client & Billing Account
                </span>
                <h4 className="font-black text-slate-900 text-sm">
                  {selectedOrder.customer_name}
                </h4>
                <p className="text-slate-600 text-xs">
                  {selectedOrder.company_name} • Phone: {selectedOrder.phone || 'N/A'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fulfillment Warehouse
                  </label>
                  <select
                    value={convertForm.warehouse_id}
                    onChange={(e) => setConvertForm({ ...convertForm, warehouse_id: e.target.value })}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {warehouses.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.warehouse_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Editable Line Items Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                    Product Line Items & Quantity Breakdown
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Modify size quantities, add extra items, or adjust unit rates as requested by the client.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddConvertItem}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Product Row</span>
                </button>
              </div>

              {/* Table of Line Items */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3 min-w-[180px]">Product Name</th>
                      <th className="p-3 text-center min-w-[220px]">Size-Wise Breakdown (Editable)</th>
                      <th className="p-3 text-center w-20">Total Qty</th>
                      <th className="p-3 text-right w-24">Rate (₹)</th>
                      <th className="p-3 text-right w-24">Line Total</th>
                      <th className="p-3 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {convertForm.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/50">
                        {/* Product Title */}
                        <td className="p-3">
                          <input
                            type="text"
                            value={it.product_name}
                            onChange={(e) => handleUpdateItemField(idx, 'product_name', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                          />
                        </td>

                        {/* Size Inputs (S, M, L, XL, 2XL) */}
                        <td className="p-3">
                          <div className="grid grid-cols-5 gap-1.5">
                            {['S', 'M', 'L', 'XL', '2XL'].map((sizeKey) => (
                              <div key={sizeKey} className="text-center">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                  {sizeKey}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={it.sizes?.[sizeKey] || 0}
                                  onChange={(e) => handleUpdateItemSize(idx, sizeKey, e.target.value)}
                                  className="w-full text-center px-1 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:border-brand"
                                />
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Total Qty */}
                        <td className="p-3 text-center">
                          <span className="font-mono font-black text-xs text-slate-900 px-2 py-1 bg-slate-100 rounded-lg">
                            {it.quantity}
                          </span>
                        </td>

                        {/* Unit Rate */}
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={it.unit_price}
                            onChange={(e) => handleUpdateItemField(idx, 'unit_price', e.target.value)}
                            className="w-20 text-right px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:border-brand"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="p-3 text-right font-mono font-black text-slate-900 text-xs">
                          ₹{Number(it.total_amount || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Delete Row */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveConvertItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations & Next Date Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Dispatch / Order Notes
                  </label>
                  <input
                    type="text"
                    value={convertForm.notes}
                    onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })}
                    placeholder="e.g. Dispatched via Express Courier"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-brand outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Schedule Next Approx Repeat Date</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Optional Cycle
                    </span>
                  </label>
                  <input
                    type="date"
                    value={convertForm.next_approx_repeat_date}
                    onChange={(e) => setConvertForm({ ...convertForm, next_approx_repeat_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-brand outline-none"
                  />
                </div>
              </div>

              {/* Total Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Total Quantity</span>
                  <span className="font-mono font-bold text-slate-900">{convertTotals.totalQty} pcs</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Taxable Subtotal</span>
                  <span className="font-mono font-bold text-slate-900">₹{convertTotals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Apparel GST (5%)</span>
                  <span className="font-mono font-bold text-slate-900">₹{convertTotals.gstTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-black text-sm text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">₹{convertTotals.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{actionLoading ? 'Converting...' : 'Confirm & Create Live Invoice'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: MANUAL ADD REPEAT REQUIREMENT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Repeat Requirement"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleManualCreateSubmit} className="space-y-4 text-xs">
          {/* Customer Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Customer <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={createForm.customer_id}
              onChange={(e) => {
                const c = customers.find((cust) => cust._id === e.target.value);
                setCreateForm({
                  ...createForm,
                  customer_id: e.target.value,
                  customer_name: c?.customer_name || '',
                  company_name: c?.company_name || c?.customer_name || '',
                  phone: c?.mobile || c?.phone || '',
                  email: c?.email || '',
                });
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.customer_name} • {c.company_name || c.customer_code}
                </option>
              ))}
            </select>
          </div>

          {/* Approx Repeat Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Approx Repeat Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={createForm.expected_reorder_date}
                onChange={(e) => setCreateForm({ ...createForm, expected_reorder_date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Product & Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={createForm.product_name}
                onChange={(e) => setCreateForm({ ...createForm, product_name: e.target.value })}
                placeholder="e.g. Titan Polo Neck"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Estimated Unit Price (₹)</label>
              <input
                type="number"
                min="0"
                required
                value={createForm.unit_price}
                onChange={(e) => setCreateForm({ ...createForm, unit_price: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-brand outline-none"
              />
            </div>
          </div>

          {/* Sizes Breakdown */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Estimated Quantities (Size Matrix)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {['S', 'M', 'L', 'XL', '2XL'].map((s) => (
                <div key={s} className="text-center">
                  <span className="block text-[10px] font-bold text-slate-400">{s}</span>
                  <input
                    type="number"
                    min="0"
                    value={createForm.sizes[s] || 0}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        sizes: { ...createForm.sizes, [s]: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    className="w-full text-center px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
            <input
              type="text"
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="e.g. Regular monthly customer schedule"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-brand outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
            >
              {actionLoading ? 'Scheduling...' : 'Save Requirement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
