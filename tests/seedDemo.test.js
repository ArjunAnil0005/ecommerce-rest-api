jest.mock('../src/config/db', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectFromDatabase: jest.fn().mockResolvedValue(undefined),
}));

const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const env = require('../src/config/env');
const db = require('./helpers/db');
const { seedDemoData } = require('../src/scripts/seedDemo');

beforeAll(async () => {
  await db.connect();
  await Promise.all([Category.init(), Product.init(), User.init()]);
}, 60000);

beforeEach(async () => {
  await db.clear();
  env.DEMO_CUSTOMER_NAME = 'Seeded Demo Customer';
  env.DEMO_CUSTOMER_EMAIL = 'seeded-demo@example.com';
  env.DEMO_CUSTOMER_PASSWORD = 'demo-customer-password-123';
});

afterAll(async () => {
  await db.disconnect();
}, 30000);

test('reuses existing demo records without overwriting them', async () => {
  await seedDemoData();
  const product = await Product.findOne({ sku: 'DEMO-PHONE-001' });
  product.stock = 4;
  await product.save();
  await User.updateOne(
    { email: env.DEMO_CUSTOMER_EMAIL },
    { name: 'Customer-changed-name' },
  );

  await seedDemoData();

  expect(await Category.countDocuments()).toBe(3);
  expect(await Product.countDocuments()).toBe(2);
  expect(await User.countDocuments()).toBe(1);
  expect((await Product.findOne({ sku: 'DEMO-PHONE-001' })).stock).toBe(4);
  expect((await User.findOne({ email: env.DEMO_CUSTOMER_EMAIL })).name).toBe(
    'Customer-changed-name',
  );
});

test('does not treat an existing admin account as the demo customer', async () => {
  await User.create({
    name: 'Existing Admin',
    email: env.DEMO_CUSTOMER_EMAIL,
    password: 'admin-password-123',
    role: 'admin',
  });

  await expect(seedDemoData()).rejects.toThrow(
    'already belongs to a non-customer account',
  );

  expect(await User.countDocuments()).toBe(1);
});
