const orderService = require('../services/orderService');
const asyncHandler = require('../utils/asyncHandler');

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.placeOrder(
    req.user._id,
    req.validated.body.items,
  );
  res.status(201).json({ success: true, data: { order } });
});

const listOrders = asyncHandler(async (req, res) => {
  const result = await orderService.listOrders(req.user, req.validated.query);
  res.status(200).json({
    success: true,
    data: result.orders,
    meta: result.meta,
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(
    req.validated.params.orderId,
    req.user,
  );
  res.status(200).json({ success: true, data: { order } });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.validated.params.orderId,
    req.user._id,
  );
  res.status(200).json({ success: true, data: { order } });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.validated.params.orderId,
    req.validated.body.status,
  );
  res.status(200).json({ success: true, data: { order } });
});

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
};
