const request = require('supertest');
const app = require('../src/app');
const errorHandler = require('../src/middleware/errorHandler');

function getErrorResponse(error) {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  errorHandler(error, {}, response, jest.fn());
  return {
    status: response.status.mock.calls[0][0],
    body: response.json.mock.calls[0][0],
  };
}

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

  test('maps database errors to clear client responses', () => {
    const duplicate = getErrorResponse(
      Object.assign(new Error(), { code: 11000 }),
    );
    const invalidId = getErrorResponse(
      Object.assign(new Error(), { name: 'CastError' }),
    );
    const invalidModel = getErrorResponse(
      Object.assign(new Error(), {
        name: 'ValidationError',
        errors: {
          name: { path: 'name', message: 'Name is required' },
        },
      }),
    );

    expect(duplicate).toMatchObject({
      status: 409,
      body: {
        success: false,
        message: 'A record with this value already exists',
      },
    });
    expect(invalidId).toMatchObject({
      status: 400,
      body: { success: false, message: 'Invalid database identifier' },
    });
    expect(invalidModel).toMatchObject({
      status: 422,
      body: {
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'name', message: 'Name is required' }],
      },
    });
  });
});
