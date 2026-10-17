const app = require('./app');
const { connectToDatabase } = require('./config/db');
const env = require('./config/env');

// Start the server by first connecting to the database and then listening on the specified port. If any errors occur during this process, log the error message and set the process exit code to 1 to indicate failure.
async function startServer() {
  await connectToDatabase();
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
}

// Execute the startServer function and handle any errors that occur during the startup process. If an error occurs, log it to the console and set the process exit code to 1 to indicate failure.
startServer().catch((error) => {
  console.error(
    'Could not start the API. Check MONGODB_URI and make sure MongoDB is running.',
    error.message,
  );
  process.exitCode = 1;
});
