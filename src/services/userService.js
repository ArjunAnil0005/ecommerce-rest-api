const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// This service module provides functions for user-related operations, including retrieving the current user's information, updating the user's profile, listing all users, and updating a user's active status. It interacts with the User model to perform database operations and handles errors by throwing ApiError instances when necessary.
async function getCurrentUser(userId) {
  return User.findById(userId);
}

// Update the current user's profile with the provided updates. It finds the user by their ID and applies the updates, returning the updated user document. If the user is not found, it throws an ApiError with a 404 status code.
async function updateCurrentUserProfile(userId, profileUpdates) {
  const user = await User.findByIdAndUpdate(userId, profileUpdates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

// List all users in the database, sorted by creation date in descending order. This function retrieves all user documents and returns them as an array.
async function listAllUsers() {
  return User.find().sort({ createdAt: -1 });
}

// Update the active status of a user specified by targetUserId. It checks if the admin user is trying to deactivate their own account and throws an ApiError if so. It then updates the user's isActive status and returns the updated user document. If the user is not found, it throws an ApiError with a 404 status code.
async function updateUserStatus(adminUser, targetUserId, isActive) {
  if (adminUser._id.equals(targetUserId) && !isActive) {
    throw new ApiError(400, 'You cannot deactivate your own account');
  }

  const user = await User.findByIdAndUpdate(
    targetUserId,
    { isActive },
    { new: true, runValidators: true },
  );
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

module.exports = {
  getCurrentUser,
  updateCurrentUserProfile,
  listAllUsers,
  updateUserStatus,
};
