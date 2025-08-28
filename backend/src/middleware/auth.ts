import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthService } from '../services/auth';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        firstName?: string | null;
        lastName?: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw createError('Access token required', 401);
    }

    // Verify token
    const payload = AuthService.verifyAccessToken(token);

    // Get fresh user data
    const user = await AuthService.getUserById(payload.userId);

    if (!user || !user.isActive) {
      throw createError('User not found or inactive', 401);
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    logger.error('Authentication failed:', {
      error: error instanceof Error ? error.message : error,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
    });

    next(error);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const authenticateOptional = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = AuthService.verifyAccessToken(token);
      const user = await AuthService.getUserById(payload.userId);

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch {
    // Don't fail for optional auth - just continue without user
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      logger.warn('Unauthorized role access attempt:', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.path,
        ip: req.ip,
      });

      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Admin role requirement
 */
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/**
 * Super admin role requirement
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * Self or admin access middleware
 * Allows users to access their own resources or admins to access any
 */
export const requireSelfOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    const targetUserId =
      req.params[userIdParam] || req.body.userId || req.query.userId;
    const isAdmin =
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.SUPER_ADMIN;
    const isSelf = req.user.id === targetUserId;

    if (!isSelf && !isAdmin) {
      logger.warn('Unauthorized resource access attempt:', {
        userId: req.user.id,
        targetUserId,
        userRole: req.user.role,
        endpoint: req.path,
        ip: req.ip,
      });

      return next(createError('Access denied', 403));
    }

    next();
  };
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = {
  // Strict rate limiting for login attempts
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Moderate rate limiting for registration
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 registrations per hour per IP
    message: 'Too many registration attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Lenient rate limiting for token refresh
  refresh: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 refresh attempts per window
    message: 'Too many token refresh attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },
};

export default {
  authenticateToken,
  authenticateOptional,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireSelfOrAdmin,
  authRateLimit,
};
