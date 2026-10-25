const express = require('express');
const router = express.Router();
const purchaseCtrl = require('../controllers/purchaseController');

// Categories
router.get('/categories', purchaseCtrl.getCategories);
router.post('/categories', purchaseCtrl.createCategory);
router.put('/categories/:id', purchaseCtrl.updateCategory);
router.delete('/categories/:id', purchaseCtrl.deleteCategory);

// Suppliers
router.get('/suppliers', purchaseCtrl.getSuppliers);
router.get('/suppliers/:id', purchaseCtrl.getSupplierById);
router.get('/suppliers/:id/overview', purchaseCtrl.getSupplierOverview);
router.post('/suppliers', purchaseCtrl.createSupplier);
router.put('/suppliers/:id', purchaseCtrl.updateSupplier);
router.delete('/suppliers/:id', purchaseCtrl.deleteSupplier);

// Inquiries / Quotations (RFQ)
router.get('/inquiries', purchaseCtrl.getInquiries);
router.get('/inquiries/:id', purchaseCtrl.getInquiryById);
router.post('/inquiries', purchaseCtrl.createInquiry);
router.put('/inquiries/:id', purchaseCtrl.updateInquiry);
router.delete('/inquiries/:id', purchaseCtrl.deleteInquiry);
router.put('/inquiries/:id/suppliers/:supplierId/status', purchaseCtrl.updateSupplierQuotationStatus);
router.post('/inquiries/:id/award-po', purchaseCtrl.awardQuotationAndGeneratePo);

// Requisitions (PR)
router.get('/requisitions', purchaseCtrl.getRequisitions);
router.post('/requisitions', purchaseCtrl.createRequisition);
router.put('/requisitions/:id/approve', purchaseCtrl.approveRequisition);

// Purchase Orders (PO)
router.get('/orders/next-number', purchaseCtrl.getNextOrderNumber);
router.get('/orders', purchaseCtrl.getOrders);
router.get('/orders/:id', purchaseCtrl.getOrderById);
router.post('/orders', purchaseCtrl.createOrder);
router.put('/orders/:id', purchaseCtrl.updateOrder);

// Goods Receipt Note (GRN)
router.get('/grns', purchaseCtrl.getGrns);
router.get('/grns/:id', purchaseCtrl.getGrnById);
router.post('/grns', purchaseCtrl.createGrn);
router.put('/grns/:id/post-to-stock', purchaseCtrl.postGrnToStock);

// Invoices (Bills)
router.get('/invoices/next-number', purchaseCtrl.getNextBillNumber);
router.get('/invoices', purchaseCtrl.getInvoices);
router.get('/invoices/:id', purchaseCtrl.getInvoiceById);
router.post('/invoices', purchaseCtrl.createInvoice);
router.put('/invoices/:id', purchaseCtrl.updateInvoice);
router.put('/invoices/:id/due-date', purchaseCtrl.updateInvoiceDueDate);
router.post('/invoices/:id/payment', purchaseCtrl.recordInvoicePayment);

// Returns
router.get('/returns/next-number', purchaseCtrl.getNextReturnNumber);
router.get('/returns', purchaseCtrl.getReturns);
router.get('/returns/:id', purchaseCtrl.getReturnById);
router.post('/returns', purchaseCtrl.createReturn);
router.put('/returns/:id', purchaseCtrl.updateReturn);

// Centralized Warehouse Management (Settings)
router.get('/warehouses', purchaseCtrl.getWarehouses);
router.post('/warehouses', purchaseCtrl.createWarehouse);
router.get('/warehouses/:id', purchaseCtrl.getWarehouseById);
router.put('/warehouses/:id', purchaseCtrl.updateWarehouse);
router.delete('/warehouses/:id', purchaseCtrl.deleteWarehouse);
router.put('/warehouses/:id/set-default', purchaseCtrl.setDefaultWarehouse);
router.put('/warehouses/:id/toggle-status', purchaseCtrl.toggleWarehouseStatus);

module.exports = router;
