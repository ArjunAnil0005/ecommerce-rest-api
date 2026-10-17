const ApiError = require('../utils/ApiError');
// This middleware function is used to handle requests to routes that do not exist. It creates a new ApiError with a 404 status code and a message indicating that the route was not found, and passes it to the next middleware in the chain.
function notFound(_req, _res, next) {
  next(new ApiError(404, 'Route not found'));
}

module.exports = notFound;
