const mongoose = require('mongoose');

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: Math.max(Number(process.env.MONGODB_MAX_POOL_SIZE) || 20, 5),
    minPoolSize: Math.max(Number(process.env.MONGODB_MIN_POOL_SIZE) || 2, 0),
    serverSelectionTimeoutMS: Math.max(Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 5000, 1000),
    socketTimeoutMS: Math.max(Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000, 5000),
    maxIdleTimeMS: Math.max(Number(process.env.MONGODB_MAX_IDLE_TIME_MS) || 30000, 5000)
  });
  console.log('MongoDB connected');
};

module.exports = connectDatabase;
