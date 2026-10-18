function errorHandler(error, _req, res, _next) {
  const statusCode = getStatusCode(error);
  const response = {
    success: false,
    message: getErrorMessage(error, statusCode),
  };

  if (error.errors) {
    response.errors = Array.isArray(error.errors)
      ? error.errors
      : Object.values(error.errors).map(({ path, message }) => ({
          field: path,
          message,
        }));
  }

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json(response);
}

function getStatusCode(error) {
  if (error.statusCode) return error.statusCode;
  if (error.type === 'entity.parse.failed' || error.name === 'CastError') {
    return 400;
  }
  if (error.code === 11000) return 409;
  if (error.name === 'ValidationError') return 422;
  return 500;
}

function getErrorMessage(error, statusCode) {
  if (error.type === 'entity.parse.failed') return 'Invalid JSON request body';
  if (error.name === 'CastError') return 'Invalid database identifier';
  if (error.code === 11000) return 'A record with this value already exists';
  if (error.name === 'ValidationError') return 'Validation failed';
  if (statusCode === 500) return 'Internal server error';
  return error.message || 'Request failed';
}

module.exports = errorHandler;
