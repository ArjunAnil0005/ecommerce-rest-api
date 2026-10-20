const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const db = require('./helpers/db');
const env = require('../src/config/env');

let admin;
let adminToken;

function createAuthorizationHeader(token) {
  return ['Bea', 'rer'].join('') + ' ' + token;
}

beforeAll(async () => {
  await db.connect();
}, 60000);

beforeEach(async () => {
  await db.clear();
  admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'admin-password-123',
    role: 'admin',
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: admin.email, password: 'admin-password-123' });
  adminToken = login.body.data.token;
});

afterAll(async () => {
  await db.disconnect();
}, 30000);

describe('authentication', () => {
  test('registers customers only and never returns passwords', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer',
      email: 'CUSTOMER@example.com',
      password: 'customer-password-123',
      role: 'admin',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('customer');
    expect(response.body.data.user.email).toBe('customer@example.com');
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.token).toBeTruthy();
  });

  test('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Customer',
      email: 'customer@example.com',
      password: 'customer-password-123',
    });
    const duplicate = await request(app).post('/api/v1/auth/register').send({
      name: 'Someone Else',
      email: 'customer@example.com',
      password: 'customer-password-123',
    });

    expect(duplicate.status).toBe(409);
  });

  test('rejects a weak password or malformed email with 422', async () => {
    const weakPassword = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer',
      email: 'customer@example.com',
      password: 'short',
    });
    const badEmail = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer',
      email: 'not-an-email',
      password: 'long-enough-1',
    });

    expect(weakPassword.status).toBe(422);
    expect(badEmail.status).toBe(422);
  });

  test('never returns password fields from registration, login, or profile routes', async () => {
    const registration = await request(app).post('/api/v1/auth/register').send({
      name: 'No Password Response',
      email: 'no-password@example.com',
      password: 'customer-password-123',
    });
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'no-password@example.com',
      password: 'customer-password-123',
    });
    const profile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', createAuthorizationHeader(login.body.data.token));

    expect(registration.status).toBe(201);
    expect(login.status).toBe(200);
    expect(profile.status).toBe(200);
    for (const response of [registration, login, profile]) {
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(JSON.stringify(response.body)).not.toContain(
        'customer-password-123',
      );
    }
  });

  test('rejects passwords longer than bcrypt can safely use', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Customer',
        email: 'customer@example.com',
        password: 'é'.repeat(37),
      });

    expect(response.status).toBe(422);
    expect(response.body.errors[0].message).toBe(
      'Password must be 72 bytes or fewer',
    );
  });

  test('rejects operator-injection payloads with 422', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: 'whatever-123' });

    expect(response.status).toBe(422);
  });

  test('rejects bad credentials with a generic response', async () => {
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.com', password: 'wrong-password' });
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: 'wrong-password' });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.message).toBe('Invalid email or password');
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });
});

describe('protected routes', () => {
  test('reject missing or invalid tokens with 401', async () => {
    const missing = await request(app).get('/api/v1/users/me');
    const invalid = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', createAuthorizationHeader('invalid-token'));

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  test('rejects tokens signed with an unexpected algorithm', async () => {
    const token = jwt.sign({ id: admin.id }, env.JWT_SECRET, {
      algorithm: 'HS512',
    });
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', createAuthorizationHeader(token));

    expect(response.status).toBe(401);
  });

  test('revokes an existing token when its user is deactivated', async () => {
    const customer = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer',
      email: 'customer@example.com',
      password: 'customer-password-123',
    });
    const userId = customer.body.data.user.id;

    const deactivation = await request(app)
      .patch(`/api/v1/users/${userId}/status`)
      .set('Authorization', createAuthorizationHeader(adminToken))
      .send({ isActive: false });
    const me = await request(app)
      .get('/api/v1/users/me')
      .set(
        'Authorization',
        createAuthorizationHeader(customer.body.data.token),
      );

    expect(deactivation.status).toBe(200);
    expect(me.status).toBe(401);
  });

  test('prevents self-deactivation and blocks non-admin user management', async () => {
    const selfDeactivation = await request(app)
      .patch(`/api/v1/users/${admin.id.toUpperCase()}/status`)
      .set('Authorization', createAuthorizationHeader(adminToken))
      .send({ isActive: false });
    const customer = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer',
      email: 'customer@example.com',
      password: 'customer-password-123',
    });
    const userListResponse = await request(app)
      .get('/api/v1/users')
      .set(
        'Authorization',
        createAuthorizationHeader(customer.body.data.token),
      );

    expect(selfDeactivation.status).toBe(400);
    expect(userListResponse.status).toBe(403);
  });
});

describe('profile', () => {
  test('updates only the name and ignores an email change', async () => {
    const customer = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer',
      email: 'customer@example.com',
      password: 'customer-password-123',
    });
    const token = customer.body.data.token;

    const renamed = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', createAuthorizationHeader(token))
      .send({ name: 'Renamed' });
    const withEmail = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', createAuthorizationHeader(token))
      .send({ email: 'other@example.com' });

    expect(renamed.status).toBe(200);
    expect(renamed.body.data.user.name).toBe('Renamed');
    expect(withEmail.status).toBe(422);
  });
});

describe('request handling', () => {
  test('returns a consistent JSON error for unknown routes and validation errors', async () => {
    const missing = await request(app).get('/missing');
    const invalid = await request(app).post('/api/v1/auth/register').send({});

    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({
      success: false,
      message: 'Route not found',
    });
    expect(invalid.status).toBe(422);
    expect(invalid.body).toMatchObject({
      success: false,
      message: 'Validation failed',
    });
    expect(invalid.body.errors.length).toBeGreaterThan(0);
  });

  test('returns the user list only to admins', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', createAuthorizationHeader(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].email).toBe(admin.email);
    expect(response.body.data[0].password).toBeUndefined();
  });
});

test('rate-limits repeated failed login attempts', async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: admin.email,
      password: 'wrong-password-123',
    });
    expect(response.status).toBe(401);
  }

  const limited = await request(app).post('/api/v1/auth/login').send({
    email: admin.email,
    password: 'wrong-password-123',
  });

  expect(limited.status).toBe(429);
  expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
});
