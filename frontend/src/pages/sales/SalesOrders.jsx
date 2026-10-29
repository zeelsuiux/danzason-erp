import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  FileText,
  Truck,
  CreditCard,
  Building,
  CheckCircle,
  AlertCircle,
  Eye,
  Trash2,
  ArrowLeft,
  Receipt,
  Package,
  Lock,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import SearchableSelect from '../../components/common/SearchableSelect';
import ProductSearchDropdown from '../../components/common/ProductSearchDropdown';
import { salesApi, St, Dt } from '../../services/procurementService';
import upsellService from '../../services/upsellService';
import { CHANNEL_CONFIG, CHANNELS, detectCustomerChannel, calculateDynamicUnitPrice, matchProductVariant } from '../../utils/pricingRules';

export default function SalesOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(searchParams.get('action') === 'new' ? 'create' : 'list'); // 'list' | 'create'
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Create SO Form State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [pricingTier, setPricingTier] = useState('B2B'); // 'B2B' | 'B2C'
  const [finalDiscountType, setFinalDiscountType] = useState('fixed'); // 'percentage' | 'fixed'
  const [finalDiscountValue, setFinalDiscountValue] = useState(0);
  const [createForm, setCreateForm] = useState({
    customer_id: '',
    warehouse_id: '',
    expected_delivery_date: '',
    payment_terms: 'Net 30 Days',
    shipping_charges: 0,
    advance_paid: 0,
    notes: '',
    items: [
      {
        product_id: '',
        product_name: '',
        sku: '',
        hsn_code: '6109',
        quantity: 1,
        uom: 'PCS',
        unit_price: 0,
        discount_type: 'percentage', // 'percentage' | 'amount'
        discount_percentage: 0,
        discount_amount: 0,
        gst_rate: 5,
      },
    ],
  });

  // Selected Order Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Smart Upsell & Cross-sell Recommendations
  const [orderRecommendations, setOrderRecommendations] = useState([]);
  const [appliedRecIds, setAppliedRecIds] = useState([]);
  const [pricingRules, setPricingRules] = useState(null);

  useEffect(() => {
    loadOrders(pagination.page);
    loadDropdownData();
  }, [pagination.page, search, statusFilter]);

  const loadDropdownData = async () => {
    try {
      const [custRes, whRes, prodRes, pricingRes] = await Promise.all([
        salesApi.getCustomers({ limit: 100 }).catch(() => ({ data: [] })),
        St.getWarehouses().catch(() => ({ data: [] })),
        Dt.getProducts({ limit: 200, view: 'color' }).catch(() => ({ data: [] })),
        St.getPricingRules().catch(() => ({ data: null })),
      ]);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      const whList = whRes?.data?.warehouses || whRes?.data || [];
      setWarehouses(Array.isArray(whList) ? whList : []);
      let prodList = Array.isArray(prodRes.data) ? prodRes.data : [];
      if (prodList.length === 0) {
        const fallback = await Dt.getProducts({ limit: 100 }).catch(() => ({ data: [] }));
        prodList = Array.isArray(fallback.data) ? fallback.data : [];
      }
      setProducts(prodList);
      if (pricingRes?.data) {
        setPricingRules(pricingRes.data);
      }
    } catch (err) {
      console.error('Failed to load dropdown dependencies:', err);
    }
  };

  const loadOrders = async (page = 1) => {
    try {
      setLoading(true);
      const res = await salesApi.getOrders({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setOrders(Array.isArray(res.data) ? res.data : []);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          product_name: '',
          sku: '',
          hsn_code: '6109',
          quantity: 1,
          uom: 'PCS',
          unit_price: 0,
          discount_type: 'percentage',
          discount_percentage: 0,
          discount_amount: 0,
          gst_rate: 5,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (createForm.items.length === 1) return;
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Pricing channel switch: automatically updates product unit prices
  const handlePricingTierChange = (newTier) => {
    setPricingTier(newTier);
    setCreateForm((prev) => {
      const updatedItems = prev.items.map((it) => {
        if (!it.product_id) return it;
        const prod = it.product_obj || matchProductVariant(products, it);
        if (!prod) return it;

        const dyn = calculateDynamicUnitPrice(
          prod,
          it.quantity || 1,
          newTier,
          pricingRules
        );
        const newRate = dyn.unitPrice;

        // Recalculate discount amounts if in percentage mode
        const gross = (Number(it.quantity) || 1) * newRate;
        let discAmt = it.discount_amount;
        if (it.discount_type === 'percentage') {
          discAmt = Number(((gross * (Number(it.discount_percentage) || 0)) / 100).toFixed(2));
        }

        return {
          ...it,
          unit_price: newRate,
          discount_amount: discAmt,
          pricing_info: dyn.pricingInfo || (dyn.isDynamic ? `+${dyn.percent}% (${dyn.slabLabel})` : null),
        };
      });
      return { ...prev, items: updatedItems };
    });
  };

  // When customer is selected, automatically detect and apply their pricing tier
  const handleSelectCustomer = (custId) => {
    const cust = customers.find((c) => (c._id || c.id) === custId);
    let detectedTier = 'B2B';
    if (cust) {
      detectedTier = detectCustomerChannel(cust);
    }
    setCreateForm((prev) => ({ ...prev, customer_id: custId }));
    handlePricingTierChange(detectedTier);
  };

  const handleProductSelect = (index, prod) => {
    const productObj =
      typeof prod === 'object' && prod !== null
        ? prod
        : products.find((p) => p._id === prod || p.id === prod || p.product_id === prod);

    const updated = [...createForm.items];
    if (productObj) {
      const qty = Number(updated[index].quantity) || 1;
      const dyn = calculateDynamicUnitPrice(
        productObj,
        qty,
        pricingTier,
        pricingRules
      );
      const rate = dyn.unitPrice;

      updated[index] = {
        ...updated[index],
        product_id: productObj.product_id || productObj._id || productObj.id,
        _variant_id: productObj._id,
        product_obj: productObj,
        product_name: productObj.product_name || productObj.title || '',
        sku: productObj.sku || productObj.sku_id || productObj.product_code || '',
        hsn_code: productObj.hsn_code || '6109',
        uom: productObj.uom || 'PCS',
        unit_price: rate,
        pricing_info: dyn.pricingInfo || (dyn.isDynamic ? `+${dyn.percent}% (${dyn.slabLabel})` : null),
        purchase_rate: Number(productObj.purchase_rate || productObj.cost_rate || 0),
        cost_rate: Number(productObj.cost_rate || productObj.purchase_rate || 0),
        purchase_batches: productObj.purchase_batches || [],
        discount_type: updated[index].discount_type || 'percentage',
        discount_percentage: updated[index].discount_percentage || 0,
        discount_amount: updated[index].discount_amount || 0,
        gst_rate: productObj.gst_rate !== undefined ? Number(productObj.gst_rate) : 5,
        color_variant: productObj.color
          ? {
              color_name: productObj.color,
              color_code: productObj.color_code || '',
            }
          : undefined,
      };
    } else {
      updated[index] = {
        ...updated[index],
        product_id: '',
        product_name: '',
        sku: '',
        hsn_code: '6109',
        unit_price: 0,
        pricing_info: null,
        discount_type: 'percentage',
        discount_percentage: 0,
        discount_amount: 0,
        gst_rate: 5,
        color_variant: undefined,
      };
    }
    setCreateForm({ ...createForm, items: updated });
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...createForm.items];
    updated[index][field] = value;

    // If quantity changes, recalculate unit price using quantity slab rules
    if (field === 'quantity') {
      const qty = Math.max(1, parseInt(value, 10) || 1);
      const it = updated[index];
      const prod = it.product_obj || matchProductVariant(products, it);
      if (prod) {
        const dyn = calculateDynamicUnitPrice(prod, qty, pricingTier, pricingRules);
        it.unit_price = dyn.unitPrice;
        it.pricing_info = dyn.pricingInfo || `+${dyn.percent}% (${dyn.slabLabel})`;
      }

      const gross = qty * (Number(updated[index].unit_price) || 0);
      if (updated[index].discount_type === 'percentage') {
        updated[index].discount_amount = Number(
          ((gross * (Number(updated[index].discount_percentage) || 0)) / 100).toFixed(2)
        );
      }
    }

    setCreateForm({ ...createForm, items: updated });
  };

  // Dual discount handlers: accepts both % and ₹
  const handleItemDiscountChange = (index, val, type) => {
    const num = Math.max(0, parseFloat(val) || 0);
    const updated = [...createForm.items];
    const it = updated[index];
    const gross = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);

    if (type === 'percentage') {
      const pct = Math.min(100, num);
      const amt = Number(((gross * pct) / 100).toFixed(2));
      it.discount_type = 'percentage';
      it.discount_percentage = pct;
      it.discount_amount = amt;
    } else {
      const amt = Math.min(gross, num);
      const pct = gross > 0 ? Number(((amt / gross) * 100).toFixed(2)) : 0;
      it.discount_type = 'amount';
      it.discount_amount = amt;
      it.discount_percentage = pct;
    }

    setCreateForm({ ...createForm, items: updated });
  };

  const handleToggleDiscountType = (index) => {
    const updated = [...createForm.items];
    const it = updated[index];
    it.discount_type = it.discount_type === 'amount' ? 'percentage' : 'amount';
    setCreateForm({ ...createForm, items: updated });
  };

  // Live Calculations (incorporates dual item discounts and final bill discount)
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let tax = 0;

    createForm.items.forEach((it) => {
      const gross = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
      const disc =
        it.discount_type === 'amount'
          ? Number(it.discount_amount) || 0
          : (gross * (Number(it.discount_percentage) || 0)) / 100;
      const taxable = Math.max(0, gross - disc);
      const gst = (taxable * (Number(it.gst_rate) || 0)) / 100;

      subtotal += gross;
      itemDiscountTotal += disc;
      tax += gst;
    });

    let finalDiscountAmt = 0;
    const finalVal = Number(finalDiscountValue) || 0;
    if (finalVal > 0) {
      if (finalDiscountType === 'percentage') {
        finalDiscountAmt = (subtotal * finalVal) / 100;
      } else {
        finalDiscountAmt = finalVal;
      }
    }

    const totalDiscount = Math.round(itemDiscountTotal + finalDiscountAmt);
    const grand = Math.round(
      Math.max(0, subtotal - totalDiscount) + tax + (Number(createForm.shipping_charges) || 0)
    );

    return {
      subtotal,
      itemDiscountTotal,
      finalDiscountAmt,
      discount: totalDiscount,
      tax,
      grand,
    };
  };

  // Fetch smart upsell & cross-sell suggestions when items are added
  useEffect(() => {
    if (view !== 'create') return;
    const currentProdIds = createForm.items
      .map((it) => it.product_id)
      .filter(Boolean);

    upsellService
      .getRecommendations({ product_ids: currentProdIds })
      .then((res) => {
        if (res?.success) {
          const recs = res.data?.allRecommendations || (Array.isArray(res.data) ? res.data : []);
          setOrderRecommendations(recs);
        }
      })
      .catch(() => {});
  }, [createForm.items, view]);

  // Apply recommendation directly into the order
  const handleApplyRecommendation = (rec) => {
    const recProd =
      products.find(
        (p) =>
          (p._id || p.id) === (rec.recommended_product_id?._id || rec.recommended_product_id) ||
          p.name?.toLowerCase() === rec.recommended_product_name?.toLowerCase()
      ) || rec.recommended_product_id;

    if (!recProd) {
      alert(`Product "${rec.recommended_product_name}" not found in catalog.`);
      return;
    }

    const b2b = Number(recProd.b2b_price ?? recProd.selling_rate ?? recProd.price ?? 200);
    const b2c = Number(recProd.b2c_price ?? recProd.mrp ?? (b2b > 0 ? Math.round(b2b * 1.35) : 250));
    let baseRate = pricingTier === 'B2C' ? b2c : b2b;

    let discPct = 0;
    if (rec.pricing_type === 'discount_percent') {
      discPct = rec.price_value || 0;
    } else if (rec.pricing_type === 'special_price' && rec.price_value > 0) {
      baseRate = rec.price_value;
    }

    const qty = rec.min_order_qty || 25;
    const gross = qty * baseRate;
    const discAmt = discPct > 0 ? Number(((gross * discPct) / 100).toFixed(2)) : 0;

    const newItem = {
      product_id: recProd._id || recProd.id,
      product_name: recProd.name || rec.recommended_product_name,
      sku: recProd.sku || 'SKU-REC',
      hsn_code: recProd.hsn_code || '6109',
      quantity: qty,
      uom: recProd.uom || 'PCS',
      unit_price: baseRate,
      discount_type: 'percentage',
      discount_percentage: discPct,
      discount_amount: discAmt,
      gst_rate: Number(recProd.tax_rate ?? recProd.gst_rate ?? 5),
    };

    setCreateForm((prev) => {
      const cleaned = prev.items.filter((it) => it.product_id);
      return {
        ...prev,
        items: [...cleaned, newItem],
      };
    });

    setAppliedRecIds((prev) => [...prev, rec._id]);

    upsellService
      .logPitchResult({
        rule_id: rec._id,
        customer_id: createForm.customer_id || null,
        status: 'accepted',
        quantity_sold: qty,
        potential_additional_value: gross - discAmt,
        notes: `Added from Sales Order creation view (${pricingTier} tier)`,
      })
      .catch(() => {});
  };

  const totals = calculateTotals();

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.customer_id) {
      setFormError('Please select a customer.');
      return;
    }
    if (createForm.items.some((it) => !it.product_id)) {
      setFormError('All order items must be selected from the authoritative API product catalog.');
      return;
    }
    if (createForm.items.some((it) => !it.product_name || !it.product_name.trim())) {
      setFormError('Product details missing. Please select a valid product for all rows.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const payload = {
        ...createForm,
        pricing_tier: pricingTier,
        final_discount_type: finalDiscountType,
        final_discount_value: finalDiscountValue,
        items: createForm.items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          sku: it.sku,
          hsn_code: it.hsn_code,
          quantity: it.quantity,
          uom: it.uom,
          unit_price: it.unit_price,
          discount_percentage: it.discount_percentage,
          discount_amount: it.discount_amount,
          gst_rate: it.gst_rate,
        })),
      };
      await salesApi.createOrder(payload);
      setView('list');
      loadOrders(1);
    } catch (err) {
      setFormError(err.message || 'Failed to create sales order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateInvoice = async (order) => {
    try {
      setGeneratingInvoice(true);
      await salesApi.createInvoiceFromOrder({ so_id: order._id });
      alert('Tax Invoice generated successfully! You can view it under Invoices.');
      loadOrders(pagination.page);
      setIsDetailModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const orderColumns = [
    {
      header: 'Sales Quotation #',
      key: 'so_number',
      cellClassName: 'font-mono font-bold text-slate-900 text-sm',
    },
    {
      header: 'Customer',
      key: 'customer_id',
      render: (cust) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{cust?.customer_name || 'Client'}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{cust?.customer_code}</p>
        </div>
      ),
    },
    {
      header: 'Quotation Date',
      key: 'order_date',
      render: (val) => (
        <span className="text-xs text-slate-600 font-medium">
          {new Date(val).toLocaleDateString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Items Count',
      key: 'items',
      render: (its) => <span className="font-medium text-xs text-slate-700">{its?.length || 0} line items</span>,
    },
    {
      header: 'Grand Total',
      key: 'grand_total',
      render: (val) => (
        <span className="font-mono font-bold text-sm text-slate-900">
          ₹{(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Dispatch',
      key: 'dispatch_status',
      render: (val) => <StatusBadge status={val || 'not_dispatched'} />,
    },
    {
      header: 'Payment',
      key: 'payment_status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Sales Quotations (Estimates & Bookings)"
        subtitle="Manage customer quotation requests, price estimates, inventory allocations, and GST invoices."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Quotations' },
        ]}
        actions={
          view === 'list' ? (
            <button
              onClick={() => {
                setView('create');
                setFormError('');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> New Sales Quotation
            </button>
          ) : (
            <button
              onClick={() => setView('list')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Quotations
            </button>
          )
        }
      />

      {view === 'list' ? (
        <>
          {/* Top Filters */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-80 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search quotation # (e.g. SO-2026-00001)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand"
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={orderColumns}
            data={orders}
            loading={loading}
            emptyMessage="No sales quotations recorded yet. Click 'New Sales Quotation' to create one."
            pagination={{
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total,
              limit: pagination.limit,
              onPageChange: (p) => setPagination((prev) => ({ ...prev, page: p })),
            }}
            actions={(row) => (
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(row);
                    setIsDetailModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition inline-flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateInvoice(row)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-brand hover:bg-emerald-100 transition inline-flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5" /> Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/sales/repeat-orders`)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition inline-flex items-center gap-1"
                  title="Schedule Repeat Order"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Reorder
                </button>
              </div>
            )}
          />
        </>
      ) : (
        /* ==================== CREATE SALES QUOTATION VIEW ==================== */
        <form
          onSubmit={handleCreateOrderSubmit}
          className="space-y-6 w-full bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft"
        >
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Create New Sales Quotation</h3>
            <span className="text-xs text-slate-400">Estimate & Price Offer</span>
          </div>

          {formError && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Customer & Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm flex items-center justify-between">
                <span>Customer / Client <span className="text-rose-500">*</span></span>
                {createForm.customer_id && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                    {pricingTier} Customer
                  </span>
                )}
              </label>
              <SearchableSelect
                options={customers.map((c) => ({
                  value: c._id,
                  label: c.customer_name,
                  subLabel: `${c.customer_code} • ${c.customer_type || 'B2B'}`,
                }))}
                value={createForm.customer_id}
                onChange={handleSelectCustomer}
                placeholder="Search & Select Customer..."
                searchPlaceholder="Search by customer name or code..."
                emptyMessage="No matching customers found"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Dispatch Warehouse</label>
              <SearchableSelect
                options={warehouses.map((w) => ({
                  value: w._id,
                  label: w.warehouse_name,
                  subLabel: `${w.warehouse_code} • ${w.warehouse_type || 'Main'}`,
                }))}
                value={createForm.warehouse_id}
                onChange={(val) => setCreateForm({ ...createForm, warehouse_id: val })}
                placeholder="Search & Select Warehouse..."
                searchPlaceholder="Search warehouse..."
                allowClear={true}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Expected Delivery Date</label>
              <input
                type="date"
                value={createForm.expected_delivery_date}
                onChange={(e) => setCreateForm({ ...createForm, expected_delivery_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>
          </div>

          {/* Order Items Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                  Products & Billing Items
                </h4>
                <p className="text-xs text-slate-500">
                  Select products from API catalog. Pricing and GST rates are strictly synchronized with product master.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Product Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-visible bg-white shadow-xs">
              <table className="w-full text-left text-sm min-w-[1050px]">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-12 text-slate-500">#</th>
                    <th className="p-3 text-left min-w-[260px]">Product / Item Name</th>
                    <th className="p-3 text-center w-24">HSN/SAC</th>
                    <th className="p-3 text-center w-20">Qty</th>
                    <th className="p-3 text-center w-16">Unit</th>
                    <th className="p-3 text-right w-28">Rate (₹)</th>
                    <th className="p-3 text-center w-36">Discount (% / ₹)</th>
                    <th className="p-3 text-right w-28">Taxable</th>
                    <th className="p-3 text-center w-20">GST %</th>
                    <th className="p-3 text-right w-24">GST Amt</th>
                    <th className="p-3 text-right w-28">Line Total</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {createForm.items.map((it, idx) => {
                    const qty = Number(it.quantity) || 0;
                    const rate = Number(it.unit_price) || 0;
                    const gross = qty * rate;
                    const disc =
                      it.discount_type === 'amount'
                        ? Number(it.discount_amount) || 0
                        : (gross * (Number(it.discount_percentage) || 0)) / 100;
                    const taxable = Math.max(0, gross - disc);
                    const gstRate = Number(it.gst_rate) || 0;
                    const gstAmount = (taxable * gstRate) / 100;
                    const lineTotal = Math.round(taxable + gstAmount);

                    const currentProd =
                      it.product_obj ||
                      matchProductVariant(products, it) ||
                      (it.product_id
                        ? {
                            product_name: it.product_name,
                            sku: it.sku,
                            uom: it.uom,
                            selling_rate: it.unit_price,
                            color: it.color_variant?.color_name,
                          }
                        : null);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        {/* 1. Sr. No. */}
                        <td className="p-2.5 text-center font-mono text-xs font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* 2. Item Name with ProductSearchDropdown */}
                        <td className="p-2.5 align-top">
                          <ProductSearchDropdown
                            products={products}
                            selectedProduct={it.product_id ? currentProd : null}
                            pricingTier={pricingTier}
                            onSelectProduct={(prod) => handleProductSelect(idx, prod)}
                            onClear={() => handleProductSelect(idx, null)}
                            placeholder="Select / Search Product..."
                          />
                        </td>

                        {/* 3. HSN/SAC */}
                        <td className="p-2.5 align-top">
                          <input
                            type="text"
                            value={it.hsn_code || '6109'}
                            onChange={(e) => handleItemFieldChange(idx, 'hsn_code', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono text-center outline-none focus:border-brand bg-slate-50"
                            placeholder="HSN"
                          />
                        </td>

                        {/* 4. Quantity */}
                        <td className="p-2.5 align-top">
                          <input
                            type="number"
                            min="1"
                            required
                            value={it.quantity}
                            onChange={(e) =>
                              handleItemFieldChange(
                                idx,
                                'quantity',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-center font-bold font-mono outline-none focus:border-brand"
                          />
                        </td>

                        {/* 5. Unit / UOM */}
                        <td className="p-2.5 align-top">
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={it.uom || 'PCS'}
                            className="w-full px-1.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-600 font-mono text-center bg-slate-100 cursor-not-allowed"
                          />
                        </td>

                        {/* 6. Rate (₹) [B2B or B2C Price] */}
                        <td className="p-2.5 align-top">
                          <div className="relative">
                            <input
                              type="number"
                              readOnly
                              disabled
                              value={it.unit_price}
                              className="w-full pl-5 pr-2 py-1.5 border border-emerald-300 rounded text-sm text-right font-black font-mono bg-emerald-50/50 text-emerald-950 cursor-not-allowed select-none"
                            />
                            <Lock className="w-2.5 h-2.5 text-emerald-700 absolute left-1.5 top-2.5 pointer-events-none" />
                          </div>
                        </td>

                        {/* 7. Discount (% or ₹) with dual live display */}
                        <td className="p-2.5 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs focus-within:border-brand">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  it.discount_type === 'amount'
                                    ? it.discount_amount || ''
                                    : it.discount_percentage || ''
                                }
                                onChange={(e) =>
                                  handleItemDiscountChange(
                                    idx,
                                    e.target.value,
                                    it.discount_type || 'percentage'
                                  )
                                }
                                placeholder="0"
                                className="w-20 px-2 py-1.5 text-xs text-right font-mono font-bold outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleToggleDiscountType(idx)}
                                className={`px-2 py-1.5 text-xs font-bold border-l transition ${
                                  it.discount_type === 'amount'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}
                                title="Click to toggle between % and ₹"
                              >
                                {it.discount_type === 'amount' ? '₹' : '%'}
                              </button>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 text-right pr-1">
                              {it.discount_type === 'amount' ? (
                                <span>({it.discount_percentage || 0}% off)</span>
                              ) : (
                                <span>(-₹{Math.round(it.discount_amount || 0)})</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 8. Taxable Amount (₹) */}
                        <td className="p-2.5 align-top text-right font-mono text-xs font-semibold text-slate-700 pt-3">
                          ₹{Math.round(taxable).toLocaleString('en-IN')}
                        </td>

                        {/* 9. GST Rate (%) [API-derived] */}
                        <td className="p-2.5 align-top">
                          <select
                            value={it.gst_rate}
                            onChange={(e) =>
                              handleItemFieldChange(idx, 'gst_rate', Number(e.target.value))
                            }
                            className="w-full px-1.5 py-1.5 border border-slate-200 rounded text-xs font-mono font-semibold text-center outline-none focus:border-brand bg-white"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>

                        {/* 10. GST Amount (₹) */}
                        <td className="p-2.5 align-top text-right font-mono text-xs font-semibold text-emerald-700 pt-3">
                          +₹{Math.round(gstAmount).toLocaleString('en-IN')}
                        </td>

                        {/* 11. Line Total (₹) */}
                        <td className="p-2.5 align-top text-right font-mono text-sm font-bold text-slate-900 pt-3">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </td>

                        {/* 12. Action */}
                        <td className="p-2.5 align-top text-center pt-3">
                          {createForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-slate-400 hover:text-rose-600 transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1.5 px-1 py-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Another Item Line
              </button>
            </div>
          </div>

          {/* Smart Upsell & Cross-sell Suggestions Booster */}
          {orderRecommendations.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-indigo-50/60 border border-emerald-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Smart Upsell & Cross-sell Suggestions
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                        Revenue Booster
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      High-margin upgrades and matching garment combinations for items in this order
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {orderRecommendations.slice(0, 3).map((rec) => {
                  const isApplied = appliedRecIds.includes(rec._id);
                  const isUpsell = rec.type === 'upsell';
                  const prodName =
                    rec.recommended_product_name ||
                    rec.recommended_product_id?.name ||
                    'Complementary Garment';

                  return (
                    <div
                      key={rec._id}
                      className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs flex flex-col justify-between hover:border-emerald-400 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isUpsell ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {isUpsell ? 'Upsell Upgrade' : 'Cross-sell Bundle'}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 font-mono">
                            {rec.pricing_type === 'upgrade_diff' && `+₹${rec.price_value}/pcs`}
                            {rec.pricing_type === 'discount_percent' && `${rec.price_value}% Bundle Off`}
                            {rec.pricing_type === 'special_price' && `₹${rec.price_value}/pcs`}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-xs line-clamp-1">{rec.title}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Target: <strong className="text-slate-800">{prodName}</strong> (MOQ:{' '}
                          {rec.min_order_qty} pcs)
                        </div>

                        {rec.recommendation_pitch && (
                          <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg mt-2 border border-slate-100 line-clamp-2">
                            "{rec.recommendation_pitch}"
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Win Rate:{' '}
                          {rec.conversion_stats?.times_pitched > 0
                            ? Math.round(
                                ((rec.conversion_stats?.times_accepted || 0) /
                                  rec.conversion_stats.times_pitched) *
                                  100
                              )
                            : 65}
                          %
                        </span>
                        <button
                          type="button"
                          disabled={isApplied}
                          onClick={() => handleApplyRecommendation(rec)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs ${
                            isApplied
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isApplied ? 'Added to Order' : '+ Add to Order'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Billing Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-sm">Payment Terms</label>
                <SearchableSelect
                  className="sm:w-72"
                  options={[
                    { value: 'Immediate / Advance', label: 'Immediate / Advance', subLabel: '100% upfront' },
                    { value: 'Net 15 Days', label: 'Net 15 Days', subLabel: '15 days credit' },
                    { value: 'Net 30 Days', label: 'Net 30 Days', subLabel: 'Standard 30 days' },
                    { value: 'Net 45 Days', label: 'Net 45 Days', subLabel: '45 days credit' },
                    { value: 'Net 60 Days', label: 'Net 60 Days', subLabel: '60 days extended' },
                  ]}
                  value={createForm.payment_terms}
                  onChange={(val) => setCreateForm({ ...createForm, payment_terms: val })}
                  placeholder="Select Payment Terms..."
                  searchPlaceholder="Search terms..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-sm">Advance Received (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={createForm.advance_paid}
                  onChange={(e) => setCreateForm({ ...createForm, advance_paid: Number(e.target.value) })}
                  className="w-full sm:w-72 px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-mono font-bold focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-sm">Order Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Packing requirements, transport details, or delivery remarks..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Gross:</span>
                <span className="font-mono font-medium">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Items Discount:</span>
                <span className="font-mono font-medium text-emerald-600">- ₹{totals.itemDiscountTotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Final Bill Discount (Percentage or Fixed) */}
              <div className="flex items-center justify-between py-1 border-t border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">Final Bill Discount:</span>
                  <div className="inline-flex rounded border border-slate-200 overflow-hidden text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFinalDiscountType('percentage')}
                      className={`px-1.5 py-0.5 transition ${
                        finalDiscountType === 'percentage'
                          ? 'bg-brand text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinalDiscountType('fixed')}
                      className={`px-1.5 py-0.5 transition ${
                        finalDiscountType === 'fixed'
                          ? 'bg-brand text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ₹
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={finalDiscountValue || ''}
                    onChange={(e) => setFinalDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 px-2 py-1 text-right text-xs font-mono font-bold border border-slate-200 rounded outline-none focus:border-brand bg-white"
                  />
                  {finalDiscountType === 'percentage' && finalDiscountValue > 0 && (
                    <span className="text-[10px] text-emerald-600 font-mono">
                      (-₹{Math.round(totals.finalDiscountAmt)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Total Discount:</span>
                <span className="font-mono">- ₹{totals.discount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total GST (CGST+SGST/IGST):</span>
                <span className="font-mono font-medium">+ ₹{totals.tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-600">Shipping & Freight:</span>
                <input
                  type="number"
                  value={createForm.shipping_charges}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, shipping_charges: Number(e.target.value) })
                  }
                  className="w-28 px-2 py-1 text-right text-sm font-mono border border-slate-200 rounded outline-none focus:border-brand bg-white"
                />
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-300">
                <span>Grand Total:</span>
                <span className="font-mono text-brand text-lg">₹{totals.grand.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 shadow-sm transition flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Confirm & Book Order
            </button>
          </div>
        </form>
      )}

      {/* Sales Order Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedOrder ? `Sales Order: ${selectedOrder.so_number}` : 'Order Detail'}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-400 block">Customer</span>
                <span className="font-bold text-slate-900">{selectedOrder.customer_id?.customer_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Order Date</span>
                <span className="font-medium text-slate-800">
                  {new Date(selectedOrder.order_date).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Grand Total</span>
                <span className="font-mono font-bold text-brand">
                  ₹{selectedOrder.grand_total?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-medium text-slate-900">{it.product_name}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{it.quantity} {it.uom}</td>
                      <td className="p-2.5 text-right font-mono">₹{it.unit_price}</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{it.total_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                disabled={generatingInvoice}
                onClick={() => handleGenerateInvoice(selectedOrder)}
                className="px-4 py-2 rounded-lg bg-brand text-white font-bold text-xs hover:bg-brand-600 shadow-sm transition flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                {generatingInvoice ? 'Generating Invoice...' : 'Generate Tax Invoice'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
