import React, { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  PackagePlus,
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  ShoppingCart,
  Percent,
  Tag,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
  Award,
  Users,
  Lightbulb,
  Zap,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import upsellService from '../../services/upsellService';

export default function UpsellCrossSellManagement() {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'rules' | 'simulator' | 'opportunities'
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [rules, setRules] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Filters for Rules
  const [ruleTypeFilter, setRuleTypeFilter] = useState('all');
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleStatusFilter, setRuleStatusFilter] = useState('all');

  // Filters for Opportunities
  const [oppStatusFilter, setOppStatusFilter] = useState('all');
  const [oppSearch, setOppSearch] = useState('');

  // Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
  const [activePitchRule, setActivePitchRule] = useState(null);
  const [pitchStatus, setPitchStatus] = useState('accepted');
  const [pitchNotes, setPitchNotes] = useState('');
  const [declinedReason, setDeclinedReason] = useState('Budget Constraint');
  const [pitchQty, setPitchQty] = useState(50);

  // Form State for Create/Edit Rule
  const [ruleForm, setRuleForm] = useState({
    title: '',
    type: 'upsell',
    trigger_type: 'product',
    trigger_product_id: '',
    trigger_product_name: '',
    trigger_category: 'T-SHIRT',
    recommended_product_id: '',
    recommended_product_name: '',
    recommendation_pitch: '',
    pricing_type: 'upgrade_diff',
    price_value: 0,
    min_order_qty: 1,
    priority: 5,
    is_active: true,
    notes: '',
  });

  // Simulator State
  const [simCustomer, setSimCustomer] = useState('');
  const [simSelectedProducts, setSimSelectedProducts] = useState([]);
  const [simCategory, setSimCategory] = useState('');
  const [simRecommendations, setSimRecommendations] = useState([]);
  const [simLoading, setSimLoading] = useState(false);
  const [simPerformed, setSimPerformed] = useState(true);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, rulesRes, oppsRes, prodRes, custRes, recRes] = await Promise.allSettled([
        upsellService.getAnalytics(),
        upsellService.getRules(),
        upsellService.getOpportunities(),
        upsellService.getProducts({ limit: 100 }),
        upsellService.getCustomers({ limit: 100 }),
        upsellService.getRecommendations({}),
      ]);

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.success) {
        setAnalytics(analyticsRes.value.data);
      }
      if (rulesRes.status === 'fulfilled' && rulesRes.value?.success) {
        setRules(rulesRes.value.data || []);
      }
      if (oppsRes.status === 'fulfilled' && oppsRes.value?.success) {
        setOpportunities(oppsRes.value.data || []);
      }
      if (prodRes.status === 'fulfilled') {
        const prodData = prodRes.value?.data?.products || prodRes.value?.data || [];
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
      if (custRes.status === 'fulfilled') {
        const custData = custRes.value?.data?.customers || custRes.value?.data || [];
        setCustomers(Array.isArray(custData) ? custData : []);
      }
      if (recRes.status === 'fulfilled' && recRes.value?.success) {
        const recList = recRes.value.data?.allRecommendations || (Array.isArray(recRes.value.data) ? recRes.value.data : []);
        setSimRecommendations(recList);
        setSimPerformed(true);
      }
    } catch (err) {
      console.error('Failed to load upsell data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-run recommendation when simulator inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      upsellService
        .getRecommendations({
          product_ids: simSelectedProducts,
          category: simCategory || undefined,
          customer_id: simCustomer || undefined,
        })
        .then((res) => {
          if (res?.success) {
            setSimRecommendations(res.data?.allRecommendations || (Array.isArray(res.data) ? res.data : []));
            setSimPerformed(true);
          }
        })
        .catch((err) => {
          console.warn('Auto-recommender error:', err);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [simSelectedProducts, simCategory, simCustomer]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (ruleTypeFilter !== 'all' && r.type !== ruleTypeFilter) return false;
      if (ruleStatusFilter === 'active' && !r.is_active) return false;
      if (ruleStatusFilter === 'inactive' && r.is_active) return false;
      if (ruleSearch) {
        const term = ruleSearch.toLowerCase();
        const matchesTitle = r.title?.toLowerCase().includes(term);
        const matchesCode = r.rule_code?.toLowerCase().includes(term);
        const matchesTrigger = r.trigger_product_name?.toLowerCase().includes(term) || r.trigger_category?.toLowerCase().includes(term);
        const matchesRec = r.recommended_product_name?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesCode && !matchesTrigger && !matchesRec) return false;
      }
      return true;
    });
  }, [rules, ruleTypeFilter, ruleStatusFilter, ruleSearch]);

  // Filtered Opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      if (oppStatusFilter !== 'all' && o.status !== oppStatusFilter) return false;
      if (oppSearch) {
        const term = oppSearch.toLowerCase();
        const matchesCust = o.customer_name?.toLowerCase().includes(term);
        const matchesCode = o.opportunity_code?.toLowerCase().includes(term);
        const matchesRule = o.rule_id?.title?.toLowerCase().includes(term);
        if (!matchesCust && !matchesCode && !matchesRule) return false;
      }
      return true;
    });
  }, [opportunities, oppStatusFilter, oppSearch]);

  // Open Create Modal
  const handleOpenCreateRule = () => {
    setEditingRule(null);
    setRuleForm({
      title: '',
      type: 'upsell',
      trigger_type: 'product',
      trigger_product_id: products[0]?._id || '',
      trigger_product_name: products[0]?.name || '',
      trigger_category: 'T-SHIRT',
      recommended_product_id: products[1]?._id || '',
      recommended_product_name: products[1]?.name || '',
      recommendation_pitch: '',
      pricing_type: 'upgrade_diff',
      price_value: 30,
      min_order_qty: 25,
      priority: 5,
      is_active: true,
      notes: '',
    });
    setIsRuleModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      title: rule.title || '',
      type: rule.type || 'upsell',
      trigger_type: rule.trigger_type || 'product',
      trigger_product_id: rule.trigger_product_id?._id || rule.trigger_product_id || '',
      trigger_product_name: rule.trigger_product_name || '',
      trigger_category: rule.trigger_category || 'T-SHIRT',
      recommended_product_id: rule.recommended_product_id?._id || rule.recommended_product_id || '',
      recommended_product_name: rule.recommended_product_name || '',
      recommendation_pitch: rule.recommendation_pitch || '',
      pricing_type: rule.pricing_type || 'upgrade_diff',
      price_value: rule.price_value || 0,
      min_order_qty: rule.min_order_qty || 1,
      priority: rule.priority || 5,
      is_active: rule.is_active ?? true,
      notes: rule.notes || '',
    });
    setIsRuleModalOpen(true);
  };

  // Save Rule
  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!ruleForm.title.trim()) {
      alert('Please enter a valid rule title.');
      return;
    }

    try {
      if (editingRule) {
        await upsellService.updateRule(editingRule._id, ruleForm);
      } else {
        await upsellService.createRule(ruleForm);
      }
      setIsRuleModalOpen(false);
      loadData();
    } catch (err) {
      alert(`Failed to save rule: ${err.message}`);
    }
  };

  // Toggle Rule Status
  const handleToggleRuleStatus = async (rule) => {
    try {
      await upsellService.updateRule(rule._id, { is_active: !rule.is_active });
      loadData();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Are you sure you want to delete rule "${rule.title}"?`)) return;
    try {
      await upsellService.deleteRule(rule._id);
      loadData();
    } catch (err) {
      alert(`Failed to delete rule: ${err.message}`);
    }
  };

  // Run Simulator / Live Recommender
  const handleRunSimulator = async () => {
    try {
      setSimLoading(true);
      setSimPerformed(true);
      const res = await upsellService.getRecommendations({
        product_ids: simSelectedProducts,
        category: simCategory || undefined,
        customer_id: simCustomer || undefined,
      });
      if (res.success) {
        setSimRecommendations(res.data?.allRecommendations || (Array.isArray(res.data) ? res.data : []));
      }
    } catch (err) {
      alert(`Recommender error: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  // Open Pitch Modal for logging
  const handleOpenPitchModal = (rule, outcome = 'accepted') => {
    setActivePitchRule(rule);
    setPitchStatus(outcome);
    setPitchNotes('');
    setDeclinedReason('Budget Constraint');
    setPitchQty(rule.min_order_qty || 50);
    setIsPitchModalOpen(true);
  };

  // Save Pitch Result
  const handleSavePitchResult = async (e) => {
    e.preventDefault();
    if (!activePitchRule) return;

    try {
      let revenueAmount = 0;
      if (pitchStatus === 'accepted') {
        if (activePitchRule.pricing_type === 'upgrade_diff' || activePitchRule.pricing_type === 'special_price') {
          revenueAmount = (activePitchRule.price_value || 0) * Number(pitchQty || 1);
        } else if (activePitchRule.pricing_type === 'discount_percent') {
          revenueAmount = 450 * Number(pitchQty || 1) * 0.92; // estimated bundle price
        } else {
          revenueAmount = 500 * Number(pitchQty || 1);
        }
      }

      const custObj = customers.find((c) => c._id === simCustomer);

      await upsellService.logPitchResult({
        rule_id: activePitchRule._id,
        customer_id: simCustomer || null,
        customer_name: custObj?.company_name || custObj?.name || 'Walk-in B2B Client',
        status: pitchStatus,
        declined_reason: pitchStatus === 'declined' ? declinedReason : undefined,
        quantity_sold: pitchStatus === 'accepted' ? Number(pitchQty) : 0,
        revenue_amount: revenueAmount,
        potential_additional_value: revenueAmount,
        notes: pitchNotes,
      });

      setIsPitchModalOpen(false);
      loadData();
      alert(`Pitch result recorded successfully! Outcome: ${pitchStatus.toUpperCase()}`);
    } catch (err) {
      alert(`Failed to log pitch: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Upsell & Cross-sell Management"
        subtitle="Intelligent revenue maximization engine: Upgrades, complementary garment bundles, and pitch pipeline."
        breadcrumbs={[
          { label: 'Sales & CRM', link: '/sales/quotations' },
          { label: 'Upsell & Cross-sell' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleOpenCreateRule}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-2xs shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'analytics'
              ? 'bg-emerald-600 text-white shadow-soft font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Analytics & Performance
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'rules'
              ? 'bg-emerald-600 text-white shadow-soft font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Rules Catalog ({rules.length})
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'simulator'
              ? 'bg-emerald-600 text-white shadow-soft font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Smart Recommender & Pitch
        </button>

        <button
          onClick={() => setActiveTab('opportunities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'opportunities'
              ? 'bg-emerald-600 text-white shadow-soft font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          Opportunity Pipeline ({opportunities.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ANALYTICS & DASHBOARD
         ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Additional Revenue</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  ₹{(analytics?.totalAdditionalRevenue || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Direct incremental order value
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pitch Conversion Rate</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {analytics?.overallConversionRate || 0}%
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  {analytics?.totalAccepted || 0} accepted out of {analytics?.totalPitched || 0} pitched
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Upsell vs Cross-sell Split</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-slate-900 font-mono flex items-center gap-2">
                  <span className="text-indigo-600">₹{(analytics?.totalUpsellRevenue || 0).toLocaleString('en-IN')}</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-purple-600">₹{(analytics?.totalCrossSellRevenue || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-3">
                  <span>Upgrades</span>
                  <span>Complementary Bundles</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Strategic Rules</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {analytics?.activeRulesCount || 0} / {analytics?.totalRulesCount || 0}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  Automated garment matching engine
                </div>
              </div>
            </div>
          </div>

          {/* Top Converting Rules & Recent Opportunity Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Converting Rules */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    Top Performing Upsell & Cross-sell Rules
                  </h3>
                  <p className="text-xs text-slate-500">Ranked by verified incremental revenue generated</p>
                </div>
                <button
                  onClick={() => setActiveTab('rules')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {(analytics?.topRules || []).map((rule, idx) => {
                  const pitched = rule.conversion_stats?.times_pitched || 0;
                  const accepted = rule.conversion_stats?.times_accepted || 0;
                  const winRate = pitched > 0 ? Math.round((accepted / pitched) * 100) : 0;
                  const rev = rule.conversion_stats?.revenue_generated || 0;

                  return (
                    <div
                      key={rule._id}
                      className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-sm">{rule.title}</span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                rule.type === 'upsell'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {rule.type === 'upsell' ? 'Upsell Upgrade' : 'Cross-sell Bundle'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{rule.recommendation_pitch}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div>
                          <div className="text-xs text-slate-400 font-medium">Win Rate</div>
                          <div className="text-sm font-bold text-slate-800 font-mono">{winRate}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium">Revenue Added</div>
                          <div className="text-sm font-bold text-emerald-600 font-mono">
                            ₹{rev.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Pitch Recommender Callout */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-soft flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Recommender
                </div>
                <h4 className="text-lg font-bold">Assist Your Sales Reps</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  During client calls or order creation, use our real-time matching engine to suggest high-margin apparel upgrades and matching accessories on the fly.
                </p>
                <div className="mt-4 space-y-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Single Jersey → Bio-Washed Pique (+₹45/pcs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>T-Shirts + Prime Trackpants (8% Set Discount)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Branded Packaging & Barcode Hangtags (+₹15/pcs)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/60">
                <button
                  onClick={() => setActiveTab('simulator')}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Launch Pitch Simulator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RULES CATALOG & MANAGEMENT
         ========================================================================= */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Rule Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rules, garments..."
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setRuleTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ruleTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setRuleTypeFilter('upsell')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ruleTypeFilter === 'upsell' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Upsells
                </button>
                <button
                  onClick={() => setRuleTypeFilter('cross_sell')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ruleTypeFilter === 'cross_sell' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Cross-sells
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={ruleStatusFilter}
                onChange={(e) => setRuleStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateRule}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                Add Strategy Rule
              </button>
            </div>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRules.map((rule) => {
              const pitched = rule.conversion_stats?.times_pitched || 0;
              const accepted = rule.conversion_stats?.times_accepted || 0;
              const rate = pitched > 0 ? Math.round((accepted / pitched) * 100) : 0;
              const rev = rule.conversion_stats?.revenue_generated || 0;

              return (
                <div
                  key={rule._id}
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-soft p-5 flex flex-col justify-between ${
                    rule.is_active ? 'border-slate-200/80 hover:border-emerald-300' : 'border-slate-200 opacity-60 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Header badge & Code */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-slate-500">{rule.rule_code}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            rule.type === 'upsell'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {rule.type === 'upsell' ? 'Upsell Upgrade' : 'Cross-sell Bundle'}
                        </span>
                        <button
                          onClick={() => handleToggleRuleStatus(rule)}
                          title={rule.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                          className={`w-2.5 h-2.5 rounded-full ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        />
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base leading-snug">{rule.title}</h4>

                    {/* Trigger & Recommendation Details */}
                    <div className="mt-3.5 space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Trigger Condition:
                        </div>
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          {rule.trigger_type === 'all'
                            ? 'All Orders & Inquiries'
                            : rule.trigger_type === 'category'
                            ? `Category: ${rule.trigger_category}`
                            : `Product: ${rule.trigger_product_name || 'Selected Garment'}`}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
                        <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                          Recommended Upgrade / Add-on:
                        </div>
                        <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          {rule.recommended_product_name || 'Recommended Garment'}
                        </div>
                        <div className="text-[11px] font-medium text-emerald-700 flex items-center justify-between">
                          <span>
                            Pricing: {rule.pricing_type === 'upgrade_diff' && `+₹${rule.price_value}/pcs`}
                            {rule.pricing_type === 'discount_percent' && `${rule.price_value}% Bundle Off`}
                            {rule.pricing_type === 'special_price' && `₹${rule.price_value} Special Price`}
                            {rule.pricing_type === 'flat_discount' && `₹${rule.price_value} Flat Discount`}
                          </span>
                          <span>MOQ: {rule.min_order_qty} pcs</span>
                        </div>
                      </div>

                      {rule.recommendation_pitch && (
                        <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100">
                          "{rule.recommendation_pitch}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-slate-400 font-medium">Win Rate ({accepted}/{pitched})</div>
                      <div className="font-bold text-slate-800 font-mono">{rate}% • ₹{rev.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPitchModal(rule, 'accepted')}
                        title="Simulate / Record Pitch"
                        className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditRule(rule)}
                        title="Edit Rule"
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule)}
                        title="Delete Rule"
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRules.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">No strategy rules found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No upsell or cross-sell rules match your current search and filter settings.
              </p>
              <button
                onClick={handleOpenCreateRule}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Rule
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: SMART RECOMMENDER & LIVE PITCH SIMULATOR
         ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Live Sales Pitch Recommender</h3>
                <p className="text-xs text-slate-500">
                  Select the items in the customer's draft order or quotation to generate tailored upsell upgrades and add-on combinations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Customer (Optional)
                </label>
                <select
                  value={simCustomer}
                  onChange={(e) => setSimCustomer(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- General Walk-in / Unassigned --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.company_name || c.name} ({c.customer_code || 'B2B'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Garment Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Order Garment Category
                </label>
                <select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Auto-detect or Any Category --</option>
                  <option value="T-SHIRT">T-SHIRT</option>
                  <option value="POLO">POLO</option>
                  <option value="TRACKPANT">TRACKPANT</option>
                  <option value="SHIRTS">SHIRTS</option>
                  <option value="FABRIC">FABRIC</option>
                </select>
              </div>

              {/* Action Trigger */}
              <div className="flex items-end">
                <button
                  onClick={handleRunSimulator}
                  disabled={simLoading}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-2xs flex items-center justify-center gap-2"
                >
                  <Zap className={`w-4 h-4 ${simLoading ? 'animate-spin' : ''}`} />
                  {simLoading ? 'Analyzing Order...' : 'Generate Recommendations'}
                </button>
              </div>
            </div>

            {/* Product Checkboxes */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Base Products in Cart / Order ({simSelectedProducts.length} selected):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                {products.map((p) => {
                  const isChecked = simSelectedProducts.includes(p._id);
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setSimSelectedProducts(simSelectedProducts.filter((id) => id !== p._id));
                        } else {
                          setSimSelectedProducts([...simSelectedProducts, p._id]);
                        }
                      }}
                      className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold truncate">{p.name}</div>
                      <div className={`text-[10px] ${isChecked ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {p.sku || p.category || 'Garment'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recommender Results */}
          {simPerformed && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Recommended Pitches ({simRecommendations.length} Opportunities Found)
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  Ranked by conversion priority & margin impact
                </span>
              </div>

              {simRecommendations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No matching rules triggered</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try selecting different products or a broad category like T-SHIRT.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {simRecommendations.map((rec) => {
                    const isUpsell = rec.type === 'upsell';
                    return (
                      <div
                        key={rec._id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5 flex flex-col justify-between hover:border-emerald-400 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                isUpsell ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {isUpsell ? 'Upsell Premium Upgrade' : 'Cross-sell Complementary Bundle'}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-400">{rec.rule_code}</span>
                          </div>

                          <h5 className="font-bold text-slate-900 text-base">{rec.title}</h5>

                          {/* Recommendation Body */}
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                            <div className="font-semibold text-slate-800 flex items-center gap-2">
                              <span className="text-slate-400">Target Product:</span>
                              <span className="text-emerald-700 font-bold">
                                {rec.recommended_product_name || rec.recommended_product_id?.name || 'Complementary Garment Pack'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span>
                                Pricing Impact:{' '}
                                <strong className="text-slate-900 font-bold">
                                  {rec.pricing_type === 'upgrade_diff' && `+₹${rec.price_value}/piece difference`}
                                  {rec.pricing_type === 'discount_percent' && `${rec.price_value}% Bundle Discount`}
                                  {rec.pricing_type === 'special_price' && `Special ₹${rec.price_value}/piece`}
                                  {rec.pricing_type === 'flat_discount' && `₹${rec.price_value} Flat off`}
                                </strong>
                              </span>
                              <span>MOQ: {rec.min_order_qty} pcs</span>
                            </div>
                          </div>

                          {/* Talking Points / Pitch script */}
                          <div className="mt-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                            <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                              Sales Pitch Talking Points:
                            </div>
                            <p className="text-emerald-950 italic leading-relaxed">
                              "{rec.recommendation_pitch}"
                            </p>
                          </div>
                        </div>

                        {/* Quick 1-click Pitch Logging */}
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          <button
                            onClick={() => handleOpenPitchModal(rec, 'declined')}
                            className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5 text-rose-500" />
                            Client Declined
                          </button>
                          <button
                            onClick={() => handleOpenPitchModal(rec, 'accepted')}
                            className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Client Accepted
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: OPPORTUNITY PIPELINE & PITCH AUDIT LOG
         ========================================================================= */}
      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer, opportunity #..."
                  value={oppSearch}
                  onChange={(e) => setOppSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <select
                value={oppStatusFilter}
                onChange={(e) => setOppStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Pitch Outcomes</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="pitched">Pitched (Pending)</option>
                <option value="converted_to_invoice">Converted to Invoice</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredOpportunities.length} logged opportunities
            </div>
          </div>

          {/* Opportunity Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Opportunity #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Rule / Garment Strategy</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Additional Revenue</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Executive / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOpportunities.map((opp) => (
                    <tr key={opp._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {opp.opportunity_code}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(opp.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {opp.customer_name || 'Walk-in Client'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        {opp.rule_id?.title || 'Custom Garment Upgrade'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            opp.type === 'upsell'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {opp.type === 'upsell' ? 'Upsell' : 'Cross-sell'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {opp.quantity_sold || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {opp.potential_additional_value > 0
                          ? `₹${opp.potential_additional_value.toLocaleString('en-IN')}`
                          : '₹0'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            opp.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : opp.status === 'declined'
                              ? 'bg-rose-100 text-rose-800'
                              : opp.status === 'converted_to_invoice'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {opp.status === 'accepted' && <Check className="w-3 h-3" />}
                          {opp.status === 'declined' && <X className="w-3 h-3" />}
                          {opp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {opp.declined_reason
                          ? `Declined: ${opp.declined_reason}`
                          : opp.notes || opp.sales_executive || 'Logged'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOpportunities.length === 0 && (
              <div className="py-12 text-center">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No opportunities recorded</p>
                <p className="text-xs text-slate-500 mt-1">
                  Use the Smart Recommender tab to log customer pitch outcomes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE / EDIT STRATEGY RULE
         ========================================================================= */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? 'Edit Upsell / Cross-sell Rule' : 'Create New Strategy Rule'}
        size="lg"
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rule Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ruleForm.title}
                onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                placeholder="e.g. Upgrade Single Jersey to Bio-Washed Pique Polo"
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Strategy Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={ruleForm.type}
                onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value })}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="upsell">Upsell (Premium Upgrade in Same Category)</option>
                <option value="cross_sell">Cross-sell (Complementary Add-on / Bundle)</option>
              </select>
            </div>

            {/* Trigger Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trigger Matching Condition
              </label>
              <select
                value={ruleForm.trigger_type}
                onChange={(e) => setRuleForm({ ...ruleForm, trigger_type: e.target.value })}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="product">Specific Base Product</option>
                <option value="category">Entire Garment Category</option>
                <option value="all">Universal (All Orders / Inquiries)</option>
              </select>
            </div>

            {/* Conditional Trigger fields */}
            {ruleForm.trigger_type === 'product' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trigger Base Garment
                </label>
                <select
                  value={ruleForm.trigger_product_id}
                  onChange={(e) => {
                    const sel = products.find((p) => p._id === e.target.value);
                    setRuleForm({
                      ...ruleForm,
                      trigger_product_id: e.target.value,
                      trigger_product_name: sel ? sel.name : '',
                    });
                  }}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Base Garment --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku || p.category || 'Product'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {ruleForm.trigger_type === 'category' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trigger Category
                </label>
                <select
                  value={ruleForm.trigger_category}
                  onChange={(e) => setRuleForm({ ...ruleForm, trigger_category: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="T-SHIRT">T-SHIRT</option>
                  <option value="POLO">POLO</option>
                  <option value="TRACKPANT">TRACKPANT</option>
                  <option value="SHIRTS">SHIRTS</option>
                  <option value="FABRIC">FABRIC</option>
                </select>
              </div>
            )}

            {/* Recommended Product */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recommended Product / Garment <span className="text-rose-500">*</span>
              </label>
              <select
                value={ruleForm.recommended_product_id}
                onChange={(e) => {
                  const sel = products.find((p) => p._id === e.target.value);
                  setRuleForm({
                    ...ruleForm,
                    recommended_product_id: e.target.value,
                    recommended_product_name: sel ? sel.name : '',
                  });
                }}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Select Recommended Garment --</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku || p.category || 'Product'})
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing Type & Value */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pricing Model</label>
              <select
                value={ruleForm.pricing_type}
                onChange={(e) => setRuleForm({ ...ruleForm, pricing_type: e.target.value })}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="upgrade_diff">+₹ Upgrade Difference / Piece</option>
                <option value="discount_percent">% Discount on Add-on / Bundle</option>
                <option value="special_price">Flat Special Price (₹/pcs)</option>
                <option value="flat_discount">Flat Discount (₹ off total)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Price / Discount Value</label>
              <input
                type="number"
                min="0"
                step="any"
                value={ruleForm.price_value}
                onChange={(e) => setRuleForm({ ...ruleForm, price_value: Number(e.target.value) })}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Order Qty (MOQ)</label>
              <input
                type="number"
                min="1"
                value={ruleForm.min_order_qty}
                onChange={(e) => setRuleForm({ ...ruleForm, min_order_qty: Number(e.target.value) })}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Priority (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={ruleForm.priority}
                onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Pitch Script */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pitch Script & Value Proposition
              </label>
              <textarea
                rows={3}
                value={ruleForm.recommendation_pitch}
                onChange={(e) => setRuleForm({ ...ruleForm, recommendation_pitch: e.target.value })}
                placeholder="Recommended talking point for sales executive (e.g. Upgrade to bio-washed 220 GSM pique polo for +₹45/pcs with superior showroom margin)."
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_toggle"
                checked={ruleForm.is_active}
                onChange={(e) => setRuleForm({ ...ruleForm, is_active: e.target.checked })}
                className="rounded-sm text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <label htmlFor="is_active_toggle" className="text-xs font-semibold text-slate-700">
                Rule is Active in Automatic Engine
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-2xs"
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: RECORD PITCH OUTCOME
         ========================================================================= */}
      <Modal
        isOpen={isPitchModalOpen}
        onClose={() => setIsPitchModalOpen(false)}
        title="Record Pitch Outcome"
        size="md"
      >
        <form onSubmit={handleSavePitchResult} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
            <div className="font-bold text-slate-900">{activePitchRule?.title}</div>
            <div className="text-slate-500">{activePitchRule?.recommended_product_name}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Pitch Outcome</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPitchStatus('accepted')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  pitchStatus === 'accepted'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <Check className="w-4 h-4" /> Client Accepted
              </button>

              <button
                type="button"
                onClick={() => setPitchStatus('declined')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  pitchStatus === 'declined'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <X className="w-4 h-4" /> Client Declined
              </button>
            </div>
          </div>

          {pitchStatus === 'accepted' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Accepted Additional Quantity (Pcs)
              </label>
              <input
                type="number"
                min="1"
                required
                value={pitchQty}
                onChange={(e) => setPitchQty(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Decline Reason
              </label>
              <select
                value={declinedReason}
                onChange={(e) => setDeclinedReason(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Budget Constraint">Budget Constraint</option>
                <option value="Already Stocked">Already Stocked / Has Inventory</option>
                <option value="Wrong Season Variant">Wrong Season Variant</option>
                <option value="Requires Prior Sampling">Requires Prior Sampling</option>
                <option value="Not Interested">Not Interested in Bundle</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sales Rep Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={pitchNotes}
              onChange={(e) => setPitchNotes(e.target.value)}
              placeholder="Add client feedback or follow-up notes..."
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPitchModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-2xs"
            >
              Save Result
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
