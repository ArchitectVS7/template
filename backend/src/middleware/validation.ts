import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import { AuthService } from '../services/auth';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'password';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => { valid: boolean; message?: string };
}

/**
 * Generic validation middleware factory
 */
export const validate = (rules: ValidationRule[], source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];
    const errors: Record<string, string> = {};

    for (const rule of rules) {
      const value = data[rule.field];
      const fieldName = rule.field;

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors[fieldName] = `${fieldName} is required`;
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors[fieldName] = `${fieldName} must be a string`;
              continue;
            }
            break;
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              errors[fieldName] = `${fieldName} must be a number`;
              continue;
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors[fieldName] = `${fieldName} must be a boolean`;
              continue;
            }
            break;
          case 'email':
            const emailValidation = AuthService.validateEmail(value);
            if (!emailValidation.valid) {
              errors[fieldName] = emailValidation.message || `${fieldName} must be a valid email`;
              continue;
            }
            break;
          case 'password':
            const passwordValidation = AuthService.validatePassword(value);
            if (!passwordValidation.valid) {
              errors[fieldName] = passwordValidation.message || `${fieldName} is not strong enough`;
              continue;
            }
            break;
        }
      }

      // String length validation
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors[fieldName] = `${fieldName} must be at least ${rule.minLength} characters long`;
          continue;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors[fieldName] = `${fieldName} must not exceed ${rule.maxLength} characters`;
          continue;
        }
      }

      // Number range validation
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors[fieldName] = `${fieldName} must be at least ${rule.min}`;
          continue;
        }
        if (rule.max !== undefined && value > rule.max) {
          errors[fieldName] = `${fieldName} must not exceed ${rule.max}`;
          continue;
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors[fieldName] = `${fieldName} format is invalid`;
        continue;
      }

      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (!customResult.valid) {
          errors[fieldName] = customResult.message || `${fieldName} is invalid`;
          continue;
        }
      }
    }

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      const error = createError('Validation failed', 422);
      (error as any).validationErrors = errors;
      return next(error);
    }

    next();
  };
};

/**
 * Pre-defined validation rules for common use cases
 */
export const validationRules = {
  // User registration validation
  register: [
    { field: 'email', required: true, type: 'email' as const },
    { field: 'password', required: true, type: 'password' as const },
    { field: 'firstName', required: false, type: 'string' as const, maxLength: 50 },
    { field: 'lastName', required: false, type: 'string' as const, maxLength: 50 },
  ],

  // User login validation
  login: [
    { field: 'email', required: true, type: 'email' as const },
    { field: 'password', required: true, type: 'string' as const, minLength: 1 },
  ],

  // Password change validation
  changePassword: [
    { field: 'currentPassword', required: true, type: 'string' as const },
    { field: 'newPassword', required: true, type: 'password' as const },
  ],

  // Profile update validation
  updateProfile: [
    { field: 'firstName', required: false, type: 'string' as const, maxLength: 50 },
    { field: 'lastName', required: false, type: 'string' as const, maxLength: 50 },
    { field: 'email', required: false, type: 'email' as const },
  ],

  // Configuration validation
  userConfig: [
    { field: 'key', required: true, type: 'string' as const, maxLength: 100 },
    { field: 'value', required: true, type: 'string' as const, maxLength: 1000 },
    { field: 'category', required: false, type: 'string' as const, maxLength: 50 },
  ],

  // Debug log validation
  debugLog: [
    { field: 'level', required: true, type: 'string' as const, 
      custom: (value: any) => ['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(value) 
        ? { valid: true } 
        : { valid: false, message: 'level must be DEBUG, INFO, WARN, or ERROR' }
    },
    { field: 'message', required: true, type: 'string' as const, maxLength: 1000 },
    { field: 'component', required: false, type: 'string' as const, maxLength: 100 },
  ],

  // Pagination validation
  pagination: [
    { field: 'limit', required: false, type: 'number' as const, min: 1, max: 100 },
    { field: 'offset', required: false, type: 'number' as const, min: 0 },
  ],
};

/**
 * Sanitize input by removing potentially dangerous characters
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove potentially dangerous HTML/script tags
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  };

  req.body = sanitize(req.body);
  // Note: req.query is read-only, so we skip sanitizing it for now
  // In production, consider using a different approach for query sanitization
  
  next();
};

/**
 * Middleware to validate JSON body exists
 */
export const requireJsonBody = (req: Request, res: Response, next: NextFunction) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return next(createError('Request body is required', 400));
  }
  next();
};

export default {
  validate,
  validationRules,
  sanitizeInput,
  requireJsonBody,
};