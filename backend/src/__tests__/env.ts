// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./prisma/test.db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.PORT = '3002';
process.env.ENABLE_REQUEST_LOGGING = 'false';
process.env.ANTHROPIC_API_KEY = 'sk-test-key-for-testing';
process.env.DEBUG_LEVEL = 'error';  // Reduce log verbosity during tests
