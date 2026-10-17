const express = require('express');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const {
  updateProfileSchema,
  targetUserParamsSchema,
  updateUserStatusSchema,
} = require('../validation/userSchemas');

const router = express.Router();

router.use(authenticate);
router.get('/me', userController.getCurrentUser);
router.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  userController.updateCurrentUserProfile,
);
router.get('/', requireAdmin, userController.listAllUsers);
router.patch(
  '/:userId/status',
  requireAdmin,
  validate({ params: targetUserParamsSchema, body: updateUserStatusSchema }),
  userController.updateUserStatus,
);

module.exports = router;
