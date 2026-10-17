const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id');

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  role: z.enum(['customer', 'admin']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

const userIdParamsSchema = z.object({ id: objectId });
const updateStatusSchema = z.object({ isActive: z.boolean() }).strict();

module.exports = {
  updateMeSchema,
  listUsersQuerySchema,
  userIdParamsSchema,
  updateStatusSchema,
};
