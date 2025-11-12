# Cursor: Module 7 Complete Testing - ALL 3 Features Ready

**Date**: 2025-11-10 (UPDATED - Waitlist UI Now Complete!)
**Priority**: CRITICAL
**Status**: 🟢 **ALL FEATURES CODE-COMPLETE** - Ready for Full E2E Testing
**Estimated Time**: 30-40 minutes (3 features)

---

## 🎯 WHAT CHANGED SINCE LAST UPDATE

**MAJOR UPDATE**: Claude Code has implemented the **COMPLETE Waitlist UI** (~600 lines of code)!

**Previous Status** (from your code analysis):
- ❌ Waitlist: Backend complete, **NO UI** → **SKIP TESTING**

**CURRENT STATUS** (after Claude Code implementation):
- ✅ **Waitlist UI**: **FULLY IMPLEMENTED** → **READY TO TEST NOW**

**Files Modified**:
1. [packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx](packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx) - Added complete Waitlist UI
2. [packages/frontend/src/lib/api.ts](packages/frontend/src/lib/api.ts) - Fixed authentication for waitlist routes

---

## 📋 YOUR MISSION - TEST ALL 3 FEATURES

You need to test these **3 critical features** in this session:

1. ✅ **Reschedule Appointment** - 400 error FIXED (payload corrected)
2. ✅ **Cancel Appointment** - Fully implemented, ready to test
3. ✅ **Waitlist Management** - **COMPLETE UI JUST ADDED** (NEW!)

---

## 🔧 CRITICAL FIXES APPLIED

### Fix 1: Reschedule 400 Error (RESOLVED)
**What was broken**: Frontend sent wrong payload causing 400 Bad Request
**What was fixed**:
```typescript
// Before (incorrect):
{
  appointmentDate: ...,
  duration: ...,
  serviceLocation: ...,
  notes: ...
}

// After (correct):
{
  newAppointmentDate: appointmentDateTime.toISOString(),
  reason: wizardState.notes
}
```
**Status**: ✅ Fixed in [PortalSelfScheduling.tsx:313-316](packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx#L313-L316)

### Fix 2: Waitlist Authentication (RESOLVED)
**What was broken**: `/waitlist/` routes returned 401 Unauthorized
**What was fixed**: Added `/waitlist/` to portal route detection
**Status**: ✅ Fixed in [api.ts:30, 60](packages/frontend/src/lib/api.ts#L30)

---

## 🧪 TASK 1: TEST RESCHEDULE APPOINTMENT

**Priority**: HIGH
**Estimated Time**: 10 minutes
**Prerequisite**: Must have at least one existing appointment

### Steps to Test

1. **Navigate to Self-Scheduling Page**
   - URL: http://localhost:5176/portal/schedule
   - Login as portal client if needed

2. **Find Existing Appointment**
   - Scroll to "My Upcoming Appointments" section
   - Locate an appointment card

3. **Click Reschedule Button**
   - Look for "Reschedule" button on appointment card
   - Click it

4. **Complete Reschedule Wizard**
   - Wizard should pre-populate with existing appointment details
   - Clinician should already be selected (Step 1 completed)
   - Appointment type should already be selected (Step 2 completed)
   - You start at Step 3: Choose new date/time

5. **Select New Date/Time**
   - Use calendar to pick a different date
   - Select a new available time slot
   - Click "Next" to proceed to Step 4

6. **Confirm Booking**
   - Review the new appointment details
   - Add/edit notes if desired
   - Click "Confirm Booking"

7. **Verify Success**
   - ✅ PUT request to `/self-schedule/reschedule/:id` returns **200 OK** (NOT 400!)
   - ✅ Success dialog appears
   - ✅ Appointment list refreshes automatically
   - ✅ Appointment shows NEW date/time
   - ✅ No errors in browser console

### What to Check in Network Tab

**Request URL**: `PUT http://localhost:3001/api/v1/self-schedule/reschedule/{appointment-id}`

**Request Payload** (should be):
```json
{
  "newAppointmentDate": "2025-11-15T14:00:00.000Z",
  "reason": "Need to reschedule due to conflict"
}
```

**Expected Response**: `200 OK`
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully",
  "data": { ... }
}
```

### Success Criteria ✅

- [ ] Reschedule button exists and clickable
- [ ] Wizard opens with pre-populated data
- [ ] Can select new date/time
- [ ] Confirm button works
- [ ] **PUT request returns 200 OK (NOT 400)**
- [ ] Request payload matches expected format (newAppointmentDate, reason)
- [ ] Appointment updates in "My Appointments" list
- [ ] Success message displayed
- [ ] No console errors

---

## 🧪 TASK 2: TEST CANCEL APPOINTMENT

**Priority**: HIGH
**Estimated Time**: 5 minutes
**Prerequisite**: Must have at least one existing appointment

### Steps to Test

1. **Find Existing Appointment**
   - In "My Upcoming Appointments" section
   - Locate an appointment card

2. **Click Cancel Button**
   - Look for "Cancel" button on appointment card
   - Click it

3. **Fill Cancellation Reason**
   - Dialog should open asking for reason
   - Enter a reason (e.g., "Schedule conflict")
   - Click "Cancel Appointment" button

4. **Verify Cancellation**
   - ✅ DELETE request to `/self-schedule/cancel/:id` returns 200 OK
   - ✅ Success message appears
   - ✅ Appointment removed from "My Appointments" list
   - ✅ Backend logs show waitlist matching triggered (check backend console)
   - ✅ No errors in browser console

### What to Check in Network Tab

**Request URL**: `DELETE http://localhost:3001/api/v1/self-schedule/cancel/{appointment-id}`

**Request Payload**:
```json
{
  "reason": "Schedule conflict"
}
```

**Expected Response**: `200 OK`
```json
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

### Backend Logs to Watch For

After cancellation, backend should log:
```
Appointment cancelled: <appointment-id>
Checking waitlist for matches...
Found X waitlist entries for matching
Created Y waitlist offers
```

### Success Criteria ✅

- [ ] Cancel button exists and clickable
- [ ] Cancellation dialog opens
- [ ] Can enter cancellation reason
- [ ] Confirm button works
- [ ] DELETE request returns 200 OK
- [ ] Request payload includes reason
- [ ] Appointment disappears from list
- [ ] Success message displayed
- [ ] Backend logs show waitlist matching (if any waitlist entries exist)
- [ ] No console errors

---

## 🧪 TASK 3: TEST WAITLIST MANAGEMENT (NEWLY IMPLEMENTED!)

**Priority**: CRITICAL (This is the big one - just implemented!)
**Estimated Time**: 15-20 minutes
**Status**: 🆕 **COMPLETE UI JUST ADDED BY CLAUDE CODE**

### What Was Implemented

**Complete Waitlist UI** with 6 features:
1. ✅ View "My Waitlist Entries" section
2. ✅ View "Available Offers" (if any matches found)
3. ✅ Join Waitlist dialog with full form
4. ✅ Accept offer button
5. ✅ Decline offer button
6. ✅ Remove from waitlist button

**UI Components Added** (lines 1590-1895 in PortalSelfScheduling.tsx):
- Waitlist Management section header with "+ Join Waitlist" button
- Available Offers display (green-themed cards with match scores)
- My Waitlist Entries display (entry cards with status badges)
- Join Waitlist dialog (full form with validation)

### Part A: View Waitlist Section

1. **Scroll to Bottom of Page**
   - After "My Appointments" section
   - Look for "Waitlist Management" heading

2. **Verify Section Exists**
   - ✅ "Waitlist Management" heading visible
   - ✅ "+ Join Waitlist" button visible (top-right)
   - ✅ Section displays "My Waitlist Entries" subsection

3. **Check Initial State**
   - If no entries: Should show empty state with message "You're not on any waitlists yet"
   - Should show a "Join Waitlist" button in empty state
   - **Check Network Tab**:
     - `GET /waitlist/my-entries` should return **200 OK** (NOT 401!)
     - `GET /waitlist/my-offers` should return **200 OK** (NOT 401!)

### Part B: Join Waitlist

1. **Click "+ Join Waitlist" Button**
   - Should open a dialog/modal
   - Dialog title: "Join Waitlist"

2. **Verify Form Fields Exist**
   - ✅ Clinician dropdown (optional) - "Preferred Clinician (Optional)"
   - ✅ Appointment Type dropdown (required) - "Appointment Type *"
   - ✅ Preferred Days - Clickable chips (Mon-Sun)
   - ✅ Preferred Times - Clickable chips (Morning/Afternoon/Evening)
   - ✅ Priority dropdown (Normal/High/Urgent)
   - ✅ Notes textarea (optional, max 500 chars)
   - ✅ Cancel and "Join Waitlist" buttons

3. **Fill Out Form**
   - Select appointment type: Choose "Therapy Session (50 min)" or similar
   - Click preferred days: Click "Monday", "Wednesday", "Friday" (chips should turn blue/filled)
   - Click preferred times: Click "Morning", "Afternoon" (chips should turn blue/filled)
   - Select priority: Choose "Normal" (or High/Urgent if testing)
   - Add notes (optional): Type "Looking for morning slots"

4. **Validate Form**
   - Try clicking "Join Waitlist" WITHOUT selecting appointment type → Should show error toast
   - Try clicking WITHOUT selecting days → Should show error toast
   - Try clicking WITHOUT selecting times → Should show error toast
   - Button should be disabled until all required fields filled

5. **Submit Form**
   - Fill all required fields
   - Click "Join Waitlist" button
   - **Check Network Tab**:
     - `POST /waitlist` should return **200/201** (NOT 401!)
     - **Authorization header should use portalToken** (not regular token)

6. **Verify Success**
   - ✅ Success toast: "Successfully joined the waitlist!"
   - ✅ Dialog closes
   - ✅ Form resets (clears all fields)
   - ✅ New entry appears in "My Waitlist Entries" section
   - ✅ No console errors

### Part C: View My Waitlist Entries

1. **Locate Entry Card**
   - Should see a card in "My Waitlist Entries" section
   - Card should display:
     - Appointment type (e.g., "Therapy Session")
     - Clinician: "Any Available Clinician" (if none selected) or specific name
     - Preferred days: "Days: Monday, Wednesday, Friday"
     - Preferred times: "Times: Morning, Afternoon"
     - Status badge: "ACTIVE" (green)
     - Joined date: "Joined: Nov 10, 2025"

2. **Verify Entry Details**
   - ✅ All information displays correctly
   - ✅ Chips show selected days/times
   - ✅ Status badge is green and says "ACTIVE"
   - ✅ "Remove from Waitlist" button exists

### Part D: Remove from Waitlist

1. **Click "Remove from Waitlist" Button**
   - On an entry card
   - Button should have red outline

2. **Verify Removal**
   - ✅ DELETE request to `/waitlist/{entry-id}` returns 200 OK
   - ✅ Success toast: "Removed from waitlist"
   - ✅ Entry card disappears from list
   - ✅ If no more entries, shows empty state again
   - ✅ No console errors

### Part E: Accept/Decline Offers (If Available)

**Note**: This requires waitlist offers to exist. To test:
1. Cancel an appointment (triggers waitlist matching)
2. If you have a waitlist entry with matching preferences, an offer should appear

**If offers exist**:

1. **Locate Offer Card**
   - Look for "Available Appointments for You" section (above entries)
   - Green-themed card with border
   - Should display:
     - Match score badge (e.g., "Match Score: 85%")
     - Date: "Friday, November 15, 2025"
     - Time: "09:00 - 09:50"
     - Type: "Therapy Session"
     - Match reasons (chips): Why it matches your preferences
     - Expiration: "Expires: in 23 hours" (relative time)

2. **Test Accept Offer**
   - Click green "Accept" button
   - **Check Network Tab**: `POST /waitlist/{entry-id}/accept/{offer-id}` returns 200 OK
   - ✅ Success toast: "Offer accepted! Your appointment has been scheduled."
   - ✅ Offer card disappears
   - ✅ NEW appointment appears in "My Appointments" section
   - ✅ Waitlist entries list refreshes

3. **Test Decline Offer** (alternative)
   - Click red "Decline" button
   - **Check Network Tab**: `POST /waitlist/{entry-id}/decline/{offer-id}` returns 200 OK
   - ✅ Success toast: "Offer declined"
   - ✅ Offer card disappears
   - ✅ Waitlist entry remains active

### Success Criteria for Waitlist ✅

**UI Display**:
- [ ] Waitlist Management section exists at bottom of page
- [ ] "+ Join Waitlist" button visible and clickable
- [ ] "My Waitlist Entries" subsection displays

**Join Waitlist**:
- [ ] Dialog opens when clicking "+ Join Waitlist"
- [ ] All form fields exist and functional
- [ ] Day/time chips are clickable and toggle selected state
- [ ] Form validation works (shows errors for missing required fields)
- [ ] Submit button disabled until required fields filled
- [ ] POST request returns 200/201 (NOT 401)
- [ ] Success message shown
- [ ] Dialog closes and form resets
- [ ] New entry appears in list

**View Entries**:
- [ ] Entry cards display all information correctly
- [ ] Status badges show correct state
- [ ] Preferred days/times display as chips
- [ ] "Remove from Waitlist" button exists

**Remove Entry**:
- [ ] DELETE request returns 200 OK
- [ ] Entry disappears from list
- [ ] Success message shown
- [ ] Empty state shows if no entries remain

**Accept/Decline Offers** (if offers exist):
- [ ] Offer cards display with match scores
- [ ] Accept button creates appointment
- [ ] Decline button removes offer
- [ ] Expiration time displays correctly

**Authentication**:
- [ ] NO 401 errors on any waitlist endpoints
- [ ] All requests use portalToken (check Network tab Authorization header)

---

## 🔍 IMPORTANT DEBUGGING NOTES

### Authentication Check

**If you see 401 errors on waitlist endpoints**:

1. **Check Network Tab → Request Headers**:
   - Authorization header should be: `Bearer <portalToken>`
   - Should NOT be empty or using regular token

2. **Check localStorage**:
   - Open Console and run: `localStorage.getItem('portalToken')`
   - Should return a JWT token string

3. **Hard Refresh**:
   - Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - Clear cache if needed

4. **Re-login if needed**:
   - If portal token expired, logout and login again

### Common Issues

**Issue**: Waitlist section not visible
- **Fix**: Scroll to bottom of page (after "My Appointments")

**Issue**: Form validation errors not showing
- **Fix**: Check browser console for toast library errors

**Issue**: Chips not toggling selected state
- **Fix**: Check if onClick handlers are working (should see state change)

**Issue**: Network requests returning 401
- **Fix**: Authentication fix should resolve this - verify api.ts has `/waitlist/` in both interceptors

---

## 📊 REPORTING YOUR FINDINGS

### Create Test Report

For each task, report:

```markdown
## TASK 1: RESCHEDULE APPOINTMENT - [PASSED/FAILED/PARTIAL]

**Testing Date**: 2025-11-10
**Browser**: [Chrome/Firefox/Safari]

### Results:
- [✅/❌] Reschedule button exists
- [✅/❌] Wizard opens correctly
- [✅/❌] Can select new date/time
- [✅/❌] PUT request returns 200 OK (previously returned 400)
- [✅/❌] Request payload correct (newAppointmentDate, reason)
- [✅/❌] Appointment updated in list
- [✅/❌] No console errors

### Issues Found:
- [List any bugs or problems]

### Screenshots:
- [Attach if issues found]

---

## TASK 2: CANCEL APPOINTMENT - [PASSED/FAILED/PARTIAL]

[Same format as above]

---

## TASK 3: WAITLIST MANAGEMENT - [PASSED/FAILED/PARTIAL]

**Testing Date**: 2025-11-10

### Part A: View Section
- [✅/❌] Section exists and visible
- [✅/❌] "+ Join Waitlist" button visible
- [✅/❌] GET requests return 200 OK (no 401 errors)

### Part B: Join Waitlist
- [✅/❌] Dialog opens
- [✅/❌] All form fields exist
- [✅/❌] Chips toggle correctly
- [✅/❌] Form validation works
- [✅/❌] POST request returns 200/201
- [✅/❌] Entry appears in list

### Part C: View Entries
- [✅/❌] Entry cards display correctly
- [✅/❌] All details shown (type, days, times, status)

### Part D: Remove Entry
- [✅/❌] Remove button works
- [✅/❌] DELETE request returns 200 OK
- [✅/❌] Entry disappears

### Part E: Offers (if available)
- [✅/❌] Offer cards display
- [✅/❌] Accept button works
- [✅/❌] Decline button works

### Issues Found:
- [List any bugs or problems]
```

---

## 🎯 OVERALL SUCCESS CRITERIA

**Module 7 is COMPLETE when**:
- ✅ Reschedule returns 200 OK (not 400)
- ✅ Cancel removes appointment successfully
- ✅ Waitlist section displays correctly
- ✅ Can join waitlist successfully
- ✅ Can view waitlist entries
- ✅ Can remove from waitlist
- ✅ NO 401 errors on any waitlist endpoints
- ✅ All API calls use correct authentication token

---

## 📍 QUICK START

**Ready to test? Start here**:

1. **Open Browser**: Navigate to http://localhost:5176/portal/schedule
2. **Login**: Use portal client credentials
3. **Test Order**:
   - First: Reschedule (quickest to verify 400 fix)
   - Second: Cancel (quick test, triggers waitlist matching)
   - Third: Waitlist (comprehensive - newly implemented UI)

**Servers Running?**
- Backend: http://localhost:3001 ✅
- Frontend: http://localhost:5176 ✅

**Good luck! This is the big one - complete Waitlist UI testing!** 🚀
