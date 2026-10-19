const { z } = require('zod');

const categoryId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid category id');

const createCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    parent: categoryId.nullable().optional(),
  })
  .strict();

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    parent: categoryId.nullable().optional(),
  })
  .strict()
  .refine(
    (updates) => updates.name !== undefined || updates.parent !== undefined,
  );

const categoryIdParamsSchema = z.object({ categoryId });

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamsSchema,
};
