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
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('services');

      // Check system information structure
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.system).toHaveProperty('platform');

      // Check database information structure
      expect(response.body.database).toHaveProperty('status');
      expect(response.body.database.status).toMatch(/^(connected|disconnected|error)$/);
    });
  });
});