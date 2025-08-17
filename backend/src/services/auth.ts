import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './database';
import { User, UserRole } from '@prisma/client';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret';
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private static readonly BCRYPT_ROUNDS = 12;

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT tokens (access + refresh)
   */
  static generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'ai-dev-mvp',
      audience: 'ai-dev-mvp-users',
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: payload.userId },
      this.JWT_REFRESH_SECRET,
      {
        expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        issuer: 'ai-dev-mvp',
        audience: 'ai-dev-mvp-users',
      } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      logger.error('JWT verification failed:', error);
      throw createError('Invalid or expired token', 401);
    }
  }

  /**
   * Verify JWT refresh token
   */
  static verifyRefreshToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, this.JWT_REFRESH_SECRET) as { userId: string };
    } catch (error) {
      logger.error('Refresh token verification failed:', error);
      throw createError('Invalid or expired refresh token', 401);
    }
  }

  /**
   * Register new user
   */
  static async registerUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ user: Omit<User, 'password'>; tokens: AuthTokens }> {
    const { email, password, firstName, lastName } = data;

    // Check if user already exists
    const existingUser = await db.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw createError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await db.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.USER, // Default role
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session record
    await this.createSession(user.id, tokens.refreshToken);

    logger.info('User registered successfully:', { userId: user.id, email: user.email });

    return { user, tokens };
  }

  /**
   * Login user
   */
  static async loginUser(data: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ user: Omit<User, 'password'>; tokens: AuthTokens }> {
    const { email, password: userPassword, userAgent, ipAddress } = data;

    // Find user
    const user = await db.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw createError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(userPassword, user.password);
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session record
    await this.createSession(user.id, tokens.refreshToken, userAgent, ipAddress);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    logger.info('User logged in successfully:', { 
      userId: user.id, 
      email: user.email,
      ip: ipAddress 
    });

    return { user: userWithoutPassword, tokens };
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    this.verifyRefreshToken(refreshToken);

    // Check if session exists and is active
    const session = await db.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || !session.isActive || !session.user.isActive) {
      throw createError('Invalid refresh token', 401);
    }

    // Check if token is expired
    if (session.expiresAt < new Date()) {
      await db.prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      throw createError('Refresh token expired', 401);
    }

    // Generate new tokens
    const tokens = this.generateTokens({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    // Update session with new refresh token
    await db.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        updatedAt: new Date(),
      },
    });

    return tokens;
  }

  /**
   * Logout user (invalidate session)
   */
  static async logoutUser(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Invalidate specific session
      await db.prisma.session.updateMany({
        where: {
          userId,
          refreshToken,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    } else {
      // Invalidate all sessions for user
      await db.prisma.session.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    }

    logger.info('User logged out:', { userId });
  }

  /**
   * Create session record
   */
  private static async createSession(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await db.prisma.session.create({
      data: {
        userId,
        token: refreshToken, // Store refresh token as session token
        refreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });
  }

  /**
   * Get user by ID (for middleware)
   */
  static async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
    }

    return { valid: true };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { valid: boolean; message?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
    }
  ): Promise<Omit<User, 'password'>> {
    const updatedUser = await db.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('User profile updated:', { userId, changes: data });

    return updatedUser;
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user with password
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw createError('Current password is incorrect', 401);
    }

    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw createError(passwordValidation.message || 'Invalid password', 400);
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await db.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // Invalidate all sessions except current one might be harsh, but it's more secure
    await db.prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    logger.info('User password changed:', { userId });
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string): Promise<Array<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
    isActive: boolean;
    isCurrent?: boolean;
  }>> {
    const sessions = await db.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
        isActive: true,
      },
    });

    return sessions.map(session => ({
      ...session,
      isCurrent: false, // This would need to be determined by comparing with current session
    }));
  }

  /**
   * Revoke session
   */
  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    await db.prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    logger.info('Session revoked:', { userId, sessionId });
  }
}

export default AuthService;