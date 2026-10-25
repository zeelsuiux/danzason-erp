const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');

// Overview & Dashboard
router.get('/overview', financeController.getOverview);

// Master lists (categories, accounts, payment methods)
router.get('/masters', financeController.getMasters);

// Transactions CRUD & Filtered Lists
router.get('/transactions', financeController.getTransactions);
router.get('/transactions/:id', financeController.getTransactionById);
router.post('/transactions', financeController.createManualTransaction);
router.put('/transactions/:id', financeController.updateManualTransaction);
router.post('/transactions/:id/cancel', financeController.cancelTransaction);

// Financial Reports Suite
router.get('/reports', financeController.getReports);

// Comprehensive Profitability Analysis & Margin Engine
router.get('/profitability', financeController.getProfitabilityAnalysis);

// Explicit Bill Synchronization
router.post('/sync-bills', financeController.syncBills);

module.exports = router;
