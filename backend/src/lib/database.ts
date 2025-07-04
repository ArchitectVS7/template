import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client to prevent multiple instances
declare global {
  var __prisma: PrismaClient | undefined;
}

// Database connection configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Use global variable in development to prevent multiple instances during hot reloads
const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Connection pool configuration and health check
export const initializeDatabase = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('🗄️  Database connected successfully');

    // Health check query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database health check passed');

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('🗄️  Database disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
};

// Database health check utility
export const checkDatabaseHealth = async () => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    return {
      status: 'healthy',
      responseTime: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};

// Export the Prisma client instance
export { prisma };
export default prisma;
