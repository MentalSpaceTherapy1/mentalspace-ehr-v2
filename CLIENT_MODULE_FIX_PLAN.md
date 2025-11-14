# Client Module - Comprehensive Fix Plan

**Date**: November 13, 2025
**Priority**: P0 (Critical - Blocking Multiple Features)
**Test Results Reference**: CLIENT_MODULE_TEST_RESULTS.md

---

## Executive Summary

Based on Cursor AI's comprehensive testing, there are **3 critical issues** blocking the Client Management module:

1. **P0**: GET `/clients/:id` returns 500 error (blocks 3 test suites)
2. **P1**: POST `/clients` returns 400 validation error (blocks client creation)
3. **P2**: Incomplete error messaging (low priority UX improvement)

**Impact**:
- ❌ **Cannot view client details** (Test 2.1)
- ❌ **Cannot edit existing clients** (Test 4.1)
- ❌ **Cannot create new clients** (Test 3.3)
- ⚠️ **6 test suites blocked** from running due to API errors

---

## Issue Analysis

### Issue #1: GET `/clients/:id` Returns 500 Error (P0)

**Affected Tests**:
- Test 2.1: Client Detail Page (FAIL)
- Test 2.2: Client Detail Page Tabs (BLOCKED)
- Test 2.3: Client Detail Page Actions (BLOCKED)
- Test 4.1: Edit Client Form (PARTIAL)
- Test 4.2: Form Field Population (BLOCKED)
- Test 4.3: Form Update Submission (BLOCKED)

**Error Details**:
```
GET https://api.mentalspaceehr.com/api/v1/clients/fd871d2a-15ce-47df-bdda-2394b14730a4
HTTP Status: 500 Internal Server Error
Frontend Error: "Client Not Found"
```

**Root Cause Hypotheses** (in order of likelihood):

1. **Prisma Query Error** (90% probability)
   - Similar to previous `deliveryLog`/`reportSchedule` errors
   - Backend is trying to include non-existent database relationships
   - Prisma throwing error when fetching related data

2. **Missing Database Relationships** (80% probability)
   - Client detail query includes joins to missing tables
   - Foreign keys exist but referenced tables don't
   - Examples: `clientProviders`, `clientDiagnoses`, `outcomeMeasures`

3. **Database Column Mismatch** (60% probability)
   - Prisma schema expects columns that don't exist in database
   - Similar to the `messages` table schema mismatch we fixed

4. **Backend Service Crash** (40% probability)
   - Unhandled exception in client detail route handler
   - Missing null checks for optional relationships
   - TypeScript type errors at runtime

---

### Issue #2: POST `/clients` Returns 400 Validation Error (P1)

**Affected Tests**:
- Test 3.3: Create Client Form Submission (FAIL)

**Error Details**:
```
POST https://api.mentalspaceehr.com/api/v1/clients
HTTP Status: 400 Bad Request
Error Message: "Validation failed"
```

**Form Data Submitted**:
```javascript
{
  firstName: "Test",
  lastName: "Client",
  dateOfBirth: "1990-01-15",
  primaryPhone: "555-123-4567",
  email: "test.client@example.com",
  city: "Los Angeles",
  state: "California",
  zipCode: "90001",
  primaryTherapistId: ??? // Unknown format
}
```

**Root Cause Hypotheses** (in order of likelihood):

1. **Primary Therapist ID Format Mismatch** (95% probability)
   - Frontend dropdown may be sending therapist display name ("Emily Rodriguez, AMFT")
   - Backend expects UUID format ("123e4567-e89b-12d3-a456-426614174000")
   - Validation fails because string name doesn't match UUID type

2. **Missing Required Fields** (70% probability)
   - Backend requires fields that frontend doesn't mark as required
   - Examples: `preferredLanguage`, `emergencyContact`, `insuranceProvider`
   - Error message should specify which fields are missing

3. **Data Format Validation** (60% probability)
   - Phone number format mismatch (frontend: "555-123-4567", backend expects: "5551234567")
   - Date format mismatch (frontend: "1990-01-15", backend expects: ISO 8601 timestamp)
   - Email validation difference between frontend and backend

4. **Enum Value Mismatch** (50% probability)
   - State value format mismatch (frontend: "California", backend expects: "CA")
   - Status/gender/race enum values don't match Prisma schema

---

### Issue #3: Poor Error Messaging (P2 - UX Issue)

**Problems**:
- Error messages don't specify which field(s) failed validation
- Generic "Validation failed" message not helpful for debugging
- Frontend doesn't display field-level validation errors
- Users cannot self-correct validation issues

---

## Detailed Fix Plan

### PHASE 1: Investigation & Diagnosis (30 minutes)

#### Task 1.1: Check Backend Logs for GET `/clients/:id` Error
**Priority**: P0
**Estimated Time**: 10 minutes

**Steps**:
1. Tail CloudWatch logs for the backend service:
   ```bash
   aws logs tail /ecs/mentalspace-backend --follow --region us-east-1 --filter-pattern "clients"
   ```

2. Search for error logs related to client detail endpoint:
   ```bash
   aws logs filter-log-events \
     --log-group-name /ecs/mentalspace-backend \
     --filter-pattern "GET /api/v1/clients" \
     --region us-east-1 \
     --start-time $(date -u -d '1 hour ago' +%s)000
   ```

3. Look for specific error patterns:
   - `PrismaClientKnownRequestError`
   - `Cannot read property 'X' of undefined`
   - `Unknown field name`
   - `Relation 'X' not found`

**Expected Findings**:
- Exact Prisma error message
- Which relationship/field is causing the crash
- Stack trace showing the exact line in backend code

---

#### Task 1.2: Inspect Client Detail API Route
**Priority**: P0
**Estimated Time**: 10 minutes

**Steps**:
1. Find the client detail route handler:
   ```bash
   grep -r "router.get.*clients/:id" packages/backend/src/routes/
   ```

2. Examine the Prisma query in the route handler
3. Identify all `include` relationships being fetched
4. Compare relationships to database tables (from our previous audit)

**Files to Check**:
- `packages/backend/src/routes/clients.ts` (or similar)
- `packages/backend/src/controllers/clientController.ts`
- `packages/backend/src/services/clientService.ts`

**What to Look For**:
```typescript
// Example problematic code:
const client = await prisma.client.findUnique({
  where: { id: clientId },
  include: {
    appointments: true,
    diagnoses: true,        // ← May not have table
    outcomeMeasures: true,  // ← May not have table
    providers: true,        // ← May not have table
    // ... etc
  }
});
```

---

#### Task 1.3: Check Backend Logs for POST `/clients` Error
**Priority**: P1
**Estimated Time**: 10 minutes

**Steps**:
1. Search for validation error logs:
   ```bash
   aws logs filter-log-events \
     --log-group-name /ecs/mentalspace-backend \
     --filter-pattern "POST /api/v1/clients" \
     --region us-east-1
   ```

2. Look for Zod/Joi validation errors
3. Check request body being received by backend

**Expected Findings**:
- Exact validation error message
- Which field(s) failed validation
- Expected vs actual data format

---

### PHASE 2: Fix GET `/clients/:id` Error (P0)

#### Task 2.1: Identify Problematic Prisma Relationships
**Priority**: P0
**Estimated Time**: 15 minutes

**Steps**:
1. Read the client detail route handler
2. List all `include` relationships
3. Cross-reference with our database audit (146 tables created)
4. Identify relationships that reference missing/incompatible tables

**Action**:
Create a mapping of:
```
CURRENT RELATIONSHIPS → DATABASE STATUS
--------------------------------------------
appointments         → ✅ Table exists
diagnoses            → ❌ May be clientDiagnoses table
outcomeMeasures      → ❌ May be outcome_measures table
providers            → ❌ May be clientProviders table
```

---

#### Task 2.2: Fix Prisma Query to Remove/Update Invalid Relationships
**Priority**: P0
**Estimated Time**: 20 minutes

**Steps**:
1. Locate the client detail route file:
   ```bash
   find packages/backend/src -name "*client*" -type f | grep -E "\.(ts|js)$"
   ```

2. Find the `findUnique` or `findFirst` query for client detail

3. **Option A**: Remove problematic includes temporarily:
   ```typescript
   // BEFORE (causing 500 error)
   const client = await prisma.client.findUnique({
     where: { id: clientId },
     include: {
       appointments: true,
       diagnoses: true,           // ← REMOVE
       outcomeMeasures: true,     // ← REMOVE
       providers: true,           // ← REMOVE
       insurances: true,
       emergencyContacts: true,
     }
   });

   // AFTER (minimal safe query)
   const client = await prisma.client.findUnique({
     where: { id: clientId },
     include: {
       appointments: true,
       insurances: true,
       emergencyContacts: true,
       assignedTherapist: true,   // Just the primary therapist
     }
   });
   ```

4. **Option B**: Use correct relationship names:
   ```typescript
   const client = await prisma.client.findUnique({
     where: { id: clientId },
     include: {
       appointments: true,
       clientDiagnoses: true,     // ← Correct table name
       outcomeMeasures: true,     // ← Check if snake_case
       clientProviders: true,     // ← Correct table name
     }
   });
   ```

5. Check Prisma schema to verify correct relationship names:
   ```bash
   grep -A 20 "model Client {" packages/database/prisma/schema.prisma
   ```

---

#### Task 2.3: Add Error Handling to Client Detail Route
**Priority**: P0
**Estimated Time**: 10 minutes

**Steps**:
1. Wrap Prisma query in try-catch
2. Return proper 404 if client not found
3. Return proper 500 with logging if Prisma error
4. Add null checks for optional relationships

**Example**:
```typescript
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        // ... safe includes only
      }
    });

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        message: `No client found with ID: ${id}`
      });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);

    // Log to CloudWatch
    logger.error('Client detail fetch failed', {
      clientId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch client details'
    });
  }
};
```

---

### PHASE 3: Fix POST `/clients` Validation Error (P1)

#### Task 3.1: Inspect Client Creation Route & Validation Schema
**Priority**: P1
**Estimated Time**: 15 minutes

**Steps**:
1. Find the client creation route:
   ```bash
   grep -r "router.post.*clients" packages/backend/src/routes/
   ```

2. Examine validation schema (Zod/Joi/class-validator)
3. Check required fields vs optional fields
4. Identify data transformation logic

**Files to Check**:
- `packages/backend/src/routes/clients.ts`
- `packages/backend/src/validators/clientValidator.ts`
- `packages/backend/src/dto/createClientDto.ts`

---

#### Task 3.2: Test Client Creation with Direct API Call
**Priority**: P1
**Estimated Time**: 10 minutes

**Steps**:
1. Get a fresh auth token:
   ```bash
   curl -X POST https://api.mentalspaceehr.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"ejoseph@chctherapy.com","password":"Bing@@0912"}' \
     | jq -r '.token'
   ```

2. Test client creation with minimal required fields:
   ```bash
   TOKEN="your-token-here"

   curl -X POST https://api.mentalspaceehr.com/api/v1/clients \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "Client",
       "dateOfBirth": "1990-01-15"
     }' | jq
   ```

3. Add fields one by one to identify which field causes validation error

4. Test with UUID for primaryTherapistId:
   ```bash
   curl -X POST https://api.mentalspaceehr.com/api/v1/clients \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "Client",
       "dateOfBirth": "1990-01-15",
       "primaryTherapistId": "123e4567-e89b-12d3-a456-426614174000"
     }' | jq
   ```

---

#### Task 3.3: Fix Primary Therapist ID Mismatch (Most Likely Issue)
**Priority**: P1
**Estimated Time**: 15 minutes

**Problem**: Frontend dropdown sends therapist name instead of UUID

**Solution A - Fix Frontend**:
1. Locate the therapist dropdown in ClientForm component:
   ```bash
   find packages/frontend/src -name "*ClientForm*" -type f
   ```

2. Check the dropdown value being sent:
   ```typescript
   // WRONG (sending display name)
   <select name="primaryTherapistId">
     <option value="Emily Rodriguez, AMFT">Emily Rodriguez, AMFT</option>
   </select>

   // CORRECT (sending UUID)
   <select name="primaryTherapistId">
     <option value="123e4567-e89b-12d3-a456-426614174000">
       Emily Rodriguez, AMFT
     </option>
   </select>
   ```

3. Verify therapist data structure from API:
   ```bash
   curl -X GET https://api.mentalspaceehr.com/api/v1/users \
     -H "Authorization: Bearer $TOKEN" | jq
   ```

4. Update dropdown to use correct value mapping

**Solution B - Fix Backend Validation**:
1. Make `primaryTherapistId` optional if it's currently required
2. Add better error message for UUID validation
3. Consider accepting therapist name and looking up UUID on backend

---

#### Task 3.4: Improve Validation Error Messages
**Priority**: P1
**Estimated Time**: 15 minutes

**Steps**:
1. Update validation error response to include field-level errors:
   ```typescript
   // BEFORE (not helpful)
   res.status(400).json({ error: 'Validation failed' });

   // AFTER (helpful)
   res.status(400).json({
     error: 'Validation failed',
     message: 'Please check the following fields',
     fields: {
       primaryTherapistId: 'Must be a valid UUID',
       email: 'Invalid email format',
       dateOfBirth: 'Must be in YYYY-MM-DD format'
     }
   });
   ```

2. If using Zod, leverage built-in error formatting:
   ```typescript
   import { z } from 'zod';

   const clientSchema = z.object({
     firstName: z.string().min(1, 'First name is required'),
     lastName: z.string().min(1, 'Last name is required'),
     primaryTherapistId: z.string().uuid('Must be a valid therapist ID'),
     email: z.string().email('Invalid email format').optional(),
   });

   try {
     const validated = clientSchema.parse(req.body);
   } catch (error) {
     if (error instanceof z.ZodError) {
       return res.status(400).json({
         error: 'Validation failed',
         fields: error.flatten().fieldErrors
       });
     }
   }
   ```

3. Update frontend to display field-level errors

---

### PHASE 4: Testing & Deployment

#### Task 4.1: Local Testing
**Priority**: P0
**Estimated Time**: 15 minutes

**Steps**:
1. Build backend with fixes:
   ```bash
   cd packages/backend
   npm run build
   ```

2. Test locally if possible, or proceed to deployment

3. Create test scripts:
   ```bash
   # Test GET /clients/:id
   curl -X GET https://api.mentalspaceehr.com/api/v1/clients/fd871d2a-15ce-47df-bdda-2394b14730a4 \
     -H "Authorization: Bearer $TOKEN" | jq

   # Test POST /clients
   curl -X POST https://api.mentalspaceehr.com/api/v1/clients \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d @test-client-data.json | jq
   ```

---

#### Task 4.2: Deploy Backend Fixes
**Priority**: P0
**Estimated Time**: 10 minutes

**Steps**:
1. Build Docker image with fixes
2. Push to ECR
3. Update ECS service
4. Monitor deployment logs

**Commands**:
```bash
# From project root
./deploy.sh
```

Or manually:
```bash
# Build Docker image
docker build -f packages/backend/Dockerfile -t mentalspace-backend:latest .

# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 706704660887.dkr.ecr.us-east-1.amazonaws.com
docker tag mentalspace-backend:latest 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Force new deployment
aws ecs update-service \
  --cluster mentalspace-ehr-dev \
  --service mentalspace-backend-dev \
  --force-new-deployment \
  --region us-east-1
```

---

#### Task 4.3: Verify Fixes with API Testing
**Priority**: P0
**Estimated Time**: 15 minutes

**Steps**:
1. Wait for deployment to complete (2-3 minutes)

2. Test GET `/clients/:id` endpoint:
   ```bash
   # Get auth token
   TOKEN=$(curl -s -X POST https://api.mentalspaceehr.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"ejoseph@chctherapy.com","password":"Bing@@0912"}' \
     | jq -r '.token')

   # Test client detail (should return 200, not 500)
   curl -X GET https://api.mentalspaceehr.com/api/v1/clients/fd871d2a-15ce-47df-bdda-2394b14730a4 \
     -H "Authorization: Bearer $TOKEN" \
     -w "\nHTTP Status: %{http_code}\n"
   ```

3. Test POST `/clients` endpoint:
   ```bash
   # Test client creation (should return 201, not 400)
   curl -X POST https://api.mentalspaceehr.com/api/v1/clients \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Integration",
       "lastName": "Test",
       "dateOfBirth": "1985-05-20",
       "email": "integration.test@example.com",
       "primaryPhone": "5551234567",
       "primaryTherapistId": "<VALID_UUID_HERE>"
     }' \
     -w "\nHTTP Status: %{http_code}\n"
   ```

4. Verify responses:
   - ✅ GET should return HTTP 200 with client data
   - ✅ POST should return HTTP 201 with created client
   - ✅ No 500 or 400 errors

---

#### Task 4.4: Browser Testing with Cursor AI
**Priority**: P0
**Estimated Time**: 20 minutes

**Steps**:
1. Ask Cursor to re-run failed tests:
   - Test 2.1: Client Detail Page
   - Test 3.3: Create Client Form
   - Test 4.1: Edit Client Form

2. Ask Cursor to run blocked tests (now unblocked):
   - Test 2.2: Client Detail Page Tabs
   - Test 2.3: Client Detail Page Actions
   - Test 4.2: Form Field Population
   - Test 4.3: Form Update Submission

3. Verify all tests pass

---

### PHASE 5: Documentation & Monitoring

#### Task 5.1: Document Fixes
**Priority**: P2
**Estimated Time**: 10 minutes

**Steps**:
1. Create `CLIENT_MODULE_FIXES_SUMMARY.md`
2. Document:
   - Root causes identified
   - Fixes applied
   - Files modified
   - API testing results
   - Retest results

---

#### Task 5.2: Update Test Results
**Priority**: P2
**Estimated Time**: 5 minutes

**Steps**:
1. Update `CLIENT_MODULE_TEST_RESULTS.md` with new test results
2. Mark previously failing tests as PASS
3. Update test completion percentage

---

## Implementation Order

### Critical Path (Must Complete First):
1. ✅ Task 1.1: Check backend logs for GET error (10 min)
2. ✅ Task 1.2: Inspect client detail route (10 min)
3. ✅ Task 2.1: Identify problematic relationships (15 min)
4. ✅ Task 2.2: Fix Prisma query (20 min)
5. ✅ Task 2.3: Add error handling (10 min)
6. ✅ Task 4.2: Deploy backend fixes (10 min)
7. ✅ Task 4.3: Verify fixes with API testing (15 min)

**Total Critical Path Time**: ~90 minutes

### Secondary Path (Can Run in Parallel):
1. Task 1.3: Check backend logs for POST error (10 min)
2. Task 3.1: Inspect client creation route (15 min)
3. Task 3.2: Test client creation API (10 min)
4. Task 3.3: Fix Primary Therapist ID (15 min)
5. Task 3.4: Improve error messages (15 min)

**Total Secondary Path Time**: ~65 minutes

### Verification Path (After Deployment):
1. Task 4.4: Browser testing with Cursor (20 min)
2. Task 5.1: Document fixes (10 min)
3. Task 5.2: Update test results (5 min)

**Total Verification Time**: ~35 minutes

---

## Total Estimated Time

**Best Case**: 90 minutes (if only GET error needs fixing)
**Typical Case**: 155 minutes (~2.5 hours)
**Worst Case**: 190 minutes (~3 hours) if multiple issues found

---

## Success Criteria

### Phase 1 Complete:
- ✅ CloudWatch logs show exact error for GET `/clients/:id`
- ✅ CloudWatch logs show exact error for POST `/clients`
- ✅ Identified problematic Prisma relationships
- ✅ Identified validation mismatch fields

### Phase 2 Complete:
- ✅ GET `/clients/:id` returns HTTP 200 (not 500)
- ✅ Client detail data includes all safe relationships
- ✅ Proper error handling prevents server crashes

### Phase 3 Complete:
- ✅ POST `/clients` returns HTTP 201 (not 400)
- ✅ Client creation succeeds with valid data
- ✅ Validation errors show field-level details

### Phase 4 Complete:
- ✅ All API tests pass (GET and POST)
- ✅ Cursor AI re-tests pass for Tests 2.1, 3.3, 4.1
- ✅ Previously blocked tests can now run

### Phase 5 Complete:
- ✅ Fixes documented
- ✅ Test results updated
- ✅ No console errors in browser
- ✅ All Client Module features functional

---

## Risk Mitigation

### Risk #1: Multiple Prisma Relationships Are Broken
**Mitigation**: Start with minimal `include` (no relationships), then add one at a time

### Risk #2: Frontend Has Multiple Validation Issues
**Mitigation**: Create a test harness to validate all form fields individually

### Risk #3: Database Schema Requires Additional Migrations
**Mitigation**: Have database migration scripts ready (similar to previous 42-table fix)

### Risk #4: Fixes Break Other Modules
**Mitigation**:
- Test only client-specific endpoints
- Monitor CloudWatch for errors in other services
- Keep rollback Docker image ready

---

## Rollback Plan

If fixes cause regressions:

1. **Immediate Rollback**:
   ```bash
   # Get previous task definition
   aws ecs describe-services \
     --cluster mentalspace-ehr-dev \
     --services mentalspace-backend-dev \
     --region us-east-1

   # Rollback to previous image
   aws ecs update-service \
     --cluster mentalspace-ehr-dev \
     --service mentalspace-backend-dev \
     --task-definition mentalspace-backend-dev:PREVIOUS_REVISION \
     --region us-east-1
   ```

2. **Revert Code Changes**:
   ```bash
   git log --oneline | head -5
   git revert <commit-hash>
   git push
   ```

---

## Next Steps After Completion

Once all Client Module fixes are complete:

1. **Run Full Regression Test Suite**:
   - Ask Cursor to test all 200+ client module tests
   - Verify no new issues introduced

2. **Test Other Modules**:
   - Module 2: Appointments
   - Module 3: Group Sessions (we just added routes!)
   - Module 4: Clinical Notes
   - Module 7: Waitlist
   - Module 8: Dashboard
   - Module 9: HR/Communication/Compliance

3. **Performance Testing**:
   - Load test client list with 1000+ clients
   - Test pagination performance
   - Test search performance with various filters

4. **Security Audit**:
   - Verify proper authorization on all client endpoints
   - Test RBAC (can therapists only see their clients?)
   - Test data sanitization (XSS prevention)

---

## Questions for User

Before starting implementation:

1. **Priority**: Should we fix GET error first (unblocks 6 tests) or POST error first (enables client creation)?
   - Recommendation: Fix GET first (higher impact)

2. **Deployment Window**: Is there a preferred time to deploy (to minimize user disruption)?
   - Recommendation: Deploy immediately if no users are actively using the system

3. **Testing Depth**: Should we fix all issues and deploy once, or fix+deploy+test iteratively?
   - Recommendation: Fix GET error → deploy → verify → fix POST error → deploy → verify

4. **Frontend Changes**: If frontend changes are needed (e.g., therapist dropdown), should we deploy frontend too?
   - Recommendation: Yes, deploy both if needed

---

## Appendix A: File Locations (Estimated)

Based on typical project structure:

**Backend Routes**:
- `packages/backend/src/routes/clients.ts` or `clientRoutes.ts`
- `packages/backend/src/routes/index.ts` (main router)

**Backend Controllers**:
- `packages/backend/src/controllers/clientController.ts`
- `packages/backend/src/controllers/clientsController.ts`

**Backend Services**:
- `packages/backend/src/services/clientService.ts`

**Backend Validators**:
- `packages/backend/src/validators/clientValidator.ts`
- `packages/backend/src/dto/createClientDto.ts`

**Frontend Forms**:
- `packages/frontend/src/pages/Clients/ClientForm.tsx`
- `packages/frontend/src/components/Clients/CreateClientForm.tsx`

**Prisma Schema**:
- `packages/database/prisma/schema.prisma`

---

## Appendix B: Common Prisma Errors

**Error**: `Unknown field name`
```
Error: Unknown field name 'deliveryLog' in include
```
**Fix**: Remove invalid relationship from `include`

**Error**: `Relation not found`
```
Error: Relation 'clientDiagnoses' not found
```
**Fix**: Check Prisma schema for correct relationship name

**Error**: `Invalid value for argument`
```
Error: Invalid value for argument 'where': expected UUID, got string
```
**Fix**: Ensure UUID format is correct

---

## Appendix C: Testing Checklist

After all fixes are deployed, verify:

- [ ] GET `/clients` returns 200 (client list)
- [ ] GET `/clients/:id` returns 200 (client detail)
- [ ] POST `/clients` returns 201 (create client)
- [ ] PUT `/clients/:id` returns 200 (update client)
- [ ] GET `/clients/duplicates` returns 200 (duplicate detection)
- [ ] Client detail page loads in browser
- [ ] Client edit form loads with data
- [ ] Client creation form submits successfully
- [ ] All tabs on client detail page work
- [ ] Search and filters work on client list
- [ ] No console errors in browser
- [ ] No 500 errors in CloudWatch logs

---

**END OF FIX PLAN**
