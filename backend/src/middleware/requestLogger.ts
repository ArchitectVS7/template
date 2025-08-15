import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { debugLogService } from '../services/debugLog';

export const requestLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Capture the original end function
  const originalEnd = res.end;

  // Override the end function to log when response is sent
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log request details
    const logData = {
      method: req.method,
      url: req.url,
      statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length')
    };

    // Log to winston
    logger.info('HTTP Request', logData);

    // Log to debug system (async, don't wait)
    debugLogService.logRequest({
      method: req.method,
      endpoint: req.url,
      statusCode,
      duration,
      userId: (req as any).user?.id || null,
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    }).catch((err: any) => {
      logger.error('Failed to log debug request:', err);
    });

    // Call the original end function
    return (originalEnd as any).apply(res, args);
  } as any;

  next();
};