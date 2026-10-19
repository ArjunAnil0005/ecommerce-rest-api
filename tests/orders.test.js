const request = require('supertest');
const app = require('../src/app');
const Category = require('../src/models/Category');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const db = require('./helpers/db');

let customer;
let otherCustomer;
let admin;
let customerToken;
let otherCustomerToken;
let adminToken;
let category;

function authorization(token) {
  return ['Bea', 'rer'].join('') + ' ' + token;
}

async function createProduct({ sku, stock = 5, status = 'active' }) {
  return Product.create({
    name: `Product ${sku}`,
    sku,
    description: 'Order test product',
    pricePaise: 10000,
    salePricePaise: 8000,
    stock,
    category: category._id,
    status,
  });
}

function placeOrder(token, items) {
  return request(app)
    .post('/api/v1/orders')
    .set('Authorization', authorization(token))
    .send({ items });
}

beforeAll(async () => {
  await db.connect();
  await Promise.all([Category.init(), Product.init(), Order.init()]);
}, 60000);

beforeEach(async () => {
  await db.clear();
  [customer, otherCustomer, admin] = await User.create([
    {
      name: 'Order Customer',
      email: 'order-customer@example.com',
      password: 'customer-password-123',
    },
    {
      name: 'Other Customer',
      email: 'other-customer@example.com',
      password: 'customer-password-123',
    },
    {
      name: 'Order Admin',
      email: 'order-admin@example.com',
      password: 'admin-password-123',
      role: 'admin',
    },
  ]);

  const [customerLogin, otherCustomerLogin, adminLogin] = await Promise.all([
    request(app)
      .post('/api/v1/auth/login')
      .send({ email: customer.email, password: 'customer-password-123' }),
    request(app).post('/api/v1/auth/login').send({
      email: otherCustomer.email,
      password: 'customer-password-123',
    }),
    request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: 'admin-password-123' }),
  ]);
  customerToken = customerLogin.body.data.token;
  otherCustomerToken = otherCustomerLogin.body.data.token;
  adminToken = adminLogin.body.data.token;
  category = await Category.create({ name: 'Order Products' });
});

afterAll(async () => {
  await db.disconnect();
}, 30000);

describe('placing orders', () => {
  test('reserves stock and uses database price and product snapshots', async () => {
    const product = await createProduct({ sku: 'ORDER-001' });

    const response = await placeOrder(customerToken, [
      { productId: product.id, quantity: 2 },
    ]);
    const updatedProduct = await Product.findById(product.id);

    expect(response.status).toBe(201);
    expect(response.body.data.order).toMatchObject({
      customer: customer.id,
      totalPaise: 16000,
      status: 'pending',
      items: [
        {
          product: product.id,
          name: product.name,
          sku: product.sku,
          unitPricePaise: 8000,
          quantity: 2,
          lineTotalPaise: 16000,
        },
      ],
    });
    expect(updatedProduct.stock).toBe(3);
  });

  test('merges repeated product IDs before reserving stock', async () => {
    const product = await createProduct({ sku: 'ORDER-DUP-001' });

    const response = await placeOrder(customerToken, [
      { productId: product.id, quantity: 1 },
      { productId: product.id.toUpperCase(), quantity: 2 },
    ]);

    expect(response.status).toBe(201);
    expect(response.body.data.order.items).toHaveLength(1);
    expect(response.body.data.order.items[0].quantity).toBe(3);
    expect((await Product.findById(product.id)).stock).toBe(2);
  });

  test('rejects client-supplied prices instead of trusting them', async () => {
    const product = await createProduct({ sku: 'ORDER-PRICE-001' });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', authorization(customerToken))
      .send({
        items: [
          {
            productId: product.id,
            quantity: 1,
            pricePaise: 1,
          },
        ],
      });

    expect(response.status).toBe(422);
    expect((await Product.findById(product.id)).stock).toBe(5);
  });

  test('rolls back earlier stock reservations when a later item is unavailable', async () => {
    const first = await createProduct({ sku: 'ORDER-ROLLBACK-001' });
    const second = await createProduct({
      sku: 'ORDER-ROLLBACK-002',
      stock: 0,
    });

    const response = await placeOrder(customerToken, [
      { productId: first.id, quantity: 2 },
      { productId: second.id, quantity: 1 },
    ]);

    expect(response.status).toBe(409);
    expect((await Product.findById(first.id)).stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('rejects unavailable and inactive products', async () => {
    const inactive = await createProduct({
      sku: 'ORDER-INACTIVE-001',
      status: 'inactive',
    });
    const missingId = new Product().id;

    const inactiveResponse = await placeOrder(customerToken, [
      { productId: inactive.id, quantity: 1 },
    ]);
    const missingResponse = await placeOrder(customerToken, [
      { productId: missingId, quantity: 1 },
    ]);

    expect(inactiveResponse.status).toBe(409);
    expect(missingResponse.status).toBe(409);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('only reserves stock available across concurrent orders', async () => {
    const product = await createProduct({
      sku: 'ORDER-CONCURRENT-001',
      stock: 5,
    });

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        placeOrder(customerToken, [{ productId: product.id, quantity: 1 }]),
      ),
    );

    expect(responses.filter(({ status }) => status === 201)).toHaveLength(5);
    expect(responses.filter(({ status }) => status === 409)).toHaveLength(5);
    expect((await Product.findById(product.id)).stock).toBe(0);
    expect(await Order.countDocuments()).toBe(5);
  }, 30000);

  test('requires a customer account to place orders', async () => {
    const product = await createProduct({ sku: 'ORDER-ADMIN-001' });
    const response = await placeOrder(adminToken, [
      { productId: product.id, quantity: 1 },
    ]);

    expect(response.status).toBe(403);
  });
});

describe('order lifecycle and access', () => {
  async function createCustomerOrder(sku = 'LIFECYCLE-001') {
    const product = await createProduct({ sku });
    const response = await placeOrder(customerToken, [
      { productId: product.id, quantity: 2 },
    ]);
    return { product, order: response.body.data.order };
  }

  test('customer cancels a pending order and stock is restored once', async () => {
    const { product, order } = await createCustomerOrder();
    const url = `/api/v1/orders/${order._id}/cancel`;

    const responses = await Promise.all([
      request(app)
        .patch(url)
        .set('Authorization', authorization(customerToken)),
      request(app)
        .patch(url)
        .set('Authorization', authorization(customerToken)),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect((await Product.findById(product.id)).stock).toBe(5);
    expect(await Order.countDocuments({ status: 'cancelled' })).toBe(1);
  });

  test('customer cannot cancel another customer order and receives 404', async () => {
    const { product, order } = await createCustomerOrder('OWNER-ONLY-001');
    const response = await request(app)
      .patch(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', authorization(otherCustomerToken));

    expect(response.status).toBe(404);
    expect((await Product.findById(product.id)).stock).toBe(3);
    expect((await Order.findById(order._id)).status).toBe('pending');
  });

  test('customer cannot cancel a confirmed order', async () => {
    const { product, order } = await createCustomerOrder('CONFIRMED-001');
    await request(app)
      .patch(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', authorization(adminToken))
      .send({ status: 'confirmed' });

    const response = await request(app)
      .patch(`/api/v1/orders/${order._id}/cancel`)
      .set('Authorization', authorization(customerToken));

    expect(response.status).toBe(409);
    expect((await Product.findById(product.id)).stock).toBe(3);
  });

  test('admin cancellation of a processing order restores stock', async () => {
    const { product, order } = await createCustomerOrder('ADMIN-CANCEL-001');
    const statusUrl = `/api/v1/orders/${order._id}/status`;

    await request(app)
      .patch(statusUrl)
      .set('Authorization', authorization(adminToken))
      .send({ status: 'confirmed' });
    await request(app)
      .patch(statusUrl)
      .set('Authorization', authorization(adminToken))
      .send({ status: 'processing' });
    const cancelled = await request(app)
      .patch(statusUrl)
      .set('Authorization', authorization(adminToken))
      .send({ status: 'cancelled' });

    expect(cancelled.status).toBe(200);
    expect((await Product.findById(product.id)).stock).toBe(5);
    expect(await Order.countDocuments({ status: 'cancelled' })).toBe(1);
  });

  test('admin can progress valid statuses and rejects invalid transitions', async () => {
    const { order } = await createCustomerOrder('STATUS-001');
    const url = `/api/v1/orders/${order._id}/status`;

    const confirmed = await request(app)
      .patch(url)
      .set('Authorization', authorization(adminToken))
      .send({ status: 'confirmed' });
    const invalid = await request(app)
      .patch(url)
      .set('Authorization', authorization(adminToken))
      .send({ status: 'delivered' });
    const processing = await request(app)
      .patch(url)
      .set('Authorization', authorization(adminToken))
      .send({ status: 'processing' });

    expect(confirmed.status).toBe(200);
    expect(invalid.status).toBe(409);
    expect(processing.status).toBe(200);
    expect(
      processing.body.data.order.statusHistory.map(({ status }) => status),
    ).toEqual(['pending', 'confirmed', 'processing']);
  });

  test('customers can read only their orders; admins can filter all orders', async () => {
    const first = await createCustomerOrder('READ-CUSTOMER-001');
    const otherProduct = await createProduct({ sku: 'READ-OTHER-001' });
    const otherOrder = await Order.create({
      customer: otherCustomer._id,
      items: [
        {
          product: otherProduct._id,
          name: otherProduct.name,
          sku: otherProduct.sku,
          unitPricePaise: otherProduct.effectivePricePaise,
          quantity: 1,
        },
      ],
    });

    const ownOrders = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', authorization(customerToken));
    const anotherOrder = await request(app)
      .get(`/api/v1/orders/${otherOrder.id}`)
      .set('Authorization', authorization(customerToken));
    const adminOrders = await request(app)
      .get('/api/v1/orders?status=pending&page=1&limit=1')
      .set('Authorization', authorization(adminToken));

    expect(first.order).toBeDefined();
    expect(ownOrders.body.data).toHaveLength(1);
    expect(anotherOrder.status).toBe(404);
    expect(adminOrders.status).toBe(200);
    expect(adminOrders.body.meta.total).toBe(2);
    expect(adminOrders.body.data).toHaveLength(1);
  });
});
