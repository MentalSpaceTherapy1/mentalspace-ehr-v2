# Cursor: Module 7 - Remaining Testing Tasks

**Date**: 2025-11-10 (Updated after Code Analysis)
**Priority**: HIGH
**Estimated Time**: 20 minutes (2 features only)
**Prerequisites**: Backend (port 3001) ✅ and Frontend (port 5176) ✅ - RUNNING
**Code Analysis By**: Claude Code

---

## 🔍 CODE ANALYSIS UPDATE (Claude Code → Cursor Handoff)

**Analysis Completed**: Claude Code has analyzed the codebase to determine implementation status.

**Key Findings**:
- ✅ **Reschedule**: FULLY IMPLEMENTED (UI + Backend) → **READY TO TEST**
- ✅ **Cancel**: FULLY IMPLEMENTED (UI + Backend) → **READY TO TEST**
- ❌ **Waitlist**: Backend complete, **NO UI** → **SKIP TESTING**

**Detailed Report**: See [MODULE_7_CODE_ANALYSIS_FINDINGS.md](MODULE_7_CODE_ANALYSIS_FINDINGS.md)

---

## 🎯 YOUR MISSION (UPDATED)

Complete testing of Module 7 by verifying the remaining **2 critical features**:

1. ✅ **Self-Scheduling Booking** - ALREADY TESTED (You completed this!)
2. 🟡 **Reschedule Appointment** - TEST THIS NOW (**UI CONFIRMED**)
3. 🟡 **Cancel Appointment** - TEST THIS NOW (**UI CONFIRMED**)
4. ❌ **Waitlist Management** - **SKIP** (No UI to test)

---

## 📋 WHAT'S ALREADY DONE

**You successfully tested**:
- ✅ Complete booking workflow (4-step wizard)
- ✅ Clinician selection (6 clinicians)
- ✅ Appointment type selection (13 types)
- ✅ Date/time slot selection (calendar + availability)
- ✅ Booking confirmation (APT-1762794784431)
- ✅ API integration (POST /book - 200 OK)
- ✅ Database persistence (appointment created)

**Result**: Self-scheduling booking is **PRODUCTION READY** ✅

---

## 🔍 TASK 1: TEST RESCHEDULE APPOINTMENT

**Priority**: HIGH (Critical user workflow)
**Estimated Time**: 10 minutes

### Steps to Test

1. **Navigate to Portal**
   - URL: http://localhost:5175/portal/schedule
   - Login as portal client (if needed)

2. **Find Your Test Appointment**
   - Look in "My Upcoming Appointments" section
   - You should see the appointment you just booked:
     - Date: Wednesday, November 12, 2025
     - Time: 09:00 (50 minutes)
     - Clinician: Sarah Johnson, Dr.
     - Status: SCHEDULED

3. **Click "Reschedule" Button**
   - Should open reschedule dialog or navigate to reschedule page

4. **Select New Date/Time**
   - Choose a different date (e.g., Thursday, November 13)
   - Choose a different time slot
   - Click "Confirm" or "Reschedule"

5. **Verify Success**
   - ✅ Success message displayed
   - ✅ Appointment date/time updated in "My Appointments"
   - ✅ Confirmation number remains the same (or new one generated)
   - ✅ Status remains SCHEDULED

### Expected API Call

```
PUT /api/v1/self-schedule/reschedule/:appointmentId
Request Body:
{
  "newAppointmentDate": "2025-11-13T10:00:00.000Z",
  "reason": "Schedule conflict" (optional)
}

Expected Response: 200 OK
{
  "success": true,
  "data": {
    "id": "<same-appointment-id>",
    "appointmentDate": "2025-11-13T10:00:00.000Z",
    ...
  }
}
```

### What to Check ✅

- [ ] Reschedule button exists and is clickable
- [ ] Can select new date/time from calendar
- [ ] Success message displayed after rescheduling
- [ ] Appointment details updated in UI
- [ ] API returns 200 OK status
- [ ] No errors in browser console
- [ ] Original appointment ID preserved

### Potential Issues to Watch For ⚠️

- Reschedule button might be missing from UI
- Dialog/form might not open
- Date picker might not work
- API might return 404 (endpoint not found)
- Validation errors (e.g., 24-hour minimum not enforced)

---

## 🔍 TASK 2: TEST CANCEL APPOINTMENT

**Priority**: HIGH (Critical user workflow)
**Estimated Time**: 10 minutes

### Steps to Test

1. **Find an Appointment to Cancel**
   - Use the appointment you just rescheduled
   - Or book a new test appointment if needed

2. **Click "Cancel" Button**
   - Should open cancellation confirmation dialog
   - May ask for cancellation reason

3. **Confirm Cancellation**
   - Provide reason (if required)
   - Click "Confirm Cancel" or "Yes, Cancel"

4. **Verify Success**
   - ✅ Success message displayed
   - ✅ Appointment status changed to CANCELLED
   - ✅ Appointment moves to "Past Appointments" or "Cancelled" section
   - ✅ Appointment no longer shows in "Upcoming Appointments"

5. **Check Waitlist Trigger (IMPORTANT!)**
   - Check backend console/logs
   - Look for log messages about waitlist matching
   - This should trigger automatic waitlist processing

### Expected API Call

```
DELETE /api/v1/self-schedule/cancel/:appointmentId
Request Body:
{
  "reason": "No longer needed",
  "notes": "Additional details" (optional)
}

Expected Response: 200 OK
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

### What to Check ✅

- [ ] Cancel button exists and is clickable
- [ ] Confirmation dialog appears
- [ ] Can provide cancellation reason
- [ ] Success message displayed
- [ ] Appointment status changes to CANCELLED
- [ ] Appointment removed from upcoming list
- [ ] API returns 200 OK status
- [ ] No errors in browser console
- [ ] Backend logs show waitlist matching triggered

### Potential Issues to Watch For ⚠️

- Cancel button might be missing
- Confirmation dialog might not appear
- API might return 400 (validation error)
- Appointment might not disappear from UI
- Waitlist matching might not trigger
- Cancellation might fail within 24-hour window

### Backend Log Check 📊

After cancelling, check backend console for:
```
Expected logs:
"Appointment cancelled: <appointment-id>"
"Checking waitlist for matches..."
"Found X waitlist entries for matching"
"Created Y waitlist offers"
```

---

## ❌ TASK 3: WAITLIST MANAGEMENT - SKIP (NO UI)

**Priority**: N/A - **CANNOT TEST**
**Status**: 🔴 **UI NOT IMPLEMENTED** (Backend only)
**Code Analysis**: No waitlist UI found in Portal Scheduling component

**Why Skip**:
- ✅ Backend APIs are fully implemented and ready
- ❌ Frontend UI does NOT exist (no buttons, forms, or displays)
- ❌ No "Join Waitlist" button
- ❌ No "My Waitlist Entries" section
- ❌ No "Waitlist Offers" display

**Recommendation**: Document as "Backend Complete, Frontend Pending Implementation"

---

### ~~Part A: Join Waitlist~~ (SKIP - NO UI)

1. **Create Scenario with No Availability**
   - Option 1: Book 8 appointments for one day (max daily limit)
   - Option 2: Try to book within 24 hours (should fail)
   - Goal: Encounter "No available slots" scenario

2. **Find "Join Waitlist" Option**
   - Look for "Join Waitlist" button or link
   - Might be on scheduling page or after failed booking attempt

3. **Fill Waitlist Form**
   - Clinician preference (specific or any)
   - Appointment type
   - Preferred days (e.g., Monday, Wednesday, Friday)
   - Preferred times (e.g., Morning, Afternoon)
   - Priority level (if configurable)

4. **Submit Waitlist Entry**
   - Click "Join Waitlist" or "Submit"

5. **Verify Success**
   - ✅ Success message displayed
   - ✅ Waitlist entry created
   - ✅ Can view in "My Waitlist Entries" (if UI exists)

### Expected API Call

```
POST /api/v1/waitlist
Request Body:
{
  "clinicianId": "<uuid>" or null (any clinician),
  "appointmentType": "Therapy Session",
  "preferredDays": ["MONDAY", "WEDNESDAY", "FRIDAY"],
  "preferredTimes": ["MORNING", "AFTERNOON"],
  "priority": 50,
  "notes": "Prefer morning appointments"
}

Expected Response: 201 Created
{
  "success": true,
  "data": {
    "id": "<waitlist-entry-id>",
    "clientId": "<your-client-id>",
    "status": "ACTIVE",
    ...
  }
}
```

### What to Check ✅

- [ ] Waitlist UI exists (button/form)
- [ ] Can select preferences
- [ ] Form submission works
- [ ] Success message displayed
- [ ] API returns 201 Created
- [ ] Waitlist entry created in database

---

### Part B: Waitlist Matching (Triggered by Cancellation)

**Note**: This should have been triggered when you cancelled the appointment in Task 2.

1. **Check Backend Logs**
   - Look for waitlist matching activity
   - Should see "Created waitlist offer" messages

2. **View Waitlist Offers**
   - Navigate to waitlist offers page (if UI exists)
   - Or check via API directly

3. **Verify Offer Creation**
   - ✅ WaitlistOffer created with match score
   - ✅ Match score between 0-100
   - ✅ Offer status: PENDING
   - ✅ Offer has expiration time (24 hours from creation)

### Expected API Call

```
GET /api/v1/waitlist/my-offers

Expected Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "<offer-id>",
      "waitlistEntryId": "<entry-id>",
      "clinicianId": "<clinician-id>",
      "appointmentDate": "2025-11-12T09:00:00.000Z",
      "status": "PENDING",
      "matchScore": 85,
      "matchReasons": ["Exact clinician match", "Appointment type match"],
      "expiresAt": "2025-11-11T09:00:00.000Z"
    }
  ]
}
```

### What to Check ✅

- [ ] Offers are created after cancellation
- [ ] Match scores are calculated (0-100 range)
- [ ] Offers have expiration time
- [ ] Offers show appointment details
- [ ] Can view offers in UI or via API

---

### Part C: Accept/Decline Waitlist Offer

1. **View Your Offers**
   - Should see offer(s) from cancelled appointment
   - Or use API to check: GET /api/v1/waitlist/my-offers

2. **Accept an Offer**
   - Click "Accept" button on an offer
   - Or make API call directly

3. **Verify Acceptance**
   - ✅ Success message displayed
   - ✅ Appointment created with offered slot
   - ✅ Offer status changed to ACCEPTED
   - ✅ Waitlist entry status updated
   - ✅ New appointment appears in "My Appointments"

4. **Test Decline (Optional)**
   - Create another offer scenario
   - Click "Decline" button
   - Verify offer status changes to DECLINED

### Expected API Calls

**Accept Offer**:
```
POST /api/v1/waitlist/:entryId/accept/:offerId

Expected Response: 200 OK
{
  "success": true,
  "data": {
    "appointment": {
      "id": "<new-appointment-id>",
      "appointmentDate": "...",
      "status": "SCHEDULED"
    },
    "offer": {
      "id": "<offer-id>",
      "status": "ACCEPTED"
    }
  }
}
```

**Decline Offer**:
```
POST /api/v1/waitlist/:entryId/decline/:offerId

Expected Response: 200 OK
{
  "success": true,
  "message": "Offer declined"
}
```

### What to Check ✅

- [ ] Can view waitlist offers
- [ ] Accept button works
- [ ] Appointment created from accepted offer
- [ ] Offer status changes to ACCEPTED
- [ ] Decline button works (if testing)
- [ ] API returns 200 OK
- [ ] No errors in console

---

## 🔍 TASK 4: TEST CLINICIAN VIEW (APPROVE APPOINTMENTS)

**Priority**: MEDIUM (Important but can be done separately)
**Estimated Time**: 10-15 minutes
**Prerequisite**: Must have a SCHEDULED appointment (status = pending approval)

### Steps to Test

1. **Logout from Portal Client**
   - Logout from current portal client session

2. **Login as Clinician**
   - Navigate to staff login (likely different from portal)
   - Login with clinician credentials
   - You'll need credentials for one of these test clinicians:
     - Sarah Smith, PhD
     - Michael Johnson, LCSW
     - Jennifer Williams, MD

3. **Navigate to Appointments Calendar/List**
   - Look for "Appointments" menu item
   - Or "My Calendar" / "My Schedule"
   - Find the calendar or appointments view

4. **Find Pending Appointments**
   - Look for appointments with status "SCHEDULED" (pending approval)
   - Should see the test appointment you booked earlier
   - Should show client details

5. **Approve Appointment**
   - Click on the pending appointment
   - Look for "Approve" or "Confirm" button
   - Click to approve

6. **Verify Approval**
   - ✅ Appointment status changes to CONFIRMED
   - ✅ Success message displayed
   - ✅ Appointment remains in calendar with confirmed status
   - ✅ Client details still visible

### Expected Behavior

**Appointment Display**:
```
Client: Test Client
Date: Wednesday, November 12, 2025
Time: 09:00 - 09:50 (50 minutes)
Type: Therapy Session
Modality: Video Call
Status: SCHEDULED → CONFIRMED (after approval)
```

**Approval Action**:
- Button/link to approve appointment
- Confirmation dialog (optional)
- Success feedback
- Status update in UI

### What to Check ✅

- [ ] Can login as clinician
- [ ] Appointments calendar/list exists
- [ ] Can see pending appointments (SCHEDULED status)
- [ ] Client details are displayed
- [ ] Approve button/action exists
- [ ] Approval updates status to CONFIRMED
- [ ] Success message shown
- [ ] No errors in console

### Potential Issues to Watch For ⚠️

- Clinician view might not exist yet
- Appointments might not be visible to clinicians
- No approval workflow implemented in UI
- Status might auto-update without manual approval
- Different UI than expected (table vs calendar)

### If No Clinician Credentials Available

**Alternative Testing Method**:

1. **Check Database Directly**
   ```sql
   -- Find clinician users
   SELECT id, email, firstName, lastName, roles
   FROM users
   WHERE roles @> ARRAY['CLINICIAN']::user_role[];

   -- Check appointment status
   SELECT id, clientId, clinicianId, appointmentDate, status
   FROM appointments
   WHERE status = 'SCHEDULED'
   ORDER BY appointmentDate DESC;
   ```

2. **Update Status Manually** (as workaround):
   ```sql
   UPDATE appointments
   SET status = 'CONFIRMED',
       statusUpdatedDate = NOW(),
       statusUpdatedBy = '<clinician-id>'
   WHERE id = '<appointment-id>';
   ```

3. **Report**: "Clinician UI not accessible - database verification performed instead"

### Backend API (If Direct Testing)

If there's an approval API endpoint:
```
PATCH /api/v1/appointments/:appointmentId/approve
or
PUT /api/v1/appointments/:appointmentId/status

Request Body:
{
  "status": "CONFIRMED",
  "notes": "Approved by clinician"
}

Expected Response: 200 OK
```

### Success Criteria

**Minimum**:
- ✅ Can view appointments as clinician
- ✅ Can see appointment details
- ✅ Can identify pending vs confirmed appointments

**Full Success**:
- ✅ All minimum criteria met
- ✅ Can manually approve appointments
- ✅ Status changes reflect in database
- ✅ Client sees updated status in their view

---

## 📊 REPORTING YOUR FINDINGS

### For Each Task, Report:

**Format**: Create a brief summary like this:

```
## TASK 1: RESCHEDULE APPOINTMENT - [PASSED/FAILED/PARTIAL]

### What Worked ✅
- Reschedule button found and clickable
- Date picker opened correctly
- Successfully rescheduled to Nov 13, 10:00 AM
- API returned 200 OK
- Appointment updated in UI

### Issues Found ⚠️
- Minor: Loading spinner not shown during API call
- Date picker shows past dates (should be disabled)

### API Verification
- Endpoint: PUT /api/v1/self-schedule/reschedule/:id
- Response: 200 OK
- Response time: ~300ms

### Screenshots
[Attach screenshots if any issues found]

### Overall Result: ✅ PASSED (Production ready with minor UI improvements)
```

---

## 🎯 SUCCESS CRITERIA

### Minimum to Pass (MVP)
- ✅ Reschedule works without errors
- ✅ Cancel works and removes appointment
- ✅ Waitlist entry can be created

### Full Success (Complete Feature)
- ✅ All MVP criteria met
- ✅ Waitlist matching creates offers
- ✅ Accept offer creates appointment
- ✅ All API calls return success
- ✅ No blocking errors in console

---

## 🚨 IF YOU ENCOUNTER BLOCKERS

### UI Not Found
**Issue**: Reschedule/Cancel/Waitlist buttons missing
**Action**:
1. Check the PortalSelfScheduling.tsx component
2. Search for "reschedule" or "cancel" in the code
3. Report: "UI not implemented for [feature]"

### API Returns 404
**Issue**: Endpoint not found
**Action**:
1. Verify routes are registered in index.ts
2. Check self-scheduling.routes.ts
3. Report: "Endpoint not registered: [endpoint]"

### API Returns 400/500
**Issue**: Backend error
**Action**:
1. Check backend console for error logs
2. Copy full error message
3. Report with error details

### Feature Not Implemented
**Action**:
- Simply report: "[Feature] not implemented"
- Mark as PENDING
- Move to next task

---

## 📝 FINAL CHECKLIST

After completing all tasks, verify:

- [ ] Tested reschedule appointment flow
- [ ] Tested cancel appointment flow
- [ ] Tested join waitlist flow
- [ ] Verified waitlist matching (checked logs)
- [ ] Tested accept/decline offer (if offers were created)
- [ ] Documented all findings
- [ ] Noted any blockers or issues
- [ ] Captured screenshots of any errors
- [ ] Verified API responses in DevTools Network tab

---

## 📚 REFERENCE DOCUMENTATION

If you need more details, refer to:

1. **[CURSOR_MODULE_7_TESTING_GUIDE.md](CURSOR_MODULE_7_TESTING_GUIDE.md)**
   - Detailed test scenarios
   - API endpoint reference

2. **[MODULE_7_TESTING_FINDINGS.md](MODULE_7_TESTING_FINDINGS.md)**
   - Architecture details
   - Known limitations

3. **[MODULE_7_SELF_SCHEDULING_TEST_RESULTS.md](MODULE_7_SELF_SCHEDULING_TEST_RESULTS.md)**
   - Results from booking flow test
   - What's already verified

---

## 🎯 YOUR GOAL

**Complete Module 7 testing** by verifying the remaining 3 features and documenting your findings. Even if features are not implemented or have issues, document what you find - that information is valuable!

**Estimated Total Time**: 30-45 minutes

**Start with**: TASK 1 (Reschedule) - it's the quickest and most critical

---

**Good luck! 🚀**

**Questions?** Check the reference documentation or ask for clarification.

