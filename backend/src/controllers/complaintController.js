const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Customer = require('../models/Customer');
const SalesOrder = require('../models/SalesOrder');
const Product = require('../models/Product');

// Sample initial complaints for Danza Son Apparels & Textiles
const SAMPLE_COMPLAINTS = [
  {
    customer_name: 'Metro Garments & Retailers',
    company_name: 'Metro Retailers Pvt Ltd',
    contact_person: 'Rahul Sharma',
    mobile: '9820011223',
    email: 'rahul@metrogarments.in',
    channel: 'phone',
    so_number: 'SO-2026-00012',
    invoice_number: 'INV-2026-00008',
    product_name: 'Classic Bio-Wash Crew Neck T-Shirt',
    category: 'fabric_quality',
    priority: 'high',
    subject: 'Batch color bleeding after initial wash in Navy Blue pieces',
    description: 'Customer washed sample pieces from carton #4. The navy blue pigment bled significantly onto collar ribbing. Client halted store dispatch of 150 pcs.',
    defective_quantity: 45,
    affected_order_value: 125000,
    status: 'in_investigation',
    assigned_to: 'Vikram Mehta (QC Lead)',
    sla_due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
    timeline: [
      {
        date: new Date(Date.now() - 36 * 60 * 60 * 1000),
        type: 'customer_call',
        author: 'Pooja Shah',
        notes: 'Client called expressing urgency. 150 pcs received yesterday, 45 pieces tested had bleeding issue.',
      },
      {
        date: new Date(Date.now() - 20 * 60 * 60 * 1000),
        type: 'status_change',
        author: 'Vikram Mehta',
        notes: 'Sample recalled from client for lab testing. Sent to dye house for fastness analysis.',
      },
    ],
  },
  {
    customer_name: 'Urban Threads Mumbai',
    company_name: 'Urban Threads Apparel Hub',
    contact_person: 'Kavita Patel',
    mobile: '9892233445',
    email: 'kavita@urbanthreads.com',
    channel: 'whatsapp',
    so_number: 'SO-2026-00018',
    invoice_number: 'INV-2026-00015',
    product_name: 'Premium Combed Cotton Oversized Tee',
    category: 'stitching_defect',
    priority: 'critical',
    subject: 'Size L chest measurement 2 inches narrower than approved tech-pack',
    description: 'Store manager measured 50 pcs of Size L. Approved spec was 44 inches chest, but actual pieces measure 42 inches. Risk of customer return if put on shelves.',
    defective_quantity: 50,
    affected_order_value: 185000,
    status: 'action_proposed',
    assigned_to: 'Amit Trivedi (Production Mgr)',
    sla_due_date: new Date(Date.now() + 12 * 60 * 60 * 1000),
    timeline: [
      {
        date: new Date(Date.now() - 48 * 60 * 60 * 1000),
        type: 'whatsapp_chat',
        author: 'Customer Service',
        notes: 'Photos with measuring tape sent by Kavita Patel showing 42 inch chest variance.',
      },
      {
        date: new Date(Date.now() - 16 * 60 * 60 * 1000),
        type: 'resolution_proposed',
        author: 'Amit Trivedi',
        notes: 'Proposed immediate replacement of 50 pcs within 4 days, with 5% goodwill credit note.',
      },
    ],
  },
  {
    customer_name: 'Jain Hosiery Mills Ludhiana',
    company_name: 'Jain Hosiery Mills',
    contact_person: 'Manish Jain',
    mobile: '9814055555',
    email: 'manish@jainhosiery.com',
    channel: 'email',
    so_number: 'SO-2026-00005',
    invoice_number: 'INV-2026-00004',
    product_name: 'Men Poly-Spandex Gym Joggers',
    category: 'quantity_shortage',
    priority: 'medium',
    subject: 'Carton #2 short by 12 pcs from dispatch challan count',
    description: 'Challan noted 100 pcs in Box 2, physical recount during warehouse inwarding found 88 pcs. Box seal was intact upon arrival.',
    defective_quantity: 12,
    affected_order_value: 36000,
    status: 'resolved',
    assigned_to: 'Sanjay Joshi (Dispatch Lead)',
    resolution: {
      resolution_type: 'credit_note',
      resolution_notes: 'Packing team verified weight discrepancy at factory dispatch. Issued Credit Note CN-2026-00004 for ₹8,400.',
      compensation_amount: 8400,
      credit_note_number: 'CN-2026-00004',
      resolved_by: 'Sanjay Joshi',
      resolved_at: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    timeline: [
      {
        date: new Date(Date.now() - 72 * 60 * 60 * 1000),
        type: 'internal_note',
        author: 'Customer Service',
        notes: 'Email with GRN discrepancy received from warehouse supervisor.',
      },
      {
        date: new Date(Date.now() - 12 * 60 * 60 * 1000),
        type: 'resolved',
        author: 'Sanjay Joshi',
        notes: 'Credit note generated and mailed to client. Account reconciled.',
      },
    ],
  },
  {
    customer_name: 'Apex Retail Stores Delhi',
    company_name: 'Apex Retail Outlets Ltd',
    contact_person: 'Sunil Mehra',
    mobile: '9811122334',
    email: 'sunil@apexretail.in',
    channel: 'in_person',
    so_number: 'SO-2026-00021',
    invoice_number: 'INV-2026-00019',
    product_name: 'Heavyweight Fleece Hoodies',
    category: 'billing_payment',
    priority: 'low',
    subject: 'Special 3% festive wholesale discount omitted in final invoice',
    description: 'Agreed quotation included 3% additional festive trade discount. Invoice was generated at gross rate without deduction.',
    defective_quantity: 0,
    affected_order_value: 320000,
    status: 'closed',
    assigned_to: 'Finance Accounts Team',
    resolution: {
      resolution_type: 'credit_note',
      resolution_notes: 'Re-issued amended invoice and adjusted ₹9,600 trade discount in ledger balance.',
      compensation_amount: 9600,
      credit_note_number: 'CN-2026-00007',
      resolved_by: 'Finance Accounts Team',
      resolved_at: new Date(Date.now() - 96 * 60 * 60 * 1000),
    },
    timeline: [
      {
        date: new Date(Date.now() - 120 * 60 * 60 * 1000),
        type: 'customer_call',
        author: 'Accounts Officer',
        notes: 'Client reviewed invoice and requested rate adjustment as per quotation term.',
      },
      {
        date: new Date(Date.now() - 96 * 60 * 60 * 1000),
        type: 'resolved',
        author: 'Finance Accounts Team',
        notes: 'Ledger voucher updated and confirmation received from client.',
      },
    ],
  },
];

async function ensureSampleComplaints() {
  try {
    const count = await Complaint.countDocuments({ is_deleted: false });
    if (count === 0) {
      for (const item of SAMPLE_COMPLAINTS) {
        await Complaint.create(item);
      }
      console.log('🌱 Seeded default customer service complaints successfully.');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed complaints:', err.message);
  }
}

// 1. GET ALL COMPLAINTS (WITH FILTERS, SEARCH & PAGINATION)
exports.getComplaints = async (req, res) => {
  try {
    await ensureSampleComplaints();

    const {
      search,
      status,
      priority,
      category,
      customer_id,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { is_deleted: false };

    // Status filter
    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = { $in: ['open', 'in_investigation', 'action_proposed'] };
      } else if (status === 'resolved_closed') {
        query.status = { $in: ['resolved', 'closed'] };
      } else {
        query.status = status;
      }
    }

    // Priority filter
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Customer filter
    if (customer_id && mongoose.Types.ObjectId.isValid(customer_id)) {
      query.customer_id = customer_id;
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { ticket_number: { $regex: q, $options: 'i' } },
        { customer_name: { $regex: q, $options: 'i' } },
        { company_name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { so_number: { $regex: q, $options: 'i' } },
        { invoice_number: { $regex: q, $options: 'i' } },
        { product_name: { $regex: q, $options: 'i' } },
      ];
    }

    const sortOption = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Complaint.countDocuments(query),
    ]);

    // Calculate quick counts for tab badges
    const [openCount, investigatingCount, actionProposedCount, resolvedCount, closedCount] = await Promise.all([
      Complaint.countDocuments({ status: 'open', is_deleted: false }),
      Complaint.countDocuments({ status: 'in_investigation', is_deleted: false }),
      Complaint.countDocuments({ status: 'action_proposed', is_deleted: false }),
      Complaint.countDocuments({ status: 'resolved', is_deleted: false }),
      Complaint.countDocuments({ status: 'closed', is_deleted: false }),
    ]);

    res.json({
      success: true,
      data: complaints,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
        badgeCounts: {
          all: total,
          open: openCount,
          in_investigation: investigatingCount,
          action_proposed: actionProposedCount,
          resolved: resolvedCount,
          closed: closedCount,
          active: openCount + investigatingCount + actionProposedCount,
        },
      },
    });
  } catch (err) {
    console.error('getComplaints Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. GET COMPLAINT STATS / KPI METRICS
exports.getComplaintStats = async (req, res) => {
  try {
    await ensureSampleComplaints();

    const allComplaints = await Complaint.find({ is_deleted: false }).lean();

    const total = allComplaints.length;
    let openCount = 0;
    let inInvestigationCount = 0;
    let actionProposedCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;
    let criticalCount = 0;
    let totalCompensation = 0;
    let totalAffectedValue = 0;

    const categoryBreakdown = {};
    const priorityBreakdown = {};

    allComplaints.forEach((c) => {
      if (c.status === 'open') openCount++;
      if (c.status === 'in_investigation') inInvestigationCount++;
      if (c.status === 'action_proposed') actionProposedCount++;
      if (c.status === 'resolved') resolvedCount++;
      if (c.status === 'closed') closedCount++;

      if (c.priority === 'critical' && ['open', 'in_investigation'].includes(c.status)) {
        criticalCount++;
      }

      totalCompensation += Number(c.resolution?.compensation_amount || 0);
      totalAffectedValue += Number(c.affected_order_value || 0);

      categoryBreakdown[c.category] = (categoryBreakdown[c.category] || 0) + 1;
      priorityBreakdown[c.priority] = (priorityBreakdown[c.priority] || 0) + 1;
    });

    const activeTickets = openCount + inInvestigationCount + actionProposedCount;
    const resolvedTotal = resolvedCount + closedCount;
    const resolutionRate = total > 0 ? ((resolvedTotal / total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        total,
        activeTickets,
        openCount,
        inInvestigationCount,
        actionProposedCount,
        resolvedCount,
        closedCount,
        criticalCount,
        resolutionRate: Number(resolutionRate),
        totalCompensation,
        totalAffectedValue,
        categoryBreakdown,
        priorityBreakdown,
      },
    });
  } catch (err) {
    console.error('getComplaintStats Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. GET COMPLAINT BY ID
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, is_deleted: false })
      .populate('customer_id', 'customer_name mobile email company_name address')
      .populate('order_id', 'so_number grand_total status order_date');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Service ticket / complaint not found.' });
    }

    res.json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    console.error('getComplaintById Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. CREATE COMPLAINT / SERVICE TICKET
exports.createComplaint = async (req, res) => {
  try {
    const {
      customer_id,
      customer_name,
      company_name,
      contact_person,
      mobile,
      email,
      channel,
      order_id,
      so_number,
      invoice_id,
      invoice_number,
      product_id,
      product_name,
      batch_or_lot_number,
      category,
      priority,
      subject,
      description,
      defective_quantity,
      affected_order_value,
      assigned_to,
      initial_note,
    } = req.body;

    if (!customer_name || !mobile || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, mobile, subject, and defect description are required.',
      });
    }

    const complaint = new Complaint({
      customer_id: customer_id || null,
      customer_name: customer_name.trim(),
      company_name: (company_name || '').trim(),
      contact_person: (contact_person || '').trim(),
      mobile: mobile.trim(),
      email: (email || '').trim().toLowerCase(),
      channel: channel || 'phone',
      order_id: order_id || null,
      so_number: (so_number || '').trim(),
      invoice_id: invoice_id || null,
      invoice_number: (invoice_number || '').trim(),
      product_id: product_id || null,
      product_name: (product_name || '').trim(),
      batch_or_lot_number: (batch_or_lot_number || '').trim(),
      category: category || 'fabric_quality',
      priority: priority || 'medium',
      subject: subject.trim(),
      description: description.trim(),
      defective_quantity: Number(defective_quantity) || 0,
      affected_order_value: Number(affected_order_value) || 0,
      assigned_to: (assigned_to || 'Unassigned').trim(),
      assigned_at: assigned_to ? new Date() : null,
      status: 'open',
      timeline: [
        {
          date: new Date(),
          type: 'customer_call',
          author: req.user?.name || 'Customer Service',
          notes: initial_note || `Complaint logged via ${channel || 'phone'}. ${description.slice(0, 150)}...`,
        },
      ],
    });

    await complaint.save();

    res.status(201).json({
      success: true,
      message: `Service ticket ${complaint.ticket_number} logged successfully.`,
      data: complaint,
    });
  } catch (err) {
    console.error('createComplaint Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. UPDATE COMPLAINT STATUS
exports.updateStatus = async (req, res) => {
  try {
    const { status, author, notes, assigned_to } = req.body;

    const complaint = await Complaint.findOne({ _id: req.params.id, is_deleted: false });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const prevStatus = complaint.status;
    if (status && status !== prevStatus) {
      complaint.status = status;
    }

    if (assigned_to) {
      complaint.assigned_to = assigned_to.trim();
      complaint.assigned_at = new Date();
    }

    complaint.timeline.push({
      date: new Date(),
      type: 'status_change',
      author: author || req.user?.name || 'Operations Lead',
      notes: notes || `Status updated from "${prevStatus.toUpperCase()}" to "${(status || prevStatus).toUpperCase()}".`,
    });

    await complaint.save();

    res.json({
      success: true,
      message: `Ticket ${complaint.ticket_number} status updated to ${complaint.status}.`,
      data: complaint,
    });
  } catch (err) {
    console.error('updateStatus Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. ADD TIMELINE / INTERACTION ENTRY
exports.addTimelineEntry = async (req, res) => {
  try {
    const { type, notes, author, customer_feedback } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Log notes cannot be empty.' });
    }

    const complaint = await Complaint.findOne({ _id: req.params.id, is_deleted: false });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    complaint.timeline.push({
      date: new Date(),
      type: type || 'internal_note',
      author: author || req.user?.name || 'Customer Service Staff',
      notes: notes.trim(),
      customer_feedback: (customer_feedback || '').trim(),
    });

    await complaint.save();

    res.json({
      success: true,
      message: 'Update log added to ticket timeline.',
      data: complaint,
    });
  } catch (err) {
    console.error('addTimelineEntry Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7. RESOLVE COMPLAINT (ACTION TAKEN, REPLACEMENT / CREDIT NOTE)
exports.resolveComplaint = async (req, res) => {
  try {
    const {
      resolution_type,
      resolution_notes,
      compensation_amount,
      replacement_order_number,
      credit_note_number,
      resolved_by,
      close_ticket = false,
    } = req.body;

    if (!resolution_type || !resolution_notes) {
      return res.status(400).json({
        success: false,
        message: 'Resolution type and resolution notes are required.',
      });
    }

    const complaint = await Complaint.findOne({ _id: req.params.id, is_deleted: false });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    complaint.resolution = {
      resolution_type,
      resolution_notes: resolution_notes.trim(),
      compensation_amount: Number(compensation_amount) || 0,
      replacement_order_number: (replacement_order_number || '').trim(),
      credit_note_number: (credit_note_number || '').trim(),
      resolved_by: resolved_by || req.user?.name || 'Customer Service Lead',
      resolved_at: new Date(),
    };

    complaint.status = close_ticket ? 'closed' : 'resolved';

    complaint.timeline.push({
      date: new Date(),
      type: 'resolved',
      author: resolved_by || req.user?.name || 'Customer Service Lead',
      notes: `Resolution Applied: [${resolution_type.toUpperCase()}]. Compensation: ₹${Number(compensation_amount || 0).toLocaleString('en-IN')}. Notes: ${resolution_notes}`,
    });

    await complaint.save();

    res.json({
      success: true,
      message: `Ticket ${complaint.ticket_number} resolved successfully!`,
      data: complaint,
    });
  } catch (err) {
    console.error('resolveComplaint Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 8. UPDATE CORE COMPLAINT
exports.updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, is_deleted: false });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const allowedFields = [
      'customer_name',
      'company_name',
      'contact_person',
      'mobile',
      'email',
      'channel',
      'so_number',
      'invoice_number',
      'product_name',
      'batch_or_lot_number',
      'category',
      'priority',
      'subject',
      'description',
      'defective_quantity',
      'affected_order_value',
      'assigned_to',
      'sla_due_date',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        complaint[field] = req.body[field];
      }
    });

    await complaint.save();

    res.json({
      success: true,
      message: `Ticket ${complaint.ticket_number} details updated.`,
      data: complaint,
    });
  } catch (err) {
    console.error('updateComplaint Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
