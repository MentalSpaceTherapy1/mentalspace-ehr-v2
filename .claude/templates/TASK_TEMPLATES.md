# Task Templates - MentalSpace EHR

Templates for common task types. Use these to structure work consistently.

---

## Template: New Feature

```markdown
# Feature: [Feature Name]

## Overview
[Brief description of what this feature does]

## User Story
As a [role], I want to [action] so that [benefit].

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Technical Tasks

### Database (if needed)
- [ ] Add schema changes to prisma
- [ ] Create migration
- [ ] Verify migration is idempotent

### Backend
- [ ] Create/update routes
- [ ] Create/update controllers
- [ ] Create/update services
- [ ] Add validation
- [ ] Add tests

### Frontend
- [ ] Create/update pages
- [ ] Create/update components
- [ ] Create/update hooks
- [ ] Add API integration
- [ ] Add tests

### Quality Gates
- [ ] TypeScript compiles
- [ ] Linting passes
- [ ] Tests pass
- [ ] Browser tested
- [ ] Code reviewed

## Notes
[Any assumptions, decisions, or considerations]
```

---

## Template: Bug Fix

```markdown
# Bug Fix: [Bug Title]

## Problem
[Clear description of the bug]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Root Cause Analysis
[Why the bug occurs]

## Fix
[Description of the fix]

## Files Changed
- [ ] [File 1] - [What changed]
- [ ] [File 2] - [What changed]

## Testing
- [ ] Bug no longer reproduces
- [ ] Related functionality still works
- [ ] Regression test added

## Quality Gates
- [ ] TypeScript compiles
- [ ] Linting passes
- [ ] Tests pass
- [ ] Browser tested
```

---

## Template: New API Endpoint

```markdown
# API Endpoint: [METHOD] /api/v1/[path]

## Purpose
[What this endpoint does]

## Request
```http
[METHOD] /api/v1/[path]
Authorization: Bearer [token]
Content-Type: application/json

{
  "field1": "value",
  "field2": "value"
}
```

## Response

### Success (200/201)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field1": "value"
  }
}
```

### Error (4xx/5xx)
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Authentication
- Required: [Yes/No]
- Roles: [List of allowed roles]

## Validation Rules
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| field1 | string | Yes | Max 100 chars |
| field2 | number | No | Min 0 |

## Implementation Checklist
- [ ] Route created in `[module].routes.ts`
- [ ] Controller created in `[module].controller.ts`
- [ ] Service method in `[module].service.ts`
- [ ] Validation schema created
- [ ] Route registered in `routes/index.ts`
- [ ] Tests written
- [ ] Documentation updated
```

---

## Template: New React Component

```markdown
# Component: [ComponentName]

## Purpose
[What this component does]

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| id | string | Yes | - | Unique identifier |
| onSuccess | () => void | No | - | Success callback |

## Usage
```tsx
<ComponentName
  id="123"
  onSuccess={() => console.log('Done')}
/>
```

## States
- [ ] Loading state
- [ ] Error state
- [ ] Empty state
- [ ] Success state

## Styling
[TailwindCSS classes used, any special styling notes]

## Accessibility
- [ ] Keyboard navigable
- [ ] Screen reader labels
- [ ] Focus management

## Implementation Checklist
- [ ] Component created
- [ ] Props typed
- [ ] States handled
- [ ] Styled with Tailwind
- [ ] Accessible
- [ ] Tests written
```

---

## Template: Database Migration

```markdown
# Migration: [Migration Name]

## Purpose
[What this migration does]

## Changes
- [ ] Add table: [table_name]
- [ ] Add column: [table.column]
- [ ] Add index: [index_name]
- [ ] Modify column: [table.column]

## SQL
```sql
-- Add column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'table_name' AND column_name = 'column_name'
    ) THEN
        ALTER TABLE table_name ADD COLUMN column_name VARCHAR(100);
    END IF;
END $$;
```

## Prisma Schema Changes
```prisma
model TableName {
  newColumn String?
}
```

## Testing Checklist
- [ ] Migration runs on fresh DB
- [ ] Migration runs twice without error (idempotent)
- [ ] Prisma generate succeeds
- [ ] Application starts correctly
- [ ] Existing data not affected

## Rollback Plan
[How to undo this migration if needed]
```

---

## Template: Refactoring

```markdown
# Refactor: [What's Being Refactored]

## Motivation
[Why this refactoring is needed]

## Current State
[Description of current implementation]

## Target State
[Description of desired implementation]

## Changes
| File | Change |
|------|--------|
| [file1] | [what changes] |
| [file2] | [what changes] |

## Risks
- [Risk 1] - [Mitigation]
- [Risk 2] - [Mitigation]

## Testing Strategy
- [ ] Existing tests still pass
- [ ] Behavior unchanged from user perspective
- [ ] Performance not degraded

## Quality Gates
- [ ] TypeScript compiles
- [ ] Linting passes
- [ ] All tests pass
- [ ] Browser tested
- [ ] Code reviewed
```

---

## Template: Integration

```markdown
# Integration: [Service Name]

## Overview
[What external service is being integrated]

## Configuration
```env
SERVICE_API_KEY=xxx
SERVICE_URL=https://api.service.com
```

## Implementation

### Service File
Location: `packages/backend/src/integrations/[service]/`

### Files to Create
- [ ] `client.ts` - API client
- [ ] `types.ts` - Type definitions
- [ ] `service.ts` - Business logic
- [ ] `webhooks.ts` - Webhook handlers (if applicable)

## API Methods
| Method | Description | Endpoint |
|--------|-------------|----------|
| getData | Fetches data | GET /data |
| postData | Sends data | POST /data |

## Error Handling
| Error | Handling |
|-------|----------|
| 401 | Refresh token and retry |
| 429 | Exponential backoff |
| 5xx | Retry with backoff |

## Testing
- [ ] Unit tests with mocked API
- [ ] Integration tests with sandbox
- [ ] Error scenarios tested

## Documentation
- [ ] README in integration folder
- [ ] Environment variables documented
- [ ] Webhook setup instructions
```

---

## Template: Report/Analysis

```markdown
# Analysis: [Analysis Name]

## Objective
[What question are we answering]

## Data Sources
- [Source 1]
- [Source 2]

## Methodology
[How the analysis will be performed]

## Implementation

### Backend
- [ ] Create report service
- [ ] Create report endpoint
- [ ] Add caching if needed

### Frontend
- [ ] Create report page
- [ ] Add filters/parameters
- [ ] Add export functionality

## Output Format
[Describe the expected output - tables, charts, etc.]

## Performance Considerations
- [ ] Large data handling
- [ ] Query optimization
- [ ] Caching strategy

## Quality Gates
- [ ] Accurate results verified
- [ ] Performance acceptable
- [ ] Export works correctly
```
