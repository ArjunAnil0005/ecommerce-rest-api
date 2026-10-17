const ApiError = require('./ApiError');

function parsePagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new ApiError(
      400,
      'page must be positive and limit must be between 1 and 100',
    );
  }

  return { page, limit, skip: (page - 1) * limit };
}

function buildMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

module.exports = { parsePagination, buildMeta };
