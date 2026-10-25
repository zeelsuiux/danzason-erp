import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Building,
  Warehouse as WarehouseIcon,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Truck,
  CheckCircle2,
  Percent,
  Coins,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { ft, St, Dt } from '../../services/procurementService';
import ProductSearchDropdown from '../../components/common/ProductSearchDropdown';

export default function PurchaseBillForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const poIdParam = searchParams.get('po_id');
  const typeParam = searchParams.get('type');
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lookups
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [nextBillNumber, setNextBillNumber] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    invoice_number: '',
    vendor_bill_number: '',
    supplier_invoice_number: '',
    supplier_invoice_date: new Date().toISOString().split('T')[0],
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    supplier_id: '',
    warehouse_id: '',
    po_id: poIdParam || '',
    purchase_type: typeParam || 'standard', // 'standard' | 'raw_material' | 'manufacturing'
    is_service_bill: typeParam === 'manufacturing',
    manufacturing_po_id: null,
    payment_terms: 'Net 30 Days',
    is_interstate: false,
    shipping_charges: 0,
    final_discount_type: 'percentage', // 'percentage' | 'fixed'
    final_discount_value: 0,
    paid_amount: 0,
    status: 'pending',
    remarks: '',
    items: [
      {
        product_id: '',
        product_name: '',
        sku: '',
        description: '',
        ordered_qty: 0,
        received_qty: 1,
        quantity: 1,
        uom: 'PCS',
        unit_rate: 0,
        rate: 0,
        discount: 0,
        discount_percent: 0,
        gst_rate: 18,
      },
    ],
  });

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      loadBillData(id);
    } else {
      loadNextBillNumber();
      if (poIdParam) {
        handleLoadFromPo(poIdParam);
      }
    }
  }, [id, isEdit, poIdParam]);

  const loadLookups = async () => {
    try {
      const [supRes, whRes, prodRes, poRes] = await Promise.all([
        ft.getSuppliers({ limit: 200 }),
        St.getWarehouses(),
        Dt.getProducts({ limit: 300 }),
        ft.getOrders({ limit: 100 }),
      ]);
      const supList = Array.isArray(supRes?.data) ? supRes.data : [];
      const whList =
        whRes?.data?.warehouses ||
        whRes?.warehouses ||
        (Array.isArray(whRes?.data) ? whRes.data : []);
      const prodList =
        prodRes?.data?.products ||
        (Array.isArray(prodRes?.data) ? prodRes.data : []);
      const poList = Array.isArray(poRes?.data) ? poRes.data : [];

      setSuppliers(supList);
      setWarehouses(Array.isArray(whList) ? whList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);
      setPurchaseOrders(poList);

      if (!isEdit && !poIdParam) {
        const defaultWh = whList.find((w) => w.is_default && w.status === 'active') || whList[0];
        if (defaultWh) {
          setFormData((prev) => ({ ...prev, warehouse_id: defaultWh._id }));
        }
        if (supList.length > 0) {
          setFormData((prev) => ({ ...prev, supplier_id: supList[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to load lookups', err);
    }
  };

  const loadNextBillNumber = async () => {
    try {
      const res = await ft.getNextBillNumber();
      if (res.success && res.next_number) {
        setNextBillNumber(res.next_number);
        setFormData((prev) => ({ ...prev, invoice_number: res.next_number }));
      }
    } catch (err) {
      console.warn('Could not fetch next bill number', err);
    }
  };

  const loadBillData = async (billId) => {
    try {
      setInitialLoading(true);
      const res = await ft.getInvoiceById(billId);
      const bill = res.data;
      if (!bill) throw new Error('Bill not found');

      setFormData({
        invoice_number: bill.invoice_number || '',
        vendor_bill_number: bill.vendor_bill_number || bill.supplier_invoice_number || '',
        supplier_invoice_number: bill.supplier_invoice_number || bill.vendor_bill_number || '',
        supplier_invoice_date: bill.supplier_invoice_date
          ? new Date(bill.supplier_invoice_date).toISOString().split('T')[0]
          : bill.bill_date ? new Date(bill.bill_date).toISOString().split('T')[0] : '',
        bill_date: bill.bill_date ? new Date(bill.bill_date).toISOString().split('T')[0] : '',
        due_date: bill.due_date ? new Date(bill.due_date).toISOString().split('T')[0] : '',
        supplier_id: bill.supplier_id?._id || bill.supplier_id || '',
        warehouse_id: bill.warehouse_id?._id || bill.warehouse_id || '',
        po_id: bill.po_id?._id || bill.po_id || '',
        purchase_type: bill.purchase_type || 'standard',
        is_service_bill: Boolean(bill.is_service_bill),
        manufacturing_po_id: bill.manufacturing_po_id?._id || bill.manufacturing_po_id || null,
        payment_terms: bill.payment_terms || 'Net 30 Days',
        is_interstate: Boolean(bill.is_interstate),
        shipping_charges: Number(bill.shipping_charges || 0),
        final_discount_type: bill.final_discount_type || 'percentage',
        final_discount_value: Number(bill.final_discount_value || 0),
        paid_amount: Number(bill.paid_amount || 0),
        status: bill.status || 'pending',
        remarks: bill.remarks || '',
        items: (bill.items && bill.items.length > 0
          ? bill.items
          : [{ product_id: '', description: '', received_qty: 1, unit_rate: 0, gst_rate: 18 }]
        ).map((item) => ({
          _id: item._id,
          product_id: item.product_id?._id || item.product_id || '',
          raw_material_id: item.raw_material_id?._id || item.raw_material_id || '',
          item_type: item.item_type || (bill.is_service_bill ? 'manufacturing_service' : 'product'),
          product_name: item.product_id?.product_name || item.product_id?.name || item.product_name || item.description || '',
          sku: item.product_id?.sku || item.sku || '',
          description: item.description || item.product_id?.product_name || '',
          ordered_qty: Number(item.ordered_qty || 0),
          received_qty: Number(item.received_qty !== undefined ? item.received_qty : item.quantity || 1),
          quantity: Number(item.quantity !== undefined ? item.quantity : item.received_qty || 1),
          uom: item.uom || item.unit || item.product_id?.uom || 'PCS',
          unit_rate: Number(item.unit_rate !== undefined ? item.unit_rate : item.rate || 0),
          rate: Number(item.rate !== undefined ? item.rate : item.unit_rate || 0),
          discount: Number(item.discount || 0),
          discount_percent: Number(item.discount_percent || 0),
          gst_rate: Number(item.gst_rate !== undefined ? item.gst_rate : 18),
        })),
      });
    } catch (err) {
      setError(err.message || 'Failed to load purchase bill details');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleLoadFromPo = async (poId) => {
    if (!poId) return;
    try {
      const res = await ft.getOrderById(poId);
      const po = res.data;
      if (!po) return;

      const isMfr = po.purchase_type === 'manufacturing';
      const isRM = po.purchase_type === 'raw_material';

      let itemsToBill = [];
      if (po.items && po.items.length > 0) {
        itemsToBill = po.items.map((pItem) => {
          const pending = Math.max(0, (pItem.ordered_qty || 0) - (pItem.received_qty || 0));
          const qtyToBill = pending > 0 ? pending : (pItem.ordered_qty || 1);
          return {
            product_id: pItem.product_id?._id || pItem.product_id || '',
            raw_material_id: pItem.raw_material_id?._id || pItem.raw_material_id || '',
            item_type: pItem.item_type || (isMfr ? 'manufacturing_service' : isRM ? 'raw_material' : 'product'),
            product_name: pItem.product_name || pItem.product_id?.product_name || pItem.product_id?.name || pItem.description || '',
            sku: pItem.sku || pItem.product_id?.sku || '',
            description: pItem.description || (isMfr ? `Manufacturing Service Charges (${po.manufacturing_qty || 0} PCS)` : ''),
            ordered_qty: Number(pItem.ordered_qty || 0),
            received_qty: qtyToBill,
            quantity: qtyToBill,
            uom: pItem.unit || pItem.product_id?.uom || (isRM ? 'KG' : 'PCS'),
            unit_rate: Number(pItem.rate || 0),
            rate: Number(pItem.rate || 0),
            discount: 0,
            discount_percent: Number(pItem.discount_percent || 0),
            gst_rate: Number(pItem.gst_rate !== undefined ? pItem.gst_rate : 18),
          };
        });
      } else if (isMfr) {
        itemsToBill = [
          {
            product_id: po.finished_product_id?._id || po.finished_product_id || '',
            raw_material_id: '',
            item_type: 'manufacturing_service',
            product_name: po.finished_product_name || 'Manufacturing / Job Work Charges',
            sku: '',
            description: `Production & Stitching Service for ${po.finished_product_name || 'Goods'} (${po.manufacturing_qty || 0} PCS)`,
            ordered_qty: Number(po.manufacturing_qty || 1),
            received_qty: Number(po.manufacturing_qty || 1),
            quantity: Number(po.manufacturing_qty || 1),
            uom: 'PCS',
            unit_rate: Number(po.manufacturing_rate || 0),
            rate: Number(po.manufacturing_rate || 0),
            discount: 0,
            discount_percent: 0,
            gst_rate: 18,
          },
        ];
      }

      setFormData((prev) => ({
        ...prev,
        po_id: po._id,
        purchase_type: po.purchase_type || 'standard',
        is_service_bill: isMfr,
        manufacturing_po_id: isMfr ? po._id : null,
        supplier_id: po.supplier_id?._id || po.supplier_id || prev.supplier_id,
        warehouse_id: po.warehouse_id?._id || po.warehouse_id || prev.warehouse_id,
        is_interstate: Boolean(po.is_interstate),
        payment_terms: po.payment_terms || prev.payment_terms,
        items: itemsToBill.length > 0 ? itemsToBill : prev.items,
      }));
    } catch (err) {
      console.error('Failed to load items from PO', err);
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'received_qty') {
        updated[index].quantity = Number(value);
      } else if (field === 'unit_rate') {
        updated[index].rate = Number(value);
      }
      return { ...prev, items: updated };
    });
  };

  const handleProductSelect = (index, selectedProd) => {
    if (!selectedProd) return;
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        product_id: selectedProd._id,
        product_name: selectedProd.product_name || selectedProd.name || '',
        sku: selectedProd.sku || '',
        description: selectedProd.description || selectedProd.product_name || selectedProd.name || '',
        unit_rate: Number(selectedProd.purchase_rate || selectedProd.cost_price || selectedProd.price || 0),
        rate: Number(selectedProd.purchase_rate || selectedProd.cost_price || selectedProd.price || 0),
        uom: selectedProd.uom || 'PCS',
        gst_rate: Number(selectedProd.gst_rate !== undefined ? selectedProd.gst_rate : 18),
      };
      return { ...prev, items: updated };
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          product_name: '',
          sku: '',
          description: '',
          ordered_qty: 0,
          received_qty: 1,
          quantity: 1,
          uom: 'PCS',
          unit_rate: 0,
          rate: 0,
          discount: 0,
          discount_percent: 0,
          gst_rate: 18,
        },
      ],
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) {
      alert('Purchase Bill must contain at least one product row');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // ================= CALCULATIONS WITH PROPORTIONAL FINAL BILL DISCOUNT =================
  const grossItems = formData.items.map((item) => {
    const qty = Number(item.received_qty !== undefined ? item.received_qty : item.quantity) || 0;
    const rate = Number(item.unit_rate !== undefined ? item.unit_rate : item.rate) || 0;
    const itemGross = qty * rate;
    const itemDiscount = Number(item.discount || 0);
    const itemTaxableBeforeFinal = Math.max(0, itemGross - itemDiscount);

    return {
      ...item,
      qty,
      rate,
      itemGross,
      itemDiscount,
      itemTaxableBeforeFinal,
    };
  });

  const grossTaxableSubtotal = grossItems.reduce((acc, it) => acc + it.itemTaxableBeforeFinal, 0);

  // Compute final discount amount
  let calculatedFinalDiscount = 0;
  if (formData.final_discount_type === 'percentage') {
    calculatedFinalDiscount = (grossTaxableSubtotal * (Number(formData.final_discount_value) || 0)) / 100;
  } else {
    calculatedFinalDiscount = Number(formData.final_discount_value) || 0;
  }
  calculatedFinalDiscount = Math.min(grossTaxableSubtotal, Math.max(0, calculatedFinalDiscount));

  // Proportional distribution across items
  const gstBreakdownMap = {};
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const fullyCalculatedItems = grossItems.map((item) => {
    const ratio = grossTaxableSubtotal > 0 ? item.itemTaxableBeforeFinal / grossTaxableSubtotal : 0;
    const finalDiscountShare = ratio * calculatedFinalDiscount;
    const netTaxable = Math.max(0, item.itemTaxableBeforeFinal - finalDiscountShare);
    const gstRate = Number(item.gst_rate) || 0;

    let itemCgst = 0;
    let itemSgst = 0;
    let itemIgst = 0;

    if (formData.is_interstate) {
      itemIgst = (netTaxable * gstRate) / 100;
      totalIgst += itemIgst;
    } else {
      const halfRate = gstRate / 2;
      itemCgst = (netTaxable * halfRate) / 100;
      itemSgst = (netTaxable * halfRate) / 100;
      totalCgst += itemCgst;
      totalSgst += itemSgst;
    }

    const itemTotal = netTaxable + itemCgst + itemSgst + itemIgst;

    // Track GST breakdown
    if (!gstBreakdownMap[gstRate]) {
      gstBreakdownMap[gstRate] = { gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
    }
    gstBreakdownMap[gstRate].taxable += netTaxable;
    gstBreakdownMap[gstRate].cgst += itemCgst;
    gstBreakdownMap[gstRate].sgst += itemSgst;
    gstBreakdownMap[gstRate].igst += itemIgst;
    gstBreakdownMap[gstRate].total += itemTotal;

    return {
      ...item,
      finalDiscountShare,
      netTaxable,
      itemCgst,
      itemSgst,
      itemIgst,
      itemTotal,
    };
  });

  const netTaxableTotal = fullyCalculatedItems.reduce((acc, it) => acc + it.netTaxable, 0);
  const totalTaxAmount = totalCgst + totalSgst + totalIgst;
  const shippingCharges = Number(formData.shipping_charges) || 0;
  const totalBeforeRound = netTaxableTotal + totalTaxAmount + shippingCharges;
  const grandTotal = Math.round(totalBeforeRound);
  const roundOff = Number((grandTotal - totalBeforeRound).toFixed(2));
  const paidAmount = Number(formData.paid_amount) || 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.supplier_id) {
      setError('Please select a Supplier');
      return;
    }
    if (!formData.warehouse_id) {
      setError('Please select a Destination Warehouse');
      return;
    }
    if (!formData.vendor_bill_number && !formData.supplier_invoice_number) {
      setError('Please enter the physical Supplier Invoice Number (from vendor bill)');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      if (!it.product_id && !it.raw_material_id && it.item_type !== 'manufacturing_service' && !formData.is_service_bill) {
        setError(`Please select an item for row #${i + 1}`);
        return;
      }
      const qty = Number(it.received_qty !== undefined ? it.received_qty : it.quantity);
      if (qty <= 0) {
        setError(`Received quantity must be greater than 0 on row #${i + 1}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const supplierBillNo = formData.supplier_invoice_number || formData.vendor_bill_number;
      const payload = {
        ...formData,
        vendor_bill_number: supplierBillNo,
        supplier_invoice_number: supplierBillNo,
        purchase_type: formData.purchase_type || 'standard',
        is_service_bill: Boolean(formData.is_service_bill),
        manufacturing_po_id: formData.manufacturing_po_id || undefined,
        final_discount_type: formData.final_discount_type,
        final_discount_value: Number(formData.final_discount_value || 0),
        final_discount_amount: calculatedFinalDiscount,
        shipping_charges: shippingCharges,
        paid_amount: paidAmount,
        items: fullyCalculatedItems.map((it) => ({
          _id: it._id,
          product_id: it.product_id || null,
          raw_material_id: it.raw_material_id || null,
          item_type: it.item_type || (formData.is_service_bill ? 'manufacturing_service' : 'product'),
          product_name: it.product_name || it.description,
          sku: it.sku,
          description: it.description || it.product_name,
          ordered_qty: Number(it.ordered_qty || 0),
          quantity: Number(it.qty),
          received_qty: Number(it.qty),
          uom: it.uom || 'PCS',
          unit_rate: Number(it.rate),
          rate: Number(it.rate),
          discount: Number(it.itemDiscount || 0),
          gst_rate: Number(it.gst_rate !== undefined ? it.gst_rate : 18),
        })),
      };

      if (isEdit) {
        await ft.updateInvoice(id, payload);
        setSuccess('Purchase Bill updated successfully');
      } else {
        await ft.createInvoice(payload);
        setSuccess('Purchase Bill saved: Stock added to inventory and supplier ledger updated successfully');
      }

      setTimeout(() => {
        navigate('/purchase-bills');
      }, 900);
    } catch (err) {
      setError(err.message || 'Failed to save purchase bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const selectedSupplier = suppliers.find((s) => s._id === formData.supplier_id);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/purchase-bills"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Purchase Bills
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {isEdit ? `Edit Purchase Bill: ${formData.invoice_number}` : 'Create Purchase Bill (Inward)'}
              </h1>
              <p className="text-xs text-slate-500">
                Auto Bill Numbering • Proportional Invoice Discount • Live GST Calculation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/purchase-bills"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving Bill...' : isEdit ? 'Update Purchase Bill' : 'Save & Post Inward'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {formData.is_service_bill && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-amber-950 text-sm block">
                Manufacturing / Job Work Service Bill
              </span>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                This bill records the job-work labor/service charges only. Inward of Finished Goods is recorded separately via physical arrival receipts to avoid duplicate inventory.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Bill & Supplier Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Purchase Bill & Supplier Information</h2>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.is_interstate}
                  onChange={(e) => setFormData({ ...formData, is_interstate: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Interstate Transaction (IGST Only)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Internal Bill Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  System Bill Number (PB No.)
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.invoice_number || nextBillNumber || 'PB-2026-27-0001 (Auto)'}
                  className="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 font-mono text-sm font-bold text-indigo-900"
                />
                <span className="text-[11px] text-slate-400">Internal auto FY sequence</span>
              </div>

              {/* Physical Supplier Bill Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Supplier Invoice Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-4587 (from vendor paper bill)"
                  value={formData.supplier_invoice_number || formData.vendor_bill_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplier_invoice_number: e.target.value,
                      vendor_bill_number: e.target.value,
                    })
                  }
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="text-[11px] text-slate-400">Physical bill number from vendor</span>
              </div>

              {/* Supplier Invoice Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">Supplier Bill Date *</label>
                <input
                  type="date"
                  required
                  value={formData.supplier_invoice_date}
                  onChange={(e) => setFormData({ ...formData, supplier_invoice_date: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Inward Bill Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">Inward / Posting Date *</label>
                <input
                  type="date"
                  required
                  value={formData.bill_date}
                  onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">Supplier / Vendor *</label>
                <select
                  required
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplier_name || s.name} {s.gstin ? `(${s.gstin})` : ''}
                    </option>
                  ))}
                </select>
                {selectedSupplier && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Outstanding: ₹{(selectedSupplier.pending_balance || 0).toLocaleString()} | {selectedSupplier.state || ''}
                  </p>
                )}
              </div>

              {/* Warehouse Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">Destination Warehouse (Stock Inward) *</label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.warehouse_name || w.name} {w.warehouse_code ? `[${w.warehouse_code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Purchase Order */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">Linked Purchase Order (Optional)</label>
                <select
                  value={formData.po_id}
                  onChange={(e) => {
                    const poVal = e.target.value;
                    handleLoadFromPo(poVal);
                  }}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Direct Bill (Without PO)</option>
                  {purchaseOrders.map((po) => (
                    <option key={po._id} value={po._id}>
                      {po.po_number} ({po.supplier_id?.supplier_name || 'Vendor'}) - ₹{(po.grand_total || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Due Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">Payment Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Line Items Table (11 Columns) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Purchased Products (Line Items)</h2>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                <Plus className="h-4 w-4" /> Add Product Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">#</th>
                    <th className="min-w-[220px] px-3 py-3">Product / Item *</th>
                    <th className="w-24 px-3 py-3">SKU</th>
                    {formData.po_id && <th className="w-20 px-3 py-3 text-right">PO Qty</th>}
                    <th className="w-24 px-3 py-3 text-right">Received Qty *</th>
                    <th className="w-20 px-3 py-3">Unit</th>
                    <th className="w-24 px-3 py-3 text-right">Rate (₹) *</th>
                    <th className="w-20 px-3 py-3 text-right">Line Disc</th>
                    <th className="w-24 px-3 py-3 text-right">Taxable (₹)</th>
                    <th className="w-20 px-3 py-3 text-right">GST %</th>
                    <th className="w-28 px-3 py-3 text-right">Total (₹)</th>
                    <th className="w-10 px-2 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fullyCalculatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <ProductSearchDropdown
                          products={products}
                          selectedProductId={item.product_id}
                          onSelect={(p) => handleProductSelect(idx, p)}
                          placeholder="Select / Search Product..."
                        />
                        <input
                          type="text"
                          placeholder="Batch / Description..."
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.sku || 'N/A'}
                        </span>
                      </td>
                      {formData.po_id && (
                        <td className="px-3 py-3 text-right font-medium text-slate-500">
                          {item.ordered_qty || '-'}
                        </td>
                      )}
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          required
                          value={item.received_qty}
                          onChange={(e) => handleItemChange(idx, 'received_qty', e.target.value)}
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-right font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.uom}
                          onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-center font-medium text-slate-700"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={item.unit_rate}
                          onChange={(e) => handleItemChange(idx, 'unit_rate', e.target.value)}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-right font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.discount}
                          onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-right font-medium text-slate-700"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">
                        ₹{item.netTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {calculatedFinalDiscount > 0 && (
                          <div className="text-[10px] text-emerald-600 font-normal">
                            -₹{item.finalDiscountShare.toFixed(2)} share
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <select
                          value={item.gst_rate}
                          onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                          className="rounded border border-slate-200 px-1 py-1 text-right text-xs font-semibold text-slate-700"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-indigo-700">
                        ₹{item.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-slate-400 transition hover:text-rose-600"
                          title="Remove Row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-between items-center">
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add Item Row
              </button>
              <div className="text-xs text-slate-500 font-medium">
                Total Line Items: <span className="font-bold text-slate-800">{formData.items.length}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Final Bill Discount & Calculation Summary */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left: Final Discount & GST Breakdown */}
            <div className="space-y-4">
              {/* Final Invoice-Level Discount Card */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-indigo-950">Final Invoice-Level Discount</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    Proportionately Allocated to GST
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Discount Type</label>
                    <select
                      value={formData.final_discount_type}
                      onChange={(e) => setFormData({ ...formData, final_discount_type: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600">
                      {formData.final_discount_type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={formData.final_discount_type === 'percentage' ? 'e.g. 5%' : 'e.g. ₹500'}
                      value={formData.final_discount_value}
                      onChange={(e) => setFormData({ ...formData, final_discount_value: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-indigo-100 text-xs">
                  <span className="text-slate-600">Total Invoice Discount Deducted:</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    -₹{calculatedFinalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* GST Summary Table */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                  GST Rate-wise Summary Breakdown
                </h3>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-2 py-1.5">GST Rate</th>
                      <th className="px-2 py-1.5 text-right">Taxable</th>
                      {formData.is_interstate ? (
                        <th className="px-2 py-1.5 text-right">IGST</th>
                      ) : (
                        <>
                          <th className="px-2 py-1.5 text-right">CGST</th>
                          <th className="px-2 py-1.5 text-right">SGST</th>
                        </>
                      )}
                      <th className="px-2 py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {Object.values(gstBreakdownMap).map((row) => (
                      <tr key={row.gstRate}>
                        <td className="px-2 py-1.5 font-sans font-bold text-slate-700">{row.gstRate}%</td>
                        <td className="px-2 py-1.5 text-right">₹{row.taxable.toFixed(2)}</td>
                        {formData.is_interstate ? (
                          <td className="px-2 py-1.5 text-right">₹{row.igst.toFixed(2)}</td>
                        ) : (
                          <>
                            <td className="px-2 py-1.5 text-right">₹{row.cgst.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right">₹{row.sgst.toFixed(2)}</td>
                          </>
                        )}
                        <td className="px-2 py-1.5 text-right font-bold text-slate-800">₹{row.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Remarks */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Bill Remarks / Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Gate inward note, transporter docket number, physical verification remarks..."
                  className="block w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Right: Bill Value Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-3">
                  Bill Financial Summary
                </h2>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Taxable Subtotal:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{grossTaxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {calculatedFinalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Less: Final Invoice Discount:</span>
                      <span>
                        -₹{calculatedFinalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-slate-700 bg-slate-50 p-1.5 rounded">
                    <span>Net Taxable Amount:</span>
                    <span>
                      ₹{netTaxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {formData.is_interstate ? (
                    <div className="flex justify-between">
                      <span>IGST Total:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>CGST Total:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST Total:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <span>Shipping / Freight (₹):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.shipping_charges}
                      onChange={(e) => setFormData({ ...formData, shipping_charges: e.target.value })}
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-right font-medium text-slate-800"
                    />
                  </div>

                  <div className="flex justify-between text-slate-500 pt-1">
                    <span>Round Off:</span>
                    <span className="font-mono">
                      {roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <span className="text-base font-bold text-slate-900">Grand Total (₹):</span>
                    <span className="text-2xl font-black text-indigo-700">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 font-medium">Amount Paid (₹):</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.paid_amount}
                        onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                        className="w-28 rounded border border-emerald-300 bg-emerald-50/30 px-2 py-1 text-right font-bold text-emerald-800 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm font-bold text-rose-700 pt-1 border-t border-slate-100">
                      <span>Outstanding Balance (₹):</span>
                      <span>₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill Status */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bill Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="pending">Pending</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              to="/purchase-bills"
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving Bill...' : isEdit ? 'Update Purchase Bill' : 'Save & Post Purchase Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
