import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  CheckCircle,
  Truck,
  Sparkles,
  Phone,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Package,
  Layers,
  Palette,
  Boxes,
  ShieldCheck,
  Building,
  User,
  Check,
  X,
} from 'lucide-react';
import VisitorNavbar from '../../components/visitor/VisitorNavbar';
import Modal from '../../components/common/Modal';
import { productApi, visitorApi } from '../../services/procurementService';

export default function VisitorStorefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedColor, setSelectedColor] = useState('');
  const [viewMode, setViewMode] = useState('color'); // 'color' (147 variants) or 'style' (9 styles)
  
  // Bulk Order Cart & Modal State
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Buyer details form
  const [buyerForm, setBuyerForm] = useState({
    customer_name: '',
    company_name: '',
    mobile: '',
    email: '',
    customer_type: 'B2B',
    address_line1: '',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '',
    notes: '',
  });

  const categories = ['ALL', 'T-SHIRT', 'TRACKPANT', 'TRACKSUIT', 'CAP', 'CO-ORD SET'];

  useEffect(() => {
    loadCatalog();
  }, [viewMode, selectedCategory, selectedColor]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const params = {
        limit: viewMode === 'color' ? 60 : 20,
        view: viewMode,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        color: selectedColor || undefined,
        search: search.trim() || undefined,
      };
      const res = await productApi.getProducts(params);
      const list = res.data || res.products || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCatalog();
  };

  const handleAddToCart = (product, colorName = '', colorCode = '', sku = '') => {
    const itemSku = sku || product.sku || product.product_code || 'APP-SKU';
    const itemName = product.title || product.product_name;
    const price = Number(product.price || product.selling_rate || 200);
    const mrp = Number(product.mrp || Math.round(price * 1.8));

    setCartItems((prev) => {
      const existing = prev.find((i) => i.sku === itemSku);
      if (existing) {
        return prev.map((i) =>
          i.sku === itemSku ? { ...i, quantity: i.quantity + 5 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.product_id || product._id || product.id,
          product_name: itemName,
          sku: itemSku,
          color: colorName || product.color || 'Standard',
          color_code: colorCode || product.color_code || '#111827',
          size: 'L',
          unit_price: price,
          mrp,
          quantity: 10, // Default B2B wholesale pack
          image: product.image || '',
        },
      ];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (sku, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.sku === sku) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const updateCartSize = (sku, newSize) => {
    setCartItems((prev) =>
      prev.map((item) => (item.sku === sku ? { ...item, size: newSize } : item))
    );
  };

  const removeCartItem = (sku) => {
    setCartItems((prev) => prev.filter((i) => i.sku !== sku));
  };

  // Calculations
  const cartSubtotal = cartItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const cartGst = Math.round(cartSubtotal * 0.05); // 5% apparel GST
  const cartGrandTotal = cartSubtotal + cartGst;
  const totalPcs = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!buyerForm.customer_name.trim()) {
      setSubmitError('Please enter your full name');
      return;
    }
    if (!buyerForm.mobile.trim() || buyerForm.mobile.trim().length < 10) {
      setSubmitError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (cartItems.length === 0) {
      setSubmitError('Your cart is empty. Please select products first.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');

      const payload = {
        customer_name: buyerForm.customer_name.trim(),
        company_name: buyerForm.company_name.trim(),
        mobile: buyerForm.mobile.trim(),
        email: buyerForm.email.trim(),
        customer_type: buyerForm.customer_type,
        shipping_address: {
          address_line1: buyerForm.address_line1,
          city: buyerForm.city,
          state: buyerForm.state,
          pincode: buyerForm.pincode,
        },
        billing_address: {
          address_line1: buyerForm.address_line1,
          city: buyerForm.city,
          state: buyerForm.state,
          pincode: buyerForm.pincode,
        },
        items: cartItems.map((ci) => ({
          product_id: ci.product_id,
          product_name: ci.product_name,
          sku: ci.sku,
          color: ci.color,
          size: ci.size,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          mrp: ci.mrp,
          gst_rate: 5,
        })),
        notes: buyerForm.notes,
      };

      const res = await visitorApi.placeOrder(payload);
      setConfirmedOrder(res.data);
      setCartItems([]);
      setIsCartOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit order request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <VisitorNavbar cartCount={cartItems.length} onOpenCart={() => setIsCartOpen(true)} />

      {/* Hero Banner matching Danza Son Identity */}
      <section className="bg-gradient-to-br from-slate-950 via-[#0b1329] to-slate-900 text-white py-10 px-4 sm:px-6 relative overflow-hidden border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official B2B & Wholesale Manufacturer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Premium Activewear & Apparel <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
                Direct Mill Rates for Retailers & Distributors
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Explore 140+ color variants across Polos, Round Necks, Trackpants, Tracksuits, Caps, and Co-ord sets. Instant stock booking with Pan-India dispatch.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setViewMode('color');
                  setSelectedCategory('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10b981] hover:bg-emerald-600 text-white text-xs font-bold transition shadow-sm"
              >
                <Palette className="w-4 h-4" />
                <span>Browse All Colors (147 Items)</span>
              </button>
              <Link
                to="/track"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition border border-white/20"
              >
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Track Existing Order</span>
              </Link>
            </div>
          </div>

          {/* Quick Perks Card */}
          <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 text-xs space-y-2.5 w-full md:w-80 shrink-0">
            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Wholesale Buyer Benefits</span>
            </h3>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Tiered bulk pricing (up to 80% off MRP)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Live warehouse inventory sync</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>GST Tax Invoice with formal input credit</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Fast dispatch from Mumbai, Surat & Delhi</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-5">
        {/* Filter & Search Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & View Mode */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search color, style, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-hidden focus:border-emerald-500"
              />
            </form>

            {/* Toggle View */}
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('color')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewMode === 'color'
                    ? 'bg-[#10b981] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="View every color variant individually"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Color-wise</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('style')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  viewMode === 'style'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="View grouped styles"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Style View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-2.5 text-slate-500 font-medium text-xs">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              Loading Danza Son apparel catalog...
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No products found</h3>
            <p className="text-xs text-slate-400 mt-0.5">Try resetting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((item) => {
              const price = Number(item.price || item.selling_rate || 200);
              const mrp = Number(item.mrp || Math.round(price * 1.8));
              const discount = item.discount_percent || Math.round(((mrp - price) / mrp) * 100);
              const colorCount = item.variants?.length || item.colors?.length || 1;

              return (
                <div
                  key={item._id || item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col group"
                >
                  {/* Image & Badges */}
                  <div className="aspect-4/3 bg-slate-100 overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.title || item.product_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80';
                      }}
                    />

                    {/* Discount badge */}
                    <span className="absolute top-2 left-2 bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
                      {discount}% OFF
                    </span>

                    {/* Stock pill */}
                    <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white font-semibold text-[10px] px-2 py-0.5 rounded-md">
                      {item.current_stock ?? 50} PCS
                    </span>

                    {/* Color badge if color-wise view */}
                    {item.color_code && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/95 backdrop-blur-xs border border-slate-200 text-[11px] font-bold text-slate-800 shadow-xs">
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                          style={{ backgroundColor: item.color_code }}
                        />
                        <span>{item.color}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <span>{item.category || 'APPAREL'}</span>
                        <span className="font-mono text-emerald-600">{item.sku || item.sku_id}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight leading-snug line-clamp-1">
                        {item.title || item.product_name}
                      </h4>

                      {/* Pricing */}
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base font-black text-slate-900">
                          ₹{price.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                          ₹{mrp}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          B2B Rate
                        </span>
                      </div>

                      {/* Available sizes */}
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                        <span className="font-medium text-slate-400">Sizes:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {(item.sizes || ['S', 'M', 'L', 'XL', '2XL']).join(' ')}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleAddToCart(item, item.color, item.color_code, item.sku)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-[#10b981] text-white text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Bulk Order</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bulk Order Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Bulk Order Inquiry ({cartItems.length} Products, {totalPcs} Pcs)
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="py-20 text-center">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Your bulk inquiry cart is empty</p>
                  <p className="text-xs text-slate-400 mt-0.5">Click "Add to Bulk Order" on any apparel item.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.sku}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.color_code && (
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.color_code }}
                        />
                      )}
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-xs">
                          {item.product_name}
                        </h5>
                        <p className="text-[10px] text-emerald-600 font-mono font-semibold">
                          SKU: {item.sku}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-500">Size:</span>
                          <select
                            value={item.size}
                            onChange={(e) => updateCartSize(item.sku, e.target.value)}
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-800"
                          >
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="2XL">2XL</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Qty Controls & Price */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.sku, -5)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-900 min-w-[28px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.sku, 5)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <p className="font-extrabold text-slate-900 text-xs">
                          ₹{(item.unit_price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400">@ ₹{item.unit_price}/pc</p>
                      </div>

                      <button
                        onClick={() => removeCartItem(item.sku)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Buyer Form Section */}
              {cartItems.length > 0 && (
                <form id="buyerOrderForm" onSubmit={handleSubmitOrder} className="pt-4 border-t border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5 text-emerald-700">
                    <Building className="w-3.5 h-3.5" />
                    <span>Buyer & Delivery Details</span>
                  </h4>

                  {submitError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                      {submitError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mukesh Patel"
                        value={buyerForm.customer_name}
                        onChange={(e) => setBuyerForm({ ...buyerForm, customer_name: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Company / Store Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Patel Garments"
                        value={buyerForm.company_name}
                        onChange={(e) => setBuyerForm({ ...buyerForm, company_name: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="10 digit number"
                        value={buyerForm.mobile}
                        onChange={(e) => setBuyerForm({ ...buyerForm, mobile: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="buyer@example.com"
                        value={buyerForm.email}
                        onChange={(e) => setBuyerForm({ ...buyerForm, email: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Delivery City & State
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="City (e.g. Surat)"
                          value={buyerForm.city}
                          onChange={(e) => setBuyerForm({ ...buyerForm, city: e.target.value })}
                          className="w-1/2 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-600"
                        />
                        <select
                          value={buyerForm.state}
                          onChange={(e) => setBuyerForm({ ...buyerForm, state: e.target.value })}
                          className="w-1/2 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-600"
                        >
                          <option value="Gujarat">Gujarat</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Delhi">Delhi</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Buyer Type
                      </label>
                      <select
                        value={buyerForm.customer_type}
                        onChange={(e) => setBuyerForm({ ...buyerForm, customer_type: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-600"
                      >
                        <option value="B2B">B2B Wholesaler / Distributor</option>
                        <option value="RETAILER">Retail Store Owner</option>
                        <option value="B2C">Individual Direct Buyer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Delivery Address & Landmark
                    </label>
                    <input
                      type="text"
                      placeholder="Shop/Warehouse address..."
                      value={buyerForm.address_line1}
                      onChange={(e) => setBuyerForm({ ...buyerForm, address_line1: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Footer Summary & Submit */}
            {cartItems.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({totalPcs} Pcs):</span>
                    <span className="font-bold text-slate-900">₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (5% Apparel Tax):</span>
                    <span className="font-bold text-slate-900">₹{cartGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>Estimated Total:</span>
                    <span className="text-emerald-700">₹{cartGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  form="buyerOrderForm"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#10b981] hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Confirm & Submit Bulk Order</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Confirmation Voucher Modal */}
      {isSuccessModalOpen && confirmedOrder && (
        <Modal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          title="Order Confirmation Voucher"
          size="md"
        >
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                Order Placed Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your order has been booked into Danza Son ERP and queued for dispatch.
              </p>
            </div>

            {/* Voucher Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Order Number:</span>
                <span className="font-mono font-black text-emerald-600 text-sm">
                  {confirmedOrder.so_number}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-800">{confirmedOrder.customer_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Contact:</span>
                <span className="font-mono text-slate-800">{confirmedOrder.mobile}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Items Count:</span>
                <span className="font-bold text-slate-800">{confirmedOrder.items_count} items</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
                <span className="font-black text-slate-900">Grand Total:</span>
                <span className="font-black text-emerald-700">₹{confirmedOrder.grand_total}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Link
                to={`/track?ref=${confirmedOrder.so_number}`}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Track This Order</span>
              </Link>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Danza-Son Activewear. All rights reserved. Pan-India Logistics & Delivery.</p>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-300">
            <Link to="/store" className="hover:text-white">Catalog</Link>
            <Link to="/track" className="hover:text-white">Track Order</Link>
            <Link to="/sales/orders" className="hover:text-emerald-400">Admin ERP Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
