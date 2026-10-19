const express = require('express');
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const requireCustomer = require('../middleware/requireCustomer');
const validate = require('../middleware/validate');
const {
  createOrderSchema,
  orderIdParamsSchema,
  orderListQuerySchema,
  updateOrderStatusSchema,
} = require('../validation/orderSchemas');

const router = express.Router();

router.use(authenticate);
router.post(
  '/',
  requireCustomer,
  validate({ body: createOrderSchema }),
  orderController.createOrder,
);
router.get(
  '/',
  validate({ query: orderListQuerySchema }),
  orderController.listOrders,
);
router.get(
  '/:orderId',
  validate({ params: orderIdParamsSchema }),
  orderController.getOrder,
);
router.patch(
  '/:orderId/cancel',
  requireCustomer,
  validate({ params: orderIdParamsSchema }),
  orderController.cancelOrder,
);
router.patch(
  '/:orderId/status',
  requireAdmin,
  validate({
    params: orderIdParamsSchema,
    body: updateOrderStatusSchema,
  }),
  orderController.updateOrderStatus,
);

module.exports = router;
