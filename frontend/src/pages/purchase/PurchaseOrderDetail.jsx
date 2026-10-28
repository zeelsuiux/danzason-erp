import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  PackageCheck,
  Building,
  Calendar,
  FileText,
  Printer,
  Edit2,
  Layers,
  Boxes,
  Truck,
  RotateCcw,
  CheckCircle,
  Clock,
  Plus,
  Send,
  CheckSquare,
  AlertCircle,
  X,
  History,
  Sparkles,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ConvertPoToGrnModal from './ConvertPoToGrnModal';
import EditPurchaseOrderModal from '../../components/common/EditPurchaseOrderModal';
import { ft, St, rawMaterialApi } from '../../services/procurementService';

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Active Tab for Manufacturing PO
  const [activeTab, setActiveTab] = useState('details');

  // Modal Action States
  const [activeModal, setActiveModal] = useState(null); // 'issue' | 'consume' | 'receive_fg' | 'return_req' | 'return_disp' | 'return_rec'
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [autoIssue, setAutoIssue] = useState(true);

  // Quick 1-Click Complete
  const handleQuickComplete = async () => {
    if (!window.confirm(`Complete Job Work Order ${order.po_number} in 1 click?\n\nThis will automatically:\n1. Issue all required raw materials from warehouse\n2. Record finished goods production\n3. Receive ${order.manufacturing_qty || 100} PCS into ${order.warehouse_id?.warehouse_name || 'Main Warehouse'}`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await rawMaterialApi.quickCompleteJobWork({ po_id: order._id });
      alert(res?.data?.message || res?.message || 'Job work order completed successfully!');
      loadOrder();
    } catch (err) {
      alert(`Error completing order: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Action Form States
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [actionFormData, setActionFormData] = useState({
    warehouse_id: '',
    items: [],
    completed_finished_qty: '',
    received_qty: '',
    rejected_qty: 0,
    requested_qty: '',
    dispatched_qty: '',
    accepted_received_qty: '',
    raw_material_id: '',
    remarks: '',
  });

  useEffect(() => {
    if (!id || id === 'new' || id === 'create') {
      navigate('/purchase/orders', { replace: true });
      return;
    }
    loadOrder();
    loadWarehouses();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await ft.getOrderById(id);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await St.getWarehouses();
      const whList =
        res?.data?.warehouses ||
        res?.warehouses ||
        (Array.isArray(res?.data) ? res.data : []);
      setWarehouses(Array.isArray(whList) ? whList : []);
    } catch (err) {
      console.error(err);
    }
  };

  const openIssueModal = () => {
    setModalError('');
    setModalSuccess('');
    const items = (order.raw_materials_required || []).map((rm) => ({
      raw_material_id: rm.raw_material_id?._id || rm.raw_material_id,
      material_name: rm.material_name,
      material_code: rm.material_code,
      uom: rm.uom,
      qty: Math.max(0, rm.planned_qty - (rm.issued_qty || 0)) || rm.planned_qty,
    }));
    setActionFormData({
      warehouse_id: order.warehouse_id?._id || warehouses[0]?._id || '',
      items,
      remarks: '',
    });
    setActiveModal('issue');
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      setModalError('');
      await rawMaterialApi.issueMaterial({
        po_id: order._id,
        warehouse_id: actionFormData.warehouse_id,
        items: actionFormData.items,
        remarks: actionFormData.remarks,
      });
      setModalSuccess('Raw Material issued successfully! Warehouse stock updated.');
      setTimeout(() => {
        setActiveModal(null);
        loadOrder();
      }, 700);
    } catch (err) {
      setModalError(err.message || 'Failed to issue raw material');
    } finally {
      setModalSubmitting(false);
    }
  };

  const openConsumeModal = () => {
    setModalError('');
    setModalSuccess('');
    const items = (order.raw_materials_required || []).map((rm) => ({
      raw_material_id: rm.raw_material_id?._id || rm.raw_material_id,
      material_name: rm.material_name,
      uom: rm.uom,
      consumed_qty: rm.pending_at_supplier_qty || rm.unused_qty || 1,
    }));
    setActionFormData({
      completed_finished_qty: Math.max(0, (order.manufacturing_qty || 100) - (order.completed_qty || 0)),
      items,
      remarks: '',
    });
    setActiveModal('consume');
  };

  const handleConsumeSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      setModalError('');
      await rawMaterialApi.recordConsumption({
        po_id: order._id,
        completed_finished_qty: Number(actionFormData.completed_finished_qty) || 0,
        items: actionFormData.items,
        auto_issue: autoIssue,
        remarks: actionFormData.remarks,
      });
      setModalSuccess('Production consumption recorded successfully!');
      setTimeout(() => {
        setActiveModal(null);
        loadOrder();
      }, 700);
    } catch (err) {
      setModalError(err.message || 'Failed to record consumption');
    } finally {
      setModalSubmitting(false);
    }
  };

  const openReceiveFgModal = () => {
    setModalError('');
    setModalSuccess('');
    const pendingToReceive = Math.max(
      0,
      (order.completed_qty || order.manufacturing_qty || 100) - (order.received_qty || 0)
    );
    setActionFormData({
      warehouse_id: order.warehouse_id?._id || warehouses[0]?._id || '',
      received_qty: pendingToReceive,
      rejected_qty: 0,
      remarks: '',
    });
    setActiveModal('receive_fg');
  };

  const handleReceiveFgSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      setModalError('');
      await rawMaterialApi.receiveFinishedGoods({
        po_id: order._id,
        warehouse_id: actionFormData.warehouse_id,
        received_qty: Number(actionFormData.received_qty),
        rejected_qty: Number(actionFormData.rejected_qty) || 0,
        remarks: actionFormData.remarks,
      });
      setModalSuccess('Finished products received into warehouse stock successfully!');
      setTimeout(() => {
        setActiveModal(null);
        loadOrder();
      }, 700);
    } catch (err) {
      setModalError(err.message || 'Failed to receive finished goods');
    } finally {
      setModalSubmitting(false);
    }
  };

  const openReturnReqModal = (rm) => {
    setModalError('');
    setModalSuccess('');
    const available = rm ? (rm.pending_at_supplier_qty || rm.unused_qty || 0) : 0;
    setActionFormData({
      raw_material_id: rm ? (rm.raw_material_id?._id || rm.raw_material_id) : '',
      requested_qty: available,
      remarks: '',
    });
    setActiveModal('return_req');
  };

  const handleReturnReqSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      setModalError('');
      await rawMaterialApi.requestReturn({
        po_id: order._id,
        raw_material_id: actionFormData.raw_material_id,
        requested_qty: Number(actionFormData.requested_qty),
        remarks: actionFormData.remarks,
      });
      setModalSuccess('Return request submitted! Material is marked as Return Requested.');
      setTimeout(() => {
        setActiveModal(null);
        loadOrder();
      }, 700);
    } catch (err) {
      setModalError(err.message || 'Failed to request material return');
    } finally {
      setModalSubmitting(false);
    }
  };

  const openReturnDispModal = (ret) => {
    setSelectedReturn(ret);
    setModalError('');
    setModalSuccess('');
    setActionFormData({
      dispatched_qty: ret.requested_qty || 0,
      remarks: '',
    });
    setActiveModal('return_disp');
  };

  const handleReturnDispSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      setModalError('');
      await rawMaterialApi.dispatchReturn({
        po_id: order._id,
        return_id: selectedReturn._id,
        dispatched_qty: Number(actionFormData.dispatched_qty),
        remarks: actionFormData.remarks,
      });
      setModalSuccess('Return dispatched! Material is now In-Transit.');
      setTimeout(() => {
        setActiveModal(null);
        loadOrder();
      }, 700);
    } catch (err) {
      setModalError(err.message || 'Failed to dispatch material return');
    } finally {
      setModalSubmitting(false);
    }
  };

  const openReturnRecModal = (ret) => {
    setSelectedReturn(ret);
    setModalError('');
    setModalSuccess('');
    setActionFormData({
      warehouse_id: order.warehouse_id?._id || warehouses[0]?._id || '',
      accepted_received_qty: ret.dispatched_qty || ret.requested_qty || 0,
      remarks: '',
    });
    setActiveModal('return_rec');
  };

  const handleReturnRecSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      setModalError('');
      await rawMaterialApi.receiveReturn({
        po_id: order._id,
        return_id: selectedReturn._id,
        warehouse_id: actionFormData.warehouse_id,
        accepted_received_qty: Number(actionFormData.accepted_received_qty),
        remarks: actionFormData.remarks,
      });
      setModalSuccess('Return accepted and received! Stock added back to warehouse.');
      setTimeout(() => {
        setActiveModal(null);
        loadOrder();
      }, 700);
    } catch (err) {
      setModalError(err.message || 'Failed to receive material return');
    } finally {
      setModalSubmitting(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isManufacturing = order.purchase_type === 'manufacturing';

  return (
    <div className="space-y-6 w-full pb-16">
      <PageHeader
        title={`${isManufacturing ? 'Manufacturing PO' : 'Purchase Order'}: ${order.po_number}`}
        subtitle={`Issued on ${new Date(order.po_date).toLocaleDateString('en-IN')}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Purchase', href: '/purchase' },
          { label: 'Orders', href: '/purchase/orders' },
          { label: order.po_number },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/purchase/orders')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                onClick={() => navigate(`/purchase-orders/edit/${order._id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
                title="Edit Purchase Order"
              >
                <Edit2 className="w-4 h-4 text-slate-500" />
                Edit PO
              </button>
            )}
            {!isManufacturing && order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                onClick={() => setIsConvertOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-600 text-white shadow-sm transition"
              >
                <PackageCheck className="w-4 h-4" />
                Convert to GRN
              </button>
            )}
            {isManufacturing && (
              <button
                onClick={() => navigate(`/purchase-bills/create?po_id=${order._id}`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                <FileText className="w-4 h-4" />
                Create Service Bill
              </button>
            )}
          </div>
        }
      />

      {/* Meta Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow Type</p>
          <div className="mt-2">
            {isManufacturing ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Manufacturing / Job Work (Type B)
              </span>
            ) : order.purchase_type === 'raw_material' ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                Raw Material Purchase (Type A)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                Standard Products PO
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isManufacturing ? 'Job-Work Supplier' : 'Supplier'}
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-brand shrink-0" />
            <span>{order.supplier_id?.supplier_name || 'Vendor'}</span>
          </p>
          {order.supplier_id?.gstin && (
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">GST: {order.supplier_id?.gstin}</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Warehouse</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {order.warehouse_id?.warehouse_name || 'Central'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{order.payment_terms || 'Net 30 Days'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isManufacturing ? 'Service Order Total' : 'PO Grand Total'}
          </p>
          <p className="text-xl font-bold text-brand mt-1 font-mono">
            ₹{Number(order.grand_total || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* MANUFACTURING JOB WORK DEDICATED TABS */}
      {isManufacturing ? (
        <div className="space-y-4">
          {/* VISUAL INTERACTIVE WORKFLOW STEPPER */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-indigo-900/60 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 font-mono">
                  Job Work Pipeline • Step-by-Step Workflow
                </span>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
                  <span>{order.finished_product_name || order.finished_product_id?.product_name || 'Finished Product'}</span>
                  <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    Target: {order.manufacturing_qty || 100} PCS
                  </span>
                </h3>
              </div>

              {/* Quick 1-Click Complete Button */}
              {!((order.finished_goods_receipts || []).length > 0 || (order.received_qty || 0) >= (order.manufacturing_qty || 1)) && (
                <button
                  type="button"
                  onClick={handleQuickComplete}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>⚡ 1-Click Quick Complete</span>
                </button>
              )}
            </div>

            {/* Stepper Flow Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Step 1 */}
              <div
                onClick={() => { setActiveTab('issue'); openIssueModal(); }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  (order.material_issues || []).length > 0
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-white/5 border-white/10 hover:border-amber-400/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Step 1</span>
                  {(order.material_issues || []).length > 0 ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Done
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded-full">
                      Next Action
                    </span>
                  )}
                </div>
                <p className="font-bold text-white text-xs mt-1.5">1. Raw Material Issue</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Issue Raw Material to Contractor</p>
              </div>

              {/* Step 2 */}
              <div
                onClick={() => { setActiveTab('consumption'); openConsumeModal(); }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  (order.production_consumptions || []).length > 0 || (order.completed_qty || 0) >= (order.manufacturing_qty || 1)
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : (order.material_issues || []).length > 0
                    ? 'bg-white/5 border-amber-400/40 hover:border-amber-400 text-slate-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Step 2</span>
                  {(order.production_consumptions || []).length > 0 || (order.completed_qty || 0) >= (order.manufacturing_qty || 1) ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Done
                    </span>
                  ) : (order.material_issues || []).length > 0 ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded-full">
                      Pending
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">Waiting Step 1</span>
                  )}
                </div>
                <p className="font-bold text-white text-xs mt-1.5">2. Record Consumption</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Log Production & Consumption</p>
              </div>

              {/* Step 3 */}
              <div
                onClick={() => { setActiveTab('receipt'); openReceiveFgModal(); }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  (order.finished_goods_receipts || []).length > 0 || (order.received_qty || 0) >= (order.manufacturing_qty || 1)
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : (order.production_consumptions || []).length > 0
                    ? 'bg-white/5 border-amber-400/40 hover:border-amber-400 text-slate-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Step 3</span>
                  {(order.finished_goods_receipts || []).length > 0 || (order.received_qty || 0) >= (order.manufacturing_qty || 1) ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Done
                    </span>
                  ) : (order.production_consumptions || []).length > 0 ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded-full">
                      Pending
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">Waiting Step 2</span>
                  )}
                </div>
                <p className="font-bold text-white text-xs mt-1.5">3. Receive Finished Goods</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Receive Finished Goods into Warehouse</p>
              </div>

              {/* Step 4 */}
              <div
                onClick={() => navigate(`/purchase-bills/create?type=manufacturing&po_id=${order._id}`)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  (order.invoices || []).length > 0
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-white/5 border-white/10 hover:border-indigo-400 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Step 4</span>
                  {(order.invoices || []).length > 0 ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Done
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.2 rounded-full">
                      Generate Bill
                    </span>
                  )}
                </div>
                <p className="font-bold text-white text-xs mt-1.5">4. Job Work Bill</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Contractor Service Bill</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-3.5 py-2 rounded-lg transition shrink-0 ${
                activeTab === 'details' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Order Details & Allocation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('issue')}
              className={`px-3.5 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'issue' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>2. Raw Material Issue</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-white/20">
                {(order.material_issues || []).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('consumption')}
              className={`px-3.5 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'consumption' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>3. Production / Consumption</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-white/20">
                {(order.production_consumptions || []).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receipt')}
              className={`px-3.5 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'receipt' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>4. Finished Goods Receipt</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-white/20">
                {(order.finished_goods_receipts || []).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('returns')}
              className={`px-3.5 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'returns' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>5. Unused Material Return Tracking</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-white/20">
                {(order.material_returns || []).length}
              </span>
            </button>
          </div>

          {/* TAB 1: ORDER DETAILS & MATERIAL SUMMARY */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Finished Product & Service Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>Finished Product Target & Manufacturing Service Charge</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    Rate: ₹{order.manufacturing_rate || 20} / PCS
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-sans block">Finished Product:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {order.finished_product_name || order.finished_product_id?.product_name || 'Finished Product'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-sans block">Ordered Production Qty:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {order.manufacturing_qty || 100} PCS
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <span className="text-emerald-700 font-sans block">Completed in Production:</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {order.completed_qty || 0} PCS
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-700 font-sans block">Received into Warehouse:</span>
                    <span className="font-bold text-blue-800 text-sm">
                      {order.received_qty || 0} PCS
                    </span>
                  </div>
                </div>
              </div>

              {/* Company Raw Materials Required & Tracking Summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>Company-Owned Raw Materials Tracking</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Live tracking of raw material issued, actually consumed, unused balance at supplier, and returns.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openIssueModal}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Issue Material</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Raw Material</th>
                        <th className="p-3 text-center">UOM</th>
                        <th className="p-3 text-right">Planned Qty</th>
                        <th className="p-3 text-right bg-amber-50/50">Issued to Supplier</th>
                        <th className="p-3 text-right bg-rose-50/50">Actual Consumed</th>
                        <th className="p-3 text-right bg-amber-100/50 font-bold">Unused at Supplier</th>
                        <th className="p-3 text-right bg-emerald-50/50">Returned to Warehouse</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(order.raw_materials_required || []).map((rm, idx) => {
                        const unused = Math.max(
                          0,
                          (rm.issued_qty || 0) - (rm.consumed_qty || 0) - (rm.returned_qty || 0)
                        );
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="p-3 font-medium text-slate-900">
                              <div className="font-bold">{rm.material_name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{rm.material_code}</div>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-600">{rm.uom}</td>
                            <td className="p-3 text-right font-mono font-semibold text-slate-700">
                              {rm.planned_qty}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-amber-700 bg-amber-50/30">
                              {rm.issued_qty || 0}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-rose-700 bg-rose-50/30">
                              {rm.consumed_qty || 0}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-amber-900 bg-amber-100/30 text-sm">
                              {unused} {rm.uom}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                              {rm.returned_qty || 0}
                            </td>
                            <td className="p-3 text-center">
                              {unused > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => openReturnReqModal(rm)}
                                  className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-[10px] font-bold"
                                >
                                  Request Return
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-mono">Fully Settled</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RAW MATERIAL ISSUE */}
          {activeTab === 'issue' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-600" />
                    <span>Raw Material Issue History</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tracks dispatch of materials from company warehouse to the manufacturing facility.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openIssueModal}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Issue Additional Material</span>
                </button>
              </div>

              {(order.material_issues || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                  No materials have been issued yet. Click "Issue Material" to dispatch raw materials to {order.supplier_id?.supplier_name}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Issue Number</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Dispatch Warehouse</th>
                        <th className="p-3">Items Issued</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {order.material_issues.map((iss, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-3 font-bold text-slate-900">{iss.issue_number}</td>
                          <td className="p-3 text-slate-600">{new Date(iss.date).toLocaleDateString('en-IN')}</td>
                          <td className="p-3 font-sans font-semibold text-slate-800">{iss.warehouse_name || 'Warehouse'}</td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {iss.items.map((it, j) => (
                                <span key={j} className="inline-block bg-amber-50 text-amber-800 px-2 py-0.5 rounded mr-1">
                                  {it.material_name}: {it.qty} {it.uom}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 font-sans text-slate-500">{iss.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRODUCTION CONSUMPTION */}
          {activeTab === 'consumption' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>Production Completion & Actual Consumption Log</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Records actual raw material utilized during manufacturing by the supplier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openConsumeModal}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Production Consumption</span>
                </button>
              </div>

              {(order.production_consumptions || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                  No production consumption recorded yet. Click "Record Production Consumption" once supplier completes production.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Consumption #</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-center">Completed Goods Qty</th>
                        <th className="p-3">Raw Materials Consumed</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {order.production_consumptions.map((cons, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-3 font-bold text-slate-900">{cons.consumption_number}</td>
                          <td className="p-3 text-slate-600">{new Date(cons.date).toLocaleDateString('en-IN')}</td>
                          <td className="p-3 text-center font-bold text-emerald-700 text-sm">
                            +{cons.completed_finished_qty} PCS
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {cons.items.map((it, j) => (
                                <span key={j} className="inline-block bg-rose-50 text-rose-800 px-2 py-0.5 rounded mr-1">
                                  {it.material_name}: {it.consumed_qty} {it.uom}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 font-sans text-slate-500">{cons.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FINISHED GOODS RECEIPT */}
          {activeTab === 'receipt' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>Finished Goods Receipt Log</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Physical acceptance of completed finished goods into warehouse inventory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openReceiveFgModal}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Receive Finished Goods</span>
                </button>
              </div>

              {(order.finished_goods_receipts || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                  No finished products have been physically received yet. Click "Receive Finished Goods" when completed products arrive at the warehouse.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Receipt Number</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Receiving Warehouse</th>
                        <th className="p-3 text-right">Received Qty</th>
                        <th className="p-3 text-right">Rejected Qty</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {order.finished_goods_receipts.map((fgr, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-3 font-bold text-slate-900">{fgr.receipt_number}</td>
                          <td className="p-3 text-slate-600">{new Date(fgr.date).toLocaleDateString('en-IN')}</td>
                          <td className="p-3 font-sans font-semibold text-slate-800">{fgr.warehouse_name}</td>
                          <td className="p-3 text-right font-bold text-emerald-700 text-sm">
                            +{fgr.received_qty} PCS
                          </td>
                          <td className="p-3 text-right text-rose-600 font-semibold">{fgr.rejected_qty || 0}</td>
                          <td className="p-3 font-sans text-slate-500">{fgr.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: UNUSED RAW MATERIAL RETURN TRACKING (Prompt Section 4) */}
          {activeTab === 'returns' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Unused Raw Material Return Tracking</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track material remaining with supplier &rarr; Return Requested &rarr; In-Transit &rarr; Accepted in Warehouse.
                  </p>
                </div>
              </div>

              {(order.material_returns || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                  No material returns requested yet. Once production is completed, any unused raw material can be returned from Tab 1.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[800px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Return #</th>
                        <th className="p-3">Raw Material</th>
                        <th className="p-3 text-right">Requested Qty</th>
                        <th className="p-3 text-right">Dispatched Qty</th>
                        <th className="p-3 text-right">Received in Wh</th>
                        <th className="p-3 text-center">Current Lifecycle Status</th>
                        <th className="p-3 text-center">Next Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.material_returns.map((ret, i) => {
                        let statusColor = 'bg-slate-100 text-slate-700';
                        if (ret.status === 'return_requested') statusColor = 'bg-amber-100 text-amber-800 border-amber-300';
                        if (ret.status === 'in_transit') statusColor = 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse';
                        if (ret.status === 'received') statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';

                        return (
                          <tr key={i} className="hover:bg-slate-50/60 font-mono">
                            <td className="p-3 font-bold text-slate-900">{ret.return_number}</td>
                            <td className="p-3 font-sans font-semibold text-slate-800">{ret.material_name}</td>
                            <td className="p-3 text-right font-bold text-slate-700">
                              {ret.requested_qty} {ret.uom}
                            </td>
                            <td className="p-3 text-right font-bold text-blue-700">
                              {ret.dispatched_qty || 0} {ret.uom}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-700">
                              {ret.received_qty || 0} {ret.uom}
                            </td>
                            <td className="p-3 text-center font-sans">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                                {ret.status === 'return_requested' && 'Return Requested'}
                                {ret.status === 'in_transit' && 'In Transit (On the Way)'}
                                {ret.status === 'received' && 'Received in Warehouse'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-sans">
                              {ret.status === 'return_requested' && (
                                <button
                                  type="button"
                                  onClick={() => openReturnDispModal(ret)}
                                  className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition inline-flex items-center gap-1"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Mark Dispatched</span>
                                </button>
                              )}
                              {ret.status === 'in_transit' && (
                                <button
                                  type="button"
                                  onClick={() => openReturnRecModal(ret)}
                                  className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition inline-flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Accept & Receive in Wh</span>
                                </button>
                              )}
                              {ret.status === 'received' && (
                                <span className="text-emerald-700 text-xs font-bold flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> Received
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD PURCHASE ORDER ITEMS TABLE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">PO Line Items & Receipt Progress</h2>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
              Supports Partial GRN Inward Receipts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-3 text-center w-24">Ordered</th>
                  <th className="py-3 px-3 text-center w-24">Received</th>
                  <th className="py-3 px-3 text-center w-24">Pending</th>
                  <th className="py-3 px-3 text-right w-28">Unit Rate</th>
                  <th className="py-3 px-4 text-right w-32">Taxable</th>
                  <th className="py-3 px-4 text-right w-36">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {order.items?.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <p className="font-semibold text-slate-900 text-sm">
                        {it.product_id?.product_name || it.description}
                      </p>
                      {it.product_id?.product_code && (
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {it.product_id.product_code}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-900 font-mono text-base">
                      {it.ordered_qty}
                    </td>
                    <td className="py-3.5 px-3 text-center text-emerald-700 font-bold font-mono text-base">
                      {it.received_qty || 0}
                    </td>
                    <td className="py-3.5 px-3 text-center text-rose-600 font-bold font-mono text-base">
                      {it.pending_qty || 0}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-700 font-semibold">
                      ₹{it.rate}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-800 font-semibold">
                      ₹{Number(it.taxable_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-base">
                      ₹{Number(it.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="p-5 bg-slate-50/70 border-t border-slate-200 flex justify-end">
            <div className="w-80 space-y-2.5 text-sm font-mono">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Taxable Subtotal:</span>
                <span className="font-bold text-slate-800">
                  ₹{Number(order.taxable_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              {order.is_interstate ? (
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">IGST:</span>
                  <span className="font-bold text-slate-800">
                    ₹{Number(order.igst_total || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">CGST:</span>
                    <span className="font-bold text-slate-800">
                      ₹{Number(order.cgst_total || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">SGST:</span>
                    <span className="font-bold text-slate-800">
                      ₹{Number(order.sgst_total || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              )}
              {order.round_off !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span className="font-sans">Round Off:</span>
                  <span>₹{Number(order.round_off || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-sm">
                <span className="font-sans">Grand Total:</span>
                <span className="text-brand font-bold text-base">
                  ₹{Number(order.grand_total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MANUFACTURING ACTION MODALS */}
      {/* ========================================================= */}

      {/* 1. ISSUE RAW MATERIAL MODAL */}
      {activeModal === 'issue' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600" />
                <span>Issue Raw Material to {order.supplier_id?.supplier_name}</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{modalError}</div>}
            {modalSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold">{modalSuccess}</div>}

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dispatching Warehouse *</label>
                <select
                  required
                  value={actionFormData.warehouse_id}
                  onChange={(e) => setActionFormData({ ...actionFormData, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.warehouse_name} ({w.warehouse_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Materials & Quantities to Dispatch:</label>
                {actionFormData.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 border rounded-lg">
                    <span className="font-semibold text-slate-800">{it.material_name}</span>
                    <div className="flex items-center gap-1.5 w-32">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={it.qty}
                        onChange={(e) => {
                          const updated = [...actionFormData.items];
                          updated[idx].qty = parseFloat(e.target.value) || 0;
                          setActionFormData({ ...actionFormData, items: updated });
                        }}
                        className="w-full px-2 py-1 text-right font-mono font-bold border rounded bg-white"
                      />
                      <span className="text-slate-500 font-mono">{it.uom}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Gate Pass Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched via Vehicle GJ-01-XX-1234"
                  value={actionFormData.remarks}
                  onChange={(e) => setActionFormData({ ...actionFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {modalSubmitting ? 'Confirming...' : 'Confirm Material Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RECORD PRODUCTION CONSUMPTION MODAL */}
      {activeModal === 'consume' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>Record Actual Production & Consumption</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{modalError}</div>}
            {modalSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold">{modalSuccess}</div>}

            <form onSubmit={handleConsumeSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Completed Finished Goods Qty (PCS) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={actionFormData.completed_finished_qty}
                  onChange={(e) => setActionFormData({ ...actionFormData, completed_finished_qty: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border font-mono font-bold text-emerald-700 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Actual Raw Material Consumed:</label>
                {actionFormData.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 border rounded-lg">
                    <span className="font-semibold text-slate-800">{it.material_name}</span>
                    <div className="flex items-center gap-1.5 w-32">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={it.consumed_qty}
                        onChange={(e) => {
                          const updated = [...actionFormData.items];
                          updated[idx].consumed_qty = parseFloat(e.target.value) || 0;
                          setActionFormData({ ...actionFormData, items: updated });
                        }}
                        className="w-full px-2 py-1 text-right font-mono font-bold border rounded bg-white"
                      />
                      <span className="text-slate-500 font-mono">{it.uom}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Auto-Issue Checkbox (Prevents 0 KG error) */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoIssue}
                    onChange={(e) => setAutoIssue(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      Auto-issue raw materials from warehouse
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      If contractor lacks stock, it will be automatically issued from the warehouse.
                    </span>
                  </div>
                </label>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                  Recommended
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Batch #1 manufacturing completed with 0.5 KG fabric unused"
                  value={actionFormData.remarks}
                  onChange={(e) => setActionFormData({ ...actionFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {modalSubmitting ? 'Recording...' : 'Record Consumption'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. RECEIVE FINISHED GOODS MODAL */}
      {activeModal === 'receive_fg' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Receive Finished Goods into Warehouse</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{modalError}</div>}
            {modalSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold">{modalSuccess}</div>}

            <form onSubmit={handleReceiveFgSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Receiving Warehouse *</label>
                <select
                  required
                  value={actionFormData.warehouse_id}
                  onChange={(e) => setActionFormData({ ...actionFormData, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border font-semibold"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.warehouse_name} ({w.warehouse_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Accepted Received Qty (PCS) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={actionFormData.received_qty}
                    onChange={(e) => setActionFormData({ ...actionFormData, received_qty: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border font-mono font-bold text-emerald-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Defective / Rejected Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={actionFormData.rejected_qty}
                    onChange={(e) => setActionFormData({ ...actionFormData, rejected_qty: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border font-mono text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Cotton T-Shirts received, QA verified."
                  value={actionFormData.remarks}
                  onChange={(e) => setActionFormData({ ...actionFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {modalSubmitting ? 'Receiving...' : 'Confirm Goods Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REQUEST RETURN MODAL */}
      {activeModal === 'return_req' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Request Return of Unused Material</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{modalError}</div>}
            {modalSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold">{modalSuccess}</div>}

            <form onSubmit={handleReturnReqSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Requested Return Quantity *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={actionFormData.requested_qty}
                  onChange={(e) => setActionFormData({ ...actionFormData, requested_qty: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Reason for return..."
                  value={actionFormData.remarks}
                  onChange={(e) => setActionFormData({ ...actionFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {modalSubmitting ? 'Requesting...' : 'Submit Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DISPATCH RETURN MODAL (Supplier Dispatches -> In Transit) */}
      {activeModal === 'return_disp' && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Supplier Dispatches Return (In Transit)</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500">
              Confirm that {order.supplier_id?.supplier_name} has dispatched the material. Stock will move from Supplier to <strong>In-Transit</strong>.
            </p>

            {modalError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{modalError}</div>}
            {modalSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold">{modalSuccess}</div>}

            <form onSubmit={handleReturnDispSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dispatched Quantity ({selectedReturn.uom}) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={actionFormData.dispatched_qty}
                  onChange={(e) => setActionFormData({ ...actionFormData, dispatched_qty: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Courier / Transport Details</label>
                <input
                  type="text"
                  placeholder="LR Number / Driver Contact..."
                  value={actionFormData.remarks}
                  onChange={(e) => setActionFormData({ ...actionFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {modalSubmitting ? 'Confirming...' : 'Confirm Dispatch (Mark In-Transit)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. RECEIVE RETURN MODAL (In-Transit -> Warehouse Stock Acceptance) */}
      {activeModal === 'return_rec' && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Physically Receive Return in Warehouse</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500">
              Verify and accept returned raw material into warehouse inventory. Warehouse stock will increase upon confirmation.
            </p>

            {modalError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{modalError}</div>}
            {modalSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold">{modalSuccess}</div>}

            <form onSubmit={handleReturnRecSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Receiving Warehouse *</label>
                <select
                  required
                  value={actionFormData.warehouse_id}
                  onChange={(e) => setActionFormData({ ...actionFormData, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border font-semibold"
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
                <label className="block font-bold text-slate-700 mb-1">
                  Accepted Received Quantity ({selectedReturn.uom}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={actionFormData.accepted_received_qty}
                  onChange={(e) => setActionFormData({ ...actionFormData, accepted_received_qty: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-emerald-700 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quality & Inward Remarks</label>
                <input
                  type="text"
                  placeholder="Material inspection notes..."
                  value={actionFormData.remarks}
                  onChange={(e) => setActionFormData({ ...actionFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {modalSubmitting ? 'Accepting...' : 'Accept & Add to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to GRN Modal */}
      {isConvertOpen && (
        <ConvertPoToGrnModal
          isOpen={isConvertOpen}
          onClose={() => setIsConvertOpen(false)}
          purchaseOrder={order}
          onSuccess={() => loadOrder()}
        />
      )}

      {/* Edit Purchase Order Modal */}
      {isEditOpen && order && (
        <EditPurchaseOrderModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          purchaseOrder={order}
          onSuccess={() => loadOrder()}
        />
      )}
    </div>
  );
}
