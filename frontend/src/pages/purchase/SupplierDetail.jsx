import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  ShoppingCart,
  MessageSquareDiff,
  Receipt,
  PackageCheck,
  Star,
  ExternalLink,
  Plus,
  ShieldCheck,
  Calendar,
  FileText,
  Sparkles,
  Copy,
  Share2,
  Check,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { ft } from '../../services/procurementService';

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'quotations' | 'invoices' | 'grns' | 'info'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Supplier AI Assistant State
  const [isSupplierAiOpen, setIsSupplierAiOpen] = useState(false);
  const [aiType, setAiType] = useState('quotation_request');
  const [aiCustomNotes, setAiCustomNotes] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleGenerateSupplierAi = async (typeToUse = aiType) => {
    try {
      setAiLoading(true);
      setCopySuccess(false);
      const res = await fetch('/api/v1/ai/supplier-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: typeToUse,
          supplier_id: id,
          custom_notes: aiCustomNotes,
        }),
      });
      const result = await res.json();
      if (result.success && result.data?.message) {
        setAiMessage(result.data.message);
      }
    } catch (err) {
      console.error('Failed to generate supplier AI message:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      navigate('/purchase/suppliers', { replace: true });
      return;
    }
    loadOverview();
  }, [id]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await ft.getSupplierOverview(id);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load supplier overview:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data?.supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-9 h-9 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-semibold">Loading supplier profile & transaction history...</p>
      </div>
    );
  }

  const supplier = data.supplier;
  const metrics = data.metrics || {};
  const orders = data.orders || [];
  const quotations = data.quotations || [];
  const invoices = data.invoices || [];
  const grns = data.grns || [];

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Page Header with Back Icon Button */}
      <PageHeader
        title={supplier.supplier_name}
        subtitle={`Vendor Profile, Procurement History & Commercial Ledger (${supplier.supplier_code})`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Suppliers', href: '/purchase/suppliers' },
          { label: supplier.supplier_name },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsSupplierAiOpen(true);
                handleGenerateSupplierAi('quotation_request');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition shadow-sm"
              title="Supplier AI Communication Assistant"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Assistant</span>
            </button>
            <button
              onClick={() => navigate('/purchase/suppliers')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back to Suppliers</span>
            </button>
            <Link
              to="/purchase/orders"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Purchase Orders</span>
            </Link>
          </div>
        }
      />

      {/* Supplier Profile Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-bold text-2xl tracking-tight text-white">{supplier.supplier_name}</h2>
            <span className="bg-white/10 text-emerald-300 font-mono text-xs px-2.5 py-0.5 rounded-full font-semibold">
              {supplier.supplier_code}
            </span>
            {((Array.isArray(supplier.categories) && supplier.categories.length > 0)
              ? supplier.categories
              : [supplier.category || 'Vendor']).map((cat, i) => (
              <span key={i} className="bg-brand text-white text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                {cat}
              </span>
            ))}
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Active Vendor
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-300 text-xs pt-0.5">
            {supplier.contact_person && (
              <span>Contact: <strong className="text-white font-medium">{supplier.contact_person}</strong></span>
            )}
            {supplier.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {supplier.email}
              </span>
            )}
            {supplier.mobile && (
              <span className="inline-flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {supplier.mobile}
              </span>
            )}
            {supplier.gstin && (
              <span className="font-mono text-emerald-400 font-semibold">
                GSTIN: {supplier.gstin}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/10 px-3.5 py-2.5 rounded-lg backdrop-blur-sm shrink-0 border border-white/5">
          <span className="text-slate-300 text-xs font-medium mr-1.5">Rating:</span>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < (supplier.rating || 0)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider block">
            Total Purchased
          </span>
          <span className="text-2xl font-bold text-brand font-mono mt-1.5 block">
            ₹{Number(metrics.totalPurchaseAmount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 mt-1 block font-medium">
            Across {metrics.totalOrders || 0} Purchase Orders
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider block">
            Total Invoiced
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-1.5 block">
            ₹{Number(metrics.totalInvoiced || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 mt-1 block font-medium">
            {metrics.totalInvoices || 0} Commercial Bills
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow transition-shadow">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider block">
            Total Paid
          </span>
          <span className="text-2xl font-bold text-emerald-700 font-mono mt-1.5 block">
            ₹{Number(metrics.totalPaid || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 mt-1 block font-medium">
            Settled Payments
          </span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm hover:shadow transition-shadow">
          <span className="text-xs font-semibold uppercase text-amber-800 tracking-wider block">
            Pending Balance
          </span>
          <span className="text-2xl font-bold text-amber-900 font-mono mt-1.5 block">
            ₹{Number(metrics.pendingBalance || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-amber-700 mt-1 block font-medium">
            Terms: {supplier.payment_terms || 'Net 30 Days'}
          </span>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-3 flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-brand text-brand bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Purchase Orders</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-medium">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotations')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
              activeTab === 'quotations'
                ? 'border-brand text-brand bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquareDiff className="w-4 h-4" />
            <span>Quotations & RFQ</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-medium">
              {quotations.length}
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
            <span>Invoices & Payments</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-medium">
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grns')}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
              activeTab === 'grns'
                ? 'border-brand text-brand bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Goods Receipts (GRN)</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-medium">
              {grns.length}
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
            <Building className="w-4 h-4" />
            <span>Profile & Bank Details</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6">
          {/* TAB 1: PURCHASE ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Purchase Orders (PO)</h3>
                  <p className="text-sm text-slate-500">Commercial agreements and purchase commitments for this vendor</p>
                </div>
                <span className="text-sm font-mono font-bold text-brand bg-emerald-50 px-3.5 py-1.5 rounded-lg border border-emerald-100">
                  Total PO Commitments: ₹{Number(metrics.totalPurchaseAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="py-14 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-base font-semibold text-slate-600">No Purchase Orders Found</p>
                  <p className="text-sm text-slate-400 mt-0.5">No commercial orders issued to this supplier yet.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-base">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                      <tr>
                        <th className="py-3.5 px-4">PO Number</th>
                        <th className="py-3.5 px-3">Date</th>
                        <th className="py-3.5 px-4">Warehouse</th>
                        <th className="py-3.5 px-3 text-center">Items</th>
                        <th className="py-3.5 px-4 text-right">Grand Total</th>
                        <th className="py-3.5 px-3 text-center">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-base">
                      {orders.map((po) => (
                        <tr key={po._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{po.po_number}</td>
                          <td className="py-3.5 px-3 text-slate-600 font-sans">
                            {new Date(po.po_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-sans text-slate-700 font-medium">
                            {po.warehouse_id?.warehouse_name || 'Central'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                            {po.items?.length || 0}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-base">
                            ₹{Number(po.grand_total || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-3 text-center font-sans">
                            <StatusBadge status={po.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right font-sans">
                            <Link
                              to={`/purchase/orders/${po._id}`}
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                            >
                              <span>View PO</span>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUOTATIONS & RFQ */}
          {activeTab === 'quotations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Quotations & RFQ Bids</h3>
                  <p className="text-sm text-slate-500">Rate quotations submitted by this vendor for procurement inquiries</p>
                </div>
                <span className="text-sm font-semibold text-slate-600">
                  {quotations.length} RFQ Inquiries Logged
                </span>
              </div>

              {quotations.length === 0 ? (
                <div className="py-14 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <MessageSquareDiff className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-base font-semibold text-slate-600">No Quotations Found</p>
                  <p className="text-sm text-slate-400 mt-0.5">This supplier has not been invited to RFQs yet.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-base">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                      <tr>
                        <th className="py-3.5 px-4">Inquiry #</th>
                        <th className="py-3.5 px-4">Title</th>
                        <th className="py-3.5 px-3 text-right">Quoted Price</th>
                        <th className="py-3.5 px-3">Quoted Delivery</th>
                        <th className="py-3.5 px-3 text-center">Status</th>
                        <th className="py-3.5 px-4">Remarks / Acceptance Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotations.map((q) => (
                        <tr key={q._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {q.inquiry_number}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">{q.title}</td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 text-base">
                            {q.quoted_price ? `₹${Number(q.quoted_price).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-3.5 px-3 text-slate-600 text-sm">
                            {q.quoted_delivery_date
                              ? new Date(q.quoted_delivery_date).toLocaleDateString('en-IN')
                              : 'Pending'}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <StatusBadge status={q.status} />
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate text-sm">
                            {q.accept_reason || q.reject_reason || q.quoted_remarks || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVOICES & PAYMENTS */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Commercial Invoices & Payment Ledger</h3>
                  <p className="text-sm text-slate-500">Booked vendor bills, tax breakdowns, payments, and balances</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
                  <span className="text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
                    Billed: <strong className="font-bold">₹{Number(metrics.totalInvoiced || 0).toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 font-medium">
                    Paid: <strong className="font-bold">₹{Number(metrics.totalPaid || 0).toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-bold">
                    Balance: <strong>₹{Number(metrics.pendingBalance || 0).toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="py-14 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-base font-semibold text-slate-600">No Commercial Invoices Recorded</p>
                  <p className="text-sm text-slate-400 mt-0.5">No vendor bills booked for this supplier yet.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-base">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                      <tr>
                        <th className="py-3.5 px-4">System Bill #</th>
                        <th className="py-3.5 px-3">Vendor Bill #</th>
                        <th className="py-3.5 px-3">Date</th>
                        <th className="py-3.5 px-3 text-right">Taxable</th>
                        <th className="py-3.5 px-4 text-right">Grand Total</th>
                        <th className="py-3.5 px-3 text-right">Paid</th>
                        <th className="py-3.5 px-3 text-right">Balance</th>
                        <th className="py-3.5 px-3 text-center">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-base">
                      {invoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{inv.invoice_number}</td>
                          <td className="py-3.5 px-3 text-slate-700 font-medium">{inv.vendor_bill_number}</td>
                          <td className="py-3.5 px-3 text-slate-600 font-sans">
                            {new Date(inv.bill_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            ₹{Number(inv.taxable_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-base">
                            ₹{Number(inv.grand_total || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-3 text-right text-emerald-700 font-bold">
                            ₹{Number(inv.paid_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-3 text-right text-amber-700 font-bold">
                            ₹{Number(inv.balance_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-3 text-center font-sans">
                            <span
                              className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                inv.payment_status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {inv.payment_status || 'UNPAID'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GOODS RECEIPTS (GRN) */}
          {activeTab === 'grns' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Goods Receipts (GRN)</h3>
                  <p className="text-sm text-slate-500">Inward physical deliveries and inspection challans recorded for this supplier</p>
                </div>
                <span className="text-sm font-semibold text-slate-600">
                  {grns.length} Inward Deliveries
                </span>
              </div>

              {grns.length === 0 ? (
                <div className="py-14 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <PackageCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-base font-semibold text-slate-600">No Goods Receipts Found</p>
                  <p className="text-sm text-slate-400 mt-0.5">No inward shipments recorded for this supplier yet.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-base">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                      <tr>
                        <th className="py-3.5 px-4">GRN #</th>
                        <th className="py-3.5 px-3">Date</th>
                        <th className="py-3.5 px-4">PO Reference</th>
                        <th className="py-3.5 px-3">Challan #</th>
                        <th className="py-3.5 px-4">Warehouse</th>
                        <th className="py-3.5 px-3 text-center">Stock Posted</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-base">
                      {grns.map((g) => (
                        <tr key={g._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{g.grn_number}</td>
                          <td className="py-3.5 px-3 text-slate-600 font-sans">
                            {new Date(g.grn_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {g.po_id?.po_number || 'Direct'}
                          </td>
                          <td className="py-3.5 px-3 text-slate-700 font-medium">{g.vendor_challan_no || '—'}</td>
                          <td className="py-3.5 px-4 font-sans text-slate-700 font-medium">
                            {g.warehouse_id?.warehouse_name || 'Central'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-sans">
                            <span
                              className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                g.stock_posted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {g.stock_posted ? 'Posted' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-sans">
                            <Link
                              to={`/purchase/grn/${g._id}`}
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                            >
                              <span>View GRN</span>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VENDOR PROFILE & BANK */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-base uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand" /> Address & Terms
                </h4>
                <div className="space-y-1.5 text-slate-700 text-sm">
                  <p className="font-bold text-base text-slate-900">{supplier.address?.address_line1 || 'No street address specified'}</p>
                  <p>{supplier.address?.city}, {supplier.address?.state} - {supplier.address?.pincode}</p>
                  <p className="text-slate-500">{supplier.address?.country || 'India'}</p>
                </div>
                <div className="pt-4 border-t border-slate-200/80 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Terms:</span>
                    <span className="font-bold text-slate-800">{supplier.payment_terms || 'Net 30 Days'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credit Period:</span>
                    <span className="font-bold text-slate-800">{supplier.credit_period_days || 30} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Credit Limit:</span>
                    <span className="font-bold text-slate-900 font-mono text-base">
                      ₹{Number(supplier.credit_limit || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-base uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand" /> Bank Account & Tax Registration
                </h4>
                <div className="space-y-2.5 font-mono text-sm text-slate-700">
                  <div className="flex justify-between font-sans">
                    <span className="text-slate-500">Bank Name:</span>
                    <span className="font-bold text-slate-900 text-base">{supplier.bank_details?.bank_name || 'HDFC Bank'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Account #:</span>
                    <span className="font-bold text-slate-900 text-base">{supplier.bank_details?.account_number || '50200034891234'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">IFSC Code:</span>
                    <span className="font-bold text-slate-900 text-base">{supplier.bank_details?.ifsc_code || 'HDFC0001234'}</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-slate-500">Branch:</span>
                    <span className="text-slate-800 font-medium">{supplier.bank_details?.branch || 'Surat Main Branch'}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200/80 space-y-2.5 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">PAN:</span>
                    <strong className="text-slate-900 text-base">{supplier.pan || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">GSTIN:</span>
                    <strong className="text-emerald-700 text-base font-bold">{supplier.gstin || 'Unregistered'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUPPLIER AI ASSISTANT MODAL */}
      {isSupplierAiOpen && (
        <Modal
          isOpen={isSupplierAiOpen}
          onClose={() => setIsSupplierAiOpen(false)}
          title={`AI Assistant: Communication with ${supplier.supplier_name}`}
          size="lg"
        >
          <div className="space-y-4 text-sm">
            {/* Action Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl">
              {[
                { id: 'quotation_request', label: 'Quotation Request' },
                { id: 'purchase_followup', label: 'Purchase Follow-up' },
                { id: 'quotation_rejection', label: 'Quotation Rejection' },
                { id: 'summarize_history', label: 'Account Summary' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAiType(tab.id);
                    handleGenerateSupplierAi(tab.id);
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

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Context or Additional Notes (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiCustomNotes}
                  onChange={(e) => setAiCustomNotes(e.target.value)}
                  placeholder="e.g. Requirement needed within 5 business days..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-violet-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateSupplierAi(aiType)}
                  disabled={aiLoading}
                  className="px-3.5 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiLoading ? 'Regenerating...' : 'Regenerate'}</span>
                </button>
              </div>
            </div>

            {/* Message Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Generated Message (Review & Edit before sending)
                </label>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified Real Supplier Data
                </span>
              </div>
              <textarea
                rows={8}
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="Generating AI message from ERP records..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans focus:border-violet-600 outline-none resize-none bg-slate-50/50"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                Supplier Mobile: <strong className="font-mono text-slate-800">{supplier.mobile || 'No mobile registered'}</strong>
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
                {supplier.mobile && (
                  <a
                    href={`https://wa.me/91${supplier.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(aiMessage)}`}
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
      )}
    </div>
  );
}
