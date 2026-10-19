const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid product or category id');
const safePaise = z.number().int().positive().safe();

const productFields = {
  name: z.string().trim().min(2).max(150),
  sku: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(5000),
  pricePaise: safePaise,
  salePricePaise: safePaise.nullable().optional(),
  stock: z.number().int().nonnegative().safe(),
  category: objectId,
};

const createProductSchema = z
  .object({
    ...productFields,
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict()
  .refine(salePriceDoesNotExceedPrice, {
    message: 'Sale price cannot be greater than regular price',
    path: ['salePricePaise'],
  });

const updateProductSchema = z
  .object({
    ...productFields,
    status: z.enum(['active', 'inactive']).optional(),
  })
  .partial()
  .strict()
  .refine((updates) => Object.keys(updates).length > 0, {
    message: 'Provide at least one product field to update',
  })
  .refine(salePriceDoesNotExceedPrice, {
    message: 'Sale price cannot be greater than regular price',
    path: ['salePricePaise'],
  });

function salePriceDoesNotExceedPrice({ salePricePaise, pricePaise }) {
  return (
    salePricePaise == null ||
    pricePaise === undefined ||
    salePricePaise <= pricePaise
  );
}

const productIdParamsSchema = z.object({ productId: objectId });

const productListQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    category: objectId.optional(),
    minPrice: z.coerce.number().int().nonnegative().safe().optional(),
    maxPrice: z.coerce.number().int().nonnegative().safe().optional(),
    sort: z
      .enum(['price', '-price', 'name', '-name', 'newest', 'oldest'])
      .default('newest'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    {
      message: 'Minimum price cannot exceed maximum price',
      path: ['minPrice'],
    },
  );

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdParamsSchema,
  productListQuerySchema,
};
