# Client Portal Login Troubleshooting

**Date**: January 11, 2025  
**Issue**: Rate Limit Blocking Login (429 Error)

---

## Problem Identified

**Error**: `429 Too Many Requests`  
**Root Cause**: Authentication rate limiter blocking login attempts  
**Rate Limit**: 5 attempts per 15 minutes per IP address

---

## Solutions

### Option 1: Wait for Rate Limit to Expire ⏰
- **Wait Time**: 15 minutes from first blocked attempt
- **Status**: Rate limit resets automatically
- **Action**: Wait and try again

### Option 2: Restart Backend Server 🔄
- **Action**: Restart the backend server to clear in-memory rate limit counters
- **Command**: Stop and restart `npm run dev` in `packages/backend`
- **Note**: This clears rate limit counters but may not work if using Redis

### Option 3: Use Rate Limit Whitelist 🔓
- **Action**: Add your IP to the whitelist
- **Environment Variable**: `RATE_LIMIT_WHITELIST`
- **Example**: `RATE_LIMIT_WHITELIST=127.0.0.1,::1`
- **Location**: `.env` file in `packages/backend`

### Option 4: Temporarily Increase Rate Limit for Testing 🧪
- **File**: `packages/backend/src/middleware/rateLimiter.ts`
- **Current**: `max: 5` attempts per 15 minutes
- **Temporary**: Increase to `max: 50` for testing
- **Warning**: Remember to revert after testing!

---

## Test Client Credentials

**Primary Test Client:**
```
URL:      http://localhost:5175/portal/login
Email:    john.doe@example.com
Password: TestClient123!
```

**Alternative Test Client:**
```
Email:    jessica.anderson@example.com
Password: Portal123!
```

---

## Verify Test Client Exists

Run this command to verify the test client exists:
```bash
node verify-test-client.js
```

If client doesn't exist, create it:
```bash
node create-test-client.js
```

---

## Current Status

- ✅ Login form loads correctly
- ✅ Credentials filled in correctly
- ❌ Rate limit blocking login (429 error)
- ⏳ Waiting for rate limit to expire or need to restart backend

---

## Next Steps

1. **Verify client exists**: Run `node verify-test-client.js`
2. **Choose solution**: Wait, restart backend, or whitelist IP
3. **Retry login**: After rate limit is cleared
4. **Test portal features**: Once logged in successfully




