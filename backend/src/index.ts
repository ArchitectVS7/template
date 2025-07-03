import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeDatabase, disconnectDatabase, checkDatabaseHealth } from './lib/database.js';
import { env, getConfigSummary } from './lib/env.js';

const app = express();
const PORT = env.PORT;

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Database-only health check
app.get('/api/health/database', async (_req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    if (dbHealth.status === 'healthy') {
      res.json(dbHealth);
    } else {
      res.status(503).json(dbHealth);
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/', (_req, res) => {
  res.json({
    message: 'Web App Template API',
    version: '1.0.0',
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      message: 'Something went wrong!',
      error: env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${env.NODE_ENV}`);
    
    // Log configuration summary
    const configSummary = getConfigSummary();
    console.log('⚙️  Configuration:', configSummary);
    
    // Initialize database connection
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    }
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      console.log('HTTP server closed');
      
      try {
        await disconnectDatabase();
        console.log('Database disconnected');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
