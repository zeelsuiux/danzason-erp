import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserPlus,
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Building,
  Mail,
  MapPin,
  Tag,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  X,
  FileText,
  Briefcase,
  Share2,
  Send,
  GripVertical,
  MoveRight,
  History,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import leadService from '../../services/leadService';

export default function LeadManagement() {
  const navigate = useNavigate();

  // Active Tab: 'all' | 'pipeline' | 'followups' | 'analytics'
  const [activeTab, setActiveTab] = useState('all');

  // Follow-ups Hub Sub-tab: 'today' | 'overdue' | 'upcoming' | 'completed'
  const [followupTab, setFollowupTab] = useState('today');

  // Data State
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [followupsList, setFollowupsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    source: 'all',
    interest_type: 'all',
    assigned_to: 'all',
  });

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddFollowupModalOpen, setIsAddFollowupModalOpen] = useState(false);
  const [isCompleteFollowupModalOpen, setIsCompleteFollowupModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyModalLead, setHistoryModalLead] = useState(null);
  const [expandedLeadIds, setExpandedLeadIds] = useState([]);

  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedFollowup, setSelectedFollowup] = useState(null);

  // Drag and Drop Pipeline State
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [statusUpdatingLeadId, setStatusUpdatingLeadId] = useState(null);

  // Form States
  const initialLeadForm = {
    lead_name: '',
    company_name: '',
    mobile: '',
    email: '',
    lead_source: 'WhatsApp',
    interest_type: 'Finished Goods',
    estimated_value: '',
    priority: 'medium',
    status: 'new',
    assigned_to: 'Sales Team',
    city: '',
    state: 'Gujarat',
    address: '',
    requirements: '',
    schedule_initial_followup: false,
    initial_followup_date: '',
    initial_followup_type: 'Phone Call',
    initial_followup_notes: '',
  };
  const [leadFormData, setLeadFormData] = useState(initialLeadForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Followup Schedule Form
  const initialFollowupForm = {
    followup_date: '',
    followup_type: 'Phone Call',
    notes: '',
    next_action: '',
    conducted_by: 'Sales Representative',
  };
  const [followupFormData, setFollowupFormData] = useState(initialFollowupForm);

  // Followup Completion Form
  const [completionFormData, setCompletionFormData] = useState({
    status: 'completed',
    notes: '',
    next_action: '',
    lead_status: '',
    schedule_next: false,
    next_followup_date: '',
    next_followup_type: 'Phone Call',
    next_followup_notes: '',
  });

  // ======================== LOADERS ========================
  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'all' || activeTab === 'pipeline') {
      loadLeads(1);
    } else if (activeTab === 'followups') {
      loadFollowups();
    }
  }, [activeTab, followupTab, filters, pagination.page]);

  const loadSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await leadService.getSummary();
      if (res?.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load lead summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadLeads = async (page = pagination.page) => {
    try {
      setLoading(true);
      const res = await leadService.getLeads({
        page,
        limit: activeTab === 'pipeline' ? 100 : pagination.limit,
        search: filters.search.trim() || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        priority: filters.priority !== 'all' ? filters.priority : undefined,
        lead_source: filters.source !== 'all' ? filters.source : undefined,
        interest_type: filters.interest_type !== 'all' ? filters.interest_type : undefined,
      });

      setLeads(Array.isArray(res.data) ? res.data : []);
      if (res.meta) {
        setPagination((prev) => ({
          ...prev,
          page: res.meta.page,
          total: res.meta.total,
          totalPages: res.meta.totalPages,
        }));
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowups = async () => {
    try {
      setFollowupsLoading(true);
      const res = await leadService.getAllFollowups({ tab: followupTab });
      setFollowupsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load follow-ups list:', err);
    } finally {
      setFollowupsLoading(false);
    }
  };

  // ======================== HANDLERS ========================
  const handleOpenCreate = () => {
    const todayStr = new Date().toISOString().slice(0, 16);
    setLeadFormData({
      ...initialLeadForm,
      initial_followup_date: todayStr,
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (lead) => {
    setSelectedLead(lead);
    setLeadFormData({
      lead_name: lead.lead_name || '',
      company_name: lead.company_name || '',
      mobile: lead.mobile || '',
      email: lead.email || '',
      lead_source: lead.lead_source || 'WhatsApp',
      interest_type: lead.interest_type || 'Finished Goods',
      estimated_value: lead.estimated_value || '',
      priority: lead.priority || 'medium',
      status: lead.status || 'new',
      assigned_to: lead.assigned_to || 'Sales Team',
      city: lead.city || '',
      state: lead.state || 'Gujarat',
      address: lead.address || '',
      requirements: lead.requirements || '',
      lost_reason: lead.lost_reason || '',
      schedule_initial_followup: false,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenView = async (lead) => {
    try {
      const res = await leadService.getLeadById(lead._id);
      setSelectedLead(res.data || lead);
      setIsViewModalOpen(true);
    } catch (err) {
      setSelectedLead(lead);
      setIsViewModalOpen(true);
    }
  };

  const toggleExpandLead = (leadId) => {
    setExpandedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleOpenHistoryModal = async (lead) => {
    try {
      const res = await leadService.getLeadById(lead._id);
      setHistoryModalLead(res.data || lead);
      setIsHistoryModalOpen(true);
    } catch (err) {
      setHistoryModalLead(lead);
      setIsHistoryModalOpen(true);
    }
  };

  const handleOpenScheduleFollowup = (lead) => {
    setSelectedLead(lead);
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(11, 0, 0, 0);
    setFollowupFormData({
      ...initialFollowupForm,
      followup_date: tomorrow.toISOString().slice(0, 16),
      conducted_by: lead.assigned_to || 'Sales Representative',
    });
    setFormError('');
    setIsAddFollowupModalOpen(true);
  };

  const handleOpenCompleteFollowup = (lead, followup) => {
    setSelectedLead(lead);
    setSelectedFollowup(followup);
    const nextDate = new Date(Date.now() + 3 * 86400000);
    nextDate.setHours(11, 0, 0, 0);

    setCompletionFormData({
      status: 'completed',
      notes: '',
      next_action: '',
      lead_status: lead.status === 'new' ? 'contacted' : lead.status,
      schedule_next: false,
      next_followup_date: nextDate.toISOString().slice(0, 16),
      next_followup_type: followup.followup_type || 'Phone Call',
      next_followup_notes: '',
    });
    setFormError('');
    setIsCompleteFollowupModalOpen(true);
  };

  const handleOpenConvert = (lead) => {
    setSelectedLead(lead);
    setIsConvertModalOpen(true);
  };

  // Submit Create Lead
  const handleCreateLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadFormData.lead_name || !leadFormData.company_name || !leadFormData.mobile) {
      setFormError('Please provide Contact Name, Company Name, and Mobile Number.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');

      const payload = {
        ...leadFormData,
        estimated_value: Number(leadFormData.estimated_value) || 0,
      };

      if (!leadFormData.schedule_initial_followup) {
        delete payload.initial_followup_date;
        delete payload.initial_followup_type;
        delete payload.initial_followup_notes;
      }

      await leadService.createLead(payload);
      setIsCreateModalOpen(false);
      loadLeads();
      loadSummary();
    } catch (err) {
      setFormError(err.message || 'Failed to create lead');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Lead
  const handleEditLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      setFormError('');

      await leadService.updateLead(selectedLead._id, {
        ...leadFormData,
        estimated_value: Number(leadFormData.estimated_value) || 0,
      });

      setIsEditModalOpen(false);
      loadLeads();
      loadSummary();
    } catch (err) {
      setFormError(err.message || 'Failed to update lead');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Schedule Follow-up
  const handleScheduleFollowupSubmit = async (e) => {
    e.preventDefault();
    if (!followupFormData.followup_date) {
      setFormError('Follow-up date and time are required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');

      await leadService.addFollowup(selectedLead._id, followupFormData);
      setIsAddFollowupModalOpen(false);
      loadLeads();
      loadSummary();
      if (activeTab === 'followups') loadFollowups();
    } catch (err) {
      setFormError(err.message || 'Failed to schedule follow-up');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Complete Follow-up
  const handleCompleteFollowupSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      setFormError('');

      const payload = {
        status: completionFormData.status,
        notes: completionFormData.notes,
        next_action: completionFormData.next_action,
        lead_status: completionFormData.lead_status || undefined,
      };

      if (completionFormData.schedule_next && completionFormData.next_followup_date) {
        payload.next_followup_date = completionFormData.next_followup_date;
        payload.next_followup_type = completionFormData.next_followup_type;
        payload.next_followup_notes = completionFormData.next_followup_notes;
      }

      await leadService.updateFollowup(selectedLead._id, selectedFollowup._id, payload);
      setIsCompleteFollowupModalOpen(false);
      loadLeads();
      loadSummary();
      if (activeTab === 'followups') loadFollowups();
    } catch (err) {
      setFormError(err.message || 'Failed to log follow-up outcome');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Convert to Customer
  const handleConvertSubmit = async () => {
    try {
      setFormSubmitting(true);
      const res = await leadService.convertToCustomer(selectedLead._id);
      setIsConvertModalOpen(false);
      loadLeads();
      loadSummary();
      alert(`Success! Lead converted to Customer ${res.data?.customer?.customer_name} (${res.data?.customer?.customer_code})`);
    } catch (err) {
      alert(`Conversion error: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (lead) => {
    if (window.confirm(`Are you sure you want to delete lead ${lead.lead_number} (${lead.company_name})?`)) {
      try {
        await leadService.deleteLead(lead._id);
        loadLeads();
        loadSummary();
      } catch (err) {
        alert(`Failed to delete lead: ${err.message}`);
      }
    }
  };

  // Drag and Drop Pipeline Stage Handler
  const handleDropLead = async (targetStageId) => {
    if (!draggedLead) return;
    if (draggedLead.status === targetStageId) {
      setDraggedLead(null);
      setDragOverStage(null);
      return;
    }

    const leadToMove = draggedLead;
    const oldStatus = leadToMove.status;
    setDraggedLead(null);
    setDragOverStage(null);

    // If moving into 'won', ask to convert to customer
    if (targetStageId === 'won' && !leadToMove.converted_customer_id) {
      if (window.confirm(`Move "${leadToMove.company_name}" to Won and convert into an ERP Customer?`)) {
        handleOpenConvert(leadToMove);
        return;
      }
    }

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l._id === leadToMove._id ? { ...l, status: targetStageId } : l))
    );

    try {
      setStatusUpdatingLeadId(leadToMove._id);
      await leadService.updateLead(leadToMove._id, { status: targetStageId });
      loadSummary();
    } catch (err) {
      console.error('Failed to update stage:', err);
      // Revert optimistic update
      setLeads((prev) =>
        prev.map((l) => (l._id === leadToMove._id ? { ...l, status: oldStatus } : l))
      );
      alert(`Could not update lead status: ${err.message}`);
    } finally {
      setStatusUpdatingLeadId(null);
    }
  };

  // Quick Move Stage Handler (Click / Select)
  const handleQuickMoveStage = async (lead, targetStageId, e) => {
    if (e) e.stopPropagation();
    if (lead.status === targetStageId) return;

    if (targetStageId === 'won' && !lead.converted_customer_id) {
      handleOpenConvert(lead);
      return;
    }

    const oldStatus = lead.status;
    setLeads((prev) =>
      prev.map((l) => (l._id === lead._id ? { ...l, status: targetStageId } : l))
    );

    try {
      setStatusUpdatingLeadId(lead._id);
      await leadService.updateLead(lead._id, { status: targetStageId });
      loadSummary();
    } catch (err) {
      setLeads((prev) =>
        prev.map((l) => (l._id === lead._id ? { ...l, status: oldStatus } : l))
      );
      alert(`Could not update stage: ${err.message}`);
    } finally {
      setStatusUpdatingLeadId(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert('No leads to export.');
      return;
    }
    const headers = [
      'Lead Number',
      'Contact Person',
      'Company Name',
      'Mobile',
      'Email',
      'City',
      'State',
      'Source',
      'Interest Type',
      'Estimated Value',
      'Priority',
      'Status',
      'Assigned To',
      'Next Followup Date',
      'Created Date',
    ];

    const rows = leads.map((l) => [
      `"${l.lead_number || ''}"`,
      `"${l.lead_name || ''}"`,
      `"${l.company_name || ''}"`,
      `"${l.mobile || ''}"`,
      `"${l.email || ''}"`,
      `"${l.city || ''}"`,
      `"${l.state || ''}"`,
      `"${l.lead_source || ''}"`,
      `"${l.interest_type || ''}"`,
      `"${l.estimated_value || 0}"`,
      `"${l.priority || ''}"`,
      `"${l.status || ''}"`,
      `"${l.assigned_to || ''}"`,
      `"${l.next_followup_date ? new Date(l.next_followup_date).toLocaleDateString('en-IN') : ''}"`,
      `"${new Date(l.createdAt).toLocaleDateString('en-IN')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ======================== STATUS BADGE HELPERS ========================
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">Urgent</span>;
      case 'high':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 uppercase tracking-wider">Medium</span>;
      case 'low':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 uppercase tracking-wider">Low</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{priority}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">New Inquiry</span>;
      case 'contacted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">Contacted</span>;
      case 'qualified':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Qualified</span>;
      case 'quotation_sent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Quote Sent</span>;
      case 'negotiation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">In Negotiation</span>;
      case 'won':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Won / Customer</span>;
      case 'lost':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3.5 h-3.5 text-rose-500" /> Lost Deal</span>;
      case 'junk':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">Junk</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  // Check if date is overdue, today, or future
  const getFollowupDateStatus = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (date < todayStart) {
      return { type: 'overdue', label: 'Overdue', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    if (date >= todayStart && date <= todayEnd) {
      return { type: 'today', label: 'Due Today', color: 'text-amber-800 bg-amber-50 border-amber-300 font-bold' };
    }
    return { type: 'upcoming', label: 'Upcoming', color: 'text-slate-600 bg-slate-50 border-slate-200' };
  };

  // ======================== TABLE COLUMNS ========================
  const columns = [
    {
      header: 'Lead Details',
      key: 'lead_number',
      render: (_, lead) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-brand hover:underline cursor-pointer" onClick={() => handleOpenView(lead)}>
              {lead.lead_number}
            </span>
            {getPriorityBadge(lead.priority)}
          </div>
          <span className="font-semibold text-slate-900 text-sm mt-0.5">{lead.company_name}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Users className="w-3.5 h-3.5 text-slate-400" /> {lead.lead_name} {lead.city ? `• ${lead.city}` : ''}
          </span>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'mobile',
      render: (_, lead) => (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-slate-800">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <a href={`tel:${lead.mobile}`} className="hover:text-brand hover:underline" onClick={(e) => e.stopPropagation()}>
              {lead.mobile}
            </a>
            <a
              href={`https://wa.me/91${lead.mobile.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(lead.lead_name)},%20regarding%20your%20inquiry%20with%20Danza%20Son%20Apparels.`}
              target="_blank"
              rel="noreferrer"
              title="Chat on WhatsApp"
              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
          </div>
          {lead.email && (
            <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[180px]">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Source & Interest',
      key: 'lead_source',
      render: (_, lead) => (
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            <Tag className="w-3 h-3 text-slate-500" /> {lead.lead_source}
          </span>
          <div className="text-xs text-slate-600 font-medium">{lead.interest_type}</div>
        </div>
      ),
    },
    {
      header: 'Est. Deal Value',
      key: 'estimated_value',
      render: (_, lead) => (
        <div className="font-mono text-sm font-bold text-slate-800">
          ₹{Number(lead.estimated_value || 0).toLocaleString('en-IN')}
        </div>
      ),
    },
    {
      header: 'Last Reason',
      key: 'history_and_reasons',
      className: 'w-[140px] max-w-[150px]',
      render: (_, lead) => {
        const allFollowups = Array.isArray(lead.followups) ? lead.followups : [];
        const completedFollowups = allFollowups
          .filter((f) => f.status === 'completed' && f.notes)
          .sort((a, b) => new Date(b.completed_at || b.followup_date || 0) - new Date(a.completed_at || a.followup_date || 0));

        const isLost = lead.status === 'lost' && lead.lost_reason;
        const latestNote = isLost
          ? lead.lost_reason
          : (completedFollowups[0]?.notes || lead.requirements || allFollowups[0]?.notes);
        const totalLogs = allFollowups.length;

        if (!latestNote) {
          return <span className="text-xs text-slate-300 italic">—</span>;
        }

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenHistoryModal(lead);
            }}
            className={"group flex items-center justify-between gap-1 w-full max-w-[140px] text-left py-1 px-2 rounded-md border transition text-xs " + (
              isLost
                ? 'bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-900'
                : 'bg-slate-50 hover:bg-indigo-50/80 border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-950'
            )}
            title={`Click to view timeline:\n${isLost ? ("Lost: " + latestNote) : latestNote}`}
          >
            <div className="flex items-center gap-1 min-w-0">
              <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + (isLost ? 'bg-rose-500' : 'bg-emerald-500')} />
              <span className="truncate font-medium text-[11px] leading-tight">
                {latestNote}
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0 ml-1">
              {totalLogs > 0 && (
                <span className="font-mono text-[9px] font-bold px-1 rounded bg-white border border-slate-200 text-slate-500 group-hover:border-indigo-300 group-hover:text-indigo-600">
                  {totalLogs}
                </span>
              )}
              <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
            </div>
          </button>
        );
      },
    },
    {
      header: 'Next Follow-up',
      key: 'next_followup_date',
      render: (_, lead) => {
        const dateStatus = getFollowupDateStatus(lead.next_followup_date);
        return lead.next_followup_date ? (
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${dateStatus?.color}`}>
              <Calendar className="w-3 h-3" />
              {new Date(lead.next_followup_date).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <span>{dateStatus?.label}</span>
              {lead.followups && lead.followups.length > 0 && (
                <span>• {lead.followups.filter((f) => f.status === 'scheduled').length} pending</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">None scheduled</span>
        );
      },
    },
    {
      header: 'Status',
      key: 'status',
      render: (_, lead) => getStatusBadge(lead.status),
    },
  ];

  // Pipeline Stages definition for Kanban View
  const pipelineStages = [
    { id: 'new', label: 'New Inquiries', color: 'border-blue-500 bg-blue-50/50' },
    { id: 'contacted', label: 'Contacted', color: 'border-cyan-500 bg-cyan-50/50' },
    { id: 'qualified', label: 'Qualified', color: 'border-indigo-500 bg-indigo-50/50' },
    { id: 'quotation_sent', label: 'Quotation Sent', color: 'border-purple-500 bg-purple-50/50' },
    { id: 'negotiation', label: 'Negotiation', color: 'border-amber-500 bg-amber-50/50' },
    { id: 'won', label: 'Won / Customer', color: 'border-emerald-500 bg-emerald-50/50' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Lead & Follow-up Management"
        subtitle="Manage prospective clients, schedule automated follow-ups, and convert pipeline opportunities into sales."
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              loadSummary();
              if (activeTab === 'followups') loadFollowups();
              else loadLeads();
            }}
            className="p-2 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-xl border border-slate-200 bg-white transition shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 transition shadow-md shadow-brand/20"
          >
            <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>
      </PageHeader>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Leads */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Leads</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {summaryLoading ? '...' : summary?.totalLeads || 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Active Prospects: <span className="font-bold text-slate-700">{summary?.activeLeadsCount || 0}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Due Today Follow-ups */}
        <div
          onClick={() => {
            setActiveTab('followups');
            setFollowupTab('today');
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Due Today</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {summaryLoading ? '...' : summary?.followups?.dueToday || 0}
            </h3>
            <p className="text-[11px] text-amber-600 group-hover:underline mt-1 font-medium flex items-center gap-0.5">
              View Today's Calls <ChevronRight className="w-3 h-3" />
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue Follow-ups */}
        <div
          onClick={() => {
            setActiveTab('followups');
            setFollowupTab('overdue');
          }}
          className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-400 hover:shadow-md transition group bg-rose-50/20"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Overdue Follow-ups</p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">
              {summaryLoading ? '...' : summary?.followups?.overdue || 0}
            </h3>
            <p className="text-[11px] text-rose-500 group-hover:underline mt-1 font-medium flex items-center gap-0.5">
              Immediate Action Needed <ChevronRight className="w-3 h-3" />
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Active Pipeline Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pipeline Value</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              ₹{summaryLoading ? '...' : (summary?.pipelineValue || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Weighted Potential Revenue
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Won & Converted */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Won / Converted</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
              {summaryLoading ? '...' : summary?.wonLeads || 0}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-1 font-bold">
              Conversion: {summary?.conversionRate || 0}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> All Leads ({pagination.total})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'pipeline'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Pipeline Stages
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('followups')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition relative ${
              activeTab === 'followups'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" /> Follow-ups Hub
            {(summary?.followups?.dueToday > 0 || summary?.followups?.overdue > 0) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Prominent "+ Add Lead" Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> + Add Lead
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ALL LEADS TABLE */}
      {/* ==================================================================== */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by company, contact, phone, city..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand outline-none transition"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand outline-none transition"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New Inquiry</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="quotation_sent">Quotation Sent</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won / Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand outline-none transition"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand outline-none transition"
                >
                  <option value="all">All Sources</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="IndiaMART">IndiaMART</option>
                  <option value="TradeIndia">TradeIndia</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Exhibition / Trade Fair">Trade Fair</option>
                  <option value="Cold Call">Cold Call</option>
                </select>
              </div>

              {/* Interest Type */}
              <div>
                <select
                  value={filters.interest_type}
                  onChange={(e) => setFilters({ ...filters, interest_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand outline-none transition"
                >
                  <option value="all">All Interests</option>
                  <option value="Finished Goods">Finished Goods</option>
                  <option value="Raw Material">Raw Material</option>
                  <option value="Job Work Processing">Job Work</option>
                  <option value="Fabric / Yarn">Fabric / Yarn</option>
                </select>
              </div>

              {/* Quick Add Button in Filter Row */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Lead
                </button>
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <DataTable
            columns={columns}
            data={leads}
            loading={loading}
            pagination={pagination}
            onPageChange={(p) => loadLeads(p)}
            onRowClick={(row) => handleOpenView(row)}
            emptyMessage="No leads found matching the selected filters."
            actions={(lead) => (
              <div className="flex items-center justify-end gap-1">
                {/* Schedule Follow-up */}
                <button
                  type="button"
                  onClick={() => handleOpenScheduleFollowup(lead)}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  title="Schedule Follow-up"
                >
                  <Calendar className="w-4 h-4" />
                </button>

                {/* Convert to Customer */}
                {lead.status !== 'won' && !lead.converted_customer_id && (
                  <button
                    type="button"
                    onClick={() => handleOpenConvert(lead)}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="Convert to Customer"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                )}

                {/* View Details */}
                <button
                  type="button"
                  onClick={() => handleOpenView(lead)}
                  className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                  title="View Lead Details"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(lead)}
                  className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                  title="Edit Lead"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteLead(lead)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete Lead"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PIPELINE / KANBAN VIEW (WITH INTERACTIVE DRAG & DROP) */}
      {/* ==================================================================== */}
      {activeTab === 'pipeline' && (
        <div className="space-y-3">
          {/* Helpful Drag & Drop Instruction Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px] uppercase">
                Drag & Drop
              </span>
              <span>
                Drag any lead card and drop it into another column to change its pipeline stage instantly.
              </span>
            </div>
            {statusUpdatingLeadId && (
              <span className="font-bold text-emerald-700 flex items-center gap-1.5 animate-pulse">
                <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                Updating stage...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
            {pipelineStages.map((stage) => {
              const stageLeads = leads.filter((l) => l.status === stage.id);
              const stageValue = stageLeads.reduce((acc, curr) => acc + (Number(curr.estimated_value) || 0), 0);
              const isOver = dragOverStage === stage.id;

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverStage !== stage.id) setDragOverStage(stage.id);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    setDragOverStage(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropLead(stage.id);
                  }}
                  className={`flex flex-col rounded-2xl p-3 min-w-[260px] transition-all duration-200 border-2 ${
                    isOver
                      ? 'border-brand bg-emerald-50/60 ring-2 ring-brand/30 shadow-md scale-[1.01]'
                      : 'border-slate-200/80 bg-slate-50/80'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 text-xs">{stage.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        {stageLeads.length}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-slate-600">
                      ₹{stageValue > 1000 ? `${(stageValue / 1000).toFixed(0)}k` : stageValue}
                    </span>
                  </div>

                  {/* Drop zone indicator when dragging over */}
                  {isOver && draggedLead && draggedLead.status !== stage.id && (
                    <div className="p-3 mb-2.5 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-100/60 text-center text-xs font-bold text-emerald-800 animate-pulse flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-700" />
                      Drop to move into {stage.label}
                    </div>
                  )}

                  {/* Lead Cards List */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[650px] pr-1">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                        Drop leads here
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const dateStatus = getFollowupDateStatus(lead.next_followup_date);
                        const isDraggingThis = draggedLead?._id === lead._id;

                        return (
                          <div
                            key={lead._id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', lead._id);
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedLead(lead);
                            }}
                            onDragEnd={() => {
                              setDraggedLead(null);
                              setDragOverStage(null);
                            }}
                            onClick={() => handleOpenView(lead)}
                            className={`bg-white p-3 rounded-xl border shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing space-y-2 group select-none relative ${
                              isDraggingThis
                                ? 'opacity-30 border-dashed border-brand scale-95 shadow-none'
                                : 'border-slate-200 hover:border-brand hover:shadow-md hover:-translate-y-0.5'
                            }`}
                            title="Drag to change stage"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1 min-w-0">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 cursor-grab" />
                                <span className="font-bold text-slate-900 text-xs group-hover:text-brand line-clamp-1">
                                  {lead.company_name}
                                </span>
                              </div>
                              {getPriorityBadge(lead.priority)}
                            </div>

                            <div className="text-[11px] text-slate-500 line-clamp-1 pl-4">
                              {lead.lead_name} {lead.city ? `• ${lead.city}` : ''}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                              <span className="font-mono font-bold text-slate-800">
                                ₹{Number(lead.estimated_value || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">{lead.lead_source}</span>
                            </div>

                            {lead.next_followup_date && (
                              <div className="pt-0.5 flex items-center justify-between text-[10px]">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${dateStatus?.color}`}>
                                  <Calendar className="w-2.5 h-2.5" />
                                  {new Date(lead.next_followup_date).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span className="text-slate-400 font-mono">{lead.assigned_to?.split(' ')[0]}</span>
                              </div>
                            )}

                            {/* Quick Stage Switcher or Quick Follow-up button */}
                            <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 text-[10px]">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Move:</span>
                                <select
                                  value={lead.status}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleQuickMoveStage(lead, e.target.value, e)}
                                  className="text-[10px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200 outline-none cursor-pointer"
                                >
                                  {pipelineStages.map((s) => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                  ))}
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenScheduleFollowup(lead);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-amber-50 transition"
                                title="Schedule Follow-up"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: FOLLOW-UPS HUB */}
      {/* ==================================================================== */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          {/* Sub-tabs for Followups */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFollowupTab('today')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  followupTab === 'today'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Due Today ({summary?.followups?.dueToday || 0})
              </button>

              <button
                type="button"
                onClick={() => setFollowupTab('overdue')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  followupTab === 'overdue'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" /> Overdue Calls ({summary?.followups?.overdue || 0})
              </button>

              <button
                type="button"
                onClick={() => setFollowupTab('upcoming')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  followupTab === 'upcoming'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Upcoming ({summary?.followups?.upcoming || 0})
              </button>

              <button
                type="button"
                onClick={() => setFollowupTab('completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  followupTab === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed Log
              </button>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Total {followupsList.length} items in this view
            </span>
          </div>

          {/* Follow-ups List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {followupsLoading ? (
              <div className="p-12 text-center text-slate-500 text-xs">Loading follow-ups...</div>
            ) : followupsList.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-slate-700 font-bold text-sm">No follow-ups pending in this view!</p>
                <p className="text-slate-400 text-xs">All scheduled calls and client tasks have been completed.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {followupsList.map((item) => {
                  const f = item.followup;
                  const isOverdue = new Date(f.followup_date) < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div
                      key={f._id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            f.followup_type === 'Phone Call'
                              ? 'bg-blue-50 text-blue-600'
                              : f.followup_type === 'WhatsApp'
                              ? 'bg-emerald-50 text-emerald-600'
                              : f.followup_type === 'Meeting / Visit'
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {f.followup_type === 'WhatsApp' ? (
                            <MessageSquare className="w-5 h-5" />
                          ) : f.followup_type === 'Meeting / Visit' ? (
                            <Building className="w-5 h-5" />
                          ) : (
                            <PhoneCall className="w-5 h-5" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{item.company_name}</span>
                            <span className="text-xs text-slate-500 font-medium">({item.lead_name})</span>
                            {getPriorityBadge(item.priority)}
                            {getStatusBadge(item.lead_status)}
                          </div>

                          <div className="text-xs text-slate-700 font-medium">
                            <span className="text-slate-500">Scheduled: </span>
                            <span className="font-bold">
                              {new Date(f.followup_date).toLocaleDateString('en-IN', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isOverdue && f.status === 'scheduled' && (
                              <span className="ml-2 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded text-[10px]">
                                OVERDUE
                              </span>
                            )}
                          </div>

                          {f.notes && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              "{f.notes}"
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-0.5 font-mono">
                            <span>Phone: {item.mobile}</span>
                            {item.city && <span>City: {item.city}</span>}
                            <span>Assigned: {f.conducted_by || item.assigned_to}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <a
                          href={`tel:${item.mobile}`}
                          className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:text-brand hover:border-brand transition"
                          title="Call Lead"
                        >
                          <Phone className="w-4 h-4" />
                        </a>

                        <a
                          href={`https://wa.me/91${item.mobile.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(item.lead_name)},%20regarding%20our%20scheduled%20follow-up%20for%20Danza%20Son.`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                          title="WhatsApp Follow-up"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>

                        {f.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => handleOpenCompleteFollowup(item, f)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
                          >
                            <Check className="w-4 h-4" /> Log Outcome
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: CREATE LEAD */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Lead Manually"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateLeadSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company / Firm Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shree Balaji Garments"
                value={leadFormData.company_name}
                onChange={(e) => setLeadFormData({ ...leadFormData, company_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Sharma"
                value={leadFormData.lead_name}
                onChange={(e) => setLeadFormData({ ...leadFormData, lead_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 9825012345"
                value={leadFormData.mobile}
                onChange={(e) => setLeadFormData({ ...leadFormData, mobile: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="rajesh@example.com"
                value={leadFormData.email}
                onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
              <select
                value={leadFormData.lead_source}
                onChange={(e) => setLeadFormData({ ...leadFormData, lead_source: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              >
                <option value="WhatsApp">WhatsApp Inquiry</option>
                <option value="IndiaMART">IndiaMART</option>
                <option value="TradeIndia">TradeIndia</option>
                <option value="Website">Official Website</option>
                <option value="Justdial">Justdial</option>
                <option value="Referral">Client Referral</option>
                <option value="Exhibition / Trade Fair">Trade Fair / Exhibition</option>
                <option value="Cold Call">Cold Call / Direct</option>
                <option value="Walk-in">Showroom Walk-in</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interest Category</label>
              <select
                value={leadFormData.interest_type}
                onChange={(e) => setLeadFormData({ ...leadFormData, interest_type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              >
                <option value="Finished Goods">Finished Apparel / T-Shirts</option>
                <option value="Raw Material">Raw Material (Fabric/Yarn)</option>
                <option value="Job Work Processing">Job Work / Stitching Contract</option>
                <option value="Fabric / Yarn">Fabric / Yarn Purchase</option>
                <option value="Custom Manufacturing">Custom Brand Manufacturing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Deal Value (₹)</label>
              <input
                type="number"
                placeholder="e.g. 150000"
                value={leadFormData.estimated_value}
                onChange={(e) => setLeadFormData({ ...leadFormData, estimated_value: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={leadFormData.priority}
                onChange={(e) => setLeadFormData({ ...leadFormData, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                placeholder="Ahmedabad, Surat, Mumbai..."
                value={leadFormData.city}
                onChange={(e) => setLeadFormData({ ...leadFormData, city: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Sales Executive</label>
              <input
                type="text"
                placeholder="e.g. Vikram Mehta"
                value={leadFormData.assigned_to}
                onChange={(e) => setLeadFormData({ ...leadFormData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Requirements & Inquired Items</label>
            <textarea
              rows="2"
              placeholder="e.g. Needs 500 pcs Cotton Polo T-Shirts (L & XL) with custom embroidery."
              value={leadFormData.requirements}
              onChange={(e) => setLeadFormData({ ...leadFormData, requirements: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
            />
          </div>

          {/* Toggle Initial Followup */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={leadFormData.schedule_initial_followup}
                onChange={(e) =>
                  setLeadFormData({ ...leadFormData, schedule_initial_followup: e.target.checked })
                }
                className="rounded border-slate-300 text-brand focus:ring-brand"
              />
              Schedule an Initial Follow-up Call / Meeting right now
            </label>

            {leadFormData.schedule_initial_followup && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={leadFormData.initial_followup_date}
                    onChange={(e) =>
                      setLeadFormData({ ...leadFormData, initial_followup_date: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-brand bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Action Type</label>
                  <select
                    value={leadFormData.initial_followup_type}
                    onChange={(e) =>
                      setLeadFormData({ ...leadFormData, initial_followup_type: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-brand bg-white"
                  >
                    <option value="Phone Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Meeting / Visit">Meeting / Visit</option>
                    <option value="Email">Email</option>
                    <option value="Demo / Sample">Send Sample Kit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Objective / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Discovery call"
                    value={leadFormData.initial_followup_notes}
                    onChange={(e) =>
                      setLeadFormData({ ...leadFormData, initial_followup_notes: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-brand bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 shadow-sm"
            >
              {formSubmitting ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: EDIT LEAD */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Lead: ${selectedLead?.lead_number}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditLeadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Firm Name</label>
              <input
                type="text"
                required
                value={leadFormData.company_name}
                onChange={(e) => setLeadFormData({ ...leadFormData, company_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Name</label>
              <input
                type="text"
                required
                value={leadFormData.lead_name}
                onChange={(e) => setLeadFormData({ ...leadFormData, lead_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="text"
                required
                value={leadFormData.mobile}
                onChange={(e) => setLeadFormData({ ...leadFormData, mobile: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pipeline Status</label>
              <select
                value={leadFormData.status}
                onChange={(e) => setLeadFormData({ ...leadFormData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand font-semibold text-brand"
              >
                <option value="new">New Inquiry</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="quotation_sent">Quotation Sent</option>
                <option value="negotiation">In Negotiation</option>
                <option value="won">Won / Converted</option>
                <option value="lost">Lost</option>
                <option value="junk">Junk</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Value (₹)</label>
              <input
                type="number"
                value={leadFormData.estimated_value}
                onChange={(e) => setLeadFormData({ ...leadFormData, estimated_value: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={leadFormData.priority}
                onChange={(e) => setLeadFormData({ ...leadFormData, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Requirements / Notes</label>
            <textarea
              rows="3"
              value={leadFormData.requirements}
              onChange={(e) => setLeadFormData({ ...leadFormData, requirements: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600"
            >
              {formSubmitting ? 'Updating...' : 'Update Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 3: SCHEDULE FOLLOW-UP */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isAddFollowupModalOpen}
        onClose={() => setIsAddFollowupModalOpen(false)}
        title={`Schedule Follow-up: ${selectedLead?.company_name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleScheduleFollowupSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-800">{selectedLead?.company_name}</div>
            <div className="text-slate-500">Contact: {selectedLead?.lead_name} • {selectedLead?.mobile}</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={followupFormData.followup_date}
              onChange={(e) => setFollowupFormData({ ...followupFormData, followup_date: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Type of Follow-up</label>
            <select
              value={followupFormData.followup_type}
              onChange={(e) => setFollowupFormData({ ...followupFormData, followup_type: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
            >
              <option value="Phone Call">Phone Call</option>
              <option value="WhatsApp">WhatsApp Message</option>
              <option value="Meeting / Visit">Client Meeting / Factory Visit</option>
              <option value="Email">Email Quote</option>
              <option value="Demo / Sample">Dispatch Product Sample</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Purpose / Discussion Objective</label>
            <textarea
              rows="3"
              placeholder="e.g. Call to discuss volume discount and confirm sample delivery."
              value={followupFormData.notes}
              onChange={(e) => setFollowupFormData({ ...followupFormData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Representative Assigned</label>
            <input
              type="text"
              value={followupFormData.conducted_by}
              onChange={(e) => setFollowupFormData({ ...followupFormData, conducted_by: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddFollowupModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
            >
              {formSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 4: LOG FOLLOW-UP OUTCOME / COMPLETE */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isCompleteFollowupModalOpen}
        onClose={() => setIsCompleteFollowupModalOpen(false)}
        title="Log Follow-up Outcome"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCompleteFollowupSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-800">{selectedLead?.company_name}</div>
            <div className="text-slate-600">
              Scheduled: {selectedFollowup && new Date(selectedFollowup.followup_date).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })} ({selectedFollowup?.followup_type})
            </div>
            {selectedFollowup?.notes && <p className="text-slate-500 italic">"{selectedFollowup.notes}"</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Customer Reason & Outcome Notes *
              </label>
              <span className="text-[10px] text-slate-400">Click quick reason below:</span>
            </div>

            {/* Quick Reason Pills */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                'Price is on higher side - requested 10% discount',
                'Will confirm after inspecting sample quality',
                'Pending partner / director approval',
                'Will place order next month with new stock',
                'Comparing quotations with other vendors',
                'Confirming fabric GSM and color specifications',
                'Ready to place trial sample order',
              ].map((reasonPill, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    const current = completionFormData.notes || '';
                    setCompletionFormData({
                      ...completionFormData,
                      notes: current ? current + ' | ' + reasonPill : reasonPill,
                    });
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 border border-slate-200 transition"
                >
                  + {reasonPill}
                </button>
              ))}
            </div>
            <textarea
              rows="3"
              required
              placeholder="What was discussed? Client feedback, questions or negotiated rates..."
              value={completionFormData.notes}
              onChange={(e) => setCompletionFormData({ ...completionFormData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Next Action Required</label>
              <input
                type="text"
                placeholder="e.g. Send Revised Quote"
                value={completionFormData.next_action}
                onChange={(e) => setCompletionFormData({ ...completionFormData, next_action: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Update Lead Pipeline Status</label>
              <select
                value={completionFormData.lead_status}
                onChange={(e) => setCompletionFormData({ ...completionFormData, lead_status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              >
                <option value="">Keep Existing</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="quotation_sent">Quotation Sent</option>
                <option value="negotiation">In Negotiation</option>
                <option value="won">Won Deal</option>
                <option value="lost">Lost Deal</option>
              </select>
            </div>
          </div>

          {/* Schedule Next Followup Checkbox */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={completionFormData.schedule_next}
                onChange={(e) =>
                  setCompletionFormData({ ...completionFormData, schedule_next: e.target.checked })
                }
                className="rounded border-slate-300 text-brand focus:ring-brand"
              />
              Schedule Next Follow-up right now
            </label>

            {completionFormData.schedule_next && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 mb-1">Next Date & Time</label>
                  <input
                    type="datetime-local"
                    value={completionFormData.next_followup_date}
                    onChange={(e) =>
                      setCompletionFormData({ ...completionFormData, next_followup_date: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-800 mb-1">Next Method</label>
                  <select
                    value={completionFormData.next_followup_type}
                    onChange={(e) =>
                      setCompletionFormData({ ...completionFormData, next_followup_type: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="Phone Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Meeting / Visit">Meeting / Visit</option>
                    <option value="Email">Email</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCompleteFollowupModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              {formSubmitting ? 'Saving...' : 'Mark Completed'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 5: VIEW LEAD DETAIL & COMPLETE TIMELINE */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Lead Profile: ${selectedLead?.lead_number}`}
        maxWidth="max-w-3xl"
      >
        {selectedLead && (
          <div className="space-y-5">
            {/* Lead Hero Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">{selectedLead.company_name}</span>
                  {getPriorityBadge(selectedLead.priority)}
                  {getStatusBadge(selectedLead.status)}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                  <span>Contact: <strong>{selectedLead.lead_name}</strong></span>
                  <span>Mobile: <strong>{selectedLead.mobile}</strong></span>
                  {selectedLead.city && <span>City: <strong>{selectedLead.city}</strong></span>}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Est. Deal Value
                </span>
                <span className="text-xl font-black font-mono text-slate-900">
                  ₹{Number(selectedLead.estimated_value || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 pt-1 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenScheduleFollowup(selectedLead);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
              >
                <Calendar className="w-4 h-4 text-amber-600" /> Schedule Follow-up
              </button>

              {selectedLead.status !== 'won' && !selectedLead.converted_customer_id && (
                <button
                  type="button"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenConvert(selectedLead);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Convert to ERP Customer
                </button>
              )}

              <a
                href={`https://wa.me/91${selectedLead.mobile.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp
              </a>
            </div>

            {/* Requirements & Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 block">Lead Details</span>
                <div><span className="text-slate-400">Source:</span> <span className="font-semibold">{selectedLead.lead_source}</span></div>
                <div><span className="text-slate-400">Interest:</span> <span className="font-semibold">{selectedLead.interest_type}</span></div>
                <div><span className="text-slate-400">Assigned To:</span> <span className="font-semibold">{selectedLead.assigned_to}</span></div>
                <div><span className="text-slate-400">Created:</span> <span className="font-semibold">{new Date(selectedLead.createdAt).toLocaleDateString('en-IN')}</span></div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 block">Requirements / Specifications</span>
                <p className="text-slate-600 italic">
                  {selectedLead.requirements || 'No specific product requirements recorded.'}
                </p>
              </div>
            </div>

            {/* Follow-up Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand" /> Follow-up Activity Timeline ({selectedLead.followups?.length || 0})
              </h4>

              {(!selectedLead.followups || selectedLead.followups.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl">
                  No follow-ups recorded yet. Click "Schedule Follow-up" above to plan a call or meeting.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedLead.followups.map((f, idx) => (
                    <div
                      key={f._id || idx}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        f.status === 'completed'
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <span>{f.followup_type}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                              f.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>
                        <p className="text-slate-600">{f.notes || 'No notes entered'}</p>
                        {f.next_action && (
                          <div className="text-[11px] text-brand font-semibold">
                            Next action: {f.next_action}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 text-slate-500 font-mono text-[11px]">
                        <div>
                          {new Date(f.followup_date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">{f.conducted_by}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 6: CONVERT LEAD TO CUSTOMER CONFIRMATION */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Lead to ERP Customer"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
            <div className="font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Ready to convert to registered Customer?
            </div>
            <p className="text-slate-600 leading-relaxed">
              This action will automatically create a new active <strong>Customer</strong> account in the Danza ERP database with all details pre-filled from this lead:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
              <li>Customer Name: <strong>{selectedLead?.company_name}</strong></li>
              <li>Contact Person: <strong>{selectedLead?.lead_name}</strong></li>
              <li>Mobile: <strong>{selectedLead?.mobile}</strong></li>
              <li>City / State: <strong>{selectedLead?.city || 'Gujarat'}</strong></li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsConvertModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={formSubmitting}
              onClick={handleConvertSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              {formSubmitting ? 'Converting...' : 'Confirm & Create Customer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 7: FULL CLIENT COMMUNICATION & REASON HISTORY TIMELINE */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={"Customer Communication & Reasons History: " + (historyModalLead?.company_name || 'Lead')}
        maxWidth="max-w-2xl"
      >
        {historyModalLead && (
          <div className="space-y-4 text-xs">
            {/* Top Summary Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{historyModalLead.company_name}</span>
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">{historyModalLead.lead_number}</span>
                  {getStatusBadge(historyModalLead.status)}
                </div>
                <div className="text-slate-500 flex items-center gap-2 mt-1">
                  <span>Contact: <strong className="text-slate-700">{historyModalLead.lead_name}</strong></span>
                  <span>•</span>
                  <span>Phone: <strong className="text-slate-700">{historyModalLead.mobile}</strong></span>
                  {historyModalLead.city && (
                    <>
                      <span>•</span>
                      <span>{historyModalLead.city}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={"tel:" + historyModalLead.mobile}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold hover:bg-blue-100 transition"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
                <a
                  href={"https://wa.me/91" + historyModalLead.mobile.replace(/\D/g, '') + "?text=Hello%20" + encodeURIComponent(historyModalLead.lead_name) + ",%20following%20up%20from%20Danza%20Son."}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            </div>

            {/* If Lost Reason Exists, Highlight prominently */}
            {historyModalLead.status === 'lost' && historyModalLead.lost_reason && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 space-y-1">
                <div className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-rose-700">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Lead Cancel / Lost Reason</span>
                </div>
                <p className="text-xs font-semibold text-rose-950">
                  "{historyModalLead.lost_reason}"
                </p>
              </div>
            )}

            {/* Initial Inquiry Requirement / Reason */}
            {historyModalLead.requirements && (
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                <div className="font-bold text-[11px] uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Initial Inquiry / Requirement</span>
                </div>
                <p className="text-xs text-indigo-950 font-medium">
                  {historyModalLead.requirements}
                </p>
              </div>
            )}

            {/* Chronological Conversation & Reasons Timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand" />
                  <span>Chronological Reasons & Notes History ({historyModalLead.followups?.length || 0} Records)</span>
                </h4>

                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    handleOpenScheduleFollowup(historyModalLead);
                  }}
                  className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log New Follow-up
                </button>
              </div>

              {(!historyModalLead.followups || historyModalLead.followups.length === 0) ? (
                <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-slate-600">No communication logs recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Use the "Log Follow-up" button to record client discussions and reasons.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {historyModalLead.followups
                    .slice()
                    .sort((a, b) => new Date(b.followup_date || 0) - new Date(a.followup_date || 0))
                    .map((f, idx) => (
                      <div key={idx} className="relative group">
                        {/* Dot */}
                        <div className={"absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-2xs " + (
                          f.status === 'completed'
                            ? 'bg-emerald-500 ring-2 ring-emerald-100'
                            : 'bg-blue-500 ring-2 ring-blue-100'
                        )} />

                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                {f.followup_type === 'WhatsApp' ? (
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                ) : f.followup_type === 'Meeting / Visit' ? (
                                  <Building className="w-3.5 h-3.5 text-purple-600" />
                                ) : (
                                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                                )}
                                <span>{f.followup_type}</span>
                              </span>
                              <span className={"px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider " + (
                                f.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              )}>
                                {f.status}
                              </span>
                            </div>

                            <span className="text-[11px] font-mono text-slate-500">
                              {new Date(f.completed_at || f.followup_date).toLocaleDateString('en-IN', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* Reason / Conversation Notes */}
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                              Customer Response / Reason:
                            </div>
                            <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              "{f.notes || 'No notes specified.'}"
                            </div>
                          </div>

                          {f.next_action && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                              <span className="font-bold text-brand">Next Action:</span>
                              <span>{f.next_action}</span>
                            </div>
                          )}

                          {f.conducted_by && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                              <span>Conducted by:</span>
                              <strong className="text-slate-600">{f.conducted_by}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 shadow-xs transition"
              >
                Close History
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
