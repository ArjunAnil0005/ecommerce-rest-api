function errorHandler(error, _req, res, _next) {
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
