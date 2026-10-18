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

  expect(mobiles.ancestors).toEqual([electronics._id]);
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject([
    {
      _id: electronics._id,
      children: [{ _id: mobiles._id, children: [] }],
    },
  ]);
});

test('moves a category and updates its descendants', async () => {
  const electronics = await createCategory('Electronics');
  const mobiles = await createCategory('Mobiles', electronics._id);
  const phones = await createCategory('Phones', mobiles._id);
  const computers = await createCategory('Computers');

  const response = await request(app)
    .patch(`/api/v1/categories/${mobiles._id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ parent: computers._id });
  const updatedPhones = await Category.findById(phones._id).lean();

  expect(response.status).toBe(200);
  expect(updatedPhones.ancestors.map(String)).toEqual([
    computers._id,
    mobiles._id,
  ]);
});

test('rejects moving Electronics under its child Mobiles', async () => {
  const electronics = await createCategory('Electronics');
  const mobiles = await createCategory('Mobiles', electronics._id);

  const response = await request(app)
    .patch(`/api/v1/categories/${electronics._id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ parent: mobiles._id });
  const unchangedElectronics = await Category.findById(electronics._id).lean();
  const unchangedMobiles = await Category.findById(mobiles._id).lean();
  const tree = await request(app).get('/api/v1/categories/tree');

  expect(response.status).toBe(400);
  expect(unchangedElectronics.parent).toBeNull();
  expect(unchangedMobiles.parent.toString()).toBe(electronics._id);
  expect(tree.body.data[0].children[0]._id).toBe(mobiles._id);
});
