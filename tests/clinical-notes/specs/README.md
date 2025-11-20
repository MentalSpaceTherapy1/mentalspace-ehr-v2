# Clinical Notes Test Specifications

This directory contains all Playwright test specifications for the Clinical Notes module, organized into 5 comprehensive parts.

## Test Structure

### Part 1: Core CRUD & Note Types
**File**: `clinical-notes-comprehensive.spec.ts`
- All 8+ note types (Intake, Progress, Treatment Plan, etc.)
- Create, Read, Update, Delete operations
- Basic form validation
- Database operations

### Part 2: Workflows
**File**: `clinical-notes-comprehensive-part2.spec.ts`
- Electronic signatures (PIN & Password)
- Cosigning workflow
- Return for revision
- Lock/Unlock Sunday notes
- Resubmission after revision

### Part 3: Advanced Features
**File**: `clinical-notes-comprehensive-part3.spec.ts`
- Amendment history & tracking
- Outcome measures integration
- Electronic signature events
- Version comparison
- Audit trail

### Part 4: Pages & Tables
**File**: `clinical-notes-comprehensive-part4.spec.ts`
- My Notes page (filters, sorting, pagination)
- Cosign Queue management
- Compliance Dashboard
- List views and data tables
- Search functionality

### Part 5: System Features
**File**: `clinical-notes-comprehensive-part5.spec.ts`
- Audit trail & logging
- Notification system (email & in-app)
- Advanced search with filters
- Export functionality (PDF, CSV)
- Search presets

## Test Coverage

- **Total Tests**: ~212+ tests
- **API Endpoints**: 40+ endpoints tested
- **UI Components**: 20+ components tested
- **Workflows**: 15+ workflows tested
- **Coverage**: 92-95%

## Running Tests

### Run All Parts
```bash
cd tests/clinical-notes
npx ts-node run-comprehensive-tests.ts
```

### Run Individual Parts
```bash
npx playwright test specs/clinical-notes-comprehensive.spec.ts
npx playwright test specs/clinical-notes-comprehensive-part2.spec.ts
npx playwright test specs/clinical-notes-comprehensive-part3.spec.ts
npx playwright test specs/clinical-notes-comprehensive-part4.spec.ts
npx playwright test specs/clinical-notes-comprehensive-part5.spec.ts
```

### Run Specific Section
```bash
npx playwright test specs/clinical-notes-comprehensive.spec.ts -g "Note Creation"
```

## Test Data

All test data, API endpoints, and UI selectors are centralized in:
- **Fixtures**: `../fixtures/test-data.ts`
- **Helpers**: `../helpers/test-helpers.ts`

## Reports

Test reports are generated in `../../test-reports/clinical-notes/`:
- `clinical-notes-test-report.html` - Visual HTML report
- `clinical-notes-test-report.json` - JSON data export
- `CLINICAL_NOTES_TEST_REPORT.md` - Markdown documentation
