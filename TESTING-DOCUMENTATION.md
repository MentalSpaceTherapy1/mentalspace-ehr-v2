# MentalSpace EHR - Comprehensive Testing Documentation

## Overview

This document describes the complete testing infrastructure for the MentalSpace EHR application, including how to run tests, interpret results, and add new tests.

---

## Table of Contents

1. [Test Suite Overview](#test-suite-overview)
2. [Running Tests](#running-tests)
3. [Test Types](#test-types)
4. [Pre-Deployment Validation](#pre-deployment-validation)
5. [Production Validation](#production-validation)
6. [Continuous Monitoring](#continuous-monitoring)
7. [Adding New Tests](#adding-new-tests)
8. [Test Coverage](#test-coverage)
9. [Troubleshooting](#troubleshooting)

---

## Test Suite Overview

The MentalSpace EHR testing infrastructure includes:

- **42 Test Scripts** organized by type
- **Unit Tests** for all controllers, services, and middleware
- **Integration Tests** for complete workflows
- **API Tests** for all endpoints
- **Database Tests** for schema and data integrity
- **Security Tests** for HIPAA compliance and vulnerability protection
- **Performance Tests** for response times and load handling

**Test Coverage Target:** ≥80%

---

## Running Tests

### Quick Start

Run all tests:
```bash
./test-everything.sh
```

Run all tests with coverage:
```bash
./test-everything.sh --coverage
```

Run all tests with verbose output:
```bash
./test-everything.sh --verbose
```

### Individual Test Suites

**Unit Tests:**
```bash
# All unit tests
npm run test:unit

# Specific categories
npm run test:unit:controllers
npm run test:unit:services
npm run test:unit:middleware
npm run test:unit:utils
```

**Integration Tests:**
```bash
# All integration tests
npm run test:integration

# Specific workflows
npm run test:integration:patient
npm run test:integration:appointment
npm run test:integration:notes
npm run test:integration:billing
npm run test:integration:portal
```

**API Tests:**
```bash
# All API tests
npm run test:api

# Specific endpoints
npm run test:api:auth
npm run test:api:clients
npm run test:api:appointments
npm run test:api:notes
npm run test:api:billing
npm run test:api:portal
```

**Database Tests:**
```bash
# All database tests
npm run test:database

# Specific categories
npm run test:database:schema
npm run test:database:constraints
npm run test:database:migrations
npm run test:database:integrity
```

**Security Tests:**
```bash
# All security tests
npm run test:security

# Specific categories
npm run test:security:phi          # PHI protection (CRITICAL)
npm run test:security:sqli         # SQL injection prevention
npm run test:security:xss          # XSS protection
npm run test:security:csrf         # CSRF protection
npm run test:security:auth         # Authentication
npm run test:security:authz        # Authorization
npm run test:security:audit        # Audit logging
```

**Performance Tests:**
```bash
# All performance tests
npm run test:performance

# Specific categories
npm run test:performance:api       # API response times
npm run test:performance:db        # Database query performance
npm run test:performance:load      # Load testing (100 concurrent users)
```

---

## Test Types

### 1. Unit Tests

**Location:** `packages/backend/src/__tests__/unit/`

**Purpose:** Test individual functions in isolation

**Example:**
```typescript
describe('Client Controller', () => {
  it('should create client with valid data', async () => {
    const mockClient = { firstName: 'John', lastName: 'Doe' };
    mockPrisma.client.create.mockResolvedValue(mockClient);

    await createClient(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(201);
  });
});
```

**Coverage:**
- ✅ All 40 controllers
- ✅ All 39 services
- ✅ All 11 middleware
- ✅ All utility functions

### 2. Integration Tests

**Location:** `packages/backend/src/__tests__/integration/`

**Purpose:** Test complete workflows end-to-end

**Example:**
```typescript
it('should complete patient registration workflow', async () => {
  // 1. Create patient
  const patient = await apiHelper.post('/api/v1/clients', authToken, patientData);

  // 2. Search for patient
  const searchResult = await apiHelper.get(`/api/v1/clients?search=${patient.data.email}`, authToken);

  // 3. Verify in database
  const dbPatient = await db.client.findUnique({ where: { id: patient.data.id } });

  expect(dbPatient).not.toBeNull();
});
```

**Workflows Tested:**
- Patient registration → search → view → update
- Appointment booking → scheduling → cancellation
- Clinical note creation → sign → lock → cosign
- Medication prescribing → modification → history
- Billing claim submission → payment → insurance verification
- Portal login → appointments → documents

### 3. API Endpoint Tests

**Location:** `packages/backend/src/__tests__/api/endpoints/`

**Purpose:** Test every API route for security and functionality

**Tests for Each Endpoint:**
- ✅ Returns 401 without authentication
- ✅ Returns 403 without authorization
- ✅ Returns 200/201 with valid input
- ✅ Returns 400 with invalid input
- ✅ Returns 400 with missing fields
- ✅ Returns 400 with malformed JSON
- ✅ Blocks SQL injection attempts
- ✅ Sanitizes XSS attempts
- ✅ Enforces rate limiting
- ✅ Returns correct response format

### 4. Database Tests

**Location:** `packages/backend/src/__tests__/database/`

**Purpose:** Validate schema integrity and data consistency

**Tests:**
- ✅ All 77 tables exist
- ✅ All columns have correct data types
- ✅ All foreign keys are enforced
- ✅ All indexes exist
- ✅ All constraints (NOT NULL, UNIQUE, CHECK) work
- ✅ Cascading deletes function correctly
- ✅ All 17 migrations are applied
- ✅ No orphaned records
- ✅ No NULL values in required fields

### 5. Security Tests

**Location:** `packages/backend/src/__tests__/security/`

**Purpose:** Ensure HIPAA compliance and vulnerability protection

**Critical Tests:**
- ✅ PHI not exposed in error messages
- ✅ PHI not exposed in logs
- ✅ PHI not exposed in stack traces
- ✅ SQL injection blocked on all inputs
- ✅ XSS attacks sanitized
- ✅ CSRF tokens validated
- ✅ Passwords hashed (never plaintext)
- ✅ Session hijacking prevented
- ✅ Unauthorized access blocked
- ✅ Audit logs capture all PHI access

### 6. Performance Tests

**Location:** `packages/backend/src/__tests__/performance/`

**Purpose:** Ensure acceptable response times and scalability

**Targets:**
- ✅ Patient search: < 500ms
- ✅ Patient chart load: < 1s
- ✅ API endpoints: < 2s
- ✅ Database queries use indexes
- ✅ Handle 100 concurrent users
- ✅ No memory leaks over 1 hour

---

## Pre-Deployment Validation

**CRITICAL:** This script MUST pass before any deployment.

```bash
./pre-deployment-checks.sh
```

**What it checks:**
1. All test suites pass (0 failures)
2. Code coverage ≥ 80%
3. Database schema is valid
4. No pending migrations
5. ESLint passes (0 errors)
6. No console.log in production code
7. No hardcoded credentials
8. No exposed API keys
9. No vulnerabilities in dependencies
10. All required environment variables set
11. No PHI in log files
12. TypeScript build succeeds
13. Docker image builds
14. All dependencies installed

**Output:** `PRE_DEPLOYMENT_REPORT.md`

**Exit Codes:**
- `0` = All checks passed, SAFE TO DEPLOY
- `1` = Critical failure, DO NOT DEPLOY

---

## Production Validation

**Purpose:** Validate production environment after deployment

```bash
node production-validation-suite.js
```

**What it tests (READ-ONLY):**
1. Database connectivity
2. All tables accessible
3. Authentication works
4. Protected endpoints require auth
5. Client list retrieval
6. Appointment retrieval
7. API response times
8. HTTPS enforcement
9. Security headers present
10. No PHI in error responses

**Output:** `PRODUCTION_VALIDATION_REPORT_[timestamp].json`

**Configuration:**
```bash
export PRODUCTION_API_URL=https://api.mentalspaceehr.com
export TEST_USER_EMAIL=test@mentalspace.com
export TEST_USER_PASSWORD=YourTestPassword
```

---

## Continuous Monitoring

**Purpose:** Monitor production health every 5 minutes

```bash
node continuous-monitoring.js
```

**What it monitors:**
- Application health endpoint
- Database connectivity
- API response times
- Memory usage
- Error rates

**Alerts sent for:**
- Application down (3 retries)
- Database connection lost
- Response time > 5 seconds
- Error rate > 1%
- 3 consecutive check failures

**Configuration:**
```bash
export PRODUCTION_API_URL=https://api.mentalspaceehr.com
export ALERT_EMAIL=alerts@mentalspace.com
```

---

## Adding New Tests

### Adding a Unit Test

1. Create test file: `packages/backend/src/__tests__/unit/[category]/[name].test.ts`

2. Follow this template:
```typescript
import { functionToTest } from '../../../path/to/function';

describe('Function Name', () => {
  it('should handle valid input', () => {
    const result = functionToTest(validInput);
    expect(result).toBe(expectedOutput);
  });

  it('should reject invalid input', () => {
    expect(() => functionToTest(invalidInput)).toThrow();
  });

  it('should handle edge cases', () => {
    expect(functionToTest(null)).toBe(null);
    expect(functionToTest(undefined)).toBeUndefined();
  });
});
```

3. Run the new test:
```bash
npm run test -- [test-file-name]
```

### Adding an Integration Test

1. Create test file: `packages/backend/src/__tests__/integration/workflows/[name].test.ts`

2. Use test helpers:
```typescript
import { ApiTestHelper } from '../../helpers/apiHelpers';
import { createTestUser, createTestClient } from '../../helpers/testDatabase';

describe('Workflow Name', () => {
  let apiHelper: ApiTestHelper;
  let authToken: string;

  beforeAll(async () => {
    const user = await createTestUser();
    authToken = apiHelper.generateAuthToken(user.id, user.email, user.role);
  });

  it('should complete workflow', async () => {
    // Test your workflow
  });
});
```

### Adding a Security Test

1. Create test file: `packages/backend/src/__tests__/security/[vulnerability].test.ts`

2. Test for vulnerability:
```typescript
it('should prevent [attack]', async () => {
  const maliciousInput = '[attack payload]';
  const response = await apiHelper.post('/api/endpoint', authToken, maliciousInput);

  // Should reject or sanitize
  expect([400, 201]).toContain(response.status);

  if (response.status === 201) {
    expect(response.body.data).not.toContain('<script>');
  }
});
```

---

## Test Coverage

### Viewing Coverage

```bash
npm run test:coverage
open packages/backend/coverage/lcov-report/index.html
```

### Coverage Requirements

| Category | Target | Critical Minimum |
|----------|--------|------------------|
| Overall | 80% | 70% |
| Controllers | 85% | 75% |
| Services | 85% | 75% |
| Security | 95% | 90% |
| PHI Handling | 100% | 100% |

### Improving Coverage

1. Run coverage report
2. Identify uncovered lines:
```bash
npm run test:coverage -- --verbose
```
3. Add tests for uncovered code
4. Re-run coverage

---

## Troubleshooting

### Tests Failing Locally

**Database connection errors:**
```bash
# Ensure test database is running
export DATABASE_URL="postgresql://test:test@localhost:5432/mentalspace_test"

# Run migrations
npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma
```

**Environment variables missing:**
```bash
# Copy example env file
cp .env.example .env

# Set test environment
export NODE_ENV=test
```

### Slow Tests

**Increase timeout:**
```typescript
jest.setTimeout(30000); // 30 seconds
```

**Run tests in parallel:**
```bash
npm run test -- --maxWorkers=4
```

### Memory Issues

**Increase Node memory:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run test
```

---

## Best Practices

1. **Always run pre-deployment checks before deploying**
2. **Run full test suite after any code changes**
3. **Add tests for new features before implementation (TDD)**
4. **Keep tests isolated (use beforeEach/afterEach cleanup)**
5. **Use descriptive test names**
6. **Test edge cases and error conditions**
7. **Never commit code that breaks tests**
8. **Maintain 80%+ code coverage**
9. **Review security test results carefully**
10. **Monitor production validation reports**

---

## Quick Reference

```bash
# Run everything
./test-everything.sh --coverage

# Pre-deployment check
./pre-deployment-checks.sh

# Production validation
node production-validation-suite.js

# Continuous monitoring
node continuous-monitoring.js

# Watch mode (development)
npm run test:watch

# Single test file
npm run test -- path/to/test.test.ts

# Update snapshots
npm run test -- -u
```

---

**For questions or issues, see the main project README or contact the development team.**
