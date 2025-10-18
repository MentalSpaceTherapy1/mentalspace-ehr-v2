# Bugs Found During Testing - Phase 5 & Sunday Lockout

## Summary
Testing revealed several issues that need to be fixed before the Phase 5 Supervision and Sunday Lockout features can be used in production.

## Critical Bugs

### 1. Missing Database Fields ✅ FIXED
**Issue**: ClinicalNote model was missing unlock tracking fields
**Location**: `packages/database/prisma/schema.prisma`
**Fix Applied**: Added the following fields to ClinicalNote model (lines 873-880):
```prisma
// Sunday Lockout & Unlock Requests
isLocked            Boolean   @default(false)
unlockRequested     Boolean   @default(false)
unlockRequestDate   DateTime?
unlockReason        String?
unlockApprovedBy    String?
unlockApprovalDate  DateTime?
unlockUntil         DateTime?
```
**Next Step**: Run `npx prisma generate` and `npx prisma migrate dev` to apply schema changes

### 2. Missing nodemailer Package ✅ FIXED
**Issue**: nodemailer and @types/nodemailer not installed
**Location**: `packages/backend/package.json`
**Fix Applied**: Installed via npm:
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 3. Missing Prisma Include Clauses
**Issue**: Compliance service and unlock request routes query ClinicalNote without including related data (client, clinician, supervisor)
**Locations**:
- `packages/backend/src/services/compliance.service.ts` (multiple locations)
- `packages/backend/src/routes/unlockRequest.routes.ts` (multiple locations)

**Errors**:
```
Property 'clinician' does not exist on type '{ status: NoteStatus; ... }'
Property 'client' does not exist on type '{ status: NoteStatus; ... }'
Property 'supervisor' does not exist on type '{ status: NoteStatus; ... }'
```

**Fix Required**: Add include clauses to all Prisma queries in both files

**Example Fix for compliance.service.ts line 62-79**:
```typescript
// BEFORE (broken):
const notesToLock = await prisma.clinicalNote.findMany({
  where: {
    status: { in: ['DRAFT', 'PENDING_COSIGN'] },
    signedDate: null,
    sessionDate: { lt: cutoffDate },
    isLocked: false,
  },
});

// AFTER (fixed):
const notesToLock = await prisma.clinicalNote.findMany({
  where: {
    status: { in: ['DRAFT', 'PENDING_COSIGN'] },
    signedDate: null,
    sessionDate: { lt: cutoffDate },
    isLocked: false,
  },
  include: {
    clinician: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        supervisorId: true,
        supervisor: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    },
    client: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
  },
});
```

**All Locations Needing This Fix**:

#### compliance.service.ts:
1. Line 62-79: `sundayLockout()` - notesToLock query
2. Line 233-257: `sendNoteReminders()` - upcomingNotes query
3. Line 360-378: `getComplianceStatistics()` - overdue, locked, pending queries

#### unlockRequest.routes.ts:
1. Line 18-51: GET `/` endpoint - superviseeUnlockRequests and allUnlockRequests queries
2. Line 76-103: GET `/` endpoint - adminUnlockRequests query
3. Line 150-224: POST `/:noteId/request` endpoint - note query
4. Line 269-320: POST `/:noteId/approve` endpoint - note query
5. Line 372-416: POST `/:noteId/deny` endpoint - note query
6. Line 454-475: GET `/stats` endpoint - requests query

### 4. Missing Email Template 'to' Parameter
**Issue**: Email service calls missing the `to` parameter
**Locations**:
- `packages/backend/src/routes/unlockRequest.routes.ts` lines 214, 312, 408
- `packages/backend/src/services/compliance.service.ts` lines 137, 160, 186, 204, 276, 293

**Error**:
```
Argument of type '{ subject: string; html: string; }' is not assignable to parameter of type 'EmailOptions'.
```

**Fix Required**: Add `to` parameter to all sendEmail() calls

**Example Fix**:
```typescript
// BEFORE (broken):
await sendEmail({
  subject: `Unlock Request: ${note.noteType}`,
  html: emailTemplate.html,
});

// AFTER (fixed):
await sendEmail({
  to: note.clinician.email,
  subject: `Unlock Request: ${note.noteType}`,
  html: emailTemplate.html,
});
```

### 5. Typo in compliance.service.ts
**Issue**: Undefined variable `urgency` used instead of `reminder.urgency`
**Location**: `packages/backend/src/services/compliance.service.ts` line 293
**Error**: `Cannot find name 'urgency'`

**Fix**:
```typescript
// Line 293 - BEFORE:
urgency,

// Line 293 - AFTER:
urgency: 'REMINDER',
```

## Non-Critical Issues

### 6. Pre-Existing TypeScript Errors
The codebase has 70+ pre-existing TypeScript errors in other modules (not related to Phase 5 or Sunday Lockout). These should be addressed separately but don't block the new features.

**Examples**:
- appointment.controller.ts - type mismatches
- billing.controller.ts - unknown properties
- client.controller.ts - type mismatches
- user.service.ts - UserRole enum conflicts
- waitlist.service.ts - relation type issues

## Testing Checklist

Once the above fixes are applied:

### Backend Tests:
- [ ] Run `npx prisma generate` to regenerate Prisma client with new fields
- [ ] Run `npx prisma migrate dev --name add_unlock_fields` to create migration
- [ ] Run `npx tsc --noEmit` to verify TypeScript compilation
- [ ] Test compliance service manual trigger
- [ ] Test email service in development mode (console logging)
- [ ] Test unlock request API endpoints with Postman/Thunder Client
- [ ] Test supervision routes API endpoints

### Frontend Tests:
- [ ] Run `npm run build` or `tsc` to test frontend compilation
- [ ] Test UnlockRequestModal component
- [ ] Test UnlockRequestManagement page
- [ ] Test ClinicalNoteDetail locked state UI
- [ ] Test SupervisionSessionsList page
- [ ] Test SupervisionSessionForm page
- [ ] Test SupervisionHoursDashboard page

### Integration Tests:
- [ ] Create a test note and let it age past 3 days
- [ ] Manually trigger Sunday lockout: Call the export function in compliance.service.ts
- [ ] Verify note is locked
- [ ] Request unlock via frontend
- [ ] Approve unlock request
- [ ] Verify note unlocks for 24 hours
- [ ] Create supervision session
- [ ] View supervision hours dashboard
- [ ] Test co-sign queue

## Recommended Fix Priority

1. **HIGH**: Fix missing include clauses (Bug #3) - blocks all functionality
2. **HIGH**: Fix missing email 'to' parameter (Bug #4) - blocks email notifications
3. **HIGH**: Run Prisma generate and migrate (Bug #1) - blocks database operations
4. **MEDIUM**: Fix urgency typo (Bug #5) - minor runtime error
5. **LOW**: Address pre-existing TypeScript errors (Bug #6) - doesn't block new features

## Estimated Fix Time
- Bugs #1-2: Already fixed ✅
- Bug #3 (Include clauses): ~30-45 minutes (14 locations to update)
- Bug #4 (Email 'to' parameter): ~15 minutes (8 locations to update)
- Bug #5 (Urgency typo): ~2 minutes
- **Total**: ~1 hour to get features working

## Notes
- All new features are architecturally sound
- The bugs are straightforward TypeScript/Prisma issues
- No logic or design flaws found
- Once fixed, features should work as intended
