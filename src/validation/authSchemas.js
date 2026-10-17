const { z } = require('zod');

const email = z.string().trim().email().max(254);
// bcrypt only uses the first 72 bytes, so reject longer passwords.
const password = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must be 72 bytes or fewer',
  });

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  password,
});

const loginSchema = z.object({ email, password });

module.exports = { registerSchema, loginSchema };
