import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import middleware and routes
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { debugRoutes } from './routes/debug';
import { userRoutes } from './routes/users';
import llmRoutes from './routes/llm';
import { setupWebSocket } from './services/websocket';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || process.env.RATE_LIMIT_MAX || '100'
  ), // support both env names
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Enable request logging if env flag is true (avoids noisy logs in prod/tests)
if (
  (process.env.ENABLE_REQUEST_LOGGING || 'true').toString().toLowerCase() ===
  'true'
) {
  app.use(requestLogger);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/users', userRoutes);
app.use('/api/llm', llmRoutes);

// WebSocket setup
setupWebSocket(io);

// Error handling middleware (must be last)
app.use(errorHandler);

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(
    `📊 Health check available at: http://localhost:${PORT}/api/health`
  );
  logger.info(
    `🔒 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`
  );
});

export { app, server, io };
