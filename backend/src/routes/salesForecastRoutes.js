const express = require('express');
const router = express.Router();
const salesForecastController = require('../controllers/salesForecastController');

// Browser auto-redirect middleware: if opened directly in a browser address bar, redirect to Frontend UI
router.use((req, res, next) => {
  if (req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('http://localhost:3000/sales/forecasting');
  }
  next();
});

// Aggregate Stats & Metrics
router.get('/stats', salesForecastController.getForecastStats);

// What-If Growth Simulator
router.post('/simulate', salesForecastController.simulateGrowth);

// Forecast Plans CRUD
router.get('/', salesForecastController.getForecasts);
router.get('/:id', salesForecastController.getForecastById);
router.post('/', salesForecastController.createForecast);
router.put('/:id', salesForecastController.updateForecast);
router.delete('/:id', salesForecastController.deleteForecast);

module.exports = router;
