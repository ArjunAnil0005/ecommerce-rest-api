const { connectToDatabase, disconnectFromDatabase } = require('../config/db');
const env = require('../config/env');
const User = require('../models/User');

// Reject common placeholder passwords in production.
const PLACEHOLDER_ADMIN_PASSWORDS = new Set([
  'change-me-admin-password',
  'changeme',
  'adminpassword',
  'testpassword',
  'secret123456',
]);

// Ensure that the ADMIN_PASSWORD environment variable is not a placeholder value when running in production. If it is, throw an error to prevent seeding an insecure admin account.
function assertProductionSafePassword() {
  if (env.NODE_ENV !== 'production') return;

  const password = env.ADMIN_PASSWORD.toLowerCase();
  const looksLikePlaceholder =
    PLACEHOLDER_ADMIN_PASSWORDS.has(password) ||
    password.includes('change-me') ||
    password.includes('changeme');

  if (looksLikePlaceholder) {
    throw new Error(
      'Refusing to seed a placeholder ADMIN_PASSWORD while NODE_ENV=production',
    );
  }
}

// Seed an admin user in the database using the ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD environment variables. This function checks if an admin user already exists with the specified email and creates a new admin user if not. It also ensures that the password is not a placeholder value in production.
async function seedAdmin() {
  if (!env.ADMIN_NAME || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required');
  }

  assertProductionSafePassword();
  await connectToDatabase();
  try {
    const email = env.ADMIN_EMAIL.toLowerCase();
    if (await User.exists({ email })) {
      throw new Error(`A user with ${email} already exists`);
    }

    await User.create({
      name: env.ADMIN_NAME,
      email,
      password: env.ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log(`Admin account created: ${email}`);
  } finally {
    await disconnectFromDatabase();
  }
}

// Execute the seedAdmin function and handle any errors that occur during the seeding process. If an error occurs, log it to the console and set the process exit code to 1 to indicate failure.
seedAdmin().catch((error) => {
  console.error('Admin seeding failed', error);
  process.exitCode = 1;
});
