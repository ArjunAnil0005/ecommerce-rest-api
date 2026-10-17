function errorHandler(error, _req, res, _next) {
// This middleware function is used to handle errors that occur during the processing of requests. It determines the appropriate HTTP status code based on the error type and constructs a JSON response containing the error message. If the error is a server error (status code 500), it logs the error to the console for debugging purposes.
  const statusCode =
    error.statusCode || (error.type === 'entity.parse.failed' ? 400 : 500);
  const response = {
    success: false,
    message:
      statusCode === 500
        ? 'Internal server error'
        : error.type === 'entity.parse.failed'
          ? 'Invalid JSON request body'
          : error.message || 'Invalid JSON request body',
  };

  if (error.errors) response.errors = error.errors;

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
