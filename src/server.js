const app = require('./app');
const { connectToDatabase } = require('./config/db');
const env = require('./config/env');

async function startServer() {
  await connectToDatabase();
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
