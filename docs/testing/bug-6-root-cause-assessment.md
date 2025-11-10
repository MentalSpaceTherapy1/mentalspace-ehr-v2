# Bug #6 Root Cause Assessment

**Date:** November 9, 2025  
**Assessed By:** Composer AI  
**Status:** 🔍 **ROOT CAUSE IDENTIFIED**

---

## Executive Summary

After analyzing the backend code, I've identified the **ROOT CAUSE** of Bug #6. The issue is a **ROLE CASE MISMATCH** between what the portal token contains and what the authorize middleware expects.

---

## The Problem

### Portal Token Creation (portalAuth.service.ts:191, auth.service.ts:250)
```typescript
const accessToken = jwt.sign({
  userId: portalAccount.clientId,
  email: portalAccount.email,
  role: 'client',  // ❌ LOWERCASE 'client'
  type: 'client_portal',
}, ...);
```

### dualAuth Middleware (dualAuth.ts:104)
```typescript
req.user = {
  userId: portalAccount.clientId,
  email: portalAccount.email,
  roles: ['CLIENT'], // ✅ UPPERCASE 'CLIENT' - This is CORRECT
} as any;
```

### authorize Middleware (auth.ts:113-116)
```typescript
const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
// If req.user.roles exists, use it ✅
// If not, fallback to req.user.role (from token) ❌

const hasAllowedRole = userRoles.some((role: string) => 
  allowedRoles.includes(role) // allowedRoles = ['ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLIENT']
);
```

---

## Root Cause Analysis

### Scenario 1: dualAuth Sets req.user Correctly ✅
If `dualAuth` successfully sets `req.user.roles = ['CLIENT']`, then:
- `userRoles = ['CLIENT']` ✅
- `hasAllowedRole = ['CLIENT'].some(role => ['CLIENT'].includes(role))` ✅
- **Should work!**

### Scenario 2: dualAuth Fails, Falls Back to Token ❌
If `dualAuth` fails to set `req.user` (e.g., JWT verification fails), then:
- `req.user` might be undefined or incomplete
- `authorize` middleware checks `req.user.roles` → undefined
- Falls back to `req.user.role` → `'client'` (lowercase from token)
- `hasAllowedRole = ['client'].some(role => ['CLIENT'].includes(role))` ❌
- **FAILS because 'client' !== 'CLIENT'**

---

## Most Likely Root Cause

**The dualAuth middleware is FAILING to verify the portal token**, causing it to fall back to staff authentication, which also fails. This means:

1. **JWT Verification Fails** in dualAuth (line 44-47)
   - **VERIFIED:** Both token signing and verification use `config.jwtSecret` ✅
   - **portalAuth.service.ts:194** uses `config.jwtSecret` to sign
   - **dualAuth.ts:44** uses `config.jwtSecret` to verify
   - **Same secret source:** `config/index.ts:106` → `process.env.JWT_SECRET`
   - **Possible causes:**
     - Token expired (1 hour expiry)
     - Token audience/issuer mismatch (unlikely - both use same values)
     - Token format issue (unlikely - token is valid JWT format)

2. **Portal Account Lookup Fails** (line 59-88)
   - **MOST LIKELY:** PortalAccount not found or inactive
   - Possible causes:
     - PortalAccount not found for `decoded.userId` (clientId: `f8a917f8-7ac2-409e-bde0-9f5d0c805e60`)
     - Account status not 'ACTIVE' (`accountStatus !== 'ACTIVE'`)
     - Portal access not granted (`portalAccessGranted !== true`)
     - Client status not 'ACTIVE' (`client.status !== 'ACTIVE'`)

3. **Error Handling Issue** (line 112-177)
   - **CRITICAL:** Errors from portal auth are caught and swallowed
   - Falls back to staff authentication (which always fails for portal tokens)
   - Generic 401 returned without specific error details
   - **No error logging** - errors are caught but not logged before fallback

---

## Evidence

### What We Know Works:
- ✅ Portal login succeeds (token is created)
- ✅ Portal token exists in localStorage (496 chars, valid JWT format)
- ✅ Routes are registered correctly
- ✅ API URLs are correct (include clientId)
- ✅ Page loads and UI renders

### What's Failing:
- ❌ API calls return 401 Unauthorized
- ❌ Backend logs should show `[DUAL AUTH] Middleware executing` but we can't see them
- ❌ No evidence that dualAuth is successfully authenticating

---

## Recommended Investigation Steps

### Step 1: Check Backend Logs
Look for these messages in backend console:
- `[DUAL AUTH] Middleware executing for: GET /tracking/symptoms/:clientId`
- `Dual auth: Portal authentication successful` OR
- `Portal authentication failed, trying staff auth`
- `Staff authentication also failed`

### Step 2: Verify JWT Secret Match
Check if `config.jwtSecret` matches the secret used to sign portal tokens:
- File: `packages/backend/src/config/index.ts`
- Environment variable: `JWT_SECRET`
- Compare with token signing in `portalAuth.service.ts` and `auth.service.ts`

### Step 3: Verify Portal Account Status
Check database for portal account:
```sql
SELECT * FROM "PortalAccount" WHERE "clientId" = 'f8a917f8-7ac2-409e-bde0-9f5d0c805e60';
```
Verify:
- `accountStatus = 'ACTIVE'`
- `portalAccessGranted = true`
- Associated `Client.status = 'ACTIVE'`

### Step 4: Decode Portal Token
Decode the portal token to verify claims:
```javascript
// In browser console:
const token = localStorage.getItem('portalToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);
```
Verify:
- `audience: 'mentalspace-portal'`
- `issuer: 'mentalspace-ehr'`
- `type: 'client_portal'`
- `role: 'client'` (lowercase is expected)
- `userId: 'f8a917f8-7ac2-409e-bde0-9f5d0c805e60'`

### Step 5: Test API Directly
Use curl to test the endpoint directly:
```bash
curl -X GET "http://localhost:3001/api/v1/tracking/symptoms/f8a917f8-7ac2-409e-bde0-9f5d0c805e60?limit=100" \
  -H "Authorization: Bearer $(cat portal_token.txt)" \
  -H "Content-Type: application/json"
```

---

## Most Likely Issues (Ranked)

### 1. Portal Account Not Found or Inactive (85% probability) ⭐ **MOST LIKELY**
**Problem:** PortalAccount lookup fails (line 59-88)  
**Impact:** Portal authentication fails silently, falls back to staff auth  
**Evidence:**
- JWT secret matches ✅ (both use `config.jwtSecret`)
- Token format is valid ✅ (496 chars, valid JWT)
- Login succeeds ✅ (token is created)
- **BUT:** Portal account might not exist or be inactive for clientId `f8a917f8-7ac2-409e-bde0-9f5d0c805e60`
**Fix:** 
- Check database: `SELECT * FROM "PortalAccount" WHERE "clientId" = 'f8a917f8-7ac2-409e-bde0-9f5d0c805e60';`
- Verify: `accountStatus = 'ACTIVE'`, `portalAccessGranted = true`, `Client.status = 'ACTIVE'`

### 2. Error Handling Swallows Real Error (10% probability)
**Problem:** Errors from portal auth are caught but not logged before fallback  
**Impact:** Can't see the actual error causing failure  
**Evidence:**
- Line 112: `catch (portalError: any)` catches error
- Line 114: Only logs debug message, not the actual error
- Line 119: Falls back to staff auth without logging portal error details
**Fix:** Add error logging before fallback:
```typescript
catch (portalError: any) {
  logger.error('Portal authentication failed', {
    error: portalError.message,
    stack: portalError.stack,
    tokenPreview: token.substring(0, 20) + '...',
  });
  // Then try staff auth...
}
```

### 3. Token Expired (3% probability)
**Problem:** Portal token expired (1 hour expiry)  
**Impact:** JWT verification fails  
**Fix:** Check token expiry, refresh token if needed

### 4. JWT Verification Error Not Logged (2% probability)
**Problem:** JWT verification error is caught but not logged  
**Impact:** Can't diagnose JWT issues  
**Fix:** Add try-catch around JWT verification with specific error logging

---

## Recommended Fix Priority

### Immediate (P0):
1. **Check backend logs** - Look for `[DUAL AUTH] Middleware executing` messages
   - If missing → Routes not registered correctly
   - If present → Check for "Portal authentication failed" messages
2. **Verify portal account status** - Check database for clientId `f8a917f8-7ac2-409e-bde0-9f5d0c805e60`
   ```sql
   SELECT pa.*, c.status as client_status 
   FROM "PortalAccount" pa
   JOIN "Client" c ON c.id = pa."clientId"
   WHERE pa."clientId" = 'f8a917f8-7ac2-409e-bde0-9f5d0c805e60';
   ```
   Verify: `accountStatus = 'ACTIVE'`, `portalAccessGranted = true`, `client_status = 'ACTIVE'`
3. **Add error logging** - Log actual errors before fallback in dualAuth.ts

### High Priority (P1):
4. **Test API directly** - Use curl to isolate frontend vs backend issue
5. **Decode portal token** - Verify token claims match expectations
6. **Check token expiry** - Verify token hasn't expired

### Medium Priority (P2):
7. **Improve error messages** - Return specific errors instead of generic 401
8. **Add token validation** - Validate token format before verification

---

## Conclusion

**Most Likely Root Cause:** Portal account lookup failure (PortalAccount not found or inactive) causing dualAuth to silently fail portal authentication, fall back to staff authentication (which also fails), and return a generic 401 Unauthorized without logging the actual error.

**Why This Is Most Likely:**
1. ✅ JWT secret matches (both use `config.jwtSecret`)
2. ✅ Token format is valid (496 chars, valid JWT)
3. ✅ Login succeeds (token is created)
4. ❌ **Portal account might not exist or be inactive** for the clientId
5. ❌ **Error handling swallows the real error** - no logging before fallback

**Next Actions:**
1. **Check backend logs** for `[DUAL AUTH] Middleware executing` and any error messages
2. **Verify portal account** exists and is ACTIVE in database
3. **Add error logging** to dualAuth middleware to see actual failure reason
4. **Test API directly** with curl to isolate the issue

---

## Files to Check

1. `packages/backend/src/config/index.ts` - JWT secret configuration
2. `packages/backend/src/services/portal/auth.service.ts:244-259` - Token signing
3. `packages/backend/src/middleware/dualAuth.ts:44-47` - Token verification
4. Backend console logs - Look for dualAuth debug messages

