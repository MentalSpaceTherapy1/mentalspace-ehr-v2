// Jest test setup file
// Run before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/mentalspace_test';

// Mock logger to reduce test output noise
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  performanceLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  securityLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logAudit: jest.fn(),
  logSecurity: jest.fn(),
}));

// Increase timeout for database operations
jest.setTimeout(30000);
