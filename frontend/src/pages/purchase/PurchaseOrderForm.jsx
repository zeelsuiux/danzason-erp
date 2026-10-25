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
  RotateCcw,
} from 'lucide-react';
import { ft, St, Dt, rawMaterialApi } from '../../services/procurementService';
import ProductSearchDropdown from '../../components/common/ProductSearchDropdown';

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get('type');
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
  const [rawMaterials, setRawMaterials] = useState([]);
  const [nextPoNumber, setNextPoNumber] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    po_number: '',
    po_date: new Date().toISOString().split('T')[0],
    purchase_type: urlType || 'standard', // 'standard' | 'raw_material' | 'manufacturing'
    supplier_id: '',
    warehouse_id: '',
    expected_delivery_date: '',
    payment_terms: 'Net 30 Days',
    delivery_terms: 'FOB Destination',
    reference_no: '',
    billing_address: '',
    shipping_address: '',
    is_interstate: false,
    status: 'sent',
    notes: '',
    remarks: '',
    edit_reason: '',
    // Manufacturing / Job Work fields
    finished_product_id: '',
    finished_product_name: '',
    manufacturing_qty: 100,
    manufacturing_rate: 20,
    raw_materials_required: [
      {
        raw_material_id: '',
        material_name: '',
        material_code: '',
        uom: 'KG',
        cost_rate: 200,
        planned_qty: 2,
      },
    ],
    items: [
      {
        product_id: '',
        raw_material_id: '',
        item_type: 'product',
        product_name: '',
        sku: '',
        description: '',
        ordered_qty: 1,
        unit: 'PCS',
        rate: 0,
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
      loadOrderData(id);
    } else {
      loadNextPoNumber();
    }
  }, [id, isEdit]);

  const loadLookups = async () => {
    try {
      const [supRes, whRes, prodRes, rmRes] = await Promise.all([
        ft.getSuppliers({ limit: 200 }),
        St.getWarehouses(),
        Dt.getProducts({ limit: 300 }),
        rawMaterialApi.getRawMaterials({ limit: 200 }),
      ]);
      const supList = Array.isArray(supRes?.data) ? supRes.data : [];
      const whList =
        whRes?.data?.warehouses ||
        whRes?.warehouses ||
        (Array.isArray(whRes?.data) ? whRes.data : []);
      const prodList =
        prodRes?.data?.products ||
        (Array.isArray(prodRes?.data) ? prodRes.data : []);
      const rmList = Array.isArray(rmRes?.data) ? rmRes.data : [];

      setSuppliers(supList);
      setWarehouses(Array.isArray(whList) ? whList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);
      setRawMaterials(Array.isArray(rmList) ? rmList : []);

      if (!isEdit) {
        const defaultWh = whList.find((w) => w.is_default && w.status === 'active') || whList[0];
        if (defaultWh) {
          setFormData((prev) => ({
            ...prev,
            warehouse_id: defaultWh._id,
            shipping_address: defaultWh.address
              ? typeof defaultWh.address === 'string'
                ? defaultWh.address
                : `${defaultWh.address.street || defaultWh.address.line1 || ''}, ${defaultWh.address.city || ''}, ${defaultWh.address.state || ''} - ${defaultWh.address.pincode || ''}`
              : '',
          }));
        }
        if (supList.length > 0) {
          const firstSup =
            urlType === 'manufacturing'
              ? supList.find((s) => s.supplier_classification === 'manufacturing') || supList[0]
              : urlType === 'raw_material'
              ? supList.find((s) => s.supplier_classification === 'raw_material') || supList[0]
              : supList[0];

          setFormData((prev) => ({
            ...prev,
            supplier_id: firstSup._id,
            billing_address: firstSup.address
              ? typeof firstSup.address === 'string'
                ? firstSup.address
                : `${firstSup.address.street || firstSup.address.address_line1 || ''}, ${firstSup.address.city || ''}, ${firstSup.address.state || ''}`
              : '',
          }));
        }

        if (urlType === 'manufacturing' && prodList.length > 0) {
          const firstP = prodList[0];
          setFormData((prev) => ({
            ...prev,
            purchase_type: 'manufacturing',
            finished_product_id: firstP._id,
            finished_product_name: firstP.product_name,
            items: [
              {
                product_id: firstP._id,
                item_type: 'manufacturing_service',
                product_name: `${firstP.product_name} Job Work Service`,
                sku: firstP.sku || 'JOB-WORK',
                description: `Production & Stitching Service for ${firstP.product_name} (${prev.manufacturing_qty || 100} PCS)`,
                ordered_qty: prev.manufacturing_qty || 100,
                unit: firstP.uom || 'PCS',
                rate: prev.manufacturing_rate || 20,
                discount_percent: 0,
                gst_rate: 18,
              },
            ],
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load lookups', err);
    }
  };

  const loadNextPoNumber = async () => {
    try {
      const res = await ft.getNextOrderNumber();
      if (res.success && res.next_number) {
        setNextPoNumber(res.next_number);
        setFormData((prev) => ({ ...prev, po_number: res.next_number }));
      }
    } catch (err) {
      console.warn('Could not fetch next PO number', err);
    }
  };

  const loadOrderData = async (orderId) => {
    try {
      setInitialLoading(true);
      const res = await ft.getOrderById(orderId);
      const order = res.data;
      if (!order) throw new Error('Order not found');

      setFormData({
        po_number: order.po_number || '',
        po_date: order.po_date ? new Date(order.po_date).toISOString().split('T')[0] : '',
        supplier_id: order.supplier_id?._id || order.supplier_id || '',
        warehouse_id: order.warehouse_id?._id || order.warehouse_id || '',
        expected_delivery_date: order.expected_delivery_date
          ? new Date(order.expected_delivery_date).toISOString().split('T')[0]
          : '',
        payment_terms: order.payment_terms || 'Net 30 Days',
        delivery_terms: order.delivery_terms || 'FOB Destination',
        reference_no: order.reference_no || '',
        billing_address: order.billing_address || '',
        shipping_address: order.shipping_address || '',
        is_interstate: Boolean(order.is_interstate),
        status: order.status || 'sent',
        notes: order.notes || '',
        remarks: order.remarks || '',
        edit_reason: '',
        items: (order.items && order.items.length > 0
          ? order.items
          : [{ product_id: '', description: '', ordered_qty: 1, rate: 0, gst_rate: 18 }]
        ).map((item) => ({
          _id: item._id,
          product_id: item.product_id?._id || item.product_id || '',
          product_name: item.product_id?.product_name || item.product_id?.name || item.description || '',
          sku: item.product_id?.sku || item.sku || '',
          description: item.description || item.product_id?.product_name || '',
          ordered_qty: Number(item.ordered_qty || 1),
          received_qty: Number(item.received_qty || 0),
          pending_qty: Number(item.pending_qty || item.ordered_qty || 1),
          unit: item.unit || item.product_id?.uom || 'PCS',
          rate: Number(item.rate || item.product_id?.purchase_rate || 0),
          discount_percent: Number(item.discount_percent || 0),
          gst_rate: Number(item.gst_rate !== undefined ? item.gst_rate : 18),
        })),
      });
    } catch (err) {
      setError(err.message || 'Failed to load purchase order details');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSupplierChange = (e) => {
    const supId = e.target.value;
    const selected = suppliers.find((s) => s._id === supId);
    let addressStr = '';
    if (selected && selected.address) {
      addressStr = `${selected.address.street || selected.address.address_line1 || ''}, ${selected.address.city || ''}, ${selected.address.state || ''}`;
    }
    setFormData((prev) => ({
      ...prev,
      supplier_id: supId,
      billing_address: addressStr || prev.billing_address,
    }));
  };

  const handleWarehouseChange = (e) => {
    const whId = e.target.value;
    const selected = warehouses.find((w) => w._id === whId);
    let addressStr = '';
    if (selected && selected.address) {
      addressStr =
        typeof selected.address === 'string'
          ? selected.address
          : `${selected.address.street || selected.address.line1 || ''}, ${selected.address.city || ''}, ${selected.address.state || ''} - ${selected.address.pincode || ''}`;
    }
    setFormData((prev) => ({
      ...prev,
      warehouse_id: whId,
      shipping_address: addressStr || prev.shipping_address,
    }));
  };

  const handlePurchaseTypeChange = (type) => {
    setFormData((prev) => {
      let updatedItems = [...prev.items];
      if (type === 'manufacturing') {
        const prod = products[0];
        const mRate = prev.manufacturing_rate || 20;
        const mQty = prev.manufacturing_qty || 100;
        updatedItems = [
          {
            product_id: prod?._id || '',
            item_type: 'manufacturing_service',
            product_name: prod ? `${prod.product_name} Job Work Service` : 'Manufacturing Service',
            sku: prod?.sku || 'JOB-WORK',
            description: `Production & Stitching Service for ${prod?.product_name || 'Product'} (${mQty} PCS)`,
            ordered_qty: mQty,
            unit: 'PCS',
            rate: mRate,
            discount_percent: 0,
            gst_rate: 18,
          },
        ];
      }
      return {
        ...prev,
        purchase_type: type,
        items: updatedItems,
      };
    });
  };

  const handleManufacturingProductChange = (prodId) => {
    const prod = products.find((p) => p._id === prodId);
    if (!prod) return;
    setFormData((prev) => {
      const mQty = prev.manufacturing_qty || 100;
      const mRate = prev.manufacturing_rate || 20;
      const updatedItems = [
        {
          product_id: prod._id,
          item_type: 'manufacturing_service',
          product_name: `${prod.product_name} Job Work Service`,
          sku: prod.sku || 'JOB-WORK',
          description: `Production & Stitching Service for ${prod.product_name} (${mQty} PCS)`,
          ordered_qty: mQty,
          unit: prod.uom || 'PCS',
          rate: mRate,
          discount_percent: 0,
          gst_rate: 18,
        },
      ];
      return {
        ...prev,
        finished_product_id: prod._id,
        finished_product_name: prod.product_name,
        items: updatedItems,
      };
    });
  };

  const handleManufacturingQtyRateChange = (qty, rate) => {
    setFormData((prev) => {
      const updatedItems = prev.items.map((it) => {
        if (it.item_type === 'manufacturing_service') {
          return {
            ...it,
            ordered_qty: Number(qty) || 1,
            rate: Number(rate) || 0,
            description: `Production & Stitching Service for ${prev.finished_product_name || 'Product'} (${qty} PCS)`,
          };
        }
        return it;
      });
      return {
        ...prev,
        manufacturing_qty: Number(qty),
        manufacturing_rate: Number(rate),
        items: updatedItems,
      };
    });
  };

  const addRawMaterialReqRow = () => {
    setFormData((prev) => ({
      ...prev,
      raw_materials_required: [
        ...(prev.raw_materials_required || []),
        {
          raw_material_id: '',
          material_name: '',
          material_code: '',
          uom: 'KG',
          cost_rate: 0,
          planned_qty: 1,
        },
      ],
    }));
  };

  const removeRawMaterialReqRow = (idx) => {
    setFormData((prev) => ({
      ...prev,
      raw_materials_required: (prev.raw_materials_required || []).filter((_, i) => i !== idx),
    }));
  };

  const handleRawMaterialReqChange = (idx, rmId) => {
    const rm = rawMaterials.find((m) => m._id === rmId);
    setFormData((prev) => {
      const updated = [...(prev.raw_materials_required || [])];
      if (rm) {
        updated[idx] = {
          ...updated[idx],
          raw_material_id: rm._id,
          material_name: rm.material_name,
          material_code: rm.material_code,
          uom: rm.uom || 'KG',
          cost_rate: Number(rm.purchase_rate || rm.cost_rate || 0),
        };
      }
      return { ...prev, raw_materials_required: updated };
    });
  };

  const handleRawMaterialReqQty = (idx, qty) => {
    setFormData((prev) => {
      const updated = [...(prev.raw_materials_required || [])];
      updated[idx] = { ...updated[idx], planned_qty: Math.max(0, parseFloat(qty) || 0) };
      return { ...prev, raw_materials_required: updated };
    });
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
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
        rate: Number(selectedProd.purchase_rate || selectedProd.cost_price || selectedProd.price || 0),
        unit: selectedProd.uom || 'PCS',
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
          ordered_qty: 1,
          unit: 'PCS',
          rate: 0,
          discount_percent: 0,
          gst_rate: 18,
        },
      ],
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) {
      alert('Purchase Order must contain at least one item');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Calculations
  const calculatedItems = formData.items.map((item) => {
    const qty = Number(item.ordered_qty) || 0;
    const rate = Number(item.rate) || 0;
    const discPct = Number(item.discount_percent) || 0;
    const gross = qty * rate;
    const discAmt = (gross * discPct) / 100;
    const taxable = Math.max(0, gross - discAmt);
    const gstRate = Number(item.gst_rate) || 0;
    const gstAmt = (taxable * gstRate) / 100;
    const total = taxable + gstAmt;

    return {
      ...item,
      gross,
      discAmt,
      taxable,
      gstAmt,
      total,
    };
  });

  const subtotalTaxable = calculatedItems.reduce((acc, it) => acc + it.taxable, 0);
  const totalGst = calculatedItems.reduce((acc, it) => acc + it.gstAmt, 0);
  const cgstTotal = formData.is_interstate ? 0 : totalGst / 2;
  const sgstTotal = formData.is_interstate ? 0 : totalGst / 2;
  const igstTotal = formData.is_interstate ? totalGst : 0;
  const totalBeforeRound = subtotalTaxable + totalGst;
  const grandTotal = Math.round(totalBeforeRound);
  const roundOff = Number((grandTotal - totalBeforeRound).toFixed(2));

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

    if (formData.purchase_type === 'manufacturing') {
      if (!formData.finished_product_id) {
        setError('Please select the Finished Product to manufacture');
        return;
      }
      if (!formData.raw_materials_required || formData.raw_materials_required.length === 0) {
        setError('Please specify at least one required raw material for job work');
        return;
      }
    }

    if (!formData.items || formData.items.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      if (!it.product_id && !it.raw_material_id && it.item_type !== 'manufacturing_service') {
        setError(`Please select a valid item for row #${i + 1}`);
        return;
      }
      if (Number(it.ordered_qty) <= 0) {
        setError(`Quantity must be greater than 0 on row #${i + 1}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        po_number: formData.po_number || undefined,
        purchase_type: formData.purchase_type || 'standard',
        finished_product_id: formData.finished_product_id || undefined,
        finished_product_name: formData.finished_product_name || undefined,
        manufacturing_qty: Number(formData.manufacturing_qty) || undefined,
        manufacturing_rate: Number(formData.manufacturing_rate) || undefined,
        raw_materials_required: (formData.raw_materials_required || []).map((rm) => ({
          raw_material_id: rm.raw_material_id,
          material_name: rm.material_name,
          material_code: rm.material_code,
          uom: rm.uom || 'KG',
          cost_rate: Number(rm.cost_rate || 0),
          planned_qty: Number(rm.planned_qty || 1),
        })),
        items: formData.items.map((it) => ({
          _id: it._id,
          product_id: it.product_id || (it.item_type === 'manufacturing_service' ? formData.finished_product_id : undefined),
          raw_material_id: it.raw_material_id || undefined,
          item_type: it.item_type || 'product',
          description: it.description || it.product_name,
          ordered_qty: Number(it.ordered_qty),
          rate: Number(it.rate),
          discount_percent: Number(it.discount_percent || 0),
          gst_rate: Number(it.gst_rate !== undefined ? it.gst_rate : 18),
        })),
      };

      if (isEdit) {
        await ft.updateOrder(id, payload);
        setSuccess('Purchase Order updated successfully');
      } else {
        await ft.createOrder(payload);
        setSuccess('Purchase Order created successfully');
      }

      setTimeout(() => {
        navigate('/purchase-orders');
      }, 900);
    } catch (err) {
      setError(err.message || 'Failed to save purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const selectedSupplier = suppliers.find((s) => s._id === formData.supplier_id);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={formData.purchase_type === 'manufacturing' ? '/processing/orders' : '/purchase/orders'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />{' '}
              {formData.purchase_type === 'manufacturing' ? 'Back to Job Work Orders' : 'Back to Purchase Orders'}
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {isEdit
                  ? (formData.purchase_type === 'manufacturing' ? 'Edit Job Work Order' : 'Edit Purchase Order')
                  : (formData.purchase_type === 'manufacturing' ? 'Create Job Work Order (MPO)' : 'Create Purchase Order')}
              </h1>
              <p className="text-xs text-slate-500">
                {formData.purchase_type === 'manufacturing'
                  ? 'Assign raw materials to external contractor and schedule finished goods production'
                  : isEdit
                  ? `Editing ${formData.po_number || 'Purchase Order'} (Dedicated Full-Page Form)`
                  : 'Generate a new official Purchase Order for vendor procurement'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/purchase-orders"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving Order...' : isEdit ? 'Update Purchase Order' : 'Save & Issue PO'}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Order & Supplier Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Order & Supplier Information</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.is_interstate}
                    onChange={(e) => setFormData({ ...formData, is_interstate: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Interstate Transaction (IGST Only)</span>
                </label>
              </div>
            </div>

            {/* Purchase Type Selector (Hidden in Job Work as per user request) */}
            {formData.purchase_type !== 'manufacturing' && urlType !== 'manufacturing' && !urlType && (
              <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Purchase Order Workflow Type:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePurchaseTypeChange('standard')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      formData.purchase_type === 'standard'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Standard Products PO
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurchaseTypeChange('raw_material')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      formData.purchase_type === 'raw_material'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Type A: Raw Material Purchase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurchaseTypeChange('manufacturing')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      formData.purchase_type === 'manufacturing'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Type B: Manufacturing / Job Work</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600">PO Number</label>
                <input
                  type="text"
                  value={formData.po_number || nextPoNumber || 'Auto Generated (PO-YYYY-YY-XXXX)'}
                  readOnly={!isEdit}
                  onChange={(e) => isEdit && setFormData({ ...formData, po_number: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400">Financial Year atomic sequence format</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">PO Date *</label>
                <input
                  type="date"
                  required
                  value={formData.po_date}
                  onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Supplier / Vendor *</label>
                <select
                  required
                  value={formData.supplier_id}
                  onChange={handleSupplierChange}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Supplier...</option>
                  {(Array.isArray(suppliers) ? suppliers : []).map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplier_name || s.name} {s.gstin ? `(${s.gstin})` : ''}
                    </option>
                  ))}
                </select>
                {selectedSupplier && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    GSTIN: {selectedSupplier.gstin || 'Unregistered'} | {selectedSupplier.phone || ''}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Destination Warehouse *</label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={handleWarehouseChange}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Warehouse...</option>
                  {(Array.isArray(warehouses) ? warehouses : []).map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.warehouse_name || w.name} {w.warehouse_code ? `[${w.warehouse_code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Expected Delivery Date</label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Reference / Quotation No.</label>
                <input
                  type="text"
                  placeholder="e.g. RFQ-2026-0042"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Payment Terms</label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Immediate / Advance">Immediate / Advance</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 45 Days">Net 45 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Delivery Terms / Shipping</label>
                <select
                  value={formData.delivery_terms}
                  onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="FOB Destination">FOB Destination</option>
                  <option value="Ex-Works">Ex-Works</option>
                  <option value="Door Delivery">Door Delivery</option>
                  <option value="CIF Port">CIF Port</option>
                </select>
              </div>
            </div>

            {/* Addresses */}
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Supplier Billing Address</label>
                <textarea
                  rows={2}
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  placeholder="Supplier registered address..."
                  className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Shipping / Destination Address</label>
                <textarea
                  rows={2}
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  placeholder="Delivery warehouse full address..."
                  className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 1.5: Manufacturing Service & Raw Material Requirement (Prompt Section 3 & 9) */}
          {formData.purchase_type === 'manufacturing' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Manufacturing / Job Work Service & Material Allocation
                    </h3>
                    <p className="text-xs text-slate-500">
                      Company provides owned raw materials to external supplier. Supplier only charges a manufacturing service fee.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Job Work Service
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Finished Product to Manufacture *
                  </label>
                  <select
                    value={formData.finished_product_id}
                    onChange={(e) => handleManufacturingProductChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 outline-none focus:border-amber-500"
                  >
                    <option value="">Select Finished Product...</option>
                    {(Array.isArray(products) ? products : []).map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.product_name || p.name} {p.sku ? `(${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Target Finished Production Qty (PCS) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.manufacturing_qty}
                    onChange={(e) =>
                      handleManufacturingQtyRateChange(e.target.value, formData.manufacturing_rate)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Manufacturing Service Rate per Unit (₹/PCS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.manufacturing_rate}
                    onChange={(e) =>
                      handleManufacturingQtyRateChange(formData.manufacturing_qty, e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-amber-800 outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block font-mono">
                    Total Service Value: ₹{(Number(formData.manufacturing_qty || 0) * Number(formData.manufacturing_rate || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Required Raw Materials List */}
              <div className="border border-amber-200/80 rounded-xl bg-white p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>Company Raw Materials to Issue:</span>
                  </span>
                  <button
                    type="button"
                    onClick={addRawMaterialReqRow}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Material Requirement</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(formData.raw_materials_required || []).map((req, rIdx) => (
                    <div
                      key={rIdx}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                    >
                      <div className="md:col-span-6">
                        <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">
                          Raw Material #{rIdx + 1}
                        </label>
                        <select
                          value={req.raw_material_id}
                          onChange={(e) => handleRawMaterialReqChange(rIdx, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                        >
                          <option value="">Select Raw Material...</option>
                          {(Array.isArray(rawMaterials) ? rawMaterials : []).map((rm) => (
                            <option key={rm._id} value={rm._id}>
                              {rm.material_name} ({rm.material_code}) — In Wh: {rm.warehouse_stock} {rm.uom}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">
                          Planned Issue Qty ({req.uom || 'KG'})
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={req.planned_qty}
                          onChange={(e) => handleRawMaterialReqQty(rIdx, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold"
                        />
                      </div>

                      <div className="md:col-span-2 text-right">
                        <span className="text-[11px] text-slate-400 block">Est. Cost Rate</span>
                        <span className="font-mono font-bold text-slate-700">₹{req.cost_rate || 0}/{req.uom}</span>
                      </div>

                      <div className="md:col-span-1 text-center pt-3">
                        {formData.raw_materials_required.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRawMaterialReqRow(rIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Items Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Purchase Order Line Items</h2>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
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
                    <th className="w-28 px-3 py-3">SKU</th>
                    <th className="w-24 px-3 py-3 text-right">Ordered Qty</th>
                    {isEdit && <th className="w-20 px-3 py-3 text-right">Recv Qty</th>}
                    <th className="w-20 px-3 py-3">Unit</th>
                    <th className="w-28 px-3 py-3 text-right">Rate (₹)</th>
                    <th className="w-20 px-3 py-3 text-right">Disc %</th>
                    <th className="w-28 px-3 py-3 text-right">Taxable (₹)</th>
                    <th className="w-24 px-3 py-3 text-right">GST %</th>
                    <th className="w-28 px-3 py-3 text-right">Total (₹)</th>
                    <th className="w-12 px-2 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedItems.map((item, idx) => (
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
                          placeholder="Description / Specifications..."
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.sku || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.ordered_qty}
                          onChange={(e) => handleItemChange(idx, 'ordered_qty', e.target.value)}
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-right font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      {isEdit && (
                        <td className="px-3 py-3 text-right font-medium text-slate-500">
                          {item.received_qty || 0}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-center font-medium text-slate-700"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-right font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={item.discount_percent}
                          onChange={(e) => handleItemChange(idx, 'discount_percent', e.target.value)}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-right font-medium text-slate-700"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800">
                        ₹{item.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      <td className="px-3 py-3 text-right font-bold text-emerald-700">
                        ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                Total Products: <span className="font-bold text-slate-800">{formData.items.length}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Summary & Notes */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Terms & Remarks
              </h2>
              {isEdit && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Reason for Editing *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quantity revised upon vendor communication"
                    value={formData.edit_reason}
                    onChange={(e) => setFormData({ ...formData, edit_reason: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-amber-300 bg-amber-50/40 p-2 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600">Order Notes / Instructions</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions for supplier, delivery gate, batch numbers..."
                  className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent / Issued</option>
                  {isEdit && <option value="partially_received">Partially Received</option>}
                  {isEdit && <option value="received">Fully Received</option>}
                  {isEdit && <option value="completed">Completed</option>}
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Total Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Order Value Summary
              </h2>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal (Taxable Value):</span>
                <span className="font-semibold text-slate-800">
                  ₹{subtotalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {formData.is_interstate ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>IGST Total:</span>
                  <span className="font-semibold text-slate-800">
                    ₹{igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>CGST Total:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>SGST Total:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-xs text-slate-500">
                <span>Round Off:</span>
                <span className="font-mono">
                  {roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Grand Total (₹):</span>
                <span className="text-xl font-black text-emerald-700">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons at bottom */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              to="/purchase-orders"
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving...' : isEdit ? 'Update Purchase Order' : 'Save & Issue Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
