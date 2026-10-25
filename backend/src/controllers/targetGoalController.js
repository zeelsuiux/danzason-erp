const mongoose = require('mongoose');
const TargetGoal = require('../models/TargetGoal');
const TeamMember = require('../models/TeamMember');
const SalesInvoice = require('../models/SalesInvoice');
const SalesOrder = require('../models/SalesOrder');
const PurchaseOrder = require('../models/PurchaseOrder');
const FinanceTransaction = require('../models/FinanceTransaction');

/**
 * Get all targets and goals with optional filters
 */
exports.getTargetGoals = async (req, res) => {
  try {
    const { category, department, period_type, status, assigned_to, search } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }
    if (department && department !== 'all') {
      filter.department = department;
    }
    if (period_type && period_type !== 'all') {
      filter.period_type = period_type;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (assigned_to && assigned_to !== 'all') {
      if (mongoose.Types.ObjectId.isValid(assigned_to)) {
        filter.assigned_to = assigned_to;
      }
    }
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: regex },
        { goal_code: regex },
        { assignee_name: regex },
        { department: regex },
        { description: regex },
      ];
    }

    const goals = await TargetGoal.find(filter)
      .populate('assigned_to', 'name email member_code designation department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: goals.length,
      data: goals,
    });
  } catch (error) {
    console.error('Error in getTargetGoals:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving target goals' });
  }
};

/**
 * Get single target goal by ID
 */
exports.getTargetGoalById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid target goal ID' });
    }

    const goal = await TargetGoal.findById(id).populate(
      'assigned_to',
      'name email member_code designation department'
    );

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Target goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error in getTargetGoalById:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving target goal' });
  }
};

/**
 * Create a new target goal
 */
exports.createTargetGoal = async (req, res) => {
  try {
    const {
      title,
      category,
      target_level,
      department,
      assigned_to,
      assignee_name,
      period_type,
      period_label,
      start_date,
      end_date,
      metric_type,
      metric_unit,
      target_value,
      actual_value,
      priority,
      incentive_type,
      incentive_value,
      description,
      milestones,
    } = req.body;

    if (!title || !category || target_value === undefined || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, target value, and end date are required',
      });
    }

    let finalAssigneeName = assignee_name || 'All Department Members';
    let finalDepartment = department || 'Sales & CRM';

    if (assigned_to && mongoose.Types.ObjectId.isValid(assigned_to)) {
      const member = await TeamMember.findById(assigned_to);
      if (member) {
        finalAssigneeName = member.name;
        finalDepartment = member.department || finalDepartment;
      }
    }

    const newGoal = new TargetGoal({
      title,
      category,
      target_level: target_level || 'individual',
      department: finalDepartment,
      assigned_to: assigned_to && mongoose.Types.ObjectId.isValid(assigned_to) ? assigned_to : null,
      assignee_name: finalAssigneeName,
      period_type: period_type || 'monthly',
      period_label: period_label || 'Current Period',
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: new Date(end_date),
      metric_type: metric_type || 'revenue_amount',
      metric_unit: metric_unit || '₹',
      target_value: Number(target_value),
      actual_value: Number(actual_value) || 0,
      priority: priority || 'high',
      incentive_type: incentive_type || 'none',
      incentive_value: Number(incentive_value) || 0,
      description: description || '',
      milestones: Array.isArray(milestones) ? milestones : [],
    });

    await newGoal.save();

    res.status(201).json({
      success: true,
      message: 'Target goal created successfully',
      data: newGoal,
    });
  } catch (error) {
    console.error('Error in createTargetGoal:', error);
    res.status(500).json({ success: false, message: 'Server error creating target goal' });
  }
};

/**
 * Update an existing target goal
 */
exports.updateTargetGoal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid target goal ID' });
    }

    const goal = await TargetGoal.findById(id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Target goal not found' });
    }

    const fieldsToUpdate = [
      'title',
      'category',
      'target_level',
      'department',
      'period_type',
      'period_label',
      'start_date',
      'end_date',
      'metric_type',
      'metric_unit',
      'target_value',
      'actual_value',
      'status',
      'priority',
      'incentive_type',
      'incentive_value',
      'description',
      'milestones',
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        goal[field] = req.body[field];
      }
    });

    if (req.body.assigned_to !== undefined) {
      if (req.body.assigned_to && mongoose.Types.ObjectId.isValid(req.body.assigned_to)) {
        goal.assigned_to = req.body.assigned_to;
        const member = await TeamMember.findById(req.body.assigned_to);
        if (member) {
          goal.assignee_name = member.name;
          goal.department = member.department || goal.department;
        }
      } else {
        goal.assigned_to = null;
        goal.assignee_name = req.body.assignee_name || 'All Department Members';
      }
    }

    await goal.save();

    res.json({
      success: true,
      message: 'Target goal updated successfully',
      data: goal,
    });
  } catch (error) {
    console.error('Error in updateTargetGoal:', error);
    res.status(500).json({ success: false, message: 'Server error updating target goal' });
  }
};

/**
 * Delete a target goal
 */
exports.deleteTargetGoal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid target goal ID' });
    }

    const goal = await TargetGoal.findByIdAndDelete(id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Target goal not found' });
    }

    res.json({
      success: true,
      message: 'Target goal deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteTargetGoal:', error);
    res.status(500).json({ success: false, message: 'Server error deleting target goal' });
  }
};

/**
 * Quick increment goal actual progress (+1 order, +X revenue, etc.)
 */
exports.quickIncrementGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const incrementBy = Number(req.body.amount || req.body.increment || 1);

    const goal = await TargetGoal.findById(id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Target goal not found' });
    }

    const prevVal = goal.actual_value || 0;
    goal.actual_value = prevVal + incrementBy;

    if (goal.target_value > 0) {
      goal.achievement_pct = Math.round((goal.actual_value / goal.target_value) * 100 * 10) / 10;
    }

    if (goal.achievement_pct >= 100) {
      goal.status = 'achieved';
    } else if (goal.achievement_pct >= 75) {
      goal.status = 'on_track';
    } else if (goal.achievement_pct >= 40) {
      goal.status = 'active';
    } else {
      goal.status = 'behind';
    }

    if (goal.achievement_pct >= 100 && goal.incentive_value > 0) {
      if (goal.incentive_type === 'percentage') {
        goal.earned_incentive = Math.round((goal.actual_value * goal.incentive_value) / 100);
      } else if (goal.incentive_type === 'fixed_bonus') {
        goal.earned_incentive = goal.incentive_value;
      }
    }

    goal.progress_notes.push({
      note: req.body.note || `Recorded +${incrementBy} ${goal.metric_unit} achievement`,
      recorded_by: req.body.recorded_by || 'User Action',
      recorded_at: new Date(),
      previous_value: prevVal,
      new_value: goal.actual_value,
    });

    await goal.save();

    res.json({
      success: true,
      message: `Goal updated: ${prevVal} ➔ ${goal.actual_value} ${goal.metric_unit}`,
      data: goal,
    });
  } catch (error) {
    console.error('Error in quickIncrementGoal:', error);
    res.status(500).json({ success: false, message: 'Server error incrementing goal' });
  }
};

/**
 * Record progress or manual note for a target goal
 */
exports.recordGoalProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_actual_value, note, recorded_by } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid target goal ID' });
    }

    const goal = await TargetGoal.findById(id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Target goal not found' });
    }

    const prevVal = goal.actual_value;
    if (new_actual_value !== undefined) {
      goal.actual_value = Number(new_actual_value);
    }

    if (note && note.trim() !== '') {
      goal.progress_notes.push({
        note: note.trim(),
        recorded_by: recorded_by || 'Manager',
        recorded_at: new Date(),
        previous_value: prevVal,
        new_value: goal.actual_value,
      });
    }

    await goal.save();

    res.json({
      success: true,
      message: 'Progress recorded successfully',
      data: goal,
    });
  } catch (error) {
    console.error('Error in recordGoalProgress:', error);
    res.status(500).json({ success: false, message: 'Server error recording goal progress' });
  }
};

/**
 * Auto-sync target goals with real ERP transactional actuals
 */
exports.syncGoalProgress = async (req, res) => {
  try {
    const goals = await TargetGoal.find({ status: { $ne: 'closed' } });
    let updatedCount = 0;

    for (const goal of goals) {
      const startDate = goal.start_date || new Date('2020-01-01');
      const endDate = goal.end_date || new Date('2030-12-31');

      if (goal.category === 'sales') {
        if (goal.metric_type === 'revenue_amount') {
          const invMatch = {
            invoice_date: { $gte: startDate, $lte: endDate },
            status: { $nin: ['cancelled', 'void'] },
          };
          const invoices = await SalesInvoice.find(invMatch).select('total_amount');
          const sumRev = invoices.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
          if (sumRev > 0) {
            goal.actual_value = Math.round(sumRev);
            await goal.save();
            updatedCount++;
          }
        } else if (goal.metric_type === 'order_count') {
          const soCount = await SalesOrder.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ['cancelled'] },
          });
          if (soCount > 0) {
            goal.actual_value = soCount;
            await goal.save();
            updatedCount++;
          }
        }
      } else if (goal.category === 'procurement') {
        if (goal.metric_type === 'order_count') {
          const poCount = await PurchaseOrder.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ['cancelled', 'void'] },
          });
          if (poCount > 0) {
            goal.actual_value = poCount;
            await goal.save();
            updatedCount++;
          }
        } else if (goal.metric_type === 'revenue_amount') {
          const pos = await PurchaseOrder.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ['cancelled', 'void'] },
          }).select('total_amount');
          const sumPO = pos.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
          if (sumPO > 0) {
            goal.actual_value = Math.round(sumPO);
            await goal.save();
            updatedCount++;
          }
        }
      } else if (goal.category === 'finance') {
        if (goal.metric_type === 'collection_amount' || goal.metric_type === 'revenue_amount') {
          const receipts = await FinanceTransaction.find({
            transaction_date: { $gte: startDate, $lte: endDate },
            type: { $in: ['credit', 'income'] },
          }).select('amount');
          const sumColl = receipts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          if (sumColl > 0) {
            goal.actual_value = Math.round(sumColl);
            await goal.save();
            updatedCount++;
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Progress synced across ${updatedCount} target goals using live ERP transactions.`,
      updatedCount,
    });
  } catch (error) {
    console.error('Error in syncGoalProgress:', error);
    res.status(500).json({ success: false, message: 'Server error syncing goal progress' });
  }
};

/**
 * Get KPI analytics summary and leaderboard
 */
exports.getGoalAnalyticsSummary = async (req, res) => {
  try {
    const goals = await TargetGoal.find().lean();

    const totalGoals = goals.length;
    const achievedGoals = goals.filter((g) => g.status === 'achieved').length;
    const onTrackGoals = goals.filter((g) => g.status === 'on_track').length;
    const behindGoals = goals.filter((g) => g.status === 'behind').length;
    const activeGoals = goals.filter(
      (g) => g.status === 'active' || g.status === 'on_track' || g.status === 'behind'
    ).length;

    // Sales totals
    const salesGoals = goals.filter(
      (g) => g.category === 'sales' && g.metric_type === 'revenue_amount'
    );
    const totalTargetRevenue = salesGoals.reduce((sum, g) => sum + (g.target_value || 0), 0);
    const totalActualRevenue = salesGoals.reduce((sum, g) => sum + (g.actual_value || 0), 0);
    const overallRevenuePct =
      totalTargetRevenue > 0
        ? Math.round((totalActualRevenue / totalTargetRevenue) * 100 * 10) / 10
        : 0;

    // Total earned incentives
    const totalIncentivesEarned = goals.reduce((sum, g) => sum + (g.earned_incentive || 0), 0);

    // Department breakdown
    const deptMap = {};
    goals.forEach((g) => {
      const dept = g.department || 'Other';
      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, total: 0, achieved: 0, sum_pct: 0 };
      }
      deptMap[dept].total++;
      if (g.status === 'achieved') deptMap[dept].achieved++;
      deptMap[dept].sum_pct += g.achievement_pct || 0;
    });

    const departmentStats = Object.values(deptMap).map((d) => ({
      department: d.department,
      total_goals: d.total,
      achieved: d.achieved,
      avg_achievement_pct: d.total > 0 ? Math.round((d.sum_pct / d.total) * 10) / 10 : 0,
    }));

    // Top performers leaderboard
    const individualGoals = goals.filter(
      (g) => g.target_level === 'individual' && g.assigned_to
    );
    const individualLeaderboard = individualGoals
      .sort((a, b) => (b.achievement_pct || 0) - (a.achievement_pct || 0))
      .slice(0, 6)
      .map((g) => ({
        goal_id: g._id,
        assignee_name: g.assignee_name,
        department: g.department,
        title: g.title,
        target_value: g.target_value,
        actual_value: g.actual_value,
        metric_unit: g.metric_unit,
        achievement_pct: g.achievement_pct,
        status: g.status,
        earned_incentive: g.earned_incentive,
      }));

    res.json({
      success: true,
      data: {
        totalGoals,
        activeGoals,
        achievedGoals,
        onTrackGoals,
        behindGoals,
        totalTargetRevenue,
        totalActualRevenue,
        overallRevenuePct,
        totalIncentivesEarned,
        departmentStats,
        individualLeaderboard,
      },
    });
  } catch (error) {
    console.error('Error in getGoalAnalyticsSummary:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving analytics' });
  }
};

/**
 * Seed starter targets & goals if database is empty
 */
exports.seedDefaultTargetGoals = async (req, res) => {
  try {
    const existing = await TargetGoal.countDocuments();
    if (existing > 0) {
      return res.json({
        success: true,
        message: 'Targets and goals already exist. No seeding required.',
        count: existing,
      });
    }

    const members = await TeamMember.find({ status: 'active' }).limit(5);

    const starterGoals = [
      {
        title: 'Q4 Premium Denim Sales Drive',
        category: 'sales',
        target_level: 'department',
        department: 'Sales & CRM',
        assignee_name: 'All Sales Team Members',
        period_type: 'quarterly',
        period_label: 'Q4 2026-27',
        start_date: new Date('2026-10-01'),
        end_date: new Date('2026-12-31'),
        metric_type: 'revenue_amount',
        metric_unit: '₹',
        target_value: 1200000,
        actual_value: 945000,
        priority: 'critical',
        incentive_type: 'percentage',
        incentive_value: 2.5,
        description: 'Drive sales across domestic retail partners for new denim catalog lines.',
        milestones: [
          { title: 'Onboard 15 new wholesale accounts', is_completed: true, weight: 30 },
          { title: 'Dispatch first 500 catalog boxes', is_completed: true, weight: 30 },
          { title: 'Exceed 12 Lakhs revenue run-rate', is_completed: false, weight: 40 },
        ],
      },
      {
        title: 'Monthly B2B Lead Conversion Milestone',
        category: 'sales',
        target_level: 'individual',
        department: 'Sales & CRM',
        assigned_to: members[0]?._id || null,
        assignee_name: members[0]?.name || 'Rajesh Mehta',
        period_type: 'monthly',
        period_label: 'October 2026',
        start_date: new Date('2026-10-01'),
        end_date: new Date('2026-10-31'),
        metric_type: 'order_count',
        metric_unit: 'Orders',
        target_value: 25,
        actual_value: 22,
        priority: 'high',
        incentive_type: 'fixed_bonus',
        incentive_value: 15000,
        description: 'Convert warm inquiries from Ahmedabad and Surat textile exhibitions.',
        milestones: [
          { title: 'Contact all 60 leads from expo', is_completed: true, weight: 50 },
          { title: 'Issue 35 samples/quotations', is_completed: true, weight: 25 },
          { title: 'Close 25 confirmed orders', is_completed: false, weight: 25 },
        ],
      },
      {
        title: 'Raw Material Direct Mill Procurement Cost Savings',
        category: 'procurement',
        target_level: 'department',
        department: 'Procurement',
        assignee_name: 'Procurement Team',
        period_type: 'monthly',
        period_label: 'October 2026',
        start_date: new Date('2026-10-01'),
        end_date: new Date('2026-10-31'),
        metric_type: 'order_count',
        metric_unit: 'POs',
        target_value: 18,
        actual_value: 16,
        priority: 'high',
        incentive_type: 'none',
        incentive_value: 0,
        description: 'Negotiate volume cotton yarn and polyester fabric contracts directly with mills.',
        milestones: [
          { title: 'Benchmark prices with 4 certified suppliers', is_completed: true, weight: 50 },
          { title: 'Finalize 18 verified POs', is_completed: true, weight: 50 },
        ],
      },
      {
        title: 'Contractor Job Work Finished Output (PCS)',
        category: 'production',
        target_level: 'department',
        department: 'Manufacturing',
        assignee_name: 'Job Work Operations',
        period_type: 'monthly',
        period_label: 'October 2026',
        start_date: new Date('2026-10-01'),
        end_date: new Date('2026-10-31'),
        metric_type: 'unit_volume',
        metric_unit: 'PCS',
        target_value: 5000,
        actual_value: 5200,
        priority: 'critical',
        incentive_type: 'fixed_bonus',
        incentive_value: 20000,
        description: 'Ensure timely stitching and processing delivery across contractor network.',
        milestones: [
          { title: 'Release all MPO lots by 5th Oct', is_completed: true, weight: 40 },
          { title: 'Zero quality rejection on final audit', is_completed: true, weight: 30 },
          { title: 'Complete 5000 finished pieces', is_completed: true, weight: 30 },
        ],
      },
      {
        title: 'Outstanding Debtor Recovery & Cash Collection',
        category: 'finance',
        target_level: 'individual',
        department: 'Finance & Accounts',
        assigned_to: members[1]?._id || null,
        assignee_name: members[1]?.name || 'Pooja Patel',
        period_type: 'monthly',
        period_label: 'October 2026',
        start_date: new Date('2026-10-01'),
        end_date: new Date('2026-10-31'),
        metric_type: 'collection_amount',
        metric_unit: '₹',
        target_value: 600000,
        actual_value: 620000,
        priority: 'critical',
        incentive_type: 'percentage',
        incentive_value: 1.5,
        description: 'Clear all 45+ day aging receivables from wholesale trade distributors.',
        milestones: [
          { title: 'Follow-up with top 10 overdue accounts', is_completed: true, weight: 50 },
          { title: 'Recover minimum 6 Lakhs payments', is_completed: true, weight: 50 },
        ],
      },
      {
        title: 'Strategic OKR: Launch Online B2B Portal Across 5 States',
        category: 'strategic_okr',
        target_level: 'company_wide',
        department: 'Executive',
        assignee_name: 'Leadership Team',
        period_type: 'annual',
        period_label: 'FY 2026-27',
        start_date: new Date('2026-04-01'),
        end_date: new Date('2027-03-31'),
        metric_type: 'milestone',
        metric_unit: '%',
        target_value: 100,
        actual_value: 75,
        priority: 'high',
        incentive_type: 'none',
        incentive_value: 0,
        description: 'Expand Danza-Son distribution into Maharashtra, Rajasthan, MP, Karnataka, and Punjab.',
        milestones: [
          { title: 'Establish regional clearing agents', is_completed: true, weight: 25 },
          { title: 'Integrate live stock portal with ERP', is_completed: true, weight: 25 },
          { title: 'Sign up 100 verified dealers', is_completed: true, weight: 25 },
          { title: 'Achieve 50 Lakhs regional run-rate', is_completed: false, weight: 25 },
        ],
      },
    ];

    for (const item of starterGoals) {
      const g = new TargetGoal(item);
      await g.save();
    }

    res.json({
      success: true,
      message: 'Successfully seeded starter targets & goals.',
      count: starterGoals.length,
    });
  } catch (error) {
    console.error('Error in seedDefaultTargetGoals:', error);
    res.status(500).json({ success: false, message: 'Server error seeding default target goals' });
  }
};
