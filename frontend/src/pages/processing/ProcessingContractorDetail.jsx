import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Scissors,
  Plus,
  Send,
  Boxes,
  Layers,
  Receipt,
  Truck,
  CheckCircle,
  Clock,
  Edit2,
  AlertCircle,
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { rawMaterialApi, ft, St } from '../../services/procurementService';

export default function ProcessingContractorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [contractorData, setContractorData] = useState(null);
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'orders' | 'bills' | 'movements'

  // Issue Material Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');
  const [issueForm, setIssueForm] = useState({
    warehouse_id: '',
    raw_material_id: '',
    qty: '',
    remarks: '',
  });

  // Edit Contractor Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    if (!id) {
      navigate('/processing/contractors', { replace: true });
      return;
    }
    loadContractorOverview();
  }, [id]);

  const loadContractorOverview = async () => {
    try {
      setLoading(true);
      const res = await rawMaterialApi.getContractorOverview(id);
      if (res?.data) {
        setContractorData(res.data);
      }
    } catch (err) {
      console.error('Failed to load contractor overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLookupsForIssue = async () => {
    try {
      const [whRes, rmRes] = await Promise.all([
        St.getWarehouses(),
        rawMaterialApi.getRawMaterials({ limit: 100 }),
      ]);
      const whList = whRes?.data?.warehouses || whRes?.warehouses || (Array.isArray(whRes?.data) ? whRes.data : []);
      const rmList = Array.isArray(rmRes?.data) ? rmRes.data : [];
      setWarehouses(whList);
      setAvailableMaterials(rmList);
      if (whList.length > 0 && !issueForm.warehouse_id) {
        setIssueForm((prev) => ({ ...prev, warehouse_id: whList[0]._id }));
      }
      if (rmList.length > 0 && !issueForm.raw_material_id) {
        setIssueForm((prev) => ({ ...prev, raw_material_id: rmList[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenIssueModal = () => {
    setIssueError('');
    setIssueSuccess('');
    loadLookupsForIssue();
    setIsIssueModalOpen(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueForm.raw_material_id || !issueForm.qty || Number(issueForm.qty) <= 0) {
      setIssueError('Please select raw material and valid dispatch quantity');
      return;
    }
    try {
      setIssueSubmitting(true);
      setIssueError('');
      const selectedRm = availableMaterials.find((m) => m._id === issueForm.raw_material_id);
      await rawMaterialApi.issueMaterial({
        supplier_id: id,
        warehouse_id: issueForm.warehouse_id,
        items: [
          {
            raw_material_id: issueForm.raw_material_id,
            material_name: selectedRm?.material_name || 'Raw Material',
            qty: Number(issueForm.qty),
            uom: selectedRm?.uom || 'KG',
          },
        ],
        remarks: issueForm.remarks || `Dispatched to ${contractorData?.contractor?.supplier_name}`,
      });
      setIssueSuccess('Raw material successfully dispatched to contractor!');
      setTimeout(() => {
        setIsIssueModalOpen(false);
        setIssueForm({ warehouse_id: '', raw_material_id: '', qty: '', remarks: '' });
        loadContractorOverview();
      }, 700);
    } catch (err) {
      setIssueError(err.message || 'Failed to dispatch material');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!contractorData?.contractor) return;
    const c = contractorData.contractor;
    setEditFormData({
      supplier_name: c.supplier_name || '',
      contact_person: c.contact_person || '',
      email: c.email || '',
      mobile: c.mobile || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
      process_type: c.process_type || 'Stitching & Tailoring',
      payment_terms: c.payment_terms || 'Net 30 Days',
      address: {
        address_line1: c.address?.address_line1 || '',
        city: c.address?.city || '',
        state: c.address?.state || 'Gujarat',
        pincode: c.address?.pincode || '',
      },
      bank_details: {
        bank_name: c.bank_details?.bank_name || '',
        account_number: c.bank_details?.account_number || '',
        ifsc_code: c.bank_details?.ifsc_code || '',
        branch: c.bank_details?.branch || '',
      },
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setEditSaving(true);
      setEditError('');
      await ft.updateSupplier(id, editFormData);
      setIsEditModalOpen(false);
      loadContractorOverview();
    } catch (err) {
      setEditError(err.message || 'Failed to update contractor details');
    } finally {
      setEditSaving(false);
    }
  };

  if (loading || !contractorData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { contractor, materials_held = [], orders = [], invoices = [], movements = [], metrics = {} } = contractorData;

  // Columns for Materials Held
  const materialColumns = [
    {
      header: 'Raw Material',
      key: 'material_name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{row.material_name}</span>
          <span className="text-[10px] font-mono text-slate-400">{row.material_code}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      render: (val) => <span className="text-xs text-slate-600 capitalize">{val || 'Fabric'}</span>,
    },
    {
      header: 'Unit',
      key: 'uom',
      render: (val) => <span className="font-mono text-xs font-bold text-slate-600">{val || 'KG'}</span>,
    },
    {
      header: 'Currently Held at Workshop',
      key: 'current_stock',
      cellClassName: 'text-right font-mono font-bold text-sm',
      render: (val, row) => (
        <span className={val > 0 ? 'text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200' : 'text-slate-400'}>
          {Number(val || 0).toLocaleString('en-IN')} {row.uom}
        </span>
      ),
    },
    {
      header: 'Total Consumed in Production',
      key: 'consumed_stock',
      cellClassName: 'text-right font-mono text-xs text-slate-600',
      render: (val, row) => `${Number(val || 0).toLocaleString('en-IN')} ${row.uom}`,
    },
    {
      header: 'Returned to Warehouse',
      key: 'returned_stock',
      cellClassName: 'text-right font-mono text-xs text-emerald-700 font-semibold',
      render: (val, row) => `${Number(val || 0).toLocaleString('en-IN')} ${row.uom}`,
    },
    {
      header: 'Action',
      key: 'action',
      cellClassName: 'text-right',
      render: (_, row) => (
        <Link
          to={`/raw-materials/stock-ledger?material_id=${row.raw_material_id}&supplier_id=${id}`}
          className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1"
        >
          <span>Ledger</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  // Columns for Job Work Orders
  const orderColumns = [
    {
      header: 'Order #',
      key: 'po_number',
      render: (val, row) => (
        <div>
          <Link
            to={`/purchase/orders/${row._id}`}
            className="font-mono font-bold text-slate-900 text-xs hover:text-amber-700 hover:underline block"
          >
            {val}
          </Link>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {row.po_date ? new Date(row.po_date).toLocaleDateString('en-IN') : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Finished Product Target',
      key: 'finished_product_name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">
            {val || row.finished_product_id?.product_name || 'Manufactured Item'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Target: {row.manufacturing_qty || 100} PCS @ ₹{row.manufacturing_rate || 20}/PCS
          </span>
        </div>
      ),
    },
    {
      header: 'Production Progress',
      key: 'completed_qty',
      render: (val, row) => {
        const target = Number(row.manufacturing_qty) || 100;
        const completed = Number(val) || 0;
        const pct = Math.min(100, Math.round((completed / target) * 100));
        return (
          <div className="w-36 space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="font-bold text-slate-800">{completed} / {target} PCS</span>
              <span className="text-slate-500 font-semibold">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-200'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Service Order Value',
      key: 'grand_total',
      cellClassName: 'font-mono text-xs font-bold text-right',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Status',
      key: 'status',
      render: (val, row) => <StatusBadge status={val || row.status || 'pending'} />,
    },
    {
      header: 'Action',
      key: 'action',
      cellClassName: 'text-right',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/purchase/orders/${row._id}`)}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 transition"
        >
          View Order
        </button>
      ),
    },
  ];

  // Columns for Service Bills
  const invoiceColumns = [
    {
      header: 'Bill Number',
      key: 'invoice_number',
      render: (val, row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{val || row.invoice_number || 'Bill'}</span>
          <span className="text-[10px] text-slate-400">
            {row.bill_date || row.invoice_date || row.createdAt
              ? new Date(row.bill_date || row.invoice_date || row.createdAt).toLocaleDateString('en-IN')
              : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Order Reference',
      key: 'po_number',
      render: (val, row) => {
        const poRef =
          (typeof val === 'string' && val) ||
          row.po_id?.po_number ||
          (typeof row.po_id === 'string' ? row.po_id : null) ||
          'Direct Bill';
        return <span className="font-mono text-xs text-slate-600">{poRef}</span>;
      },
    },
    {
      header: 'Bill Amount',
      key: 'grand_total',
      cellClassName: 'font-mono text-xs font-bold text-right',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Paid Amount',
      key: 'paid_amount',
      cellClassName: 'font-mono text-xs text-emerald-700 font-semibold text-right',
      render: (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    },
    {
      header: 'Balance Due',
      key: 'balance_amount',
      cellClassName: 'font-mono text-xs font-bold text-right',
      render: (val, row) => {
        const bal = Number(val !== undefined ? val : (row.grand_total || 0) - (row.paid_amount || 0));
        return (
          <span className={bal > 0 ? 'text-rose-700' : 'text-slate-400'}>
            ₹{bal.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      header: 'Payment Status',
      key: 'payment_status',
      render: (val) => <StatusBadge status={val || 'unpaid'} />,
    },
  ];

  // Columns for Material Movements
  const movementColumns = [
    {
      header: 'Txn # & Date',
      key: 'transaction_number',
      render: (val, row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{val}</span>
          <span className="text-[10px] text-slate-400">
            {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Movement Type',
      key: 'transaction_type',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            val?.includes('Issue')
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : val?.includes('Consumption')
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {val}
        </span>
      ),
    },
    {
      header: 'Material Name',
      key: 'material_name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{val}</span>
          <span className="text-[10px] font-mono text-slate-400">{row.material_code}</span>
        </div>
      ),
    },
    {
      header: 'Quantity',
      key: 'qty_out',
      cellClassName: 'font-mono font-bold text-xs text-right',
      render: (val, row) => {
        const qty = row.qty_out || row.qty_in || row.consumed_qty || 0;
        return `${qty} ${row.uom || 'KG'}`;
      },
    },
    {
      header: 'Source ➔ Destination',
      key: 'destination_location',
      render: (val, row) => (
        <span className="text-xs text-slate-600">
          {row.source_location || 'Warehouse'} ➔ {val || 'Contractor'}
        </span>
      ),
    },
    {
      header: 'Remarks',
      key: 'remarks',
      render: (val) => <span className="text-xs text-slate-500 italic">{val || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/processing/contractors')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Back to Contractors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{contractor.supplier_name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                {contractor.supplier_code}
              </span>
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-900 border border-amber-200">
                <Scissors className="w-3.5 h-3.5 text-amber-600" />
                <span>{contractor.process_type || 'Job Work / Stitching Unit'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              External Job Work Contractor & Processing Partner Profile
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenIssueModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs transition"
          >
            <Send className="w-4 h-4 text-amber-700" />
            <span>Issue Raw Material</span>
          </button>
          <button
            onClick={() => navigate(`/purchase-orders/create?type=manufacturing&supplier_id=${id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Job Work Order</span>
          </button>
          <button
            onClick={handleOpenEditModal}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Edit Contractor"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Work Orders</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.total_orders || 0}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Manufacturing POs</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">In-Progress Orders</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{metrics.active_orders || 0}</p>
            <p className="text-[11px] text-amber-700/70 mt-0.5">Currently at Workshop</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Raw Materials Held</p>
            <p className="text-2xl font-extrabold text-blue-900 mt-1">{metrics.materials_held_count || 0}</p>
            <p className="text-[11px] text-blue-700/70 mt-0.5">Company Stock with Partner</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Service Balance Due</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              ₹{Number(metrics.pending_balance || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Payable to Contractor</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Contractor Details Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2 border-b pb-3">
          <Building className="w-4 h-4 text-amber-600" />
          <span>Workshop, Contact & Banking Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
          {/* Column 1: Contact Details */}
          <div className="space-y-2">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Contact Person</p>
            <p className="font-bold text-slate-800 text-sm">{contractor.contact_person || 'Managing Director'}</p>
            {contractor.mobile && (
              <a
                href={`tel:${contractor.mobile}`}
                className="flex items-center gap-1.5 text-slate-700 hover:text-amber-700 font-mono"
              >
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{contractor.mobile}</span>
              </a>
            )}
            {contractor.email && (
              <a
                href={`mailto:${contractor.email}`}
                className="flex items-center gap-1.5 text-slate-700 hover:text-amber-700"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{contractor.email}</span>
              </a>
            )}
          </div>

          {/* Column 2: Workshop Address */}
          <div className="space-y-2">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Workshop / Unit Location</p>
            <div className="flex items-start gap-1.5 text-slate-700 leading-relaxed">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                {contractor.address?.address_line1 || 'Primary Workshop Address'},{' '}
                {contractor.address?.city || 'Surat'}, {contractor.address?.state || 'Gujarat'} -{' '}
                {contractor.address?.pincode || '395002'}
              </span>
            </div>
          </div>

          {/* Column 3: Business & Tax */}
          <div className="space-y-2">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Tax & Payment Terms</p>
            <p className="text-slate-700">
              <span className="text-slate-400">GSTIN:</span>{' '}
              <span className="font-mono font-bold text-slate-900">{contractor.gstin || 'Unregistered'}</span>
            </p>
            <p className="text-slate-700">
              <span className="text-slate-400">PAN:</span>{' '}
              <span className="font-mono font-semibold">{contractor.pan || 'N/A'}</span>
            </p>
            <p className="text-slate-700">
              <span className="text-slate-400">Terms:</span>{' '}
              <span className="font-medium text-slate-800">{contractor.payment_terms || 'Net 30 Days'}</span>
            </p>
          </div>

          {/* Column 4: Bank Details */}
          <div className="space-y-2">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Bank Account Details</p>
            {contractor.bank_details?.bank_name ? (
              <div className="font-mono space-y-1">
                <p className="font-sans font-bold text-slate-800">{contractor.bank_details.bank_name}</p>
                <p className="text-slate-600">A/C: {contractor.bank_details.account_number || '—'}</p>
                <p className="text-slate-500 text-[11px]">IFSC: {contractor.bank_details.ifsc_code || '—'}</p>
              </div>
            ) : (
              <p className="text-slate-400 italic">No bank details recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
              activeTab === 'materials' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>1. Raw Materials Held</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
              {materials_held.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
              activeTab === 'orders' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-600" />
            <span>2. Job Work Orders (MPOs)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
              activeTab === 'bills' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>3. Service Bills</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center gap-2 ${
              activeTab === 'movements' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-indigo-600" />
            <span>4. Material Dispatch & Return Log</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
              {movements.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Raw Materials Held */}
        {activeTab === 'materials' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Company Materials Currently with Contractor</h4>
                <p className="text-xs text-slate-500">Live balance of raw materials dispatched to this workshop</p>
              </div>
              <button
                onClick={handleOpenIssueModal}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Additional Material</span>
              </button>
            </div>
            <DataTable
              columns={materialColumns}
              data={materials_held}
              emptyMessage="No raw materials currently held with this contractor."
            />
          </div>
        )}

        {/* Tab 2: Job Work Orders */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Manufacturing & Job Work Orders</h4>
                <p className="text-xs text-slate-500">Production orders assigned to this contractor</p>
              </div>
              <button
                onClick={() => navigate(`/purchase-orders/create?type=manufacturing&supplier_id=${id}`)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Job Work Order</span>
              </button>
            </div>
            <DataTable
              columns={orderColumns}
              data={orders}
              emptyMessage="No job work orders assigned to this contractor yet."
            />
          </div>
        )}

        {/* Tab 3: Service Bills */}
        {activeTab === 'bills' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Job Work Service Bills & Invoices</h4>
                <p className="text-xs text-slate-500">Labor/conversion charges billed by this contractor</p>
              </div>
              <button
                onClick={() => navigate(`/purchase-bills/create?type=manufacturing&supplier_id=${id}`)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Service Bill</span>
              </button>
            </div>
            <DataTable
              columns={invoiceColumns}
              data={invoices}
              emptyMessage="No service bills recorded for this contractor."
            />
          </div>
        )}

        {/* Tab 4: Dispatch & Return History */}
        {activeTab === 'movements' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">Material Movement Audit Log</h4>
              <p className="text-xs text-slate-500">Complete record of dispatches, consumption, and unused returns</p>
            </div>
            <DataTable
              columns={movementColumns}
              data={movements}
              emptyMessage="No material movements recorded for this contractor yet."
            />
          </div>
        )}
      </div>

      {/* ISSUE MATERIAL MODAL */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title={`Issue Raw Material to ${contractor.supplier_name}`}
        size="md"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
          {issueError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {issueError}
            </div>
          )}
          {issueSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              {issueSuccess}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Dispatching Warehouse *</label>
            <select
              required
              value={issueForm.warehouse_id}
              onChange={(e) => setIssueForm({ ...issueForm, warehouse_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg font-semibold bg-white"
            >
              <option value="">Select Warehouse...</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.warehouse_name} ({w.warehouse_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Raw Material *</label>
            <select
              required
              value={issueForm.raw_material_id}
              onChange={(e) => setIssueForm({ ...issueForm, raw_material_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg font-semibold bg-white"
            >
              <option value="">Select Raw Material...</option>
              {availableMaterials.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.material_name} ({m.material_code}) — Available in Wh: {m.warehouse_stock || 0} {m.uom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Dispatch Quantity *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="e.g. 50"
              value={issueForm.qty}
              onChange={(e) => setIssueForm({ ...issueForm, qty: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Gate Pass / Vehicle Remarks</label>
            <input
              type="text"
              placeholder="e.g. Dispatched via Tempo GJ-01-XX-1234"
              value={issueForm.remarks}
              onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(false)}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={issueSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {issueSubmitting ? 'Dispatching...' : 'Confirm Dispatch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT CONTRACTOR MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Contractor Information"
        size="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {editError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contractor / Unit Name *</label>
              <input
                type="text"
                required
                value={editFormData.supplier_name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, supplier_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Processing Process Type *</label>
              <select
                value={editFormData.process_type || 'Stitching & Tailoring'}
                onChange={(e) => setEditFormData({ ...editFormData, process_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg font-semibold bg-white"
              >
                <option value="Stitching & Tailoring">Stitching & Tailoring</option>
                <option value="Dyeing & Bleaching">Dyeing & Bleaching</option>
                <option value="Printing & Patterning">Printing & Patterning</option>
                <option value="Embroidery & Zari">Embroidery & Zari</option>
                <option value="Washing & Finishing">Washing & Finishing</option>
                <option value="Button & Eyelet Work">Button & Eyelet Work</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={editFormData.contact_person || ''}
                onChange={(e) => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile / Phone</label>
              <input
                type="text"
                value={editFormData.mobile || ''}
                onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Workshop Address</label>
              <input
                type="text"
                value={editFormData.address?.address_line1 || ''}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    address: { ...editFormData.address, address_line1: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={editFormData.address?.city || ''}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      address: { ...editFormData.address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={editFormData.address?.state || 'Gujarat'}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      address: { ...editFormData.address, state: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={editFormData.address?.pincode || ''}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      address: { ...editFormData.address, pincode: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
