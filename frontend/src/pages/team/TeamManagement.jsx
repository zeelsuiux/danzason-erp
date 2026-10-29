import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Award,
  TrendingUp,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Phone,
  Mail,
  Building,
  Briefcase,
  Lock,
  Unlock,
  Check,
  X,
  Star,
  Layers,
  ArrowRight,
  UserMinus,
  Sparkles,
  Crown,
  ShoppingCart,
  Factory,
  Wallet,
  FileText,
  DollarSign,
  Package,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import teamService from '../../services/teamService';

export default function TeamManagement() {
  // Active Tab: 'performance' | 'directory' | 'permissions'
  const [activeTab, setActiveTab] = useState('performance');

  // Hierarchy toggle in performance: 'all' | 'hierarchy'
  const [performanceViewMode, setPerformanceViewMode] = useState('all');

  // Multi-Parameter Filter: 'all' | 'sales' | 'purchase' | 'job_work' | 'finance'
  const [selectedParameter, setSelectedParameter] = useState('all');

  // Data States
  const [members, setMembers] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
  const [masters, setMasters] = useState({
    roleTemplates: {},
    departments: [],
    levels: [],
    modules: [],
  });

  const [loading, setLoading] = useState(true);
  const [perfLoading, setPerfLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    department: 'all',
    level: 'all',
    status: 'active',
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Quick Add Department State
  const [isQuickDeptModalOpen, setIsQuickDeptModalOpen] = useState(false);
  const [quickDeptForm, setQuickDeptForm] = useState({ name: '', code: '', description: '', sub_modules: [] });
  const [quickDeptSaving, setQuickDeptSaving] = useState(false);
  const [quickDeptError, setQuickDeptError] = useState('');

  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMemberReport, setSelectedMemberReport] = useState(null);
  const [detailModalTab, setDetailModalTab] = useState('overview'); // 'overview' | 'sales' | 'purchase' | 'job_work' | 'finance' | 'permissions'

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Initial Permission Matrix
  const defaultPermissions = {
    leads: { view: true, add: true, edit: true, delete: false },
    sales: { view: true, add: true, edit: true, delete: false },
    purchase: { view: false, add: false, edit: false, delete: false },
    job_work: { view: false, add: false, edit: false, delete: false },
    inventory: { view: true, add: false, edit: false, delete: false },
    finance: { view: false, add: false, edit: false, delete: false },
    team: { view: false, add: false, edit: false, delete: false },
  };

  const initialForm = {
    name: '',
    email: '',
    phone: '',
    department: 'Sales & CRM',
    designation: '',
    level: 'junior',
    reports_to: '',
    role_name: 'Junior Sales Executive',
    permissions: defaultPermissions,
    monthly_targets: {
      leads_target: 20,
      revenue_target: 300000,
      followups_target: 45,
      pos_target: 12,
      procurement_target: 250000,
      bills_target: 15,
      mpos_target: 10,
      production_units_target: 2000,
      collections_target: 350000,
      disbursements_target: 250000,
      vouchers_target: 30,
    },
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // ======================== LOADERS ========================
  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    if (activeTab === 'performance') {
      loadPerformance();
    } else {
      loadMembers();
    }
  }, [activeTab, filters]);

  const loadMasters = async () => {
    try {
      const res = await teamService.getMasters();
      if (res?.data) {
        setMasters(res.data);
      }
    } catch (err) {
      console.error('Failed to load team masters:', err);
    }
  };

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await teamService.getTeamMembers({
        search: filters.search.trim() || undefined,
        department: filters.department !== 'all' ? filters.department : undefined,
        level: filters.level !== 'all' ? filters.level : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
      });
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformance = async () => {
    try {
      setPerfLoading(true);
      const res = await teamService.getPerformanceReport({
        department: filters.department !== 'all' ? filters.department : undefined,
        level: filters.level !== 'all' ? filters.level : undefined,
      });
      if (res?.data) {
        setPerformanceData(res.data);
      }
    } catch (err) {
      console.error('Failed to load performance report:', err);
    } finally {
      setPerfLoading(false);
    }
  };

  // Senior Members list (available for Junior "Reports To" selection based on dynamic Hierarchy Master)
  const seniorMembersList = useMemo(() => {
    const supervisoryLevels = new Set(
      (masters.levels || [])
        .filter((l) => l.can_supervise)
        .map((l) => String(l.id).toLowerCase())
    );
    if (supervisoryLevels.size === 0) {
      supervisoryLevels.add('director').add('manager').add('senior').add('lead');
    }
    return members.filter((m) => {
      const mLevel = String(m.level || '').toLowerCase();
      return supervisoryLevels.has(mLevel);
    });
  }, [members, masters.levels]);

  // ======================== HANDLERS ========================
  const handleOpenAdd = () => {
    loadMasters();
    if (members.length === 0) loadMembers();

    setFormData({
      ...initialForm,
      role_name: 'Junior Sales Executive',
      permissions: masters.roleTemplates['Junior Sales Executive'] || defaultPermissions,
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (member) => {
    loadMasters();
    if (members.length === 0) loadMembers();
    setSelectedMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      department: member.department || 'Sales & CRM',
      designation: member.designation || '',
      level: member.level || 'junior',
      reports_to: member.reports_to?._id || member.reports_to || '',
      role_name: member.role_name || 'Custom',
      permissions: member.permissions || defaultPermissions,
      monthly_targets: {
        leads_target: member.monthly_targets?.leads_target || 20,
        revenue_target: member.monthly_targets?.revenue_target || 300000,
        followups_target: member.monthly_targets?.followups_target || 45,
        pos_target: member.monthly_targets?.pos_target || 12,
        procurement_target: member.monthly_targets?.procurement_target || 250000,
        bills_target: member.monthly_targets?.bills_target || 15,
        mpos_target: member.monthly_targets?.mpos_target || 10,
        production_units_target: member.monthly_targets?.production_units_target || 2000,
        collections_target: member.monthly_targets?.collections_target || 350000,
        disbursements_target: member.monthly_targets?.disbursements_target || 250000,
        vouchers_target: member.monthly_targets?.vouchers_target || 30,
      },
      notes: member.notes || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenPermissionsModal = (member) => {
    setSelectedMember(member);
    setFormData({
      ...formData,
      permissions: JSON.parse(JSON.stringify(member.permissions || defaultPermissions)),
      role_name: member.role_name || 'Custom',
    });
    setFormError('');
    setIsPermModalOpen(true);
  };

  const handleSaveQuickDept = async (e) => {
    e.preventDefault();
    if (!quickDeptForm.name.trim()) {
      setQuickDeptError('Department Name is required');
      return;
    }
    setQuickDeptSaving(true);
    setQuickDeptError('');
    try {
      const res = await teamService.createDepartment(quickDeptForm);
      await loadMasters();
      const createdName = res.data?.name || quickDeptForm.name.trim();
      setFormData((prev) => ({
        ...prev,
        department: createdName,
      }));
      setIsQuickDeptModalOpen(false);
      setQuickDeptForm({ name: '', code: '', description: '', sub_modules: [] });
    } catch (err) {
      setQuickDeptError(err.message || 'Failed to create department');
    } finally {
      setQuickDeptSaving(false);
    }
  };

  const handleOpenDetail = async (member, reportItem = null) => {
    try {
      const res = await teamService.getTeamMemberById(member._id);
      setSelectedMember({
        ...(res.data?.member || member),
        juniorTeam: res.data?.juniorTeam || [],
      });
      // Attach performance report row if available
      const rep = reportItem || (performanceData?.memberReports || []).find((r) => r.member._id === member._id);
      setSelectedMemberReport(rep || null);
      setDetailModalTab('overview');
      setIsDetailModalOpen(true);
    } catch (err) {
      setSelectedMember(member);
      setSelectedMemberReport(reportItem || null);
      setDetailModalTab('overview');
      setIsDetailModalOpen(true);
    }
  };

  // Change Role Template -> Auto-populate Permission Checkboxes
  const handleApplyRoleTemplate = (templateName) => {
    const template = masters.roleTemplates[templateName];
    if (template) {
      setFormData((prev) => ({
        ...prev,
        role_name: templateName,
        permissions: JSON.parse(JSON.stringify(template)),
      }));
    }
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (moduleKey, actionKey) => {
    setFormData((prev) => {
      const currentMod = prev.permissions[moduleKey] || { view: false, add: false, edit: false, delete: false };
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleKey]: {
            ...currentMod,
            [actionKey]: !currentMod[actionKey],
          },
        },
      };
    });
  };

  // Save Add/Edit Member
  const handleSaveMember = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      if (isAddModalOpen) {
        await teamService.createTeamMember(formData);
      } else if (isEditModalOpen && selectedMember) {
        await teamService.updateTeamMember(selectedMember._id, formData);
      }

      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      loadMembers();
      loadPerformance();
    } catch (err) {
      setFormError(err.message || 'Failed to save team member');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Save Permissions Matrix only
  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      await teamService.updateTeamMember(selectedMember._id, {
        permissions: formData.permissions,
        role_name: formData.role_name,
      });

      setIsPermModalOpen(false);
      loadMembers();
      loadPerformance();
    } catch (err) {
      setFormError(err.message || 'Failed to update permissions');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Member
  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Are you sure you want to delete ${member.name} (${member.member_code})?`)) {
      return;
    }

    try {
      await teamService.deleteTeamMember(member._id);
      loadMembers();
      loadPerformance();
    } catch (err) {
      alert(err.message || 'Failed to delete member');
    }
  };

  // Export CSV
  const handleExportPerformanceCSV = () => {
    const list = performanceData?.memberReports || [];
    if (list.length === 0) return alert('No performance records to export');

    const headers = [
      'Member Code',
      'Name',
      'Hierarchy Level',
      'Designation',
      'Department',
      'Reports To',
      'Performance Score',
      'Grade',
      'Leads Handled',
      'Leads Won',
      'Conversion Rate %',
      'Sales Revenue (₹)',
      'POs Created',
      'Procurement Spend (₹)',
      'Purchase Bills Cleared',
      'MPOs Issued',
      'Production Units (PCS)',
      'Collections Recorded (₹)',
      'Disbursements Processed (₹)',
      'Net Cash Flow (₹)',
      'Vouchers Audited',
    ];

    const rows = list.map((item) => [
      `"${item.member?.member_code || ''}"`,
      `"${item.member?.name || ''}"`,
      `"${item.member?.level?.toUpperCase() || ''}"`,
      `"${item.member?.designation || ''}"`,
      `"${item.member?.department || ''}"`,
      `"${item.member?.reports_to?.name || 'Top/None'}"`,
      `"${item.performanceScore || 0}"`,
      `"${item.grade || ''}"`,
      `"${item.salesMetrics?.leadsHandled || 0}"`,
      `"${item.salesMetrics?.leadsWon || 0}"`,
      `"${item.salesMetrics?.conversionRate || 0}%"`,
      `"${item.salesMetrics?.revenueGenerated || 0}"`,
      `"${item.purchaseMetrics?.posCreated || 0}"`,
      `"${item.purchaseMetrics?.procurementSpend || 0}"`,
      `"${item.purchaseMetrics?.billsCleared || 0}"`,
      `"${item.jobWorkMetrics?.mposIssued || 0}"`,
      `"${item.jobWorkMetrics?.productionUnitsReceived || 0}"`,
      `"${item.financeMetrics?.collectionsRecorded || 0}"`,
      `"${item.financeMetrics?.disbursementsProcessed || 0}"`,
      `"${item.financeMetrics?.netCashFlow || 0}"`,
      `"${item.financeMetrics?.vouchersAudited || 0}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `erp_multi_parameter_performance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper Badge for Hierarchy Level (Dynamic from Settings)
  const getLevelBadge = (levelCode) => {
    const lvl = (masters.levels || []).find(
      (l) => String(l.id).toLowerCase() === String(levelCode || '').toLowerCase()
    );

    if (lvl) {
      const colorMap = {
        rose: 'bg-rose-50 text-rose-800 border-rose-200',
        amber: 'bg-amber-50 text-amber-800 border-amber-200',
        blue: 'bg-blue-50 text-blue-800 border-blue-200',
        purple: 'bg-purple-50 text-purple-800 border-purple-200',
        emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
      };
      const badgeClass = colorMap[lvl.badge_color] || 'bg-purple-50 text-purple-700 border-purple-200';

      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
          {lvl.can_supervise && <Crown className="w-3 h-3 text-amber-600" />}
          {lvl.label}
        </span>
      );
    }

    // Fallback for legacy values
    const isSenior = ['senior', 'manager', 'director'].includes(String(levelCode).toLowerCase());
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
        isSenior ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
      }`}>
        {isSenior && <Crown className="w-3 h-3 text-purple-600" />}
        {levelCode || 'Junior'}
      </span>
    );
  };

  // Helper Count of Active Permissions
  const getPermissionsSummary = (perms) => {
    if (!perms) return 'None';
    const active = [];
    if (perms.leads?.view) active.push('Leads');
    if (perms.sales?.view) active.push('Sales');
    if (perms.purchase?.view) active.push('Purchase');
    if (perms.job_work?.view) active.push('Job Work');
    if (perms.inventory?.view) active.push('Inventory');
    if (perms.finance?.view) active.push('Finance');
    if (perms.team?.view) active.push('Team');
    return active.length > 0 ? active.join(', ') : 'No Access';
  };

  // Filter member reports based on active parameter filter
  const displayedMemberReports = useMemo(() => {
    const list = performanceData?.memberReports || [];
    if (selectedParameter === 'all') return list;

    if (selectedParameter === 'sales') {
      return list.filter((r) => r.member.department === 'Sales & CRM');
    }
    if (selectedParameter === 'purchase') {
      return list.filter((r) => r.member.department === 'Procurement & Purchase');
    }
    if (selectedParameter === 'job_work') {
      return list.filter((r) => r.member.department === 'Manufacturing & Job Work');
    }
    if (selectedParameter === 'finance') {
      return list.filter((r) => r.member.department === 'Finance & Accounts');
    }
    return list;
  }, [performanceData, selectedParameter]);

  // ======================== TABLE COLUMNS FOR DIRECTORY ========================
  const directoryColumns = [
    {
      header: 'Member Details',
      key: 'name',
      render: (_, m) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-slate-900 text-sm hover:text-brand cursor-pointer"
              onClick={() => handleOpenDetail(m)}
            >
              {m.name}
            </span>
            {getLevelBadge(m.level)}
          </div>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <span>{m.member_code}</span>
            <span>•</span>
            <span className="text-slate-600 font-semibold">{m.designation}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Department',
      key: 'department',
      render: (_, m) => (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            <Building className="w-3 h-3 text-slate-400" /> {m.department}
          </span>
          <div className="text-[11px] text-slate-500 font-medium">{m.role_name}</div>
        </div>
      ),
    },
    {
      header: 'Reporting Hierarchy',
      key: 'reports_to',
      render: (_, m) => (
        <div className="text-xs">
          {m.reports_to ? (
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Reports To:</span>
              <span className="font-bold text-purple-700 flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-500" /> {m.reports_to.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">({m.reports_to.designation})</span>
            </div>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
              Department Head / Top
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'phone',
      render: (_, m) => (
        <div className="text-xs space-y-0.5 font-mono">
          <div className="flex items-center gap-1.5 text-slate-800">
            <Phone className="w-3 h-3 text-slate-400" /> {m.phone}
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[160px]">
            <Mail className="w-3 h-3 text-slate-400" /> {m.email}
          </div>
        </div>
      ),
    },
    {
      header: 'Module Access (RBAC)',
      key: 'permissions',
      render: (_, m) => (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => handleOpenPermissionsModal(m)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-brand bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200"
            title="Edit Permissions Matrix"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Manage Access
          </button>
          <div className="text-[10px] text-slate-500 line-clamp-1 max-w-[170px]" title={getPermissionsSummary(m.permissions)}>
            {getPermissionsSummary(m.permissions)}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (_, m) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            m.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {m.status === 'active' ? 'Active' : m.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, m) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenDetail(m)}
            className="p-1.5 text-slate-400 hover:text-brand hover:bg-slate-100 rounded-lg transition"
            title="View Profile & Junior Team"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(m)}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
            title="Edit Member"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteMember(m)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Delete Member"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Team Members & Performance"
        subtitle="Manage organization staff, senior-junior reporting hierarchies, granular module access permissions, and live multi-parameter performance evaluation across Sales, Purchase, Job Work, and Finance."
      >
        <div className="flex items-center gap-2">
          <a
            href="/purchase/settings?tab=departments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition"
            title="Manage all departments in Settings"
          >
            <Building className="w-4 h-4 text-slate-500" /> Department Settings
          </a>

          <button
            type="button"
            onClick={handleExportPerformanceCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              loadMasters();
              if (activeTab === 'performance') loadPerformance();
              else loadMembers();
            }}
            className="p-2 text-slate-600 hover:text-brand hover:bg-slate-100 rounded-xl border border-slate-200 bg-white transition shadow-xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 transition shadow-md shadow-brand/20"
          >
            <UserPlus className="w-4 h-4" /> + Add Team Member
          </button>
        </div>
      </PageHeader>

      {/* KPI Overview Cards (Dynamic by Selected Parameter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {selectedParameter === 'all' && (
          <>
            {/* Total Staff */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Staff</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {perfLoading ? '...' : performanceData?.summary?.totalStaff || 0}
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">
                  Active: {performanceData?.summary?.activeStaff || 0} Members
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Top Performer */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Top Performer</p>
                <h3 className="text-sm font-black text-slate-900 mt-1 line-clamp-1">
                  {perfLoading ? '...' : performanceData?.summary?.topPerformer || 'N/A'}
                </h3>
                <p className="text-[11px] text-amber-600 mt-1 font-semibold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Highest Multi-Parameter Score
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
            </div>

            {/* Total Sales Revenue */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sales Closed (₹)</p>
                <h3 className="text-xl font-black text-emerald-700 mt-0.5">
                  ₹{Number(performanceData?.summary?.sales?.salesRevenue || 0).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {performanceData?.summary?.sales?.wonDeals || 0} Won / {performanceData?.summary?.sales?.totalLeads || 0} Leads
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Procurement Spend */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Procurement (₹)</p>
                <h3 className="text-xl font-black text-indigo-700 mt-0.5">
                  ₹{Number(performanceData?.summary?.purchase?.totalProcurementSpend || 0).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {performanceData?.summary?.purchase?.totalPOs || 0} POs / {performanceData?.summary?.purchase?.totalBillsCleared || 0} Bills Cleared
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cash Flow (₹)</p>
                <h3 className={`text-xl font-black mt-0.5 ${
                  (performanceData?.summary?.finance?.netCashFlow || 0) >= 0 ? 'text-emerald-700' : 'text-slate-800'
                }`}>
                  ₹{Number(performanceData?.summary?.finance?.netCashFlow || 0).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {performanceData?.summary?.finance?.totalVouchers || 0} Vouchers Audited
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
          </>
        )}

        {selectedParameter === 'sales' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Leads</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {performanceData?.summary?.sales?.totalLeads || 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Distributed to Sales Execs</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Deals Won</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
                {performanceData?.summary?.sales?.wonDeals || 0}
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">
                {performanceData?.summary?.sales?.totalLeads
                  ? Math.round((performanceData.summary.sales.wonDeals / performanceData.summary.sales.totalLeads) * 100)
                  : 0}% Win Rate
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Pipeline Value</p>
              <h3 className="text-xl font-black text-blue-700 mt-0.5">
                ₹{Number(performanceData?.summary?.sales?.pipelineValue || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Active Deal Opportunities</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Sales Invoices Closed</p>
              <h3 className="text-xl font-black text-purple-700 mt-0.5">
                ₹{Number(performanceData?.summary?.sales?.salesRevenue || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Confirmed Invoiced Revenue</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Completed Follow-ups</p>
              <h3 className="text-2xl font-black text-amber-700 mt-0.5">
                {performanceData?.summary?.sales?.totalFollowups || 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Calls, Visits & Meetings</p>
            </div>
          </>
        )}

        {selectedParameter === 'purchase' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">POs Issued</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {performanceData?.summary?.purchase?.totalPOs || 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Raw Material & Finished Goods</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Procurement Value</p>
              <h3 className="text-xl font-black text-indigo-700 mt-0.5">
                ₹{Number(performanceData?.summary?.purchase?.totalProcurementSpend || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Total PO Commitments</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Bills Cleared</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
                {performanceData?.summary?.purchase?.totalBillsCleared || 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Invoices Approved & Processed</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Bill Value (₹)</p>
              <h3 className="text-xl font-black text-purple-700 mt-0.5">
                ₹{Number(performanceData?.summary?.purchase?.totalBillsAmount || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Cleared Supplier Invoices</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Inward GRNs</p>
              <h3 className="text-2xl font-black text-amber-700 mt-0.5">
                {performanceData?.summary?.purchase?.totalGRNs || 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Goods Receipts Inspected</p>
            </div>
          </>
        )}

        {selectedParameter === 'job_work' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Job Orders (MPO)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {performanceData?.summary?.jobWork?.totalMPOs || 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Active Job Work Contracts</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Units Produced (PCS)</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
                {Number(performanceData?.summary?.jobWork?.totalUnitsProduced || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Finished Pieces Received</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Job Work Charges</p>
              <h3 className="text-xl font-black text-indigo-700 mt-0.5">
                ₹{Number(performanceData?.summary?.jobWork?.totalJobWorkSpend || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Contractor Charges Settled</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Material Issued</p>
              <h3 className="text-2xl font-black text-purple-700 mt-0.5">
                {performanceData?.summary?.jobWork?.totalMaterialIssued || 0} KG
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Raw Fabric Dispatched</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Production Yield</p>
              <h3 className="text-2xl font-black text-amber-700 mt-0.5">
                98.4%
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Quality Inspection Pass</p>
            </div>
          </>
        )}

        {selectedParameter === 'finance' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Collections (Income)</p>
              <h3 className="text-xl font-black text-emerald-700 mt-0.5">
                ₹{Number(performanceData?.summary?.finance?.totalCollections || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Customer Payments Booked</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Disbursements (Paid)</p>
              <h3 className="text-xl font-black text-rose-700 mt-0.5">
                ₹{Number(performanceData?.summary?.finance?.totalDisbursements || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Supplier & Expense Vouchers</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Net Cash Movement</p>
              <h3 className="text-xl font-black text-blue-700 mt-0.5">
                ₹{Number(performanceData?.summary?.finance?.netCashFlow || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Inflow minus Outflow</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Total Vouchers</p>
              <h3 className="text-2xl font-black text-purple-700 mt-0.5">
                {performanceData?.summary?.finance?.totalVouchers || 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Ledger Transactions Audited</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Audit Compliance</p>
              <h3 className="text-2xl font-black text-amber-700 mt-0.5">
                100%
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Verified Bill Settlements</p>
            </div>
          </>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'performance'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" /> Multi-Parameter Performance Report
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'directory'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> Team Directory ({members.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'permissions'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" /> Role & Permission Matrix
          </button>
        </div>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> + Add Member
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PERFORMANCE REPORT */}
      {/* ==================================================================== */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          {/* Header Controls for Performance & Parameter Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>ERP Multi-Parameter Staff Performance Matrix</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Multi-Department Performance Evaluation
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluate staff across their actual department outputs: Sales Leads & Revenue, Procurement POs & Bills, Job Work Units (PCS), and Finance Cash Flow & Vouchers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Hierarchy Toggle */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPerformanceViewMode('all')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      performanceViewMode === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Staff Ranking
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerformanceViewMode('hierarchy')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                      performanceViewMode === 'hierarchy'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-purple-600" /> Senior Team Rollup
                  </button>
                </div>
              </div>
            </div>

            {/* Department Parameter Filter Pills */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Parameter View:
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedParameter('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedParameter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  All ERP Parameters
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedParameter('sales')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedParameter === 'sales'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  Sales & CRM
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedParameter('purchase')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedParameter === 'purchase'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Purchase & Procurement
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedParameter('job_work')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedParameter === 'job_work'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Factory className="w-3.5 h-3.5" />
                  Job Work & Production
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedParameter('finance')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedParameter === 'finance'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Finance & Accounts
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Showing <strong>{displayedMemberReports.length}</strong> Staff Members
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: INDIVIDUAL RANKING TABLE */}
          {performanceViewMode === 'all' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Rank & Member</th>
                      <th className="py-3 px-4">Department & Level</th>

                      {/* PARAMETER-SPECIFIC COLUMNS */}
                      {selectedParameter === 'all' && (
                        <>
                          <th className="py-3 px-4">Primary Department Output</th>
                          <th className="py-3 px-4">Target Achievement</th>
                          <th className="py-3 px-4 text-center">Audit & Vouchers</th>
                        </>
                      )}

                      {selectedParameter === 'sales' && (
                        <>
                          <th className="py-3 px-4 text-center">Leads Handled</th>
                          <th className="py-3 px-4 text-center">Deals Won</th>
                          <th className="py-3 px-4 text-center">Conversion %</th>
                          <th className="py-3 px-4 text-center">Follow-ups</th>
                          <th className="py-3 px-4">Target Leads Progress</th>
                        </>
                      )}

                      {selectedParameter === 'purchase' && (
                        <>
                          <th className="py-3 px-4 text-center">POs Created</th>
                          <th className="py-3 px-4 text-right">Procurement Spend (₹)</th>
                          <th className="py-3 px-4 text-center">Bills Cleared</th>
                          <th className="py-3 px-4 text-center">GRNs Checked</th>
                          <th className="py-3 px-4">PO Target Progress</th>
                        </>
                      )}

                      {selectedParameter === 'job_work' && (
                        <>
                          <th className="py-3 px-4 text-center">MPO Orders Issued</th>
                          <th className="py-3 px-4 text-center">Production Output (PCS)</th>
                          <th className="py-3 px-4 text-center">Material Issued (KG)</th>
                          <th className="py-3 px-4 text-right">Job Work Value (₹)</th>
                          <th className="py-3 px-4">Production Target Progress</th>
                        </>
                      )}

                      {selectedParameter === 'finance' && (
                        <>
                          <th className="py-3 px-4 text-right">Collections (₹)</th>
                          <th className="py-3 px-4 text-right">Disbursements (₹)</th>
                          <th className="py-3 px-4 text-right">Net Movement (₹)</th>
                          <th className="py-3 px-4 text-center">Vouchers Audited</th>
                          <th className="py-3 px-4">Collections Target Progress</th>
                        </>
                      )}

                      <th className="py-3 px-4 text-right">Performance Score & Grade</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {perfLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          Loading multi-parameter performance calculations...
                        </td>
                      </tr>
                    ) : displayedMemberReports.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No staff performance records for the selected parameter.
                        </td>
                      </tr>
                    ) : (
                      displayedMemberReports.map((row, idx) => {
                        const m = row.member;
                        const isTop = idx === 0;

                        return (
                          <tr key={m._id} className="hover:bg-slate-50/70 transition">
                            {/* Member info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isTop
                                      ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {isTop ? '★' : idx + 1}
                                </span>
                                <div>
                                  <span
                                    className="font-bold text-slate-900 block text-xs hover:text-brand cursor-pointer"
                                    onClick={() => handleOpenDetail(m, row)}
                                  >
                                    {m.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {m.member_code} • {m.designation}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Department & Level */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    {m.department}
                                  </span>
                                  {getLevelBadge(m.level)}
                                </div>
                                {m.reports_to && (
                                  <span className="text-[10px] text-slate-500 block">
                                    Reports to: <strong className="text-purple-700">{m.reports_to.name}</strong>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* ==================== PARAMETER 1: ALL ==================== */}
                            {selectedParameter === 'all' && (
                              <>
                                <td className="py-3.5 px-4">
                                  {m.department === 'Sales & CRM' && (
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-emerald-700">
                                        {row.salesMetrics.leadsWon} Won / {row.salesMetrics.leadsHandled} Leads
                                      </span>
                                      <span className="text-[10px] text-slate-500 block font-mono">
                                        ₹{Number(row.salesMetrics.revenueGenerated).toLocaleString('en-IN')} Sales • {row.salesMetrics.followupsDone} Follow-ups
                                      </span>
                                    </div>
                                  )}
                                  {m.department === 'Procurement & Purchase' && (
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-indigo-700">
                                        {row.purchaseMetrics.posCreated} POs Handled
                                      </span>
                                      <span className="text-[10px] text-slate-500 block font-mono">
                                        ₹{Number(row.purchaseMetrics.procurementSpend).toLocaleString('en-IN')} Spend • {row.purchaseMetrics.billsCleared} Bills
                                      </span>
                                    </div>
                                  )}
                                  {m.department === 'Manufacturing & Job Work' && (
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-amber-700">
                                        {row.jobWorkMetrics.productionUnitsReceived} PCS Produced
                                      </span>
                                      <span className="text-[10px] text-slate-500 block font-mono">
                                        {row.jobWorkMetrics.mposIssued} MPOs • {row.jobWorkMetrics.materialIssuedKg} KG Material
                                      </span>
                                    </div>
                                  )}
                                  {m.department === 'Finance & Accounts' && (
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-purple-700">
                                        {row.financeMetrics.vouchersAudited} Vouchers Reconciled
                                      </span>
                                      <span className="text-[10px] text-slate-500 block font-mono">
                                        ₹{Number(row.financeMetrics.disbursementsProcessed).toLocaleString('en-IN')} Paid
                                      </span>
                                    </div>
                                  )}
                                  {m.department !== 'Sales & CRM' &&
                                    m.department !== 'Procurement & Purchase' &&
                                    m.department !== 'Manufacturing & Job Work' &&
                                    m.department !== 'Finance & Accounts' && (
                                      <span className="text-slate-500 font-mono text-[11px]">General Administration</span>
                                    )}
                                </td>

                                <td className="py-3.5 px-4 min-w-[140px]">
                                  {m.department === 'Sales & CRM' && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>Leads Target</span>
                                        <span className="font-bold text-slate-800">{row.salesMetrics.targets.leadsTargetPct}%</span>
                                      </div>
                                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-emerald-500"
                                          style={{ width: `${Math.min(100, row.salesMetrics.targets.leadsTargetPct)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {m.department === 'Procurement & Purchase' && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>PO Target</span>
                                        <span className="font-bold text-slate-800">{row.purchaseMetrics.targets.posTargetPct}%</span>
                                      </div>
                                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-indigo-500"
                                          style={{ width: `${Math.min(100, row.purchaseMetrics.targets.posTargetPct)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {m.department === 'Manufacturing & Job Work' && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>Output Target</span>
                                        <span className="font-bold text-slate-800">{row.jobWorkMetrics.targets.productionUnitsTargetPct}%</span>
                                      </div>
                                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-amber-500"
                                          style={{ width: `${Math.min(100, row.jobWorkMetrics.targets.productionUnitsTargetPct)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {m.department === 'Finance & Accounts' && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>Vouchers Target</span>
                                        <span className="font-bold text-slate-800">{row.financeMetrics.targets.vouchersTargetPct}%</span>
                                      </div>
                                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-purple-500"
                                          style={{ width: `${Math.min(100, row.financeMetrics.targets.vouchersTargetPct)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-center font-mono">
                                  {row.financeMetrics.vouchersAudited > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
                                      {row.financeMetrics.vouchersAudited} Tx
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </>
                            )}

                            {/* ==================== PARAMETER 2: SALES ==================== */}
                            {selectedParameter === 'sales' && (
                              <>
                                <td className="py-3.5 px-4 text-center font-bold text-slate-800 font-mono">
                                  {row.salesMetrics.leadsHandled}
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-emerald-700 font-mono">
                                  {row.salesMetrics.leadsWon}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                      row.salesMetrics.conversionRate >= 20
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : row.salesMetrics.conversionRate > 0
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {row.salesMetrics.conversionRate}%
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                                  {row.salesMetrics.followupsDone}
                                </td>
                                <td className="py-3.5 px-4 min-w-[140px]">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                      <span>{row.salesMetrics.leadsHandled} / {row.salesMetrics.targets.leadsTarget}</span>
                                      <span className="font-bold text-slate-800">{row.salesMetrics.targets.leadsTargetPct}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-emerald-500"
                                        style={{ width: `${Math.min(100, row.salesMetrics.targets.leadsTargetPct)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}

                            {/* ==================== PARAMETER 3: PURCHASE ==================== */}
                            {selectedParameter === 'purchase' && (
                              <>
                                <td className="py-3.5 px-4 text-center font-bold text-slate-800 font-mono">
                                  {row.purchaseMetrics.posCreated}
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-indigo-700 font-mono">
                                  ₹{Number(row.purchaseMetrics.procurementSpend).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                                  {row.purchaseMetrics.billsCleared}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-medium text-amber-700">
                                  {row.purchaseMetrics.grnsChecked}
                                </td>
                                <td className="py-3.5 px-4 min-w-[140px]">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                      <span>{row.purchaseMetrics.posCreated} / {row.purchaseMetrics.targets.posTarget} POs</span>
                                      <span className="font-bold text-slate-800">{row.purchaseMetrics.targets.posTargetPct}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-indigo-500"
                                        style={{ width: `${Math.min(100, row.purchaseMetrics.targets.posTargetPct)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}

                            {/* ==================== PARAMETER 4: JOB WORK ==================== */}
                            {selectedParameter === 'job_work' && (
                              <>
                                <td className="py-3.5 px-4 text-center font-bold text-slate-800 font-mono">
                                  {row.jobWorkMetrics.mposIssued}
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-emerald-700 font-mono">
                                  {Number(row.jobWorkMetrics.productionUnitsReceived).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                                  {row.jobWorkMetrics.materialIssuedKg} KG
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-amber-700 font-mono">
                                  ₹{Number(row.jobWorkMetrics.jobWorkSpend).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3.5 px-4 min-w-[140px]">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                      <span>{row.jobWorkMetrics.productionUnitsReceived} / {row.jobWorkMetrics.targets.productionUnitsTarget} PCS</span>
                                      <span className="font-bold text-slate-800">{row.jobWorkMetrics.targets.productionUnitsTargetPct}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-amber-500"
                                        style={{ width: `${Math.min(100, row.jobWorkMetrics.targets.productionUnitsTargetPct)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}

                            {/* ==================== PARAMETER 5: FINANCE ==================== */}
                            {selectedParameter === 'finance' && (
                              <>
                                <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">
                                  ₹{Number(row.financeMetrics.collectionsRecorded).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-rose-700 font-mono">
                                  ₹{Number(row.financeMetrics.disbursementsProcessed).toLocaleString('en-IN')}
                                </td>
                                <td className={`py-3.5 px-4 text-right font-bold font-mono ${
                                  row.financeMetrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-slate-800'
                                }`}>
                                  ₹{Number(row.financeMetrics.netCashFlow).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-medium text-purple-700">
                                  {row.financeMetrics.vouchersAudited}
                                </td>
                                <td className="py-3.5 px-4 min-w-[140px]">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                      <span>Vouchers Progress</span>
                                      <span className="font-bold text-slate-800">{row.financeMetrics.targets.vouchersTargetPct}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-purple-500"
                                        style={{ width: `${Math.min(100, row.financeMetrics.targets.vouchersTargetPct)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </>
                            )}

                            {/* Performance Grade & Score */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="space-y-0.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${row.gradeColor}`}>
                                  {row.grade}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Score: {row.performanceScore}/100
                                </span>
                              </div>
                            </td>

                            {/* Action Drilldown */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(m, row)}
                                className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-100 rounded-lg transition"
                                title="View Complete Multi-Parameter Performance"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: SENIOR HIERARCHY ROLLUP VIEW */}
          {performanceViewMode === 'hierarchy' && (
            <div className="space-y-4">
              <div className="bg-purple-50/80 p-3.5 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-600" />
                  <span className="font-bold">
                    Multi-Parameter Senior-Junior Hierarchy Rollup:
                  </span>
                  <span>Shows Senior department managers together with their assigned Junior team members and aggregate performance across Sales, Purchase, Job Work, and Finance.</span>
                </div>
              </div>

              {(performanceData?.seniorsReport || []).map((senior) => {
                const s = senior.member;
                const roll = senior.teamRollup;

                return (
                  <div key={s._id} className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden">
                    {/* Senior Banner */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50/50 p-4 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className="font-bold text-slate-900 text-sm hover:text-brand cursor-pointer"
                              onClick={() => handleOpenDetail(s, senior)}
                            >
                              {s.name}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              {s.designation}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">({s.member_code})</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                            <span>Department: <strong className="text-slate-700">{s.department}</strong></span>
                            <span>•</span>
                            <span>Direct Junior Reports: <strong className="text-purple-700">{senior.juniorTeam.length} Members</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold border ${senior.gradeColor}`}>
                          {senior.grade} ({senior.performanceScore}/100)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(s, senior)}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 transition"
                        >
                          View Senior Profile
                        </button>
                      </div>
                    </div>

                    {/* Department-Specific Team Rollup Stats Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50/70 border-b border-slate-200 text-xs">
                      {s.department === 'Sales & CRM' && (
                        <>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Team Total Leads</span>
                            <span className="font-black text-sm text-slate-900">{roll.sales?.teamLeads || 0} Leads</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Team Won Deals</span>
                            <span className="font-black text-sm text-emerald-700">{roll.sales?.teamWon || 0} Won</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-blue-700 block">Team Conversion %</span>
                            <span className="font-black text-sm text-blue-700">{roll.sales?.teamConversionRate || 0}%</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-purple-700 block">Team Revenue (₹)</span>
                            <span className="font-black text-sm text-purple-700">₹{Number(roll.sales?.teamRevenue || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </>
                      )}

                      {s.department === 'Procurement & Purchase' && (
                        <>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Team Total POs</span>
                            <span className="font-black text-sm text-slate-900">{roll.purchase?.teamPOs || 0} POs</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Team Procurement Spend</span>
                            <span className="font-black text-sm text-indigo-700">₹{Number(roll.purchase?.teamProcurementSpend || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Team Bills Cleared</span>
                            <span className="font-black text-sm text-emerald-700">{roll.purchase?.teamBillsCleared || 0} Bills</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-amber-700 block">Team GRNs Inspected</span>
                            <span className="font-black text-sm text-amber-700">{roll.purchase?.teamGRNs || 0} GRNs</span>
                          </div>
                        </>
                      )}

                      {s.department === 'Manufacturing & Job Work' && (
                        <>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Team Total MPOs</span>
                            <span className="font-black text-sm text-slate-900">{roll.jobWork?.teamMPOs || 0} Orders</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Production Output</span>
                            <span className="font-black text-sm text-emerald-700">{roll.jobWork?.teamProductionUnits || 0} PCS</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-amber-700 block">Job Work Spend</span>
                            <span className="font-black text-sm text-amber-700">₹{Number(roll.jobWork?.teamJobWorkSpend || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-purple-700 block">Raw Material Issued</span>
                            <span className="font-black text-sm text-purple-700">{roll.jobWork?.teamMaterialIssuedKg || 0} KG</span>
                          </div>
                        </>
                      )}

                      {s.department === 'Finance & Accounts' && (
                        <>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Team Collections</span>
                            <span className="font-black text-sm text-emerald-700">₹{Number(roll.finance?.teamCollections || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-rose-700 block">Team Disbursements</span>
                            <span className="font-black text-sm text-rose-700">₹{Number(roll.finance?.teamDisbursements || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-blue-700 block">Net Cash Movement</span>
                            <span className="font-black text-sm text-blue-700">₹{Number(roll.finance?.teamNetCashFlow || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-purple-700 block">Audited Vouchers</span>
                            <span className="font-black text-sm text-purple-700">{roll.finance?.teamVouchers || 0} Tx</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Junior Team Members List */}
                    <div className="p-4">
                      <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                        <span>Reporting Junior Executives ({senior.juniorTeam.length}):</span>
                        <span className="text-[11px] text-slate-400 font-normal">Direct departmental contributor staff</span>
                      </div>

                      {senior.juniorTeam.length === 0 ? (
                        <div className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-xl">
                          No junior executives currently assigned to this manager.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {senior.juniorTeam.map((junior) => (
                            <div
                              key={junior.member._id}
                              className="p-3 rounded-xl border border-slate-200 hover:border-brand/40 bg-white transition space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span
                                    className="font-bold text-slate-800 text-xs hover:text-brand cursor-pointer block"
                                    onClick={() => handleOpenDetail(junior.member, junior)}
                                  >
                                    {junior.member.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {junior.member.member_code} • {junior.member.designation}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${junior.gradeColor}`}>
                                  {junior.grade} ({junior.performanceScore})
                                </span>
                              </div>

                              {/* Junior's Department Parameters */}
                              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[11px] font-mono">
                                {junior.member.department === 'Sales & CRM' && (
                                  <>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Leads</span>
                                      <span className="font-bold text-slate-800">{junior.salesMetrics.leadsHandled}</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Won</span>
                                      <span className="font-bold text-emerald-700">{junior.salesMetrics.leadsWon}</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Conv %</span>
                                      <span className="font-bold text-blue-700">{junior.salesMetrics.conversionRate}%</span>
                                    </div>
                                  </>
                                )}

                                {junior.member.department === 'Procurement & Purchase' && (
                                  <>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">POs</span>
                                      <span className="font-bold text-slate-800">{junior.purchaseMetrics.posCreated}</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Spend</span>
                                      <span className="font-bold text-indigo-700">₹{Math.round(junior.purchaseMetrics.procurementSpend / 1000)}k</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Bills</span>
                                      <span className="font-bold text-emerald-700">{junior.purchaseMetrics.billsCleared}</span>
                                    </div>
                                  </>
                                )}

                                {junior.member.department === 'Manufacturing & Job Work' && (
                                  <>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">MPOs</span>
                                      <span className="font-bold text-slate-800">{junior.jobWorkMetrics.mposIssued}</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">PCS</span>
                                      <span className="font-bold text-emerald-700">{junior.jobWorkMetrics.productionUnitsReceived}</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Material</span>
                                      <span className="font-bold text-amber-700">{junior.jobWorkMetrics.materialIssuedKg} KG</span>
                                    </div>
                                  </>
                                )}

                                {junior.member.department === 'Finance & Accounts' && (
                                  <>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Disbursed</span>
                                      <span className="font-bold text-rose-700">₹{Math.round(junior.financeMetrics.disbursementsProcessed / 1000)}k</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Vouchers</span>
                                      <span className="font-bold text-purple-700">{junior.financeMetrics.vouchersAudited}</span>
                                    </div>
                                    <div className="bg-slate-50 p-1.5 rounded text-center">
                                      <span className="text-slate-400 text-[9px] block">Audit</span>
                                      <span className="font-bold text-emerald-700">100%</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: TEAM DIRECTORY */}
      {/* ==================================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff by name, code, designation..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-brand"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none"
              >
                <option value="all">All Departments</option>
                {masters.departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={String(filters.level || 'all').toLowerCase()}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none"
              >
                <option value="all">All Levels</option>
                {(masters.levels || []).map((l) => (
                  <option key={l.id} value={l.id}>{l.label || l.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 transition"
              >
                <Plus className="w-3.5 h-3.5" /> New Member
              </button>
            </div>
          </div>

          {/* Members Table */}
          <DataTable
            columns={directoryColumns}
            data={members}
            loading={loading}
            emptyMessage="No team members found matching criteria."
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: ROLE & PERMISSION MATRIX (RBAC) */}
      {/* ==================================================================== */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Role-Based Access Control (RBAC) Overview</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Granular access control matrix ensuring every staff member only sees and edits their authorized ERP modules (View, Add, Edit, Delete).
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-3 text-center">Leads & CRM</th>
                    <th className="py-3 px-3 text-center">Sales</th>
                    <th className="py-3 px-3 text-center">Purchase</th>
                    <th className="py-3 px-3 text-center">Job Work</th>
                    <th className="py-3 px-3 text-center">Inventory</th>
                    <th className="py-3 px-3 text-center">Finance</th>
                    <th className="py-3 px-3 text-center">Team Mgmt</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => {
                    const p = m.permissions || {};

                    const renderPermPill = (mod) => {
                      const modPerm = p[mod];
                      if (!modPerm || !modPerm.view) {
                        return <span className="text-slate-300 font-mono text-[10px]">—</span>;
                      }
                      const acts = [];
                      if (modPerm.view) acts.push('V');
                      if (modPerm.add) acts.push('A');
                      if (modPerm.edit) acts.push('E');
                      if (modPerm.delete) acts.push('D');

                      return (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {acts.join('/')}
                        </span>
                      );
                    };

                    return (
                      <tr key={m._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.member_code} • {m.department}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700">{m.role_name}</span>
                          <div className="text-[10px] text-slate-400">{m.level}</div>
                        </td>
                        <td className="py-3 px-3 text-center">{renderPermPill('leads')}</td>
                        <td className="py-3 px-3 text-center">{renderPermPill('sales')}</td>
                        <td className="py-3 px-3 text-center">{renderPermPill('purchase')}</td>
                        <td className="py-3 px-3 text-center">{renderPermPill('job_work')}</td>
                        <td className="py-3 px-3 text-center">{renderPermPill('inventory')}</td>
                        <td className="py-3 px-3 text-center">{renderPermPill('finance')}</td>
                        <td className="py-3 px-3 text-center">{renderPermPill('team')}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenPermissionsModal(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-brand bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Configure
                          </button>
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

      {/* ==================================================================== */}
      {/* MODAL 1: ADD / EDIT TEAM MEMBER */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isAddModalOpen ? 'Add New Team Member' : `Edit Member: ${selectedMember?.name}`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveMember} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Patel"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ramesh@danzason.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone / Mobile *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="9825012345"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand font-mono"
              />
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Purchase Officer / Sales Exec"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand"
              />
            </div>

            {/* Department (Dynamically populated from Settings) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Department *</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickDeptForm({ name: '', code: '', description: '', sub_modules: [] });
                      setQuickDeptError('');
                      setIsQuickDeptModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-brand hover:underline flex items-center gap-0.5"
                    title="Add a new department directly"
                  >
                    <Plus className="w-3 h-3" /> Quick Add
                  </button>
                  <span className="text-slate-300">|</span>
                  <a
                    href="/purchase/settings?tab=departments"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-slate-500 hover:text-brand flex items-center gap-0.5"
                    title="Manage all departments in Settings"
                  >
                    Settings <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand font-semibold text-slate-800"
              >
                {masters.departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Hierarchy Level Selection (Populated from Settings) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Hierarchy Level</label>
                <div className="flex items-center gap-1.5">
                  <a
                    href="/purchase/settings?tab=hierarchy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-slate-500 hover:text-brand flex items-center gap-0.5"
                    title="Manage all hierarchy levels in Settings"
                  >
                    Settings <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <select
                value={String(formData.level || '').toLowerCase()}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand font-bold text-purple-700 bg-white"
              >
                {(masters.levels && masters.levels.length > 0 ? masters.levels : [
                  { id: 'director', label: 'Director / Management' },
                  { id: 'manager', label: 'Department Manager' },
                  { id: 'senior', label: 'Senior Executive' },
                  { id: 'junior', label: 'Junior Executive' },
                  { id: 'trainee', label: 'Trainee / Associate' },
                ]).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label || l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reports To (Dynamically shown if level requires reporting or is non-supervisory) */}
            {(() => {
              const selectedLvl = (masters.levels || []).find(
                (l) => String(l.id).toLowerCase() === String(formData.level || '').toLowerCase()
              );
              const needsReporting = selectedLvl
                ? (selectedLvl.requires_reporting || !selectedLvl.can_supervise)
                : (String(formData.level).toLowerCase() === 'junior' || String(formData.level).toLowerCase() === 'trainee');

              return needsReporting ? (
                <div className="sm:col-span-2 p-3 rounded-xl bg-purple-50/60 border border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-purple-900">
                      Reports To (Senior Manager / Supervisor)
                    </label>
                    <span className="text-[10px] text-purple-600 font-medium">
                      {seniorMembersList.length} Supervisors Available
                    </span>
                  </div>
                  <select
                    value={formData.reports_to}
                    onChange={(e) => setFormData({ ...formData, reports_to: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-brand bg-white font-medium"
                  >
                    <option value="">None / Top Management</option>
                    {seniorMembersList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.designation} - {s.department})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null;
            })()}
          </div>

          {/* Role Template Selector */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Select Base Role Template (Auto-configure Permissions):
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Current Role: <strong>{formData.role_name}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.keys(masters.roleTemplates || {}).map((templateKey) => (
                <button
                  key={templateKey}
                  type="button"
                  onClick={() => handleApplyRoleTemplate(templateKey)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                    formData.role_name === templateKey
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {templateKey}
                </button>
              ))}
            </div>

            {/* Granular Permission Grid */}
            <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">ERP Module</th>
                    <th className="py-2.5 px-3 text-center">View</th>
                    <th className="py-2.5 px-3 text-center">Add</th>
                    <th className="py-2.5 px-3 text-center">Edit</th>
                    <th className="py-2.5 px-3 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {masters.modules.map((mod) => {
                    const p = formData.permissions[mod.id] || { view: false, add: false, edit: false, delete: false };

                    return (
                      <tr key={mod.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{mod.label}</td>
                        {['view', 'add', 'edit', 'delete'].map((action) => (
                          <td key={action} className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!p[action]}
                              onChange={() => handleTogglePermission(mod.id, action)}
                              className="w-4 h-4 rounded text-brand focus:ring-brand border-slate-300 cursor-pointer"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Monthly Performance Targets */}
          <div className="pt-3 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Monthly Department Targets:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Leads to Handle</label>
                <input
                  type="number"
                  value={formData.monthly_targets?.leads_target}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_targets: { ...formData.monthly_targets, leads_target: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Sales Revenue (₹)</label>
                <input
                  type="number"
                  value={formData.monthly_targets?.revenue_target}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_targets: { ...formData.monthly_targets, revenue_target: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Purchase Orders (POs)</label>
                <input
                  type="number"
                  value={formData.monthly_targets?.pos_target}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_targets: { ...formData.monthly_targets, pos_target: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Production Units (PCS)</label>
                <input
                  type="number"
                  value={formData.monthly_targets?.production_units_target}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_targets: { ...formData.monthly_targets, production_units_target: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Collections (₹)</label>
                <input
                  type="number"
                  value={formData.monthly_targets?.collections_target}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_targets: { ...formData.monthly_targets, collections_target: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Target Follow-ups Count</label>
                <input
                  type="number"
                  value={formData.monthly_targets?.followups_target}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_targets: { ...formData.monthly_targets, followups_target: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-600 shadow-sm"
            >
              {formSubmitting ? 'Saving...' : isAddModalOpen ? 'Create Member' : 'Update Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: DEDICATED RBAC PERMISSION CONFIGURATION */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title={`Access & Permissions: ${selectedMember?.name} (${selectedMember?.member_code})`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800">{selectedMember?.name} ({selectedMember?.designation})</div>
              <div className="text-slate-500">Department: {selectedMember?.department} • Level: {selectedMember?.level}</div>
            </div>
            {getLevelBadge(selectedMember?.level)}
          </div>

          {/* Role Templates selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Apply Pre-set Role Template:</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(masters.roleTemplates || {}).map((templateKey) => (
                <button
                  key={templateKey}
                  type="button"
                  onClick={() => handleApplyRoleTemplate(templateKey)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    formData.role_name === templateKey
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {templateKey}
                </button>
              ))}
            </div>
          </div>

          {/* Granular Permission Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3 text-center">View</th>
                  <th className="py-2.5 px-3 text-center">Add</th>
                  <th className="py-2.5 px-3 text-center">Edit</th>
                  <th className="py-2.5 px-3 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {masters.modules.map((mod) => {
                  const p = formData.permissions[mod.id] || { view: false, add: false, edit: false, delete: false };

                  return (
                    <tr key={mod.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{mod.label}</td>
                      {['view', 'add', 'edit', 'delete'].map((action) => (
                        <td key={action} className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!p[action]}
                            onChange={() => handleTogglePermission(mod.id, action)}
                            className="w-4 h-4 rounded text-brand focus:ring-brand border-slate-300 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsPermModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={formSubmitting}
              onClick={handleSavePermissions}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              {formSubmitting ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 3: VIEW MULTI-PARAMETER MEMBER PROFILE & JUNIOR TEAM */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Staff Multi-Parameter Profile: ${selectedMember?.name}`}
        maxWidth="max-w-3xl"
      >
        {selectedMember && (
          <div className="space-y-4 text-xs">
            {/* Header Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">{selectedMember.name}</span>
                  {getLevelBadge(selectedMember.level)}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedMemberReport?.gradeColor || 'bg-slate-100 text-slate-700'}`}>
                    {selectedMemberReport?.grade || 'Member'} (Score: {selectedMemberReport?.performanceScore || 0}/100)
                  </span>
                </div>
                <div className="text-slate-500 font-mono mt-0.5">
                  {selectedMember.member_code} • {selectedMember.designation} • {selectedMember.department}
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
                {selectedMember.status}
              </span>
            </div>

            {/* Sub-tabs in Detail Modal */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDetailModalTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  detailModalTab === 'overview'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Overview & Structure
              </button>
              <button
                type="button"
                onClick={() => setDetailModalTab('sales')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  detailModalTab === 'sales'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Sales & Leads
              </button>
              <button
                type="button"
                onClick={() => setDetailModalTab('purchase')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  detailModalTab === 'purchase'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Purchase & Bills
              </button>
              <button
                type="button"
                onClick={() => setDetailModalTab('job_work')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  detailModalTab === 'job_work'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Job Work & Output
              </button>
              <button
                type="button"
                onClick={() => setDetailModalTab('finance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  detailModalTab === 'finance'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Finance & Cash Flow
              </button>
            </div>

            {/* SUB-PANEL 1: OVERVIEW */}
            {detailModalTab === 'overview' && (
              <div className="space-y-3">
                {/* Hierarchy Box */}
                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1">
                  <div className="text-purple-900 font-bold">Reporting Structure:</div>
                  {selectedMember.reports_to ? (
                    <div>
                      Supervisor (Senior Manager): <strong>{selectedMember.reports_to.name}</strong> ({selectedMember.reports_to.designation})
                    </div>
                  ) : (
                    <div className="text-slate-600">
                      Direct Department Head / Reports to Management
                    </div>
                  )}
                </div>

                {/* Junior reporting team if senior */}
                {selectedMember.juniorTeam && selectedMember.juniorTeam.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                      Junior Executives Reporting to {selectedMember.name} ({selectedMember.juniorTeam.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedMember.juniorTeam.map((j) => (
                        <div key={j._id} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-0.5">
                          <div className="font-bold text-slate-800">{j.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{j.member_code} • {j.designation}</div>
                          <div className="text-[10px] text-slate-400">Phone: {j.phone}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Permissions Summary */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-800 block">Assigned Module Privileges:</span>
                  <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                    {getPermissionsSummary(selectedMember.permissions)}
                  </p>
                </div>
              </div>
            )}

            {/* SUB-PANEL 2: SALES */}
            {detailModalTab === 'sales' && selectedMemberReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Leads Handled</span>
                  <span className="text-lg font-black text-slate-900">{selectedMemberReport.salesMetrics.leadsHandled}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Won Deals</span>
                  <span className="text-lg font-black text-emerald-700">{selectedMemberReport.salesMetrics.leadsWon}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] text-blue-800 uppercase font-bold block">Conversion %</span>
                  <span className="text-lg font-black text-blue-700">{selectedMemberReport.salesMetrics.conversionRate}%</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-800 uppercase font-bold block">Sales Revenue</span>
                  <span className="text-base font-black text-purple-700">₹{Number(selectedMemberReport.salesMetrics.revenueGenerated).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {/* SUB-PANEL 3: PURCHASE */}
            {detailModalTab === 'purchase' && selectedMemberReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">POs Created</span>
                  <span className="text-lg font-black text-slate-900">{selectedMemberReport.purchaseMetrics.posCreated}</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] text-indigo-800 uppercase font-bold block">Procurement Value</span>
                  <span className="text-base font-black text-indigo-700">₹{Number(selectedMemberReport.purchaseMetrics.procurementSpend).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Bills Cleared</span>
                  <span className="text-lg font-black text-emerald-700">{selectedMemberReport.purchaseMetrics.billsCleared}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] text-amber-800 uppercase font-bold block">GRNs Checked</span>
                  <span className="text-lg font-black text-amber-700">{selectedMemberReport.purchaseMetrics.grnsChecked}</span>
                </div>
              </div>
            )}

            {/* SUB-PANEL 4: JOB WORK */}
            {detailModalTab === 'job_work' && selectedMemberReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">MPOs Issued</span>
                  <span className="text-lg font-black text-slate-900">{selectedMemberReport.jobWorkMetrics.mposIssued}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Output Units</span>
                  <span className="text-lg font-black text-emerald-700">{selectedMemberReport.jobWorkMetrics.productionUnitsReceived} PCS</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] text-amber-800 uppercase font-bold block">Material Issued</span>
                  <span className="text-lg font-black text-amber-700">{selectedMemberReport.jobWorkMetrics.materialIssuedKg} KG</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-800 uppercase font-bold block">Job Work Spend</span>
                  <span className="text-base font-black text-purple-700">₹{Number(selectedMemberReport.jobWorkMetrics.jobWorkSpend).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {/* SUB-PANEL 5: FINANCE */}
            {detailModalTab === 'finance' && selectedMemberReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Collections</span>
                  <span className="text-base font-black text-emerald-700">₹{Number(selectedMemberReport.financeMetrics.collectionsRecorded).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-800 uppercase font-bold block">Disbursements</span>
                  <span className="text-base font-black text-rose-700">₹{Number(selectedMemberReport.financeMetrics.disbursementsProcessed).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] text-blue-800 uppercase font-bold block">Net Movement</span>
                  <span className="text-base font-black text-blue-700">₹{Number(selectedMemberReport.financeMetrics.netCashFlow).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-800 uppercase font-bold block">Vouchers Audited</span>
                  <span className="text-lg font-black text-purple-700">{selectedMemberReport.financeMetrics.vouchersAudited} Tx</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* QUICK ADD DEPARTMENT MODAL */}
      <Modal
        isOpen={isQuickDeptModalOpen}
        onClose={() => setIsQuickDeptModalOpen(false)}
        title="Quick Add New Department"
        size="md"
      >
        <form onSubmit={handleSaveQuickDept} className="space-y-4 text-xs font-sans text-slate-800">
          {quickDeptError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{quickDeptError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Department Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={quickDeptForm.name}
                onChange={(e) => setQuickDeptForm({ ...quickDeptForm, name: e.target.value })}
                placeholder="e.g. Quality Assurance & Inspection"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Department Code (Unique)
              </label>
              <input
                type="text"
                value={quickDeptForm.code}
                onChange={(e) => setQuickDeptForm({ ...quickDeptForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. QA (leave blank to auto-generate)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:border-brand outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={quickDeptForm.description}
                onChange={(e) => setQuickDeptForm({ ...quickDeptForm, description: e.target.value })}
                placeholder="Brief description of department functions..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-brand outline-none resize-none"
              />
            </div>

            {/* Quick Operations Selection */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800 text-xs">
                Department Operations & Workflows
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'B2B Sales Orders',
                  'B2B Sales Invoices',
                  'B2C Retail Invoices',
                  'D2C Online Sales',
                  'Wholesale Quotations',
                  'Customer Leads',
                  'Scheduled Follow-ups',
                  'Purchase Orders',
                  'Purchase Bills',
                  'Job Orders (MPO)',
                  'Product Inventory',
                  'Bank & Cash Accounts',
                ].map((item) => {
                  const isSelected = quickDeptForm.sub_modules?.includes(item);
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => {
                        const cur = quickDeptForm.sub_modules || [];
                        setQuickDeptForm({
                          ...quickDeptForm,
                          sub_modules: isSelected ? cur.filter((x) => x !== item) : [...cur, item],
                        });
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition flex items-center gap-1 border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5 text-slate-400" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuickDeptModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={quickDeptSaving}
              className="px-4 py-2 rounded-lg bg-brand text-white font-bold hover:bg-brand-600 disabled:opacity-50 transition flex items-center gap-2"
            >
              {quickDeptSaving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Create & Select
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
