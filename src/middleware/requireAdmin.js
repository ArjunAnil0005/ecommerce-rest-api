const ApiError = require('../utils/ApiError');

// This middleware function is used to restrict access to certain routes to users with the 'admin' role. It checks if the authenticated user (attached to the request object by the authenticate middleware) has the 'admin' role. If not, it throws an ApiError with a 403 status code indicating insufficient permissions.
function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Insufficient permissions'));
  }
  return next();
}

module.exports = requireAdmin;
