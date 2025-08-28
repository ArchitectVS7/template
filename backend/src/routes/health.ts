import { Router, Request, Response } from 'express';
import { db } from '../services/database';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Check database connectivity
    const dbHealth = await db.healthCheck();

    const totalTime = Date.now() - startTime;

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      responseTime: totalTime,
      environment: process.env.NODE_ENV || 'development',
    };

    // If database is unhealthy, mark overall status as warning
    if (dbHealth.status !== 'healthy') {
      health.status = 'warning';
    }

    // Log health check
    await db.prisma.systemHealth
      .create({
        data: {
          component: 'API',
          status: health.status,
          message: `Health check completed`,
          responseTime: totalTime,
          metadata: {
            database: dbHealth,
            memory: JSON.parse(JSON.stringify(health.memory)),
            uptime: health.uptime,
          },
        },
      })
      .catch((err: unknown) => {
        logger.error('Failed to log health check:', err);
      });

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Detailed health check for monitoring
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Run multiple health checks
    const [dbHealth, recentLogs] = await Promise.all([
      db.healthCheck(),
      // Get recent system health records
      db.prisma.systemHealth
        .findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          where: {
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
            },
          },
        })
        .catch(() => []),
    ]);

    const totalTime = Date.now() - startTime;

    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        api: {
          status: 'healthy',
          responseTime: totalTime,
        },
        memory: {
          status:
            process.memoryUsage().heapUsed / process.memoryUsage().heapTotal <
            0.9
              ? 'healthy'
              : 'warning',
          usage: process.memoryUsage(),
        },
      },
      recentHealth: recentLogs,
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    // Determine overall status
    const checks = Object.values(detailedHealth.checks);
    if (checks.some(check => check.status === 'unhealthy')) {
      detailedHealth.status = 'unhealthy';
    } else if (checks.some(check => check.status === 'warning')) {
      detailedHealth.status = 'warning';
    }

    res.json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed:', error);

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

export { router as healthRoutes };
