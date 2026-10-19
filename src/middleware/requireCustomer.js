const ApiError = require('../utils/ApiError');

function requireCustomer(req, _res, next) {
  if (req.user?.role !== 'customer') {
    return next(new ApiError(403, 'Customer access required'));
  }
  return next();
}

module.exports = requireCustomer;
