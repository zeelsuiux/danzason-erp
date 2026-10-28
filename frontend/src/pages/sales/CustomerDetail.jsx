import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  ShoppingBag,
  Receipt,
  Eye,
  FileText,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Edit2,
  Printer,
  Plus,
  Trash2,
  Check,
  Download,
  Share2,
  X,
  MessageSquare,
  QrCode,
  Sparkles,
  Copy,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { salesApi } from '../../services/procurementService';
import { amountInWords } from '../../utils/numberToWords';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'invoices' | 'info'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. EDIT CUSTOMER MODAL STATE
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    company_name: '',
    contact_person: '',
    reference: '',
    email: '',
    mobile: '',
    gstin: '',
    pan: '',
    customer_type: 'B2B',
    credit_limit: 100000,
    credit_period_days: 30,
    payment_terms: 'Immediate / Advance',
    billing_address: {
      address_line1: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
    },
    shipping_address: {
      address_line1: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
    },
  });

  // 2. VIEW QUOTATION MODAL STATE
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isQuotationViewOpen, setIsQuotationViewOpen] = useState(false);

  // 3. EDIT QUOTATION MODAL STATE
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [isQuotationEditOpen, setIsQuotationEditOpen] = useState(false);
  const [quotationSaving, setQuotationSaving] = useState(false);
  const [quotationEditForm, setQuotationEditForm] = useState({
    expected_delivery_date: '',
    payment_terms: 'Immediate / Advance',
    shipping_charges: 0,
    notes: '',
    items: [],
  });

  // 4. VIEW / PRINT INVOICE MODAL STATE (A4 & THERMAL)
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoicePrintOpen, setIsInvoicePrintOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'

  // 5. CUSTOMER AI ASSISTANT MODAL STATE
  const [isCustomerAiOpen, setIsCustomerAiOpen] = useState(false);
  const [aiType, setAiType] = useState('payment_reminder');
  const [aiCustomNotes, setAiCustomNotes] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/sales/customers', { replace: true });
      return;
    }
    loadOverview();
  }, [id]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await salesApi.getCustomerOverview(id);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load customer overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // CUSTOMER AI ASSISTANT GENERATOR
  // -------------------------------------------------------------
  const handleGenerateCustomerAi = async (typeToUse = aiType) => {
    try {
      setAiLoading(true);
      setCopySuccess(false);
      const res = await fetch('/api/v1/ai/customer-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: typeToUse,
          customer_id: id,
          custom_notes: aiCustomNotes,
        }),
      });
      const result = await res.json();
      if (result.success && result.data?.message) {
        setAiMessage(result.data.message);
      }
    } catch (err) {
      console.error('Failed to generate AI customer message:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR EDITING CUSTOMER DETAILS
  // -------------------------------------------------------------
  const handleOpenEditCustomer = () => {
    if (!data?.customer) return;
    const cust = data.customer;
    setCustomerForm({
      customer_name: cust.customer_name || '',
      company_name: cust.company_name || '',
      contact_person: cust.contact_person || '',
      reference: cust.reference || '',
      email: cust.email || '',
      mobile: cust.mobile || '',
      gstin: cust.gstin || '',
      pan: cust.pan || '',
      customer_type: cust.customer_type || 'B2B',
      credit_limit: cust.credit_limit || 100000,
      credit_period_days: cust.credit_period_days || 30,
      payment_terms: cust.payment_terms || 'Immediate / Advance',
      billing_address: {
        address_line1: cust.billing_address?.address_line1 || cust.address?.address_line1 || '',
        city: cust.billing_address?.city || cust.address?.city || '',
        state: cust.billing_address?.state || cust.address?.state || 'Gujarat',
        pincode: cust.billing_address?.pincode || cust.address?.pincode || '',
      },
      shipping_address: {
        address_line1: cust.shipping_address?.address_line1 || '',
        city: cust.shipping_address?.city || '',
        state: cust.shipping_address?.state || 'Gujarat',
        pincode: cust.shipping_address?.pincode || '',
      },
    });
    setCustomerError('');
    setIsEditCustomerOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.customer_name.trim()) {
      setCustomerError('Customer name is required.');
      return;
    }
    try {
      setCustomerSaving(true);
      setCustomerError('');
      await salesApi.updateCustomer(data.customer._id, customerForm);
      setIsEditCustomerOpen(false);
      await loadOverview();
      alert('Customer details updated successfully!');
    } catch (err) {
      setCustomerError(err.message || 'Failed to update customer details');
    } finally {
      setCustomerSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR SALES QUOTATION VIEW & EDIT
  // -------------------------------------------------------------
  const handleViewQuotation = (ord) => {
    setSelectedQuotation(ord);
    setIsQuotationViewOpen(true);
  };

  const handleOpenEditQuotation = (ord) => {
    setEditingQuotation(ord);
    setQuotationEditForm({
      expected_delivery_date: ord.expected_delivery_date
        ? new Date(ord.expected_delivery_date).toISOString().split('T')[0]
        : '',
      payment_terms: ord.payment_terms || 'Immediate / Advance',
      shipping_charges: ord.shipping_charges || 0,
      notes: ord.notes || '',
      items:
        ord.items && ord.items.length > 0
          ? ord.items.map((it) => ({
              product_id: it.product_id?._id || it.product_id || '',
              product_name: it.product_name || '',
              hsn_code: it.hsn_code || '8483',
              quantity: it.quantity || 1,
              uom: it.uom || 'PCS',
              unit_price: it.unit_price || 0,
              discount_amount: it.discount_amount || 0,
              gst_rate: it.gst_rate !== undefined ? it.gst_rate : 18,
            }))
          : [
              {
                product_id: '',
                product_name: 'Architectural Fitting / Hardware',
                hsn_code: '8483',
                quantity: 1,
                uom: 'PCS',
                unit_price: 1000,
                discount_amount: 0,
                gst_rate: 18,
              },
            ],
    });
    setIsQuotationEditOpen(true);
  };

  const handleAddQuotationItem = () => {
    setQuotationEditForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          product_name: '',
          hsn_code: '8483',
          quantity: 1,
          uom: 'PCS',
          unit_price: 0,
          discount_amount: 0,
          gst_rate: 18,
        },
      ],
    }));
  };

  const handleRemoveQuotationItem = (idx) => {
    if (quotationEditForm.items.length <= 1) {
      alert('Quotation must have at least one line item');
      return;
    }
    setQuotationEditForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleQuotationItemChange = (idx, field, val) => {
    const updated = [...quotationEditForm.items];
    updated[idx] = { ...updated[idx], [field]: val };
    setQuotationEditForm((prev) => ({ ...prev, items: updated }));
  };

  const calculateQuotationTotals = () => {
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    (quotationEditForm.items || []).forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.unit_price) || 0;
      const disc = Number(it.discount_amount) || 0;
      const lineTaxable = Math.max(0, qty * rate - disc);
      const gst = (lineTaxable * (Number(it.gst_rate) || 18)) / 100;
      subtotal += qty * rate;
      discount += disc;
      tax += gst;
    });
    const grand = Math.round(subtotal - discount + tax + (Number(quotationEditForm.shipping_charges) || 0));
    return { subtotal, discount, tax, grand };
  };

  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    if (!editingQuotation) return;
    try {
      setQuotationSaving(true);
      await salesApi.updateOrder(editingQuotation._id, quotationEditForm);
      setIsQuotationEditOpen(false);
      setEditingQuotation(null);
      await loadOverview();
      alert('Sales Quotation updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update quotation');
    } finally {
      setQuotationSaving(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR INVOICE PRINT & SHARE
  // -------------------------------------------------------------
  const handleOpenInvoicePrint = (inv) => {
    setSelectedInvoice({
      ...inv,
      customer_id: data.customer,
    });
    setPrintFormat('a4');
    setIsInvoicePrintOpen(true);
  };

  const handleWhatsAppShare = () => {
    if (!selectedInvoice) return;
    const phone = data?.customer?.mobile || '';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const grand = Number(selectedInvoice.grand_total || 0).toLocaleString('en-IN');
    const balance = Number(selectedInvoice.balance_amount || 0).toLocaleString('en-IN');
    const msg = `Dear ${data?.customer?.customer_name || 'Customer'},\n\nHere is your Tax Invoice #${selectedInvoice.invoice_number} from DANZA-SON.\nTotal Amount: ₹${grand}\nRemaining Due: ₹${balance}\nDate: ${new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}\n\nThank you for doing business with us!`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const getUpiQrUrl = (inv) => {
    if (!inv) return '';
    const pending = inv.balance_amount > 0 ? inv.balance_amount : inv.grand_total;
    const upiPayload = `upi://pay?pa=danzason@okhdfcbank&pn=DANZA-SON&am=${pending}&cu=INR&tn=${encodeURIComponent(
      'Invoice ' + inv.invoice_number
    )}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      upiPayload
    )}`;
  };

  if (loading || !data?.customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-9 h-9 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-semibold">Loading Customer 360° Profile & Sales History...</p>
      </div>
    );
  }

  const customer = data.customer;
  const metrics = data.metrics || {};
  const orders = data.orders || [];
  const invoices = data.invoices || [];

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Page Header with Edit & Back Buttons */}
      <PageHeader
        title={customer.customer_name}
        subtitle={`Customer 360° Profile, Commercial Ledger & Sales History (${customer.customer_code})`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Customers', href: '/sales/customers' },
          { label: customer.customer_name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCustomerAiOpen(true);
                handleGenerateCustomerAi('payment_reminder');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition shadow-xs"
              title="AI Customer Communication Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Assistant</span>
            </button>
            <button
              type="button"
              onClick={handleOpenEditCustomer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
              title="Edit Customer Profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Customer</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/sales/customers')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>
        }
      />

      {/* Primary KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Orders Placed</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-brand">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-slate-900 block">
              {metrics.totalOrders || 0}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">Recorded quotations & orders</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Sales Revenue</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-brand">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-brand block">
              ₹{(metrics.totalOrderAmount || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">Lifetime billed gross value</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Available Credit</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-amber-700 block">
              ₹{(metrics.creditAvailable || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Limit: ₹{(customer.credit_limit || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Pending Receivables</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-rose-700 block">
              ₹{(metrics.pendingBalance || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">
              {metrics.pendingBalance > 0 ? 'Payment collection overdue' : 'Account in good standing'}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Quick Profile Card with Direct Edit Button */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Customer Classification
              </span>
              <button
                type="button"
                onClick={handleOpenEditCustomer}
                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold"
                title="Edit Customer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Edit</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-slate-900 text-base">{customer.customer_name}</p>
              <button
                type="button"
                onClick={handleOpenEditCustomer}
                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                title="Edit Customer Details"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-brand border border-emerald-200 font-mono">
                {customer.customer_type || 'B2B'}
              </span>
              <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                {customer.customer_code}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 md:pt-0 md:pl-4">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Contact & GSTIN
            </span>
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.contact_person || customer.company_name || '—'}</span>
            </p>
            <p className="text-xs text-slate-600 font-mono flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.mobile || '—'}</span>
            </p>
            <p className="text-xs text-slate-600 font-mono">GSTIN: {customer.gstin || 'Unregistered'}</p>
          </div>

          <div className="space-y-1.5 pt-3 md:pt-0 md:pl-4">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Billing Terms
            </span>
            <p className="font-semibold text-slate-800 text-sm">{customer.payment_terms || 'Immediate / Advance'}</p>
            <p className="text-xs text-slate-500">Credit Days: {customer.credit_period_days || 30} Days</p>
            <p className="text-xs text-slate-500">
              Reference: <span className="text-emerald-700 font-bold">{customer.reference || 'None'}</span>
            </p>
            <p className="text-xs text-slate-500">
              Total Invoiced: ₹{(metrics.totalInvoiced || 0).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="space-y-1.5 pt-3 md:pt-0 md:pl-4">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Registered Address
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              {customer.billing_address?.address_line1 || customer.address?.address_line1 || '—'}
              <br />
              {customer.billing_address?.city || customer.address?.city},{' '}
              {customer.billing_address?.state || customer.address?.state} -{' '}
              {customer.billing_address?.pincode || customer.address?.pincode}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation for Full History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-brand text-brand bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Sales Quotations & Orders</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-medium">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'border-brand text-brand bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Tax Invoices & Ledger</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-medium">
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-brand text-brand bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Account Details & Shipping</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5">
          {/* ================= TAB 1: ORDERS ================= */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Historical Quotations & Commercial Orders
                </h4>
                <Link
                  to="/sales/orders"
                  className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
                >
                  <span>Go to Quotations</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No sales quotations or orders recorded for this customer yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase">
                      <tr>
                        <th className="p-3">Quotation / SO #</th>
                        <th className="p-3">Order Date</th>
                        <th className="p-3">Items</th>
                        <th className="p-3 text-right">Grand Total (₹)</th>
                        <th className="p-3 text-center">Dispatch Status</th>
                        <th className="p-3 text-center">Payment</th>
                        <th className="p-3 text-center">Order Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((ord) => (
                        <tr key={ord._id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3 font-mono font-bold text-slate-900">{ord.so_number}</td>
                          <td className="p-3 text-slate-600 font-medium">
                            {new Date(ord.order_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-3 text-slate-600 text-xs">
                            {ord.items?.length || 0} line items
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{(ord.grand_total || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center">
                            <StatusBadge status={ord.dispatch_status || 'not_dispatched'} />
                          </td>
                          <td className="p-3 text-center">
                            <StatusBadge status={ord.payment_status} />
                          </td>
                          <td className="p-3 text-center">
                            <StatusBadge status={ord.status} />
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Quotation Button */}
                              <button
                                type="button"
                                onClick={() => handleViewQuotation(ord)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition inline-flex items-center gap-1 shadow-2xs"
                                title="View Quotation"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              {/* Edit Quotation Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditQuotation(ord)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition inline-flex items-center gap-1 shadow-2xs border border-emerald-200/60"
                                title="Edit Sales Quotation"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: INVOICES ================= */}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 text-sm">Customer Invoices & Billing Ledger</h4>
                <Link
                  to="/sales/invoices"
                  className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
                >
                  <span>Go to Invoices</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {invoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No tax invoices issued to this customer yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Invoice Date</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3 text-right">Invoice Total (₹)</th>
                        <th className="p-3 text-right">Paid (₹)</th>
                        <th className="p-3 text-right">Balance Due (₹)</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {inv.invoice_number}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            {new Date(inv.invoice_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{(inv.grand_total || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                            ₹{(inv.paid_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-600">
                            ₹{(inv.balance_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center">
                            <StatusBadge status={inv.payment_status} />
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View / Print Invoice Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenInvoicePrint(inv)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition inline-flex items-center gap-1 shadow-2xs"
                                title="View & Print Tax Invoice"
                              >
                                <Printer className="w-3.5 h-3.5" /> View
                              </button>
                              {/* Edit Invoice Button (Navigates to dedicated edit page) */}
                              <button
                                type="button"
                                onClick={() => navigate(`/sales/invoices/${inv._id}/edit`)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition inline-flex items-center gap-1 shadow-2xs border border-emerald-200/60"
                                title="Edit Tax Invoice"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: ACCOUNT INFO ================= */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Billing Location */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h5 className="font-bold text-slate-900 text-sm">Official Billing Address</h5>
                  <button
                    type="button"
                    onClick={handleOpenEditCustomer}
                    className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">{customer.customer_name}</p>
                  <p>{customer.billing_address?.address_line1 || '—'}</p>
                  {customer.billing_address?.address_line2 && (
                    <p>{customer.billing_address.address_line2}</p>
                  )}
                  <p>
                    {customer.billing_address?.city}, {customer.billing_address?.state} -{' '}
                    {customer.billing_address?.pincode}
                  </p>
                  <p className="font-mono text-slate-500 pt-1">
                    Country: {customer.billing_address?.country || 'India'}
                  </p>
                </div>
              </div>

              {/* Shipping Location */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h5 className="font-bold text-slate-900 text-sm">Default Shipping & Delivery Depot</h5>
                  <button
                    type="button"
                    onClick={handleOpenEditCustomer}
                    className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">
                    {customer.company_name || customer.customer_name}
                  </p>
                  <p>{customer.shipping_address?.address_line1 || 'Same as billing address'}</p>
                  {customer.shipping_address?.address_line2 && (
                    <p>{customer.shipping_address.address_line2}</p>
                  )}
                  <p>
                    {customer.shipping_address?.city || customer.billing_address?.city},{' '}
                    {customer.shipping_address?.state || customer.billing_address?.state} -{' '}
                    {customer.shipping_address?.pincode || customer.billing_address?.pincode}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. EDIT CUSTOMER DETAILS MODAL                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditCustomerOpen}
        onClose={() => setIsEditCustomerOpen(false)}
        title={`Edit Customer Details: ${customer.customer_name}`}
        size="lg"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
          {customerError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{customerError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerForm.customer_name}
                onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Legal Trade Name</label>
              <input
                type="text"
                value={customerForm.company_name}
                onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={customerForm.contact_person}
                onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="text"
                value={customerForm.mobile}
                onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono focus:border-brand outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reference</label>
              <input
                type="text"
                value={customerForm.reference}
                onChange={(e) => setCustomerForm({ ...customerForm, reference: e.target.value })}
                placeholder="e.g. Sales Executive / Referral / Campaign"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={customerForm.gstin}
                onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.target.value.toUpperCase() })}
                placeholder="24AAACK1234E1Z5"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono uppercase focus:border-brand outline-none"
              />
            </div>

            {/* Customer Type: 4 Interactive Visual Cards */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5">
                Customer Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'B2B', label: 'B2B', desc: 'Business to Business' },
                  { id: 'B2C', label: 'B2C', desc: 'Business to Consumer' },
                  { id: 'B2D', label: 'B2D', desc: 'Business to Dealer' },
                  { id: 'D2C', label: 'D2C', desc: 'Direct to Consumer' },
                ].map((t) => {
                  const isSelected = customerForm.customer_type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCustomerForm({ ...customerForm, customer_type: t.id })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-extrabold tracking-tight ${
                            isSelected ? 'text-emerald-800' : 'text-slate-800'
                          }`}
                        >
                          {t.label}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                value={customerForm.credit_limit}
                onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={customerForm.payment_terms}
                onChange={(e) => setCustomerForm({ ...customerForm, payment_terms: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold focus:border-brand outline-none bg-white"
              >
                <option value="Immediate / Advance">Immediate / Advance</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 45 Days">Net 45 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
              </select>
            </div>
          </div>

          {/* Billing Address */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs mb-2">Billing Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Address Line / Shop No. / Street"
                  value={customerForm.billing_address.address_line1}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      billing_address: {
                        ...customerForm.billing_address,
                        address_line1: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-brand outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="City"
                  value={customerForm.billing_address.city}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      billing_address: {
                        ...customerForm.billing_address,
                        city: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-brand outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="State"
                  value={customerForm.billing_address.state}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      billing_address: {
                        ...customerForm.billing_address,
                        state: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-brand outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Pincode"
                  value={customerForm.billing_address.pincode}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      billing_address: {
                        ...customerForm.billing_address,
                        pincode: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono focus:border-brand outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditCustomerOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={customerSaving}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {customerSaving ? 'Saving...' : 'Save Customer Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. VIEW SALES QUOTATION MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQuotationViewOpen}
        onClose={() => setIsQuotationViewOpen(false)}
        title={selectedQuotation ? `Quotation Details: ${selectedQuotation.so_number}` : 'Quotation'}
        size="xl"
      >
        {selectedQuotation && (
          <div className="space-y-4 text-xs">
            {/* Meta card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-medium">
              <div>
                <span className="text-slate-400 block text-[11px]">Quotation #</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedQuotation.so_number}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Order Date</span>
                <span className="text-slate-800 font-semibold">
                  {new Date(selectedQuotation.order_date).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Payment Terms</span>
                <span className="text-slate-800 font-semibold">
                  {selectedQuotation.payment_terms || 'Immediate / Advance'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <StatusBadge status={selectedQuotation.status} />
              </div>
            </div>

            {/* Items table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5 text-center">HSN</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-center">GST %</th>
                    <th className="p-2.5 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedQuotation.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-slate-900">{it.product_name}</td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{it.hsn_code || '8483'}</td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        {it.quantity} {it.uom || 'PCS'}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        ₹{(it.unit_price || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-center font-mono">{it.gst_rate || 18}%</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        ₹{(it.total_price || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">
                Notes: <span className="text-slate-800">{selectedQuotation.notes || 'None'}</span>
              </span>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 uppercase font-bold block">Grand Total</span>
                <span className="text-lg font-mono font-extrabold text-slate-900">
                  ₹{(selectedQuotation.grand_total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsQuotationViewOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsQuotationViewOpen(false);
                  handleOpenEditQuotation(selectedQuotation);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 inline-flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Quotation
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 3. EDIT SALES QUOTATION MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQuotationEditOpen}
        onClose={() => setIsQuotationEditOpen(false)}
        title={editingQuotation ? `Edit Sales Quotation: ${editingQuotation.so_number}` : 'Edit Quotation'}
        size="xl"
      >
        {editingQuotation && (
          <form onSubmit={handleSaveQuotation} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={quotationEditForm.expected_delivery_date}
                  onChange={(e) =>
                    setQuotationEditForm({ ...quotationEditForm, expected_delivery_date: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Terms</label>
                <select
                  value={quotationEditForm.payment_terms}
                  onChange={(e) =>
                    setQuotationEditForm({ ...quotationEditForm, payment_terms: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 font-medium bg-white"
                >
                  <option value="Immediate / Advance">Immediate / Advance</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 45 Days">Net 45 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Shipping Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={quotationEditForm.shipping_charges}
                  onChange={(e) =>
                    setQuotationEditForm({ ...quotationEditForm, shipping_charges: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 font-mono font-bold"
                />
              </div>
            </div>

            {/* Line items editor */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Quotation Line Items</span>
                <button
                  type="button"
                  onClick={handleAddQuotationItem}
                  className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="p-2 w-56">Item Name</th>
                      <th className="p-2 w-20 text-center">HSN</th>
                      <th className="p-2 w-20 text-center">Qty</th>
                      <th className="p-2 w-20 text-center">Unit</th>
                      <th className="p-2 w-24 text-right">Rate (₹)</th>
                      <th className="p-2 w-20 text-center">GST %</th>
                      <th className="p-2 w-24 text-right">Total</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotationEditForm.items.map((it, idx) => {
                      const qty = Number(it.quantity) || 0;
                      const rate = Number(it.unit_price) || 0;
                      const disc = Number(it.discount_amount) || 0;
                      const lineTaxable = Math.max(0, qty * rate - disc);
                      const gst = (lineTaxable * (Number(it.gst_rate) || 18)) / 100;
                      const lineTotal = Math.round(lineTaxable + gst);

                      return (
                        <tr key={idx}>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              value={it.product_name}
                              onChange={(e) => handleQuotationItemChange(idx, 'product_name', e.target.value)}
                              placeholder="Item description..."
                              className="w-full px-2 py-1 border border-slate-200 rounded font-semibold text-slate-800"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={it.hsn_code}
                              onChange={(e) => handleQuotationItemChange(idx, 'hsn_code', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded text-center font-mono"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min="1"
                              required
                              value={it.quantity}
                              onChange={(e) =>
                                handleQuotationItemChange(idx, 'quantity', Number(e.target.value))
                              }
                              className="w-full px-1.5 py-1 border border-slate-200 rounded text-center font-mono font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={it.uom || 'PCS'}
                              onChange={(e) => handleQuotationItemChange(idx, 'uom', e.target.value)}
                              className="w-full px-1 py-1 border border-slate-200 rounded text-center bg-white"
                            >
                              <option value="PCS">PCS</option>
                              <option value="NOS">NOS</option>
                              <option value="MTR">MTR</option>
                              <option value="KGS">KGS</option>
                              <option value="BOX">BOX</option>
                              <option value="SET">SET</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={it.unit_price}
                              onChange={(e) =>
                                handleQuotationItemChange(idx, 'unit_price', Number(e.target.value))
                              }
                              className="w-full px-2 py-1 border border-slate-200 rounded text-right font-mono font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={it.gst_rate}
                              onChange={(e) =>
                                handleQuotationItemChange(idx, 'gst_rate', Number(e.target.value))
                              }
                              className="w-full px-1 py-1 border border-slate-200 rounded text-center bg-white"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                            ₹{lineTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveQuotationItem(idx)}
                              className="text-slate-400 hover:text-rose-600 transition"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live totals */}
            {(() => {
              const qTotals = calculateQuotationTotals();
              return (
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                  <span className="text-slate-500 font-sans text-xs">
                    Subtotal: <strong>₹{qTotals.subtotal.toLocaleString('en-IN')}</strong> · GST Tax: <strong>₹{qTotals.tax.toLocaleString('en-IN')}</strong>
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">Grand Total</span>
                    <span className="text-base font-extrabold text-slate-900 block">
                      ₹{qTotals.grand.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Notes / Terms</label>
              <input
                type="text"
                value={quotationEditForm.notes}
                onChange={(e) => setQuotationEditForm({ ...quotationEditForm, notes: e.target.value })}
                placeholder="Notes for client..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsQuotationEditOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={quotationSaving}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {quotationSaving ? 'Saving...' : 'Save Quotation Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 4. A4 & THERMAL TAX INVOICE PRINT & PDF DOWNLOAD MODAL                      */}
      {/* ========================================================================= */}
      {isInvoicePrintOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:shadow-none print:rounded-none">
            {/* Top Toolbar (Hidden on print) */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvoicePrintOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>

                <div className="inline-flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPrintFormat('a4')}
                    className={`px-3 py-1 rounded-md transition ${
                      printFormat === 'a4'
                        ? 'bg-white text-emerald-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📄 A4 Tax Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFormat('thermal')}
                    className={`px-3 py-1 rounded-md transition ${
                      printFormat === 'thermal'
                        ? 'bg-white text-emerald-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🧾 3" Thermal POS
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Share
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
              </div>
            </div>

            {/* Print Body */}
            <div className="p-6 overflow-y-auto bg-slate-100/50 print:bg-white print:p-0 flex justify-center">
              {printFormat === 'a4' ? (
                /* A4 Tax Invoice */
                <div className="w-full max-w-[800px] bg-white p-8 sm:p-10 shadow-sm border border-slate-200 text-slate-800 text-xs print:border-none print:shadow-none print:p-0">
                  {/* Header */}
                  <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-lg flex items-center justify-center">
                          D
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                          DANZA-SON
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        Ur Path Ur Style · Architectural Fittings
                      </p>
                      <p className="text-slate-600 mt-2 text-[11px] leading-relaxed">
                        Plot No. 42, GIDC Industrial Estate,
                        <br />
                        Shapar-Veraval, Rajkot, Gujarat - 360024
                        <br />
                        GSTIN: <strong className="font-mono">24AAACD1234F1Z9</strong> | State: Gujarat (24)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded">
                        TAX INVOICE
                      </span>
                      <p className="font-mono font-black text-lg text-slate-900 mt-2">
                        #{selectedInvoice.invoice_number}
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        Date: <strong>{new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}</strong>
                      </p>
                      {selectedInvoice.due_date && (
                        <p className="text-slate-600 text-[11px]">
                          Due: <strong>{new Date(selectedInvoice.due_date).toLocaleDateString('en-IN')}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Billed To (Customer):
                      </span>
                      <p className="font-bold text-slate-900 text-sm">{customer.customer_name}</p>
                      <p className="text-slate-600 leading-relaxed">
                        {customer.billing_address?.address_line1 || 'Address on file'}
                        <br />
                        {customer.billing_address?.city || ''}, {customer.billing_address?.state || 'Gujarat'} -{' '}
                        {customer.billing_address?.pincode || ''}
                      </p>
                      <p className="font-mono text-slate-700 mt-1">
                        GSTIN: <strong>{customer.gstin || 'URP'}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Dispatch & Supply Details:
                      </span>
                      <p className="text-slate-700">
                        Place of Supply: <strong>{selectedInvoice.place_of_supply || 'Gujarat (24)'}</strong>
                      </p>
                      <p className="text-slate-700">
                        Payment Status:{' '}
                        <strong className="uppercase text-emerald-700">{selectedInvoice.payment_status}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-left text-xs my-4 border-collapse">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-y border-slate-300">
                      <tr>
                        <th className="py-2 px-2 w-8 text-center">#</th>
                        <th className="py-2 px-2">Description</th>
                        <th className="py-2 px-2 text-center w-16">HSN</th>
                        <th className="py-2 px-2 text-center w-14">Qty</th>
                        <th className="py-2 px-2 text-right w-20">Rate (₹)</th>
                        <th className="py-2 px-2 text-center w-14">GST</th>
                        <th className="py-2 px-2 text-right w-24">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(selectedInvoice.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-2 text-center font-mono">{idx + 1}</td>
                          <td className="py-2 px-2 font-semibold text-slate-900">{it.product_name}</td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600">{it.hsn_code || '8483'}</td>
                          <td className="py-2 px-2 text-center font-mono">
                            {it.quantity} {it.uom || 'PCS'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {(it.unit_price || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-2 text-center font-mono">{it.gst_rate || 18}%</td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                            {(it.total_price || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary & Bank QR */}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-slate-300">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Amount In Words:
                      </span>
                      <p className="font-semibold text-slate-800 text-[11px] capitalize italic">
                        {amountInWords(selectedInvoice.grand_total || 0)} Only
                      </p>

                      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                        <img
                          src={getUpiQrUrl(selectedInvoice)}
                          alt="Scan to Pay UPI"
                          className="w-16 h-16 rounded border border-slate-200"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-slate-900 block">Scan & Pay via UPI</span>
                          <span className="font-mono text-slate-500 block">danzason@okhdfcbank</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-right font-mono">
                      <div className="flex justify-between text-slate-600">
                        <span>Taxable Subtotal:</span>
                        <span>₹{(selectedInvoice.subtotal || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST Amount:</span>
                        <span>₹{(selectedInvoice.tax_total || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-300">
                        <span>Grand Total:</span>
                        <span>₹{(selectedInvoice.grand_total || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Paid Amount:</span>
                        <span>₹{(selectedInvoice.paid_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-rose-600 font-extrabold text-sm pt-1 border-t border-slate-200">
                        <span>Balance Due:</span>
                        <span>₹{(selectedInvoice.balance_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Thermal 3" Receipt */
                <div className="w-[300px] bg-white p-4 shadow-sm border border-slate-200 font-mono text-[11px] leading-tight text-slate-900">
                  <div className="text-center pb-2 border-b border-dashed border-slate-400">
                    <p className="font-black text-sm">DANZA-SON</p>
                    <p className="text-[10px]">Ur Path Ur Style</p>
                    <p className="text-[10px]">Rajkot, Gujarat</p>
                    <p className="text-[10px] mt-1">TAX INVOICE: {selectedInvoice.invoice_number}</p>
                    <p className="text-[10px]">
                      Date: {new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-400 text-[10px]">
                    <p>Client: {customer.customer_name}</p>
                    <p>GSTIN: {customer.gstin || 'URP'}</p>
                  </div>

                  <table className="w-full text-left my-2 text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="py-1">Item</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-right">Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedInvoice.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-0.5 truncate max-w-[120px]">{it.product_name}</td>
                          <td className="py-0.5 text-center">{it.quantity}</td>
                          <td className="py-0.5 text-right font-bold">
                            ₹{(it.total_price || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="pt-2 border-t border-dashed border-slate-400 text-right space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>₹{(selectedInvoice.grand_total || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Paid:</span>
                      <span>₹{(selectedInvoice.paid_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-black text-rose-600">
                      <span>Balance:</span>
                      <span>₹{(selectedInvoice.balance_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="text-center pt-3 mt-3 border-t border-dashed border-slate-400 text-[10px]">
                    <img
                      src={getUpiQrUrl(selectedInvoice)}
                      alt="UPI QR"
                      className="w-20 h-20 mx-auto object-contain"
                    />
                    <p className="mt-1 font-bold">Scan to Pay UPI</p>
                    <p className="text-[9px] text-slate-500">Thank you for your business!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. CUSTOMER AI ASSISTANT MODAL */}
      <Modal
        isOpen={isCustomerAiOpen}
        onClose={() => setIsCustomerAiOpen(false)}
        title={`AI Assistant: Communication with ${customer.customer_name}`}
        size="lg"
      >
        <div className="space-y-4 text-sm">
          {/* Action Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl">
            {[
              { id: 'payment_reminder', label: 'Payment Reminder' },
              { id: 'quotation_followup', label: 'Quotation Follow-up' },
              { id: 'order_status', label: 'Order Status' },
              { id: 'summarize_history', label: 'Account Summary' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setAiType(tab.id);
                  handleGenerateCustomerAi(tab.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  aiType === tab.id
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Optional instructions / Custom notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Custom Context or Instructions (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiCustomNotes}
                onChange={(e) => setAiCustomNotes(e.target.value)}
                placeholder="e.g. Please process before end of financial week..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-violet-600 outline-none"
              />
              <button
                type="button"
                onClick={() => handleGenerateCustomerAi(aiType)}
                disabled={aiLoading}
                className="px-3.5 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'Regenerating...' : 'Regenerate'}</span>
              </button>
            </div>
          </div>

          {/* Generated Message (Editable with User Approval) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Generated Message (Review & Edit before sending)
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Verified ERP Data Only
              </span>
            </div>
            <textarea
              rows={8}
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              placeholder="Generating AI message from customer transaction ledger..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans focus:border-violet-600 outline-none resize-none bg-slate-50/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Customer Contact: <strong className="font-mono text-slate-800">{customer.mobile || 'No mobile'}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(aiMessage);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2500);
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy Text'}</span>
              </button>
              {customer.mobile && (
                <a
                  href={`https://wa.me/91${customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(aiMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
