const express = require('express');
const router = express.Router();
const crmAuth = require('../middleware/crmAuth');
const productCtrl = require('../controllers/productController');
const crmCtrl = require('../controllers/crmController');
const purchaseCtrl = require('../controllers/purchaseController');

// Apply CRM API Key authentication to all external CRM endpoints
router.use(crmAuth);

// 1. Products Endpoints (matches Postman: {{baseUrl}}/api/admin/product)
router.get('/product/:id/ledger', productCtrl.getProductLedger);
router.get('/product', productCtrl.getProducts);
router.get('/product/:id', productCtrl.getProductById);
router.post('/product', productCtrl.createProduct);
router.put('/product/:id', productCtrl.updateProduct);
router.delete('/product/:id', productCtrl.deleteProduct);

// Also alias plural /products under /api/admin
router.get('/products/:id/ledger', productCtrl.getProductLedger);
router.get('/products', productCtrl.getProducts);
router.get('/products/:id', productCtrl.getProductById);

// 2. Users Endpoints (matches Postman: {{baseUrl}}/api/admin/users/list and :id)
router.get('/users/list', crmCtrl.getUsersList);
router.get('/users/:id', crmCtrl.getUserById);

// 3. Order Requests Endpoints (matches Postman: {{baseUrl}}/api/admin/order-request and :id)
router.get('/order-request', crmCtrl.getOrderRequestsList);
router.get('/order-request/:id', crmCtrl.getOrderRequestById);
router.post('/order-request', require('../controllers/salesController').createVisitorOrder);
router.put('/order-request/:id/status', require('../controllers/salesController').updateSalesOrderStatus);
router.patch('/order-request/:id/status', require('../controllers/salesController').updateSalesOrderStatus);

// 4. Warehouses Endpoint (for ERP compatibility)
router.get('/warehouses', purchaseCtrl.getWarehouses);

module.exports = router;
