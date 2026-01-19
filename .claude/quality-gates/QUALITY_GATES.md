# Quality Gates - MentalSpace EHR

Quality Gates are automated and manual checks that MUST pass before any work is considered complete. No exceptions.

## Gate 1: TypeScript Compilation

### Command
```bash
cd packages/backend && npm run build
cd packages/frontend && npm run build
```

### Pass Criteria
- Exit code 0
- No TypeScript errors
- No type `any` unless explicitly justified

### Common Failures
| Error | Fix |
|-------|-----|
| Cannot find module | Check import path, install package |
| Type 'X' is not assignable | Fix type mismatch |
| Property does not exist | Add to interface or fix typo |
| Argument of type 'any' | Add proper types |

---

## Gate 2: Linting

### Command
```bash
cd packages/backend && npm run lint
cd packages/frontend && npm run lint
```

### Pass Criteria
- Exit code 0
- No errors (warnings OK but should be addressed)

### Auto-fix
```bash
npm run lint -- --fix
```

### Common Failures
| Error | Fix |
|-------|-----|
| Unused variable | Remove or prefix with _ |
| Missing semicolon | Add semicolon or use auto-fix |
| Import order | Let ESLint auto-fix |
| Prefer const | Change let to const |

---

## Gate 3: Unit Tests

### Command
```bash
cd packages/backend && npm test
cd packages/frontend && npm test
```

### Pass Criteria
- All tests pass
- No skipped tests without justification
- Coverage doesn't decrease

### Test Requirements
| Code Type | Required Tests |
|-----------|----------------|
| Service functions | Unit tests for each public method |
| Controllers | Request/response tests |
| React components | Render + basic interaction |
| Utilities | Unit tests for each function |

---

## Gate 4: Database Migration

### Checks
1. **Idempotency Check**: Migration can run twice without error
2. **Fresh DB Check**: Migration works on empty database
3. **Schema Sync**: Prisma schema matches migration

### Commands
```bash
cd packages/database

# Reset and run all migrations (fresh test)
npx prisma migrate reset --force

# Run migrations (should succeed)
npx prisma migrate deploy

# Run again (idempotency - should succeed)
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### Migration Requirements
- All `ALTER TABLE ADD COLUMN` wrapped in IF NOT EXISTS
- All `CREATE TABLE` uses IF NOT EXISTS
- All `CREATE INDEX` uses IF NOT EXISTS
- Rollback plan documented (even if not automated)

---

## Gate 5: Security Scan

### Checks
1. **No PHI in logs**: Grep for sensitive field names in console/logger calls
2. **No hardcoded secrets**: Grep for API keys, passwords
3. **Auth on routes**: All new routes have authentication
4. **CSRF protection**: Only exempt routes that need it

### Commands
```bash
# Check for potential PHI logging
grep -r "console.log.*ssn\|phone\|email\|address" packages/backend/src/

# Check for hardcoded secrets
grep -r "sk-\|api_key\|password\s*=" packages/

# Verify route protection
grep -r "router\." packages/backend/src/routes/ | grep -v "authenticate"
```

### Security Requirements
| Item | Requirement |
|------|-------------|
| New API endpoints | Must have `authenticate` middleware |
| PHI access | Must be logged to audit trail |
| Error messages | Must not expose PHI |
| Input validation | Required on all endpoints |

---

## Gate 6: Browser Testing - COMPREHENSIVE

### CRITICAL: All Features Must Be Browser Tested

Browser testing is not optional. Every feature must be tested in a real browser as a human user would interact with it.

### Method
Use Claude in Chrome MCP to execute all relevant test scenarios from `agents/BROWSER_TESTING_AGENT.md`.

### Test Execution Requirements

1. **Login as appropriate role** - Use correct test credentials
2. **Navigate to feature** - Use actual UI navigation
3. **Execute all steps** - Click buttons, fill forms, submit data
4. **Verify outcomes** - Check success/error messages, data persistence
5. **Screenshot key states** - Capture before/after important actions

### Required Tests by Feature Type

| Feature Type | Required Tests |
|--------------|----------------|
| Client-facing | All related Client Portal tests (C1-C18) |
| Clinical documentation | Therapist note tests (T9-T14), Supervisor review tests (S2-S6) |
| Scheduling | Therapist scheduling tests (T5-T8), Client appointment tests (C8-C10) |
| Billing | All billing tests (B1-B10) |
| Admin/Settings | All admin tests (A1-A11) |
| Cross-role feature | Relevant workflow tests (W1-W4) |

### Test Checklist

```markdown
## Browser Test Results

### Feature: [Name]
### Date: [Date]

### Roles Tested
- [ ] Therapist
- [ ] Supervisor  
- [ ] Administrator
- [ ] Billing
- [ ] Client

### Tests Performed
- [x] Happy path works
- [x] Error states display correctly
- [x] Loading states visible
- [x] Form validation works
- [x] Data persists after refresh
- [x] Keyboard navigation works
- [ ] Responsive design (if applicable)

### Screenshots
[Include screenshots of key states]

### Issues Found
[List any issues, or "None"]
```

### Full Test Execution

For comprehensive testing of entire application:
```
"Execute full E2E browser testing as defined in BROWSER_TESTING_AGENT.md"
```

This will run all 73+ test scenarios across all user roles.

---

## Gate 7: Code Review

### Checklist
See `agents/CODE_REVIEW_AGENT.md` for full checklist.

### Minimum Requirements
- [ ] No Critical issues
- [ ] No Major issues (or justified exceptions)
- [ ] Follows established patterns
- [ ] Tests included
- [ ] Documentation updated if needed

---

## Gate 8: Integration Verification

### For Full-Stack Features
1. Frontend → API calls succeed
2. API → Database operations work
3. Database → Data persists correctly
4. Round-trip → Changes reflect in UI

### Commands
```bash
# Start all services
npm run dev

# Run integration tests
npm run test:integration
```

---

## Gate Execution Order

```
1. TypeScript Compilation    →  Stop if fails
2. Linting                   →  Stop if errors
3. Unit Tests                →  Stop if fails
4. Migration Check           →  Stop if fails
5. Security Scan             →  Stop if critical issues
6. Integration Tests         →  Stop if fails
7. Browser Testing           →  Stop if major issues
8. Code Review               →  Stop if blocked
                                    ↓
                              ✅ COMPLETE
```

---

## Handling Gate Failures

### If a Gate Fails

1. **Stop immediately** - Don't proceed to next gate
2. **Document the failure** - What failed and why
3. **Fix the issue** - Make necessary changes
4. **Re-run from Gate 1** - Start over from beginning
5. **Repeat until all pass**

### Failure Report Format
```markdown
## Quality Gate Failure Report

### Gate: [Gate Name]
### Status: FAILED

### Error Details
[Paste error output]

### Root Cause
[What caused the failure]

### Fix Applied
[What was done to fix it]

### Verification
[Confirmation that gate now passes]
```

---

## Bypass Policy

**Quality gates cannot be bypassed.**

If a gate seems incorrectly failing:
1. Document why you believe it's a false positive
2. Fix the gate configuration if needed
3. Never skip the gate

---

## Automated Gate Script

Save this as `run-quality-gates.sh`:

```bash
#!/bin/bash
set -e  # Exit on first error

echo "🔍 Running Quality Gates..."

echo "📦 Gate 1: TypeScript Compilation"
cd packages/backend && npm run build
cd ../frontend && npm run build
cd ../..

echo "🧹 Gate 2: Linting"
cd packages/backend && npm run lint
cd ../frontend && npm run lint
cd ../..

echo "🧪 Gate 3: Unit Tests"
cd packages/backend && npm test
cd ../frontend && npm test
cd ../..

echo "🗄️ Gate 4: Database Migration Check"
cd packages/database
npx prisma migrate deploy
cd ../..

echo "🔒 Gate 5: Security Scan"
# Check for PHI in logs
if grep -r "console.log.*ssn\|\.phone\|\.email" packages/backend/src/; then
  echo "❌ Potential PHI logging detected!"
  exit 1
fi

echo "✅ All automated gates passed!"
echo "📝 Proceed to manual browser testing and code review."
```

---

## Gate Status Indicators

| Status | Meaning |
|--------|---------|
| ✅ PASSED | Gate requirements met |
| ❌ FAILED | Gate requirements not met |
| ⏳ RUNNING | Gate check in progress |
| ⏸️ SKIPPED | Gate skipped (NOT ALLOWED) |
| ⚠️ WARNING | Minor issues, can proceed with documentation |
