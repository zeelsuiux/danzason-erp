import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  MessageSquareDiff,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Filter,
  Check,
  Tags,
  ChevronDown,
  Edit2,
  Share2,
  Copy,
  Send,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { ft } from '../../services/procurementService';

export default function InquiriesQuotations() {
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get('type');

  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Purchase Type Tabs: All | Raw Material | Finished (Exact Section 1 Structure)
  const [purchaseTypeTab, setPurchaseTypeTab] = useState(
    urlType === 'raw_material' ? 'raw_material' : (urlType === 'finished' ? 'finished' : 'all')
  );

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Quotation comparison modal
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [updatingQuote, setUpdatingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    supplier_id: '',
    status: 'accepted',
    quoted_price: '',
    quoted_delivery_date: '',
    quoted_remarks: '',
    accept_reason: '',
    reject_reason: '',
  });

  // PO Confirmation Modal State (Requirement 4: Accepted Supplier -> PO Confirmation Screen)
  const [isPoConfirmModalOpen, setIsPoConfirmModalOpen] = useState(false);
  const [poConfirmSupplier, setPoConfirmSupplier] = useState(null);
  const [awardingPo, setAwardingPo] = useState(false);
  const [poConfirmForm, setPoConfirmForm] = useState({
    supplier_id: '',
    expected_delivery_date: '',
    payment_terms: 'Net 30 Days',
    remarks: '',
    items: [],
  });

  // Requirement 2: Rejection Reason Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetQuotation, setRejectTargetQuotation] = useState(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState('Price higher than target / budget');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [sendRejectionMessage, setSendRejectionMessage] = useState(true);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Requirement 1: Purchase Message Dynamic Variables State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageTargetSupplier, setMessageTargetSupplier] = useState(null);
  const [messageTemplate, setMessageTemplate] = useState(
    'Dear {supplier_name},\n\nWe have a purchase requirement for {required_product}.\n\nSupplier Type: {supplier_type}\nContact Number: {supplier_mobile_number}\n\nPlease share your quotation, pricing, and availability.\n\nThank you.'
  );
  const [messageCopyStatus, setMessageCopyStatus] = useState(false);
  const [unresolvedError, setUnresolvedError] = useState('');

  // Dynamic variable resolver
  const resolvePurchaseMessageVariables = (template, supplier, inquiry) => {
    if (!template) return '';
    const sName = supplier?.supplier_name || supplier?.company_name || 'Valued Supplier';
    const sType = supplier?.supplier_type || supplier?.category || 'Vendor';
    const sMobile = supplier?.mobile || supplier?.phone || '';
    const reqProduct = inquiry?.items?.map((it) => `${it.item_name} (${it.quantity} ${it.uom || 'Nos'})`).join(', ') || 'Required Items';

    return template
      .replace(/{supplier_name}/g, sName)
      .replace(/{supplier_type}/g, sType)
      .replace(/{supplier_mobile_number}/g, sMobile || '[Mobile Not Provided]')
      .replace(/{required_product}/g, reqProduct);
  };

  const getRejectionMessageText = (supplier, inquiry, reason) => {
    const sName = supplier?.supplier_name || supplier?.company_name || 'Valued Supplier';
    const reqProduct = inquiry?.items?.map((it) => it.item_name).join(', ') || 'the requested goods';
    return `Dear ${sName},\n\nThank you for submitting your quotation for ${reqProduct}.\n\nAfter reviewing your quotation, we are unable to proceed at this time.\n\nReason: ${reason}\n\nWe appreciate your interest and look forward to future opportunities.\n\nThank you.`;
  };

  const insertVariableIntoMessage = (variableTag) => {
    setMessageTemplate((prev) => prev + ' ' + variableTag);
  };

  const handleOpenRejectModal = (sq) => {
    setRejectTargetQuotation(sq);
    setSelectedRejectReason('Price higher than target / budget');
    setCustomRejectReason('');
    setSendRejectionMessage(true);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetQuotation || !selectedInquiry) return;
    const finalReason = selectedRejectReason === 'Custom reason' ? customRejectReason.trim() : selectedRejectReason;
    if (!finalReason) {
      alert('Rejection reason is mandatory.');
      return;
    }

    try {
      setRejectSubmitting(true);
      const supplierObj = rejectTargetQuotation.supplier_id || {};
      const rejectionMessage = getRejectionMessageText(supplierObj, selectedInquiry, finalReason);

      await ft.updateSupplierQuotation(selectedInquiry._id, supplierObj._id || supplierObj.id, {
        status: 'rejected',
        reject_reason: finalReason,
        rejection_message: rejectionMessage,
        rejected_by_name: 'Authorized Purchaser',
        send_message: sendRejectionMessage,
      });

      if (sendRejectionMessage && supplierObj.mobile) {
        let cleanMobile = supplierObj.mobile.replace(/\D/g, '');
        if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;
        window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(rejectionMessage)}`, '_blank');
      }

      setIsRejectModalOpen(false);
      setRejectTargetQuotation(null);
      await loadInquiries();
      alert('Quotation rejection and message status saved to transaction history successfully.');
    } catch (err) {
      alert(err.message || 'Failed to reject quotation');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Create Form State
  const [categorySuppliers, setCategorySuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    inquiry_type: urlType || 'finished', // 'finished' | 'raw_material' | 'manufacturing'
    category_id: '',
    category_name: '',
    category_ids: [],
    category_names: [],
    expected_delivery_date: '',
    remarks: '',
    items: [
      { item_name: '', quantity: 1, uom: 'Nos', target_price: '', description: '' },
    ],
    selectedSuppliers: [],
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadInquiries();
  }, [search, statusFilter, categoryFilter]);

  const loadCategories = async () => {
    try {
      const res = await ft.getCategories();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const res = await ft.getInquiries({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        category_id: categoryFilter || undefined,
      });
      setInquiries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch suppliers whenever category selection changes
  const fetchSuppliersForCategories = async (catIds) => {
    try {
      setLoadingSuppliers(true);
      if (!catIds || catIds.length === 0) {
        // If no category selected, fetch all approved suppliers
        const res = await ft.getSuppliers({ limit: 100 });
        setCategorySuppliers(Array.isArray(res.data) ? res.data : []);
        return;
      }

      // Collect category identifiers (ObjectIds and codes)
      const selectedCats = categories.filter((c) => catIds.includes(c._id));
      const identifiers = [];
      for (const cat of selectedCats) {
        identifiers.push(cat._id);
        if (cat.code) identifiers.push(cat.code);
        if (cat.name) identifiers.push(cat.name);
      }

      const res = await ft.getSuppliers({
        categories: identifiers.join(','),
        limit: 100,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setCategorySuppliers(list);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleToggleCategory = (cat) => {
    const currentIds = createForm.category_ids || [];
    const isAlreadySelected = currentIds.includes(cat._id);
    const updatedIds = isAlreadySelected
      ? currentIds.filter((id) => id !== cat._id)
      : [...currentIds, cat._id];

    const updatedSelectedCats = categories.filter((c) => updatedIds.includes(c._id));
    const updatedNames = updatedSelectedCats.map((c) => c.name);

    setCreateForm((prev) => ({
      ...prev,
      category_ids: updatedIds,
      category_names: updatedNames,
      category_id: updatedIds[0] || '',
      category_name: updatedNames.join(', '),
    }));

    fetchSuppliersForCategories(updatedIds);
  };

  const handleSelectAllCategories = () => {
    const allIds = categories.map((c) => c._id);
    const allNames = categories.map((c) => c.name);
    setCreateForm((prev) => ({
      ...prev,
      category_ids: allIds,
      category_names: allNames,
      category_id: allIds[0] || '',
      category_name: allNames.join(', '),
    }));
    fetchSuppliersForCategories(allIds);
  };

  const handleClearCategories = () => {
    setCreateForm((prev) => ({
      ...prev,
      category_ids: [],
      category_names: [],
      category_id: '',
      category_name: '',
    }));
    fetchSuppliersForCategories([]);
  };

  const handleAddItemRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { item_name: '', quantity: 1, uom: 'Nos', target_price: '', description: '' },
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

  const handleItemChange = (index, field, value) => {
    const newItems = [...createForm.items];
    newItems[index][field] = value;
    setCreateForm({ ...createForm, items: newItems });
  };

  const handleToggleSupplier = (supplierId) => {
    setCreateForm((prev) => {
      const exists = prev.selectedSuppliers.includes(supplierId);
      return {
        ...prev,
        selectedSuppliers: exists
          ? prev.selectedSuppliers.filter((id) => id !== supplierId)
          : [...prev.selectedSuppliers, supplierId],
      };
    });
  };

  const handleOpenEdit = (inquiry) => {
    setEditingInquiry(inquiry);
    const selectedSuppliers = (inquiry.suppliers || []).map(
      (s) => s.supplier_id?._id || s.supplier_id
    );

    const catId = inquiry.category_id?._id || inquiry.category_id || '';
    const catName = inquiry.category_name || inquiry.category_id?.name || '';
    const catIds = catId ? [catId] : [];
    const catNames = catName ? [catName] : [];

    setCreateForm({
      title: inquiry.title || '',
      inquiry_type: inquiry.inquiry_type || 'finished',
      category_id: catId,
      category_name: catName,
      category_ids: catIds,
      category_names: catNames,
      expected_delivery_date: inquiry.expected_delivery_date
        ? new Date(inquiry.expected_delivery_date).toISOString().split('T')[0]
        : '',
      remarks: inquiry.remarks || '',
      items:
        Array.isArray(inquiry.items) && inquiry.items.length > 0
          ? inquiry.items.map((it) => ({
              item_name: it.item_name || '',
              quantity: it.quantity || 1,
              uom: it.uom || 'Nos',
              target_price: it.target_price || '',
              description: it.description || '',
            }))
          : [{ item_name: '', quantity: 1, uom: 'Nos', target_price: '', description: '' }],
      selectedSuppliers,
    });

    setView('edit');
    fetchSuppliersForCategories(catIds);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      alert('Please enter an Inquiry Title.');
      return;
    }
    if (createForm.items.some((item) => !item.item_name.trim())) {
      alert('All line items must have a valid item name.');
      return;
    }
    if (!createForm.selectedSuppliers || createForm.selectedSuppliers.length === 0) {
      alert('Please select at least 1 supplier to create the Inquiry/Quotation.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingInquiry) {
        await ft.updateInquiry(editingInquiry._id, createForm);
      } else {
        await ft.createInquiry(createForm);
      }
      setView('list');
      setEditingInquiry(null);
      loadInquiries();
    } catch (err) {
      alert(err.message || 'Failed to save inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const openQuoteModal = (inq) => {
    setSelectedInquiry(inq);
    setIsCompareModalOpen(true);
  };

  const handleUpdateQuotation = async (supplierQuotation) => {
    try {
      setUpdatingQuote(true);
      await ft.updateSupplierQuotationStatus(
        selectedInquiry._id,
        supplierQuotation.supplier_id?._id || supplierQuotation.supplier_id,
        quoteForm
      );
      // Reload
      const updated = await ft.getInquiryById(selectedInquiry._id);
      setSelectedInquiry(updated.data);
      loadInquiries();
      alert('Quotation updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update quotation');
    } finally {
      setUpdatingQuote(false);
    }
  };

  const handleOpenPoConfirm = (sq) => {
    const supplierId = sq.supplier_id?._id || sq.supplier_id;
    const initialItems = (selectedInquiry.items || []).map((it) => {
      const qQty = Number(it.quantity || 1);
      const qRate = Number(sq.quoted_price || it.target_price || 100);
      const gst = 5;
      const taxable = Math.round(qQty * qRate);
      const gstAmt = Math.round((taxable * gst) / 100);
      return {
        item_name: it.item_name || 'Material Item',
        description: it.description || it.item_name,
        uom: it.uom || 'Nos',
        quoted_qty: qQty,
        ordered_qty: qQty,
        quoted_rate: qRate,
        rate: qRate,
        gst_rate: gst,
        taxable_amount: taxable,
        gst_amount: gstAmt,
        total_amount: taxable + gstAmt,
      };
    });

    setPoConfirmSupplier(sq);
    setPoConfirmForm({
      supplier_id: supplierId,
      expected_delivery_date: sq.quoted_delivery_date
        ? new Date(sq.quoted_delivery_date).toISOString().split('T')[0]
        : (selectedInquiry.expected_delivery_date
            ? new Date(selectedInquiry.expected_delivery_date).toISOString().split('T')[0]
            : ''),
      payment_terms: 'Net 30 Days',
      remarks: sq.quoted_remarks ? `Supplier Quotation: ${sq.quoted_remarks}` : 'PO generated from Inquiry Quotation Award',
      items: initialItems,
    });
    setIsPoConfirmModalOpen(true);
  };

  const handlePoItemChange = (idx, field, val) => {
    const updated = [...poConfirmForm.items];
    updated[idx][field] = val;
    const qty = Number(updated[idx].ordered_qty || 0);
    const rate = Number(updated[idx].rate || 0);
    const gstRate = Number(updated[idx].gst_rate || 0);
    const taxable = Math.round(qty * rate);
    const gstAmt = Math.round((taxable * gstRate) / 100);
    updated[idx].taxable_amount = taxable;
    updated[idx].gst_amount = gstAmt;
    updated[idx].total_amount = taxable + gstAmt;
    setPoConfirmForm({ ...poConfirmForm, items: updated });
  };

  const calculatePoTotals = () => {
    let subtotal = 0;
    let gstTotal = 0;
    (poConfirmForm.items || []).forEach((it) => {
      subtotal += Number(it.taxable_amount || 0);
      gstTotal += Number(it.gst_amount || 0);
    });
    return { subtotal, gstTotal, grandTotal: subtotal + gstTotal };
  };

  const handlePoConfirmSubmit = async (e) => {
    e.preventDefault();
    try {
      setAwardingPo(true);
      const payload = {
        supplier_id: poConfirmForm.supplier_id,
        purchase_type:
          selectedInquiry.inquiry_type === 'raw_material'
            ? 'raw_material'
            : selectedInquiry.inquiry_type === 'manufacturing'
            ? 'manufacturing'
            : 'standard',
        expected_delivery_date: poConfirmForm.expected_delivery_date,
        payment_terms: poConfirmForm.payment_terms,
        remarks: poConfirmForm.remarks,
        confirmed_items: poConfirmForm.items.map((it) => ({
          description: it.item_name || it.description,
          ordered_qty: Number(it.ordered_qty || 1),
          rate: Number(it.rate || 0),
          gst_rate: Number(it.gst_rate || 5),
        })),
      };

      const res = await ft.awardQuotationAndGeneratePo(selectedInquiry._id, payload);
      setIsPoConfirmModalOpen(false);
      setIsCompareModalOpen(false);
      setSelectedInquiry(null);
      loadInquiries();
      alert(`🎉 Purchase Order Generated Successfully: ${res.data?.po_number || 'PO Created'}!\nAll competing supplier quotations have been automatically marked as REJECTED.`);
    } catch (err) {
      alert(err.message || 'Failed to award quotation and generate Purchase Order');
    } finally {
      setAwardingPo(false);
    }
  };

  const columns = [
    {
      header: 'Inquiry #',
      key: 'inquiry_number',
      cellClassName: 'font-mono font-semibold text-slate-900 text-sm',
    },
    {
      header: 'Title & Category',
      key: 'title',
      render: (val, row) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{val}</span>
            {row.inquiry_type === 'raw_material' ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Raw Material
              </span>
            ) : row.inquiry_type === 'manufacturing' ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Job Work
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Finished
              </span>
            )}
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            {row.category_name || 'General'}
          </span>
        </div>
      ),
    },
    {
      header: 'Items Count',
      key: 'items',
      render: (items) => (
        <span className="font-medium text-slate-700 text-xs">{items?.length || 0} line items</span>
      ),
    },
    {
      header: 'Invited Suppliers',
      key: 'suppliers',
      render: (sups) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          {sups?.length || 0} Vendors
        </span>
      ),
    },
    {
      header: 'Expected By',
      key: 'expected_delivery_date',
      render: (val) => (
        <span className="text-xs text-slate-600">
          {val ? new Date(val).toLocaleDateString('en-IN') : 'Flexible'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const nonMfgInquiries = inquiries.filter((q) => q.inquiry_type !== 'manufacturing');
  const rawMaterialInquiries = inquiries.filter((q) => q.inquiry_type === 'raw_material');
  const finishedInquiries = inquiries.filter(
    (q) => !q.inquiry_type || q.inquiry_type === 'finished' || q.inquiry_type === 'standard'
  );

  const tabScopedInquiries =
    purchaseTypeTab === 'all'
      ? nonMfgInquiries
      : purchaseTypeTab === 'raw_material'
      ? rawMaterialInquiries
      : finishedInquiries;

  const filteredInquiries = tabScopedInquiries.filter((inq) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const matchInq = inq.inquiry_number?.toLowerCase().includes(term);
    const matchTitle = inq.title?.toLowerCase().includes(term);
    const matchCat = inq.category_name?.toLowerCase().includes(term);
    const matchItems = inq.items?.some(
      (it) => it.item_name?.toLowerCase().includes(term) || it.description?.toLowerCase().includes(term)
    );
    const matchSuppliers = inq.suppliers?.some((s) => {
      const sup = s.supplier_id || {};
      return (
        sup.supplier_name?.toLowerCase().includes(term) ||
        sup.supplier_code?.toLowerCase().includes(term) ||
        sup.company_name?.toLowerCase().includes(term)
      );
    });
    return matchInq || matchTitle || matchCat || matchItems || matchSuppliers;
  });

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Supplier Quotations & Inquiries (RFQ)"
        subtitle="Manage supplier quotation requests, compare vendor price bids, and award orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Inquiries' },
        ]}
        actions={
          view === 'list' ? (
            <button
              onClick={() => {
                setEditingInquiry(null);
                setCreateForm({
                  title: '',
                  inquiry_type: urlType || 'finished',
                  category_id: '',
                  category_name: '',
                  category_ids: [],
                  category_names: [],
                  expected_delivery_date: '',
                  remarks: '',
                  items: [{ item_name: '', quantity: 1, uom: 'Nos', target_price: '', description: '' }],
                  selectedSuppliers: [],
                });
                setView('create');
                setCategorySearchQuery('');
                setSupplierSearchQuery('');
                fetchSuppliersForCategories([]);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-600 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              New Inquiry (RFQ)
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingInquiry(null);
                setView('list');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
          )
        }
      />

      {view === 'list' ? (
        <>
          {/* Tabs: All | Raw Material | Finished */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setPurchaseTypeTab('all')}
              className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                purchaseTypeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                purchaseTypeTab === 'all' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200/60 text-slate-500'
              }`}>
                {nonMfgInquiries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPurchaseTypeTab('raw_material')}
              className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                purchaseTypeTab === 'raw_material'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Raw Material</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                purchaseTypeTab === 'raw_material' ? 'bg-blue-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
              }`}>
                {rawMaterialInquiries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPurchaseTypeTab('finished')}
              className={`px-3.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                purchaseTypeTab === 'finished'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Finished</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                purchaseTypeTab === 'finished' ? 'bg-emerald-500/30 text-white' : 'bg-slate-200/60 text-slate-500'
              }`}>
                {finishedInquiries.length}
              </span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-72 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search RFQ by title or number..."
                className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-brand"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="awarded">Awarded</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={filteredInquiries}
            loading={loading}
            actions={(row) => (
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(row)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs inline-flex items-center gap-1 transition"
                  title="Edit Inquiry Details & Items"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => openQuoteModal(row)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-brand hover:bg-emerald-100 font-bold text-xs transition"
                >
                  Compare & Award
                </button>
              </div>
            )}
          />
        </>
      ) : (
        /* Create / Edit RFQ Form */
        <form onSubmit={handleCreateSubmit} className="space-y-6 w-full bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>{editingInquiry ? `Edit Inquiry / RFQ: ${editingInquiry.inquiry_number || ''}` : 'Create Request For Quotation (RFQ)'}</span>
            {editingInquiry && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-50 text-brand border border-emerald-200">
                Editing Mode
              </span>
            )}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Quotation Type: Finished Goods | Raw Material | Job Work */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">
                Quotation Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'finished',
                    label: 'Finished Product',
                    desc: 'Garments, t-shirts, ready-made products',
                  },
                  {
                    id: 'raw_material',
                    label: 'Raw Material',
                    desc: 'Fabrics, yarn, buttons, zippers, trims',
                  },
                  {
                    id: 'manufacturing',
                    label: 'Job Work / Processing',
                    desc: 'Cutting, stitching, printing, embroidery',
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, inquiry_type: t.id })}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      (createForm.inquiry_type || 'finished') === t.id
                        ? t.id === 'raw_material'
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                          : t.id === 'manufacturing'
                          ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="font-bold text-xs">{t.label}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">
                Inquiry Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Monthly Requirement of SS304 Extrusions & Springs"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            {/* Multiple Categories Selection & Search */}
            <div className="md:col-span-2 space-y-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block font-bold text-slate-800 text-sm">
                    Supplier Category / Classification
                  </label>
                  <p className="text-xs text-slate-500">
                    Filter and list suppliers by one or multiple categories (search or click chips below)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearCategories}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Category Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search categories (e.g. Fabric, Raw Materials, Hardware)..."
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none bg-white font-medium"
                />
              </div>

              {/* Category Chips Multi-Select */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {categories
                  .filter((cat) => {
                    if (!categorySearchQuery.trim()) return true;
                    const q = categorySearchQuery.toLowerCase();
                    return (
                      cat.name?.toLowerCase().includes(q) ||
                      (cat.code && cat.code.toLowerCase().includes(q))
                    );
                  })
                  .map((cat) => {
                    const isSelected = (createForm.category_ids || []).includes(cat._id);
                    return (
                      <button
                        type="button"
                        key={cat._id}
                        onClick={() => handleToggleCategory(cat)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                          isSelected
                            ? 'bg-brand text-white border-brand shadow-xs ring-1 ring-brand/30'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="font-bold">{isSelected ? '✓' : '+'}</span>
                        <span>{cat.name}</span>
                        {cat.code && (
                          <span
                            className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                              isSelected ? 'bg-emerald-800/40 text-emerald-100' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {cat.code}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              {createForm.category_ids && createForm.category_ids.length > 0 && (
                <div className="text-xs text-brand font-semibold pt-0.5 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {createForm.category_ids.length} category selected: {createForm.category_names.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Expected Delivery Date</label>
              <input
                type="date"
                value={createForm.expected_delivery_date}
                onChange={(e) =>
                  setCreateForm({ ...createForm, expected_delivery_date: e.target.value })
                }
                className="w-full sm:w-72 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">Remarks / Specifications</label>
              <textarea
                rows={2}
                value={createForm.remarks}
                onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                placeholder="Specific delivery notes, test certificates requirement, or instructions..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-brand outline-none resize-none"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Requested Line Items
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-sm font-bold text-brand hover:underline inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="p-3">Item Name</th>
                    <th className="p-3 w-28 text-center">Qty</th>
                    <th className="p-3 w-28 text-center">UOM</th>
                    <th className="p-3 w-36 text-right">Target Price (₹)</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {createForm.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          value={it.item_name}
                          onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                          placeholder="Item name / spec"
                          className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand font-medium"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand text-center font-bold font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={it.uom}
                          onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand font-medium"
                        >
                          <option value="Nos">Nos</option>
                          <option value="PCS">PCS</option>
                          <option value="KGS">KGS</option>
                          <option value="MTR">MTR</option>
                          <option value="BOX">BOX</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={it.target_price}
                          onChange={(e) => handleItemChange(idx, 'target_price', Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand font-mono text-right font-medium"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Specs / grade"
                          className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:border-brand"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        {createForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Suppliers Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <span>Select Suppliers to Invite</span>
                <span className="text-rose-500 font-bold text-base">*</span>
              </h4>
              <div className="flex items-center gap-2">
                {categorySuppliers.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const allSupIds = categorySuppliers.map((s) => s._id);
                        setCreateForm((prev) => ({
                          ...prev,
                          selectedSuppliers: allSupIds,
                        }));
                      }}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Select All ({categorySuppliers.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateForm((prev) => ({
                          ...prev,
                          selectedSuppliers: [],
                        }));
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Deselect All
                    </button>
                  </>
                )}
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full font-mono ml-1 ${
                    createForm.selectedSuppliers.length === 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-brand border border-emerald-200'
                  }`}
                >
                  {createForm.selectedSuppliers.length} Selected (Min 1 required)
                </span>
              </div>
            </div>

            {createForm.selectedSuppliers.length === 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Please select at least 1 supplier to create this RFQ/Quotation.
                </span>
              </div>
            )}

            {/* Supplier search input */}
            {categorySuppliers.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter suppliers by name, code or city..."
                  value={supplierSearchQuery}
                  onChange={(e) => setSupplierSearchQuery(e.target.value)}
                  className="w-full sm:w-80 pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none bg-white font-medium"
                />
              </div>
            )}

            {loadingSuppliers ? (
              <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                <span>Loading eligible suppliers...</span>
              </div>
            ) : categorySuppliers.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <p className="font-semibold text-slate-700">No suppliers found for the selected category.</p>
                <p className="text-xs text-slate-400">
                  Tip: Try selecting "Select All" or unchecking specific categories to view all registered vendors.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categorySuppliers
                  .filter((sup) => {
                    if (!supplierSearchQuery.trim()) return true;
                    const sq = supplierSearchQuery.toLowerCase();
                    return (
                      sup.supplier_name?.toLowerCase().includes(sq) ||
                      sup.supplier_code?.toLowerCase().includes(sq) ||
                      sup.address?.city?.toLowerCase().includes(sq)
                    );
                  })
                  .map((sup) => {
                    const isChecked = createForm.selectedSuppliers.includes(sup._id);
                    const catLabel =
                      sup.category_id?.name ||
                      (Array.isArray(sup.categories) && sup.categories[0]) ||
                      sup.category ||
                      'Vendor';
                    return (
                      <label
                        key={sup._id}
                        className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer text-sm transition select-none ${
                          isChecked
                            ? 'border-brand bg-emerald-50/50 shadow-xs ring-1 ring-brand/20'
                            : 'border-slate-200 hover:bg-slate-50 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSupplier(sup._id)}
                          className="mt-1 w-4 h-4 rounded text-brand focus:ring-brand"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm truncate">{sup.supplier_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 font-mono">{sup.supplier_code}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium capitalize truncate">
                              {catLabel}
                            </span>
                          </div>
                          {sup.address?.city && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{sup.address.city}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            )}
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
              disabled={submitting || createForm.selectedSuppliers.length === 0}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition flex items-center gap-2 ${
                createForm.selectedSuppliers.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-brand text-white hover:bg-brand-600 shadow-sm'
              }`}
              title={createForm.selectedSuppliers.length === 0 ? 'Selecting a supplier is required' : ''}
            >
              {submitting
                ? editingInquiry
                  ? 'Saving Changes...'
                  : 'Creating RFQ...'
                : editingInquiry
                ? 'Update Inquiry (RFQ)'
                : 'Issue RFQ to Suppliers'}
            </button>
          </div>
        </form>
      )}

      {/* Compare & Award Modal */}
      {selectedInquiry && (
        <Modal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          title={`Compare Quotations: ${selectedInquiry.inquiry_number}`}
          size="2xl"
        >
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-base">{selectedInquiry.title}</h4>
              <p className="text-slate-600 mt-1 text-sm">{selectedInquiry.remarks || 'No remarks provided'}</p>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                Supplier Responses ({selectedInquiry.suppliers?.length || 0})
              </h5>

              {(!selectedInquiry.suppliers || selectedInquiry.suppliers.length === 0) ? (
                <p className="text-slate-400 italic text-sm">No suppliers invited for this inquiry.</p>
              ) : (
                selectedInquiry.suppliers.map((sq, idx) => (
                  <div
                    key={sq._id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-base">
                          {sq.supplier_id?.supplier_name || 'Vendor'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {sq.supplier_id?.email || sq.supplier_id?.mobile}
                        </p>
                      </div>
                      <StatusBadge status={sq.status} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-xs text-slate-500 uppercase font-bold block">
                          Quoted Price
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-base">
                          ₹{Number(sq.quoted_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase font-bold block">
                          Quoted Date
                        </span>
                        <span className="text-slate-700 font-medium text-sm">
                          {sq.quoted_delivery_date
                            ? new Date(sq.quoted_delivery_date).toLocaleDateString('en-IN')
                            : 'Pending'}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-xs text-slate-500 uppercase font-bold block">
                          Remarks
                        </span>
                        <span className="text-slate-600 truncate block text-sm">
                          {sq.quoted_remarks || 'None'}
                        </span>
                      </div>

                      {sq.status === 'rejected' && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:col-span-2 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-900">Rejection Reason: {sq.reject_reason || 'Rejected by Purchaser'}</span>
                            {sq.rejection_message_status === 'sent' && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                Notice Sent
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-rose-700 flex items-center gap-2">
                            <span>Rejected by: {sq.rejected_by_name || 'Authorized Purchaser'}</span>
                            {sq.rejected_at && <span>• {new Date(sq.rejected_at).toLocaleString('en-IN')}</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Update / Award actions */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="number"
                          placeholder="Quoted ₹"
                          defaultValue={sq.quoted_price || ''}
                          onChange={(e) =>
                            setQuoteForm((prev) => ({ ...prev, quoted_price: e.target.value }))
                          }
                          className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono outline-none focus:border-brand"
                        />
                        <input
                          type="text"
                          placeholder="Reason / Note"
                          onChange={(e) =>
                            setQuoteForm((prev) => ({
                              ...prev,
                              accept_reason: e.target.value,
                              quoted_remarks: e.target.value,
                            }))
                          }
                          className="w-56 px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setMessageTargetSupplier(sq.supplier_id);
                            setIsMessageModalOpen(true);
                          }}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 text-xs font-bold"
                          title="Draft Purchase Message with Dynamic Variables"
                        >
                          <Send className="w-3.5 h-3.5 text-blue-600" />
                          <span>Message</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPoConfirm(sq)}
                          disabled={updatingQuote || sq.status === 'accepted'}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept & Award PO
                        </button>
                        {sq.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(sq)}
                            disabled={updatingQuote}
                            className="px-4 py-2 rounded-lg border border-rose-200 text-rose-700 font-semibold text-sm hover:bg-rose-50 transition"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* PO CONFIRMATION MODAL (Requirement 4: Accepted Supplier -> PO Confirmation Screen) */}
      {isPoConfirmModalOpen && poConfirmSupplier && selectedInquiry && (
        <Modal
          isOpen={isPoConfirmModalOpen}
          onClose={() => setIsPoConfirmModalOpen(false)}
          title={`Confirm Order & Generate PO: ${selectedInquiry.inquiry_number}`}
          size="2xl"
        >
          <form onSubmit={handlePoConfirmSubmit} className="space-y-4 text-xs font-sans text-slate-800">
            {/* Auto-rejection reminder alert */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Atomic Auto-Rejection Notice</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Confirming this order will award the contract to{' '}
                  <span className="font-bold underline">
                    {poConfirmSupplier.supplier_id?.supplier_name || 'Selected Vendor'}
                  </span>{' '}
                  and atomically mark all other competing quotations under Inquiry {selectedInquiry.inquiry_number} as <span className="font-bold text-rose-700">REJECTED</span>.
                </p>
              </div>
            </div>

            {/* Selected Supplier Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase block">Awarded Supplier</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {poConfirmSupplier.supplier_id?.supplier_name || 'Vendor'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {poConfirmSupplier.supplier_id?.supplier_code || 'CODE-N/A'}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase block">Contact & Location</span>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  {poConfirmSupplier.supplier_id?.mobile || poConfirmSupplier.supplier_id?.email || 'N/A'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {poConfirmSupplier.supplier_id?.address?.city || 'Central Hub'}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase block">GSTIN / Tax ID</span>
                <p className="font-mono text-xs font-semibold text-slate-800 mt-0.5">
                  {poConfirmSupplier.supplier_id?.gstin || 'Unregistered / Exempt'}
                </p>
              </div>
            </div>

            {/* Editable Order Line Items Table */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Products to be Ordered (Quoted vs. Confirmed)
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Review & edit quantities/rates before generating PO
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[620px]">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 w-20 text-center">Quoted Qty</th>
                      <th className="p-2.5 w-24 text-center">Confirm Qty</th>
                      <th className="p-2.5 w-24 text-right">Rate (₹)</th>
                      <th className="p-2.5 w-20 text-center">GST %</th>
                      <th className="p-2.5 w-28 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {poConfirmForm.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-900">{it.item_name}</td>
                        <td className="p-2.5 text-center font-mono text-slate-500">
                          {it.quoted_qty} {it.uom}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={it.ordered_qty}
                            onChange={(e) => handlePoItemChange(idx, 'ordered_qty', e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-center font-bold font-mono focus:border-brand outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.rate}
                            onChange={(e) => handlePoItemChange(idx, 'rate', e.target.value)}
                            className="w-24 px-2 py-1 border border-slate-200 rounded text-right font-mono font-bold focus:border-brand outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <select
                            value={it.gst_rate}
                            onChange={(e) => handlePoItemChange(idx, 'gst_rate', e.target.value)}
                            className="px-1.5 py-1 border border-slate-200 rounded text-xs font-semibold focus:border-brand outline-none bg-white"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          ₹{Number(it.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery Date & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Expected Delivery Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={poConfirmForm.expected_delivery_date}
                  onChange={(e) =>
                    setPoConfirmForm({ ...poConfirmForm, expected_delivery_date: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                <select
                  value={poConfirmForm.payment_terms}
                  onChange={(e) =>
                    setPoConfirmForm({ ...poConfirmForm, payment_terms: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none bg-white font-medium"
                >
                  <option value="Immediate / Advance">Immediate / Advance</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 45 Days">Net 45 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                  <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Order Notes / Terms</label>
              <textarea
                rows="2"
                value={poConfirmForm.remarks}
                onChange={(e) => setPoConfirmForm({ ...poConfirmForm, remarks: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-brand"
                placeholder="Optional notes or delivery instructions for supplier..."
              />
            </div>

            {/* Calculations Breakdown & Single-Click Confirm Button */}
            {(() => {
              const { subtotal, gstTotal, grandTotal } = calculatePoTotals();
              return (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 font-sans block text-[10px]">Taxable Subtotal:</span>
                      <span className="font-bold text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[10px]">GST Total:</span>
                      <span className="font-bold text-slate-800">₹{gstTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pl-3 border-l border-slate-200">
                      <span className="text-emerald-700 font-sans block text-[10px] font-bold">Grand Total:</span>
                      <span className="font-black text-emerald-700 text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPoConfirmModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={awardingPo}
                      className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold hover:bg-brand-600 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{awardingPo ? 'Generating Purchase Order...' : 'Confirm & Generate Purchase Order'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </form>
        </Modal>
      )}

      {/* REQUIREMENT 2: SUPPLIER REJECTION REASON MODAL */}
      {isRejectModalOpen && rejectTargetQuotation && selectedInquiry && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Supplier Quotation: ${rejectTargetQuotation.supplier_id?.supplier_name || 'Supplier'}`}
          size="md"
        >
          <div className="space-y-4 text-xs font-sans text-slate-800">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRejectReason}
                onChange={(e) => setSelectedRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-brand outline-none bg-white"
              >
                <option value="Price higher than target / budget">Price higher than target / budget</option>
                <option value="Delivery schedule / lead time too long">Delivery schedule / lead time too long</option>
                <option value="Quality / technical specifications mismatch">Quality / technical specifications mismatch</option>
                <option value="Alternative supplier quotation awarded">Alternative supplier quotation awarded</option>
                <option value="Payment terms not acceptable">Payment terms not acceptable</option>
                <option value="Custom reason">Custom reason (Enter details below)</option>
              </select>
            </div>

            {selectedRejectReason === 'Custom reason' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Specify Custom Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="Enter specific technical or commercial reason..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
                />
              </div>
            )}

            {/* Live Message Preview */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wide text-slate-600 block">
                Supplier Notification Message Preview
              </span>
              <p className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                {getRejectionMessageText(
                  rejectTargetQuotation.supplier_id,
                  selectedInquiry,
                  selectedRejectReason === 'Custom reason' ? customRejectReason || '[Reason]' : selectedRejectReason
                )}
              </p>
            </div>

            {/* Send Notice Toggle */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900">
              <input
                type="checkbox"
                id="sendNoticeCheck"
                checked={sendRejectionMessage}
                onChange={(e) => setSendRejectionMessage(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="sendNoticeCheck" className="text-xs font-semibold cursor-pointer">
                Deliver rejection notice to supplier mobile via WhatsApp ({rejectTargetQuotation.supplier_id?.mobile || 'No mobile'})
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectSubmitting}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition shadow-sm disabled:opacity-50"
              >
                {rejectSubmitting ? 'Recording Rejection...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* REQUIREMENT 1: PURCHASE MESSAGE WITH DYNAMIC VARIABLES MODAL */}
      {isMessageModalOpen && (
        <Modal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          title={`Draft Purchase Message: ${messageTargetSupplier?.supplier_name || 'Supplier'}`}
          size="lg"
        >
          <div className="space-y-4 text-xs font-sans text-slate-800">
            {/* Clickable Variable Chips */}
            <div>
              <span className="block font-bold text-slate-700 mb-1.5 text-xs">
                Available Dynamic Variables (Click to insert):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{supplier_name}', label: 'Supplier Name' },
                  { tag: '{supplier_type}', label: 'Supplier Type' },
                  { tag: '{required_product}', label: 'Required Product' },
                  { tag: '{supplier_mobile_number}', label: 'Supplier Mobile Number' },
                ].map((chip) => (
                  <button
                    key={chip.tag}
                    type="button"
                    onClick={() => insertVariableIntoMessage(chip.tag)}
                    className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-bold hover:bg-blue-100 transition shadow-2xs"
                    title={`Insert ${chip.tag}`}
                  >
                    + {chip.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Editor */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Message Template</label>
              <textarea
                rows={6}
                value={messageTemplate}
                onChange={(e) => {
                  setMessageTemplate(e.target.value);
                  setUnresolvedError('');
                }}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-sans leading-relaxed focus:border-brand outline-none resize-none bg-white"
              />
            </div>

            {/* Live Real-Value Preview */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wide text-slate-600 block">
                Live Preview (With Resolved Actual Values)
              </span>
              <div className="p-3 bg-white rounded-lg border border-slate-100 whitespace-pre-wrap text-slate-800 leading-relaxed text-xs">
                {resolvePurchaseMessageVariables(messageTemplate, messageTargetSupplier, selectedInquiry)}
              </div>
            </div>

            {/* Missing Info Warning & Unresolved Variable Validation */}
            {!messageTargetSupplier?.mobile && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Notice: Supplier mobile number is not registered in the directory.</span>
              </div>
            )}

            {unresolvedError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{unresolvedError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-mono">
                {messageTargetSupplier?.mobile ? `Mobile: ${messageTargetSupplier.mobile}` : 'No phone registered'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const resolved = resolvePurchaseMessageVariables(messageTemplate, messageTargetSupplier, selectedInquiry);
                    if (hasUnresolvedVariables(resolved)) {
                      setUnresolvedError('Cannot send message: Unresolved variables remain in the text.');
                      return;
                    }
                    navigator.clipboard.writeText(resolved);
                    setMessageCopyStatus(true);
                    setTimeout(() => setMessageCopyStatus(false), 2500);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{messageCopyStatus ? 'Copied!' : 'Copy Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const resolved = resolvePurchaseMessageVariables(messageTemplate, messageTargetSupplier, selectedInquiry);
                    if (hasUnresolvedVariables(resolved)) {
                      setUnresolvedError('Cannot send message: Unresolved variables remain in the text.');
                      return;
                    }
                    if (!messageTargetSupplier?.mobile) {
                      alert('Supplier does not have a registered mobile number for WhatsApp delivery.');
                      return;
                    }
                    let cleanMobile = messageTargetSupplier.mobile.replace(/\D/g, '');
                    if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;
                    window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(resolved)}`, '_blank');
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
