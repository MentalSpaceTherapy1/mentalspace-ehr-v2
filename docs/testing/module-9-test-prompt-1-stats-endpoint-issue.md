# Module 9 Test Prompt 1: Credentialing /stats Endpoint - API Path Issue

**Date**: January 11, 2025  
**Status**: ⚠️ **API PATH MISMATCH**

---

## Issue Identified

The `/stats` endpoint has been implemented in the backend, but there's an API path mismatch between frontend and backend.

### Frontend Hook
**File**: `packages/frontend/src/hooks/useCredentialing.ts:267`
```typescript
const API_BASE = '/api/credentialing';
const res = await fetch(`${API_BASE}/stats`, {
  headers: { Authorization: `Bearer ${getToken()}` }
});
```

**Actual Request**: `GET http://localhost:5175/api/credentialing/stats`

### Backend Route
**File**: `packages/backend/src/routes/credentialing.routes.ts`
- Route registered at: `/api/v1/credentialing/stats`
- Backend URL: `http://localhost:3001/api/v1/credentialing/stats`

### API Interceptor
**File**: `packages/frontend/src/lib/api.ts:4`
```typescript
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api/v1';
```

---

## Problem

The frontend hook `useCredentialing.ts` uses a hardcoded `/api/credentialing` base path instead of using the centralized API interceptor that includes `/v1`.

**Current Behavior**:
- Frontend calls: `/api/credentialing/stats` → Goes to frontend dev server (port 5175) → 404
- Should call: `/api/v1/credentialing/stats` → Goes to backend (port 3001) → 200

---

## Solution Required

**Option 1**: Update `useCredentialing.ts` to use the centralized API interceptor
```typescript
import api from '../lib/api'; // Use axios instance with proper base URL

// Instead of:
const API_BASE = '/api/credentialing';

// Use:
const API_BASE = '/credentialing'; // Relative to /api/v1
```

**Option 2**: Update `useCredentialing.ts` to use the API_URL constant
```typescript
import { API_URL } from '../lib/api';
const API_BASE = `${API_URL}/credentialing`;
```

**Option 3**: Configure Vite proxy to forward `/api/credentialing` to backend

---

## Current Status

- ✅ Backend `/stats` endpoint: **IMPLEMENTED**
- ✅ Backend route registered: **YES**
- ❌ Frontend API path: **WRONG** (missing `/v1`)
- ❌ Network request: **404** (hitting frontend dev server instead of backend)

---

## Next Steps

1. Fix API path in `useCredentialing.ts` to use `/api/v1/credentialing` or centralized API interceptor
2. Verify all other hooks in Module 9 use correct API paths
3. Retest dashboard after fix




