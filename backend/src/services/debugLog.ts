import { LogLevel, Prisma } from '@prisma/client';
import { db } from './database';
import { logger } from '../utils/logger';

interface LogRequestData {
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  userId?: string | null;
  metadata?: Prisma.JsonValue;
}

interface LogEventData {
  level: LogLevel;
  message: string;
  component?: string;
  userId?: string | null;
  metadata?: Prisma.JsonValue;
}

class DebugLogService {
  async logRequest(data: LogRequestData): Promise<void> {
    try {
      await db.prisma.debugLog.create({
        data: {
          level: data.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO,
          message: `${data.method} ${data.endpoint} - ${data.statusCode}`,
          component: 'API',
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          duration: data.duration,
          userId: data.userId,
          metadata: data.metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      logger.error('Failed to log request to database:', error);
    }
  }

  async logEvent(data: LogEventData): Promise<void> {
    try {
      await db.prisma.debugLog.create({
        data: {
          level: data.level,
          message: data.message,
          component: data.component,
          userId: data.userId,
          metadata: data.metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      logger.error('Failed to log event to database:', error);
    }
  }

  async getLogs(
    options: {
      limit?: number;
      offset?: number;
      level?: LogLevel;
      component?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const {
      limit = 100,
      offset = 0,
      level,
      component,
      userId,
      startDate,
      endDate,
    } = options;

    const where: Prisma.DebugLogWhereInput = {};

    if (level) where.level = level;
    if (component) where.component = component;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return await db.prisma.debugLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getStats(timeRange: '1h' | '24h' | '7d' = '24h') {
    const now = new Date();
    const timeMap = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    };

    const startTime = timeMap[timeRange];

    const [totalLogs, errorCount, warnCount, componentStats, avgResponseTime] =
      await Promise.all([
        // Total logs
        db.prisma.debugLog.count({
          where: { createdAt: { gte: startTime } },
        }),

        // Error count
        db.prisma.debugLog.count({
          where: {
            level: LogLevel.ERROR,
            createdAt: { gte: startTime },
          },
        }),

        // Warning count
        db.prisma.debugLog.count({
          where: {
            level: LogLevel.WARN,
            createdAt: { gte: startTime },
          },
        }),

        // Component stats
        db.prisma.debugLog.groupBy({
          by: ['component'],
          where: { createdAt: { gte: startTime } },
          _count: { component: true },
        }),

        // Average response time
        db.prisma.debugLog.aggregate({
          where: {
            duration: { not: null },
            createdAt: { gte: startTime },
          },
          _avg: { duration: true },
        }),
      ]);

    return {
      timeRange,
      totalLogs,
      errorCount,
      warnCount,
      componentStats,
      avgResponseTime: avgResponseTime._avg.duration || 0,
    };
  }
}

export const debugLogService = new DebugLogService();
export default debugLogService;
