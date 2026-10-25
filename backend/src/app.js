const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const purchaseRoutes = require('./routes/purchaseRoutes');
const salesRoutes = require('./routes/salesRoutes');
const productRoutes = require('./routes/productRoutes');
const rawMaterialRoutes = require('./routes/rawMaterialRoutes');
const externalCrmRoutes = require('./routes/externalCrmRoutes');
const financeRoutes = require('./routes/financeRoutes');
const leadRoutes = require('./routes/leadRoutes');
const teamRoutes = require('./routes/teamRoutes');
const teamController = require('./controllers/teamController');
const upsellRoutes = require('./routes/upsellRoutes');
const repeatOrderRoutes = require('./routes/repeatOrderRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Health check passed',
    data: {
      projectName: 'Danza-son ERP',
      apiStatus: 'healthy',
      module: 'Purchase, Procurement, Sales & CRM APIs',
      timestamp: new Date().toISOString(),
    },
  });
});

// External CRM Endpoints (matches Postman: {{baseUrl}}/api/admin/...)
app.use('/api/admin', externalCrmRoutes);
app.use('/api/v1/admin', externalCrmRoutes);

// Authentication & User Management
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Danza-son Core ERP Routes
app.use('/api/v1/purchase', purchaseRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/raw-materials', rawMaterialRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/v1/sales/leads', leadRoutes);
app.use('/api/v1/team', teamRoutes);
app.use('/api/team', teamRoutes);

// Direct /api/v1/hierarchy and /api/hierarchy aliases
const directHierarchyRouter = express.Router();
directHierarchyRouter.get('/', teamController.getHierarchyLevels);
directHierarchyRouter.post('/', teamController.createHierarchyLevel);
directHierarchyRouter.put('/:id?', teamController.updateHierarchyLevel);
directHierarchyRouter.delete('/:id?', teamController.deleteHierarchyLevel);
app.use('/api/v1/hierarchy', directHierarchyRouter);
app.use('/api/hierarchy', directHierarchyRouter);
app.use('/api/v1/sales/upsell', upsellRoutes);
app.use('/api/v1/upsell', upsellRoutes);
app.use('/api/upsell', upsellRoutes);
app.use('/api/v1/sales/repeat-orders', repeatOrderRoutes);
app.use('/api/v1/repeat-orders', repeatOrderRoutes);
app.use('/api/repeat-orders', repeatOrderRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload received.' });
  }
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

module.exports = app;
