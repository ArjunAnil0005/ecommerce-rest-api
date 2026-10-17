const ApiError = require('../utils/ApiError');

// This middleware function is used to validate incoming requests against specified Zod schemas for the request body, parameters, and query. It checks if the request data conforms to the defined schemas and collects any validation errors. If there are validation errors, it throws an ApiError with a 422 status code and details of the validation issues. If validation passes, it attaches the validated data to the request object for further processing in subsequent middleware or route handlers.
function validate(schemas) {
  return function validateRequest(req, _res, next) {
    const errors = [];
    req.validated = {};

    for (const key of ['body', 'params', 'query']) {
      if (!schemas[key]) continue;

      const result = schemas[key].safeParse(req[key]);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((issue) => ({
            field: [key, ...issue.path].join('.'),
            message: issue.message,
          })),
        );
      } else req.validated[key] = result.data;
    }

    if (errors.length > 0) {
      return next(new ApiError(422, 'Validation failed', errors));
    }

    return next();
  };
}

module.exports = validate;
