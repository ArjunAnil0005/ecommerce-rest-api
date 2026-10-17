const { z } = require('zod');

const email = z.string().trim().email().max(254);
// bcrypt only reads the first 72 bytes, so cap the input instead of silently ignoring the rest
const password = z.string().min(8).max(72);

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  password,
});

const loginSchema = z.object({ email, password });

module.exports = { registerSchema, loginSchema };
