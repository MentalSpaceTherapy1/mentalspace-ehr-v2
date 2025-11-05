# Test Execution Guide - Module 1 Authentication & User Management

**Created**: 2025-11-02
**Agent**: Agent-Testing-QA
**Module**: Module 1 - Authentication & User Management

---

## Overview

This guide explains how to run tests, interpret results, add new tests, and maintain test coverage for Module 1. All tests are written using Jest and follow consistent patterns for easy maintenance.

---

## Quick Start

### Run All Tests

```bash
# Backend tests
cd packages/backend
npm test

# Frontend tests
cd packages/frontend
npm test

# Run with coverage
npm test -- --coverage
```

### Run Specific Test Suites

```bash
# Unit tests only
npm test:unit

# Integration tests only
npm test:integration

# Security tests only
npm test:security

# Specific service tests
npm test -- --testPathPattern=session.service.test
```

---

## Test Structure

### Directory Organization

```
packages/backend/src/
├── services/
│   └── __tests__/
│       ├── session.service.test.ts         # Session management unit tests
│       ├── passwordPolicy.service.test.ts   # Password policy unit tests
│       ├── mfa.service.test.ts             # MFA unit tests
│       └── auth.service.test.ts            # Auth service unit tests
├── __tests__/
│   ├── integration/
│   │   ├── auth-flow.integration.test.ts           # Complete auth workflows
│   │   ├── session-management.integration.test.ts  # Session lifecycle
│   │   └── password-policy.integration.test.ts     # Password enforcement
│   └── security/
│       └── security.test.ts                        # Attack simulations
└── setup.ts                                        # Jest configuration

packages/frontend/src/
└── components/
    └── Auth/
        └── __tests__/
            ├── SessionTimeoutWarning.test.tsx      # Session timeout UI
            ├── MFASetupWizard.test.tsx            # MFA setup flow
            ├── PasswordStrengthIndicator.test.tsx  # Password validation UI
            └── AccountLockedScreen.test.tsx        # Lockout UI
```

---

## Running Tests

### Watch Mode (Development)

```bash
# Backend - watches for changes and reruns tests
cd packages/backend
npm test:watch

# Frontend
cd packages/frontend
npm test:watch
```

### Coverage Reports

```bash
# Generate coverage report
npm test:coverage

# View coverage in browser
# Coverage report will be in: coverage/lcov-report/index.html
# Open it in your browser to see detailed coverage
```

### Continuous Integration

```bash
# Run all tests with coverage (CI mode)
npm test -- --ci --coverage --maxWorkers=2
```

---

## Test Patterns

### Unit Test Pattern

```typescript
import { ServiceClass } from '../service';
import prisma from '../database';

// Mock dependencies
jest.mock('../database');

describe('ServiceClass', () => {
  let service: ServiceClass;

  beforeEach(() => {
    service = new ServiceClass();
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do expected behavior', async () => {
      // Setup: Prepare test data
      const testData = { /* ... */ };
      (prisma.model.method as jest.Mock).mockResolvedValue(testData);

      // Execute: Call the method being tested
      const result = await service.methodName(params);

      // Verify: Check expectations
      expect(result).toBeDefined();
      expect(prisma.model.method).toHaveBeenCalledWith(expectedArgs);
    });
  });
});
```

### Integration Test Pattern

```typescript
import prisma from '../../services/database';
import { AuthService } from '../../services/auth.service';

describe('Complete Auth Flow', () => {
  let authService: AuthService;

  beforeAll(async () => {
    authService = new AuthService();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.session.deleteMany({ where: { /* ... */ } });
    await prisma.user.deleteMany({ where: { /* ... */ } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should complete end-to-end workflow', async () => {
    // Setup: Create prerequisites
    // Execute: Run complete workflow
    // Verify: Check all side effects
  });
});
```

### Frontend Component Test Pattern

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '../ComponentName';

describe('ComponentName', () => {
  const mockProps = {
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<ComponentName {...mockProps} />);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    render(<ComponentName {...mockProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockProps.onAction).toHaveBeenCalled();
  });
});
```

---

## Adding New Tests

### 1. Create Test File

Place test file next to the code it tests:
- Unit tests: `services/__tests__/yourService.test.ts`
- Integration tests: `__tests__/integration/yourFlow.integration.test.ts`
- Security tests: `__tests__/security/yourSecurity.test.ts`

### 2. Follow Naming Conventions

```typescript
// Test file name: filename.test.ts or filename.test.tsx

describe('ServiceName or ComponentName', () => {
  describe('methodName or feature', () => {
    it('should do specific behavior', () => {
      // Test implementation
    });
  });
});
```

### 3. Write Descriptive Test Names

**Good**:
- `should create session with 20-minute expiration`
- `should reject password without special characters`
- `should lock account after 5 failed login attempts`

**Bad**:
- `test1`
- `works correctly`
- `session test`

### 4. Follow AAA Pattern

```typescript
it('should do something', () => {
  // Arrange: Set up test data and mocks
  const testData = { /* ... */ };

  // Act: Execute the code being tested
  const result = functionUnderTest(testData);

  // Assert: Verify expectations
  expect(result).toBe(expectedValue);
});
```

---

## Coverage Requirements

### Target Coverage

- **Overall**: >85%
- **Critical Services**: >90%
  - auth.service.ts
  - session.service.ts
  - passwordPolicy.service.ts
  - mfa.service.ts

### Viewing Coverage

```bash
npm test:coverage
```

Coverage report location:
- `packages/backend/coverage/lcov-report/index.html`
- `packages/frontend/coverage/lcov-report/index.html`

### Coverage Metrics

- **Statements**: % of code statements executed
- **Branches**: % of if/else branches taken
- **Functions**: % of functions called
- **Lines**: % of lines executed

---

## Debugging Tests

### Run Single Test File

```bash
npm test -- session.service.test.ts
```

### Run Single Test Case

```bash
npm test -- -t "should create session with valid data"
```

### Enable Debug Output

```bash
# Show console.log in tests
npm test -- --verbose

# Show detailed error messages
npm test -- --detectOpenHandles
```

### Common Issues

#### 1. Database Connection Errors

```typescript
// Ensure proper cleanup
afterAll(async () => {
  await prisma.$disconnect();
});
```

#### 2. Timeout Errors

```typescript
// Increase timeout for slow tests
jest.setTimeout(30000); // 30 seconds
```

#### 3. Mock Not Working

```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### 4. Async Test Failures

```typescript
// Always return or await promises
it('should work', async () => {
  await asyncFunction(); // Don't forget await!
});
```

---

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```typescript
// Good
beforeEach(async () => {
  // Fresh data for each test
  testUser = await createTestUser();
});

afterEach(async () => {
  // Clean up after each test
  await deleteTestUser(testUser.id);
});
```

### 2. Mock External Dependencies

```typescript
// Mock database
jest.mock('../database');

// Mock external APIs
jest.mock('axios');

// Mock environment variables
process.env.TEST_VAR = 'test-value';
```

### 3. Test Edge Cases

```typescript
describe('validatePassword', () => {
  it('should handle empty string', () => { /* ... */ });
  it('should handle null input', () => { /* ... */ });
  it('should handle very long input', () => { /* ... */ });
  it('should handle special characters', () => { /* ... */ });
});
```

### 4. Use Descriptive Assertions

```typescript
// Good
expect(user.failedLoginAttempts).toBe(3);

// Better
expect(user.failedLoginAttempts).toBe(3);
expect(user.accountLockedUntil).toBeNull();
```

### 5. Test Error Cases

```typescript
it('should throw error for invalid input', async () => {
  await expect(service.method(invalidInput)).rejects.toThrow(
    'Expected error message'
  );
});
```

---

## Test Data Management

### Creating Test Data

```typescript
// Helper function for creating test users
async function createTestUser(overrides = {}) {
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: await bcrypt.hash('Test123!', 10),
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    },
  });
}
```

### Cleaning Up Test Data

```typescript
afterEach(async () => {
  // Delete in correct order (respect foreign keys)
  await prisma.session.deleteMany({ where: { userId: testUserId } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
});
```

---

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test -- --ci --coverage
      - uses: codecov/codecov-action@v2
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --bail --findRelatedTests"
    }
  }
}
```

---

## Performance Testing

### Benchmarking Tests

```typescript
it('should complete login within 2 seconds', async () => {
  const startTime = Date.now();

  await authService.login(credentials);

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(2000);
});
```

### Load Testing

```typescript
it('should handle 100 concurrent requests', async () => {
  const promises = Array(100).fill(null).map(() =>
    authService.login(validCredentials)
  );

  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled');

  expect(successful.length).toBeGreaterThan(95); // 95% success rate
});
```

---

## Troubleshooting

### Tests Pass Locally But Fail in CI

- Check environment variables
- Verify database connection
- Check Node.js version
- Review CI logs for specific errors

### Flaky Tests

- Add `jest.setTimeout()` for slow operations
- Ensure proper async/await usage
- Check for race conditions
- Add delays where necessary: `await new Promise(r => setTimeout(r, 100))`

### Memory Leaks

- Disconnect from database: `await prisma.$disconnect()`
- Clear intervals/timeouts
- Remove event listeners

---

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

### Tools
- [Jest Runner](https://marketplace.visualstudio.com/items?itemName=firsttris.vscode-jest-runner) - VS Code extension
- [Wallaby.js](https://wallabyjs.com/) - Live test runner
- [Majestic](https://github.com/Raathigesh/majestic) - GUI for Jest

---

## Getting Help

### Common Commands Reference

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run specific suite
npm test -- --testPathPattern=session

# Run in watch mode
npm test:watch

# Run single test
npm test -- -t "test name"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Contact

For questions or issues with tests:
1. Check this guide
2. Review existing test examples
3. Check Jest documentation
4. Ask in team Slack channel: #engineering-testing

---

**Last Updated**: 2025-11-02
**Maintained By**: Agent-Testing-QA
**Version**: 1.0
