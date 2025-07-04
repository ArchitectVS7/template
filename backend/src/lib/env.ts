import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable schema with validation
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Frontend URL
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL must be a valid URL')
    .default('http://localhost:5173'),

  // LLM API Keys (Optional)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),

  // Email Configuration (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // File Upload
  UPLOAD_MAX_SIZE: z.coerce.number().int().positive().default(5242880), // 5MB
  UPLOAD_ALLOWED_TYPES: z
    .string()
    .default('image/jpeg,image/png,image/gif,application/pdf'),

  // Redis (Optional)
  REDIS_URL: z.string().url().optional(),

  // Monitoring (Optional)
  SENTRY_DSN: z.string().url().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Session Configuration
  SESSION_TIMEOUT_HOURS: z.coerce.number().int().positive().default(24),
  REFRESH_TOKEN_TIMEOUT_DAYS: z.coerce.number().int().positive().default(30),
});

// Validate and parse environment variables
const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(
        err => `${err.path.join('.')}: ${err.message}`
      );
      console.error('❌ Environment validation failed:');
      missingVars.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
    throw error;
  }
};

// Export validated environment configuration
export const env = validateEnv();

// Helper functions for environment checks
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
export const isTest = () => env.NODE_ENV === 'test';

// Helper function to check if LLM features are available
export const hasLLMKeys = () => {
  return !!(
    env.ANTHROPIC_API_KEY ||
    env.OPENAI_API_KEY ||
    env.PERPLEXITY_API_KEY ||
    env.GOOGLE_API_KEY ||
    env.MISTRAL_API_KEY
  );
};

// Helper function to check if email is configured
export const hasEmailConfig = () => {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
};

// Helper function to check if Redis is configured
export const hasRedisConfig = () => {
  return !!env.REDIS_URL;
};

// Helper function to get allowed file types as array
export const getAllowedFileTypes = () => {
  return env.UPLOAD_ALLOWED_TYPES.split(',').map(type => type.trim());
};

// Configuration summary for logging
export const getConfigSummary = () => {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    database: !!env.DATABASE_URL,
    frontend: env.FRONTEND_URL,
    llmKeys: hasLLMKeys(),
    email: hasEmailConfig(),
    redis: hasRedisConfig(),
    sentry: !!env.SENTRY_DSN,
  };
};
