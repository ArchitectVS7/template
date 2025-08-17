import { PrismaClient, UserRole, LogLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.SUPER_ADMIN,
    },
  });

  // Create test user
  const testHashedPassword = await bcrypt.hash('test123', 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: testHashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
    },
  });

  // Create sample configurations for admin user
  const adminConfigs = [
    { key: 'theme', value: 'dark', category: 'appearance' },
    { key: 'debugLevel', value: 'info', category: 'debug' },
    { key: 'enableNotifications', value: 'true', category: 'notifications' },
    { key: 'autoSave', value: 'true', category: 'editor' },
    { key: 'language', value: 'en', category: 'preferences' },
    { key: 'timezone', value: 'UTC', category: 'preferences' },
    { key: 'dateFormat', value: 'YYYY-MM-DD', category: 'preferences' },
  ];

  for (const config of adminConfigs) {
    await prisma.userConfiguration.upsert({
      where: { 
        userId_key: { 
          userId: adminUser.id, 
          key: config.key 
        } 
      },
      update: { value: config.value },
      create: {
        userId: adminUser.id,
        key: config.key,
        value: config.value,
        category: config.category,
      },
    });
  }

  // Create sample debug logs
  await prisma.debugLog.createMany({
    data: [
      {
        level: LogLevel.INFO,
        message: 'Application started successfully',
        metadata: { component: 'server', version: '1.0.0' },
      },
      {
        level: LogLevel.DEBUG,
        message: 'Database connection established',
        metadata: { component: 'database', connectionPool: 'ready' },
      },
      {
        level: LogLevel.WARN,
        message: 'High memory usage detected',
        metadata: { component: 'monitor', memoryUsage: '85%' },
      },
    ],
  });

  // Create sample system health record
  await prisma.systemHealth.create({
    data: {
      component: 'system',
      status: 'healthy',
      message: 'All systems operational',
      metadata: {
        cpuUsage: 45.2,
        memoryUsage: 67.8,
        diskUsage: 34.1,
        uptime: '2h 15m',
        activeConnections: 12,
        lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      responseTime: 120,
    },
  });

  console.log('✅ Database seeded successfully');
  console.log(`👤 Admin user: admin@example.com / admin123`);
  console.log(`👤 Test user: test@example.com / test123`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });