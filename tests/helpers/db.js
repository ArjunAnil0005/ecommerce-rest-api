const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;

async function connect() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ launchTimeout: 120000 }],
  });
  await mongoose.connect(replSet.getUri());
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

async function disconnect() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

module.exports = { connect, clear, disconnect };
