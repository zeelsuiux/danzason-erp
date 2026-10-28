import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, PackageCheck, Truck, CheckCircle2, Clock, XCircle, 
  MapPin, Phone, User, Calendar, FileText, ArrowLeft, ShieldCheck, Printer, AlertCircle
} from 'lucide-react';
import VisitorNavbar from '../../components/visitor/VisitorNavbar';
import { visitorApi } from '../../services/procurementService';

const STATUS_STEPS = [
  { key: 'draft', label: 'Order Placed', desc: 'Received & Pending Review' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Verified & Approved' },
  { key: 'processing', label: 'Processing', desc: 'Packed at Warehouse' },
  { key: 'dispatched', label: 'Dispatched', desc: 'In Transit with Courier' },
  { key: 'delivered', label: 'Delivered', desc: 'Received by Customer' },
];

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('ref') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setSearchQuery(ref);
      fetchOrder(ref);
    }
  }, [searchParams]);

  const fetchOrder = async (ref) => {
    if (!ref || !ref.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await visitorApi.trackOrder(ref.trim());
      if (res.data && res.data.data) {
        setOrder(res.data.data);
      } else {
        setError('No order found with the provided details. Please verify your Order ID or Mobile Number.');
        setOrder(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Order not found. Please verify your reference number.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrder(searchQuery);
  };

  const getStepIndex = (status) => {
    if (status === 'cancelled') return -1;
    const idx = STATUS_STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  const currentStep = order ? getStepIndex(order.status) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <VisitorNavbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/store"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to B2B Catalog
          </Link>
          <span className="text-xs text-slate-400">Live Real-time Synced</span>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 mb-8">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <PackageCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Track Your Wholesale Order</h1>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Enter your Sales Order ID (e.g. <span className="font-mono text-emerald-600 font-semibold">SO-2026-00002</span>) or registered mobile number.
            </p>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. SO-2026-00002 or 9876543210"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 shrink-0"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" /> Track Status
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-semibold text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Display */}
        {order && (
          <div className="space-y-6">
            {/* Top Summary Banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold font-mono text-slate-900">{order.order_number}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'confirmed' ? 'bg-purple-100 text-purple-800' :
                    order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Ordered: {new Date(order.createdAt || order.order_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  {(order.warehouse_id?.name || order.warehouse_id?.warehouse_name) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Dispatch Hub: {order.warehouse_id?.name || order.warehouse_id?.warehouse_name}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Order Slip
                </button>
              </div>
            </div>

            {/* Tracking Stepper */}
            {order.status === 'cancelled' ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
                <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-rose-900">This Order has been Cancelled</h3>
                <p className="text-xs text-rose-600 mt-1">
                  The stock items have been safely released back to available inventory. For inquiries, contact dispatch support.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Delivery Progress</h3>
                
                <div className="relative">
                  {/* Connecting Line */}
                  <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0" />
                  <div 
                    className="hidden sm:block absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
                    style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                  />

                  {/* Steps */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-2 relative z-10">
                    {STATUS_STEPS.map((step, idx) => {
                      const isCompleted = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={step.key} className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm shrink-0 ${
                            isCompleted 
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' 
                              : 'bg-white text-slate-400 border-2 border-slate-200'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                          </div>
                          <div>
                            <span className={`block text-xs font-bold ${
                              isCurrent ? 'text-emerald-700' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                            }`}>
                              {step.label}
                            </span>
                            <span className="block text-[11px] text-slate-400 font-normal leading-tight mt-0.5">
                              {step.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Grid: Customer Info & Items */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Customer & Shipping Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Customer & Dispatch Details</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{order.customer_id?.name || order.visitor_details?.name || 'Valued Buyer'}</p>
                      <p className="text-xs text-slate-500">{order.customer_id?.company_name || 'B2B Wholesale Account'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{order.customer_id?.phone || order.visitor_details?.phone || 'N/A'}</p>
                      <p className="text-[11px] text-slate-400">{order.customer_id?.email || order.visitor_details?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Delivery Address</p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                        {order.shipping_address?.street || 'Local Delivery'}<br />
                        {order.shipping_address?.city && `${order.shipping_address.city}, `}
                        {order.shipping_address?.state} {order.shipping_address?.pincode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Card */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Ordered Garments ({order.items?.length || 0})</h4>
                
                <div className="divide-y divide-slate-100">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 border border-slate-200 shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.product_name || item.product_id?.name || 'Garment Item'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {item.color_variant?.color_code && (
                              <span 
                                className="w-3 h-3 rounded-full border border-slate-300 inline-block shadow-2xs"
                                style={{ backgroundColor: item.color_variant.color_code }}
                              />
                            )}
                            <span className="text-[11px] font-semibold text-slate-600">
                              {item.color_variant?.color_name || 'Standard'}
                            </span>
                            {item.size && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-bold">
                                Size: {item.size}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">
                          {item.quantity} pcs @ ₹{item.unit_price}
                        </p>
                        <p className="text-xs font-extrabold text-emerald-600">
                          ₹{(item.total_amount || (item.quantity * item.unit_price)).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-slate-200 pt-4 mt-4 space-y-1.5 text-right">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Taxable Subtotal</span>
                    <span className="font-semibold text-slate-800">₹{(order.total_amount - (order.tax_amount || 0)).toLocaleString('en-IN')}</span>
                  </div>
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>GST Taxes</span>
                      <span className="font-semibold text-slate-800">₹{order.tax_amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-100 pt-2">
                    <span>Total Order Amount</span>
                    <span className="text-emerald-600">₹{order.total_amount?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
