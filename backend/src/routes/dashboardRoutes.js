const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// CEO Business Overview Analytics
router.get('/ceo', dashboardController.getCeoDashboardAnalytics);
router.get('/overview', dashboardController.getCeoDashboardAnalytics);

module.exports = router;
