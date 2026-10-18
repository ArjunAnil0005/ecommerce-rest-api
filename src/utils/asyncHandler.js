function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    // Forward rejected promises to Express's error handler.
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
