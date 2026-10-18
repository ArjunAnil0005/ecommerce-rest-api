const authenticate = require('./authenticate');

function authenticateIfPresent(req, res, next) {
  if (!req.get('authorization')) return next();
  return authenticate(req, res, next);
}

module.exports = authenticateIfPresent;
