# Module 7: Self-Scheduling & Waitlist - Testing Findings

**Date**: 2025-11-10
**Status**: In Progress - Backend API Tests
**Backend**: http://localhost:3001 ✅ Running
**Frontend**: http://localhost:5175 ✅ Running

---

## TESTING PROGRESS SUMMARY

### ✅ Completed
1. Verified development servers are running
2. Confirmed database schema is up to date (31 migrations applied)
3. Confirmed seed data was successfully populated:
   - 3 clinicians with varied schedules
   - 3 clinician schedules (acceptNewClients = true)
   - 3 scheduling rules (weekdays only, 24hr notice, 60-day window)
   - 13 active appointment types (all allow online booking)
4. Verified route registrations:
   - Backend: `/api/v1/self-schedule/*` endpoints registered
   - Backend: `/api/v1/waitlist/*` endpoints registered
   - Frontend: `/portal/schedule` route registered

### 🔍 Critical Discovery: Authentication Architecture

**Finding**: This application uses a **dual-authentication system**:
- **Staff Users**: Stored in `users` table with roles (CLINICIAN, ADMINISTRATOR, etc.)
- **Clients (Patients)**: Stored in separate `clients` table with portal authentication

**Impact on Testing**:
The self-scheduling endpoints expect `req.user.clientId`, which is populated by the `authenticateDual` middleware when a **portal client** (not a staff user) authenticates.

**Code Evidence**:
```typescript
// packages/backend/src/controllers/self-scheduling.controller.ts:134
const clientId = req.user?.clientId;
if (!clientId) {
  return res.status(403).json({
    success: false,
    message: 'Client authentication required',
  });
}
```

**Database Models**:
```prisma
// UserRole enum (for staff only)
enum UserRole {
  ADMINISTRATOR
  SUPERVISOR
  CLINICIAN
  BILLING_STAFF
  FRONT_DESK
  ASSOCIATE
  // NOTE: No CLIENT role - clients use separate table!
}

// Separate Client model
model Client {
  id                  String @id @default(uuid())
  medicalRecordNumber String @unique
  firstName           String
  lastName            String
  email               String?
  // ... client-specific fields
}
```

---

## AUTHENTICATION REQUIREMENTS FOR TESTING

### What's Needed
1. **Portal Client Account**: An active client record in the `clients` table
2. **Portal Authentication Token**: A JWT token that includes `clientId` in the payload
3. **Dual Auth Middleware Understanding**: How the middleware distinguishes between staff and portal auth

### Next Steps for API Testing

#### Option 1: Create Portal Client Auth Script ✅ Recommended
Create a script that:
1. Finds or creates a test client in the `clients` table
2. Generates a portal JWT token with `clientId` in payload
3. Uses this token to test all self-scheduling endpoints

#### Option 2: Test via Frontend UI ✅ Easier
1. Create a portal client account via admin interface or database insert
2. Login to portal at http://localhost:5175
3. Navigate to `/portal/schedule`
4. Test self-scheduling flow through UI
5. Verify appointments appear in clinician view

#### Option 3: Check Existing Test Clients
Query the database for existing test clients:
```sql
SELECT id, firstName, lastName, email, medicalRecordNumber
FROM clients
WHERE email LIKE '%test%' OR firstName LIKE '%Test%'
LIMIT 5;
```

---

## API ENDPOINTS REQUIRING CLIENT AUTH

All self-scheduling endpoints require portal client authentication:

```
GET  /api/v1/self-schedule/clinicians              ← Client Auth Required
GET  /api/v1/self-schedule/appointment-types       ← Client Auth Required
GET  /api/v1/self-schedule/available-slots/:id     ← Client Auth Required
POST /api/v1/self-schedule/book                    ← Client Auth Required + clientId
PUT  /api/v1/self-schedule/reschedule/:id          ← Client Auth Required + clientId
DELETE /api/v1/self-schedule/cancel/:id            ← Client Auth Required + clientId
GET  /api/v1/self-schedule/my-appointments         ← Client Auth Required + clientId
```

All waitlist endpoints also require client authentication:
```
POST /api/v1/waitlist                              ← Client Auth Required + clientId
GET  /api/v1/waitlist/my-entries                   ← Client Auth Required + clientId
GET  /api/v1/waitlist/my-offers                    ← Client Auth Required + clientId
POST /api/v1/waitlist/:entryId/accept/:offerId     ← Client Auth Required + clientId
POST /api/v1/waitlist/:entryId/decline/:offerId    ← Client Auth Required + clientId
```

---

## RECOMMENDED TESTING APPROACH

### Phase 1: Frontend UI Testing (Quickest Path) ✅

**Advantages**:
- Tests full end-to-end flow
- Includes UI/UX verification
- Real authentication through portal login
- No custom auth scripts needed

**Steps**:
1. Check if there's an existing portal client account (see SQL query above)
2. If not, create one via admin interface or database script
3. Login to portal at http://localhost:5175
4. Navigate to `/portal/schedule`
5. Follow test scenarios from [CURSOR_MODULE_7_TESTING_GUIDE.md](CURSOR_MODULE_7_TESTING_GUIDE.md)

### Phase 2: Backend API Testing (After Portal Auth Understanding)

**Requirements**:
1. Understand portal JWT token structure and signing secret
2. Create test script that generates valid portal tokens
3. Test each endpoint with proper authentication
4. Verify database state changes

**Files to Investigate**:
- `packages/backend/src/middleware/dualAuth.ts` - Dual authentication logic
- `packages/backend/src/middleware/portalAuth.ts` - Portal-specific auth (if exists)
- Portal login/authentication endpoints

---

## CRITICAL FINDINGS (From Previous Analysis)

### ⚠️  Finding #1: Notifications NOT Implemented
**Evidence**: TODO comments in self-scheduling.controller.ts

**Lines**:
- Line 258-259: `// TODO: Send confirmation email/notification`
- Line 426-427: `// TODO: Send reschedule notification`
- Line 545-546: `// TODO: Send cancellation notification`

**Impact**:
- NO email/SMS confirmations sent to clients
- NO email/SMS notifications sent to clinicians
- NO waitlist offer notifications
- Appointments are created but parties must manually check the system

**Recommendation**: Document as known limitation. Implement notifications as Phase 2 feature.

---

### ⚠️  Finding #2: Approval Workflow Configuration

**Current State**: `autoConfirm` NOT set in seed data

**Default Behavior** (from scheduling-rules.service.ts:356):
```typescript
autoConfirm: false  // Appointments require manual approval
```

**Result**:
- Client bookings create appointments with status `SCHEDULED` (pending approval)
- Clinicians must manually approve to change status to `CONFIRMED`
- No auto-confirmation without updating scheduling rules

**To Enable Auto-Confirmation**:
```sql
UPDATE "SchedulingRule" SET "autoConfirm" = true WHERE "isActive" = true;
```

---

## SEED DATA VERIFICATION ✅

Successfully seeded on 2025-11-10:

**Clinicians** (3):
1. Sarah Smith, PhD - Full-time (Mon-Fri 9AM-5PM)
2. Michael Johnson, LCSW - Part-time evening (Tue-Thu 1PM-8PM)
3. Jennifer Williams, MD - Weekend availability (Thu-Sat 10AM-6PM)

**Scheduling Rules** (3):
- 24-hour minimum advance booking
- 60-day maximum advance booking
- 50-minute slots with 10-minute buffer
- 8 appointments max per day
- Weekdays only (Mon-Fri)
- Auto-confirm: FALSE (requires manual approval)

**Appointment Types** (13 active):
- All types have `allowOnlineBooking: true`
- All types have `isActive: true`

---

## NEXT IMMEDIATE ACTIONS

1. ✅ **Investigate Portal Authentication**
   - Check for existing portal client accounts
   - Understand portal JWT token structure
   - Identify portal login endpoints

2. ✅ **Frontend UI Testing** (Recommended First)
   - Create/use portal client account
   - Login to portal
   - Test self-scheduling flow manually
   - Document results

3. ⏸️ **Backend API Testing** (After Auth Understanding)
   - Create portal auth test script
   - Test all endpoints with proper authentication
   - Verify response formats and database changes

4. ⏸️ **Clinician View Testing**
   - Login as clinician
   - Verify incoming appointment requests are visible
   - Test appointment approval workflow
   - Verify appointment details are complete

5. ⏸️ **Waitlist Testing**
   - Test waitlist join flow
   - Cancel an appointment to trigger matching
   - Verify waitlist offers are created
   - Test accept/decline offer flows

---

## FILES CREATED/MODIFIED

### Created Files:
1. `seed-self-scheduling-data.js` - Seed script for test data ✅
2. `CURSOR_MODULE_7_TESTING_GUIDE.md` - Comprehensive testing guide ✅
3. `test-self-scheduling-api.js` - API test script (incomplete - needs portal auth) ⚠️
4. `MODULE_7_TESTING_FINDINGS.md` - This file ✅

### Key Reference Files:
1. `packages/backend/src/controllers/self-scheduling.controller.ts` - Main controller
2. `packages/backend/src/services/available-slots.service.ts` - Slot calculation logic
3. `packages/backend/src/services/waitlist-integration.service.ts` - Waitlist matching
4. `packages/backend/src/routes/self-scheduling.routes.ts` - Route definitions
5. `packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx` - Client UI (1,892 lines)
6. `packages/backend/src/middleware/dualAuth.ts` - Authentication middleware

---

## TESTING STATUS BY FEATURE

### Self-Scheduling
- [ ] Client can view available clinicians
- [ ] Client can view appointment types
- [ ] Client can view available slots with proper rule enforcement
- [ ] Client can book appointment
- [ ] Client can view their appointments
- [ ] Client can reschedule appointment
- [ ] Client can cancel appointment
- [ ] Slot calculation respects 24-hour minimum
- [ ] Slot calculation applies buffer time
- [ ] Slot calculation enforces weekday-only rule
- [ ] Slot calculation enforces daily appointment limit
- [ ] Double-booking prevention works

### Clinician View
- [ ] Clinician can view incoming appointment requests (SCHEDULED status)
- [ ] Clinician can approve appointments
- [ ] Clinician can see confirmed appointments
- [ ] Clinician view shows all required appointment details

### Waitlist
- [ ] Client can join waitlist
- [ ] Waitlist matching runs on appointment cancellation
- [ ] Waitlist offers are created with match scores
- [ ] Client can view waitlist offers
- [ ] Client can accept offer (creates appointment)
- [ ] Client can decline offer
- [ ] Offers expire after 24 hours

### Notifications (Known Limitation)
- [X] ~~Client receives booking confirmation~~ - NOT IMPLEMENTED
- [X] ~~Clinician receives new appointment alert~~ - NOT IMPLEMENTED
- [X] ~~Client receives reschedule confirmation~~ - NOT IMPLEMENTED
- [X] ~~Client receives cancellation confirmation~~ - NOT IMPLEMENTED
- [X] ~~Waitlist offers trigger notifications~~ - NOT IMPLEMENTED

---

## SUCCESS CRITERIA

### MVP (Minimum Viable Product)
- [X] Backend routes operational
- [X] Database schema complete
- [X] Seed data populated
- [ ] Client can book appointments via portal
- [ ] Clinician can view appointments
- [ ] Double-booking prevented
- [ ] Scheduling rules enforced
- [ ] Reschedule/cancel working

### Full Feature
- [ ] All MVP criteria met
- [ ] Waitlist functional
- [ ] Matching algorithm produces relevant offers
- [ ] Accept/decline offers working
- [ ] Frontend UI fully functional
- [ ] Error handling graceful
- [ ] Loading states implemented

---

## BLOCKERS & DEPENDENCIES

### Current Blocker: Portal Client Authentication ⚠️
**Issue**: Cannot test API endpoints without proper portal client authentication token

**Options to Resolve**:
1. Investigate existing portal auth implementation
2. Test via frontend UI instead (bypasses auth complexity)
3. Create portal client and generate proper token
4. Find existing test scripts that handle portal auth

**Recommended**: Start with frontend UI testing (Option 2) while investigating auth system.

---

## CONTACT & REFERENCES

**Testing Guide**: [CURSOR_MODULE_7_TESTING_GUIDE.md](CURSOR_MODULE_7_TESTING_GUIDE.md)
**Seed Script**: [seed-self-scheduling-data.js](seed-self-scheduling-data.js)
**API Base URL**: http://localhost:3001/api/v1
**Frontend Portal**: http://localhost:5175

---

**Last Updated**: 2025-11-10
**Next Update**: After portal authentication investigation or frontend UI testing

