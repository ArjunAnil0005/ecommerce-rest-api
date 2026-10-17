const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id');

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

const targetUserParamsSchema = z.object({ userId: objectId });
const updateUserStatusSchema = z.object({ isActive: z.boolean() }).strict();

module.exports = {
  updateProfileSchema,
  targetUserParamsSchema,
  updateUserStatusSchema,
};
