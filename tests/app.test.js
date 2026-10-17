const request = require('supertest');
const app = require('../src/app');

describe('application basics', () => {
  test('versioned health endpoint works without a database request', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    });
  });

  test('API routes share the versioned prefix', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({});

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  test('malformed JSON returns a client error in the shared response format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid JSON request body',
    });
  });
});
