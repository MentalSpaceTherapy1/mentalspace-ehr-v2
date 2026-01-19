# Sample Workflows - MentalSpace EHR

Example workflows showing how the autonomous system handles common requests.

---

## Workflow 1: Add New Feature

### Request
"Add a feature to allow clinicians to flag clients as high-priority. High-priority clients should appear with a badge in the client list and should be filterable."

### Execution

```
🚀 Starting: Add High-Priority Client Flag Feature

Tasks identified:
1. Database: Add priority field to clients table
2. Backend: Update client API to support priority
3. Frontend: Add priority badge and filter
4. Review: Code quality check
5. QA: Browser verification

Beginning execution...

─────────────────────────────────────────────────────────

✅ Task 1: Database - Add priority field

Files changed:
- packages/database/prisma/schema.prisma
- packages/database/prisma/migrations/20260116_add_client_priority/migration.sql

Schema change:
```prisma
model Client {
  // ... existing fields
  priority    ClientPriority @default(NORMAL)
}

enum ClientPriority {
  NORMAL
  HIGH
  URGENT
}
```

Migration (idempotent):
```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientPriority') THEN
        CREATE TYPE "ClientPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'priority'
    ) THEN
        ALTER TABLE clients ADD COLUMN priority "ClientPriority" DEFAULT 'NORMAL';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_priority ON clients(priority);
```

Quality gates:
- [x] Migration runs on fresh DB
- [x] Migration is idempotent
- [x] Prisma generate succeeds

─────────────────────────────────────────────────────────

✅ Task 2: Backend - Update client API

Files changed:
- packages/backend/src/services/client.service.ts
- packages/backend/src/controllers/client.controller.ts
- packages/backend/src/validators/client.validator.ts

Changes:
1. Added priority to client response
2. Added priority filter to getAll
3. Added setPriority endpoint
4. Added validation for priority values

New endpoint:
```
PATCH /api/v1/clients/:id/priority
Body: { "priority": "HIGH" }
```

Quality gates:
- [x] TypeScript compiles
- [x] Linting passes
- [x] Unit tests added and passing

─────────────────────────────────────────────────────────

✅ Task 3: Frontend - Add UI components

Files changed:
- packages/frontend/src/components/clients/PriorityBadge.tsx
- packages/frontend/src/components/clients/ClientListFilters.tsx
- packages/frontend/src/pages/Clients/ClientList.tsx
- packages/frontend/src/hooks/useClients.ts

Components added:
1. PriorityBadge - displays colored badge
2. Updated filters to include priority dropdown

Quality gates:
- [x] TypeScript compiles
- [x] Linting passes
- [x] Component tests added

─────────────────────────────────────────────────────────

✅ Task 4: Code Review

Checklist results:
- [x] Correctness - Feature works as designed
- [x] Security - No PHI exposure
- [x] Code Quality - Follows patterns
- [x] Testing - Tests included
- [x] Documentation - Self-documenting

Status: APPROVED

─────────────────────────────────────────────────────────

✅ Task 5: QA Browser Testing

Tests performed:
1. Navigate to client list
2. Verify priority badge displays correctly
3. Filter by HIGH priority - only high priority clients shown
4. Change client priority - badge updates
5. Refresh page - priority persists

Results: All tests passed

─────────────────────────────────────────────────────────

✅ COMPLETE: Add High-Priority Client Flag Feature

## Summary
Added ability for clinicians to flag clients as NORMAL, HIGH, or URGENT priority.
High-priority clients display a colored badge and can be filtered in the list view.

## Files Changed
- packages/database/prisma/schema.prisma
- packages/database/prisma/migrations/20260116_add_client_priority/
- packages/backend/src/services/client.service.ts
- packages/backend/src/controllers/client.controller.ts
- packages/backend/src/validators/client.validator.ts
- packages/frontend/src/components/clients/PriorityBadge.tsx
- packages/frontend/src/components/clients/ClientListFilters.tsx
- packages/frontend/src/pages/Clients/ClientList.tsx
- packages/frontend/src/hooks/useClients.ts

## Assumptions Made
1. Priority is per-client, not per-clinician (global visibility)
2. URGENT is highest priority, then HIGH, then NORMAL
3. Default priority is NORMAL for existing and new clients
4. All roles can see priority, but only CLINICIAN+ can change it

## Quality Gates
- [x] TypeScript compiles
- [x] Linting passes
- [x] Tests pass
- [x] Migration idempotent
- [x] Browser verified
- [x] Code reviewed
```

---

## Workflow 2: Fix Bug

### Request
"Bug: When editing a client, the save button stays disabled after clearing and re-entering a required field."

### Execution

```
🚀 Starting: Fix Client Edit Form Save Button Bug

Tasks identified:
1. Investigate: Reproduce and identify root cause
2. Fix: Apply code changes
3. Test: Add regression test
4. QA: Verify fix

Beginning execution...

─────────────────────────────────────────────────────────

✅ Task 1: Investigate Bug

Steps to reproduce:
1. Navigate to Clients → Select client → Edit
2. Clear the "First Name" field
3. Re-enter a value
4. Observe: Save button still disabled

Root cause identified:
The form dirty state is not properly reset when a field is cleared
and re-entered with the same original value. The form library marks
the field as dirty on first change but doesn't recompute when value
returns to original.

Location: packages/frontend/src/pages/Clients/EditClient.tsx

─────────────────────────────────────────────────────────

✅ Task 2: Apply Fix

File changed:
- packages/frontend/src/pages/Clients/EditClient.tsx

Fix:
Changed form validation to check actual value differences, not just
dirty state. Button now enabled if form is valid and any field differs
from original values.

```tsx
// Before (buggy)
const isDisabled = !isDirty || !isValid;

// After (fixed)
const hasChanges = Object.keys(formValues).some(
  key => formValues[key] !== originalValues[key]
);
const isDisabled = !hasChanges || !isValid;
```

Quality gates:
- [x] TypeScript compiles
- [x] Linting passes

─────────────────────────────────────────────────────────

✅ Task 3: Add Regression Test

File changed:
- packages/frontend/src/pages/Clients/EditClient.test.tsx

Test added:
```tsx
it('should enable save button when field cleared and re-entered with different value', async () => {
  render(<EditClient clientId="123" />);
  
  const input = screen.getByLabelText(/first name/i);
  const saveButton = screen.getByRole('button', { name: /save/i });
  
  // Clear and re-enter different value
  await userEvent.clear(input);
  await userEvent.type(input, 'Different Name');
  
  expect(saveButton).not.toBeDisabled();
});
```

Quality gates:
- [x] New test passes
- [x] Existing tests still pass

─────────────────────────────────────────────────────────

✅ Task 4: QA Browser Testing

Tests performed:
1. Edit client, clear First Name
2. Re-enter same value - Save disabled ✓
3. Re-enter different value - Save enabled ✓
4. Clear and re-enter multiple fields - Save enabled ✓
5. Submit form - Changes saved ✓

─────────────────────────────────────────────────────────

✅ COMPLETE: Fix Client Edit Form Save Button Bug

## Summary
Fixed issue where save button remained disabled after clearing and
re-entering form fields. Changed form state tracking to compare actual
values instead of relying solely on dirty state.

## Files Changed
- packages/frontend/src/pages/Clients/EditClient.tsx
- packages/frontend/src/pages/Clients/EditClient.test.tsx

## Quality Gates
- [x] TypeScript compiles
- [x] Linting passes
- [x] Tests pass
- [x] Browser verified
```

---

## Workflow 3: Analysis Task

### Request
"Generate a report showing clinician productivity for the last month - number of appointments, notes completed, and average note completion time."

### Execution

```
🚀 Starting: Clinician Productivity Report

Tasks identified:
1. Backend: Create report service and endpoint
2. Frontend: Create report page with charts
3. QA: Verify data accuracy

Beginning execution...

─────────────────────────────────────────────────────────

✅ Task 1: Backend - Report Service

Files created:
- packages/backend/src/services/reports/clinicianProductivity.service.ts
- packages/backend/src/routes/reports.routes.ts (updated)
- packages/backend/src/controllers/reports.controller.ts (updated)

Endpoint:
```
GET /api/v1/reports/clinician-productivity
Query params: startDate, endDate, clinicianId (optional)
```

Response:
```json
{
  "success": true,
  "data": {
    "period": { "start": "2025-12-16", "end": "2026-01-16" },
    "clinicians": [
      {
        "id": "...",
        "name": "Dr. Smith",
        "appointmentsCompleted": 45,
        "appointmentsCancelled": 3,
        "notesCompleted": 42,
        "notesPending": 3,
        "avgNoteCompletionMinutes": 28.5
      }
    ],
    "totals": {
      "totalAppointments": 180,
      "totalNotes": 165,
      "overallAvgCompletionTime": 32.1
    }
  }
}
```

Quality gates:
- [x] TypeScript compiles
- [x] Unit tests added

─────────────────────────────────────────────────────────

✅ Task 2: Frontend - Report Page

Files created:
- packages/frontend/src/pages/Reports/ClinicianProductivity.tsx
- packages/frontend/src/components/reports/ProductivityChart.tsx
- packages/frontend/src/hooks/useClinicianProductivity.ts

Features:
1. Date range picker
2. Clinician filter
3. Summary cards (total appointments, notes, avg time)
4. Bar chart comparing clinicians
5. Export to CSV

Quality gates:
- [x] TypeScript compiles
- [x] Linting passes
- [x] Component renders correctly

─────────────────────────────────────────────────────────

✅ Task 3: QA Verification

Data accuracy checks:
1. Manual count of appointments matched report ✓
2. Note counts verified against database ✓
3. Completion time calculation verified ✓
4. Date filtering works correctly ✓
5. CSV export contains correct data ✓

─────────────────────────────────────────────────────────

✅ COMPLETE: Clinician Productivity Report

## Summary
Created new productivity report showing appointment counts, note
completion rates, and average note completion time per clinician.
Includes filtering by date range and clinician, with CSV export.

## Files Changed
- packages/backend/src/services/reports/clinicianProductivity.service.ts (new)
- packages/backend/src/routes/reports.routes.ts
- packages/backend/src/controllers/reports.controller.ts
- packages/frontend/src/pages/Reports/ClinicianProductivity.tsx (new)
- packages/frontend/src/components/reports/ProductivityChart.tsx (new)
- packages/frontend/src/hooks/useClinicianProductivity.ts (new)

## Access
Added to Reports menu, requires SUPERVISOR role or higher.

## Quality Gates
- [x] TypeScript compiles
- [x] Linting passes
- [x] Tests pass
- [x] Data accuracy verified
- [x] Browser verified
```
