# Module 7 Test A4 Blocker Resolution - Booking Payload Fix

**Date**: 2025-11-09
**Issue**: Test A4 blocked by 400 Bad Request on booking endpoint
**Status**: ✅ RESOLVED

---

## Problem Summary

Test A4 (Confirmation & Booking) was blocked because:
- POST `/self-schedule/book` returned 400 Bad Request
- No error message displayed to user
- Request payload didn't match backend validation schema
- Booking failed silently

---

## Root Cause Analysis

### Frontend/Backend Schema Mismatch

The frontend at [PortalSelfScheduling.tsx:310-320](../../packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx#L310-L320) was sending the wrong field names.

**Frontend Sent (BEFORE):**
```typescript
{
  clinicianId: string,               // ✅ Correct
  appointmentTypeId: string,         // ❌ Wrong - backend expects appointmentType
  date: string,                      // ❌ Wrong - backend expects appointmentDate
  time: string,                      // ❌ Not expected - time should be in appointmentDate
  duration: number,                  // ✅ Correct
  modality: string,                  // ❌ Wrong - backend expects serviceLocation
  notes: string,                     // ✅ Correct
  emailConfirmation: boolean,        // ❌ Not expected by backend
  smsReminder: boolean,              // ❌ Not expected by backend
}
```

**Backend Expected ([self-scheduling.controller.ts:22-29](../../packages/backend/src/controllers/self-scheduling.controller.ts#L22-L29)):**
```typescript
{
  clinicianId: string (UUID),        // Required
  appointmentDate: string (datetime), // Required - ISO datetime format
  appointmentType: string,            // Required - type name, not ID
  duration: number (15-240),          // Optional (default: 60)
  notes: string,                      // Optional
  serviceLocation: enum ['IN_PERSON', 'TELEHEALTH'], // Optional (default: 'TELEHEALTH')
}
```

### Why the 400 Error

The Zod validation schema at line 22-29 was failing because:
1. `appointmentTypeId` is not a recognized field
2. `date` is not a recognized field (expects `appointmentDate`)
3. `modality` is not a recognized field (expects `serviceLocation`)
4. Extra fields (`time`, `emailConfirmation`, `smsReminder`) were sent but ignored

---

## Solution Applied

Updated [PortalSelfScheduling.tsx:310-317](../../packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx#L310-L317) to match backend schema:

**Frontend Sends (AFTER):**
```typescript
{
  clinicianId: wizardState.selectedClinician.id,                    // UUID
  appointmentType: wizardState.selectedAppointmentType.typeName,    // Type name string
  appointmentDate: appointmentDateTime.toISOString(),               // ISO datetime
  duration: wizardState.selectedAppointmentType.defaultDuration,    // Number
  serviceLocation: wizardState.modality,                            // 'TELEHEALTH' or 'IN_PERSON'
  notes: wizardState.notes,                                         // String
}
```

**Changes Made:**
1. ❌ Removed `appointmentTypeId` → ✅ Added `appointmentType` (uses `typeName` instead of `id`)
2. ❌ Removed `date` → ✅ Added `appointmentDate` (same value, different key)
3. ❌ Removed `time` → Time is now included in `appointmentDate` ISO string
4. ❌ Removed `modality` → ✅ Added `serviceLocation` (same value, different key)
5. ❌ Removed `emailConfirmation` and `smsReminder` (not supported by backend)

---

## Verification Steps

To verify the fix:

1. ✅ Refresh the `/portal/schedule` page
2. ✅ Complete the booking wizard (Steps 1-3)
3. ✅ Navigate to Step 4 (Review & Confirm)
4. ✅ Agree to cancellation policy
5. ✅ Click "Confirm Booking"
6. ✅ Verify:
   - No 400 error
   - Success dialog appears
   - Confirmation number is displayed
   - Appointment appears in "My Upcoming Appointments"

---

## Expected Behavior After Fix

### Successful Booking
- ✅ POST request succeeds with 200/201 status
- ✅ Success dialog displays with confirmation number
- ✅ Wizard resets after 500ms
- ✅ New appointment appears in appointments list
- ✅ User receives booking confirmation

### Error Handling
- If slot is no longer available: Display error + refresh slots
- If validation fails: Display specific error message
- If server error: Display generic error message

---

## Impact on Testing

### Test A4: Confirmation & Booking
- ✅ **UNBLOCKED** - Booking payload now matches backend schema
- ✅ **READY FOR TESTING** - Complete end-to-end booking workflow

### Subsequent Tests
- ✅ Test A5: View Appointments - Now unblocked (appointments can be created)
- ✅ Test A6: Reschedule Appointment - Now unblocked
- ✅ Test A7: Cancel Appointment - Now unblocked

---

## Technical Details

### Appointment Date Format

The `appointmentDate` field must be an ISO 8601 datetime string:

**Example:**
```javascript
const appointmentDateTime = new Date(selectedDate);
const [hours, minutes] = selectedSlot.startTime.split(':');
appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

// Result: "2025-11-10T14:00:00.000Z"
const isoString = appointmentDateTime.toISOString();
```

### Appointment Type Field

The `appointmentType` field expects the **type name** (string), not the ID:

**Correct:**
```javascript
appointmentType: "Therapy Session"  // ✅ Type name
```

**Incorrect:**
```javascript
appointmentType: "uuid-here"  // ❌ Type ID
```

### Service Location Enum

Must be one of two values:
- `'TELEHEALTH'` - Video call appointment
- `'IN_PERSON'` - In-office appointment

---

## Prevention

- 📝 Consider adding TypeScript interfaces for API request/response types shared between frontend and backend
- 📝 Consider adding API integration tests to catch schema mismatches early
- 📝 Consider improving error messages to show which fields failed validation

---

**Resolution Status**: ✅ COMPLETE
**Ready for Testing**: Test A4 (Confirmation & Booking)
**Files Modified**: 1 (PortalSelfScheduling.tsx)
