const { connectToDatabase, disconnectFromDatabase } = require('../config/db');
const env = require('../config/env');
const Category = require('../models/Category');
const Product = require('../models/Product');
const User = require('../models/User');

async function findOrCreateCategory(name, parent = null) {
  const ancestors = parent ? [...parent.ancestors, parent._id] : [];
  return Category.findOneAndUpdate(
    { name, parent },
    // Seed only missing rows; re-running this script must not reset user data.
    { $setOnInsert: { name, parent, ancestors } },
    {
      new: true,
      upsert: true,
      runValidators: true,
      collation: { locale: 'en', strength: 2 },
    },
  );
}

async function findOrCreateProduct(product) {
  return Product.findOneAndUpdate(
    { sku: product.sku },
    // Keep demo products stable after customers begin using the database.
    { $setOnInsert: product },
    { new: true, upsert: true, runValidators: true },
  );
}

async function seedDemoData() {
  if (
    !env.DEMO_CUSTOMER_NAME ||
    !env.DEMO_CUSTOMER_EMAIL ||
    !env.DEMO_CUSTOMER_PASSWORD
  ) {
    throw new Error(
      'Set DEMO_CUSTOMER_NAME, DEMO_CUSTOMER_EMAIL, and DEMO_CUSTOMER_PASSWORD before seeding',
    );
  }

  await connectToDatabase();
  try {
    await Promise.all([Category.init(), Product.init(), User.init()]);

    const electronics = await findOrCreateCategory('Electronics');
    const mobiles = await findOrCreateCategory('Mobiles', electronics);
    const accessories = await findOrCreateCategory('Accessories', electronics);

    await Promise.all([
      findOrCreateProduct({
        name: 'Demo Smartphone',
        sku: 'DEMO-PHONE-001',
        description: 'Sample smartphone for exploring the API',
        pricePaise: 2999900,
        salePricePaise: 2799900,
        effectivePricePaise: 2799900,
        stock: 10,
        category: mobiles._id,
      }),
      findOrCreateProduct({
        name: 'Demo Headphones',
        sku: 'DEMO-HEADPHONES-001',
        description: 'Sample wireless headphones for exploring the API',
        pricePaise: 799900,
        effectivePricePaise: 799900,
        stock: 20,
        category: accessories._id,
      }),
    ]);

    const email = env.DEMO_CUSTOMER_EMAIL.toLowerCase();
    const existingCustomer = await User.findOne({ email });
    if (!existingCustomer) {
      await User.create({
        name: env.DEMO_CUSTOMER_NAME,
        email,
        password: env.DEMO_CUSTOMER_PASSWORD,
        role: 'customer',
      });
    } else if (existingCustomer.role !== 'customer') {
      throw new Error(
        `Demo email ${email} already belongs to a non-customer account`,
      );
    }

    console.log('Demo categories, products, and customer are ready.');
  } finally {
    await disconnectFromDatabase();
  }
}

if (require.main === module) {
  seedDemoData().catch((error) => {
    console.error('Demo data seeding failed', error);
    process.exitCode = 1;
  });
}

module.exports = { seedDemoData };
