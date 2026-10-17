function asyncHandler(handler) {
// This function takes an asynchronous route handler and wraps it in a try-catch block to handle any errors that may occur during its execution. If an error is thrown, it will be passed to the next middleware (usually an error handler) for proper handling.
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
