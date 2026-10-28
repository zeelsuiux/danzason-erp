const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// Customers CRUD
router.get('/customers', salesController.getCustomers);
router.get('/customers/:id', salesController.getCustomerById);
router.get('/customers/:id/overview', salesController.getCustomerOverview);
router.post('/customers', salesController.createCustomer);
router.put('/customers/:id', salesController.updateCustomer);
router.delete('/customers/:id', salesController.deleteCustomer);

// Sales Orders (SO)
router.get('/orders', salesController.getSalesOrders);
router.get('/orders/:id', salesController.getSalesOrderById);
router.post('/orders', salesController.createSalesOrder);
router.put('/orders/:id', salesController.updateSalesOrder);
router.put('/orders/:id/status', salesController.updateSalesOrderStatus);

// Sales Invoices
router.get('/invoices', salesController.getSalesInvoices);
router.get('/invoices/:id', salesController.getSalesInvoiceById);
router.post('/invoices', salesController.createDirectSalesInvoice);
router.post('/invoices/from-order', salesController.createSalesInvoiceFromOrder);
router.put('/invoices/:id', salesController.updateSalesInvoice);
router.put('/invoices/:id/due-date', salesController.updateSalesInvoiceDueDate);
router.post('/invoices/:id/payment', salesController.recordSalesInvoicePayment);
router.put('/invoices/:id/payments/:paymentIndex/time', salesController.correctPaymentTime);

// Sales Returns
router.get('/returns', salesController.getSalesReturns);
router.get('/returns/:id', salesController.getSalesReturnById);
router.post('/returns', salesController.createSalesReturn);

// Visitor / Customer Storefront Routes
router.post('/visitor-order', salesController.createVisitorOrder);
router.get('/track-order/:ref', salesController.trackVisitorOrder);

// Applications (CRM Order Requests & Buyer Applications)
const crmController = require('../controllers/crmController');
router.get('/applications', crmController.getOrderRequestsList);
router.get('/applications/:id', crmController.getOrderRequestById);
router.put('/applications/:id/status', salesController.updateSalesOrderStatus);
router.patch('/applications/:id/status', salesController.updateSalesOrderStatus);

// Sales & Business Forecasting
router.use('/forecasting', require('./salesForecastRoutes'));
router.use('/forecast', require('./salesForecastRoutes'));

module.exports = router;
