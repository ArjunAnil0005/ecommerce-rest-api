const ApiError = require('../utils/ApiError');

function authorize(...roles) {
  return function authorizeUser(req, _res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    return next();
  };
}

module.exports = authorize;
