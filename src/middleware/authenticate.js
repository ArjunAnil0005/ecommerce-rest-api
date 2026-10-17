const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

// This middleware function is used to authenticate incoming requests by verifying the JWT token provided in the Authorization header. It checks if the token is valid, not expired, and corresponds to an active user in the database. If any of these checks fail, it throws an ApiError with a 401 status code.
const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.get('authorization');
  const [scheme, token] = authorization ? authorization.split(' ') : [];

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Authentication required');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (_error) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  if (typeof payload !== 'object' || typeof payload.id !== 'string') {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid or inactive user');
  }

  req.user = user;
  return next();
});

module.exports = authenticate;
