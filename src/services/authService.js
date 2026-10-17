const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// This service module provides functions for user authentication, including registration and login. It handles user creation, password hashing, and JWT token generation. The register function checks for existing users and creates a new user with a hashed password, while the login function verifies user credentials and returns a JWT token for authenticated sessions.
function createJwtToken(user) {
  return jwt.sign({ id: user.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

// Register a new user by creating a user document in the database. It checks if a user with the provided email already exists and throws an ApiError if so. If the registration is successful, it returns the created user and a JWT token for authentication.
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
    return { user, token: createJwtToken(user) };
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw error;
  }
}

// Log in an existing user by verifying their email and password. It checks if the user exists, if the password matches the hashed password stored in the database, and if the user is active. If any of these checks fail, it throws an ApiError. If successful, it returns the user and a JWT token for authenticated sessions.
async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password',
  );

  if (
    !user ||
    !(await bcrypt.compare(password, user.password)) ||
    !user.isActive
  ) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return { user, token: createJwtToken(user) };
}

module.exports = { register, login };
