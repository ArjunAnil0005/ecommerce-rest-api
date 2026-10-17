const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validation/authSchemas');

const router = express.Router();

router.post(
  '/register',
  validate({ body: registerSchema }),
  authController.register,
);
router.post('/login', validate({ body: loginSchema }), authController.login);

module.exports = router;
