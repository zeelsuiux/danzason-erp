const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

// Summary KPI Stats
router.get('/stats', complaintController.getComplaintStats);

// Complaint Tickets CRUD
router.get('/', complaintController.getComplaints);
router.get('/:id', complaintController.getComplaintById);
router.post('/', complaintController.createComplaint);
router.put('/:id', complaintController.updateComplaint);

// Status, Timeline & Resolution Actions
router.put('/:id/status', complaintController.updateStatus);
router.post('/:id/timeline', complaintController.addTimelineEntry);
router.put('/:id/resolve', complaintController.resolveComplaint);

module.exports = router;
