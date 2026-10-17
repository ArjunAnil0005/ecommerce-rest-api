const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const dummyPasswordHash = bcrypt.hashSync(
  'timing-only-not-a-real-user-password',
  env.BCRYPT_ROUNDS,
);

function signToken(user) {
  return jwt.sign({ id: user.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  try {
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: 'customer',
    });
    return { user, token: signToken(user) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw error;
  }
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password',
  );
  const validPassword = await bcrypt.compare(
    password,
    user ? user.password : dummyPasswordHash,
  );

  if (!user || !validPassword || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return { user, token: signToken(user) };
}

module.exports = { register, login };
