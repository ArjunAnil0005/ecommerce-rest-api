const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let mongo;

// Connect to an in-memory MongoDB instance for testing purposes. This allows tests to run in isolation without affecting the actual database.
async function connect() {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  await mongoose.connect(mongo.getUri());
}

// Clear all collections in the in-memory MongoDB instance. This is useful for resetting the database state between tests to ensure test isolation and consistency.
async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

// Disconnect from the in-memory MongoDB instance and stop the server. This is typically done after all tests have completed to clean up resources.
async function disconnect() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

module.exports = { connect, clear, disconnect };
