const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');

// Analytics & KPI aggregate
router.get('/analytics', marketingController.getMarketingAnalytics);

// Campaigns CRUD
router.get('/campaigns', marketingController.getCampaigns);
router.post('/campaigns', marketingController.createCampaign);
router.put('/campaigns/:id', marketingController.updateCampaign);
router.delete('/campaigns/:id', marketingController.deleteCampaign);

module.exports = router;
