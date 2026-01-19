# Decision Rules - MentalSpace EHR

This file defines how agents make decisions WITHOUT asking questions. When facing ambiguity, agents use these rules to make reasonable choices and document their assumptions.

## Core Principle

> When in doubt, make a reasonable decision based on these rules, document the assumption, and continue. NEVER stop to ask questions.

---

## Technology Decisions

### Frontend Framework Choices

| Decision | Default | When to Use Alternative |
|----------|---------|------------------------|
| State management | React Query (server) + useState (local) | Zustand if complex client-only state |
| Form handling | Controlled components + React Hook Form | - |
| Styling | TailwindCSS | - |
| Icons | Lucide React | - |
| Date handling | dayjs | - |
| Charts | Recharts | - |
| Tables | TanStack Table | - |
| Modals | Custom Modal component | - |
| Toasts | Sonner | - |

### Backend Framework Choices

| Decision | Default | When to Use Alternative |
|----------|---------|------------------------|
| Validation | Zod schemas | - |
| Logging | Winston | - |
| Job scheduling | node-cron | Bull if queue needed |
| Email | Resend | - |
| File storage | S3 | Local for dev |
| PDF generation | puppeteer | - |
| Excel export | exceljs | - |

### Database Choices

| Decision | Default |
|----------|---------|
| Primary key | UUID v4 |
| Timestamps | createdAt, updatedAt on all tables |
| Soft delete | isDeleted, deletedAt, deletedById |
| Money fields | Decimal(10,2) |
| Status fields | Enum type |
| JSON fields | JSONB |

---

## Architecture Decisions

### When to Create New Files

| Scenario | Decision |
|----------|----------|
| New API endpoint | Create route, controller, service files |
| New UI feature | Create page + components in feature folder |
| New database table | Add to schema.prisma, create migration |
| Utility function | Add to existing utils file, or create new if distinct domain |
| New type | Add to relevant types file, or shared if used across packages |

### File Location Decisions

| Type | Location |
|------|----------|
| Page component | `packages/frontend/src/pages/[Module]/` |
| Reusable component | `packages/frontend/src/components/[domain]/` |
| API route | `packages/backend/src/routes/[module].routes.ts` |
| Service | `packages/backend/src/services/[module].service.ts` |
| Migration | `packages/database/prisma/migrations/` |
| Shared types | `packages/shared/src/types/` |

### Component Structure Decisions

| Question | Answer |
|----------|--------|
| Page vs Component | If it has a route → Page. If reusable → Component |
| Modal vs New Page | Quick action (<5 fields) → Modal. Complex form → New Page |
| Inline vs Extracted | If used >2 places or >30 lines → Extract to component |
| Single file vs Folder | If >200 lines or has sub-components → Create folder |

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| React Component | PascalCase | `ClientCard.tsx` |
| Hook | camelCase with `use` | `useClients.ts` |
| Service | kebab-case with `.service` | `client.service.ts` |
| Route | kebab-case with `.routes` | `client.routes.ts` |
| Controller | kebab-case with `.controller` | `client.controller.ts` |
| Test | Same name with `.test` | `client.service.test.ts` |
| Types | kebab-case with `.types` | `client.types.ts` |

### Variables and Functions

| Type | Convention | Example |
|------|------------|---------|
| React Component | PascalCase | `ClientCard` |
| Function | camelCase | `getClientById` |
| Constant | SCREAMING_SNAKE | `MAX_PAGE_SIZE` |
| Boolean | is/has/should prefix | `isLoading`, `hasError` |
| Event handler | handle prefix | `handleSubmit` |
| API service | verb + noun | `createClient`, `updateClient` |

### Database

| Type | Convention | Example |
|------|------------|---------|
| Table | snake_case plural | `clients`, `clinical_notes` |
| Column | camelCase | `firstName`, `createdAt` |
| Enum | PascalCase | `ClientStatus`, `NoteType` |
| Index | `idx_table_columns` | `idx_clients_email` |
| Foreign key | `fk_table_referenced` | `fk_appointments_client` |

---

## Error Handling Decisions

### HTTP Status Codes

| Scenario | Status | Code |
|----------|--------|------|
| Success | 200 | - |
| Created | 201 | - |
| No content | 204 | - |
| Bad request | 400 | `VALIDATION_ERROR` |
| Unauthorized | 401 | `UNAUTHORIZED` |
| Forbidden | 403 | `FORBIDDEN` |
| Not found | 404 | `NOT_FOUND` |
| Conflict | 409 | `CONFLICT` |
| Server error | 500 | `INTERNAL_ERROR` |

### Error Messages

| Scenario | Message Pattern |
|----------|-----------------|
| Not found | `[Resource] not found` |
| Validation | `[Field] is required` / `[Field] is invalid` |
| Permission | `You do not have permission to [action]` |
| Conflict | `[Resource] already exists` |

---

## Security Decisions

### Authentication Required

| Route Pattern | Auth Required |
|---------------|---------------|
| `/api/v1/*` (except below) | Yes (staff) |
| `/api/v1/auth/login` | No |
| `/api/v1/auth/register` | No |
| `/api/v1/auth/forgot-password` | No |
| `/api/v1/portal/*` | Yes (portal bearer) |
| `/api/v1/portal-auth/login` | No |
| `/api/v1/webhooks/*` | No (signature verified) |
| `/health` | No |

### CSRF Exemptions

Routes exempt from CSRF (use Bearer tokens or signatures):
- `/api/v1/auth/login`
- `/api/v1/auth/register`
- `/api/v1/portal/*`
- `/api/v1/portal-auth/*`
- `/api/v1/webhooks/*`
- `/health/*`

### Role Permissions

| Action | Minimum Role |
|--------|--------------|
| View own clients | CLINICIAN |
| View all clients | SUPERVISOR |
| Create user | ADMINISTRATOR |
| Delete user | SUPER_ADMIN |
| System settings | ADMINISTRATOR |
| Billing | BILLING_STAFF |
| Reports (own) | CLINICIAN |
| Reports (all) | SUPERVISOR |

---

## UI/UX Decisions

### Loading States

| Scenario | Display |
|----------|---------|
| Initial page load | Skeleton loader |
| Button action | Spinner in button, disable |
| List loading more | Spinner at bottom |
| Background refresh | No indicator (silent) |

### Empty States

| Scenario | Message |
|----------|---------|
| No results | "No [items] found. [Action to create]" |
| No search results | "No results for '[query]'. Try different terms." |
| No permission | "You don't have access to this section." |

### Pagination

| Setting | Default |
|---------|---------|
| Page size | 20 |
| Max page size | 100 |
| Show page numbers | Yes, if >1 page |
| Show total count | Yes |

### Form Behavior

| Scenario | Behavior |
|----------|----------|
| Unsaved changes | Warn on navigation |
| Validation | On blur + on submit |
| Submit success | Toast + redirect or close modal |
| Submit error | Toast + stay on form |
| Required fields | Mark with asterisk (*) |

---

## Testing Decisions

### What to Test

| Code Type | Test Type |
|-----------|-----------|
| Service functions | Unit tests |
| API endpoints | Integration tests |
| React components | Render + interaction tests |
| Critical paths | E2E tests |
| Utilities | Unit tests |

### Test Naming

```
describe('[Unit Name]', () => {
  it('should [expected behavior] when [condition]', () => {
    // test
  });
});
```

---

## When Stuck

If these rules don't cover a situation:

1. **Look for similar code** - Find how something similar was done in the codebase
2. **Choose the simpler option** - When two approaches are equal, pick the simpler one
3. **Document the assumption** - Write a comment explaining the decision
4. **Continue working** - Don't stop to ask questions
5. **Flag for review** - Note it in the code review for human verification

### Example Documentation

```typescript
// ASSUMPTION: Using soft delete based on project patterns.
// If hard delete is needed, this can be changed in review.
await prisma.client.update({
  where: { id },
  data: { isDeleted: true, deletedAt: new Date() },
});
```

---

## Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| `any` type | Use proper types or `unknown` |
| console.log | Use logger utility |
| String concatenation in SQL | Use parameterized queries |
| Hardcoded values | Use constants or config |
| Ignoring errors | Handle or rethrow with context |
| God components | Break into smaller pieces |
| Prop drilling | Use context or composition |
| Direct DOM manipulation | Use React state |
| Storing tokens in localStorage | Use httpOnly cookies |
