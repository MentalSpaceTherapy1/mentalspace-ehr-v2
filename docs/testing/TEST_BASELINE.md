# MentalSpace EHR V2 - Test Baseline

**Established:** 2026-01-11
**Purpose:** Document current test counts as baseline for improvements

## Backend Unit/Integration Tests

| Metric | Count |
|--------|-------|
| Total Test Suites | 29 |
| Passing Suites | 7 |
| Failing Suites | 22 |
| Total Tests | 838 |
| Passing Tests | 601 |
| Failing Tests | 237 |
| Test Time | ~6.8s |

### Test Command
```bash
npm run test --workspace=packages/backend
```

### Known Failures

The majority of failures are in integration tests that require a local PostgreSQL test database:

1. **Auth Flow Integration Tests** (`auth-flow.integration.test.ts`)
   - Failure reason: Tests expect local database at `localhost` with `test` credentials
   - Tests affected: ~20+ tests related to authentication flow

2. **Session Service Tests**
   - Failure reason: Same local database issue

3. **Client Service Tests**
   - Failure reason: Database connection to test database

### Required for Full Test Suite
- Local PostgreSQL instance with test database
- Test database credentials configured in environment
- Test data seeding utilities

## E2E Tests (Playwright)

| Metric | Count |
|--------|-------|
| Playwright Version | 1.56.1 |
| Test Files | 16+ |
| Total Tests | ~50+ (estimated) |

### Test Files
- `login.spec.ts` - 2 tests
- `appointment-types.spec.ts`
- `diagnose.spec.ts`
- `detailed-diagnose.spec.ts`
- `reminder-settings.spec.ts`
- `phase2-group-sessions.spec.ts`
- `phase2-provider-availability.spec.ts`
- `phase2-time-off.spec.ts`
- `phase3-analytics.spec.ts`
- `phase3-drag-drop.spec.ts`
- `phase3-provider-comparison.spec.ts`
- `phase3-room-view.spec.ts`
- `phase4-ai-scheduling.spec.ts`
- `test-fresh-clone.spec.ts`
- Plus clinical notes tests in `tests/clinical-notes/specs/`

### Test Command
```bash
npm run test:e2e
# or
npx playwright test
```

### Configuration Issues

1. **Missing playwright.config.ts** - No base URL configured
2. **Tests fail with "invalid URL"** - Need baseURL in config
3. **No project definitions** - chromium/firefox/webkit not configured

### Required for E2E Tests
- `playwright.config.ts` with:
  - baseURL: `http://localhost:5175`
  - projects: chromium, firefox, webkit
  - webServer config for auto-starting frontend/backend
- Both frontend and backend running

## Improvement Targets

### Phase 1 Goals
- [ ] Fix database connection for integration tests
- [ ] Create playwright.config.ts
- [ ] Get all unit tests passing
- [ ] Get login E2E test passing

### Phase 4-5 Goals
- [ ] 80%+ backend test coverage
- [ ] All E2E workflow tests passing
- [ ] Performance baseline tests

## ESLint Status

| Issue | Status |
|-------|--------|
| Root config | Missing - needs `eslint.config.js` |
| Frontend config | `.eslintrc.cjs` (ESLint v8 format) |
| ESLint versions | Mixed (8.57.1 and 9.39.0) |
| Lint command | Not working - config format mismatch |

### Required to Fix Linting
1. Choose single ESLint version (recommend v8 for compatibility)
2. Create root `eslint.config.js` or migrate to v9 format
3. Update frontend `.eslintrc.cjs` if migrating to v9

## Notes

- TypeScript compilation: PASSING (0 errors)
- ESLint: BLOCKED (version/config mismatch)
- ts-jest deprecation warnings present but non-blocking
