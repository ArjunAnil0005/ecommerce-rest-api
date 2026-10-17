const { z } = require('zod');

// Define a reusable email schema using Zod for validation. It ensures that the email is a string, trimmed of whitespace, follows a valid email format, and does not exceed 254 characters in length.
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id');

// Define a Zod schema for updating the current user's profile, requiring a name that is a non-empty string with a maximum length of 100 characters. The schema is strict, meaning it will reject any additional properties not defined in the schema.
const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

// Define a Zod schema for validating the userId parameter in routes that target a specific user. It ensures that the userId is a valid MongoDB ObjectId string.
const targetUserParamsSchema = z.object({ userId: objectId });
const updateUserStatusSchema = z.object({ isActive: z.boolean() }).strict();

module.exports = {
  updateProfileSchema,
  targetUserParamsSchema,
  updateUserStatusSchema,
};
