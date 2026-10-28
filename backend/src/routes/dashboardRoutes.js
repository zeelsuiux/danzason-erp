const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// CEO Business Overview Analytics
router.get('/ceo', dashboardController.getCeoDashboardAnalytics);
router.get('/overview', dashboardController.getCeoDashboardAnalytics);

// Module Shortcuts & Quick Summary Analytics
router.get('/shortcuts-summary', dashboardController.getShortcutsSummaryAnalytics);
router.get('/shortcuts', dashboardController.getShortcutsSummaryAnalytics);
router.get('/summary-shortcuts', dashboardController.getShortcutsSummaryAnalytics);

module.exports = router;
