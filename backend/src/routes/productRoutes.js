const express = require('express');
const router = express.Router();
const productCtrl = require('../controllers/productController');

router.get('/', productCtrl.getProducts);
router.get('/:id/pricing', productCtrl.getProductPricing);
router.put('/:id/pricing-rule', productCtrl.updateProductPricingRule);
router.get('/:id/ledger', productCtrl.getProductLedger);
router.get('/:id', productCtrl.getProductById);
router.post('/', productCtrl.createProduct);
router.put('/:id', productCtrl.updateProduct);
router.delete('/:id', productCtrl.deleteProduct);

module.exports = router;
