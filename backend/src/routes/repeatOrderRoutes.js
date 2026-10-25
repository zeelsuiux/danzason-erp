const express = require('express');
const router = express.Router();
const repeatOrderController = require('../controllers/repeatOrderController');

// Analytics
router.get('/analytics', repeatOrderController.getAnalytics);

// 1-Click Generation from Past Sales Order/Invoice
router.post('/generate-from-order', repeatOrderController.generateFromPastOrder);

// Contact / Communication logging
router.post('/:id/log-contact', repeatOrderController.logContact);

// Convert confirmed repeat order to Sales Invoice
router.post('/:id/convert-to-invoice', repeatOrderController.convertToInvoice);

// Standard CRUD
router.get('/', repeatOrderController.getRepeatOrders);
router.get('/:id', repeatOrderController.getRepeatOrderById);
router.post('/', repeatOrderController.createRepeatOrder);
router.put('/:id', repeatOrderController.updateRepeatOrder);
router.delete('/:id', repeatOrderController.deleteRepeatOrder);

module.exports = router;
