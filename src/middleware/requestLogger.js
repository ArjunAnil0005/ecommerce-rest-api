const { randomUUID } = require('node:crypto');

function requestLogger(req, res, next) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  req.id = requestId;
  res.set('X-Request-Id', requestId);
  res.once('finish', () => {
    console.info(
      JSON.stringify({
        requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  });

  next();
}

module.exports = requestLogger;
