# 🚨 CRITICAL BUG REPORT: Portal Session Expiration & Waitlist 401 Errors

**Date**: January 10, 2025  
**Reporter**: Composer  
**Priority**: 🔴 **P0 - CRITICAL - BLOCKING ALL TESTING**  
**Status**: Root cause identified - requires immediate fix

---

## Executive Summary

**Problem**: Portal sessions expire immediately when accessing `/portal/schedule`, preventing ALL E2E testing of Module 7 features (Reschedule, Cancel, Waitlist).

**Root Cause Identified**: 
1. **Waitlist routes use wrong middleware** - They use `authMiddleware` (staff-only) instead of `authenticateDual` or `authenticatePortal`
2. **Missing client-specific waitlist endpoints** - Frontend calls `/waitlist/my-entries` and `/waitlist/my-offers` which don't exist in backend
3. **401 errors trigger automatic redirect** - API interceptor redirects to login on ANY 401, even for non-critical endpoints

**Impact**: 
- ❌ **ALL Module 7 testing blocked**
- ❌ **Reschedule feature cannot be tested**
- ❌ **Cancel feature cannot be tested**  
- ❌ **Waitlist UI cannot be tested**
- ❌ **Affects both browser automation AND human testers**

---

## Detailed Root Cause Analysis

### Issue #1: Waitlist Routes Use Wrong Middleware ❌

**Location**: `packages/backend/src/routes/waitlist.routes.ts:16`

**Current Code**:
```typescript
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);  // ❌ WRONG - Only accepts STAFF tokens
```

**Problem**: 
- `authMiddleware` only accepts **staff JWT tokens** (audience: `mentalspace-api`)
- Portal tokens have audience: `mentalspace-portal`
- When portal client sends portal token, `authMiddleware` rejects it → 401 error

**Comparison**:
- ✅ **Self-scheduling routes** (`self-scheduling.routes.ts:22`): Uses `authenticateDual` → **WORKS**
- ❌ **Waitlist routes** (`waitlist.routes.ts:16`): Uses `authMiddleware` → **FAILS**

**Fix Required**: Change to `authenticateDual` or `authenticatePortal`

---

### Issue #2: Missing Client-Specific Waitlist Endpoints ❌

**Frontend Calls** (from `PortalSelfScheduling.tsx:452, 463`):
```typescript
await api.get('/waitlist/my-entries');   // ❌ Endpoint doesn't exist
await api.get('/waitlist/my-offers');     // ❌ Endpoint doesn't exist
```

**Backend Routes** (from `waitlist.routes.ts`):
```typescript
router.get('/', getWaitlistEntries);           // Admin view - all entries
router.post('/', addToWaitlist);               // Add to waitlist
router.delete('/:id', removeFromWaitlist);    // Remove from waitlist
// ❌ NO /my-entries endpoint
// ❌ NO /my-offers endpoint
// ❌ NO /:entryId/accept/:offerId endpoint
// ❌ NO /:entryId/decline/:offerId endpoint
```

**Problem**: Frontend is calling endpoints that **don't exist**, causing 404 or 401 errors.

**Fix Required**: Add client-specific waitlist routes:
- `GET /waitlist/my-entries` - Get current client's waitlist entries
- `GET /waitlist/my-offers` - Get current client's waitlist offers
- `POST /waitlist/:entryId/accept/:offerId` - Accept an offer
- `POST /waitlist/:entryId/decline/:offerId` - Decline an offer

---

### Issue #3: API Interceptor Redirects on ANY 401 ❌

**Location**: `packages/frontend/src/lib/api.ts:64-70`

**Current Code**:
```typescript
if (isPortalRoute) {
  // Portal routes: redirect to portal login (no refresh token mechanism yet)
  localStorage.removeItem('portalToken');
  localStorage.removeItem('portalClient');
  localStorage.removeItem('portalAccount');
  window.location.href = '/portal/login';  // ❌ IMMEDIATE REDIRECT
  return Promise.reject(error);
}
```

**Problem**: 
- When ANY portal route returns 401 (even for non-critical endpoints like waitlist), the interceptor **immediately redirects to login**
- This happens **before** the page can render or user can interact
- Session appears to "expire" even though token is valid

**Impact**: 
- User logs in successfully ✅
- Token stored in localStorage ✅
- Navigate to `/portal/schedule` ✅
- Page loads, makes API calls ✅
- Waitlist endpoints return 401 ❌
- Interceptor redirects to login ❌
- **User kicked out within 1-2 seconds**

**Fix Required**: 
- Don't redirect on non-critical endpoint failures
- Only redirect on critical authentication failures
- Or: Fix waitlist endpoints so they don't return 401

---

## Evidence from Console Logs

### What Works ✅
```
[LOG] 🟢 PortalRoute guard checking token: exists
[LOG] 🟢 PortalRoute: Token valid, rendering children
[LOG] [API REQUEST] {url: /self-schedule/clinicians, ...}  → 200 OK ✅
[LOG] [API REQUEST] {url: /self-schedule/appointment-types, ...}  → 200 OK ✅
[LOG] [API REQUEST] {url: /self-schedule/my-appointments, ...}  → 200 OK ✅
```

### What Fails ❌
```
[ERROR] Failed to load resource: 401 (Unauthorized) @ /waitlist/my-offers
[ERROR] Failed to load waitlist offers AxiosError
[ERROR] Failed to load resource: 401 (Unauthorized) @ /waitlist/my-entries
[ERROR] Failed to load waitlist entries AxiosError
```

**Then immediately**:
```
[LOG] ✅ GOOGLE MAPS PLACES LIBRARY LOADED @ /portal/login
[LOG] Redirected to login page
```

---

## Code Comparison

### ✅ Self-Scheduling Routes (WORKS)
**File**: `packages/backend/src/routes/self-scheduling.routes.ts`
```typescript
import { authenticateDual } from '../middleware/dualAuth';

router.use(authenticateDual);  // ✅ Accepts BOTH portal and staff tokens
```

### ❌ Waitlist Routes (FAILS)
**File**: `packages/backend/src/routes/waitlist.routes.ts`
```typescript
import { authMiddleware } from '../middleware/auth';

router.use(authMiddleware);  // ❌ Only accepts STAFF tokens
```

---

## Required Fixes

### Fix #1: Change Waitlist Middleware (CRITICAL)

**File**: `packages/backend/src/routes/waitlist.routes.ts`

**Change**:
```typescript
// OLD (BROKEN):
import { authMiddleware } from '../middleware/auth';
router.use(authMiddleware);

// NEW (FIXED):
import { authenticateDual } from '../middleware/dualAuth';
router.use(authenticateDual);
```

**Why**: `authenticateDual` accepts both portal tokens and staff tokens, allowing clients to access their own waitlist data.

---

### Fix #2: Add Client-Specific Waitlist Endpoints (CRITICAL)

**File**: `packages/backend/src/routes/waitlist.routes.ts`

**Add these routes**:
```typescript
// Client-specific routes (use authenticatePortal or authenticateDual)
router.get('/my-entries', authenticateDual, getMyWaitlistEntries);
router.get('/my-offers', authenticateDual, getMyWaitlistOffers);
router.post('/:entryId/accept/:offerId', authenticateDual, acceptWaitlistOffer);
router.post('/:entryId/decline/:offerId', authenticateDual, declineWaitlistOffer);
```

**File**: `packages/backend/src/controllers/waitlist.controller.ts`

**Add these controller functions**:
```typescript
export const getMyWaitlistEntries = async (req: Request, res: Response) => {
  // Get clientId from portalAccount (set by authenticateDual)
  const clientId = (req as any).portalAccount?.clientId || (req as any).user?.userId;
  
  // Fetch only this client's entries
  const entries = await waitlistService.getWaitlistEntries({
    clientId, // Filter by client
  });
  
  res.status(200).json({ success: true, data: entries });
};

export const getMyWaitlistOffers = async (req: Request, res: Response) => {
  const clientId = (req as any).portalAccount?.clientId || (req as any).user?.userId;
  
  // Fetch offers for this client's entries
  const offers = await waitlistService.getWaitlistOffers({ clientId });
  
  res.status(200).json({ success: true, data: offers });
};

export const acceptWaitlistOffer = async (req: Request, res: Response) => {
  const { entryId, offerId } = req.params;
  const clientId = (req as any).portalAccount?.clientId || (req as any).user?.userId;
  
  // Verify entry belongs to client, then accept offer
  // Implementation...
};

export const declineWaitlistOffer = async (req: Request, res: Response) => {
  const { entryId, offerId } = req.params;
  const clientId = (req as any).portalAccount?.clientId || (req as any).user?.userId;
  
  // Verify entry belongs to client, then decline offer
  // Implementation...
};
```

---

### Fix #3: Make API Interceptor Non-Blocking (OPTIONAL BUT RECOMMENDED)

**File**: `packages/frontend/src/lib/api.ts`

**Change**:
```typescript
// OLD (BROKEN):
if (isPortalRoute) {
  localStorage.removeItem('portalToken');
  window.location.href = '/portal/login';  // ❌ Immediate redirect
  return Promise.reject(error);
}

// NEW (FIXED):
if (isPortalRoute) {
  // Only redirect on critical authentication failures
  // Don't redirect on non-critical endpoint failures (like waitlist)
  const isCriticalEndpoint = originalRequest.url?.includes('/portal/dashboard') ||
                             originalRequest.url?.includes('/portal-auth/');
  
  if (isCriticalEndpoint) {
    localStorage.removeItem('portalToken');
    window.location.href = '/portal/login';
  }
  // For non-critical endpoints, just reject the promise
  // Let the component handle the error gracefully
  return Promise.reject(error);
}
```

**Alternative**: Fix waitlist endpoints (Fix #1 and #2) so they don't return 401, making this fix unnecessary.

---

## Testing After Fixes

### Test Procedure

1. **Login**: `john.doe@example.com` / `TestClient123!`
2. **Navigate**: `/portal/schedule`
3. **Verify**: 
   - ✅ Page loads without redirect
   - ✅ No 401 errors in console
   - ✅ Waitlist section visible
   - ✅ Can click "+ Join Waitlist"
   - ✅ Can interact with all UI elements

### Expected Results

**Before Fixes**:
- ❌ Redirects to login within 1-2 seconds
- ❌ 401 errors on waitlist endpoints
- ❌ Cannot interact with page

**After Fixes**:
- ✅ Page stays loaded
- ✅ No 401 errors
- ✅ All features accessible
- ✅ Can test Reschedule, Cancel, Waitlist

---

## Impact Assessment

### Current State
- **Reschedule**: ❌ Cannot test (session expires)
- **Cancel**: ❌ Cannot test (session expires)
- **Waitlist**: ❌ Cannot test (session expires + 401 errors)

### After Fixes
- **Reschedule**: ✅ Can test (session stable)
- **Cancel**: ✅ Can test (session stable)
- **Waitlist**: ✅ Can test (endpoints work + session stable)

---

## Priority

🔴 **P0 - CRITICAL**: 
- Blocks ALL Module 7 testing
- Affects both automation and human testers
- Simple fixes (change middleware, add routes)
- High impact (unblocks entire feature set)

---

## Files Requiring Changes

1. ✅ `packages/backend/src/routes/waitlist.routes.ts` - Change middleware
2. ✅ `packages/backend/src/routes/waitlist.routes.ts` - Add client routes
3. ✅ `packages/backend/src/controllers/waitlist.controller.ts` - Add controller functions
4. ⚠️ `packages/frontend/src/lib/api.ts` - Optional: Make interceptor non-blocking

---

## Conclusion

**Root Cause**: Waitlist routes use wrong middleware + missing endpoints → 401 errors → automatic redirect → session appears expired

**Solution**: Change middleware to `authenticateDual` + add client-specific endpoints

**Estimated Fix Time**: 30-60 minutes

**Testing Time After Fix**: 30-40 minutes (per `CURSOR_TESTING_INSTRUCTIONS.md`)

---

## Message to Claude Code

**STOP ASSUMING. FIX THE PROBLEM.**

The issue is NOT browser automation. The issue is NOT session management. The issue is:

1. **Waitlist routes use `authMiddleware` instead of `authenticateDual`** - This is why portal tokens are rejected
2. **Missing client-specific waitlist endpoints** - Frontend calls `/waitlist/my-entries` but backend doesn't have it
3. **API interceptor redirects on ANY 401** - Even for non-critical endpoints

**Fix these three issues and testing will work for both automation AND humans.**

The code is there. The routes are there. Just use the RIGHT middleware and add the MISSING endpoints.

**Do not assume. Investigate. Fix. Test.**




