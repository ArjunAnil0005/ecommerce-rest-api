const { canTransition } = require('../src/utils/orderStatus');
const {
  calculateLineTotal,
  calculateOrderTotal,
} = require('../src/utils/money');
const Order = require('../src/models/Order');
const { createOrderSchema } = require('../src/validation/orderSchemas');
const mongoose = require('mongoose');

describe('order status transitions', () => {
  test.each([
    ['pending', 'confirmed'],
    ['pending', 'cancelled'],
    ['confirmed', 'processing'],
    ['confirmed', 'cancelled'],
    ['processing', 'shipped'],
    ['shipped', 'delivered'],
  ])('allows %s to %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  test.each([
    ['pending', 'shipped'],
    ['processing', 'cancelled'],
    ['shipped', 'cancelled'],
    ['delivered', 'cancelled'],
    ['delivered', 'pending'],
    ['cancelled', 'confirmed'],
    ['unknown', 'pending'],
  ])('rejects %s to %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

describe('paise calculations', () => {
  test('calculates item and order totals using integer paise', () => {
    expect(calculateLineTotal(1999, 3)).toBe(5997);
    expect(
      calculateOrderTotal([
        { unitPricePaise: 1999, quantity: 3 },
        { unitPricePaise: 2500, quantity: 2 },
      ]),
    ).toBe(10997);
  });

  test('rejects invalid quantities and unsafe totals', () => {
    expect(() => calculateLineTotal(100, 0)).toThrow(
      'Quantity must be a positive whole number',
    );
    expect(() => calculateLineTotal(Number.MAX_SAFE_INTEGER, 2)).toThrow(
      'Line total exceeds the safe integer limit',
    );
    expect(() => calculateOrderTotal([])).toThrow(
      'Order must contain at least one item',
    );
  });
});

test('validates order input and calculates order snapshot totals', async () => {
  const customer = new mongoose.Types.ObjectId();
  const product = new mongoose.Types.ObjectId();
  const input = createOrderSchema.safeParse({
    items: [{ productId: product.toString(), quantity: 2 }],
  });
  const order = new Order({
    customer,
    items: [
      {
        product,
        name: 'Phone snapshot',
        sku: 'PHONE-001',
        unitPricePaise: 45000,
        quantity: 2,
      },
    ],
  });

  expect(input.success).toBe(true);
  await order.validate();
  expect(order.items[0].lineTotalPaise).toBe(90000);
  expect(order.totalPaise).toBe(90000);
  expect(order.status).toBe('pending');
  expect(order.statusHistory[0].status).toBe('pending');
});

test('rejects invalid order item input', () => {
  expect(
    createOrderSchema.safeParse({
      items: [{ productId: 'not-an-object-id', quantity: 0 }],
    }).success,
  ).toBe(false);
});
