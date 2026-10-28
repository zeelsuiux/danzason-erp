const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Supplier AI Assistant
router.post('/supplier-assist', aiController.generateSupplierAiMessage);
router.post('/supplier', aiController.generateSupplierAiMessage);

// Customer AI Assistant
router.post('/customer-assist', aiController.generateCustomerAiMessage);
router.post('/customer', aiController.generateCustomerAiMessage);

module.exports = router;
