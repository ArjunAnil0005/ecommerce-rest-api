const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid category id');
const categoryId = z.string().min(1);

const createCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    parent: categoryId.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    parent: categoryId.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((updates) => Object.keys(updates).length > 0, {
    message: 'Provide at least one category field to update',
  });

const categoryIdParamsSchema = z.object({ categoryId });

const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  parent: z.union([objectId, z.literal('null')]).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamsSchema,
  listCategoriesQuerySchema,
};
