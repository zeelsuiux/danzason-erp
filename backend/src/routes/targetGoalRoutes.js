const express = require('express');
const router = express.Router();
const targetGoalController = require('../controllers/targetGoalController');

// Analytics summary
router.get('/analytics', targetGoalController.getGoalAnalyticsSummary);

// Auto sync progress with live ERP transactions
router.post('/sync-progress', targetGoalController.syncGoalProgress);

// Seed starter data
router.post('/seed', targetGoalController.seedDefaultTargetGoals);

// CRUD
router.get('/', targetGoalController.getTargetGoals);
router.get('/:id', targetGoalController.getTargetGoalById);
router.post('/', targetGoalController.createTargetGoal);
router.put('/:id', targetGoalController.updateTargetGoal);
router.delete('/:id', targetGoalController.deleteTargetGoal);

// Record manual progress & notes
router.post('/:id/progress', targetGoalController.recordGoalProgress);
router.post('/:id/increment', targetGoalController.quickIncrementGoal);

module.exports = router;
