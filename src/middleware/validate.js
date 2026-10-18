const ApiError = require('../utils/ApiError');

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
