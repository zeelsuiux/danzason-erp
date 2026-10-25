const express = require('express');
const router = express.Router();
const upsellController = require('../controllers/upsellController');

// Analytics & Insights
router.get('/analytics', upsellController.getAnalytics);

// Smart Recommendation Engine & Pitch logging
router.post('/recommendations', upsellController.getRecommendations);
router.post('/pitch', upsellController.logPitchResult);
router.get('/opportunities', upsellController.getOpportunities);

// Upsell & Cross-sell Rules CRUD
router.get('/rules', upsellController.getRules);
router.get('/rules/:id', upsellController.getRuleById);
router.post('/rules', upsellController.createRule);
router.put('/rules/:id', upsellController.updateRule);
router.delete('/rules/:id', upsellController.deleteRule);

module.exports = router;
