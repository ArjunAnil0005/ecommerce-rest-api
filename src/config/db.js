const mongoose = require('mongoose');
const env = require('./env');

async function connectToDatabase(uri = env.MONGODB_URI) {
  await mongoose.connect(uri);
  return mongoose.connection;
}

async function disconnectFromDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectToDatabase, disconnectFromDatabase };
