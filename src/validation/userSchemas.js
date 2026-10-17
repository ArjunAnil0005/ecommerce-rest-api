const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id');

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

const userIdParamsSchema = z.object({ id: objectId });
const updateStatusSchema = z.object({ isActive: z.boolean() }).strict();

module.exports = {
  updateMeSchema,
  userIdParamsSchema,
  updateStatusSchema,
};
