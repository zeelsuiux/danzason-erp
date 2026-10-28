import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Search,
  Calendar,
  CreditCard,
  Building,
  CheckCircle,
  FileText,
  Printer,
  Eye,
  AlertCircle,
  Edit2,
  Clock,
  Check,
  Plus,
  Trash2,
  Download,
  Share2,
  MessageSquare,
  QrCode,
  ArrowLeft,
  X,
  Lock,
  RotateCw,
  Landmark,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import SearchableSelect from '../../components/common/SearchableSelect';
import ProductSearchDropdown from '../../components/common/ProductSearchDropdown';
import { salesApi, Dt, St } from '../../services/procurementService';
import { amountInWords } from '../../utils/numberToWords';
import bankAccountService from '../../services/bankAccountService';

export default function SalesInvoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(searchParams.get('action') === 'new' ? 'create' : 'list'); // 'list' | 'create'
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Direct Invoice Form State
  const [directFormSubmitting, setDirectFormSubmitting] = useState(false);
  const [directFormError, setDirectFormError] = useState('');
  const [directPricingTier, setDirectPricingTier] = useState('B2B'); // 'B2B' | 'B2C'
  const [directFinalDiscountType, setDirectFinalDiscountType] = useState('fixed'); // 'percentage' | 'fixed'
  const [directFinalDiscountValue, setDirectFinalDiscountValue] = useState(0);
  const [directForm, setDirectForm] = useState({
    customer_id: '',
    place_of_supply: 'Gujarat',
    warehouse_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    approx_repeat_date: '',
    payment_terms: 'Net 30 Days',
    shipping_charges: 0,
    advance_paid: 0,
    payment_mode: 'Cash',
    payment_reference: '',
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

  // 1. My Metaji View / Print / PDF Download Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'

  // 2. Quick Record Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    pay_mode_type: 'single', // 'single' | 'split'
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_time: new Date().toTimeString().substring(0, 5),
    payment_mode: 'Bank Transfer / NEFT',
    bank_account_id: '',
    reference_number: '',
    notes: '',
    split_cash: '',
    split_online: '',
  });

  // 4. Quick Change Due Date Modal
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const [dueDateInvoice, setDueDateInvoice] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [dueDateSubmitting, setDueDateSubmitting] = useState(false);

  // 5. Payment Received Time Correction Modal (Requirement 10)
  const [isTimeCorrectionOpen, setIsTimeCorrectionOpen] = useState(false);
  const [timeCorrectionTarget, setTimeCorrectionTarget] = useState(null);
  const [timeCorrectionForm, setTimeCorrectionForm] = useState({
    new_date: '',
    new_time: '',
    reason: 'Correction of recorded transaction timestamp',
    corrected_by: 'Authorized Accountant',
  });
  const [timeCorrectionSubmitting, setTimeCorrectionSubmitting] = useState(false);

  const handleOpenTimeCorrection = (invoice, index, payment) => {
    const dt = new Date(payment.payment_datetime || payment.payment_date || Date.now());
    setTimeCorrectionTarget({ invoice, index, payment });
    setTimeCorrectionForm({
      new_date: dt.toISOString().split('T')[0],
      new_time: payment.payment_time || dt.toTimeString().substring(0, 5),
      reason: 'Correction of recorded transaction timestamp',
      corrected_by: 'Authorized Accountant',
    });
    setIsTimeCorrectionOpen(true);
  };

  const handleSaveTimeCorrection = async (e) => {
    e.preventDefault();
    if (!timeCorrectionTarget) return;
    try {
      setTimeCorrectionSubmitting(true);
      const combinedIso = new Date(`${timeCorrectionForm.new_date}T${timeCorrectionForm.new_time}:00`).toISOString();
      const res = await fetch(
        `/api/v1/sales/invoices/${timeCorrectionTarget.invoice._id}/payments/${timeCorrectionTarget.index}/time`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_datetime: combinedIso,
            reason: timeCorrectionForm.reason,
            corrected_by: timeCorrectionForm.corrected_by,
          }),
        }
      );
      const result = await res.json();
      if (result.success) {
        setIsTimeCorrectionOpen(false);
        if (selectedInvoice && selectedInvoice._id === timeCorrectionTarget.invoice._id) {
          setSelectedInvoice(result.data);
        }
        loadInvoices(pagination.page);
        alert('Payment timestamp corrected successfully and synced to Finance.');
      } else {
        alert(result.message || 'Failed to correct payment time');
      }
    } catch (err) {
      alert(err.message || 'Failed to correct payment time');
    } finally {
      setTimeCorrectionSubmitting(false);
    }
  };

  useEffect(() => {
    loadInvoices(pagination.page);
    loadDependencies();
  }, [pagination.page, search, paymentFilter]);

  const loadDependencies = async () => {
    try {
      const [custRes, prodRes, whRes, bankRes] = await Promise.all([
        salesApi.getCustomers({ limit: 100 }).catch(() => ({ data: [] })),
        Dt.getProducts({ limit: 200, view: 'color' }).catch(() => ({ data: [] })),
        St.getWarehouses().catch(() => ({ data: [] })),
        bankAccountService.getBankAccounts({ is_active: true }).catch(() => ({ data: [] })),
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
      setBankAccounts(Array.isArray(bankRes?.data) ? bankRes.data : []);
    } catch (err) {
      console.error('Failed to load customers/products/warehouses/bankAccounts:', err);
    }
  };

  const loadInvoices = async (page = 1) => {
    try {
      setLoading(true);
      const res = await salesApi.getInvoices({
        page,
        limit: 10,
        search: search.trim() || undefined,
        payment_status: paymentFilter || undefined,
      });
      setInvoices(Array.isArray(res.data) ? res.data : []);
      if (res.meta) {
        setPagination({
          page: res.meta.page,
          limit: res.meta.limit,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        });
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // QUICK RECORD PAYMENT
  // -------------------------------------------------------------
  const handleOpenPayment = (inv) => {
    setPaymentInvoice(inv);
    const defaultBank = bankAccounts.find((b) => b.is_default_receiving) || bankAccounts[0];
    setPaymentForm({
      pay_mode_type: 'single',
      amount: inv.balance_amount || '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_time: new Date().toTimeString().substring(0, 5),
      payment_mode: 'Bank Transfer / NEFT',
      bank_account_id: defaultBank?._id || '',
      reference_number: '',
      notes: '',
      split_cash: '',
      split_online: '',
    });
    setIsPaymentOpen(true);
  };

  const setQuickPaymentModal = (type) => {
    const bal = Number(paymentInvoice?.balance_amount || 0);
    if (type === 'full') {
      if (paymentForm.pay_mode_type === 'split') {
        const half = Math.round(bal / 2);
        setPaymentForm((prev) => ({ ...prev, split_cash: half, split_online: bal - half }));
      } else {
        setPaymentForm((prev) => ({ ...prev, amount: bal }));
      }
    } else if (type === 'half') {
      const half = Math.round(bal / 2);
      if (paymentForm.pay_mode_type === 'split') {
        setPaymentForm((prev) => ({
          ...prev,
          split_cash: Math.round(half / 2),
          split_online: half - Math.round(half / 2),
        }));
      } else {
        setPaymentForm((prev) => ({ ...prev, amount: half }));
      }
    } else if (type === 'zero') {
      setPaymentForm((prev) => ({ ...prev, amount: 0, split_cash: 0, split_online: 0 }));
    }
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    const isSplit = paymentForm.pay_mode_type === 'split';
    let totalPaying = 0;
    if (isSplit) {
      totalPaying = (Number(paymentForm.split_cash) || 0) + (Number(paymentForm.split_online) || 0);
    } else {
      totalPaying = Number(paymentForm.amount) || 0;
    }

    if (totalPaying <= 0) {
      alert('Please enter a valid positive payment amount');
      return;
    }

    try {
      setPaymentSubmitting(true);
      const selectedBank = bankAccounts.find((b) => b._id === paymentForm.bank_account_id);
      await salesApi.recordInvoicePayment(paymentInvoice._id, {
        is_split_payment: isSplit,
        amount: !isSplit ? totalPaying : 0,
        split_cash: isSplit ? Number(paymentForm.split_cash) : 0,
        split_online: isSplit ? Number(paymentForm.split_online) : 0,
        payment_mode: paymentForm.payment_mode,
        payment_date: paymentForm.payment_date,
        payment_time: paymentForm.payment_time,
        payment_datetime: new Date(`${paymentForm.payment_date}T${paymentForm.payment_time || '12:00'}:00`).toISOString(),
        bank_account_id: paymentForm.bank_account_id || undefined,
        bank_account_name: selectedBank?.account_name || undefined,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes,
      });

      setIsPaymentOpen(false);
      setPaymentInvoice(null);
      loadInvoices(pagination.page);
      alert(`Payment of ₹${totalPaying.toLocaleString('en-IN')} recorded successfully!`);
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // QUICK CHANGE DUE DATE
  // -------------------------------------------------------------
  const handleOpenDueDate = (inv) => {
    setDueDateInvoice(inv);
    setNewDueDate(inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : '');
    setIsDueDateOpen(true);
  };

  const handleDueDateSubmit = async (e) => {
    e.preventDefault();
    if (!newDueDate) {
      alert('Please select a valid due date');
      return;
    }
    try {
      setDueDateSubmitting(true);
      await salesApi.updateInvoiceDueDate(dueDateInvoice._id, newDueDate);
      setIsDueDateOpen(false);
      setDueDateInvoice(null);
      loadInvoices(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to update due date');
    } finally {
      setDueDateSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // OPEN MY METAJI TAX INVOICE PRINT & PDF DOWNLOAD
  // -------------------------------------------------------------
  const handleOpenPrintModal = (inv) => {
    setSelectedInvoice(inv);
    setPrintFormat('a4');
    setIsPrintModalOpen(true);
  };

  const handlePrintDownload = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!selectedInvoice) return;
    const phone = selectedInvoice.customer_id?.mobile || '';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const grand = Number(selectedInvoice.grand_total || 0).toLocaleString('en-IN');
    const balance = Number(selectedInvoice.balance_amount || 0).toLocaleString('en-IN');
    const msg = `Dear ${selectedInvoice.customer_id?.customer_name || 'Customer'},\n\nHere is your Tax Invoice #${selectedInvoice.invoice_number} from DANZA-SON.\nTotal Amount: ₹${grand}\nRemaining Due: ₹${balance}\nDate: ${new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}\n\nThank you for doing business with us!`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Helper for UPI QR Code
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

  // -------------------------------------------------------------
  // DIRECT SALES INVOICE FUNCTIONS (DIRECT BILLING WITHOUT QUOTATION)
  // -------------------------------------------------------------
  const handleAddDirectItemRow = () => {
    setDirectForm((prev) => ({
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

  const handleRemoveDirectItemRow = (index) => {
    if (directForm.items.length === 1) return;
    setDirectForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Switch pricing tier for direct invoice and re-price existing items
  const handlePricingTierChange = (newTier) => {
    setDirectPricingTier(newTier);
    setDirectForm((prev) => {
      const updatedItems = prev.items.map((it) => {
        if (!it.product_id) return it;
        const prod = products.find(
          (p) => (p._id || p.id || p.product_id) === it.product_id
        );
        if (!prod) return it;

        const b2b = Number(prod.b2b_price ?? prod.selling_rate ?? prod.price ?? 0);
        const b2c = Number(prod.b2c_price ?? prod.mrp ?? (b2b > 0 ? Math.round(b2b * 1.35) : 0));
        const newRate = newTier === 'B2C' ? b2c : b2b;

        const gross = (Number(it.quantity) || 1) * newRate;
        let discAmt = it.discount_amount;
        if (it.discount_type === 'percentage') {
          discAmt = Number(((gross * (Number(it.discount_percentage) || 0)) / 100).toFixed(2));
        }

        return {
          ...it,
          unit_price: newRate,
          discount_amount: discAmt,
        };
      });
      return { ...prev, items: updatedItems };
    });
  };

  const handleDirectProductSelect = (index, prod) => {
    const updated = [...directForm.items];
    if (prod) {
      const b2b = Number(prod.b2b_price ?? prod.selling_rate ?? prod.price ?? 0);
      const b2c = Number(prod.b2c_price ?? prod.mrp ?? (b2b > 0 ? Math.round(b2b * 1.35) : 0));
      const rate = directPricingTier === 'B2C' ? b2c : b2b;

      updated[index] = {
        ...updated[index],
        product_id: prod.product_id || prod._id || prod.id,
        product_name: prod.product_name || prod.title || '',
        sku: prod.sku || prod.sku_id || prod.product_code || '',
        hsn_code: prod.hsn_code || '6109',
        uom: prod.uom || 'PCS',
        unit_price: rate,
        discount_type: updated[index].discount_type || 'percentage',
        discount_percentage: updated[index].discount_percentage || 0,
        discount_amount: updated[index].discount_amount || 0,
        gst_rate: prod.gst_rate !== undefined ? Number(prod.gst_rate) : 5,
        color_variant: prod.color
          ? {
              color_name: prod.color,
              color_code: prod.color_code || '',
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
        discount_type: 'percentage',
        discount_percentage: 0,
        discount_amount: 0,
        gst_rate: 5,
        color_variant: undefined,
      };
    }
    setDirectForm({ ...directForm, items: updated });
  };

  const handleDirectItemFieldChange = (index, field, value) => {
    const updated = [...directForm.items];
    updated[index][field] = value;

    if (field === 'quantity') {
      const qty = Math.max(1, parseInt(value, 10) || 1);
      const gross = qty * (Number(updated[index].unit_price) || 0);
      if (updated[index].discount_type === 'percentage') {
        updated[index].discount_amount = Number(
          ((gross * (Number(updated[index].discount_percentage) || 0)) / 100).toFixed(2)
        );
      }
    }

    setDirectForm({ ...directForm, items: updated });
  };

  // Dual discount handlers: % and ₹ support
  const handleDirectItemDiscountChange = (index, val, type) => {
    const num = Math.max(0, parseFloat(val) || 0);
    const updated = [...directForm.items];
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

    setDirectForm({ ...directForm, items: updated });
  };

  const handleToggleDirectDiscountType = (index) => {
    const updated = [...directForm.items];
    const it = updated[index];
    it.discount_type = it.discount_type === 'amount' ? 'percentage' : 'amount';
    setDirectForm({ ...directForm, items: updated });
  };

  const handleSelectCustomer = (custId) => {
    const cust = customers.find((c) => c._id === custId);
    let detectedTier = 'B2B';
    if (cust) {
      const type = String(cust.customer_type || '').toUpperCase();
      if (['B2C', 'RETAIL', 'D2C'].includes(type)) {
        detectedTier = 'B2C';
      }
    }

    setDirectForm((prev) => ({
      ...prev,
      customer_id: custId,
      place_of_supply: cust?.shipping_address?.state || cust?.billing_address?.state || prev.place_of_supply || 'Gujarat',
    }));

    handlePricingTierChange(detectedTier);
  };

  const isDirectIntraState = (directForm.place_of_supply || 'Gujarat').trim().toLowerCase() === 'gujarat';

  const calculateDirectTotals = () => {
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let tax = 0;

    directForm.items.forEach((it) => {
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
    const finalVal = Number(directFinalDiscountValue) || 0;
    if (finalVal > 0) {
      if (directFinalDiscountType === 'percentage') {
        finalDiscountAmt = (subtotal * finalVal) / 100;
      } else {
        finalDiscountAmt = finalVal;
      }
    }

    const totalDiscount = Math.round(itemDiscountTotal + finalDiscountAmt);
    const grand = Math.round(
      Math.max(0, subtotal - totalDiscount) + tax + (Number(directForm.shipping_charges) || 0)
    );
    const paid = Number(directForm.advance_paid) || 0;
    const balance = Math.max(0, grand - paid);

    return {
      subtotal,
      itemDiscountTotal,
      finalDiscountAmt,
      discount: totalDiscount,
      tax,
      grand,
      paid,
      balance,
    };
  };

  const directTotals = calculateDirectTotals();

  const handleDirectInvoiceSubmit = async (e, invoiceStatus = 'issued') => {
    if (e && e.preventDefault) e.preventDefault();

    if (!directForm.customer_id) {
      setDirectFormError('Please select a customer for this invoice.');
      return;
    }
    if (directForm.items.some((it) => !it.product_id)) {
      setDirectFormError('Please select a valid product from the catalog for all rows.');
      return;
    }

    try {
      setDirectFormSubmitting(true);
      setDirectFormError('');

      const payload = {
        ...directForm,
        pricing_tier: directPricingTier,
        final_discount_type: directFinalDiscountType,
        final_discount_value: directFinalDiscountValue,
        status: invoiceStatus,
        items: directForm.items.map((it) => ({
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

      const res = await salesApi.createDirectInvoice(payload);

      alert(
        invoiceStatus === 'issued'
          ? 'Tax Invoice generated and issued successfully! Stock deducted and customer balance updated.'
          : 'Invoice saved as draft successfully!'
      );

      // Reset direct form
      setDirectForm({
        customer_id: '',
        place_of_supply: 'Gujarat',
        warehouse_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        approx_repeat_date: '',
        payment_terms: 'Net 30 Days',
        shipping_charges: 0,
        advance_paid: 0,
        payment_mode: 'Cash',
        payment_reference: '',
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
            discount_type: 'percentage',
            discount_percentage: 0,
            discount_amount: 0,
            gst_rate: 5,
          },
        ],
      });
      setDirectFinalDiscountValue(0);

      setView('list');
      loadInvoices(1);

      if (res?.data) {
        setSelectedInvoice(res.data);
        setIsPrintModalOpen(true);
      }
    } catch (err) {
      setDirectFormError(err.message || 'Failed to create sales invoice');
    } finally {
      setDirectFormSubmitting(false);
    }
  };

  const invoiceColumns = [
    {
      header: 'Invoice #',
      key: 'invoice_number',
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
      header: 'Invoice Date',
      key: 'invoice_date',
      render: (val) => (
        <span className="text-xs text-slate-600 font-medium">
          {new Date(val).toLocaleDateString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Due Date',
      key: 'due_date',
      render: (val, row) => {
        const isOverdue = val && new Date(val) < new Date() && (row.balance_amount || 0) > 0;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-medium ${
                isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
              }`}
            >
              {val ? new Date(val).toLocaleDateString('en-IN') : '—'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDueDate(row);
              }}
              className="text-slate-400 hover:text-brand transition p-0.5 rounded"
              title="Change Due Date"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
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
      header: 'Paid Amount',
      key: 'paid_amount',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-emerald-700">
          ₹{(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Balance Due',
      key: 'balance_amount',
      render: (val) => (
        <span
          className={`font-mono text-sm font-bold ${
            val > 0 ? 'text-rose-600' : 'text-emerald-700'
          }`}
        >
          ₹{(val || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'payment_status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Sales Invoices (GST Billing)"
        subtitle="Manage GST tax invoices, line items editing, direct invoice creation, instant payment settlement, and download A4/Thermal PDF."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sales', href: '/sales/invoices' },
          { label: 'Invoices' },
        ]}
        actions={
          view === 'list' ? (
            <button
              type="button"
              onClick={() => {
                setView('create');
                setDirectFormError('');
              }}
              className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand-600 transition shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Invoice</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-sm inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Invoices</span>
            </button>
          )
        }
      />

      {view === 'list' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-80 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search invoice number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand"
              >
                <option value="">All Payment Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Fully Paid</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={invoiceColumns}
            data={invoices}
            loading={loading}
            emptyMessage="No sales invoices found. Convert Sales Quotations or click '+ Create Invoice' to generate a direct GST invoice."
            pagination={{
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total,
              limit: pagination.limit,
              onPageChange: (p) => setPagination((prev) => ({ ...prev, page: p })),
            }}
            actions={(row) => (
              <div className="flex items-center justify-end gap-1.5">
                {/* 1. Record Payment */}
                {(row.balance_amount || 0) > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenPayment(row)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition inline-flex items-center gap-1 shadow-xs"
                    title="Record Payment"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Record Payment
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                    Paid
                  </span>
                )}

                {/* 2. Full Edit Invoice (Dedicated Page) */}
                <button
                  type="button"
                  onClick={() => navigate(`/sales/invoices/${row._id}/edit`)}
                  className="p-1.5 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                  title="Edit Invoice (Items, Rates, Settlement)"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* 3. View / Download / Print (My Metaji A4 & Thermal Format) */}
                <button
                  type="button"
                  onClick={() => handleOpenPrintModal(row)}
                  className="p-1.5 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                  title="Print / Download PDF (A4 & Thermal)"
                >
                  <Printer className="w-4 h-4" />
                </button>

                {/* 4. 1-Click Repeat Order */}
                <button
                  type="button"
                  onClick={() => navigate(`/sales/repeat-orders?invoiceId=${row._id}&action=quick_reorder`)}
                  className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                  title="Generate Repeat Order"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </>
      ) : (
        /* ==================== CREATE DIRECT SALES INVOICE VIEW ==================== */
        <form
          onSubmit={(e) => handleDirectInvoiceSubmit(e, 'issued')}
          className="space-y-6 w-full bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft"
        >
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Direct Sales Invoice Creation
              </h3>
              <p className="text-xs text-slate-500">
                Workflow B: Direct GST invoice generation without prior quotation. Products, prices, and GST rates are strictly synchronized with the authoritative Product API.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                isDirectIntraState
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-purple-50 text-purple-700 border border-purple-200'
              }`}>
                {isDirectIntraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
              </span>
            </div>
          </div>

          {directFormError && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{directFormError}</span>
            </div>
          )}

          {/* Primary Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">
                Customer / Client <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                options={customers.map((c) => ({
                  value: c._id,
                  label: c.customer_name,
                  subLabel: `${c.customer_code} • ${c.customer_type || 'B2B'} • GSTIN: ${c.gstin || 'None'}`,
                }))}
                value={directForm.customer_id}
                onChange={handleSelectCustomer}
                placeholder="Search & Select Customer..."
                searchPlaceholder="Search by name, code or GSTIN..."
                emptyMessage="No matching customers found"
              />
            </div>

            {/* Pricing Tier Selector (B2B Wholesale vs B2C Retail) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm flex items-center justify-between">
                <span>Pricing Tier</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto from customer</span>
              </label>
              <div className="flex items-center rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1 h-[42px]">
                <button
                  type="button"
                  onClick={() => handlePricingTierChange('B2B')}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    directPricingTier === 'B2B'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>B2B Wholesale</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePricingTierChange('B2C')}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    directPricingTier === 'B2C'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>B2C Retail</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Place of Supply</label>
              <input
                type="text"
                value={directForm.place_of_supply}
                onChange={(e) => setDirectForm({ ...directForm, place_of_supply: e.target.value })}
                placeholder="State (e.g. Gujarat)"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Invoice Date</label>
              <input
                type="date"
                required
                value={directForm.invoice_date}
                onChange={(e) => setDirectForm({ ...directForm, invoice_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Due Date</label>
              <input
                type="date"
                required
                value={directForm.due_date}
                onChange={(e) => setDirectForm({ ...directForm, due_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm flex items-center justify-between">
                <span>Approx Repeat Date</span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Optional</span>
              </label>
              <input
                type="date"
                value={directForm.approx_repeat_date || ''}
                onChange={(e) => setDirectForm({ ...directForm, approx_repeat_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
                placeholder="Next reorder estimate"
              />
            </div>
          </div>

          {/* Line Items Table (10 Columns) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                  Products & Billing Line Items
                </h4>
                <p className="text-xs text-slate-500">
                  Search products from API catalog. Pricing is strictly locked to prevent tampering.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDirectItemRow}
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
                  {directForm.items.map((it, idx) => {
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
                      products.find((p) => (p._id || p.id || p.product_id) === it.product_id) ||
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
                        {/* 1. Sr No */}
                        <td className="p-2.5 text-center font-mono text-xs font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* 2. Item Name with ProductSearchDropdown */}
                        <td className="p-2.5 align-top">
                          <ProductSearchDropdown
                            products={products}
                            selectedProduct={it.product_id ? currentProd : null}
                            pricingTier={directPricingTier}
                            onSelectProduct={(prod) => handleDirectProductSelect(idx, prod)}
                            onClear={() => handleDirectProductSelect(idx, null)}
                            placeholder="Select / Search Product..."
                          />
                        </td>

                        {/* 3. HSN/SAC */}
                        <td className="p-2.5 align-top">
                          <input
                            type="text"
                            value={it.hsn_code || '6109'}
                            onChange={(e) =>
                              handleDirectItemFieldChange(idx, 'hsn_code', e.target.value)
                            }
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
                              handleDirectItemFieldChange(
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
                              title={`${directPricingTier} Price from Catalog (Strictly Read-Only)`}
                              className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded text-sm text-right font-bold font-mono bg-slate-100 text-slate-700 cursor-not-allowed select-none"
                            />
                            <Lock className="w-2.5 h-2.5 text-slate-400 absolute left-1.5 top-2.5 pointer-events-none" />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block text-right mt-0.5">
                            {directPricingTier} Rate
                          </span>
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
                                  handleDirectItemDiscountChange(
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
                                onClick={() => handleToggleDirectDiscountType(idx)}
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
                              handleDirectItemFieldChange(idx, 'gst_rate', Number(e.target.value))
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
                          {directForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDirectItemRow(idx)}
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
                onClick={handleAddDirectItemRow}
                className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1.5 px-1 py-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Another Item Line
              </button>
            </div>
          </div>

          {/* Billing Settlement & Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-sm">Payment Terms</label>
                <SearchableSelect
                  className="sm:w-72"
                  options={[
                    { value: 'Immediate / Advance', label: 'Immediate / Advance', subLabel: 'Immediate Settlement' },
                    { value: 'Net 15 Days', label: 'Net 15 Days', subLabel: '15 days credit' },
                    { value: 'Net 30 Days', label: 'Net 30 Days', subLabel: 'Standard 30 days' },
                    { value: 'Net 45 Days', label: 'Net 45 Days', subLabel: '45 days credit' },
                    { value: 'Net 60 Days', label: 'Net 60 Days', subLabel: '60 days extended' },
                    { value: 'Cash On Delivery', label: 'Cash On Delivery', subLabel: 'COD' },
                  ]}
                  value={directForm.payment_terms}
                  onChange={(val) => setDirectForm({ ...directForm, payment_terms: val })}
                  placeholder="Select Payment Terms..."
                  searchPlaceholder="Search terms..."
                />
              </div>

              {/* Immediate Settlement */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Advance / Immediate Settlement
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Amount Received (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={directTotals.grand}
                      value={directForm.advance_paid}
                      onChange={(e) =>
                        setDirectForm({
                          ...directForm,
                          advance_paid: Math.min(directTotals.grand, Number(e.target.value)),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono font-bold focus:border-brand outline-none bg-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={directForm.payment_mode}
                      onChange={(e) => setDirectForm({ ...directForm, payment_mode: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand outline-none bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                {Number(directForm.advance_paid) > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Reference / UTR #
                    </label>
                    <input
                      type="text"
                      value={directForm.payment_reference}
                      onChange={(e) => setDirectForm({ ...directForm, payment_reference: e.target.value })}
                      placeholder="Transaction ID / Receipt #..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-white font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-sm">
                  Invoice Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={directForm.notes}
                  onChange={(e) => setDirectForm({ ...directForm, notes: e.target.value })}
                  placeholder="Payment remarks, dispatch warehouse, transport or LR number..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none"
                />
              </div>
            </div>

            {/* Calculations & GST Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Gross:</span>
                <span className="font-mono font-medium">₹{directTotals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Items Discount:</span>
                <span className="font-mono font-medium text-emerald-600">
                  - ₹{directTotals.itemDiscountTotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Final Invoice-Level Discount */}
              <div className="flex items-center justify-between py-1 border-t border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">Final Bill Discount:</span>
                  <div className="inline-flex rounded border border-slate-200 overflow-hidden text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDirectFinalDiscountType('percentage')}
                      className={`px-1.5 py-0.5 transition ${
                        directFinalDiscountType === 'percentage'
                          ? 'bg-brand text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectFinalDiscountType('fixed')}
                      className={`px-1.5 py-0.5 transition ${
                        directFinalDiscountType === 'fixed'
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
                    value={directFinalDiscountValue || ''}
                    onChange={(e) => setDirectFinalDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 px-2 py-1 text-right text-xs font-mono font-bold border border-slate-200 rounded outline-none focus:border-brand bg-white"
                  />
                  {directFinalDiscountType === 'percentage' && directFinalDiscountValue > 0 && (
                    <span className="text-[10px] text-emerald-600 font-mono">
                      (-₹{Math.round(directTotals.finalDiscountAmt)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Total Discount:</span>
                <span className="font-mono">- ₹{directTotals.discount.toLocaleString('en-IN')}</span>
              </div>

              {isDirectIntraState ? (
                <>
                  <div className="flex justify-between text-slate-600 text-xs pl-2">
                    <span>CGST (Central Tax 50%):</span>
                    <span className="font-mono font-medium">+ ₹{Math.round(directTotals.tax / 2).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-xs pl-2">
                    <span>SGST (State Tax 50%):</span>
                    <span className="font-mono font-medium">+ ₹{Math.round(directTotals.tax / 2).toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600 text-xs pl-2">
                  <span>IGST (Integrated Tax 100%):</span>
                  <span className="font-mono font-medium">+ ₹{Math.round(directTotals.tax).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200 pt-1.5">
                <span>Total GST:</span>
                <span className="font-mono">+ ₹{Math.round(directTotals.tax).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-600">Shipping & Delivery:</span>
                <input
                  type="number"
                  min="0"
                  value={directForm.shipping_charges}
                  onChange={(e) =>
                    setDirectForm({ ...directForm, shipping_charges: Number(e.target.value) })
                  }
                  className="w-28 px-2 py-1 text-right text-sm font-mono border border-slate-200 rounded outline-none focus:border-brand bg-white"
                />
              </div>

              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-300">
                <span>Grand Total:</span>
                <span className="font-mono text-brand text-lg">
                  ₹{directTotals.grand.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold text-xs pt-1">
                <span>Paid / Settled:</span>
                <span className="font-mono">- ₹{directTotals.paid.toLocaleString('en-IN')}</span>
              </div>

              <div className={`flex justify-between font-bold text-sm pt-1.5 border-t border-slate-200 ${
                directTotals.balance > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}>
                <span>Outstanding Balance:</span>
                <span className="font-mono">₹{directTotals.balance.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={directFormSubmitting}
              onClick={(e) => handleDirectInvoiceSubmit(e, 'draft')}
              className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-bold text-sm hover:bg-slate-50 shadow-sm transition"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={directFormSubmitting}
              className="px-6 py-2.5 rounded-lg bg-brand text-white font-bold text-sm hover:bg-brand-600 shadow-sm transition flex items-center gap-2"
            >
              {directFormSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Finalize & Issue Tax Invoice
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 1. MY METAJI STYLE A4 & THERMAL INVOICE VIEW / PRINT / DOWNLOAD MODAL       */}
      {/* ========================================================================= */}
      {isPrintModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden print:max-h-none print:shadow-none print:rounded-none">
            {/* Top Toolbar (Hidden on print) */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>

                {/* Format Switcher */}
                <div className="inline-flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPrintFormat('a4')}
                    className={`px-3 py-1 rounded-md transition ${
                      printFormat === 'a4'
                        ? 'bg-white text-brand shadow-xs font-bold'
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
                        ? 'bg-white text-brand shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🧾 3" Thermal POS
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Record Payment Button if balance pending */}
                {(selectedInvoice.balance_amount || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintModalOpen(false);
                      handleOpenPayment(selectedInvoice);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Record Payment
                  </button>
                )}

                {/* WhatsApp Share Button */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-3.5 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:bg-[#20ba5a] transition inline-flex items-center gap-1.5 shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </button>

                {/* Print / Download PDF Button */}
                <button
                  type="button"
                  onClick={handlePrintDownload}
                  className="px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-600 transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download / Print PDF
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Container */}
            <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
              {/* ===================================================== */}
              {/* FORMAT 1: A4 TAX INVOICE FORMAT (Matching My Metaji)  */}
              {/* ===================================================== */}
              {printFormat === 'a4' && (
                <div className="w-full max-w-[800px] bg-white p-8 sm:p-10 shadow-sm border border-slate-200 font-sans text-slate-800 text-xs print:border-none print:shadow-none print:p-0 print:max-w-none">
                  {/* Top Company & Invoice Head */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-black text-base">
                          D
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">
                          DANZA-SON
                        </h1>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Ur Path Ur Style - Architectural Hardware & Glass Fittings
                        <br />
                        Ring Road Trade Center, Surat, Gujarat - 395002
                        <br />
                        Ph: +91 98251 23456 · Email: billing@danzason.com
                        <br />
                        State: Gujarat (Code: 24) · <strong>GSTIN:</strong> 24AAACD1234F1Z9
                      </p>
                    </div>

                    <div className="text-right">
                      <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
                        TAX INVOICE
                      </h2>
                      <div className="font-mono font-bold text-sm text-slate-900 mt-1">
                        {selectedInvoice.invoice_number}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Issued: {new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}
                        <br />
                        Due:{' '}
                        {selectedInvoice.due_date
                          ? new Date(selectedInvoice.due_date).toLocaleDateString('en-IN')
                          : 'Net 30 Days'}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-lg mb-4 text-[10px]">
                    <div>
                      <span className="text-slate-400 font-bold uppercase block">Invoice No.</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {selectedInvoice.invoice_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase block">Date</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase block">
                        Place of Supply
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        {selectedInvoice.place_of_supply ||
                          selectedInvoice.customer_id?.billing_address?.state ||
                          'Gujarat (24)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase block">
                        Reverse Charge
                      </span>
                      <span className="font-bold text-slate-800 text-xs">No</span>
                    </div>
                  </div>

                  {/* Status Ribbon */}
                  <div className="mb-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        selectedInvoice.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : selectedInvoice.payment_status === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {selectedInvoice.payment_status === 'paid'
                        ? 'PAID'
                        : selectedInvoice.payment_status === 'partially_paid'
                        ? 'PARTIALLY PAID'
                        : 'UNPAID'}
                    </span>
                  </div>

                  {/* Parties (Receiver & Supplier) */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="border border-slate-200 rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-1.5">
                        Details of Receiver (Billed To)
                      </h4>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedInvoice.customer_id?.customer_name}
                      </p>
                      {selectedInvoice.customer_id?.company_name && (
                        <p className="text-slate-600 font-medium">
                          {selectedInvoice.customer_id.company_name}
                        </p>
                      )}
                      <p className="text-slate-500 mt-1">
                        {selectedInvoice.customer_id?.billing_address?.address_line1},{' '}
                        {selectedInvoice.customer_id?.billing_address?.city},{' '}
                        {selectedInvoice.customer_id?.billing_address?.state} -{' '}
                        {selectedInvoice.customer_id?.billing_address?.pincode}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        Ph: {selectedInvoice.customer_id?.mobile || '—'}
                      </p>
                      <p className="font-mono font-bold text-slate-800 mt-1">
                        GSTIN: {selectedInvoice.customer_id?.gstin || 'Unregistered'}
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-1.5">
                        Details of Supplier
                      </h4>
                      <p className="font-bold text-slate-900 text-sm">DANZA-SON</p>
                      <p className="text-slate-500 mt-1">
                        Ring Road Trade Center, Near Surat Textile Market,
                        <br />
                        Surat, Gujarat - 395002
                        <br />
                        Ph: +91 98251 23456
                      </p>
                      <p className="font-mono font-bold text-slate-800 mt-1">
                        GSTIN: 24AAACD1234F1Z9
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                        <tr>
                          <th className="p-2 text-center w-8">Sr.</th>
                          <th className="p-2">Description of Goods</th>
                          <th className="p-2 text-center">HSN/SAC</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-center">Unit</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">Taxable</th>
                          <th className="p-2 text-right">GST</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInvoice.items?.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2 font-medium text-slate-900">{it.product_name}</td>
                            <td className="p-2 text-center font-mono text-slate-600">
                              {it.hsn_code || '8483'}
                            </td>
                            <td className="p-2 text-center font-mono font-bold">{it.quantity}</td>
                            <td className="p-2 text-center font-mono">{it.uom || 'PCS'}</td>
                            <td className="p-2 text-right font-mono">
                              ₹{Number(it.unit_price || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2 text-right font-mono font-semibold">
                              ₹{Number(it.taxable_amount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2 text-right font-mono text-slate-600">
                              {it.gst_rate}% (₹
                              {Number(
                                (it.cgst_amount || 0) + (it.sgst_amount || 0) + (it.igst_amount || 0)
                              ).toLocaleString('en-IN')}
                              )
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              ₹{Number(it.total_amount || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Reverse charge note */}
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 mb-3">
                    <strong>Whether tax is payable under reverse charge:</strong> No
                  </div>

                  {/* Amount in words & Totals Section */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1 border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Amount Chargeable (in words)
                        </span>
                        <p className="font-bold text-slate-900 text-xs italic">
                          {amountInWords(selectedInvoice.grand_total)}
                        </p>
                      </div>

                      {/* Payment History if exists */}
                      {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                            Recorded Payment Settlements:
                          </span>
                          <div className="space-y-1.5">
                            {selectedInvoice.payments.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] text-slate-700 font-mono"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                    <span>{new Date(p.payment_datetime || p.payment_date).toLocaleDateString('en-IN')}</span>
                                    <span className="text-emerald-700 font-extrabold">
                                      {p.payment_time || new Date(p.payment_datetime || p.payment_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-slate-500 font-sans">({p.payment_mode})</span>
                                    {p.time_corrected && (
                                      <span className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0.2 rounded font-sans font-bold" title="Time adjusted with audit trail">
                                        Time Adjusted
                                      </span>
                                    )}
                                  </div>
                                  {p.reference_number && (
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      Ref: {p.reference_number}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-emerald-700 text-xs">
                                    ₹{Number(p.amount).toLocaleString('en-IN')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTimeCorrection(selectedInvoice, pIdx, p)}
                                    className="p-1 hover:bg-slate-200 text-slate-400 hover:text-emerald-700 rounded transition"
                                    title="Correct Payment Time / Timestamp"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-72 border-2 border-slate-900 rounded-lg overflow-hidden shrink-0 font-mono text-[11px]">
                      <div className="p-2 flex justify-between border-b border-slate-200">
                        <span className="text-slate-600 font-sans">Taxable Value:</span>
                        <span className="font-bold text-slate-800">
                          ₹{Number(selectedInvoice.subtotal || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2 flex justify-between border-b border-slate-200">
                        <span className="text-slate-600 font-sans">Total GST:</span>
                        <span className="font-bold text-slate-800">
                          ₹{Number(selectedInvoice.tax_total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2 flex justify-between border-b border-slate-200 text-emerald-700">
                        <span className="font-sans font-semibold">Total Paid:</span>
                        <span className="font-bold">
                          ₹{Number(selectedInvoice.paid_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2 flex justify-between border-b border-slate-200 text-rose-700 bg-rose-50/50">
                        <span className="font-sans font-bold">Balance Due:</span>
                        <span className="font-bold text-sm">
                          ₹{Number(selectedInvoice.balance_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-xs">
                        <span className="font-sans font-extrabold uppercase">GRAND TOTAL:</span>
                        <span className="font-bold text-sm text-emerald-300">
                          ₹{Number(selectedInvoice.grand_total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 mb-4 whitespace-pre-line">
                      <strong className="block text-slate-800 font-bold mb-0.5">Notes:</strong>
                      {selectedInvoice.notes}
                    </div>
                  )}

                  {/* Footer & Bank / UPI QR Details */}
                  <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3">
                    <div className="border border-slate-200 rounded p-2 text-[10px]">
                      <strong className="block text-slate-800 font-bold mb-0.5">
                        Bank Details:
                      </strong>
                      Bank: HDFC Bank Ltd.<br />
                      A/c: 50200012345678<br />
                      IFSC: HDFC0001234<br />
                      Branch: Ring Road, Surat
                    </div>

                    <div className="border border-slate-200 rounded p-2 text-[10px] flex items-center gap-2">
                      <img
                        src={getUpiQrUrl(selectedInvoice)}
                        alt="UPI QR Code"
                        className="w-14 h-14 object-contain rounded border border-slate-100 shrink-0"
                      />
                      <div>
                        <strong className="block text-slate-800 font-bold">Pay via UPI:</strong>
                        <span className="font-mono font-semibold text-brand text-[10px] block">
                          danzason@okhdfcbank
                        </span>
                        <span className="text-[9px] text-slate-400">Scan QR to pay</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded p-2 text-[10px] flex flex-col justify-between text-center">
                      <span className="text-[9px] text-slate-500">
                        For <strong>DANZA-SON</strong>
                      </span>
                      <div className="border-t border-slate-400 pt-1 mt-6 font-bold uppercase tracking-wider text-[9px]">
                        Authorized Signatory
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[9px] text-slate-400 pt-3 mt-2 border-t border-slate-100">
                    This is a computer-generated Tax Invoice · DANZA-SON Enterprise Billing
                  </div>
                </div>
              )}

              {/* ===================================================== */}
              {/* FORMAT 2: 3" THERMAL POS RECEIPT FORMAT               */}
              {/* ===================================================== */}
              {printFormat === 'thermal' && (
                <div className="w-[300px] bg-white p-4 shadow-sm border border-slate-200 font-mono text-[11px] text-slate-900 leading-tight print:border-none print:shadow-none print:p-0">
                  <div className="text-center pb-2">
                    <h3 className="font-black text-sm uppercase">DANZA-SON</h3>
                    <p className="text-[10px] text-slate-600">Ur Path Ur Style</p>
                    <p className="text-[10px] text-slate-600">Surat, Gujarat - 395002</p>
                    <p className="text-[10px] text-slate-600">GSTIN: 24AAACD1234F1Z9</p>
                  </div>

                  <div className="border-t border-dashed border-slate-900 my-1.5" />
                  <div className="text-center font-bold text-xs uppercase my-1">TAX INVOICE</div>
                  <div className="flex justify-between text-[10px]">
                    <span>Inv: {selectedInvoice.invoice_number}</span>
                    <span>{new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="text-[10px]">
                    Cust: {selectedInvoice.customer_id?.customer_name}
                  </div>
                  {selectedInvoice.customer_id?.mobile && (
                    <div className="text-[10px]">Ph: {selectedInvoice.customer_id.mobile}</div>
                  )}

                  <div className="border-t border-dashed border-slate-900 my-1.5" />

                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-dashed border-slate-900">
                        <th className="text-left py-1">Item</th>
                        <th className="text-center py-1">Qty</th>
                        <th className="text-right py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((it, idx) => (
                        <tr key={idx} className="border-b border-dotted border-slate-200">
                          <td className="py-1">
                            <span className="font-bold">{it.product_name}</span>
                            <br />
                            <span className="text-[9px] text-slate-500">
                              ₹{it.unit_price} x {it.quantity}
                            </span>
                          </td>
                          <td className="text-center py-1">{it.quantity}</td>
                          <td className="text-right py-1 font-bold">₹{it.total_amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t border-dashed border-slate-900 my-1.5" />

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{selectedInvoice.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST Tax:</span>
                      <span>₹{selectedInvoice.tax_total}</span>
                    </div>
                    <div className="flex justify-between font-black text-xs border-t border-b border-dashed border-slate-900 py-1">
                      <span>GRAND TOTAL:</span>
                      <span>₹{selectedInvoice.grand_total}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Paid:</span>
                      <span>₹{selectedInvoice.paid_amount || 0}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-700">
                      <span>BALANCE DUE:</span>
                      <span>₹{selectedInvoice.balance_amount || 0}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-900 my-2" />

                  <div className="text-center py-1">
                    <img
                      src={getUpiQrUrl(selectedInvoice)}
                      alt="UPI QR Code"
                      className="w-24 h-24 mx-auto object-contain"
                    />
                    <p className="text-[9px] font-bold mt-1">Scan to Pay via UPI</p>
                  </div>

                  <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-dashed border-slate-900 mt-2">
                    Thank you for shopping with us!
                    <br />
                    Visit again · DANZA-SON
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUICK RECORD PAYMENT MODAL                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Record Payment / Settlement"
        size="md"
      >
        {paymentInvoice && (
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
            {/* Quick Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {paymentInvoice.invoice_number}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Customer:</span>
                <span className="font-semibold text-slate-800">
                  {paymentInvoice.customer_id?.customer_name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center font-mono">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Grand Total</span>
                  <span className="font-bold text-slate-900">
                    ₹{paymentInvoice.grand_total?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-sans">Already Paid</span>
                  <span className="font-bold text-emerald-600">
                    ₹{(paymentInvoice.paid_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-600 block font-sans">Remaining Due</span>
                  <span className="font-bold text-rose-700">
                    ₹{(paymentInvoice.balance_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick settlement buttons */}
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">Quick Settlement:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickPaymentModal('full')}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPaymentModal('half')}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPaymentModal('zero')}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Clear (₹0)
                </button>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="modal_pay_mode"
                  checked={paymentForm.pay_mode_type === 'single'}
                  onChange={() =>
                    setPaymentForm((prev) => ({ ...prev, pay_mode_type: 'single' }))
                  }
                />
                Standard Mode
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-brand font-bold">
                <input
                  type="radio"
                  name="modal_pay_mode"
                  checked={paymentForm.pay_mode_type === 'split'}
                  onChange={() =>
                    setPaymentForm((prev) => ({ ...prev, pay_mode_type: 'split' }))
                  }
                />
                Split Payment (Cash + UPI)
              </label>
            </div>

            {/* Receiving Bank Account Prompt */}
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-600" />
                  <span>Receiving Bank Account *</span>
                </label>
                {paymentForm.bank_account_id && (
                  <span className="font-mono text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    Bal: ₹
                    {Number(
                      bankAccounts.find((b) => b._id === paymentForm.bank_account_id)?.current_balance || 0
                    ).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <select
                required
                value={paymentForm.bank_account_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, bank_account_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-xs font-semibold text-slate-800 outline-none focus:border-brand bg-white"
              >
                <option value="">-- Select Receiving Bank Account / Cash Vault --</option>
                {bankAccounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.account_name} ({acc.bank_name}) - A/c: {acc.account_number} [Bal: ₹{Number(acc.current_balance || 0).toLocaleString('en-IN')}]
                    {acc.is_default_receiving ? ' ★ Primary Default' : ''}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-0.5">
                <span>The customer payment will be automatically credited to this bank account.</span>
                <button
                  type="button"
                  onClick={() => navigate('/purchase/settings?tab=bank_accounts')}
                  className="text-emerald-700 font-bold hover:underline shrink-0"
                >
                  + Manage Banks
                </button>
              </div>
            </div>

            {paymentForm.pay_mode_type === 'single' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-mono text-slate-500 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-mono font-bold text-slate-900 outline-none focus:border-brand"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Payment Date</label>
                    <input
                      type="date"
                      required
                      value={paymentForm.payment_date}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, payment_date: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Payment Time</label>
                    <input
                      type="time"
                      required
                      value={paymentForm.payment_time}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, payment_time: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-brand font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Payment Mode</label>
                    <select
                      value={paymentForm.payment_mode}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, payment_mode: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-brand bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                      <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                      <option value="Cheque / DD">Cheque / Demand Draft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Reference / Cheque / UTR #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-12345678"
                    value={paymentForm.reference_number}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, reference_number: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-800 outline-none focus:border-brand"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cash Received (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.split_cash}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, split_cash: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:border-brand"
                      placeholder="Cash"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      UPI / Online Received (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.split_online}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, split_online: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 outline-none focus:border-brand"
                      placeholder="UPI"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                  <span>
                    Total Paying:{' '}
                    <strong className="text-emerald-700 font-mono">
                      ₹{(
                        (Number(paymentForm.split_cash) || 0) +
                        (Number(paymentForm.split_online) || 0)
                      ).toLocaleString('en-IN')}
                    </strong>
                  </span>
                  <span>
                    Remaining Balance:{' '}
                    <strong className="text-amber-700 font-mono">
                      ₹{Math.max(
                        0,
                        (paymentInvoice.balance_amount || 0) -
                          ((Number(paymentForm.split_cash) || 0) +
                            (Number(paymentForm.split_online) || 0))
                      ).toLocaleString('en-IN')}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {paymentSubmitting ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 4. QUICK CHANGE DUE DATE MODAL                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDueDateOpen}
        onClose={() => setIsDueDateOpen(false)}
        title="Change Invoice Due Date"
        size="sm"
      >
        {dueDateInvoice && (
          <form onSubmit={handleDueDateSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-slate-500">
                Invoice:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {dueDateInvoice.invoice_number}
                </span>
              </p>
              <p className="text-slate-500">
                Customer:{' '}
                <span className="font-semibold text-slate-800">
                  {dueDateInvoice.customer_id?.customer_name}
                </span>
              </p>
              <p className="text-slate-500">
                Current Due Date:{' '}
                <span className="font-medium text-slate-800">
                  {dueDateInvoice.due_date
                    ? new Date(dueDateInvoice.due_date).toLocaleDateString('en-IN')
                    : 'Not Set'}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                New Due Date *
              </label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDueDateOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dueDateSubmitting}
                className="px-4 py-1.5 rounded-lg bg-brand text-white font-bold hover:bg-brand-600 transition disabled:opacity-50"
              >
                {dueDateSubmitting ? 'Updating...' : 'Update Due Date'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* REQUIREMENT 10: PAYMENT RECEIVED TIME CORRECTION MODAL */}
      {isTimeCorrectionOpen && timeCorrectionTarget && (
        <Modal
          isOpen={isTimeCorrectionOpen}
          onClose={() => setIsTimeCorrectionOpen(false)}
          title={`Correct Payment Received Time — Invoice ${timeCorrectionTarget.invoice.invoice_number}`}
          size="md"
        >
          <form onSubmit={handleSaveTimeCorrection} className="space-y-4 text-xs font-sans text-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Settlement Details</span>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Amount:</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">
                  ₹{Number(timeCorrectionTarget.payment.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 text-[11px]">
                <span>Recorded Mode:</span>
                <span className="font-medium">{timeCorrectionTarget.payment.payment_mode || 'Bank'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Corrected Date *</label>
                <input
                  type="date"
                  required
                  value={timeCorrectionForm.new_date}
                  onChange={(e) => setTimeCorrectionForm({ ...timeCorrectionForm, new_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Corrected Time *</label>
                <input
                  type="time"
                  required
                  value={timeCorrectionForm.new_time}
                  onChange={(e) => setTimeCorrectionForm({ ...timeCorrectionForm, new_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-brand font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Reason for Time Correction <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={timeCorrectionForm.reason}
                onChange={(e) => setTimeCorrectionForm({ ...timeCorrectionForm, reason: e.target.value })}
                placeholder="e.g. Bank credit timestamp was 02:45 PM instead of morning"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Corrected By</label>
              <input
                type="text"
                value={timeCorrectionForm.corrected_by}
                onChange={(e) => setTimeCorrectionForm({ ...timeCorrectionForm, corrected_by: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-slate-50"
              />
            </div>

            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              * Audit Trail Notice: Correcting payment time updates the invoice settlement history and synchronizes the associated Finance Transaction timestamp without creating duplicate records.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTimeCorrectionOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={timeCorrectionSubmitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
              >
                {timeCorrectionSubmitting ? 'Syncing...' : 'Save & Sync Time'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
