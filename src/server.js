const app = require('./app');
const { connectDB } = require('./config/db');
const env = require('./config/env');

async function startServer() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
}

startServer().catch((error) => {
  console.error(
    'Could not start the API. Check MONGODB_URI and make sure MongoDB is running.',
    error.message,
  );
  process.exitCode = 1;
});
