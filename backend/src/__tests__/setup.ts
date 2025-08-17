import { PrismaClient } from '@prisma/client';

// Global test setup
let prisma: PrismaClient;

// Initialize Prisma client for testing
export const setupPrisma = () => {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./test.db'
      }
    }
  });
  return prisma;
};

// Clean up function
export const teardownPrisma = async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
};

export { prisma };