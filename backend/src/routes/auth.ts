import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/auth';
import { authenticateToken, authRateLimit } from '../middleware/auth';
import { validate, validationRules, sanitizeInput, requireJsonBody } from '../middleware/validation';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { debugLogService } from '../services/debugLog';
import { LogLevel } from '@prisma/client';

const router = Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// User registration
router.post(
  '/register',
  rateLimit(authRateLimit.register),
  requireJsonBody,
  validate(validationRules.register),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await AuthService.registerUser({
        email,
        password,
        firstName,
        lastName,
      });

      // Log successful registration
      await debugLogService.logEvent({
        level: LogLevel.INFO,
        message: `User registered: ${email}`,
        component: 'AUTH',
        userId: result.user.id,
        metadata: {
          email: result.user.email,
          role: result.user.role,
          ip: req.ip,
        },
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// User login
router.post(
  '/login',
  rateLimit(authRateLimit.login),
  requireJsonBody,
  validate(validationRules.login),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;

      const result = await AuthService.loginUser({
        email,
        password,
        userAgent,
        ipAddress,
      });

      // Log successful login
      await debugLogService.logEvent({
        level: LogLevel.INFO,
        message: `User logged in: ${email}`,
        component: 'AUTH',
        userId: result.user.id,
        metadata: {
          email: result.user.email,
          ip: ipAddress,
          userAgent,
        },
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      // Log failed login attempt
      await debugLogService.logEvent({
        level: LogLevel.WARN,
        message: `Failed login attempt: ${req.body.email || 'unknown'}`,
        component: 'AUTH',
        metadata: {
          email: req.body.email,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      }).catch(() => {}); // Don't let logging errors affect the response
      
      next(error);
    }
  }
);

// Token refresh
router.post(
  '/refresh',
  rateLimit(authRateLimit.refresh),
  requireJsonBody,
  validate([
    { field: 'refreshToken', required: true, type: 'string' },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      const tokens = await AuthService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
      });
    } catch (error) {
      next(error);
    }
  }
);

// User logout
router.post(
  '/logout',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body.refreshToken;
      
      await AuthService.logoutUser(req.user!.id, refreshToken);

      // Log successful logout
      await debugLogService.logEvent({
        level: LogLevel.INFO,
        message: `User logged out: ${req.user!.email}`,
        component: 'AUTH',
        userId: req.user!.id,
        metadata: {
          email: req.user!.email,
          ip: req.ip,
        },
      });

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Logout from all devices
router.post(
  '/logout-all',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await AuthService.logoutUser(req.user!.id); // No refresh token = logout all

      // Log successful logout from all devices
      await debugLogService.logEvent({
        level: LogLevel.INFO,
        message: `User logged out from all devices: ${req.user!.email}`,
        component: 'AUTH',
        userId: req.user!.id,
        metadata: {
          email: req.user!.email,
          ip: req.ip,
        },
      });

      res.json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user profile
router.get(
  '/me',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // User is already attached to request by authenticateToken middleware
      const user = req.user!;

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user profile
router.put(
  '/me',
  authenticateToken,
  requireJsonBody,
  validate(validationRules.updateProfile),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email } = req.body;
      const userId = req.user!.id;

      // Check if email is being changed and if it's already in use
      if (email && email !== req.user!.email) {
        const existingUser = await AuthService.getUserById(userId);
        if (existingUser) {
          throw createError('Email already in use', 409);
        }
      }

      // Update user profile
      const updatedUser = await AuthService.updateUserProfile(userId, {
        firstName,
        lastName,
        email: email?.toLowerCase(),
      });

      // Log profile update
      await debugLogService.logEvent({
        level: LogLevel.INFO,
        message: `Profile updated: ${req.user!.email}`,
        component: 'AUTH',
        userId,
        metadata: {
          changes: { firstName, lastName, email },
          ip: req.ip,
        },
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Change password
router.put(
  '/change-password',
  authenticateToken,
  requireJsonBody,
  validate(validationRules.changePassword),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      await AuthService.changePassword(userId, currentPassword, newPassword);

      // Log password change
      await debugLogService.logEvent({
        level: LogLevel.INFO,
        message: `Password changed: ${req.user!.email}`,
        component: 'AUTH',
        userId,
        metadata: {
          ip: req.ip,
        },
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user sessions
router.get(
  '/sessions',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await AuthService.getUserSessions(req.user!.id);

      res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as authRoutes };