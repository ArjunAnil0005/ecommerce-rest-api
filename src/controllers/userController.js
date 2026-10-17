const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMe(req.user.id);
  res.status(200).json({ success: true, data: { user } });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateMe(req.user.id, req.validated.body);
  res.status(200).json({ success: true, data: { user } });
});

const listUsers = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.validated.query);
  res
    .status(200)
    .json({ success: true, data: result.users, meta: result.meta });
});

const setUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.setUserStatus(
    req.user.id,
    req.validated.params.id,
    req.validated.body.isActive,
  );
  res.status(200).json({ success: true, data: { user } });
});

module.exports = { getMe, updateMe, listUsers, setUserStatus };
