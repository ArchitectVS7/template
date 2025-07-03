import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Backend API', () => {
  it('should respond to health check', async () => {
    const response = await request(app).get('/api/health');

    // Health check might return 200 or 503 depending on database connectivity
    expect([200, 503]).toContain(response.status);
    expect(response.body).toMatchObject({
      status: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should respond to root endpoint', async () => {
    const response = await request(app).get('/').expect(200);

    expect(response.body).toEqual({
      message: 'Web App Template API',
      version: '1.0.0',
    });
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route').expect(404);

    expect(response.body).toEqual({
      message: 'Route not found',
    });
  });
});
