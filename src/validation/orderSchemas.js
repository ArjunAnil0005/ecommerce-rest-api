const { z } = require('zod');
const { ORDER_STATUSES } = require('../utils/orderStatus');

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

const orderIdParamsSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid order id'),
});

const orderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateOrderStatusSchema = z
  .object({ status: z.enum(ORDER_STATUSES) })
  .strict();

module.exports = {
  createOrderSchema,
  orderIdParamsSchema,
  orderListQuerySchema,
  updateOrderStatusSchema,
};
