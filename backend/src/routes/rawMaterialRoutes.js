const express = require('express');
const router = express.Router();
const rawMaterialController = require('../controllers/rawMaterialController');

// Raw Materials CRUD
router.get('/', rawMaterialController.getRawMaterials);
router.post('/', rawMaterialController.createRawMaterial);
router.get('/suppliers/balances', rawMaterialController.getSupplierMaterialBalances);
router.get('/:id', rawMaterialController.getRawMaterialById);
router.put('/:id', rawMaterialController.updateRawMaterial);
router.delete('/:id', rawMaterialController.deleteRawMaterial);

// Raw Material Stock Ledger
router.get('/:id/ledger', rawMaterialController.getRawMaterialLedger);

// Contractor Details & Overview
router.get('/contractors/:id/overview', rawMaterialController.getContractorOverview);

// Manufacturing Workflow Actions
router.post('/manufacturing/quick-complete', rawMaterialController.quickCompleteJobWork);
router.post('/manufacturing/issue', rawMaterialController.issueRawMaterial);
router.post('/manufacturing/consume', rawMaterialController.recordConsumption);
router.post('/manufacturing/receive-finished', rawMaterialController.receiveFinishedGoods);
router.post('/manufacturing/return-request', rawMaterialController.requestMaterialReturn);
router.post('/manufacturing/return-dispatch', rawMaterialController.dispatchMaterialReturn);
router.post('/manufacturing/return-receive', rawMaterialController.receiveMaterialReturn);

module.exports = router;
