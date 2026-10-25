const CapitalTransaction = require('../models/CapitalTransaction');

const SAMPLE_CAPITAL_DATA = [
  {
    voucher_number: 'CAP-2026-00001',
    entry_type: 'capital_infusion',
    transaction_direction: 'credit',
    owner_name: 'Zeel Patel (Managing Director)',
    date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 4 months ago
    amount: 2500000,
    payment_mode: 'bank_transfer',
    bank_or_cash_account: 'HDFC Bank Ltd - Current A/C #4409',
    reference_number: 'NEFT-HDFC-9918237',
    purpose_or_reason: 'Initial promoter equity capital introduced for factory setup, cutting tables and bio-wash machinery.',
    financial_year: '2026-2027',
    tax_treatment: 'Equity capital introduced by promoter - Non-taxable capital receipt.',
    approved_by: 'Board / Managing Partner',
    status: 'approved',
    notes: 'Initial partner equity allocation recorded in audited balance sheet.',
  },
  {
    voucher_number: 'CAP-2026-00002',
    entry_type: 'capital_infusion',
    transaction_direction: 'credit',
    owner_name: 'Zeel Patel (Managing Director)',
    date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000), // 2.5 months ago
    amount: 1000000,
    payment_mode: 'bank_transfer',
    bank_or_cash_account: 'SBI Current A/C #8812',
    reference_number: 'RTGS-SBI-20260714',
    purpose_or_reason: 'Additional working capital infusion for festive bulk yarn and greige single jersey fabric purchase.',
    financial_year: '2026-2027',
    tax_treatment: 'Additional capital infusion - Added to promoter capital account.',
    approved_by: 'Finance & Accounts Head',
    status: 'approved',
    notes: 'Approved for advance yarn procurement at favorable wholesale rate.',
  },
  {
    voucher_number: 'CAP-2026-00003',
    entry_type: 'profit_allocation',
    transaction_direction: 'credit',
    owner_name: 'Zeel Patel (Managing Director)',
    date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    amount: 850000,
    payment_mode: 'journal_entry',
    bank_or_cash_account: 'Capital Reserve & Retained Earnings',
    reference_number: 'JV-PROFIT-2026-Q1',
    purpose_or_reason: 'Q1 Net Profit transferred to Owner Capital Account as retained earnings for business expansion.',
    financial_year: '2026-2027',
    tax_treatment: 'Share of audited partnership / business net profit transferred to capital.',
    approved_by: 'Chartered Accountant / Auditor',
    status: 'approved',
    notes: 'Approved after finalizing Q1 P&L and tax provisions.',
  },
  {
    voucher_number: 'DRW-2026-00001',
    entry_type: 'drawing_bank',
    transaction_direction: 'debit',
    owner_name: 'Zeel Patel (Managing Director)',
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    amount: 150000,
    payment_mode: 'bank_transfer',
    bank_or_cash_account: 'HDFC Bank Ltd - Current A/C #4409',
    reference_number: 'IMPS-20260901-7788',
    purpose_or_reason: 'Personal drawings for household expenses, residential rent and personal investments.',
    financial_year: '2026-2027',
    tax_treatment: 'Personal drawings from owner capital - Not allowable as tax deduction under Income Tax Act Sec 40(b).',
    approved_by: 'Finance & Accounts Head',
    status: 'reconciled',
    notes: 'Bank debit confirmed on monthly reconciliation statement.',
  },
  {
    voucher_number: 'DRW-2026-00002',
    entry_type: 'drawing_cash',
    transaction_direction: 'debit',
    owner_name: 'Zeel Patel (Managing Director)',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    amount: 50000,
    payment_mode: 'cash',
    bank_or_cash_account: 'Main Factory Cash Vault',
    reference_number: 'CASH-DRW-0041',
    purpose_or_reason: 'Emergency cash drawing for personal travel and festival family expenses.',
    financial_year: '2026-2027',
    tax_treatment: 'Cash drawing from cash in hand account - Subject to Sec 269ST cash compliance.',
    approved_by: 'Cashier & Finance Head',
    status: 'approved',
    notes: 'Signed petty cash receipt voucher on file.',
  },
  {
    voucher_number: 'DRW-2026-00003',
    entry_type: 'drawing_goods',
    transaction_direction: 'debit',
    owner_name: 'Zeel Patel (Managing Director)',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    amount: 7200,
    payment_mode: 'stock_adjustment',
    bank_or_cash_account: 'Finished Goods Inventory Account',
    reference_number: 'STK-DRW-2026-09',
    purpose_or_reason: '40 pcs Premium Bio-Wash Polo T-Shirts withdrawn at factory cost price (₹180/pc) for family festival gifting.',
    financial_year: '2026-2027',
    tax_treatment: 'Goods withdrawn for personal use valued at factory cost price - GST reverse charge accounted.',
    goods_items: [
      {
        product_name: 'Cotton Lycra Matty Polo T-Shirt (Navy Blue / White)',
        quantity: 40,
        unit: 'pcs',
        unit_cost_price: 180,
        total_cost: 7200,
      },
    ],
    approved_by: 'Warehouse Dispatch Manager',
    status: 'approved',
    notes: 'Deducted directly from finished goods inventory stock balance.',
  },
];

async function ensureSampleCapitalData() {
  try {
    const count = await CapitalTransaction.countDocuments({ is_deleted: false });
    if (count === 0) {
      for (const item of SAMPLE_CAPITAL_DATA) {
        await CapitalTransaction.create(item);
      }
      console.log('🌱 Seeded default Danza Son owner capital and withdrawal transactions.');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed sample capital data:', err.message);
  }
}

// 1. GET ALL CAPITAL & WITHDRAWAL TRANSACTIONS
exports.getCapitalEntries = async (req, res) => {
  try {
    await ensureSampleCapitalData();

    const {
      search,
      entry_type,
      transaction_direction,
      financial_year,
      status,
      owner_name,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const query = { is_deleted: false };

    if (entry_type && entry_type !== 'all') {
      if (entry_type === 'drawings') {
        query.entry_type = { $in: ['drawing_bank', 'drawing_cash', 'drawing_goods', 'director_remuneration'] };
      } else if (entry_type === 'infusions') {
        query.entry_type = { $in: ['capital_infusion', 'profit_allocation', 'interest_on_capital'] };
      } else {
        query.entry_type = entry_type;
      }
    }

    if (transaction_direction && transaction_direction !== 'all') {
      query.transaction_direction = transaction_direction;
    }

    if (financial_year && financial_year !== 'all') {
      query.financial_year = financial_year;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (owner_name && owner_name.trim()) {
      query.owner_name = { $regex: owner_name.trim(), $options: 'i' };
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { voucher_number: { $regex: q, $options: 'i' } },
        { owner_name: { $regex: q, $options: 'i' } },
        { purpose_or_reason: { $regex: q, $options: 'i' } },
        { bank_or_cash_account: { $regex: q, $options: 'i' } },
        { reference_number: { $regex: q, $options: 'i' } },
      ];
    }

    const total = await CapitalTransaction.countDocuments(query);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const entries = await CapitalTransaction.find(query)
      .sort(sort)
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      data: entries,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('getCapitalEntries Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. GET CAPITAL STATS & AGGREGATE SUMMARY
exports.getCapitalStats = async (req, res) => {
  try {
    await ensureSampleCapitalData();

    const allEntries = await CapitalTransaction.find({ is_deleted: false, status: { $ne: 'cancelled' } }).lean();

    let totalCapitalInfused = 0;
    let totalProfitsAllocated = 0;
    let totalInterestOnCapital = 0;

    let totalBankDrawings = 0;
    let totalCashDrawings = 0;
    let totalGoodsDrawings = 0;
    let totalDirectorRemuneration = 0;

    const monthlyDrawingsMap = {};

    allEntries.forEach((entry) => {
      const amt = Number(entry.amount || 0);
      const date = new Date(entry.date);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });

      switch (entry.entry_type) {
        case 'capital_infusion':
          totalCapitalInfused += amt;
          break;
        case 'profit_allocation':
          totalProfitsAllocated += amt;
          break;
        case 'interest_on_capital':
          totalInterestOnCapital += amt;
          break;
        case 'drawing_bank':
          totalBankDrawings += amt;
          monthlyDrawingsMap[monthKey] = (monthlyDrawingsMap[monthKey] || 0) + amt;
          break;
        case 'drawing_cash':
          totalCashDrawings += amt;
          monthlyDrawingsMap[monthKey] = (monthlyDrawingsMap[monthKey] || 0) + amt;
          break;
        case 'drawing_goods':
          totalGoodsDrawings += amt;
          monthlyDrawingsMap[monthKey] = (monthlyDrawingsMap[monthKey] || 0) + amt;
          break;
        case 'director_remuneration':
          totalDirectorRemuneration += amt;
          monthlyDrawingsMap[monthKey] = (monthlyDrawingsMap[monthKey] || 0) + amt;
          break;
        default:
          break;
      }
    });

    const totalDrawings = totalBankDrawings + totalCashDrawings + totalGoodsDrawings + totalDirectorRemuneration;
    const totalCredits = totalCapitalInfused + totalProfitsAllocated + totalInterestOnCapital;
    const netCapitalBalance = totalCredits - totalDrawings;

    // Withdrawal percentage of profit
    const withdrawalVsProfitPct =
      totalProfitsAllocated > 0
        ? ((totalDrawings / totalProfitsAllocated) * 100).toFixed(1)
        : 0;

    // Return on Capital Employed approximation
    const rocePct =
      totalCapitalInfused > 0
        ? ((totalProfitsAllocated / totalCapitalInfused) * 100).toFixed(1)
        : 0;

    const monthlyBreakdown = Object.keys(monthlyDrawingsMap).map((m) => ({
      month: m,
      amount: monthlyDrawingsMap[m],
    }));

    res.json({
      success: true,
      data: {
        totalCapitalInfused,
        totalProfitsAllocated,
        totalInterestOnCapital,
        totalDrawings,
        totalBankDrawings,
        totalCashDrawings,
        totalGoodsDrawings,
        totalDirectorRemuneration,
        netCapitalBalance,
        totalCredits,
        withdrawalVsProfitPct: Number(withdrawalVsProfitPct),
        rocePct: Number(rocePct),
        monthlyBreakdown,
        totalVouchersCount: allEntries.length,
      },
    });
  } catch (err) {
    console.error('getCapitalStats Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. GET SINGLE CAPITAL ENTRY BY ID
exports.getCapitalEntryById = async (req, res) => {
  try {
    const entry = await CapitalTransaction.findOne({ _id: req.params.id, is_deleted: false });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Capital / Drawing voucher not found.' });
    }
    res.json({ success: true, data: entry });
  } catch (err) {
    console.error('getCapitalEntryById Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. CREATE NEW CAPITAL INFUSION OR WITHDRAWAL
exports.createCapitalEntry = async (req, res) => {
  try {
    const {
      entry_type,
      owner_name,
      date,
      amount,
      payment_mode,
      bank_or_cash_account,
      reference_number,
      purpose_or_reason,
      goods_items,
      financial_year,
      tax_treatment,
      notes,
    } = req.body;

    if (!entry_type || !amount || !purpose_or_reason) {
      return res.status(400).json({
        success: false,
        message: 'Transaction type, amount, and purpose are required.',
      });
    }

    const newEntry = new CapitalTransaction({
      entry_type,
      owner_name: (owner_name || 'Zeel Patel (Managing Director)').trim(),
      date: date ? new Date(date) : new Date(),
      amount: Number(amount),
      payment_mode: payment_mode || 'bank_transfer',
      bank_or_cash_account: (bank_or_cash_account || 'HDFC Bank Ltd - Current A/C #4409').trim(),
      reference_number: (reference_number || '').trim(),
      purpose_or_reason: purpose_or_reason.trim(),
      goods_items: Array.isArray(goods_items) ? goods_items : [],
      financial_year: financial_year || '2026-2027',
      tax_treatment: tax_treatment || 'Standard partner capital drawings account',
      notes: (notes || '').trim(),
      created_by: req.user?.name || 'Finance Admin',
      status: 'approved',
    });

    const saved = await newEntry.save();

    res.status(201).json({
      success: true,
      message: `${newEntry.transaction_direction === 'credit' ? 'Capital infusion' : 'Owner drawing'} recorded successfully.`,
      data: saved,
    });
  } catch (err) {
    console.error('createCapitalEntry Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. UPDATE CAPITAL ENTRY
exports.updateCapitalEntry = async (req, res) => {
  try {
    const entry = await CapitalTransaction.findOne({ _id: req.params.id, is_deleted: false });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Voucher not found.' });
    }

    const fields = [
      'owner_name',
      'date',
      'amount',
      'payment_mode',
      'bank_or_cash_account',
      'reference_number',
      'purpose_or_reason',
      'goods_items',
      'financial_year',
      'tax_treatment',
      'notes',
      'status',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        entry[f] = req.body[f];
      }
    });

    const updated = await entry.save();
    res.json({
      success: true,
      message: 'Voucher updated successfully.',
      data: updated,
    });
  } catch (err) {
    console.error('updateCapitalEntry Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. CANCEL / DELETE ENTRY
exports.cancelCapitalEntry = async (req, res) => {
  try {
    const entry = await CapitalTransaction.findOne({ _id: req.params.id, is_deleted: false });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Voucher not found.' });
    }

    entry.status = 'cancelled';
    entry.is_deleted = true;
    await entry.save();

    res.json({ success: true, message: 'Capital / Drawing voucher cancelled successfully.' });
  } catch (err) {
    console.error('cancelCapitalEntry Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
