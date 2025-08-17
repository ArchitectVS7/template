#!/usr/bin/env node

/**
 * Development Database Setup Script
 * 
 * This script helps set up a local PostgreSQL database for development.
 * Run with: npm run setup:db
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up development database...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found. Copying from .env.example...');
  const envExamplePath = path.join(__dirname, '..', 'backend', '.env.example');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ Created .env file from template\n');
}

try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { 
    cwd: path.join(__dirname, '..', 'backend'),
    stdio: 'inherit' 
  });

  console.log('\n🗄️  Running database migrations...');
  execSync('npx prisma migrate dev --name initial', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit' 
  });

  console.log('\n🌱 Seeding database with initial data...');
  execSync('npx prisma db seed', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit' 
  });

  console.log('\n✅ Database setup complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Start backend: cd backend && npm run dev');
  console.log('   2. Start frontend: cd frontend && npm run dev');
  console.log('   3. Open http://localhost:5174 in your browser');

} catch (error) {
  console.error('\n❌ Database setup failed:', error.message);
  console.log('\n🔍 Troubleshooting:');
  console.log('   1. Make sure PostgreSQL is running locally');
  console.log('   2. Check your DATABASE_URL in backend/.env');
  console.log('   3. Ensure the database exists (create if needed)');
  console.log('   4. Run: createdb ai_dev_mvp (if database doesn\'t exist)');
  process.exit(1);
}