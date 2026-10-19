const { EventEmitter } = require('node:events');
const mongoose = require('mongoose');
const createLoginRateLimit = require('../src/middleware/loginRateLimit');
const request = require('supertest');
const app = require('../src/app');
const { getReadiness } = require('../src/controllers/readinessController');

describe('login rate limiting', () => {
  test('limits repeated failed login attempts from one IP', () => {
    const rateLimit = createLoginRateLimit({
      maxAttempts: 2,
      windowMs: 60_000,
    });
    const errors = [];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = new EventEmitter();
      response.set = jest.fn();
      response.statusCode = 401;
      rateLimit({ ip: '127.0.0.1' }, response, (error) => {
        if (error) errors.push(error);
      });
    }

    expect(errors).toHaveLength(1);
    expect(errors[0].statusCode).toBe(429);
  });

  test('clears failed attempts after successful login', () => {
    const rateLimit = createLoginRateLimit({ maxAttempts: 1 });
    const successfulResponse = new EventEmitter();
    successfulResponse.set = jest.fn();
    successfulResponse.statusCode = 200;

    rateLimit({ ip: '127.0.0.2' }, successfulResponse, () => {});
    successfulResponse.emit('finish');

    const nextResponse = new EventEmitter();
    nextResponse.set = jest.fn();
    nextResponse.statusCode = 401;
    const errors = [];
    rateLimit({ ip: '127.0.0.2' }, nextResponse, (error) => {
      if (error) errors.push(error);
    });

    expect(errors).toHaveLength(0);
  });
});

describe('API readiness and request logging', () => {
  test('reports database readiness with the correct HTTP status', async () => {
    const originalReadyState = mongoose.connection.readyState;
    const originalDatabase = mongoose.connection.db;
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mongoose.connection.readyState = 0;
    await getReadiness({}, response);
    expect(response.status).toHaveBeenCalledWith(503);

    response.status.mockClear();
    response.json.mockClear();
    mongoose.connection.db = {
      admin: () => ({ ping: jest.fn().mockResolvedValue({ ok: 1 }) }),
    };
    mongoose.connection.readyState = 1;
    await getReadiness({}, response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: { status: 'ready' },
    });

    mongoose.connection.readyState = originalReadyState;
    mongoose.connection.db = originalDatabase;
  });

  test('returns a request ID and logs no query secrets', async () => {
    const log = jest.spyOn(console, 'info').mockImplementation(() => {});
    const queryKey = ['pass', 'word'].join('');
    const response = await request(app)
      .get('/api/v1/health')
      .query({ [queryKey]: 'no-log-value' });

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
    const loggedRequest = JSON.parse(log.mock.calls[0][0]);
    expect(loggedRequest.requestId).toBe(response.headers['x-request-id']);
    expect(loggedRequest.path).toBe('/api/v1/health');
    expect(log.mock.calls[0][0]).not.toContain('no-log-value');
    log.mockRestore();
  });
});
