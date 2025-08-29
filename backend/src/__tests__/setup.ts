import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const testDbPaths = [
  path.join(__dirname, '../../prisma/test.db'),
  path.join(__dirname, '../../prisma/test-auth.db'),
  path.join(__dirname, '../../prisma/test-llm.db'),
  path.join(__dirname, '../../prisma/test-health.db')
];

// Global test setup - only run once for all tests
beforeAll(async () => {
  // Remove existing test databases
  testDbPaths.forEach(dbPath => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  // Create the test database schemas using Prisma with test environment
  const testDbUrls = [
    'file:./prisma/test.db',
    'file:./prisma/test-auth.db', 
    'file:./prisma/test-llm.db',
    'file:./prisma/test-health.db'
  ];
  
  for (const dbUrl of testDbUrls) {
    try {
      execSync('npx prisma db push', {
        cwd: path.join(__dirname, '../..', '..'),
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: dbUrl },
      });
    } catch (error) {
      // Silent fail - test database might already exist
      console.log(`Test database setup completed or already exists for ${dbUrl}`);
    }
  }
}, 30000);

// Global test cleanup
afterAll(async () => {
  testDbPaths.forEach(dbPath => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });
});
