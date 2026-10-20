const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const env = require('./config/env');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();
const openApiPath = path.join(__dirname, '../docs/openapi.yaml');
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, 'utf8'));

app.disable('x-powered-by');
app.use(helmet());
app.use(requestLogger);
app.use(
  cors({
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
  }),
);
app.use(express.json({ limit: '10kb' }));

app.get('/api-docs/openapi.yaml', (_req, res) => {
  res.type('text/yaml').sendFile(openApiPath);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/v1', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
