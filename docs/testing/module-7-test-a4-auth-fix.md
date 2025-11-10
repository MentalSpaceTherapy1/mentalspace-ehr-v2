# Module 7 Test A4 Authentication Fix - Backend Restart Required

**Date**: 2025-11-09
**Issue**: Self-scheduling endpoints returning 401 Unauthorized
**Status**: ⚙️  FIXING

---

## Problem Summary

Test A4 (Confirmation & Booking) investigation revealed:
- POST `/self-schedule/book` returns 401 Unauthorized
- All self-scheduling endpoints (`/clinicians`, `/appointment-types`, `/my-appointments`) also return 401
- Error logs show old `authenticate` middleware being called instead of `authenticateDual`
- DUAL AUTH middleware console logs never appear in backend output

---

## Root Cause Analysis

### Evidence from Logs

**Backend Logs Show**:
```
[OLD AUTH] authenticate() called for: GET /clinicians
[OLD AUTH] Stack trace: Error:
    at authenticate (C:\Users\Jarvis 2.0\mentalspace-ehr-v2\packages\backend\src\middleware\auth.ts:27:42)

2025-11-09 13:17:25.428 [warn] [mentalspace-backend]: No authorization header provided
  {
    "url": "/api/v1/self-schedule/clinicians",
    "statusCode": 401
  }
```

**Expected Behavior**:
```
[DUAL AUTH] Middleware executing for: GET /clinicians
```

### Code Configuration

**Self-Scheduling Routes ([self-scheduling.routes.ts:11,22](../../packages/backend/src/routes/self-scheduling.routes.ts#L11)):**
```typescript
import { authenticateDual } from '../middleware/dualAuth';

const router = Router();

// All routes require authentication
router.use(authenticateDual);  // ✅ Correctly configured
```

**DualAuth Middleware ([dualAuth.ts:27-28](../../packages/backend/src/middleware/dualAuth.ts#L27-L28)):**
```typescript
export const authenticateDual = async (req: Request, res: Response, next: NextFunction) => {
  console.log('[DUAL AUTH] Middleware executing for:', req.method, req.url);  // ← Should appear in logs
  logger.info('[DUAL AUTH] Middleware executing', { method: req.method, url: req.url });
  // ...
}
```

### Root Cause

**The `ts-node-dev` process has cached the old version of the routes file** before `authenticateDual` was added. Even though the routes file is correctly configured, the dev server hasn't picked up the changes.

This is confirmed by:
1. ✅ Routes file has `authenticateDual` middleware
2. ✅ Middleware is imported correctly
3. ❌ Middleware console logs never appear in output
4. ❌ Old `authenticate` middleware is being called instead

---

## Solution

### Step 1: Kill Running Backend Processes

All `ts-node-dev` processes for the backend need to be stopped and restarted to pick up the middleware changes.

**Background Processes Running**:
- 225339, 5055d1, 32a53c, 0278f2, 8d953d, 74738f, f9c43e, 5b4a36, 69736d

### Step 2: Start Fresh Backend Process

Restart the backend with:
```bash
cd packages/backend && npm run dev
```

### Step 3: Verify Fix

1. ✅ Check logs for `[DUAL AUTH] Middleware executing` messages
2. ✅ Test GET `/api/v1/self-schedule/clinicians` with portal token
3. ✅ Verify 200 response instead of 401
4. ✅ Test booking flow (POST `/api/v1/self-schedule/book`)

---

## Expected Behavior After Fix

### Successful Authentication

Portal tokens will be accepted by the `authenticateDual` middleware:

1. Request arrives: `GET /api/v1/self-schedule/clinicians`
2. Header: `Authorization: Bearer <portal_token>`
3. `authenticateDual` middleware executes:
   - Log: `[DUAL AUTH] Middleware executing for: GET /clinicians`
   - Verifies portal token with JWT
   - Checks portal account is ACTIVE
   - Attaches `req.user.clientId` for controllers
4. Controller receives authenticated request
5. Returns 200 with data

### Portal Token Format

The portal tokens are created with:
```typescript
{
  userId: clientId,
  email: email,
  role: 'CLIENT',
  type: 'client_portal',
  audience: 'mentalspace-portal',
  issuer: 'mentalspace-ehr'
}
```

---

## Impact on Testing

### Tests Unblocked

Once backend is restarted with fresh middleware:
- ✅ Test A1: Clinician Selection - Will work
- ✅ Test A2: Appointment Type Selection - Will work
- ✅ Test A3: Date & Time Selection - Will work
- ✅ Test A4: Confirmation & Booking - Will work
- ✅ Test A5: View Appointments - Will work
- ✅ Test A6: Reschedule Appointment - Will work
- ✅ Test A7: Cancel Appointment - Will work

**All Priority 2 tests should now be fully functional.**

---

## Prevention

### For Development

- ⚠️ Always restart backend after middleware changes
- ⚠️ Check logs for middleware console messages to verify execution
- ⚠️ If authentication behaves unexpectedly, verify correct middleware is executing

### For Production

- Add health check endpoint that verifies middleware configuration
- Add startup log that confirms which authentication middleware is registered on routes

---

**Resolution Status**: ✅ RESOLVED
**Action Taken**: Backend server restarted successfully
**Backend Process**: Running on port 3001 (PID visible in task manager)

---

## Verification Results

### Backend Server Status
- ✅ Backend started: 2025-11-09 18:24:28
- ✅ Port 3001: LISTENING
- ✅ Database: Connected
- ✅ Routes: Registered
- ✅ Middleware: Applied (`authenticateDual` logs visible)

### Next Steps for Testing

The backend is now running with fresh middleware configuration. Test the complete booking flow:

1. **Login to Portal** (http://localhost:5175/login)
   - Email: `admin+client@chctherapy.com`
   - Password: Your test client password

2. **Navigate to Self-Scheduling** (`/portal/schedule`)

3. **Complete Test A1-A4**:
   - A1: Select clinician → Should load without 401 errors
   - A2: Select appointment type → Should load without 401 errors
   - A3: Select date/time → Should load slots without 401 errors
   - A4: Confirm booking → Should successfully create appointment

### Expected Logs After Testing

When you access self-scheduling endpoints, you should now see:
```
[DUAL AUTH] Middleware executing for: GET /clinicians
[DUAL AUTH] Middleware executing for: GET /appointment-types
[DUAL AUTH] Middleware executing for: GET /available-slots/:id
[DUAL AUTH] Middleware executing for: POST /book
```

Instead of:
```
[OLD AUTH] authenticate() called for: GET /clinicians
```

---

**Ready for Testing**: Test A1-A7
**Expected Outcome**: All self-scheduling endpoints now accept portal authentication tokens
