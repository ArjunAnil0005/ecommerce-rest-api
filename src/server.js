const app = require('./app');
const { connectToDatabase, disconnectFromDatabase } = require('./config/db');
const env = require('./config/env');

let server;
let isShuttingDown = false;

async function startServer() {
  await connectToDatabase();
  server = app.listen(env.PORT);
  server.on('listening', () => {
    console.log(`API listening on port ${env.PORT}`);
  });
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`Received ${signal}; shutting down`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await disconnectFromDatabase();
  } catch (error) {
    console.error('Could not shut down cleanly', error);
    process.exitCode = 1;
  }
}

startServer().catch((error) => {
  console.error(
    'Could not start the API. Check MONGODB_URI and make sure MongoDB is running.',
    error.message,
  );
  process.exitCode = 1;
});
