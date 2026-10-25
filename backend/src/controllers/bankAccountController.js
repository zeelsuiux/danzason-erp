const BankAccount = require('../models/BankAccount');

const SAMPLE_BANK_ACCOUNTS = [
  {
    account_name: 'HDFC Bank Main Current A/c',
    bank_name: 'HDFC Bank Ltd',
    account_number: '50200018892144',
    account_holder_name: 'Danza-Son Apparels & Textiles',
    account_type: 'current',
    ifsc_code: 'HDFC0000240',
    branch_name: 'Ring Road Branch, Surat',
    upi_id: 'danzason@okhdfcbank',
    opening_balance: 1500000,
    current_balance: 1845200,
    is_default_receiving: true,
    is_default_payment: true,
    is_active: true,
    notes: 'Primary current account for client wholesale receipts and vendor RTGS payments.',
  },
  {
    account_name: 'SBI Operating & Vendor Settlement A/c',
    bank_name: 'State Bank of India',
    account_number: '38910488921',
    account_holder_name: 'Danza-Son Apparels & Textiles',
    account_type: 'current',
    ifsc_code: 'SBIN0004018',
    branch_name: 'Textile Market Branch, Surat',
    upi_id: 'danzason.sbi@sbi',
    opening_balance: 500000,
    current_balance: 680000,
    is_default_receiving: false,
    is_default_payment: false,
    is_active: true,
    notes: 'Secondary account used for raw material yarn and dyeing job work settlements.',
  },
  {
    account_name: 'ICICI Bank Overdraft / CC Account',
    bank_name: 'ICICI Bank',
    account_number: '002305018821',
    account_holder_name: 'Danza-Son Apparels & Textiles',
    account_type: 'overdraft_cc',
    ifsc_code: 'ICIC0000023',
    branch_name: 'Majura Gate Branch, Surat',
    upi_id: '',
    opening_balance: 1000000,
    current_balance: 820000,
    is_default_receiving: false,
    is_default_payment: false,
    is_active: true,
    notes: 'Cash credit working capital line with ₹25,00,000 sanctioned limit.',
  },
  {
    account_name: 'Main Factory Cash Drawer & Petty Cash',
    bank_name: 'Cash in Hand (Factory Vault)',
    account_number: 'CASH-VAULT-001',
    account_holder_name: 'Danza-Son Petty Cashier',
    account_type: 'cash',
    ifsc_code: '',
    branch_name: 'Surat Apparel Manufacturing Unit',
    upi_id: '',
    opening_balance: 50000,
    current_balance: 85000,
    is_default_receiving: false,
    is_default_payment: false,
    is_active: true,
    notes: 'Physical cash drawer for daily factory emergency expenses, tea/snacks, and local courier freights.',
  },
  {
    account_name: 'Danza-Son Corporate UPI / QR Merchant',
    bank_name: 'HDFC Bank (Merchant QR)',
    account_number: 'MERCHANT-QR-4409',
    account_holder_name: 'Danza-Son Apparels',
    account_type: 'upi',
    ifsc_code: 'HDFC0000240',
    branch_name: 'Digital Merchant Gateway',
    upi_id: 'danzason.pay@hdfcbank',
    opening_balance: 25000,
    current_balance: 42500,
    is_default_receiving: false,
    is_default_payment: false,
    is_active: true,
    notes: 'Dynamic QR and instant UPI payment receipts from retail samples and B2B buyers.',
  },
];

async function ensureSampleBankAccounts() {
  try {
    const count = await BankAccount.countDocuments({ is_deleted: false });
    if (count === 0) {
      for (const acc of SAMPLE_BANK_ACCOUNTS) {
        await BankAccount.create(acc);
      }
      console.log('🌱 Seeded default Danza Son company bank accounts successfully.');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed sample bank accounts:', err.message);
  }
}

// 1. GET ALL BANK ACCOUNTS (WITH FILTERS & STATS)
exports.getBankAccounts = async (req, res) => {
  try {
    await ensureSampleBankAccounts();

    const { search, is_active, account_type, include_deleted } = req.query;
    const query = include_deleted === 'true' ? {} : { is_deleted: false };

    if (is_active !== undefined && is_active !== 'all') {
      query.is_active = is_active === 'true';
    }

    if (account_type && account_type !== 'all') {
      query.account_type = account_type;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { account_name: { $regex: q, $options: 'i' } },
        { bank_name: { $regex: q, $options: 'i' } },
        { account_number: { $regex: q, $options: 'i' } },
        { ifsc_code: { $regex: q, $options: 'i' } },
        { upi_id: { $regex: q, $options: 'i' } },
        { branch_name: { $regex: q, $options: 'i' } },
      ];
    }

    const accounts = await BankAccount.find(query).sort({ is_default_receiving: -1, is_default_payment: -1, createdAt: 1 }).lean();

    // Summary calculations
    let totalBalance = 0;
    let activeAccountsCount = 0;
    let defaultReceivingAccount = null;
    let defaultPaymentAccount = null;

    accounts.forEach((acc) => {
      if (acc.is_active) {
        totalBalance += Number(acc.current_balance || 0);
        activeAccountsCount++;
      }
      if (acc.is_default_receiving) defaultReceivingAccount = acc;
      if (acc.is_default_payment) defaultPaymentAccount = acc;
    });

    res.json({
      success: true,
      data: accounts,
      summary: {
        totalAccounts: accounts.length,
        activeAccountsCount,
        totalBalance,
        defaultReceivingAccount: defaultReceivingAccount ? defaultReceivingAccount.account_name : null,
        defaultPaymentAccount: defaultPaymentAccount ? defaultPaymentAccount.account_name : null,
      },
    });
  } catch (err) {
    console.error('getBankAccounts Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. GET SINGLE BANK ACCOUNT BY ID
exports.getBankAccountById = async (req, res) => {
  try {
    const account = await BankAccount.findOne({ _id: req.params.id, is_deleted: false });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found.' });
    }
    res.json({ success: true, data: account });
  } catch (err) {
    console.error('getBankAccountById Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. CREATE NEW BANK ACCOUNT
exports.createBankAccount = async (req, res) => {
  try {
    const {
      account_name,
      bank_name,
      account_number,
      account_holder_name,
      account_type,
      ifsc_code,
      branch_name,
      upi_id,
      opening_balance = 0,
      is_default_receiving = false,
      is_default_payment = false,
      is_active = true,
      notes,
    } = req.body;

    if (!account_name || !bank_name || !account_number) {
      return res.status(400).json({
        success: false,
        message: 'Account name, bank name, and account number are required.',
      });
    }

    // Check duplicate account number
    const existing = await BankAccount.findOne({
      account_number: account_number.trim(),
      is_deleted: false,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A bank account with number "${account_number}" already exists (${existing.account_name}).`,
      });
    }

    // If setting as default receiving, unset others
    if (is_default_receiving) {
      await BankAccount.updateMany({}, { is_default_receiving: false });
    }

    // If setting as default payment, unset others
    if (is_default_payment) {
      await BankAccount.updateMany({}, { is_default_payment: false });
    }

    const newAccount = new BankAccount({
      account_name: account_name.trim(),
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      account_holder_name: (account_holder_name || 'Danza-Son Apparels & Textiles').trim(),
      account_type: account_type || 'current',
      ifsc_code: (ifsc_code || '').trim().toUpperCase(),
      branch_name: (branch_name || '').trim(),
      upi_id: (upi_id || '').trim(),
      opening_balance: Number(opening_balance || 0),
      current_balance: Number(opening_balance || 0),
      is_default_receiving: Boolean(is_default_receiving),
      is_default_payment: Boolean(is_default_payment),
      is_active: Boolean(is_active),
      notes: (notes || '').trim(),
    });

    const saved = await newAccount.save();

    res.status(201).json({
      success: true,
      message: `Bank account "${saved.account_name}" added successfully.`,
      data: saved,
    });
  } catch (err) {
    console.error('createBankAccount Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. UPDATE BANK ACCOUNT
exports.updateBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOne({ _id: req.params.id, is_deleted: false });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found.' });
    }

    const {
      account_name,
      bank_name,
      account_number,
      account_holder_name,
      account_type,
      ifsc_code,
      branch_name,
      upi_id,
      current_balance,
      is_default_receiving,
      is_default_payment,
      is_active,
      notes,
    } = req.body;

    if (account_number && account_number.trim() !== account.account_number) {
      const duplicate = await BankAccount.findOne({
        _id: { $ne: account._id },
        account_number: account_number.trim(),
        is_deleted: false,
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another bank account with number "${account_number}" already exists.`,
        });
      }
      account.account_number = account_number.trim();
    }

    if (account_name) account.account_name = account_name.trim();
    if (bank_name) account.bank_name = bank_name.trim();
    if (account_holder_name) account.account_holder_name = account_holder_name.trim();
    if (account_type) account.account_type = account_type;
    if (ifsc_code !== undefined) account.ifsc_code = ifsc_code.trim().toUpperCase();
    if (branch_name !== undefined) account.branch_name = branch_name.trim();
    if (upi_id !== undefined) account.upi_id = upi_id.trim();
    if (current_balance !== undefined) account.current_balance = Number(current_balance);
    if (notes !== undefined) account.notes = notes.trim();
    if (is_active !== undefined) account.is_active = Boolean(is_active);

    if (is_default_receiving) {
      await BankAccount.updateMany({ _id: { $ne: account._id } }, { is_default_receiving: false });
      account.is_default_receiving = true;
    } else if (is_default_receiving === false) {
      account.is_default_receiving = false;
    }

    if (is_default_payment) {
      await BankAccount.updateMany({ _id: { $ne: account._id } }, { is_default_payment: false });
      account.is_default_payment = true;
    } else if (is_default_payment === false) {
      account.is_default_payment = false;
    }

    const updated = await account.save();

    res.json({
      success: true,
      message: `Bank account "${updated.account_name}" updated successfully.`,
      data: updated,
    });
  } catch (err) {
    console.error('updateBankAccount Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. DELETE (SOFT DELETE) BANK ACCOUNT
exports.deleteBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOne({ _id: req.params.id, is_deleted: false });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found.' });
    }

    // Safety check: Don't delete if default
    if (account.is_default_receiving || account.is_default_payment) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a default bank account. Please set another account as default first.',
      });
    }

    account.is_deleted = true;
    account.is_active = false;
    await account.save();

    res.json({
      success: true,
      message: `Bank account "${account.account_name}" deleted successfully.`,
    });
  } catch (err) {
    console.error('deleteBankAccount Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. HELPER TO CREDIT / DEBIT BANK BALANCE WHEN PAYMENT IS RECORDED
exports.adjustBalance = async (accountId, amount, type = 'credit') => {
  try {
    if (!accountId) return null;
    const account = await BankAccount.findOne({ _id: accountId, is_deleted: false });
    if (!account) return null;

    const delta = Number(amount || 0);
    if (type === 'credit') {
      account.current_balance = Number(account.current_balance || 0) + delta;
    } else {
      account.current_balance = Number(account.current_balance || 0) - delta;
    }

    await account.save();
    return account;
  } catch (err) {
    console.warn('⚠️ Could not adjust bank account balance:', err.message);
    return null;
  }
};
