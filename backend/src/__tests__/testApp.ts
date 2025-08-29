import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import middleware and routes
import { errorHandler } from '../middleware/errorHandler';
import { authRoutes } from '../routes/auth';
import { healthRoutes } from '../routes/health';
import { debugRoutes } from '../routes/debug';
import { userRoutes } from '../routes/users';
import llmRoutes from '../routes/llm';

// Create test app without starting server
export function createTestApp() {
  const app = express();

  // Rate limiting (more permissive for tests)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Much higher limit for tests
    message: 'Too many requests from this IP, please try again later.',
  });

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for tests
  app.use(cors({ origin: true, credentials: true })); // Allow all origins for tests
  app.use(limiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/debug', debugRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/llm', llmRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}