const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { canTransition } = require('../utils/orderStatus');

const MAX_QUANTITY_PER_PRODUCT = 100;

function combineItems(items) {
  const quantitiesByProduct = new Map();

  for (const { productId, quantity } of items) {
    const normalizedProductId = productId.toLowerCase();
    const totalQuantity =
      (quantitiesByProduct.get(normalizedProductId) || 0) + quantity;
    if (totalQuantity > MAX_QUANTITY_PER_PRODUCT) {
      throw new ApiError(
        422,
        `Combined quantity for a product cannot exceed ${MAX_QUANTITY_PER_PRODUCT}`,
      );
    }
    quantitiesByProduct.set(normalizedProductId, totalQuantity);
  }

  return [...quantitiesByProduct].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

async function placeOrder(customerId, requestedItems) {
  const items = combineItems(requestedItems);
  const session = await mongoose.startSession();
  let createdOrder;

  try {
    // Keep every stock decrement and the order insert together. If any item
    // fails, MongoDB rolls back all earlier decrements in this transaction.
    await session.withTransaction(async () => {
      const snapshots = [];

      for (const { productId, quantity } of items) {
        const product = await Product.findOneAndUpdate(
          {
            _id: productId,
            status: 'active',
            // This condition makes the decrement safe when requests race.
            stock: { $gte: quantity },
          },
          { $inc: { stock: -quantity } },
          { new: true, session },
        );

        if (!product) {
          throw new ApiError(
            409,
            'Product is unavailable or does not have enough stock',
          );
        }

        snapshots.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          unitPricePaise: product.effectivePricePaise,
          quantity,
        });
      }

      [createdOrder] = await Order.create(
        [{ customer: customerId, items: snapshots, status: 'pending' }],
        { session },
      );
    });

    return createdOrder;
  } finally {
    await session.endSession();
  }
}

async function listOrders(user, { status, page, limit }) {
  const filter = user.role === 'admin' ? {} : { customer: user._id };
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

async function getOrderById(orderId, user) {
  assertValidOrderId(orderId);
  const filter = { _id: orderId };
  if (user.role !== 'admin') filter.customer = user._id;

  const order = await Order.findOne(filter).lean();
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
}

async function cancelOrder(orderId, customerId) {
  assertValidOrderId(orderId);
  const session = await mongoose.startSession();

  try {
    let cancelledOrder;
    await session.withTransaction(async () => {
      // Only one concurrent request can change a pending order to cancelled.
      // Stock is restored below in the same transaction.
      cancelledOrder = await Order.findOneAndUpdate(
        { _id: orderId, customer: customerId, status: 'pending' },
        {
          $set: { status: 'cancelled' },
          $push: { statusHistory: { status: 'cancelled' } },
        },
        { new: true, session, runValidators: true },
      );

      if (!cancelledOrder) {
        const order = await Order.findOne({
          _id: orderId,
          customer: customerId,
        }).session(session);
        if (!order) throw new ApiError(404, 'Order not found');
        throw new ApiError(409, 'Only pending orders can be cancelled');
      }

      await restoreStock(cancelledOrder.items, session);
    });

    return cancelledOrder;
  } finally {
    await session.endSession();
  }
}

async function updateOrderStatus(orderId, nextStatus) {
  assertValidOrderId(orderId);
  const session = await mongoose.startSession();

  try {
    let updatedOrder;
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new ApiError(404, 'Order not found');
      if (!canTransition(order.status, nextStatus)) {
        throw new ApiError(
          409,
          `Cannot change order status from ${order.status} to ${nextStatus}`,
        );
      }

      order.status = nextStatus;
      order.statusHistory.push({ status: nextStatus });
      updatedOrder = await order.save({ session });

      if (nextStatus === 'cancelled') {
        // The status change is rolled back too if any stock restore fails.
        await restoreStock(order.items, session);
      }
    });
    return updatedOrder;
  } finally {
    await session.endSession();
  }
}

async function restoreStock(items, session) {
  // Use the order's product references and quantities; product prices or names
  // may have changed since the order was placed.
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
      { session },
    );
    if (result.matchedCount !== 1) {
      throw new ApiError(409, 'A product in this order no longer exists');
    }
  }
}

function assertValidOrderId(orderId) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new ApiError(400, 'Invalid order id');
  }
}

module.exports = {
  placeOrder,
  listOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
};
