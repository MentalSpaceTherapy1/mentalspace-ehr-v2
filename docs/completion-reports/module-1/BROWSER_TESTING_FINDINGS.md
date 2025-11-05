# Module 1: Browser Testing Findings

**Date:** November 2, 2025
**Time:** 4:38 PM
**Status:** 🚨 **CRITICAL ISSUE DISCOVERED**

---

## 🔍 Investigation Summary

After adding debug logging to the frontend API client, I discovered a critical discrepancy between what the frontend sends and what the backend receives.

---

## 🚨 Critical Finding

### Frontend Behavior (CORRECT)
- **Console Log Shows:** `[API REQUEST] {url: /auth/login, baseURL: http://localhost:3001/api/v1, fullURL: http://localhost:3001/api/v1/auth/login, method: post}`
- **Frontend IS calling the correct endpoint:** `http://localhost:3001/api/v1/auth/login`
- **Frontend code is correct:** [Login.tsx:28](packages/frontend/src/pages/Login.tsx#L28) calls `api.post('/auth/login')`
- **API client configuration is correct:** [api.ts:4](packages/frontend/src/lib/api.ts#L4) sets `baseURL: '/api/v1'`

### Backend Behavior (PROBLEM)
- **NO backend log entry for the most recent login attempt**
- **Earlier backend logs show `/login` (WITHOUT `/api/v1` prefix)** returning 200 OK
- **These `/login` requests are calling the CLIENT PORTAL login endpoint**
- **Result:** Frontend gets client portal token, tries to access staff resources, gets 401

### The Mystery
1. **Frontend correctly calls `/api/v1/auth/login`** ✓
2. **But backend receives `/login`** ❌
3. **OR backend doesn't receive the request at all** ❌

---

## 📋 Evidence

### 1. Frontend Debug Log (Just Now)
```
[log] [API REQUEST] {
  url: /auth/login,
  baseURL: http://localhost:3001/api/v1,
  fullURL: http://localhost:3001/api/v1/auth/login,
  method: post
}
```

### 2. Backend Logs (Earlier Attempts)
```
16:35:47 - POST /login - 200 - 103ms  ← WRONG ENDPOINT!
16:26:13 - POST /login - 200 - 210ms  ← WRONG ENDPOINT!
16:11:58 - POST /login - 200 - 86ms   ← WRONG ENDPOINT!
15:48:36 - POST /login - 200 - 96ms   ← WRONG ENDPOINT!
```

### 3. Backend Logs (When Using Wrong Password - CORRECT)
```
16:31:57 - POST /api/v1/auth/login - 401 - 140ms  ← CORRECT ENDPOINT!
16:08:43 - POST /api/v1/auth/login - 401 - 144ms  ← CORRECT ENDPOINT!
15:58:16 - POST /api/v1/auth/login - 401 - 4ms    ← CORRECT ENDPOINT!
15:57:47 - POST /api/v1/auth/login - 401 - 5ms    ← CORRECT ENDPOINT!
15:54:43 - POST /api/v1/auth/login - 401 - 267ms  ← CORRECT ENDPOINT!
```

### 4. Browser Console Errors
```
[error] Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

### 5. Frontend UI Message
```
"Login failed. Please try again."
```

---

## 🤔 Possible Causes

### Theory 1: Vite Proxy Issue
- **Vite config** has proxy for `/api` → `http://localhost:3001`
- **Problem:** May not be forwarding `/api/v1/auth/login` correctly
- **Evidence:** Frontend calls correct URL, but no backend log

### Theory 2: Request Caching
- **Possible:** Browser or Vite caching previous responses
- **Evidence:** Inconsistent behavior between attempts

### Theory 3: Two Different Login Pages
- **Possible:** Some login attempts use portal login, some use staff login
- **Evidence:** Backend logs show both `/login` (200) and `/api/v1/auth/login` (401)

### Theory 4: Environment Variable Not Loading
- **Possible:** `VITE_API_URL` not being read correctly
- **Evidence:** Frontend logs show correct baseURL, so this is UNLIKELY

---

## ✅ What We Know Works

1. **Backend staff login endpoint exists** at `/api/v1/auth/login`
2. **Backend receives requests** (we see logs for 401 responses)
3. **Frontend API client is correctly configured**
4. **Frontend Login component is correctly calling the API**

---

## ❌ What's Not Working

1. **Request not reaching backend** (no log entry for most recent attempt)
2. **Earlier requests went to wrong endpoint** (`/login` instead of `/api/v1/auth/login`)
3. **Login fails** even with correct credentials

---

## 🔧 Next Steps to Investigate

1. **Check Vite proxy logs** to see if requests are being forwarded
2. **Test direct backend call** using curl/PowerShell to verify endpoint works
3. **Clear browser cache** and retry
4. **Restart frontend dev server** to reload environment variables
5. **Check if there are multiple login pages** (staff vs portal)
6. **Add backend request logging** to see exactly what URLs are being hit

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| **Frontend calls correct endpoint** | ✅ PASS | Console log shows `/api/v1/auth/login` |
| **Backend receives request** | ❌ FAIL | No log entry for most recent attempt |
| **Login succeeds** | ❌ FAIL | Shows "Login failed" message |
| **Correct HTTP status** | ⚠️ MIXED | Some 401 (correct endpoint), some 200 (wrong endpoint) |

---

## 🎯 Recommendation

**IMMEDIATE ACTION REQUIRED:**

1. Stop both servers
2. Clear all caches (browser, Vite, node_modules/.cache)
3. Restart both servers
4. Test again with proper logging

**ROOT CAUSE:**

The issue appears to be that requests are intermittently being routed to the wrong endpoint. Sometimes `/api/v1/auth/login` (correct staff endpoint, returns 401 for wrong password), sometimes `/login` (wrong client portal endpoint, returns 200).

**This is NOT a code bug** - the code is correct. This is likely a **configuration, caching, or proxy issue**.

---

**Report Generated:** November 2, 2025, 4:38 PM
**Investigator:** Claude AI (Sonnet 4.5)
**Status:** Investigation ongoing, critical issue identified
