const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function getMe(userId) {
  return User.findById(userId);
}

async function updateMe(userId, changes) {
  const user = await User.findByIdAndUpdate(userId, changes, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function listUsers() {
  return User.find().sort({ createdAt: -1 });
}

async function setUserStatus(admin, userId, isActive) {
  if (admin._id.equals(userId) && !isActive) {
    throw new ApiError(400, 'You cannot deactivate your own account');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { isActive },
    { new: true, runValidators: true },
  );
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

module.exports = { getMe, updateMe, listUsers, setUserStatus };
