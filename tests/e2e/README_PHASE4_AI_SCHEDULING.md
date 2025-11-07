# Phase 4: AI Scheduling Assistant E2E Tests

## Overview

This document describes the comprehensive End-to-End tests created for the AI Scheduling Assistant feature (Phase 4).

## Test File

**Location:** `tests/e2e/phase4-ai-scheduling.spec.ts`

**Total Test Cases:** 23

## Test Coverage

### 1. Navigation & Page Loading (4 tests)
- ✓ Navigate to AI Scheduling Assistant page without errors
- ✓ Load AI Assistant without 404 errors
- ✓ Navigate from dashboard to AI Assistant
- ✓ Complete AI Assistant page test

### 2. User Interface Elements (5 tests)
- ✓ Display natural language input section
- ✓ Display tabs for different AI features
- ✓ Display scheduling suggestions interface
- ✓ Display statistics or dashboard cards
- ✓ Display recommendation lists

### 3. Natural Language Processing (1 test)
- ✓ Allow natural language scheduling input

### 4. Provider Compatibility (2 tests)
- ✓ Display provider compatibility section
- ✓ Display confidence scores

### 5. Load Balancing (2 tests)
- ✓ Display load balancing metrics
- ✓ Display provider capacity information

### 6. Pattern Recognition (4 tests)
- ✓ Display pattern insights section
- ✓ Display pattern detection button
- ✓ Handle pattern resolution actions
- ✓ Handle error states gracefully

### 7. API Integration (3 tests)
- ✓ Fetch scheduling statistics
- ✓ Handle pattern detection endpoint
- ✓ Handle load balancing endpoints

## Test Configuration

### Timeouts
- **Per Test:** 90 seconds
- **Page Default:** 60 seconds
- **Navigation:** 60 seconds

### Authentication
Tests use the following credentials:
- **Email:** brendajb@chctherapy.com
- **Password:** 38MoreYears!

### Prerequisites

Before running the tests, ensure:

1. **Backend Server Running** on port 3001
   ```bash
   cd packages/backend && npm run dev
   ```

2. **Frontend Server Running** on port 5175
   ```bash
   cd packages/frontend && npm run dev
   ```

3. **Database Seeded** with test data including:
   - Admin user account (brendajb@chctherapy.com)
   - Provider accounts
   - Client records
   - Appointment types
   - Historical appointment data for pattern detection

4. **Prisma Migrations Applied**
   ```bash
   cd packages/database && npx prisma migrate dev
   ```

## Running the Tests

### Run All AI Scheduling Tests
```bash
npx playwright test tests/e2e/phase4-ai-scheduling.spec.ts
```

### Run Single Test
```bash
npx playwright test tests/e2e/phase4-ai-scheduling.spec.ts --grep "test name"
```

### Run with UI
```bash
npx playwright test tests/e2e/phase4-ai-scheduling.spec.ts --ui
```

### Run in Headed Mode (see browser)
```bash
npx playwright test tests/e2e/phase4-ai-scheduling.spec.ts --headed
```

## Test Features Verified

### 1. Natural Language Scheduling
- Input field for natural language requests
- Submit/process button functionality
- Example: "Schedule an appointment with Dr. Smith tomorrow at 2pm"

### 2. Scheduling Suggestions
- Client/provider selector
- Generate suggestions button
- Display of suggestion cards with scores
- Accept suggestion functionality

### 3. Provider Compatibility
- Compatibility score display (0-100)
- Factor breakdown (specialty, availability, experience)
- Compatible providers list sorted by score

### 4. Load Balancing
- Provider utilization metrics
- Load score visualization (0-100)
- Status indicators (UNDERUTILIZED, BALANCED, OVERLOADED, CRITICAL)
- Team-wide distribution analysis
- Available capacity percentage

### 5. Pattern Recognition
- Pattern detection trigger button
- Pattern display with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Pattern categories:
  - NO_SHOW_CLUSTER
  - UNDERUTILIZATION
  - OVERBOOKING
  - GAP_TIME
  - PREFERENCE_MISMATCH
- Resolution and ignore actions
- Pattern statistics dashboard

### 6. API Endpoints Tested
- `GET /api/v1/ai-scheduling/stats`
- `POST /api/v1/ai-scheduling/patterns/detect`
- `GET /api/v1/ai-scheduling/patterns`
- `GET /api/v1/ai-scheduling/patterns/stats`
- `GET /api/v1/ai-scheduling/load-balancing/team`
- `GET /api/v1/ai-scheduling/load-balancing/provider/:providerId`
- `GET /api/v1/ai-scheduling/load-balancing/capacity`

## Known Issues / Environment Setup

### Authentication Flow
The tests currently require a properly seeded database with the admin user account. If tests are failing during login:

1. Verify the user exists in database:
   ```sql
   SELECT * FROM "User" WHERE email = 'brendajb@chctherapy.com';
   ```

2. Reset password if needed:
   ```bash
   node create-admin-user.js
   ```

3. Check backend logs for authentication errors:
   ```bash
   cd packages/backend && npm run dev
   ```

### Browser Configuration
Tests are configured for Chromium by default. To run on other browsers:
```bash
npx playwright test --project=firefox tests/e2e/phase4-ai-scheduling.spec.ts
npx playwright test --project=webkit tests/e2e/phase4-ai-scheduling.spec.ts
```

## Screenshots

Test screenshots are automatically saved to `test-results/` directory on failure:
- `ai-assistant-loaded.png` - Initial page load
- `ai-assistant-tabs.png` - Feature tabs
- `ai-assistant-nl-section.png` - Natural language input
- `ai-assistant-suggestions.png` - Scheduling suggestions
- `ai-assistant-compatibility.png` - Compatibility scoring
- `ai-assistant-load-balancing.png` - Load metrics
- `ai-assistant-patterns.png` - Pattern insights
- `ai-assistant-complete.png` - Full page view

## Test Maintenance

### Updating Tests
When adding new AI scheduling features:

1. Add test case to appropriate section
2. Update test count in this document
3. Add new screenshot expectations
4. Update API endpoint list if applicable

### Test Data Requirements
Tests expect certain data patterns:
- At least 3 active providers
- At least 5 active clients
- Historical appointments spanning 30+ days
- Various appointment types (individual, family, groups)
- Mix of completed, no-show, and upcoming appointments

## Success Criteria

All 23 tests should pass when:
- ✓ Backend and frontend servers are running
- ✓ Database is properly seeded
- ✓ Admin user credentials are correct
- ✓ All migrations are applied
- ✓ AI Scheduling Assistant UI is accessible at `/ai-assistant` route

## Troubleshooting

### Test Timeout
If tests timeout:
- Increase timeout in test file: `test.setTimeout(120000)`
- Check server response times
- Verify network connectivity

### 404 Errors
If tests report 404 errors:
- Verify API routes are registered in `packages/backend/src/routes/index.ts`
- Check frontend routing in `packages/frontend/src/App.tsx`
- Ensure AI Assistant page component exists

### Console Errors
Tests monitor console for errors. To debug:
```typescript
page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
```

## Future Enhancements

Potential test improvements:
1. Add tests for suggestion acceptance workflow
2. Test NLP parsing with various natural language formats
3. Verify pattern detection accuracy with seeded data
4. Test load balancing recommendations
5. Add performance benchmarks for API response times
6. Test accessibility (ARIA labels, keyboard navigation)
7. Add mobile viewport tests
8. Test dark mode / theme switching if applicable

## Related Documentation

- [AI Scheduling Service](../../packages/backend/src/services/aiScheduling.service.ts)
- [Load Balancing Service](../../packages/backend/src/services/loadBalancing.service.ts)
- [Pattern Recognition Service](../../packages/backend/src/services/patternRecognition.service.ts)
- [AI Scheduling Controller](../../packages/backend/src/controllers/aiScheduling.controller.ts)
- [AI Scheduling Routes](../../packages/backend/src/routes/aiScheduling.routes.ts)
- [AI Assistant UI](../../packages/frontend/src/pages/AISchedulingAssistant.tsx)
