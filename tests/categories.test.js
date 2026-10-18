const request = require('supertest');
const app = require('../src/app');
const Category = require('../src/models/Category');
const User = require('../src/models/User');
const db = require('./helpers/db');
const { createCategory, createCategoryTree } = require('./helpers/categories');
const buildCategoryTree = require('../src/utils/buildCategoryTree');

let admin;
let adminToken;

beforeAll(async () => {
  await db.connect();
  await Category.init();
}, 60000);

beforeEach(async () => {
  await db.clear();
  admin = await User.create({
    name: 'Admin',
    email: 'category-admin@example.com',
    password: 'admin-password-123',
    role: 'admin',
  });
  const loginResponse = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: admin.email, password: 'admin-password-123' });
  adminToken = loginResponse.body.data.token;
});

afterAll(async () => {
  await db.disconnect();
}, 30000);

afterEach(() => {
  jest.restoreAllMocks();
});

test('builds deep category trees and does not promote orphan categories', () => {
  const tree = buildCategoryTree([
    { _id: 'root', name: 'Root', parent: null },
    { _id: 'level-2', name: 'Level 2', parent: 'root' },
    { _id: 'level-3', name: 'Level 3', parent: 'level-2' },
    { _id: 'level-4', name: 'Level 4', parent: 'level-3' },
    { _id: 'level-5', name: 'Level 5', parent: 'level-4' },
    { _id: 'orphan', name: 'Orphan', parent: 'missing-parent' },
  ]);

  expect(tree).toHaveLength(1);
  expect(tree[0].children[0].children[0].children[0].children[0].name).toBe(
    'Level 5',
  );
});

describe('category creation and reads', () => {
  test('creates root and child categories with correct ancestors', async () => {
    const root = await createCategory(request(app), adminToken, 'Electronics');
    const child = await createCategory(
      request(app),
      adminToken,
      'Mobiles',
      root._id,
    );

    expect(root.parent).toBeNull();
    expect(root.ancestors).toEqual([]);
    expect(child.parent).toBe(root._id);
    expect(child.ancestors).toEqual([root._id]);
    expect(child.slug).toBe('mobiles');
  });

  test('rejects a missing or invalid parent and duplicate sibling names', async () => {
    const invalidId = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Invalid Parent', parent: 'bad-id' });
    const missingParent = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Missing Parent', parent: '507f1f77bcf86cd799439011' });
    await createCategory(request(app), adminToken, 'Books');
    const duplicate = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'books' });

    expect(invalidId.status).toBe(400);
    expect(missingParent.status).toBe(404);
    expect(duplicate.status).toBe(409);
  });

  test('allows the same category name under different parents', async () => {
    const firstParent = await createCategory(
      request(app),
      adminToken,
      'First Parent',
    );
    const secondParent = await createCategory(
      request(app),
      adminToken,
      'Second Parent',
    );
    const firstCopy = await createCategory(
      request(app),
      adminToken,
      'Accessories',
      firstParent._id,
    );
    const secondCopy = await createCategory(
      request(app),
      adminToken,
      'Accessories',
      secondParent._id,
    );

    expect(firstCopy._id).not.toBe(secondCopy._id);
  });

  test('lists categories with pagination and returns one category with children', async () => {
    const root = await createCategory(request(app), adminToken, 'Electronics');
    const child = await createCategory(
      request(app),
      adminToken,
      'Mobiles',
      root._id,
    );

    const listResponse = await request(app).get(
      '/api/v1/categories?page=1&limit=1&search=elect',
    );
    const detailResponse = await request(app).get(
      `/api/v1/categories/${root._id}`,
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.meta).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
      pages: 1,
    });
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.category.children[0]._id).toBe(child._id);
  });

  test('returns the complete tree with one database query', async () => {
    const expected = await createCategoryTree(request(app), adminToken);
    const findCategories = jest.spyOn(Category, 'find');

    const response = await request(app).get('/api/v1/categories/tree');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Electronics');
    const mobiles = response.body.data[0].children.find(
      (category) => category.name === 'Mobiles',
    );
    const androidPhones = mobiles.children.find(
      (category) => category.name === 'Android Phones',
    );
    const samsung = androidPhones.children.find(
      (category) => category.name === 'Samsung',
    );
    expect(samsung._id).toBe(expected.samsung._id);
    expect(findCategories).toHaveBeenCalledTimes(1);
    findCategories.mockRestore();
  });

  test('hides inactive categories and their descendants from public reads', async () => {
    const root = await createCategory(request(app), adminToken, 'Electronics');
    const child = await createCategory(
      request(app),
      adminToken,
      'Mobiles',
      root._id,
    );

    const deactivate = await request(app)
      .patch(`/api/v1/categories/${root._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    const tree = await request(app).get('/api/v1/categories/tree');

    expect(deactivate.status).toBe(200);
    expect(tree.body.data).toEqual([]);
    expect(
      (await request(app).get(`/api/v1/categories/${child._id}`)).status,
    ).toBe(404);

    const adminTree = await request(app)
      .get('/api/v1/categories/tree')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminTree.body.data[0].name).toBe('Electronics');
    expect(adminTree.body.data[0].isActive).toBe(false);
  });
});

describe('category updates and deletion', () => {
  test('moves a subtree and rewrites every descendant ancestor path', async () => {
    const categories = await createCategoryTree(request(app), adminToken);

    const moveResponse = await request(app)
      .patch(`/api/v1/categories/${categories.mobiles._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent: categories.computers._id });

    const android = await Category.findById(
      categories.androidPhones._id,
    ).lean();
    const samsung = await Category.findById(categories.samsung._id).lean();
    const onePlus = await Category.findById(categories.onePlus._id).lean();
    const iPhones = await Category.findById(categories.iPhones._id).lean();

    expect(moveResponse.status).toBe(200);
    expect(android.ancestors.map(String)).toEqual([
      categories.electronics._id,
      categories.computers._id,
      categories.mobiles._id,
    ]);
    expect(samsung.ancestors.map(String)).toEqual([
      categories.electronics._id,
      categories.computers._id,
      categories.mobiles._id,
      categories.androidPhones._id,
    ]);
    expect(onePlus.ancestors.map(String)).toEqual(
      samsung.ancestors.map(String),
    );
    expect(iPhones.ancestors.map(String)).toEqual([
      categories.electronics._id,
      categories.computers._id,
      categories.mobiles._id,
    ]);
  });

  test('rejects self-parenting and moving a category under its descendant', async () => {
    const categories = await createCategoryTree(request(app), adminToken);

    const selfParent = await request(app)
      .patch(`/api/v1/categories/${categories.mobiles._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent: categories.mobiles._id });
    const moveUnderDescendant = await request(app)
      .patch(`/api/v1/categories/${categories.electronics._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent: categories.samsung._id });

    expect(selfParent.status).toBe(400);
    expect(moveUnderDescendant.status).toBe(400);
  });

  test('rolls back a subtree move when its new sibling name conflicts', async () => {
    const electronics = await createCategory(
      request(app),
      adminToken,
      'Electronics',
    );
    const mobiles = await createCategory(
      request(app),
      adminToken,
      'Mobiles',
      electronics._id,
    );
    const computers = await createCategory(
      request(app),
      adminToken,
      'Computers',
      electronics._id,
    );
    await createCategory(request(app), adminToken, 'Mobiles', computers._id);
    const androidPhones = await createCategory(
      request(app),
      adminToken,
      'Android Phones',
      mobiles._id,
    );

    const moveResponse = await request(app)
      .patch(`/api/v1/categories/${mobiles._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent: computers._id });
    const unchangedMobiles = await Category.findById(mobiles._id).lean();
    const unchangedAndroid = await Category.findById(androidPhones._id).lean();

    expect(moveResponse.status).toBe(409);
    expect(String(unchangedMobiles.parent)).toBe(electronics._id);
    expect(unchangedMobiles.ancestors.map(String)).toEqual([electronics._id]);
    expect(unchangedAndroid.ancestors.map(String)).toEqual([
      electronics._id,
      mobiles._id,
    ]);
  });

  test('rejects deleting a category with children and deletes a leaf', async () => {
    const root = await createCategory(request(app), adminToken, 'Electronics');
    const child = await createCategory(
      request(app),
      adminToken,
      'Mobiles',
      root._id,
    );

    const parentDelete = await request(app)
      .delete(`/api/v1/categories/${root._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const leafDelete = await request(app)
      .delete(`/api/v1/categories/${child._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(parentDelete.status).toBe(409);
    expect(leafDelete.status).toBe(204);
    expect(await Category.exists({ _id: child._id })).toBeNull();
  });

  test('returns 404 for a category that does not exist', async () => {
    const response = await request(app)
      .delete('/api/v1/categories/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });
});

describe('category permissions and validation', () => {
  test('requires an admin to create, update, and delete categories', async () => {
    const customerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Customer',
        email: 'category-customer@example.com',
        password: 'customer-password-123',
      });
    const root = await createCategory(request(app), adminToken, 'Electronics');
    const customerToken = customerResponse.body.data.token;

    const createResponse = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Books' });
    const updateResponse = await request(app)
      .patch(`/api/v1/categories/${root._id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Devices' });
    const deleteResponse = await request(app)
      .delete(`/api/v1/categories/${root._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(createResponse.status).toBe(403);
    expect(updateResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
  });

  test('rejects unauthenticated writes and malformed category ids', async () => {
    const unauthenticated = await request(app)
      .post('/api/v1/categories')
      .send({ name: 'Books' });
    const invalidId = await request(app).get('/api/v1/categories/not-an-id');

    expect(unauthenticated.status).toBe(401);
    expect(invalidId.status).toBe(400);
  });
});
