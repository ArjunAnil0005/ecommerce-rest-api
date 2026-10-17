const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function getCurrentUser(userId) {
  return User.findById(userId);
}

async function updateCurrentUserProfile(userId, profileUpdates) {
  const user = await User.findByIdAndUpdate(userId, profileUpdates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function listAllUsers() {
  return User.find().sort({ createdAt: -1 });
}

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
