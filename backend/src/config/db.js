const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/danzason_erp';
  try {
    // Try connecting to the specified MongoDB URI with a short timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`✅ MongoDB Connected to: ${uri}`);
  } catch (error) {
    console.warn(`⚠️ Could not connect to MongoDB at ${uri} (${error.message}).`);
    console.log('🔄 Starting embedded MongoDB Memory Server for seamless development...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memUri = mongodInstance.getUri();
      await mongoose.connect(memUri);
      console.log(`✅ Embedded MongoDB Connected to: ${memUri}`);

      process.on('SIGINT', async () => {
        if (mongodInstance) await mongodInstance.stop();
        process.exit(0);
      });
      process.on('SIGTERM', async () => {
        if (mongodInstance) await mongodInstance.stop();
        process.exit(0);
      });
    } catch (memErr) {
      console.error('❌ Failed to start embedded MongoDB:', memErr);
      throw memErr;
    }
  }
};

module.exports = connectDB;
