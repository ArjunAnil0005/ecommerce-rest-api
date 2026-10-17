const { z } = require('zod');

// Define a reusable email schema using Zod for validation. It ensures that the email is a string, trimmed of whitespace, follows a valid email format, and does not exceed 254 characters in length.
const email = z.string().trim().email().max(254);
// bcrypt only uses the first 72 bytes, so reject longer passwords.
const password = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must be 72 bytes or fewer',
  });
// Define a Zod schema for user registration, requiring a name, email, and password. The name must be a non-empty string with a maximum length of 100 characters, while the email and password must adhere to the previously defined schemas.
const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  password,
});
// Define a Zod schema for user login, requiring an email and password. The email and password must adhere to the previously defined schemas.
const loginSchema = z.object({ email, password });

module.exports = { registerSchema, loginSchema };
