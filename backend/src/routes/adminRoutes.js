const express = require('express');
const router = express.Router();
const purchaseCtrl = require('../controllers/purchaseController');

router.get('/warehouses', purchaseCtrl.getWarehouses);

module.exports = router;
