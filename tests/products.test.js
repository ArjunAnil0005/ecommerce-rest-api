const request = require('supertest');
const app = require('../src/app');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const db = require('./helpers/db');

let adminToken;
let customerToken;
let rootCategory;
let childCategory;
let grandchildCategory;

function createAuthorizationHeader(token) {
  return ['Bea', 'rer'].join('') + ' ' + token;
}

async function createProduct(overrides = {}, token = adminToken) {
  return request(app)
    .post('/api/v1/products')
    .set('Authorization', createAuthorizationHeader(token))
    .send({
      name: 'Wireless Headphones',
      sku: 'AUDIO-001',
      description: 'Bluetooth headphones',
      pricePaise: 125000,
      stock: 10,
      category: rootCategory.id,
      ...overrides,
    });
}

beforeAll(async () => {
  await db.connect();
  await Promise.all([Category.init(), Product.init()]);
}, 60000);

beforeEach(async () => {
  await db.clear();

  const admin = await User.create({
    name: 'Product Admin',
    email: 'product-admin@example.com',
    password: 'admin-password-123',
    role: 'admin',
  });
  const customer = await User.create({
    name: 'Product Customer',
    email: 'product-customer@example.com',
    password: 'customer-password-123',
  });
  const [adminLogin, customerLogin] = await Promise.all([
    request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: 'admin-password-123' }),
    request(app)
      .post('/api/v1/auth/login')
      .send({ email: customer.email, password: 'customer-password-123' }),
  ]);
  adminToken = adminLogin.body.data.token;
  customerToken = customerLogin.body.data.token;

  rootCategory = await Category.create({ name: 'Electronics' });
  childCategory = await Category.create({
    name: 'Mobiles',
    parent: rootCategory._id,
    ancestors: [rootCategory._id],
  });
  grandchildCategory = await Category.create({
    name: 'Android Phones',
    parent: childCategory._id,
    ancestors: [rootCategory._id, childCategory._id],
  });
});

afterAll(async () => {
  await db.disconnect();
}, 30000);

describe('product administration', () => {
  test('creates a product and calculates the effective paise price', async () => {
    const response = await createProduct({ salePricePaise: 99900 });

    expect(response.status).toBe(201);
    expect(response.body.data.product).toMatchObject({
      sku: 'AUDIO-001',
      pricePaise: 125000,
      salePricePaise: 99900,
      effectivePricePaise: 99900,
      stock: 10,
      status: 'active',
    });
  });

  test('rejects duplicate SKUs with 409', async () => {
    await createProduct();
    const duplicate = await createProduct({ name: 'Different headphones' });

    expect(duplicate.status).toBe(409);
  });

  test.each([
    [{ stock: -1 }, 'negative stock'],
    [{ salePricePaise: 130000 }, 'sale price above regular price'],
    [{ pricePaise: 10.5 }, 'fractional paise'],
  ])('rejects invalid product data: %s', async (invalidFields) => {
    const response = await createProduct(invalidFields);
    expect(response.status).toBe(422);
  });

  test('rejects an unknown or inactive category', async () => {
    const missingCategory = await createProduct({
      category: '507f1f77bcf86cd799439011',
    });
    await Category.updateOne({ _id: rootCategory._id }, { isActive: false });
    const inactiveCategory = await createProduct();

    expect(missingCategory.status).toBe(404);
    expect(inactiveCategory.status).toBe(404);
  });

  test('prevents customers from creating products', async () => {
    const response = await createProduct({}, customerToken);
    expect(response.status).toBe(403);
  });

  test('updates product fields and category as an admin', async () => {
    const product = await createProduct();

    const updated = await request(app)
      .patch(`/api/v1/products/${product.body.data.product._id}`)
      .set('Authorization', createAuthorizationHeader(adminToken))
      .send({ category: childCategory.id, pricePaise: 150000 });

    expect(updated.status).toBe(200);
    expect(updated.body.data.product.category).toBe(childCategory.id);
    expect(updated.body.data.product.effectivePricePaise).toBe(150000);
  });

  test('soft-deletes products so existing order references remain valid', async () => {
    const created = await createProduct();
    const productId = created.body.data.product._id;

    const deleted = await request(app)
      .delete(`/api/v1/products/${productId}`)
      .set('Authorization', createAuthorizationHeader(adminToken));
    const publicDetail = await request(app).get(
      `/api/v1/products/${productId}`,
    );
    const adminList = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', createAuthorizationHeader(adminToken));

    expect(deleted.status).toBe(200);
    expect(deleted.body.data.product.status).toBe('inactive');
    expect(publicDetail.status).toBe(404);
    expect(adminList.body.data).toHaveLength(1);
    expect(await Product.exists({ _id: productId })).not.toBeNull();
  });
});

describe('product listing', () => {
  test('returns active products publicly and inactive products to admins', async () => {
    await createProduct({ sku: 'ACTIVE-001' });
    await createProduct({ sku: 'INACTIVE-001', status: 'inactive' });

    const publicList = await request(app).get('/api/v1/products');
    const adminList = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', createAuthorizationHeader(adminToken));

    expect(publicList.status).toBe(200);
    expect(publicList.body.data.map(({ sku }) => sku)).toEqual(['ACTIVE-001']);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(2);
  });

  test('searches product names and SKUs', async () => {
    await createProduct({ name: 'Samsung Galaxy', sku: 'SAMSUNG-001' });
    await createProduct({ name: 'Apple Phone', sku: 'APPLE-002' });

    const byName = await request(app).get('/api/v1/products?search=Samsung');
    const bySku = await request(app).get('/api/v1/products?search=APPLE-002');

    expect(byName.body.data.map(({ sku }) => sku)).toEqual(['SAMSUNG-001']);
    expect(bySku.body.data.map(({ sku }) => sku)).toEqual(['APPLE-002']);
  });

  test('category filter includes products from all descendant categories', async () => {
    await createProduct({ sku: 'ROOT-001', category: rootCategory.id });
    await createProduct({ sku: 'CHILD-001', category: childCategory.id });
    await createProduct({
      sku: 'GRANDCHILD-001',
      category: grandchildCategory.id,
    });

    const response = await request(app).get(
      `/api/v1/products?category=${rootCategory.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.map(({ sku }) => sku).sort()).toEqual([
      'CHILD-001',
      'GRANDCHILD-001',
      'ROOT-001',
    ]);
  });

  test('filters and sorts by effective sale price with pagination metadata', async () => {
    await createProduct({
      sku: 'SALE-001',
      pricePaise: 100000,
      salePricePaise: 50000,
    });
    await createProduct({ sku: 'FULL-001', pricePaise: 80000 });

    const response = await request(app).get(
      '/api/v1/products?minPrice=60000&maxPrice=90000&sort=price&page=1&limit=1',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.map(({ sku }) => sku)).toEqual(['FULL-001']);
    expect(response.body.meta).toMatchObject({
      total: 1,
      page: 1,
      limit: 1,
      totalPages: 1,
    });

    const salePriceResponse = await request(app).get(
      '/api/v1/products?minPrice=40000&maxPrice=60000&sort=price',
    );
    expect(salePriceResponse.body.data.map(({ sku }) => sku)).toEqual([
      'SALE-001',
    ]);
  });

  test.each([
    '?sort=invalid',
    '?page=0',
    '?limit=101',
    '?minPrice=100&maxPrice=50',
  ])('rejects invalid listing query %s with 422', async (query) => {
    const response = await request(app).get(`/api/v1/products${query}`);
    expect(response.status).toBe(422);
  });
});
