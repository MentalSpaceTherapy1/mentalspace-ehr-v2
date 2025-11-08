# Appointment Creation Frontend Fix

## Problem Identified

The appointment creation is failing with "Invalid tx.appointment.create() invocation" because:

1. **Authentication Context Issue**: The `userId` is not being properly extracted from the request
2. **Required Fields**: The database requires `statusUpdatedBy`, `createdBy`, and `lastModifiedBy` fields which are set to `userId`
3. **If userId is undefined**, the transaction fails

## The Issue Location

In `packages/backend/src/controllers/appointment.controller.ts`:
```typescript
const userId = (req as any).user?.userId;  // This might be undefined
```

The user object structure might have the ID in a different field like `user.id` instead of `user.userId`.

## Quick Fix

### Option 1: Update the Backend Controller

In `packages/backend/src/controllers/appointment.controller.ts`, around line 271, change:

```typescript
// FROM:
const userId = (req as any).user?.userId;

// TO:
const userId = (req as any).user?.userId || (req as any).user?.id;

// Or add validation:
if (!userId) {
  return res.status(400).json({
    success: false,
    message: 'User authentication context missing'
  });
}
```

### Option 2: Check Auth Middleware

The auth middleware might not be setting the user context correctly. Check `packages/backend/src/middleware/auth.ts` to ensure it's setting the user object with the correct structure.

### Option 3: Frontend API Call Headers

Ensure the frontend is sending the authentication token correctly:

In `packages/frontend/src/lib/api.ts`, verify the token is being sent:
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Testing the Fix

1. **Add logging to debug**:
   ```typescript
   console.log('User object:', req.user);
   console.log('User ID:', userId);
   ```

2. **Check if user is authenticated**:
   - Open browser DevTools
   - Check Network tab when creating appointment
   - Verify Authorization header is present
   - Check the response for specific error details

## Immediate Workaround

Since we know the database insert works (we tested it with the script), the issue is specifically with the authentication context in the web application.

For testing purposes, you could temporarily hardcode a userId in the controller:

```typescript
const userId = (req as any).user?.userId || (req as any).user?.id || 'a2704b72-f050-47c2-b2a5-2effc3db4d00'; // Fallback to a known user ID
```

**WARNING**: This is only for testing! Remove this before production.

## Root Cause Summary

The appointment creation form is working correctly and sending the right data. The issue is that the backend controller can't find the user ID from the authentication context, causing required fields (`statusUpdatedBy`, `createdBy`, `lastModifiedBy`) to be undefined, which makes the Prisma transaction fail.

## Next Steps

1. Check the auth middleware to see how it's setting `req.user`
2. Update the appointment controller to correctly extract the user ID
3. Add proper error handling for missing user context
4. Test the appointment creation again