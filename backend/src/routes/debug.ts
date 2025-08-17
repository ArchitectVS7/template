import { Router, Request, Response } from 'express';
import { debugLogService } from '../services/debugLog';
import { LogLevel } from '@prisma/client';

const router = Router();

// Type for debug log query options
interface DebugLogOptions {
  limit: number;
  offset: number;
  level?: LogLevel;
  component?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Get debug logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const {
      limit = '100',
      offset = '0',
      level,
      component,
      userId,
      startDate,
      endDate
    } = req.query;

    const options: DebugLogOptions = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (level && Object.values(LogLevel).includes(level as LogLevel)) {
      options.level = level as LogLevel;
    }

    if (component) options.component = component as string;
    if (userId) options.userId = userId as string;
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);

    const logs = await debugLogService.getLogs(options);

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: logs.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug logs',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Get debug statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    if (!['1h', '24h', '7d'].includes(timeRange as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time range. Must be 1h, 24h, or 7d'
      });
    }

    const stats = await debugLogService.getStats(timeRange as '1h' | '24h' | '7d');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug statistics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Log a custom event
router.post('/log', async (req: Request, res: Response) => {
  try {
    const { level, message, component, metadata } = req.body;

    if (!level || !message) {
      return res.status(400).json({
        success: false,
        error: 'Level and message are required'
      });
    }

    if (!Object.values(LogLevel).includes(level)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid log level'
      });
    }

    await debugLogService.logEvent({
      level: level as LogLevel,
      message,
      component,
      userId: req.user?.id || null,
      metadata
    });

    res.json({
      success: true,
      message: 'Event logged successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to log event',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export { router as debugRoutes };