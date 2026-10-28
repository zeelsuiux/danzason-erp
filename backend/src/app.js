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
const complaintRoutes = require('./routes/complaintRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const salesForecastRoutes = require('./routes/salesForecastRoutes');
const capitalRoutes = require('./routes/capitalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const targetGoalRoutes = require('./routes/targetGoalRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');

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

// Customer Service & Complaint Management
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/v1/customer-service', complaintRoutes);
app.use('/api/customer-service', complaintRoutes);
app.use('/api/v1/sales/complaints', complaintRoutes);

// Marketing Analytics & Campaigns
app.use('/api/v1/marketing', marketingRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/v1/sales/marketing', marketingRoutes);

// Sales & Business Forecasting
app.use('/api/v1/sales/forecasting', salesForecastRoutes);
app.use('/api/sales/forecasting', salesForecastRoutes);
app.use('/api/v1/sales/forecast', salesForecastRoutes);
app.use('/api/sales/forecast', salesForecastRoutes);
app.use('/api/v1/forecasting', salesForecastRoutes);
app.use('/api/forecasting', salesForecastRoutes);
app.use('/api/v1/forecast', salesForecastRoutes);
app.use('/api/forecast', salesForecastRoutes);

// Owner Withdrawal & Capital Management (Module #20)
app.use('/api/v1/finance/capital', capitalRoutes);
app.use('/api/finance/capital', capitalRoutes);
app.use('/api/v1/capital', capitalRoutes);
app.use('/api/capital', capitalRoutes);
app.use('/api/v1/finance/drawings', capitalRoutes);
app.use('/api/finance/drawings', capitalRoutes);
app.use('/api/v1/drawings', capitalRoutes);
app.use('/api/drawings', capitalRoutes);

// Browser direct UI navigation redirects
app.get(['/sales/forecasting', '/forecasting', '/sales/forecast', '/forecast'], (req, res) => {
  res.redirect('http://localhost:3000/sales/forecasting');
});
app.get(['/finance/capital', '/finance/drawings', '/capital', '/drawings', '/owner-capital'], (req, res) => {
  res.redirect('http://localhost:3000/finance/capital');
});

// Target & Goal Management
app.use('/api/v1/targets', targetGoalRoutes);
app.use('/api/targets', targetGoalRoutes);
app.use('/api/v1/goals', targetGoalRoutes);
app.use('/api/goals', targetGoalRoutes);
app.use('/api/v1/growth/targets', targetGoalRoutes);

// Business Overview & CEO Dashboard
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Company Bank Accounts (Settings & Payments)
app.use('/api/v1/bank-accounts', bankAccountRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/v1/finance/bank-accounts', bankAccountRoutes);
app.use('/api/finance/bank-accounts', bankAccountRoutes);
app.use('/api/v1/settings/bank-accounts', bankAccountRoutes);
app.use('/api/settings/bank-accounts', bankAccountRoutes);

// AI Assistance (Suppliers & Customers)
app.use('/api/v1/ai', aiRoutes);
app.use('/api/ai', aiRoutes);

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
