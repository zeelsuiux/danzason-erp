import React, { useEffect, useState, useMemo } from 'react';
import {
  Target,
  Trophy,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Users,
  Building,
  DollarSign,
  Package,
  ShoppingCart,
  Percent,
  CheckSquare,
  Square,
  Sparkles,
  ChevronRight,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import targetGoalService from '../../services/targetGoalService';
import teamService from '../../services/teamService';

export default function TargetGoalManagement() {
  const [goals, setGoals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    department: 'all',
    period_type: 'all',
    status: 'all',
  });

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state for Create / Edit
  const initialFormState = {
    title: '',
    category: 'sales',
    target_level: 'individual',
    department: 'Sales & CRM',
    assigned_to: '',
    assignee_name: '',
    period_type: 'monthly',
    period_label: 'Current Month',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    metric_type: 'revenue_amount',
    metric_unit: '₹',
    target_value: '',
    actual_value: 0,
    priority: 'high',
    incentive_type: 'none',
    incentive_value: '',
    description: '',
    milestones: [
      { title: '', weight: 50, is_completed: false },
      { title: '', weight: 50, is_completed: false },
    ],
  };

  const [formData, setFormData] = useState(initialFormState);

  // Progress update form state
  const [progressData, setProgressData] = useState({
    new_actual_value: '',
    note: '',
  });

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsRes, analyticsRes, teamRes] = await Promise.all([
        targetGoalService.getTargetGoals(),
        targetGoalService.getAnalyticsSummary(),
        teamService.getTeamMembers({ status: 'active' }).catch(() => ({ data: [] })),
      ]);

      if (goalsRes?.data) {
        setGoals(goalsRes.data);
      }
      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      }
      if (teamRes?.data) {
        setTeamMembers(teamRes.data);
      }
    } catch (err) {
      console.error('Failed to load target goals data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync actuals with live ERP
  const handleAutoSync = async () => {
    try {
      setSyncing(true);
      await targetGoalService.syncGoalProgress();
      await loadData();
    } catch (err) {
      console.error('Failed to sync goal actuals:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      // Tab filter
      if (activeTab === 'sales' && g.category !== 'sales') return false;
      if (activeTab === 'operations' && !['production', 'procurement'].includes(g.category)) return false;
      if (activeTab === 'okr' && g.category !== 'strategic_okr') return false;

      // Dropdown filters
      if (filters.category !== 'all' && g.category !== filters.category) return false;
      if (filters.department !== 'all' && g.department !== filters.department) return false;
      if (filters.period_type !== 'all' && g.period_type !== filters.period_type) return false;
      if (filters.status !== 'all' && g.status !== filters.status) return false;

      // Search term
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const titleMatch = (g.title || '').toLowerCase().includes(query);
        const codeMatch = (g.goal_code || '').toLowerCase().includes(query);
        const nameMatch = (g.assignee_name || '').toLowerCase().includes(query);
        const descMatch = (g.description || '').toLowerCase().includes(query);
        return titleMatch || codeMatch || nameMatch || descMatch;
      }
      return true;
    });
  }, [goals, activeTab, filters]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData(initialFormState);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (goal) => {
    setIsEditing(true);
    setSelectedGoal(goal);
    setFormData({
      title: goal.title || '',
      category: goal.category || 'sales',
      target_level: goal.target_level || 'individual',
      department: goal.department || 'Sales & CRM',
      assigned_to: goal.assigned_to?._id || goal.assigned_to || '',
      assignee_name: goal.assignee_name || '',
      period_type: goal.period_type || 'monthly',
      period_label: goal.period_label || 'Current Period',
      start_date: goal.start_date ? new Date(goal.start_date).toISOString().split('T')[0] : '',
      end_date: goal.end_date ? new Date(goal.end_date).toISOString().split('T')[0] : '',
      metric_type: goal.metric_type || 'revenue_amount',
      metric_unit: goal.metric_unit || '₹',
      target_value: goal.target_value ?? '',
      actual_value: goal.actual_value ?? 0,
      priority: goal.priority || 'high',
      incentive_type: goal.incentive_type || 'none',
      incentive_value: goal.incentive_value ?? '',
      description: goal.description || '',
      milestones:
        goal.milestones && goal.milestones.length > 0
          ? goal.milestones.map((m) => ({
              title: m.title,
              weight: m.weight || 25,
              is_completed: !!m.is_completed,
            }))
          : [
              { title: '', weight: 50, is_completed: false },
              { title: '', weight: 50, is_completed: false },
            ],
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create / Edit Goal
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        target_value: Number(formData.target_value),
        actual_value: Number(formData.actual_value) || 0,
        incentive_value: Number(formData.incentive_value) || 0,
        milestones: formData.milestones.filter((m) => m.title.trim() !== ''),
      };

      if (isEditing && selectedGoal?._id) {
        await targetGoalService.updateTargetGoal(selectedGoal._id, payload);
      } else {
        await targetGoalService.createTargetGoal(payload);
      }

      setIsCreateModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error saving target goal:', err);
      alert('Failed to save target goal. Please check all required fields.');
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this target goal?')) return;
    try {
      await targetGoalService.deleteTargetGoal(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Failed to delete target goal.');
    }
  };

  // Open Progress Modal
  const handleOpenProgress = (goal) => {
    setSelectedGoal(goal);
    setProgressData({
      new_actual_value: goal.actual_value,
      note: '',
    });
    setIsProgressModalOpen(true);
  };

  // Submit Progress Update
  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGoal?._id) return;
    try {
      await targetGoalService.recordGoalProgress(selectedGoal._id, {
        new_actual_value: Number(progressData.new_actual_value),
        note: progressData.note,
        recorded_by: 'Administrator',
      });
      setIsProgressModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error recording goal progress:', err);
      alert('Failed to record progress.');
    }
  };

  // Toggle milestone completion directly in detail view
  const handleToggleMilestone = async (goalId, milestoneIndex) => {
    const goal = goals.find((g) => g._id === goalId);
    if (!goal || !goal.milestones) return;

    const updatedMilestones = [...goal.milestones];
    const item = updatedMilestones[milestoneIndex];
    item.is_completed = !item.is_completed;
    item.completed_at = item.is_completed ? new Date() : null;

    try {
      const res = await targetGoalService.updateTargetGoal(goalId, {
        milestones: updatedMilestones,
      });
      if (res?.data) {
        setSelectedGoal(res.data);
      }
      await loadData();
    } catch (err) {
      console.error('Error toggling milestone:', err);
    }
  };

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Format metrics display
  const renderMetric = (val, unit) => {
    if (unit === '₹') return formatCurrency(val);
    return `${Number(val || 0).toLocaleString()} ${unit || ''}`;
  };

  // Helper badge styles
  const getStatusBadge = (status, pct) => {
    if (status === 'achieved' || pct >= 100) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Achieved ({pct}%)
        </span>
      );
    }
    if (status === 'on_track' || pct >= 75) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          On Track ({pct}%)
        </span>
      );
    }
    if (status === 'behind' || pct < 40) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          Behind ({pct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        In Progress ({pct}%)
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-purple-100 text-purple-800 border border-purple-200">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-rose-100 text-rose-800 border border-rose-200">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-100 text-amber-800 border border-amber-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'sales':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'procurement':
        return <ShoppingCart className="w-4 h-4 text-indigo-600" />;
      case 'production':
        return <Package className="w-4 h-4 text-amber-600" />;
      case 'finance':
        return <Trophy className="w-4 h-4 text-cyan-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Target & Goal Management"
        subtitle="Set, monitor, and achieve departmental sales, production, procurement, and company-wide strategic growth goals."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAutoSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Auto-calculate actuals from live ERP invoices & purchase orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
            {syncing ? 'Syncing Actuals...' : 'Auto-Sync ERP Actuals'}
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Set New Target / Goal
          </button>
        </div>
      </PageHeader>

      {/* Top Executive KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Goals & Active */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Active Objectives
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">
                    {analytics.activeGoals || 0}
                  </span>
                  <span className="text-xs text-slate-400">
                    of {analytics.totalGoals || 0} Total
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="font-semibold text-emerald-600">
                {analytics.achievedGoals || 0} Achieved
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-blue-600">
                {analytics.onTrackGoals || 0} On Track
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-rose-500">
                {analytics.behindGoals || 0} Behind
              </span>
            </div>
          </div>

          {/* Card 2: Sales Revenue Target vs Realized */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Revenue Target Attainment
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">
                    {analytics.overallRevenuePct || 0}%
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Live
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, analytics.overallRevenuePct || 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Realized: {formatCurrency(analytics.totalActualRevenue)}</span>
                <span>Target: {formatCurrency(analytics.totalTargetRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Top Performing Department */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Top Department
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-slate-900 truncate max-w-[150px]">
                    {analytics.departmentStats?.[0]?.department || 'Sales & CRM'}
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span>Avg Completion Rate:</span>
              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                {analytics.departmentStats?.[0]?.avg_achievement_pct || 0}%
              </span>
            </div>
          </div>

          {/* Card 4: Performance Incentives Earned */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Performance Incentives
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-amber-600">
                    {formatCurrency(analytics.totalIncentivesEarned || 0)}
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Total unlocked bonuses across all achieved targets.
            </p>
          </div>
        </div>
      )}

      {/* Tabs & Filters Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Objectives ({goals.length})
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'sales'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales & Revenue
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'operations'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operations & Production
            </button>
            <button
              onClick={() => setActiveTab('okr')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'okr'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Strategic OKRs
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Leaderboard
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredGoals.length}</span> targets
          </div>
        </div>

        {/* Filter Controls (Hidden in Leaderboard tab) */}
        {activeTab !== 'leaderboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by goal title, code, or assignee..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Department Filter */}
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 bg-white"
            >
              <option value="all">All Departments</option>
              <option value="Sales & CRM">Sales & CRM</option>
              <option value="Procurement">Procurement</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
              <option value="Executive">Executive</option>
            </select>

            {/* Period Filter */}
            <select
              value={filters.period_type}
              onChange={(e) => setFilters({ ...filters, period_type: e.target.value })}
              className="py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 bg-white"
            >
              <option value="all">All Periods</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="custom">Custom</option>
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="achieved">Achieved (100%+)</option>
              <option value="on_track">On Track (75%-99%)</option>
              <option value="active">In Progress (40%-74%)</option>
              <option value="behind">Behind (&lt;40%)</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading Target & Goal Data...</p>
        </div>
      ) : activeTab === 'leaderboard' ? (
        /* Leaderboard View */
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold mb-3">
                  <Flame className="w-3.5 h-3.5 text-yellow-300" /> Executive Achievement Leaderboard
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Top Team Achievers
                </h2>
                <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-xl">
                  Real-time ranking based on target attainment percentage and unlocked bonuses
                  across live commercial and operations records.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center min-w-[200px]">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-200">
                  Total Bonus Pool
                </p>
                <p className="text-2xl font-black mt-1">
                  {formatCurrency(analytics?.totalIncentivesEarned || 0)}
                </p>
                <p className="text-[10px] text-amber-100 mt-0.5">Unlocked by high performers</p>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Individual Goal Rankings</h3>
              <span className="text-xs text-slate-500">Sorted by % Completion</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Team Member</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Assigned Target</th>
                    <th className="py-3 px-4">Actual vs Target</th>
                    <th className="py-3 px-4">Achievement</th>
                    <th className="py-3 px-4 text-right">Earned Bonus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics?.individualLeaderboard && analytics.individualLeaderboard.length > 0 ? (
                    analytics.individualLeaderboard.map((item, idx) => (
                      <tr key={item.goal_id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold">
                          {idx === 0 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs ring-2 ring-amber-400">
                              🥇
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs">
                              🥈
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center font-black text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-slate-400 pl-2">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {item.assignee_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {item.department}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs truncate">
                          {item.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono">
                          {renderMetric(item.actual_value, item.metric_unit)} /{' '}
                          <span className="text-slate-400">
                            {renderMetric(item.target_value, item.metric_unit)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(item.status, item.achievement_pct)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-amber-600 font-mono">
                          {item.earned_incentive > 0 ? formatCurrency(item.earned_incentive) : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No individual performance data available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : filteredGoals.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Target Goals Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No goals match your selected filters. Create your first operational or sales goal to
            start tracking team performance.
          </p>
          <div className="pt-2">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" />
              Create First Target
            </button>
          </div>
        </div>
      ) : (
        /* Target Goals Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => {
            const completedMilestones = (goal.milestones || []).filter((m) => m.is_completed).length;
            const totalMilestones = (goal.milestones || []).length;

            return (
              <div
                key={goal._id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {getCategoryIcon(goal.category)}
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        {goal.goal_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getPriorityBadge(goal.priority)}
                      {getStatusBadge(goal.status, goal.achievement_pct)}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-emerald-700 transition">
                      {goal.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {goal.description || 'Target assigned for operational tracking.'}
                    </p>
                  </div>

                  {/* Assignee & Period Info */}
                  <div className="pt-1 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{goal.assignee_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{goal.period_label}</span>
                    </div>
                  </div>

                  {/* Progress Bar & Value Metric */}
                  <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500 font-medium">Actual / Target:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {renderMetric(goal.actual_value, goal.metric_unit)} /{' '}
                        <span className="text-slate-400">
                          {renderMetric(goal.target_value, goal.metric_unit)}
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          goal.achievement_pct >= 100
                            ? 'bg-emerald-500'
                            : goal.achievement_pct >= 75
                            ? 'bg-blue-500'
                            : goal.achievement_pct >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, goal.achievement_pct || 0)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Completion:</span>
                      <span className="font-bold text-slate-700">{goal.achievement_pct || 0}%</span>
                    </div>
                  </div>

                  {/* Milestones count & Bonus Tag */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    {totalMilestones > 0 ? (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        Milestones: {completedMilestones}/{totalMilestones} done
                      </span>
                    ) : (
                      <span className="text-slate-400">No milestones set</span>
                    )}

                    {goal.incentive_value > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Award className="w-3 h-3" />
                        {goal.incentive_type === 'percentage'
                          ? `${goal.incentive_value}% Incentive`
                          : formatCurrency(goal.incentive_value)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedGoal(goal);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" /> View Details
                  </button>
                  <button
                    onClick={() => handleOpenProgress(goal)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                    title="Record incremental actual progress"
                  >
                    Update Progress
                  </button>
                  <button
                    onClick={() => handleOpenEdit(goal)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition"
                    title="Edit Goal"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create / Edit Target Goal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={isEditing ? 'Edit Target Goal' : 'Set New Target / Goal'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Target / Goal Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Q4 Premium Denim Sales Drive or 5000 PCS Finished Output"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="sales">Sales & Revenue</option>
                <option value="procurement">Procurement & Purchasing</option>
                <option value="production">Production & Job Work</option>
                <option value="finance">Finance & Collections</option>
                <option value="strategic_okr">Strategic Company OKR</option>
              </select>
            </div>

            {/* Target Level */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Target Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.target_level}
                onChange={(e) => setFormData({ ...formData, target_level: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="individual">Individual Team Member</option>
                <option value="department">Department / Team</option>
                <option value="company_wide">Company-Wide (All)</option>
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="Sales & CRM">Sales & CRM</option>
                <option value="Procurement">Procurement</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Finance & Accounts">Finance & Accounts</option>
                <option value="Executive">Executive</option>
              </select>
            </div>

            {/* Assigned Member (if individual) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Assigned Team Member
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => {
                  const mId = e.target.value;
                  const member = teamMembers.find((m) => m._id === mId);
                  setFormData({
                    ...formData,
                    assigned_to: mId,
                    assignee_name: member ? member.name : '',
                    department: member?.department || formData.department,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="">-- All / Department Team --</option>
                {teamMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.designation || m.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Metric Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Metric Type
              </label>
              <select
                value={formData.metric_type}
                onChange={(e) => {
                  const mType = e.target.value;
                  let unit = '₹';
                  if (mType === 'order_count') unit = 'Orders';
                  if (mType === 'unit_volume') unit = 'PCS';
                  if (mType === 'percentage' || mType === 'milestone') unit = '%';
                  setFormData({ ...formData, metric_type: mType, metric_unit: unit });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="revenue_amount">Revenue / Billing Amount (₹)</option>
                <option value="order_count">Order Count (Orders / POs)</option>
                <option value="unit_volume">Unit Volume (PCS / Meters)</option>
                <option value="collection_amount">Collection Amount (₹)</option>
                <option value="percentage">Percentage Rate (%)</option>
                <option value="milestone">Milestone Checklist (%)</option>
              </select>
            </div>

            {/* Target Value & Unit */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Target Value ({formData.metric_unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="e.g. 500000"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Period Type & Label */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Period Type
              </label>
              <select
                value={formData.period_type}
                onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Period Label
              </label>
              <input
                type="text"
                placeholder="e.g. October 2026, Q3 2026-27"
                value={formData.period_label}
                onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Dates */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                End / Target Deadline Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Priority & Incentive */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Performance Incentive Bonus
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.incentive_type}
                  onChange={(e) => setFormData({ ...formData, incentive_type: e.target.value })}
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="none">No Bonus</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_bonus">Fixed Cash (₹)</option>
                </select>
                {formData.incentive_type !== 'none' && (
                  <input
                    type="number"
                    placeholder="Bonus Value"
                    value={formData.incentive_value}
                    onChange={(e) => setFormData({ ...formData, incentive_value: e.target.value })}
                    className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Description / Strategic Guidelines
              </label>
              <textarea
                rows="2"
                placeholder="Key directives, client accounts, or quality targets to focus on..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Milestones Checkpoints */}
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Key Milestones / Sub-deliverables
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      milestones: [
                        ...formData.milestones,
                        { title: '', weight: 25, is_completed: false },
                      ],
                    })
                  }
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  + Add Milestone
                </button>
              </div>

              {formData.milestones.map((ms, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Milestone ${index + 1} checkpoint`}
                    value={ms.title}
                    onChange={(e) => {
                      const updated = [...formData.milestones];
                      updated[index].title = e.target.value;
                      setFormData({ ...formData, milestones: updated });
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = formData.milestones.filter((_, i) => i !== index);
                      setFormData({ ...formData, milestones: updated });
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm transition"
            >
              {isEditing ? 'Save Changes' : 'Create Target Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Record Progress Modal */}
      <Modal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        title="Record Incremental Progress"
        size="md"
      >
        {selectedGoal && (
          <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
              <p className="font-bold text-slate-800 text-sm">{selectedGoal.title}</p>
              <p className="text-slate-500">
                Target: {renderMetric(selectedGoal.target_value, selectedGoal.metric_unit)}
              </p>
              <p className="text-slate-500">
                Current Recorded Actual:{' '}
                <span className="font-semibold text-slate-800 font-mono">
                  {renderMetric(selectedGoal.actual_value, selectedGoal.metric_unit)}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                New Actual Value ({selectedGoal.metric_unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={progressData.new_actual_value}
                onChange={(e) =>
                  setProgressData({ ...progressData, new_actual_value: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Progress Note / Review Remark
              </label>
              <textarea
                rows="3"
                placeholder="e.g. Added dispatch for 500 PCS lot from Raymond contractor."
                value={progressData.note}
                onChange={(e) => setProgressData({ ...progressData, note: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsProgressModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-sm transition"
              >
                Save Progress
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 3: View Full Detail Breakdown */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedGoal?.title || 'Target Goal Details'}
        size="lg"
      >
        {selectedGoal && (
          <div className="space-y-5 text-xs">
            {/* Top Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Objective Code
                </span>
                <span className="text-sm font-mono font-bold text-slate-800">
                  {selectedGoal.goal_code}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assignee
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {selectedGoal.assignee_name}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Department
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {selectedGoal.department}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status
                </span>
                {getStatusBadge(selectedGoal.status, selectedGoal.achievement_pct)}
              </div>
            </div>

            {/* Metrics Comparison Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Target Goal
                </span>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {renderMetric(selectedGoal.target_value, selectedGoal.metric_unit)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Current Actual
                </span>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  {renderMetric(selectedGoal.actual_value, selectedGoal.metric_unit)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Earned Incentive
                </span>
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {selectedGoal.earned_incentive > 0
                    ? formatCurrency(selectedGoal.earned_incentive)
                    : 'None yet'}
                </p>
              </div>
            </div>

            {/* Description */}
            {selectedGoal.description && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Strategic Overview</h4>
                <p className="text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  {selectedGoal.description}
                </p>
              </div>
            )}

            {/* Milestones Checklist */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center justify-between">
                <span>Milestone Checkpoints</span>
                <span className="text-[11px] text-slate-400">Click to toggle completion</span>
              </h4>
              {selectedGoal.milestones && selectedGoal.milestones.length > 0 ? (
                <div className="space-y-2">
                  {selectedGoal.milestones.map((ms, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleToggleMilestone(selectedGoal._id, idx)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        ms.is_completed
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {ms.is_completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span
                        className={`flex-1 text-xs ${
                          ms.is_completed ? 'line-through text-slate-500' : 'font-medium'
                        }`}
                      >
                        {ms.title}
                      </span>
                      {ms.is_completed && ms.completed_at && (
                        <span className="text-[10px] text-emerald-600 font-mono">
                          Completed on {new Date(ms.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No milestones defined for this goal.</p>
              )}
            </div>

            {/* Progress Notes Timeline */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Update Audit History</h4>
              {selectedGoal.progress_notes && selectedGoal.progress_notes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedGoal.progress_notes.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{item.recorded_by}</span>
                        <span>{new Date(item.recorded_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700">{item.note}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Shift: {item.previous_value} ➔ {item.new_value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No progress notes recorded yet.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
