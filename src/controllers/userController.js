const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.getCurrentUser(req.user.id);
  res.status(200).json({ success: true, data: { user } });
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateCurrentUserProfile(
    req.user.id,
    req.validated.body,
  );
  res.status(200).json({ success: true, data: { user } });
});

const listAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.listAllUsers();
  res.status(200).json({ success: true, data: users });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId: targetUserId } = req.validated.params;
  const { isActive } = req.validated.body;
  const user = await userService.updateUserStatus(
    req.user,
    targetUserId,
    isActive,
  );
  res.status(200).json({ success: true, data: { user } });
});

module.exports = {
  getCurrentUser,
  updateCurrentUserProfile,
  listAllUsers,
  updateUserStatus,
};
