const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

// Summary & Follow-up hub
router.get('/summary', leadController.getLeadsSummary);
router.get('/followups', leadController.getAllFollowups);

// Leads CRUD
router.get('/', leadController.getLeads);
router.get('/:id', leadController.getLeadById);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);

// Lead Follow-ups
router.post('/:id/followups', leadController.addFollowup);
router.put('/:id/followups/:followupId', leadController.updateFollowup);

// Convert to Customer
router.post('/:id/convert-customer', leadController.convertToCustomer);

module.exports = router;
