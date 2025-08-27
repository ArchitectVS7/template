import request from 'supertest';
import express from 'express';
import { healthRoutes } from '../routes/health';

const app = express();
app.use(express.json());
app.use('/api/health', healthRoutes);

describe('Health Check API', () => {
  describe('GET /api/health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body.status).toMatch(/^(healthy|warning|critical)$/);
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');

      // Check system information structure
      expect(response.body.system).toHaveProperty('nodeVersion');
      expect(response.body.system).toHaveProperty('platform');
      expect(response.body.system).toHaveProperty('arch');

      // Check database information structure
      expect(response.body.checks.database).toHaveProperty('status');
      expect(response.body.checks.database.status).toMatch(/^(healthy|warning|unhealthy)$/);
    });
  });
});