const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Disable the 'X-Powered-By' header for security reasons, as it can reveal information about the server technology being used.
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
  }),
);
app.use(express.json({ limit: '10kb' }));

// Mount the API routes under the '/api/v1' path. This means that all routes defined in the apiRoutes module will be accessible with the '/api/v1' prefix.
app.use('/api/v1', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
