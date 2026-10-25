const express = require('express');
const router = express.Router();
const capitalController = require('../controllers/capitalController');

// Browser direct UI redirect middleware
router.use((req, res, next) => {
  if (req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('http://localhost:3000/finance/capital');
  }
  next();
});

// Summary Stats & Capital Balance
router.get('/stats', capitalController.getCapitalStats);

// Vouchers CRUD
router.get('/', capitalController.getCapitalEntries);
router.get('/:id', capitalController.getCapitalEntryById);
router.post('/', capitalController.createCapitalEntry);
router.put('/:id', capitalController.updateCapitalEntry);
router.delete('/:id', capitalController.cancelCapitalEntry);
router.post('/:id/cancel', capitalController.cancelCapitalEntry);

module.exports = router;
