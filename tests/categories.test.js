const request = require('supertest');
const app = require('../src/app');
const Category = require('../src/models/Category');
const User = require('../src/models/User');
const db = require('./helpers/db');

let adminToken;

async function createCategory(name, parent) {
  const response = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name, ...(parent ? { parent } : {}) });

  expect(response.status).toBe(201);
  return response.body.data.category;
}

beforeAll(async () => {
  await db.connect();
  await Category.init();
}, 60000);

beforeEach(async () => {
  await db.clear();
  const admin = await User.create({
    name: 'Admin',
    email: 'category-admin@example.com',
    password: 'admin-password-123',
    role: 'admin',
  });
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: admin.email, password: 'admin-password-123' });
  adminToken = response.body.data.token;
});

afterAll(async () => {
  await db.disconnect();
}, 30000);

test('creates categories and returns them as a tree', async () => {
  const electronics = await createCategory('Electronics');
  const mobiles = await createCategory('Mobiles', electronics._id);
  const response = await request(app).get('/api/v1/categories/tree');

  expect(electronics.slug).toBe('electronics');
  expect(mobiles.ancestors).toEqual([electronics._id]);
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject([
    {
      _id: electronics._id,
      slug: 'electronics',
      children: [{ _id: mobiles._id, slug: 'mobiles', children: [] }],
    },
  ]);
});

test('moves a category and updates its descendants', async () => {
  const electronics = await createCategory('Electronics');
  const mobiles = await createCategory('Mobiles', electronics._id);
  const phones = await createCategory('Phones', mobiles._id);
  const samsung = await createCategory('Samsung', phones._id);
  const computers = await createCategory('Computers');

  const response = await request(app)
    .patch(`/api/v1/categories/${mobiles._id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ parent: computers._id });
  const updatedPhones = await Category.findById(phones._id).lean();
  const updatedSamsung = await Category.findById(samsung._id).lean();

  expect(response.status).toBe(200);
  expect(updatedPhones.ancestors.map(String)).toEqual([
    computers._id,
    mobiles._id,
  ]);
  expect(updatedSamsung.ancestors.map(String)).toEqual([
    computers._id,
    mobiles._id,
    phones._id,
  ]);
});

test('renames a category and returns its generated slug', async () => {
  const samsung = await createCategory('Samsung');

  const response = await request(app)
    .patch(`/api/v1/categories/${samsung._id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Samsung Phones' });

  expect(response.status).toBe(200);
  expect(response.body.data.category).toMatchObject({
    _id: samsung._id,
    name: 'Samsung Phones',
    slug: 'samsung-phones',
    parent: null,
    ancestors: [],
  });
});

test('rejects moving Electronics under its descendant and leaves the tree unchanged', async () => {
  const electronics = await createCategory('Electronics');
  const mobiles = await createCategory('Mobiles', electronics._id);
  const phones = await createCategory('Phones', mobiles._id);

  const response = await request(app)
    .patch(`/api/v1/categories/${electronics._id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ parent: phones._id });
  const unchangedElectronics = await Category.findById(electronics._id).lean();
  const unchangedMobiles = await Category.findById(mobiles._id).lean();
  const tree = await request(app).get('/api/v1/categories/tree');

  expect(response.status).toBe(400);
  expect(unchangedElectronics.parent).toBeNull();
  expect(unchangedMobiles.parent.toString()).toBe(electronics._id);
  expect(tree.body.data[0].children[0]._id).toBe(mobiles._id);
});

test('rejects deleting a category with descendants and deletes a leaf', async () => {
  const electronics = await createCategory('Electronics');
  const mobiles = await createCategory('Mobiles', electronics._id);

  const rejected = await request(app)
    .delete(`/api/v1/categories/${electronics._id}`)
    .set('Authorization', `Bearer ${adminToken}`);

  expect(rejected.status).toBe(409);
  expect(await Category.findById(electronics._id)).not.toBeNull();

  const deleted = await request(app)
    .delete(`/api/v1/categories/${mobiles._id}`)
    .set('Authorization', `Bearer ${adminToken}`);

  expect(deleted.status).toBe(200);
  expect(await Category.findById(mobiles._id)).toBeNull();
});

test('rejects category creation and deletion by a customer', async () => {
  const category = await createCategory('Electronics');
  const customer = await User.create({
    name: 'Customer',
    email: 'category-customer@example.com',
    password: 'customer-password-123',
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: customer.email, password: 'customer-password-123' });

  const creation = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${login.body.data.token}`)
    .send({ name: 'Unauthorized Category', parent: null });
  const deletion = await request(app)
    .delete(`/api/v1/categories/${category._id}`)
    .set('Authorization', `Bearer ${login.body.data.token}`);

  expect(creation.status).toBe(403);
  expect(deletion.status).toBe(403);
  expect(await Category.findById(category._id)).not.toBeNull();
  expect(await Category.countDocuments()).toBe(1);
});
