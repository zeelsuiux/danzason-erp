import React, { useEffect, useState, useMemo } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  FileText,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  Send,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Scissors,
  Truck,
  Receipt,
  HelpCircle,
  Tag,
  Building,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import complaintService from '../../services/complaintService';
import { salesApi } from '../../services/procurementService';
import teamService from '../../services/teamService';

export default function ComplaintManagement() {
  // ======================== STATE ========================
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'in_investigation' | 'action_proposed' | 'resolved_closed'
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Customer dropdown list for ticket logging
  const [customers, setCustomers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Drawer / Timeline Modal
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineComplaint, setTimelineComplaint] = useState(null);
  const [newLogNote, setNewLogNote] = useState('');
  const [newLogType, setNewLogType] = useState('customer_call');
  const [logSubmitting, setLogSubmitting] = useState(false);

  // Form States
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const initialCreateForm = {
    customer_id: '',
    customer_name: '',
    company_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    channel: 'phone',
    so_number: '',
    invoice_number: '',
    product_name: '',
    category: 'fabric_quality',
    priority: 'medium',
    subject: '',
    description: '',
    defective_quantity: 0,
    affected_order_value: 0,
    assigned_to: 'Vikram Mehta (QC Lead)',
    initial_note: '',
  };
  const [createFormData, setCreateFormData] = useState(initialCreateForm);

  // Resolution Form State
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const initialResolveForm = {
    resolution_type: 'credit_note',
    resolution_notes: '',
    compensation_amount: 0,
    credit_note_number: '',
    replacement_order_number: '',
    resolved_by: 'Customer Service Lead',
    close_ticket: true,
  };
  const [resolveFormData, setResolveFormData] = useState(initialResolveForm);

  // ======================== LOADERS ========================
  useEffect(() => {
    loadComplaints();
    loadStats();
    loadCustomers();
    loadTeam();
  }, [activeTab, priorityFilter, categoryFilter]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const params = {
        status: activeTab !== 'all' ? activeTab : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search.trim() || undefined,
        limit: 100,
      };
      const res = await complaintService.getComplaints(params);
      setComplaints(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const res = await complaintService.getComplaintStats();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load complaint stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await salesApi.getCustomers({ limit: 150 });
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Could not load customers for dropdown:', err.message);
    }
  };

  const loadTeam = async () => {
    try {
      const res = await teamService.getTeamMembers({ limit: 100 });
      setTeamMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Could not load team members for assignment:', err.message);
    }
  };

  // Filter complaints client-side by search
  const filteredComplaints = useMemo(() => {
    if (!search.trim()) return complaints;
    const q = search.toLowerCase().trim();
    return complaints.filter((c) => {
      return (
        c.ticket_number?.toLowerCase().includes(q) ||
        c.customer_name?.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q) ||
        c.mobile?.includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.so_number?.toLowerCase().includes(q) ||
        c.invoice_number?.toLowerCase().includes(q) ||
        c.product_name?.toLowerCase().includes(q)
      );
    });
  }, [complaints, search]);

  // ======================== HANDLERS ========================
  const handleOpenCreateModal = () => {
    setCreateFormData(initialCreateForm);
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleCustomerSelect = (customerId) => {
    if (!customerId) {
      setCreateFormData({
        ...createFormData,
        customer_id: '',
        customer_name: '',
        company_name: '',
        mobile: '',
        email: '',
      });
      return;
    }
    const found = customers.find((c) => c._id === customerId);
    if (found) {
      setCreateFormData({
        ...createFormData,
        customer_id: found._id,
        customer_name: found.customer_name || '',
        company_name: found.company_name || found.customer_name || '',
        contact_person: found.contact_person || '',
        mobile: found.mobile || found.phone || '',
        email: found.email || '',
      });
    }
  };

  const handleSaveComplaint = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError('');

    try {
      await complaintService.createComplaint(createFormData);
      setIsCreateModalOpen(false);
      loadComplaints();
      loadStats();
    } catch (err) {
      setCreateError(err.message || 'Failed to log service ticket');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenResolveModal = (complaint) => {
    setSelectedComplaint(complaint);
    setResolveFormData({
      resolution_type: complaint.resolution?.resolution_type !== 'none' ? complaint.resolution?.resolution_type : 'credit_note',
      resolution_notes: complaint.resolution?.resolution_notes || '',
      compensation_amount: complaint.resolution?.compensation_amount || complaint.defective_quantity ? (complaint.defective_quantity * 250) : 0,
      credit_note_number: complaint.resolution?.credit_note_number || `CN-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      replacement_order_number: complaint.resolution?.replacement_order_number || '',
      resolved_by: 'Customer Service Lead',
      close_ticket: true,
    });
    setResolveError('');
    setIsResolveModalOpen(true);
  };

  const handleSaveResolution = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setResolveSubmitting(true);
    setResolveError('');

    try {
      await complaintService.resolveComplaint(selectedComplaint._id, resolveFormData);
      setIsResolveModalOpen(false);
      loadComplaints();
      loadStats();
      if (timelineComplaint?._id === selectedComplaint._id) {
        // Refresh open timeline
        const updated = await complaintService.getComplaintById(selectedComplaint._id);
        if (updated?.data) setTimelineComplaint(updated.data);
      }
    } catch (err) {
      setResolveError(err.message || 'Failed to resolve ticket');
    } finally {
      setResolveSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (complaint, newStatus) => {
    try {
      await complaintService.updateStatus(complaint._id, {
        status: newStatus,
        notes: `Status changed to ${newStatus.toUpperCase()} via quick action.`,
      });
      loadComplaints();
      loadStats();
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
    }
  };

  const handleOpenTimeline = async (complaint) => {
    setTimelineComplaint(complaint);
    setIsTimelineOpen(true);
    setNewLogNote('');
    try {
      const res = await complaintService.getComplaintById(complaint._id);
      if (res?.data) {
        setTimelineComplaint(res.data);
      }
    } catch (err) {
      console.warn('Could not refresh timeline details:', err.message);
    }
  };

  const handleAddTimelineLog = async (e) => {
    e.preventDefault();
    if (!newLogNote.trim() || !timelineComplaint) return;
    setLogSubmitting(true);

    try {
      const res = await complaintService.addTimelineEntry(timelineComplaint._id, {
        type: newLogType,
        notes: newLogNote.trim(),
      });
      if (res?.data) {
        setTimelineComplaint(res.data);
        setNewLogNote('');
        loadComplaints();
      }
    } catch (err) {
      alert(`Failed to add update: ${err.message}`);
    } finally {
      setLogSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredComplaints.length === 0) {
      alert('No tickets available to export.');
      return;
    }

    const headers = [
      'Ticket Number',
      'Created Date',
      'Customer Name',
      'Company Name',
      'Mobile',
      'Email',
      'Category',
      'Priority',
      'Status',
      'Subject',
      'Order Number',
      'Defective Quantity',
      'Affected Value',
      'Assigned To',
      'Resolution Type',
      'Compensation Amount',
      'Resolved Date',
    ];

    const rows = filteredComplaints.map((c) => [
      `"${c.ticket_number || ''}"`,
      `"${new Date(c.createdAt).toLocaleDateString('en-IN')}"`,
      `"${c.customer_name || ''}"`,
      `"${c.company_name || ''}"`,
      `"${c.mobile || ''}"`,
      `"${c.email || ''}"`,
      `"${c.category || ''}"`,
      `"${c.priority || ''}"`,
      `"${c.status || ''}"`,
      `"${c.subject?.replace(/"/g, '""') || ''}"`,
      `"${c.so_number || ''}"`,
      c.defective_quantity || 0,
      c.affected_order_value || 0,
      `"${c.assigned_to || ''}"`,
      `"${c.resolution?.resolution_type || 'None'}"`,
      c.resolution?.compensation_amount || 0,
      `"${c.resolution?.resolved_at ? new Date(c.resolution.resolved_at).toLocaleDateString('en-IN') : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_service_complaints_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ======================== BADGE HELPERS ========================
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wider border border-rose-200">Critical</span>;
      case 'high':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider border border-amber-200">High</span>;
      case 'medium':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider border border-blue-200">Medium</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 uppercase tracking-wider">Low</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Open / New</span>;
      case 'in_investigation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">In Investigation</span>;
      case 'action_proposed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">Action Proposed</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Resolved</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Closed</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'fabric_quality':
        return { label: 'Fabric Quality / GSM', icon: Tag, color: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'stitching_defect':
        return { label: 'Stitching / Tailoring', icon: Scissors, color: 'text-amber-800 bg-amber-50 border-amber-200' };
      case 'printing_embroidery':
        return { label: 'Printing / Embroidery', icon: Sparkles, color: 'text-purple-800 bg-purple-50 border-purple-200' };
      case 'quantity_shortage':
        return { label: 'Quantity Shortage', icon: AlertTriangle, color: 'text-orange-800 bg-orange-50 border-orange-200' };
      case 'delivery_delay':
        return { label: 'Delivery Transit Delay', icon: Truck, color: 'text-blue-800 bg-blue-50 border-blue-200' };
      case 'billing_payment':
        return { label: 'Billing / Invoice Rate', icon: Receipt, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' };
      default:
        return { label: 'General Service', icon: HelpCircle, color: 'text-slate-800 bg-slate-50 border-slate-200' };
    }
  };

  // ======================== TABLE COLUMNS ========================
  const columns = [
    {
      header: 'Ticket ID & Date',
      key: 'ticket_number',
      render: (_, c) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-extrabold text-slate-900">{c.ticket_number}</span>
            {getPriorityBadge(c.priority)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {new Date(c.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      ),
    },
    {
      header: 'Client & Contact Info',
      key: 'customer_name',
      render: (_, c) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
            <Building className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-[170px]">{c.customer_name}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            <a href={`tel:${c.mobile}`} className="hover:text-emerald-600 hover:underline">
              {c.mobile}
            </a>
            <a
              href={`https://wa.me/91${c.mobile.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(c.customer_name)},%20regarding%20Ticket%20${c.ticket_number}%20at%20Danza%20Son.`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 hover:text-emerald-700"
              title="Chat on WhatsApp"
            >
              <MessageSquare className="w-3 h-3" />
            </a>
          </div>
        </div>
      ),
    },
    {
      header: 'Issue Category & Subject',
      key: 'subject',
      render: (_, c) => {
        const catInfo = getCategoryLabel(c.category);
        const IconComponent = catInfo.icon;
        return (
          <div className="space-y-1 max-w-[280px]">
            <div className="flex items-center gap-1">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${catInfo.color}`}>
                <IconComponent className="w-2.5 h-2.5" />
                {catInfo.label}
              </span>
              {c.so_number && (
                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                  {c.so_number}
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-800 line-clamp-1" title={c.subject}>
              {c.subject}
            </div>
            {c.defective_quantity > 0 && (
              <div className="text-[10px] text-rose-600 font-bold">
                Defective Pcs: {c.defective_quantity} pcs
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status & Assignee',
      key: 'status',
      render: (_, c) => (
        <div className="space-y-1">
          <div>{getStatusBadge(c.status)}</div>
          <div className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
            Assignee: <strong className="text-slate-700">{c.assigned_to || 'Unassigned'}</strong>
          </div>
        </div>
      ),
    },
    {
      header: 'Resolution / Impact',
      key: 'resolution',
      render: (_, c) => {
        const hasRes = c.resolution?.resolution_type && c.resolution.resolution_type !== 'none';
        return hasRes ? (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {c.resolution.resolution_type.replace(/_/g, ' ')}
            </span>
            {c.resolution.compensation_amount > 0 && (
              <div className="font-mono text-xs font-bold text-slate-900">
                ₹{c.resolution.compensation_amount.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 italic">Pending Action</span>
            {c.affected_order_value > 0 && (
              <div className="font-mono text-[10px] text-slate-500">
                Risk: ₹{c.affected_order_value.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (_, c) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* View Timeline / Logs */}
          <button
            type="button"
            onClick={() => handleOpenTimeline(c)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
            title="View History & Timeline Logs"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>

          {/* Resolve / Propose Action */}
          {c.status !== 'closed' && (
            <button
              type="button"
              onClick={() => handleOpenResolveModal(c)}
              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition shadow-xs flex items-center gap-1"
              title="Apply Resolution (Credit note, replacement)"
            >
              Resolve <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}

          {/* Quick Status Dropdown */}
          <select
            value={c.status}
            onChange={(e) => handleQuickStatusChange(c, e.target.value)}
            className="text-[10px] font-semibold border border-slate-200 rounded-lg py-1 px-1.5 bg-slate-50 text-slate-700 outline-none"
          >
            <option value="open">Open</option>
            <option value="in_investigation">Investigate</option>
            <option value="action_proposed">Propose Action</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Page Header */}
      <PageHeader
        title="Customer Service & Complaint Management"
        subtitle="Manage B2B wholesale client complaints, fabric defect inspections, credit notes, replacements, and SLA resolution tracking."
        breadcrumbs={[
          { label: 'Sales & CRM', link: '/sales/leads' },
          { label: 'Customer Service & Complaints' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Log Service Ticket
            </button>
          </div>
        }
      />

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Complaints */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Total Tickets</span>
            <LifeBuoy className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {statsLoading ? '...' : stats?.total || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Risk Value: ₹{Number(stats?.totalAffectedValue || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Active Issues */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-soft">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Active Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-900">
            {statsLoading ? '...' : stats?.activeTickets || 0}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            Open & under investigation
          </div>
        </div>

        {/* Critical Issues */}
        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-soft">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Critical Priority</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-900">
            {statsLoading ? '...' : stats?.criticalCount || 0}
          </div>
          <div className="text-[11px] text-rose-700 mt-1 font-medium">
            Requires 24h SLA action
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {statsLoading ? '...' : `${stats?.resolutionRate || 0}%`}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats?.resolutionRate || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Total Compensation Issued */}
        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 shadow-soft">
          <div className="flex items-center justify-between text-purple-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Compensations</span>
            <Receipt className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black font-mono text-purple-900 truncate">
            ₹{Number(stats?.totalCompensation || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-purple-700 mt-1 font-medium">
            Credit notes & replacements
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        {/* Filter Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-4 pt-2 gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Tickets' },
            { id: 'active', label: 'Active Pending' },
            { id: 'in_investigation', label: 'In Investigation' },
            { id: 'action_proposed', label: 'Action Proposed' },
            { id: 'resolved_closed', label: 'Resolved & Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap -mb-[1px] ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Secondary Filter Controls */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Ticket #, client, mobile, order #, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
            >
              <option value="all">All Categories</option>
              <option value="fabric_quality">Fabric Quality / GSM</option>
              <option value="stitching_defect">Stitching / Tailoring</option>
              <option value="printing_embroidery">Printing / Embroidery</option>
              <option value="quantity_shortage">Quantity Shortage</option>
              <option value="delivery_delay">Delivery Transit Delay</option>
              <option value="billing_payment">Billing / Invoice Rate</option>
            </select>
          </div>
        </div>

        {/* Complaints DataTable */}
        <DataTable
          columns={columns}
          data={filteredComplaints}
          loading={loading}
          emptyMessage="No customer service complaints found matching your criteria."
          onRowClick={(row) => handleOpenTimeline(row)}
        />
      </div>

      {/* ======================== MODAL 1: LOG NEW SERVICE TICKET ======================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Log Customer Service Ticket / Complaint"
        subtitle="Record client issue, garment defect, shortage or dispute for quality triage and turnaround tracking."
        size="lg"
      >
        <form onSubmit={handleSaveComplaint} className="space-y-4 text-xs font-sans text-slate-800">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 block">Select Customer Account *</label>
              <span className="text-[10px] text-slate-400">Or enter manual client details below</span>
            </div>

            <select
              value={createFormData.customer_id}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:border-emerald-600 outline-none"
            >
              <option value="">-- Choose from Existing Customers --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.customer_name} {c.company_name ? `(${c.company_name})` : ''} - {c.mobile || c.phone}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Store Name *</label>
                <input
                  type="text"
                  required
                  value={createFormData.customer_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, customer_name: e.target.value })}
                  placeholder="e.g. Metro Garments"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={createFormData.mobile}
                  onChange={(e) => setCreateFormData({ ...createFormData, mobile: e.target.value })}
                  placeholder="e.g. 9820011223"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="client@domain.com"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Reference Order / Invoice & Product */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sales Order # (Optional)</label>
              <input
                type="text"
                value={createFormData.so_number}
                onChange={(e) => setCreateFormData({ ...createFormData, so_number: e.target.value.toUpperCase() })}
                placeholder="e.g. SO-2026-00012"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Invoice # (Optional)</label>
              <input
                type="text"
                value={createFormData.invoice_number}
                onChange={(e) => setCreateFormData({ ...createFormData, invoice_number: e.target.value.toUpperCase() })}
                placeholder="e.g. INV-2026-00008"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Product / Garment Name</label>
              <input
                type="text"
                value={createFormData.product_name}
                onChange={(e) => setCreateFormData({ ...createFormData, product_name: e.target.value })}
                placeholder="e.g. Bio-Wash T-Shirt"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Category, Priority & Defective Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Defect Category *</label>
              <select
                value={createFormData.category}
                onChange={(e) => setCreateFormData({ ...createFormData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-emerald-600 outline-none"
              >
                <option value="fabric_quality">Fabric Quality / GSM / Color</option>
                <option value="stitching_defect">Stitching / Measurement Defect</option>
                <option value="printing_embroidery">Printing / Embroidery Issue</option>
                <option value="quantity_shortage">Quantity Shortage in Box</option>
                <option value="delivery_delay">Delivery / Courier Delay</option>
                <option value="billing_payment">Billing / Invoice Rate Discrepancy</option>
                <option value="other">Other Service Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Priority / Urgency *</label>
              <select
                value={createFormData.priority}
                onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-rose-700 focus:border-emerald-600 outline-none"
              >
                <option value="critical">Critical (Stop payment / Store rejection - 24h SLA)</option>
                <option value="high">High (Urgent wholesale issue - 48h SLA)</option>
                <option value="medium">Medium (Standard investigation - 72h SLA)</option>
                <option value="low">Low (Minor cosmetic inquiry - 5 days SLA)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Defective Quantity (Pcs)</label>
              <input
                type="number"
                min="0"
                value={createFormData.defective_quantity}
                onChange={(e) => setCreateFormData({ ...createFormData, defective_quantity: parseInt(e.target.value, 10) || 0 })}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Subject & Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Complaint Subject / Summary *</label>
            <input
              type="text"
              required
              value={createFormData.subject}
              onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
              placeholder="e.g. Size L chest measurement 2 inches narrower than tech-pack"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Detailed Issue Description *</label>
            <textarea
              rows={3}
              required
              value={createFormData.description}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              placeholder="Provide exact defect observations, carton numbers, client feedback, or testing results..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-600 resize-none"
            />
          </div>

          {/* Assignee & Initial Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assign Lead / Inspector</label>
              <select
                value={createFormData.assigned_to}
                onChange={(e) => setCreateFormData({ ...createFormData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-emerald-600 outline-none"
              >
                <option value="Vikram Mehta (QC Lead)">Vikram Mehta (QC Lead)</option>
                <option value="Amit Trivedi (Production Mgr)">Amit Trivedi (Production Mgr)</option>
                <option value="Sanjay Joshi (Dispatch Lead)">Sanjay Joshi (Dispatch Lead)</option>
                <option value="Pooja Shah (Client Support)">Pooja Shah (Client Support)</option>
                <option value="Finance Accounts Team">Finance Accounts Team</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Affected Order Value (₹)</label>
              <input
                type="number"
                min="0"
                value={createFormData.affected_order_value}
                onChange={(e) => setCreateFormData({ ...createFormData, affected_order_value: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 125000"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              {createSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Log Service Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================== MODAL 2: RESOLVE COMPLAINT ACTION ======================== */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title={`Apply Resolution: ${selectedComplaint?.ticket_number}`}
        subtitle="Finalize corrective action, credit note deduction, garment replacement, and client sign-off."
        size="md"
      >
        <form onSubmit={handleSaveResolution} className="space-y-4 text-xs font-sans text-slate-800">
          {resolveError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resolveError}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Customer & Subject</div>
            <div className="font-bold text-slate-900 text-xs">{selectedComplaint?.customer_name}</div>
            <div className="text-slate-600 text-xs">{selectedComplaint?.subject}</div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Resolution Action Type *</label>
            <select
              value={resolveFormData.resolution_type}
              onChange={(e) => setResolveFormData({ ...resolveFormData, resolution_type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-emerald-800 focus:border-emerald-600 outline-none"
            >
              <option value="credit_note">Credit Note (Ledger balance deduction for defective pcs)</option>
              <option value="replacement">Fresh Piece Replacement (Fast-track production & dispatch)</option>
              <option value="repair_alteration">Factory Alteration / Re-stitching</option>
              <option value="discount_next_order">Goodwill Discount on Next Wholesale Order</option>
              <option value="refund">Direct Bank Refund</option>
              <option value="explanation_only">Clarification & Technical Spec Explanation (No financial cost)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Compensation Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={resolveFormData.compensation_amount}
                onChange={(e) => setResolveFormData({ ...resolveFormData, compensation_amount: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 15000"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs font-bold outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Credit Note / Replacement #</label>
              <input
                type="text"
                value={resolveFormData.credit_note_number}
                onChange={(e) => setResolveFormData({ ...resolveFormData, credit_note_number: e.target.value.toUpperCase() })}
                placeholder="e.g. CN-2026-00012"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Root Cause & Resolution Notes *</label>
            <textarea
              rows={3}
              required
              value={resolveFormData.resolution_notes}
              onChange={(e) => setResolveFormData({ ...resolveFormData, resolution_notes: e.target.value })}
              placeholder="Explain the root cause analysis, agreement with the buyer, and steps taken..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-600 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="close_ticket_chk"
              checked={resolveFormData.close_ticket}
              onChange={(e) => setResolveFormData({ ...resolveFormData, close_ticket: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="close_ticket_chk" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Mark ticket as Fully Closed & Verified (moves out of active pending queue)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsResolveModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resolveSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              {resolveSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Confirm Resolution
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================== DRAWER 3: LIVE TICKET TIMELINE & LOGS ======================== */}
      {isTimelineOpen && timelineComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-slate-900">
                    {timelineComplaint.ticket_number}
                  </span>
                  {getPriorityBadge(timelineComplaint.priority)}
                  {getStatusBadge(timelineComplaint.status)}
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-1">
                  {timelineComplaint.customer_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{timelineComplaint.subject}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsTimelineOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Contact & Action Ribbon */}
            <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${timelineComplaint.mobile}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:text-emerald-700 shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call Client
                </a>
                <a
                  href={`https://wa.me/91${timelineComplaint.mobile.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(timelineComplaint.customer_name)},%20update%20on%20Ticket%20${timelineComplaint.ticket_number}.`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:text-emerald-700 shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                </a>
              </div>

              {timelineComplaint.status !== 'closed' && (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenResolveModal(timelineComplaint);
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
                >
                  Apply Resolution
                </button>
              )}
            </div>

            {/* Ticket Details Summary */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs grid grid-cols-2 gap-2 text-slate-600">
              <div>
                Order #: <strong className="text-slate-900">{timelineComplaint.so_number || 'None'}</strong>
              </div>
              <div>
                Defective Pcs: <strong className="text-rose-600">{timelineComplaint.defective_quantity || 0} pcs</strong>
              </div>
              <div>
                Assignee: <strong className="text-slate-900">{timelineComplaint.assigned_to || 'Unassigned'}</strong>
              </div>
              <div>
                SLA Due:{' '}
                <strong className="text-slate-900">
                  {timelineComplaint.sla_due_date ? new Date(timelineComplaint.sla_due_date).toLocaleDateString('en-IN') : 'Standard'}
                </strong>
              </div>
            </div>

            {/* Chronological Timeline Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Interaction History & Inspection Logs
              </h4>

              {Array.isArray(timelineComplaint.timeline) && timelineComplaint.timeline.length > 0 ? (
                timelineComplaint.timeline.map((item, idx) => (
                  <div key={idx} className="relative pl-6 pb-2 border-l-2 border-slate-200 last:border-transparent">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{item.author || 'Service Staff'}</span>
                        <span className="text-slate-400 font-mono">
                          {new Date(item.date).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{item.notes}</p>
                      {item.customer_feedback && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200 mt-1">
                          Feedback: {item.customer_feedback}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No interaction logs recorded yet.</div>
              )}
            </div>

            {/* Add New Interaction / Update Form */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <form onSubmit={handleAddTimelineLog} className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={newLogType}
                    onChange={(e) => setNewLogType(e.target.value)}
                    className="text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none"
                  >
                    <option value="customer_call">Phone Call Update</option>
                    <option value="whatsapp_chat">WhatsApp Chat Note</option>
                    <option value="factory_qc">Factory / QC Finding</option>
                    <option value="internal_note">Internal Note</option>
                  </select>
                  <span className="text-[11px] text-slate-400 font-medium">Record fresh call/inspection update</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newLogNote}
                    onChange={(e) => setNewLogNote(e.target.value)}
                    placeholder="Enter customer response, QC report note, or next steps..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-emerald-600"
                  />
                  <button
                    type="submit"
                    disabled={logSubmitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Log
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
