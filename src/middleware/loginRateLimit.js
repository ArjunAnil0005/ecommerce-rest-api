const ApiError = require('../utils/ApiError');

function createLoginRateLimit({
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
} = {}) {
  const attemptsByIp = new Map();
  let requestCount = 0;

  function loginRateLimit(req, res, next) {
    const now = Date.now();
    requestCount += 1;
    if (requestCount % 100 === 0) {
      for (const [ip, attempt] of attemptsByIp) {
        if (now - attempt.startedAt >= windowMs) attemptsByIp.delete(ip);
      }
    }
    const attempt = attemptsByIp.get(req.ip);

    if (!attempt || now - attempt.startedAt >= windowMs) {
      attemptsByIp.set(req.ip, { startedAt: now, count: 1 });
    } else if (attempt.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil(
        (windowMs - (now - attempt.startedAt)) / 1000,
      );
      res.set('Retry-After', String(retryAfterSeconds));
      return next(
        new ApiError(429, 'Too many login attempts. Try again later.'),
      );
    } else {
      attempt.count += 1;
    }

    res.once('finish', () => {
      if (res.statusCode < 400) attemptsByIp.delete(req.ip);
    });
    return next();
  }

  loginRateLimit.reset = () => attemptsByIp.clear();
  return loginRateLimit;
}

module.exports = createLoginRateLimit;
