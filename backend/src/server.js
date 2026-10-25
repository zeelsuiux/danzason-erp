require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedAllData = require('./seed/seedData');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await seedAllData();

    app.listen(PORT, () => {
      console.log(`🚀 Danza-son ERP Backend Server running on http://localhost:${PORT}`);
      console.log(`📡 Purchase API Endpoints available at http://localhost:${PORT}/api/v1/purchase`);
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

startServer();
