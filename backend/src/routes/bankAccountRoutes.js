const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');

// Browser redirect to Settings -> Bank Accounts tab if opened directly in browser
router.use((req, res, next) => {
  if (req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('http://localhost:3000/purchase/settings?tab=bank_accounts');
  }
  next();
});

// Bank Accounts CRUD
router.get('/', bankAccountController.getBankAccounts);
router.get('/:id', bankAccountController.getBankAccountById);
router.post('/', bankAccountController.createBankAccount);
router.put('/:id', bankAccountController.updateBankAccount);
router.delete('/:id', bankAccountController.deleteBankAccount);

module.exports = router;
