const express = require('express');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  updateMeSchema,
  userIdParamsSchema,
  updateStatusSchema,
} = require('../validation/userSchemas');

const router = express.Router();

router.use(authenticate);
router.get('/me', userController.getMe);
router.patch(
  '/me',
  validate({ body: updateMeSchema }),
  userController.updateMe,
);
router.get('/', authorize('admin'), userController.listUsers);
router.patch(
  '/:id/status',
  authorize('admin'),
  validate({ params: userIdParamsSchema, body: updateStatusSchema }),
  userController.setUserStatus,
);

module.exports = router;
