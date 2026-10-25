const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

// Helper: Calculate Date Ranges for Follow-ups
function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

// ==============================================================================
// 1. GET LEADS & FOLLOW-UPS DASHBOARD SUMMARY
// ==============================================================================
exports.getLeadsSummary = async (req, res) => {
  try {
    const { start: todayStart, end: todayEnd } = getTodayBounds();
    const now = new Date();

    const [
      totalLeads,
      activePipelineAgg,
      stageCountsAgg,
      sourceCountsAgg,
      wonLeads,
      lostLeads,
    ] = await Promise.all([
      Lead.countDocuments({ is_deleted: false }),
      Lead.aggregate([
        { $match: { is_deleted: false, status: { $nin: ['won', 'lost', 'junk'] } } },
        { $group: { _id: null, totalValue: { $sum: '$estimated_value' }, count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { is_deleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { is_deleted: false } },
        { $group: { _id: '$lead_source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.countDocuments({ is_deleted: false, status: 'won' }),
      Lead.countDocuments({ is_deleted: false, status: 'lost' }),
    ]);

    // Unwind followups to count today & overdue followups accurately
    const followupsAgg = await Lead.aggregate([
      { $match: { is_deleted: false } },
      { $unwind: '$followups' },
      { $match: { 'followups.status': 'scheduled' } },
      {
        $facet: {
          dueToday: [
            { $match: { 'followups.followup_date': { $gte: todayStart, $lte: todayEnd } } },
            { $count: 'count' },
          ],
          overdue: [
            { $match: { 'followups.followup_date': { $lt: todayStart } } },
            { $count: 'count' },
          ],
          upcoming: [
            { $match: { 'followups.followup_date': { $gt: todayEnd } } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const dueTodayCount = followupsAgg[0]?.dueToday[0]?.count || 0;
    const overdueCount = followupsAgg[0]?.overdue[0]?.count || 0;
    const upcomingCount = followupsAgg[0]?.upcoming[0]?.count || 0;

    const stageMap = {};
    stageCountsAgg.forEach((s) => {
      stageMap[s._id] = s.count;
    });

    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalLeads,
        pipelineValue: activePipelineAgg[0]?.totalValue || 0,
        activeLeadsCount: activePipelineAgg[0]?.count || 0,
        wonLeads,
        lostLeads,
        conversionRate: Number(conversionRate),
        followups: {
          dueToday: dueTodayCount,
          overdue: overdueCount,
          upcoming: upcomingCount,
        },
        stageCounts: stageMap,
        sourceCounts: sourceCountsAgg,
      },
    });
  } catch (err) {
    console.error('getLeadsSummary Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 2. GET LEADS (Filtered, Paginated, Searchable)
// ==============================================================================
exports.getLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      priority,
      lead_source,
      interest_type,
      assigned_to,
      sort_by = 'createdAt',
      sort_order = 'desc',
    } = req.query;

    const query = { is_deleted: false };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    if (lead_source && lead_source !== 'all') {
      query.lead_source = lead_source;
    }
    if (interest_type && interest_type !== 'all') {
      query.interest_type = interest_type;
    }
    if (assigned_to && assigned_to !== 'all') {
      query.assigned_to = { $regex: assigned_to, $options: 'i' };
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { lead_number: { $regex: q, $options: 'i' } },
        { lead_name: { $regex: q, $options: 'i' } },
        { company_name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
        { requirements: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 25;
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sort_by] = sort_order === 'asc' ? 1 : -1;
    if (sort_by !== '_id') sortObj._id = -1;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('converted_customer_id', 'customer_name customer_code email mobile'),
      Lead.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: leads,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('getLeads Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 3. GET LEAD BY ID
// ==============================================================================
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, is_deleted: false }).populate(
      'converted_customer_id'
    );
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error('getLeadById Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 4. CREATE LEAD
// ==============================================================================
exports.createLead = async (req, res) => {
  try {
    const {
      lead_name,
      company_name,
      mobile,
      email,
      lead_source,
      interest_type,
      estimated_value,
      priority,
      status,
      assigned_to,
      city,
      state,
      address,
      requirements,
      initial_followup_date,
      initial_followup_type,
      initial_followup_notes,
    } = req.body;

    if (!lead_name || !company_name || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Lead Name, Company Name, and Mobile Number are required.',
      });
    }

    const leadData = {
      lead_name: lead_name.trim(),
      company_name: company_name.trim(),
      mobile: mobile.trim(),
      email: (email || '').trim().toLowerCase(),
      lead_source: lead_source || 'WhatsApp',
      interest_type: interest_type || 'Finished Goods',
      estimated_value: Number(estimated_value) || 0,
      priority: priority || 'medium',
      status: status || 'new',
      assigned_to: assigned_to || 'Sales Team',
      city: (city || '').trim(),
      state: (state || 'Gujarat').trim(),
      address: (address || '').trim(),
      requirements: (requirements || '').trim(),
      followups: [],
    };

    // If an initial follow-up is scheduled
    if (initial_followup_date) {
      leadData.followups.push({
        followup_date: new Date(initial_followup_date),
        followup_type: initial_followup_type || 'Phone Call',
        status: 'scheduled',
        notes: initial_followup_notes || 'Initial inquiry follow-up',
        next_action: 'Contact client to understand requirements',
        conducted_by: assigned_to || 'Sales Representative',
      });
    }

    const lead = new Lead(leadData);
    await lead.save();

    res.status(201).json({
      success: true,
      message: `Lead ${lead.lead_number} created successfully`,
      data: lead,
    });
  } catch (err) {
    console.error('createLead Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 5. UPDATE LEAD
// ==============================================================================
exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, is_deleted: false });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const updatableFields = [
      'lead_name',
      'company_name',
      'mobile',
      'email',
      'lead_source',
      'interest_type',
      'estimated_value',
      'priority',
      'status',
      'assigned_to',
      'city',
      'state',
      'address',
      'requirements',
      'lost_reason',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    });

    await lead.save();

    res.json({
      success: true,
      message: `Lead ${lead.lead_number} updated successfully`,
      data: lead,
    });
  } catch (err) {
    console.error('updateLead Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 6. DELETE LEAD (Soft Delete)
// ==============================================================================
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, is_deleted: false });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    lead.is_deleted = true;
    await lead.save();

    res.json({
      success: true,
      message: `Lead ${lead.lead_number} deleted successfully`,
    });
  } catch (err) {
    console.error('deleteLead Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 7. ADD FOLLOW-UP TO LEAD
// ==============================================================================
exports.addFollowup = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, is_deleted: false });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const {
      followup_date,
      followup_type,
      notes,
      next_action,
      conducted_by,
      status = 'scheduled',
    } = req.body;

    if (!followup_date) {
      return res.status(400).json({ success: false, message: 'Follow-up date is required' });
    }

    lead.followups.push({
      followup_date: new Date(followup_date),
      followup_type: followup_type || 'Phone Call',
      status,
      notes: notes || '',
      next_action: next_action || '',
      conducted_by: conducted_by || lead.assigned_to || 'Sales Representative',
    });

    // If status is 'new', update status to 'contacted'
    if (lead.status === 'new') {
      lead.status = 'contacted';
    }

    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Follow-up scheduled successfully',
      data: lead,
    });
  } catch (err) {
    console.error('addFollowup Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 8. UPDATE / COMPLETE FOLLOW-UP
// ==============================================================================
exports.updateFollowup = async (req, res) => {
  try {
    const { id, followupId } = req.params;
    const {
      status,
      notes,
      next_action,
      next_followup_date,
      next_followup_type,
      next_followup_notes,
      conducted_by,
      lead_status,
    } = req.body;

    const lead = await Lead.findOne({ _id: id, is_deleted: false });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const followup = lead.followups.id(followupId);
    if (!followup) {
      return res.status(404).json({ success: false, message: 'Follow-up entry not found' });
    }

    if (status) followup.status = status;
    if (notes !== undefined) followup.notes = notes;
    if (next_action !== undefined) followup.next_action = next_action;
    if (conducted_by) followup.conducted_by = conducted_by;

    if (status === 'completed') {
      followup.completed_at = new Date();
      lead.last_contacted_at = new Date();
    }

    // Optionally update overall lead status
    if (lead_status && lead.status !== lead_status) {
      lead.status = lead_status;
    }

    // If next follow-up is scheduled simultaneously
    if (next_followup_date) {
      lead.followups.push({
        followup_date: new Date(next_followup_date),
        followup_type: next_followup_type || followup.followup_type || 'Phone Call',
        status: 'scheduled',
        notes: next_followup_notes || '',
        next_action: next_action || '',
        conducted_by: conducted_by || lead.assigned_to || 'Sales Representative',
      });
    }

    await lead.save();

    res.json({
      success: true,
      message: 'Follow-up updated successfully',
      data: lead,
    });
  } catch (err) {
    console.error('updateFollowup Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 9. GET ALL FOLLOW-UPS (Hub: Today, Overdue, Upcoming, Completed)
// ==============================================================================
exports.getAllFollowups = async (req, res) => {
  try {
    const { tab = 'today', limit = 50, page = 1 } = req.query;
    const { start: todayStart, end: todayEnd } = getTodayBounds();

    let matchStage = { is_deleted: false };
    let followupMatch = {};

    switch (tab) {
      case 'today':
        followupMatch = {
          'followups.status': 'scheduled',
          'followups.followup_date': { $gte: todayStart, $lte: todayEnd },
        };
        break;
      case 'overdue':
        followupMatch = {
          'followups.status': 'scheduled',
          'followups.followup_date': { $lt: todayStart },
        };
        break;
      case 'upcoming':
        followupMatch = {
          'followups.status': 'scheduled',
          'followups.followup_date': { $gt: todayEnd },
        };
        break;
      case 'completed':
        followupMatch = {
          'followups.status': 'completed',
        };
        break;
      case 'all':
      default:
        followupMatch = {};
        break;
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$followups' },
      { $match: followupMatch },
      {
        $project: {
          lead_id: '$_id',
          lead_number: '$lead_number',
          lead_name: '$lead_name',
          company_name: '$company_name',
          mobile: '$mobile',
          email: '$email',
          city: '$city',
          lead_status: '$status',
          priority: '$priority',
          interest_type: '$interest_type',
          assigned_to: '$assigned_to',
          estimated_value: '$estimated_value',
          followup: '$followups',
        },
      },
      {
        $sort: {
          'followup.followup_date': tab === 'overdue' || tab === 'today' ? 1 : -1,
        },
      },
    ];

    const results = await Lead.aggregate(pipeline);

    res.json({
      success: true,
      data: results,
      meta: {
        total: results.length,
        tab,
      },
    });
  } catch (err) {
    console.error('getAllFollowups Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 10. CONVERT LEAD TO CUSTOMER
// ==============================================================================
exports.convertToCustomer = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, is_deleted: false });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (lead.converted_customer_id) {
      const existing = await Customer.findById(lead.converted_customer_id);
      return res.json({
        success: true,
        message: 'Lead has already been converted to a customer.',
        data: { customer: existing, lead },
      });
    }

    // Prepare Customer object from lead
    const customer = new Customer({
      customer_name: lead.company_name || lead.lead_name,
      company_name: lead.company_name,
      contact_person: lead.lead_name,
      email: lead.email || '',
      mobile: lead.mobile,
      customer_type: 'B2B',
      billing_address: {
        address_line1: lead.address || '',
        city: lead.city || '',
        state: lead.state || 'Gujarat',
        country: 'India',
      },
      shipping_address: {
        address_line1: lead.address || '',
        city: lead.city || '',
        state: lead.state || 'Gujarat',
        country: 'India',
      },
      status: 'active',
    });

    await customer.save();

    // Mark lead as won and link customer
    lead.status = 'won';
    lead.converted_customer_id = customer._id;
    lead.converted_at = new Date();

    // Log completion of pending follow-ups or add conversion log
    lead.followups.push({
      followup_date: new Date(),
      followup_type: 'Meeting / Visit',
      status: 'completed',
      notes: `Successfully converted lead into registered customer: ${customer.customer_name} (${customer.customer_code})`,
      conducted_by: req.body.conducted_by || 'Administrator',
      completed_at: new Date(),
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: `Lead successfully converted into Customer: ${customer.customer_name} (${customer.customer_code})`,
      data: {
        customer,
        lead,
      },
    });
  } catch (err) {
    console.error('convertToCustomer Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
