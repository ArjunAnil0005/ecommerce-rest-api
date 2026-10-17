const mongoose = require('mongoose');
const env = require('./env');

// Connect to MongoDB using Mongoose
async function connectToDatabase(uri = env.MONGODB_URI) {
  await mongoose.connect(uri);
  return mongoose.connection;
}

// Disconnect from MongoDB
async function disconnectFromDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectToDatabase, disconnectFromDatabase };
