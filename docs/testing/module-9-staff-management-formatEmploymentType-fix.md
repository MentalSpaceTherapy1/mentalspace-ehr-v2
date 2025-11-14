# Module 9: Staff Management - formatEmploymentType Null Fix

**Date**: January 11, 2025  
**Status**: ✅ **FIXED**

---

## Issue Found

**Error**: `TypeError: Cannot read properties of null (reading 'replace')`  
**Location**: `StaffDirectory.tsx:79` in `formatEmploymentType` function  
**Root Cause**: `member.employmentType` can be `null`, but the function was trying to call `.replace()` on it without null checking

---

## Fix Applied

**File**: `packages/frontend/src/pages/Staff/StaffDirectory.tsx`

**Before**:
```typescript
const formatEmploymentType = (type: string) => {
  return type.replace('_', ' ');
};
```

**After**:
```typescript
const formatEmploymentType = (type: string | null | undefined) => {
  if (!type) return 'N/A';
  return type.replace('_', ' ');
};
```

**Changes**:
1. Updated function signature to accept `string | null | undefined`
2. Added null check: `if (!type) return 'N/A';`
3. Only calls `.replace()` if type is not null/undefined

---

## Status

✅ **FIXED** - Function now safely handles null/undefined employment types




