const express = require('express');
const authController = require('../controllers/authController');
const createLoginRateLimit = require('../middleware/loginRateLimit');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validation/authSchemas');

const router = express.Router();
const loginRateLimit = createLoginRateLimit();

router.post(
  '/register',
  validate({ body: registerSchema }),
  authController.register,
);
router.post(
  '/login',
  validate({ body: loginSchema }),
  loginRateLimit,
  authController.login,
);

module.exports = router;
