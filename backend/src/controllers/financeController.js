const mongoose = require('mongoose');
const FinanceTransaction = require('../models/FinanceTransaction');
const SalesInvoice = require('../models/SalesInvoice');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

// Standard Default Categories & Accounts
const DEFAULT_INCOME_CATEGORIES = [
  'Sales Invoice Payment',
  'Advance Customer Receipt',
  'Other Business Income',
  'Scrap / Waste Sales',
  'Commission / Rebate Received',
  'Interest / Investment Income',
  'Capital Infusion',
  'Miscellaneous Income',
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Raw Material Purchase Payment',
  'Finished Goods Purchase Payment',
  'Job Work / Processing Payment',
  'Office Rent',
  'Employee Salaries & Wages',
  'Electricity & Utilities',
  'Internet & Phone Charges',
  'Transportation & Logistics',
  'Packaging & Box Materials',
  'Equipment Maintenance & Repairs',
  'Marketing & Advertising',
  'Software & Subscriptions',
  'Printing & Stationery',
  'Tea & Refreshments',
  'Bank Fees & Charges',
  'Taxes & Legal Compliance',
  'Miscellaneous Expenses',
];

const DEFAULT_ACCOUNTS = [
  'Primary Bank Account (HDFC Bank - Current A/c #5020001)',
  'Secondary Bank Account (ICICI Bank - Operating A/c #00234)',
  'Cash Drawer / Petty Cash',
  'Corporate UPI / QR Merchant',
];

// Helper: Calculate Date Range from preset
function getDateRangeFromPreset(preset, customStart, customEnd) {
  const now = new Date();
  let start = null;
  let end = null;

  switch (preset) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    }
    case 'yesterday': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 + diffToMonday), 23, 59, 59, 999);
      break;
    }
    case 'last_week': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day - 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 + diffToMonday), 23, 59, 59, 999);
      break;
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'this_year': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      if (customStart) start = new Date(new Date(customStart).setHours(0, 0, 0, 0));
      if (customEnd) end = new Date(new Date(customEnd).setHours(23, 59, 59, 999));
      break;
    }
    default: {
      if (customStart) start = new Date(new Date(customStart).setHours(0, 0, 0, 0));
      if (customEnd) end = new Date(new Date(customEnd).setHours(23, 59, 59, 999));
      break;
    }
  }
  return { start, end };
}

// ==============================================================================
// 1. AUTOMATIC IDEMPOTENT SYNC ENGINE (Sales Bills & Purchase Bills Payments)
// ==============================================================================
async function syncBillPayments() {
  try {
    // 1A. Sync Sales Invoices Payments -> Income Transactions
    const salesInvoices = await SalesInvoice.find({
      'payments.0': { $exists: true },
      is_deleted: false,
    }).populate('customer_id');

    for (const inv of salesInvoices) {
      if (!Array.isArray(inv.payments)) continue;
      for (let i = 0; i < inv.payments.length; i++) {
        const p = inv.payments[i];
        if (!p.amount || p.amount <= 0) continue;

        const exists = await FinanceTransaction.findOne({
          bill_id: inv._id,
          payment_index: i,
          entry_source: 'sales_bill',
        });

        if (!exists) {
          const custName = inv.customer_id?.customer_name || 'Customer';
          const pMode = p.payment_mode || 'Bank Transfer';
          const accName = pMode.toLowerCase().includes('cash')
            ? 'Cash Drawer / Petty Cash'
            : 'Primary Bank Account (HDFC Bank - Current A/c #5020001)';

          await FinanceTransaction.create({
            transaction_type: 'income',
            entry_source: 'sales_bill',
            amount: Number(p.amount),
            transaction_date: p.payment_date ? new Date(p.payment_date) : inv.invoice_date || new Date(),
            category: 'Sales Invoice Payment',
            party_name: custName,
            party_type: 'customer',
            customer_id: inv.customer_id?._id || inv.customer_id,
            bill_id: inv._id,
            bill_type: 'sales_invoice',
            bill_number: inv.invoice_number || 'INV',
            payment_index: i,
            payment_method: pMode.includes('UPI') ? 'UPI' : pMode.includes('Cash') ? 'Cash' : 'Bank Transfer',
            account_name: accName,
            reference_number: p.reference_number || inv.invoice_number || '',
            description: p.notes || `Payment received for Sales Bill ${inv.invoice_number}`,
            status: inv.status === 'cancelled' ? 'cancelled' : 'confirmed',
            is_manual: false,
            created_by: 'System (Sales Billing)',
          });
        }
      }
    }

    // 1B. Sync Purchase Invoices Payments -> Expense Transactions (Raw Material, Finished, Job Work)
    const purchaseInvoices = await PurchaseInvoice.find({
      'payments.0': { $exists: true },
      is_deleted: false,
    }).populate('supplier_id');

    for (const pb of purchaseInvoices) {
      if (!Array.isArray(pb.payments)) continue;

      let source = 'finished_purchase';
      let cat = 'Finished Goods Purchase Payment';

      if (pb.purchase_type === 'raw_material') {
        source = 'raw_material_purchase';
        cat = 'Raw Material Purchase Payment';
      } else if (pb.purchase_type === 'manufacturing' || pb.is_service_bill) {
        source = 'job_work_purchase';
        cat = 'Job Work / Processing Payment';
      }

      for (let i = 0; i < pb.payments.length; i++) {
        const p = pb.payments[i];
        if (!p.amount || p.amount <= 0) continue;

        const exists = await FinanceTransaction.findOne({
          bill_id: pb._id,
          payment_index: i,
          entry_source: source,
        });

        if (!exists) {
          const supName = pb.supplier_id?.supplier_name || 'Vendor / Contractor';
          const partyType = pb.purchase_type === 'manufacturing' || pb.is_service_bill ? 'contractor' : 'supplier';
          const pMode = p.payment_mode || 'Bank Transfer';
          const accName = pMode.toLowerCase().includes('cash')
            ? 'Cash Drawer / Petty Cash'
            : 'Primary Bank Account (HDFC Bank - Current A/c #5020001)';

          await FinanceTransaction.create({
            transaction_type: 'expense',
            entry_source: source,
            amount: Number(p.amount),
            transaction_date: p.payment_date ? new Date(p.payment_date) : pb.bill_date || new Date(),
            category: cat,
            party_name: supName,
            party_type: partyType,
            supplier_id: pb.supplier_id?._id || pb.supplier_id,
            bill_id: pb._id,
            bill_type: 'purchase_invoice',
            bill_number: pb.invoice_number || pb.vendor_bill_number || 'PB',
            payment_index: i,
            payment_method: pMode.includes('UPI') ? 'UPI' : pMode.includes('Cash') ? 'Cash' : 'Bank Transfer',
            account_name: accName,
            reference_number: p.reference_number || pb.invoice_number || pb.vendor_bill_number || '',
            description: p.remarks || `Payment disbursed for ${cat}: ${pb.invoice_number}`,
            status: pb.status === 'cancelled' ? 'cancelled' : 'confirmed',
            is_manual: false,
            created_by: 'System (Purchase Billing)',
          });
        }
      }
    }
  } catch (err) {
    console.error('Error during Finance auto-sync:', err);
  }
}

// ==============================================================================
// 2. GET FINANCE OVERVIEW & DASHBOARD METRICS
// ==============================================================================
exports.getOverview = async (req, res) => {
  try {
    // Run real-time auto sync
    await syncBillPayments();

    const { date_preset, start_date, end_date } = req.query;
    const { start, end } = getDateRangeFromPreset(date_preset || 'all', start_date, end_date);

    const dateFilter = { is_deleted: false, status: 'confirmed' };
    if (start || end) {
      dateFilter.transaction_date = {};
      if (start) dateFilter.transaction_date.$gte = start;
      if (end) dateFilter.transaction_date.$lte = end;
    }

    // Calculate Total Income & Total Expenses
    const incomeAgg = await FinanceTransaction.aggregate([
      { $match: { ...dateFilter, transaction_type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const expenseAgg = await FinanceTransaction.aggregate([
      { $match: { ...dateFilter, transaction_type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;
    const netCashFlow = totalIncome - totalExpenses;

    // Calculate Receivables (from active Sales Invoices)
    const receivablesAgg = await SalesInvoice.aggregate([
      { $match: { is_deleted: false, status: { $ne: 'cancelled' }, balance_amount: { $gt: 0 } } },
      { $group: { _id: null, totalDue: { $sum: '$balance_amount' }, count: { $sum: 1 } } },
    ]);
    const totalReceivables = receivablesAgg[0]?.totalDue || 0;

    // Calculate Payables (from active Purchase Invoices, segmented by Raw Material, Finished, Job Work)
    const payablesAgg = await PurchaseInvoice.aggregate([
      { $match: { is_deleted: false, status: { $ne: 'cancelled' }, balance_amount: { $gt: 0 } } },
      {
        $group: {
          _id: '$purchase_type',
          totalDue: { $sum: '$balance_amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalPayables = 0;
    let rmPayables = 0;
    let finishedPayables = 0;
    let jobWorkPayables = 0;

    payablesAgg.forEach((item) => {
      totalPayables += item.totalDue || 0;
      if (item._id === 'raw_material') rmPayables += item.totalDue || 0;
      else if (item._id === 'manufacturing') jobWorkPayables += item.totalDue || 0;
      else finishedPayables += item.totalDue || 0;
    });

    // Opening & Closing Balance calculation
    // Base reserve: ₹2,00,000 + all historical net cash flow up to 'start' date
    const baseReserve = 200000;
    let openingBalance = baseReserve;

    if (start) {
      const priorIncome = await FinanceTransaction.aggregate([
        { $match: { is_deleted: false, status: 'confirmed', transaction_type: 'income', transaction_date: { $lt: start } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const priorExpense = await FinanceTransaction.aggregate([
        { $match: { is_deleted: false, status: 'confirmed', transaction_type: 'expense', transaction_date: { $lt: start } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      openingBalance += (priorIncome[0]?.total || 0) - (priorExpense[0]?.total || 0);
    }

    const closingBalance = openingBalance + netCashFlow;

    // Monthly trends (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyData = await FinanceTransaction.aggregate([
      {
        $match: {
          is_deleted: false,
          status: 'confirmed',
          transaction_date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$transaction_date' },
            month: { $month: '$transaction_date' },
            type: '$transaction_type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format monthly trends
    const monthsMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      monthsMap[key] = { key, month: monthName, income: 0, expense: 0, net: 0 };
    }

    monthlyData.forEach((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (monthsMap[key]) {
        if (item._id.type === 'income') monthsMap[key].income = item.total;
        if (item._id.type === 'expense') monthsMap[key].expense = item.total;
        monthsMap[key].net = monthsMap[key].income - monthsMap[key].expense;
      }
    });

    // Category-wise Breakdown
    const categoryBreakdown = await FinanceTransaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { category: '$category', type: '$transaction_type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Payment Mode Breakdown
    const paymentModeBreakdown = await FinanceTransaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$payment_method',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Recent 10 Transactions
    const recentTransactions = await FinanceTransaction.find({ is_deleted: false })
      .sort({ transaction_date: -1, createdAt: -1 })
      .limit(10)
      .populate('customer_id')
      .populate('supplier_id');

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          netCashFlow,
          totalReceivables,
          totalPayables,
          payablesBreakdown: {
            rawMaterial: rmPayables,
            finished: finishedPayables,
            jobWork: jobWorkPayables,
          },
          openingBalance,
          closingBalance,
        },
        monthlyTrends: Object.values(monthsMap),
        categoryBreakdown,
        paymentModeBreakdown,
        recentTransactions,
      },
    });
  } catch (err) {
    console.error('getOverview Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 3. GET TRANSACTIONS (All, Income, Expense, Search & Rich Filters)
// ==============================================================================
exports.getTransactions = async (req, res) => {
  try {
    await syncBillPayments();

    const {
      page = 1,
      limit = 25,
      type, // 'all', 'income', 'expense', 'transfer'
      source, // 'all', 'manual', 'sales_bill', 'raw_material_purchase', 'finished_purchase', 'job_work_purchase'
      category,
      payment_method,
      account_name,
      status, // 'all', 'confirmed', 'cancelled'
      search,
      min_amount,
      max_amount,
      date_preset,
      start_date,
      end_date,
      sort_by = 'transaction_date',
      sort_order = 'desc',
    } = req.query;

    const query = { is_deleted: false };

    // Transaction Type Filter
    if (type && type !== 'all') {
      query.transaction_type = type;
    }

    // Entry Source Filter
    if (source && source !== 'all') {
      if (source === 'automatic') {
        query.is_manual = false;
      } else if (source === 'manual') {
        query.is_manual = true;
      } else {
        query.entry_source = source;
      }
    }

    // Category Filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Payment Method Filter
    if (payment_method && payment_method !== 'all') {
      query.payment_method = payment_method;
    }

    // Cash / Bank Account Filter
    if (account_name && account_name !== 'all') {
      query.account_name = { $regex: account_name, $options: 'i' };
    }

    // Status Filter
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = 'confirmed'; // Default confirmed unless specified
    }

    // Amount Range Filter
    if (min_amount || max_amount) {
      query.amount = {};
      if (min_amount) query.amount.$gte = Number(min_amount);
      if (max_amount) query.amount.$lte = Number(max_amount);
    }

    // Date Range Filter
    const { start, end } = getDateRangeFromPreset(date_preset || 'all', start_date, end_date);
    if (start || end) {
      query.transaction_date = {};
      if (start) query.transaction_date.$gte = start;
      if (end) query.transaction_date.$lte = end;
    }

    // Text Search Filter (Party, Reference, Description, ID)
    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { transaction_number: { $regex: q, $options: 'i' } },
        { party_name: { $regex: q, $options: 'i' } },
        { reference_number: { $regex: q, $options: 'i' } },
        { bill_number: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 25;
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sort_by] = sort_order === 'asc' ? 1 : -1;
    if (sort_by !== '_id') sortObj._id = -1;

    const [transactions, total, totalsAgg] = await Promise.all([
      FinanceTransaction.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('customer_id')
        .populate('supplier_id'),
      FinanceTransaction.countDocuments(query),
      FinanceTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$transaction_type',
            sum: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    let filteredIncomeTotal = 0;
    let filteredExpenseTotal = 0;
    totalsAgg.forEach((t) => {
      if (t._id === 'income') filteredIncomeTotal = t.sum;
      if (t._id === 'expense') filteredExpenseTotal = t.sum;
    });

    res.json({
      success: true,
      data: transactions,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        filteredTotals: {
          income: filteredIncomeTotal,
          expenses: filteredExpenseTotal,
          net: filteredIncomeTotal - filteredExpenseTotal,
        },
      },
    });
  } catch (err) {
    console.error('getTransactions Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 4. CREATE MANUAL TRANSACTION (Income or Expense)
// ==============================================================================
exports.createManualTransaction = async (req, res) => {
  try {
    const {
      transaction_type, // 'income' | 'expense' | 'transfer'
      amount,
      transaction_date,
      category,
      party_name,
      party_type,
      payment_method,
      account_name,
      reference_number,
      description,
      customer_id,
      supplier_id,
    } = req.body;

    if (!transaction_type || !['income', 'expense', 'transfer'].includes(transaction_type)) {
      return res.status(400).json({ success: false, message: 'Valid transaction_type (income, expense, transfer) is required' });
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Transaction category is required' });
    }

    const newTx = new FinanceTransaction({
      transaction_type,
      entry_source: 'manual',
      amount: numAmount,
      transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
      category: category.trim(),
      party_name: party_name?.trim() || (transaction_type === 'income' ? 'Direct Income Source' : 'General Vendor'),
      party_type: party_type || 'other',
      customer_id: customer_id || null,
      supplier_id: supplier_id || null,
      payment_method: payment_method || 'Cash',
      account_name: account_name || 'Primary Bank Account (HDFC Bank - Current A/c #5020001)',
      reference_number: reference_number?.trim() || '',
      description: description?.trim() || '',
      is_manual: true,
      status: 'confirmed',
      created_by: 'Administrator',
      audit_history: [
        {
          action: 'CREATED_MANUAL_ENTRY',
          changed_at: new Date(),
          changed_by: 'Administrator',
          reason: 'Created via Finance Management Manual Form',
          details: { amount: numAmount, category, type: transaction_type },
        },
      ],
    });

    await newTx.save();

    res.status(201).json({
      success: true,
      message: `${transaction_type === 'income' ? 'Income receipt' : 'Expense payment'} of ₹${numAmount.toLocaleString('en-IN')} recorded successfully`,
      data: newTx,
    });
  } catch (err) {
    console.error('createManualTransaction Error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 5. UPDATE MANUAL TRANSACTION
// ==============================================================================
exports.updateManualTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await FinanceTransaction.findById(id);

    if (!tx || tx.is_deleted) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (!tx.is_manual) {
      return res.status(400).json({
        success: false,
        message: 'Automatically generated bill payments cannot be directly edited here. Please update through the linked bill settlement page.',
      });
    }

    const {
      amount,
      transaction_date,
      category,
      party_name,
      payment_method,
      account_name,
      reference_number,
      description,
      reason,
    } = req.body;

    const previousState = {
      amount: tx.amount,
      category: tx.category,
      party_name: tx.party_name,
      payment_method: tx.payment_method,
      account_name: tx.account_name,
      reference_number: tx.reference_number,
    };

    if (amount !== undefined) {
      const num = Number(amount);
      if (!num || num <= 0) return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
      tx.amount = num;
    }
    if (transaction_date) tx.transaction_date = new Date(transaction_date);
    if (category) tx.category = category.trim();
    if (party_name !== undefined) tx.party_name = party_name.trim();
    if (payment_method) tx.payment_method = payment_method;
    if (account_name) tx.account_name = account_name;
    if (reference_number !== undefined) tx.reference_number = reference_number.trim();
    if (description !== undefined) tx.description = description.trim();

    tx.audit_history.push({
      action: 'UPDATED_MANUAL_ENTRY',
      changed_at: new Date(),
      changed_by: 'Administrator',
      reason: reason || 'Updated manual transaction parameters',
      details: { previous: previousState, updated: { amount: tx.amount, category: tx.category } },
    });

    await tx.save();

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: tx,
    });
  } catch (err) {
    console.error('updateManualTransaction Error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 6. CANCEL / REVERSE TRANSACTION
// ==============================================================================
exports.cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const tx = await FinanceTransaction.findById(id);
    if (!tx || tx.is_deleted) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (tx.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Transaction is already cancelled' });
    }

    tx.status = 'cancelled';
    tx.audit_history.push({
      action: 'CANCELLED_AND_REVERSED',
      changed_at: new Date(),
      changed_by: 'Administrator',
      reason: reason || 'Financial transaction reversed / cancelled by user request',
      details: { reversedAmount: tx.amount, type: tx.transaction_type, bill_id: tx.bill_id },
    });

    await tx.save();

    // If linked to an automated bill payment, reverse the effect on the invoice & customer/supplier balance
    if (!tx.is_manual && tx.bill_id) {
      if (tx.bill_type === 'sales_invoice') {
        const inv = await SalesInvoice.findById(tx.bill_id);
        if (inv && Array.isArray(inv.payments) && inv.payments[tx.payment_index]) {
          inv.payments.splice(tx.payment_index, 1);
          const totalPaid = inv.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          inv.paid_amount = totalPaid;
          inv.balance_amount = Math.max(0, (inv.grand_total || 0) - totalPaid);
          inv.payment_status = inv.balance_amount === 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';
          inv.notes = `${inv.notes || ''}\n[REVERSAL: Payment of ₹${tx.amount.toLocaleString('en-IN')} was cancelled and reversed in Finance]`;
          await inv.save();

          if (inv.customer_id) {
            await Customer.findByIdAndUpdate(inv.customer_id, {
              $inc: { pending_balance: tx.amount },
            });
          }
        }
      } else if (tx.bill_type === 'purchase_invoice') {
        const pb = await PurchaseInvoice.findById(tx.bill_id);
        if (pb && Array.isArray(pb.payments) && pb.payments[tx.payment_index]) {
          pb.payments.splice(tx.payment_index, 1);
          const totalPaid = pb.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          pb.paid_amount = totalPaid;
          pb.balance_amount = Math.max(0, (pb.grand_total || 0) - totalPaid);
          pb.payment_status = pb.balance_amount === 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';
          pb.remarks = `${pb.remarks || ''}\n[REVERSAL: Payment of ₹${tx.amount.toLocaleString('en-IN')} was cancelled and reversed in Finance]`;
          await pb.save();

          if (pb.supplier_id) {
            await Supplier.findByIdAndUpdate(pb.supplier_id, {
              $inc: { pending_balance: tx.amount },
            });
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Transaction ${tx.transaction_number || ''} cancelled and financial impact reversed successfully`,
      data: tx,
    });
  } catch (err) {
    console.error('cancelTransaction Error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 7. GET SINGLE TRANSACTION DETAILS
// ==============================================================================
exports.getTransactionById = async (req, res) => {
  try {
    const tx = await FinanceTransaction.findById(req.params.id)
      .populate('customer_id')
      .populate('supplier_id');

    if (!tx || tx.is_deleted) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 8. FINANCIAL REPORTS SUITE
// ==============================================================================
exports.getReports = async (req, res) => {
  try {
    await syncBillPayments();

    const { report_type, date_preset, start_date, end_date } = req.query;
    const { start, end } = getDateRangeFromPreset(date_preset || 'this_month', start_date, end_date);

    const baseFilter = { is_deleted: false, status: 'confirmed' };
    if (start || end) {
      baseFilter.transaction_date = {};
      if (start) baseFilter.transaction_date.$gte = start;
      if (end) baseFilter.transaction_date.$lte = end;
    }

    let reportData = null;

    switch (report_type) {
      case 'income_report': {
        reportData = await FinanceTransaction.find({ ...baseFilter, transaction_type: 'income' })
          .sort({ transaction_date: -1 })
          .populate('customer_id');
        break;
      }
      case 'expense_report': {
        reportData = await FinanceTransaction.find({ ...baseFilter, transaction_type: 'expense' })
          .sort({ transaction_date: -1 })
          .populate('supplier_id');
        break;
      }
      case 'category_expense': {
        reportData = await FinanceTransaction.aggregate([
          { $match: { ...baseFilter, transaction_type: 'expense' } },
          {
            $group: {
              _id: '$category',
              totalAmount: { $sum: '$amount' },
              transactionCount: { $sum: 1 },
            },
          },
          { $sort: { totalAmount: -1 } },
        ]);
        break;
      }
      case 'customer_receipts': {
        reportData = await FinanceTransaction.aggregate([
          { $match: { ...baseFilter, transaction_type: 'income', party_type: 'customer' } },
          {
            $group: {
              _id: '$party_name',
              totalReceived: { $sum: '$amount' },
              receiptCount: { $sum: 1 },
              lastReceiptDate: { $max: '$transaction_date' },
            },
          },
          { $sort: { totalReceived: -1 } },
        ]);
        break;
      }
      case 'supplier_payments': {
        reportData = await FinanceTransaction.aggregate([
          { $match: { ...baseFilter, transaction_type: 'expense' } },
          {
            $group: {
              _id: '$party_name',
              totalPaid: { $sum: '$amount' },
              paymentCount: { $sum: 1 },
              lastPaymentDate: { $max: '$transaction_date' },
            },
          },
          { $sort: { totalPaid: -1 } },
        ]);
        break;
      }
      case 'receivables_summary': {
        reportData = await SalesInvoice.find({
          is_deleted: false,
          status: { $ne: 'cancelled' },
          balance_amount: { $gt: 0 },
        })
          .sort({ due_date: 1 })
          .populate('customer_id', 'customer_name mobile email credit_limit');
        break;
      }
      case 'payables_summary': {
        reportData = await PurchaseInvoice.find({
          is_deleted: false,
          status: { $ne: 'cancelled' },
          balance_amount: { $gt: 0 },
        })
          .sort({ due_date: 1 })
          .populate('supplier_id', 'supplier_name mobile gstin supplier_classification');
        break;
      }
      case 'job_work_payments': {
        reportData = await FinanceTransaction.find({
          ...baseFilter,
          entry_source: 'job_work_purchase',
        })
          .sort({ transaction_date: -1 })
          .populate('supplier_id');
        break;
      }
      default: {
        // Income vs Expense Summary
        const incomeTotal = await FinanceTransaction.aggregate([
          { $match: { ...baseFilter, transaction_type: 'income' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const expenseTotal = await FinanceTransaction.aggregate([
          { $match: { ...baseFilter, transaction_type: 'expense' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const inc = incomeTotal[0]?.total || 0;
        const exp = expenseTotal[0]?.total || 0;

        reportData = {
          totalIncome: inc,
          totalExpenses: exp,
          netSurplus: inc - exp,
          dateRange: { start, end },
        };
        break;
      }
    }

    res.json({
      success: true,
      data: reportData,
      meta: {
        report_type: report_type || 'income_vs_expense',
        date_preset: date_preset || 'this_month',
        dateRange: { start, end },
      },
    });
  } catch (err) {
    console.error('getReports Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 9. MASTER LISTS (Categories, Accounts, Payment Methods)
// ==============================================================================
exports.getMasters = (req, res) => {
  res.json({
    success: true,
    data: {
      incomeCategories: DEFAULT_INCOME_CATEGORIES,
      expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
      accounts: DEFAULT_ACCOUNTS,
      paymentMethods: ['Cash', 'Bank Transfer', 'Net Banking', 'NEFT/RTGS/IMPS', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'Other'],
    },
  });
};

// ==============================================================================
// 10. MANUAL TRIGGER BILL SYNC
// ==============================================================================
exports.syncBills = async (req, res) => {
  try {
    const result = await syncBillPayments();
    res.json({
      success: true,
      message: 'Financial transactions synchronized successfully with all billing modules.',
      data: result,
    });
  } catch (err) {
    console.error('syncBills Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 11. PROFITABILITY ANALYSIS & MARGIN ENGINE
// ==============================================================================
exports.getProfitabilityAnalysis = async (req, res) => {
  try {
    await syncBillPayments();

    const { date_preset = 'all', start_date, end_date, category = 'all' } = req.query;
    const { start, end } = getDateRangeFromPreset(date_preset, start_date, end_date);

    // 1. Invoices Filter
    const invoiceFilter = { is_deleted: false, status: { $ne: 'cancelled' } };
    if (start || end) {
      invoiceFilter.invoice_date = {};
      if (start) invoiceFilter.invoice_date.$gte = start;
      if (end) invoiceFilter.invoice_date.$lte = end;
    }

    const invoices = await SalesInvoice.find(invoiceFilter)
      .populate('customer_id', 'customer_name customer_code company_name city state mobile')
      .populate('items.product_id', 'product_name product_code category purchase_rate selling_rate price mrp')
      .sort({ invoice_date: -1 })
      .lean();

    // 2. Fetch all products as catalog map for accurate cost lookup
    const allProducts = await Product.find({ is_deleted: false }).lean();
    const productMap = new Map();
    allProducts.forEach((p) => {
      productMap.set(String(p._id), p);
      if (p.product_code) productMap.set(p.product_code.toUpperCase(), p);
    });

    // 3. Transactions Filter for OPEX & COGS matching the date range
    const txFilter = { is_deleted: false, status: 'confirmed', transaction_type: 'expense' };
    if (start || end) {
      txFilter.transaction_date = {};
      if (start) txFilter.transaction_date.$gte = start;
      if (end) txFilter.transaction_date.$lte = end;
    }

    const expenseTransactions = await FinanceTransaction.find(txFilter).lean();

    let directMaterialRecordedExpense = 0;
    let jobWorkRecordedExpense = 0;
    let operatingExpensesTotal = 0;
    const opexBreakdown = {};

    expenseTransactions.forEach((tx) => {
      const cat = (tx.category || '').toLowerCase();
      if (cat.includes('raw material') || cat.includes('finished goods')) {
        directMaterialRecordedExpense += tx.amount || 0;
      } else if (cat.includes('job work') || cat.includes('processing')) {
        jobWorkRecordedExpense += tx.amount || 0;
      } else {
        operatingExpensesTotal += tx.amount || 0;
        const groupName = tx.category || 'Other Operating Expense';
        opexBreakdown[groupName] = (opexBreakdown[groupName] || 0) + (tx.amount || 0);
      }
    });

    // 4. Line-item by line-item Product & Customer & Category calculations
    let totalGrossRevenue = 0;
    let totalTaxCollected = 0;
    let totalLineCostCalculated = 0;
    let totalUnitsSold = 0;

    const productStats = {};
    const customerStats = {};
    const categoryStats = {};
    const monthlyStats = {};

    invoices.forEach((inv) => {
      const invRevenue = inv.taxable_amount || (inv.grand_total - (inv.tax_total || 0)) || 0;
      totalGrossRevenue += invRevenue;
      totalTaxCollected += inv.tax_total || 0;

      const customerId = inv.customer_id?._id ? String(inv.customer_id._id) : 'unknown_customer';
      const customerName = inv.customer_name || inv.customer_id?.customer_name || 'Walk-in / Direct';
      const customerCode = inv.customer_id?.customer_code || 'CUST-GEN';
      const customerCity = inv.customer_id?.city || inv.place_of_supply || 'Gujarat';

      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          id: customerId,
          name: customerName,
          code: customerCode,
          city: customerCity,
          invoiceCount: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          units: 0,
        };
      }
      customerStats[customerId].invoiceCount += 1;

      // Monthly key (YYYY-MM)
      const invDate = new Date(inv.invoice_date || inv.createdAt);
      const monthKey = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = invDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          key: monthKey,
          label: monthLabel,
          revenue: 0,
          cogs: 0,
          opex: 0,
          grossProfit: 0,
          netProfit: 0,
          units: 0,
        };
      }

      (inv.items || []).forEach((item) => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const lineTaxable = Number(item.taxable_amount) || (qty * unitPrice - (item.discount_amount || 0));
        
        // Find Cost Price (purchase_rate)
        let unitCost = 0;
        let pRef = item.product_id;
        if (!pRef && item.product_code) {
          pRef = productMap.get(item.product_code.toUpperCase());
        }
        if (pRef && typeof pRef === 'object' && pRef.purchase_rate > 0) {
          unitCost = pRef.purchase_rate;
        } else if (pRef && typeof pRef === 'string' && productMap.has(pRef)) {
          unitCost = productMap.get(pRef).purchase_rate || 0;
        }

        // Realistic Fallback if not configured: in apparel, standard COGS is ~55-60% of B2B sale
        if (!unitCost || unitCost <= 0) {
          unitCost = Math.round(unitPrice * 0.58 * 100) / 100;
        }

        const lineCost = Math.round(qty * unitCost * 100) / 100;
        const lineProfit = Math.round((lineTaxable - lineCost) * 100) / 100;
        const itemCat = (pRef?.category || item.category || 'Apparel').toUpperCase();

        totalUnitsSold += qty;
        totalLineCostCalculated += lineCost;

        // Apply category filter if requested
        if (category !== 'all' && itemCat.toLowerCase() !== category.toLowerCase()) {
          return;
        }

        // Product Aggregation
        const prodKey = item.product_name || 'Generic Item';
        if (!productStats[prodKey]) {
          productStats[prodKey] = {
            id: pRef?._id || item.product_id || prodKey,
            name: item.product_name,
            code: pRef?.product_code || item.product_code || 'SKU-001',
            category: itemCat,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            grossProfit: 0,
            unitPriceAvg: 0,
            unitCostAvg: unitCost,
          };
        }
        productStats[prodKey].unitsSold += qty;
        productStats[prodKey].revenue += lineTaxable;
        productStats[prodKey].cost += lineCost;
        productStats[prodKey].grossProfit += lineProfit;

        // Customer Aggregation
        customerStats[customerId].revenue += lineTaxable;
        customerStats[customerId].cost += lineCost;
        customerStats[customerId].profit += lineProfit;
        customerStats[customerId].units += qty;

        // Category Aggregation
        if (!categoryStats[itemCat]) {
          categoryStats[itemCat] = {
            category: itemCat,
            units: 0,
            revenue: 0,
            cost: 0,
            grossProfit: 0,
          };
        }
        categoryStats[itemCat].units += qty;
        categoryStats[itemCat].revenue += lineTaxable;
        categoryStats[itemCat].cost += lineCost;
        categoryStats[itemCat].grossProfit += lineProfit;

        // Monthly Aggregation
        monthlyStats[monthKey].revenue += lineTaxable;
        monthlyStats[monthKey].cogs += lineCost;
        monthlyStats[monthKey].units += qty;
      });
    });

    // 5. Finalize COGS and Profits
    // Total COGS: we use the calculated line-item direct production cost or recorded purchase payments (whichever gives the most realistic view)
    const effectiveCOGS = Math.max(totalLineCostCalculated, directMaterialRecordedExpense + jobWorkRecordedExpense);
    const grossProfit = Math.round((totalGrossRevenue - effectiveCOGS) * 100) / 100;
    const grossMarginPct = totalGrossRevenue > 0 ? Math.round((grossProfit / totalGrossRevenue) * 1000) / 10 : 0;

    const operatingProfit = Math.round((grossProfit - operatingExpensesTotal) * 100) / 100;
    const operatingMarginPct = totalGrossRevenue > 0 ? Math.round((operatingProfit / totalGrossRevenue) * 1000) / 10 : 0;

    // Net Profit
    const netProfit = operatingProfit;
    const netMarginPct = totalGrossRevenue > 0 ? Math.round((netProfit / totalGrossRevenue) * 1000) / 10 : 0;

    // Break-even Revenue calculation
    // Fixed Costs / Gross Margin Ratio
    const grossMarginRatio = totalGrossRevenue > 0 ? grossProfit / totalGrossRevenue : 0.40;
    const breakEvenRevenue = grossMarginRatio > 0 ? Math.round(operatingExpensesTotal / grossMarginRatio) : 0;

    // Average Order Value (AOV)
    const aov = invoices.length > 0 ? Math.round(totalGrossRevenue / invoices.length) : 0;

    // Convert Product Stats to sorted Array
    const productRanking = Object.values(productStats).map((p) => {
      const margin = p.revenue > 0 ? Math.round((p.grossProfit / p.revenue) * 1000) / 10 : 0;
      const avgPrice = p.unitsSold > 0 ? Math.round((p.revenue / p.unitsSold) * 100) / 100 : 0;
      return {
        ...p,
        grossMargin: margin,
        averagePrice: avgPrice,
        profitStatus: margin >= 35 ? 'High Margin' : margin >= 20 ? 'Healthy' : margin > 0 ? 'Low Margin' : 'Loss',
      };
    }).sort((a, b) => b.grossProfit - a.grossProfit);

    // Convert Customer Stats to sorted Array (80/20 Analysis)
    let cumulativeRevenue = 0;
    const customerRanking = Object.values(customerStats).map((c) => {
      const margin = c.revenue > 0 ? Math.round((c.profit / c.revenue) * 1000) / 10 : 0;
      const profitShare = grossProfit > 0 ? Math.round((c.profit / grossProfit) * 1000) / 10 : 0;
      return {
        ...c,
        grossMargin: margin,
        profitSharePct: Math.max(0, profitShare),
      };
    }).sort((a, b) => b.revenue - a.revenue).map((c) => {
      cumulativeRevenue += c.revenue;
      const cumPct = totalGrossRevenue > 0 ? (cumulativeRevenue / totalGrossRevenue) * 100 : 0;
      const tier = cumPct <= 80 ? 'Tier 1 (Platinum)' : cumPct <= 95 ? 'Tier 2 (Gold)' : 'Tier 3 (Silver)';
      return { ...c, tier, cumulativeSharePct: Math.round(cumPct * 10) / 10 };
    });

    // Convert Category Stats to sorted Array
    const categoryRanking = Object.values(categoryStats).map((cat) => {
      const margin = cat.revenue > 0 ? Math.round((cat.grossProfit / cat.revenue) * 1000) / 10 : 0;
      return {
        ...cat,
        grossMargin: margin,
        sharePct: totalGrossRevenue > 0 ? Math.round((cat.revenue / totalGrossRevenue) * 1000) / 10 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Monthly Trend Array
    // Spread opex across months based on transaction dates
    expenseTransactions.forEach((tx) => {
      const cat = (tx.category || '').toLowerCase();
      if (!cat.includes('raw material') && !cat.includes('finished goods') && !cat.includes('job work')) {
        const txDate = new Date(tx.transaction_date || tx.createdAt);
        const mKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyStats[mKey]) {
          monthlyStats[mKey].opex += tx.amount || 0;
        }
      }
    });

    const monthlyTrends = Object.values(monthlyStats)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => {
        const gp = Math.round((m.revenue - m.cogs) * 100) / 100;
        const np = Math.round((gp - m.opex) * 100) / 100;
        const gMargin = m.revenue > 0 ? Math.round((gp / m.revenue) * 1000) / 10 : 0;
        const nMargin = m.revenue > 0 ? Math.round((np / m.revenue) * 1000) / 10 : 0;
        return {
          ...m,
          grossProfit: gp,
          netProfit: np,
          grossMarginPct: gMargin,
          netMarginPct: nMargin,
        };
      });

    // 6. Cost Structure Percentage Waterfall
    const totalExpenditures = effectiveCOGS + operatingExpensesTotal;
    const costStructure = [
      {
        name: 'Direct Materials & Garment Manufacturing (COGS)',
        amount: effectiveCOGS,
        percentage: totalExpenditures > 0 ? Math.round((effectiveCOGS / totalExpenditures) * 1000) / 10 : 0,
        type: 'cogs',
      },
      ...Object.entries(opexBreakdown).map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenditures > 0 ? Math.round((amount / totalExpenditures) * 1000) / 10 : 0,
        type: 'opex',
      })),
    ].sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      data: {
        summary: {
          grossRevenue: totalGrossRevenue,
          totalUnitsSold,
          totalInvoices: invoices.length,
          averageOrderValue: aov,
          cogsDirectMaterial: totalLineCostCalculated,
          cogsJobWork: jobWorkRecordedExpense,
          totalCOGS: effectiveCOGS,
          grossProfit,
          grossMarginPercentage: grossMarginPct,
          operatingExpenses: operatingExpensesTotal,
          operatingProfit,
          operatingMarginPercentage: operatingMarginPct,
          netProfit,
          netMarginPercentage: netMarginPct,
          breakEvenRevenue,
          taxCollected: totalTaxCollected,
        },
        products: productRanking,
        customers: customerRanking,
        categories: categoryRanking,
        monthlyTrends,
        costStructure,
        dateRange: { start, end, preset: date_preset },
      },
    });
  } catch (err) {
    console.error('getProfitabilityAnalysis Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
