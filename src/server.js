const app = require('./app');
const { connectDB } = require('./config/db');
const env = require('./config/env');

async function startServer() {
  await connectDB();
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down`);
    server.close(async (error) => {
      if (error) {
        console.error('HTTP server shutdown failed', error);
        process.exitCode = 1;
      }
      const mongoose = require('mongoose');
      await mongoose.disconnect();
      process.exit();
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error('Server startup failed', error);
  process.exitCode = 1;
});
