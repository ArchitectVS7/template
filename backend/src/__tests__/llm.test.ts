import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from './testApp';

const app = createTestApp();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./prisma/test-llm.db',
    },
  },
});

describe('LLM API Endpoints', () => {
  let authToken: string;
  let userId: string;
  let conversationId: string;

  beforeAll(async () => {
    // Clean up any existing data
    await prisma.session.deleteMany();
    await prisma.lLMMessage.deleteMany();
    await prisma.lLMConversation.deleteMany();
    await prisma.user.deleteMany();
  });

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = {
      email: 'llm-test@example.com',
      password: 'TestPassword123!',
      firstName: 'LLM',
      lastName: 'Test',
    };

    // Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    if (registerResponse.body.data?.tokens?.accessToken) {
      authToken = registerResponse.body.data.tokens.accessToken;
      userId = registerResponse.body.data.user.id;
    } else {
      throw new Error('Failed to get access token from registration response');
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      }).catch(() => {}); // Ignore errors during cleanup
    }
    await prisma.$disconnect();
  });

  describe('POST /api/llm/conversations', () => {
    it('should create a new conversation', async () => {
      const response = await request(app)
        .post('/api/llm/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Conversation',
          model: 'claude-3-haiku-20240307',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Conversation');
      expect(response.body.data.model).toBe('claude-3-haiku-20240307');

      conversationId = response.body.data.id;
    });

    it('should create conversation with default model when not specified', async () => {
      const response = await request(app)
        .post('/api/llm/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Default Model Test',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.model).toBe('claude-3-sonnet-20240229');
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/llm/conversations').send({
        title: 'Unauthorized Test',
      });

      expect(response.status).toBe(401);
    });

    it('should validate model name', async () => {
      const response = await request(app)
        .post('/api/llm/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Invalid Model Test',
          model: 'invalid-model',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/llm/conversations', () => {
    it('should get user conversations', async () => {
      const response = await request(app)
        .get('/api/llm/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/llm/conversations?limit=1&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/llm/conversations');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/llm/conversations/:id', () => {
    it('should get conversation with messages', async () => {
      const response = await request(app)
        .get(`/api/llm/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('conversation');
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data.conversation.id).toBe(conversationId);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/llm/conversations/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app).get(
        `/api/llm/conversations/${conversationId}`
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/llm/conversations/:id/messages', () => {
    beforeEach(() => {
      // Mock the Anthropic API since we can't make real API calls in tests
      jest.mock('@anthropic-ai/sdk');
    });

    it('should validate message content', async () => {
      const response = await request(app)
        .post(`/api/llm/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '', // Empty content should fail
        });

      expect(response.status).toBe(400);
    });

    it('should validate temperature parameter', async () => {
      const response = await request(app)
        .post(`/api/llm/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message',
          temperature: 3.0, // Invalid temperature
        });

      expect(response.status).toBe(400);
    });

    it('should validate maxTokens parameter', async () => {
      const response = await request(app)
        .post(`/api/llm/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message',
          maxTokens: 0, // Invalid max tokens
        });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/llm/conversations/${conversationId}/messages`)
        .send({
          content: 'Test message',
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .post('/api/llm/conversations/non-existent-id/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/llm/conversations/:id', () => {
    it('should update conversation title', async () => {
      const newTitle = 'Updated Test Conversation';
      const response = await request(app)
        .put(`/api/llm/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: newTitle,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(newTitle);
    });

    it('should validate title length', async () => {
      const response = await request(app)
        .put(`/api/llm/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '', // Empty title should fail
        });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/llm/conversations/${conversationId}`)
        .send({
          title: 'New Title',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/llm/conversations/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app).delete(
        `/api/llm/conversations/${conversationId}`
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .delete('/api/llm/conversations/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should delete conversation successfully', async () => {
      const response = await request(app)
        .delete(`/api/llm/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/llm/usage', () => {
    it('should get user usage statistics', async () => {
      const response = await request(app)
        .get('/api/llm/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalConversations');
      expect(response.body.data).toHaveProperty('totalMessages');
      expect(response.body.data).toHaveProperty('totalTokens');
      expect(response.body.data).toHaveProperty('totalCost');
    });

    it('should support custom time period', async () => {
      const response = await request(app)
        .get('/api/llm/usage?days=7')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe('7 days');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/llm/usage');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/llm/models', () => {
    it('should get available models', async () => {
      const response = await request(app)
        .get('/api/llm/models')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check model structure
      const model = response.body.data[0];
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('description');
      expect(model).toHaveProperty('inputCost');
      expect(model).toHaveProperty('outputCost');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/llm/models');

      expect(response.status).toBe(401);
    });
  });
});
