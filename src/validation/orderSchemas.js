const { z } = require('zod');

const orderItemSchema = z
  .object({
    productId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid product id'),
    quantity: z.number().int().positive().max(100),
  })
  .strict();

const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1).max(50),
  })
  .strict();

module.exports = { createOrderSchema };
