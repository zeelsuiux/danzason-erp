const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const connectDB = require('./config/db');
const seedAllData = require('./seed/seedData');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    try {
      await seedAllData();
      const { ensureDefaultAdmin } = require('./controllers/authController');
      await ensureDefaultAdmin();
    } catch (seedErr) {
      console.warn('⚠️ Seeding skipped or error:', seedErr.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Danza-son ERP Backend Server running on http://0.0.0.0:${PORT}`);
      console.log(`📡 Purchase API Endpoints available at http://0.0.0.0:${PORT}/api/v1/purchase`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});

process.on('exit', (code) => {
  console.log(`Backend process exiting with code: ${code}`);
});

startServer();
