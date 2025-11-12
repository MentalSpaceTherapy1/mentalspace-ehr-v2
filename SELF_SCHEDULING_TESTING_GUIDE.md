# Portal Self-Scheduling Testing Guide

## Quick Start Testing

### Prerequisites
1. Backend server running on `http://localhost:3001`
2. Frontend server running on `http://localhost:5173` (or your Vite port)
3. User logged into Client Portal
4. At least one clinician with availability configured
5. At least one appointment type marked as `allowOnlineBooking: true`

---

## Test Scenarios

### Scenario 1: Happy Path - Complete Booking

**Steps:**
1. Navigate to `/portal/self-scheduling` (or your portal route)
2. **Step 1 - Select Clinician:**
   - Verify clinician cards display with photos/avatars
   - Test search by typing clinician name
   - Test specialty filter dropdown
   - Test sort by "Next Available"
   - Click a clinician card - should highlight with blue border
3. **Step 2 - Select Appointment Type:**
   - Verify "Scheduling with [Clinician Name]" message displays
   - Click "Telehealth" preference button
   - Verify only telehealth-compatible types show
   - Click an appointment type - should highlight
4. **Step 3 - Choose Date & Time:**
   - Verify 14-day calendar displays
   - Verify dates with slots are green, no slots are gray
   - Click a date with slots
   - Verify time slots grouped by Morning/Afternoon/Evening
   - Click a time slot
5. **Step 4 - Review & Confirm:**
   - Verify all selections summarized correctly
   - Enter notes in text field
   - Check email confirmation checkbox
   - Check SMS reminder checkbox
   - Check "I agree to policy" checkbox
   - Click "Confirm Appointment"
6. **Success Dialog:**
   - Verify confirmation number displays
   - Click "Add to Calendar" - .ics file should download
   - Verify filename is `appointment-[confirmation-number].ics`
7. **Verify My Appointments:**
   - Scroll down to "My Upcoming Appointments"
   - Verify newly booked appointment appears
   - Verify status is "CONFIRMED" or "PENDING"

**Expected Result:** Appointment successfully booked, confirmation displayed, .ics downloaded, appointment visible in list.

---

### Scenario 2: Navigation - Back and Forth

**Steps:**
1. Complete Step 1 (select clinician)
2. Click "Next"
3. Complete Step 2 (select appointment type)
4. Click "Back" button at bottom
5. Verify you're on Step 2 with previous selection still highlighted
6. Click "Back" again
7. Verify you're on Step 1 with clinician still selected
8. Change clinician selection
9. Click "Next" twice to get to Step 3
10. Verify slots load for new clinician

**Expected Result:** Back/Next navigation works smoothly, selections persist, data refetches appropriately.

---

### Scenario 3: Filter and Search

**Steps:**
1. On Step 1, type partial name in search box
2. Verify clinician list filters instantly
3. Clear search
4. Select a specialty from dropdown (if multiple specialties exist)
5. Verify only clinicians with that specialty show
6. Change sort to "Next Available"
7. Verify clinicians reorder (if next available dates exist)

**Expected Result:** All filters and search work without delays, proper filtering applied.

---

### Scenario 4: Empty States

**Steps:**
1. **No clinicians match:**
   - Type nonsense in search field
   - Verify "No clinicians found" alert shows
2. **No appointment types match:**
   - Select "In-Person" preference
   - If no in-person types exist, verify "No appointment types available" shows
3. **No slots for date:**
   - Navigate to Step 3
   - Click a gray date (no slots)
   - Verify "No available slots" alert shows
4. **No appointments:**
   - If user has no appointments, verify empty state with calendar icon and "Book Appointment" button

**Expected Result:** Friendly empty states display, no crashes or blank screens.

---

### Scenario 5: Cancel Appointment

**Steps:**
1. Ensure at least one appointment exists that can be cancelled (> 24 hours away)
2. Scroll to "My Upcoming Appointments"
3. Click "Cancel" button on an appointment
4. Verify cancel dialog opens
5. Try clicking "Cancel Appointment" button - should be disabled
6. Enter a reason in text field
7. Click "Cancel Appointment"
8. Verify toast success message
9. Verify appointment removed or status updated in list

**Expected Result:** Cancellation works, requires reason, shows feedback.

---

### Scenario 6: Cannot Cancel Within 24 Hours

**Steps:**
1. Create an appointment < 24 hours away (via admin or direct DB)
2. Verify "Cancel" button is disabled on that appointment
3. Hover over button - tooltip should say "Cannot cancel within 24 hours"

**Expected Result:** Button disabled, tooltip explains why.

---

### Scenario 7: Reschedule Appointment

**Steps:**
1. Click "Reschedule" on an existing appointment
2. Verify wizard opens at Step 3 (date selection)
3. Verify Step 1 and 2 indicators show as complete
4. Verify clinician and type from original appointment are pre-selected
5. Select a new date and time
6. Complete Step 4 and book
7. Verify original appointment updated or new one created (depends on backend logic)

**Expected Result:** Reschedule flow works, pre-fills selections, allows changing date/time.

---

### Scenario 8: Error Handling - Slot Conflict

**Steps:**
1. Open self-scheduling in two browser tabs
2. In Tab 1, select clinician, type, and date/time
3. In Tab 2, select SAME clinician, type, date/time
4. In Tab 2, complete booking first
5. In Tab 1, try to complete booking
6. Verify error toast appears
7. Verify available slots refresh
8. Verify conflicting slot no longer appears

**Expected Result:** Conflict detected, error shown, slots refreshed.

---

### Scenario 9: Validation - Cannot Proceed Without Completing Step

**Steps:**
1. On Step 1, without selecting a clinician, click "Next"
2. Verify button is disabled or nothing happens
3. Select a clinician, click "Next"
4. On Step 2, click "Next" without selecting type
5. Verify button is disabled
6. Select type, go to Step 3
7. Click "Next" without selecting date/time
8. Verify button is disabled
9. Select date/time, go to Step 4
10. Try to click "Confirm Appointment" without checking policy
11. Verify button is disabled
12. Check policy, verify button becomes enabled

**Expected Result:** Cannot proceed without completing each step, clear visual feedback.

---

### Scenario 10: Mobile Responsive

**Steps:**
1. Open browser DevTools
2. Switch to mobile viewport (iPhone 12 Pro, 390x844)
3. Navigate through all wizard steps
4. Verify:
   - Single-column layout for clinician cards
   - Filters stack vertically
   - Calendar remains 7 columns but smaller
   - Time slots become full-width
   - Bottom navigation buttons full-width
   - My Appointments cards stack
5. Test on actual mobile device if possible

**Expected Result:** All features accessible on mobile, no horizontal scrolling, touch targets adequate size.

---

### Scenario 11: Calendar Export (.ics)

**Steps:**
1. Complete a booking
2. In success dialog, click "Add to Calendar"
3. Verify .ics file downloads
4. Open file with calendar app (Outlook, Google Calendar, Apple Calendar)
5. Verify event imports correctly with:
   - Correct date and time
   - Clinician name in title
   - Appointment type in description
   - Duration matches expected time
   - Location is "Virtual Meeting" for telehealth or "Office" for in-person

**Expected Result:** .ics file valid, imports correctly into calendar applications.

---

### Scenario 12: Notes Field Character Limit

**Steps:**
1. Go to Step 4
2. Click in notes field
3. Type exactly 500 characters
4. Verify counter shows "500/500"
5. Try to type more
6. Verify additional characters don't appear
7. Submit booking with max-length notes
8. Verify notes saved (check in backend or appointment details)

**Expected Result:** Character limit enforced, counter accurate, notes saved.

---

### Scenario 13: Date Range Navigation

**Steps:**
1. Go to Step 3
2. Note the displayed date range (e.g., "Jan 9 - Jan 22, 2025")
3. Click forward arrow
4. Verify range advances 14 days (e.g., "Jan 23 - Feb 5, 2025")
5. Click back arrow twice
6. Verify range goes back (e.g., "Jan 9 - Jan 22, 2025")
7. Keep clicking back arrow
8. Verify cannot go before today's date (button disabled)

**Expected Result:** Date navigation works, cannot navigate to past.

---

### Scenario 14: Session Persistence

**Steps:**
1. Start booking, complete Step 1 and 2
2. Refresh the page
3. Verify wizard resets to Step 1
4. Verify selections are cleared

**Note:** Currently no session persistence. Future enhancement could save to localStorage.

**Expected Result:** Refresh clears wizard (expected behavior).

---

### Scenario 15: Multiple Appointments View

**Steps:**
1. Book 3-5 different appointments
2. Scroll to "My Upcoming Appointments"
3. Verify all appointments display
4. Verify each shows:
   - Correct date/time
   - Correct clinician
   - Correct appointment type
   - Correct modality icon
   - Status badge
   - Reschedule and Cancel buttons

**Expected Result:** All appointments visible with correct information.

---

## API Endpoint Testing

### Manual API Tests (Postman/curl)

#### 1. Get Clinicians
```bash
curl -X GET http://localhost:3001/api/v1/users?role=CLINICIAN \
  -H "Authorization: Bearer YOUR_PORTAL_TOKEN"
```

**Expected:** Array of clinician objects with id, firstName, lastName, email, etc.

#### 2. Get Appointment Types
```bash
curl -X GET http://localhost:3001/api/v1/appointment-types \
  -H "Authorization: Bearer YOUR_PORTAL_TOKEN"
```

**Expected:** Array of appointment types, filtered to show only `allowOnlineBooking: true`.

#### 3. Get Available Slots
```bash
curl -X GET "http://localhost:3001/api/v1/self-schedule/available-slots/CLINICIAN_ID?startDate=2025-01-09&endDate=2025-01-23" \
  -H "Authorization: Bearer YOUR_PORTAL_TOKEN"
```

**Expected:** Array of DaySlots with dates and time slots.

#### 4. Book Appointment
```bash
curl -X POST http://localhost:3001/api/v1/self-schedule/book \
  -H "Authorization: Bearer YOUR_PORTAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clinicianId": "CLINICIAN_ID",
    "appointmentTypeId": "TYPE_ID",
    "date": "2025-01-15T14:00:00.000Z",
    "time": "14:00",
    "duration": 60,
    "modality": "TELEHEALTH",
    "notes": "Test booking",
    "emailConfirmation": true,
    "smsReminder": true
  }'
```

**Expected:** Success response with confirmation number.

#### 5. Get My Appointments
```bash
curl -X GET http://localhost:3001/api/v1/self-schedule/my-appointments \
  -H "Authorization: Bearer YOUR_PORTAL_TOKEN"
```

**Expected:** Array of user's upcoming appointments.

#### 6. Cancel Appointment
```bash
curl -X DELETE http://localhost:3001/api/v1/self-schedule/cancel/APPOINTMENT_ID \
  -H "Authorization: Bearer YOUR_PORTAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test cancellation"}'
```

**Expected:** Success response.

---

## Browser Console Debugging

### Check for Errors
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate through self-scheduling
4. Look for:
   - ❌ Red errors (should be none)
   - ⚠️ Warnings (Material-UI may have some, okay if functional)
   - API request logs (should show "[API REQUEST]" logs)

### Network Tab Monitoring
1. Open Network tab
2. Filter by XHR/Fetch
3. Navigate through wizard
4. Verify requests:
   - GET /api/v1/users?role=CLINICIAN - Status 200
   - GET /api/v1/appointment-types - Status 200
   - GET /api/v1/self-schedule/available-slots/... - Status 200
   - POST /api/v1/self-schedule/book - Status 200 or 201
   - GET /api/v1/self-schedule/my-appointments - Status 200
   - DELETE /api/v1/self-schedule/cancel/... - Status 200

---

## Performance Testing

### Load Time
1. Open browser DevTools > Performance tab
2. Start recording
3. Navigate to self-scheduling page
4. Stop recording after page loads
5. Verify:
   - Time to Interactive < 2 seconds
   - Largest Contentful Paint < 1.5 seconds
   - No long tasks > 50ms blocking main thread

### Slot Fetching
1. Go to Step 3
2. Note time it takes to load slots
3. Should be < 1 second for typical dataset
4. If slow, check:
   - Backend query performance
   - Network latency
   - Number of slots being returned

---

## Accessibility Testing

### Keyboard Navigation
1. Close mouse/trackpad
2. Use only Tab, Enter, Space, Arrow keys
3. Verify:
   - Can tab through all interactive elements
   - Focus visible on all elements
   - Enter activates buttons
   - Arrow keys navigate selects/dropdowns
   - Can complete entire booking flow keyboard-only

### Screen Reader Testing (Optional but Recommended)
1. Enable screen reader:
   - Windows: Narrator (Win + Ctrl + Enter)
   - macOS: VoiceOver (Cmd + F5)
   - Linux: Orca
2. Navigate through page
3. Verify:
   - All text read aloud
   - Button purposes announced
   - Form labels associated
   - Error messages announced
   - Step changes announced

---

## Edge Case Testing

### Extremely Long Names
- Test with clinician name > 50 characters
- Verify text truncates or wraps properly

### Many Specialties
- If > 10 specialties, verify dropdown scrolls

### No Appointments
- Verify empty state looks good
- "Book Appointment" button scrolls to top

### Very Busy Day (100+ Slots)
- Verify only first batch shows
- Check for performance issues

### Network Offline
- Disable network
- Try to book appointment
- Verify graceful error handling

---

## Regression Testing Checklist

After any changes to the code, re-run these tests:

- [ ] Can complete a booking end-to-end
- [ ] Search and filters work
- [ ] Back/Next navigation works
- [ ] Validation prevents incomplete submissions
- [ ] Cancel appointment works
- [ ] Reschedule appointment works
- [ ] .ics download works
- [ ] Mobile view functional
- [ ] No console errors
- [ ] All API calls succeed

---

## Known Issues to Watch For

1. **Date Timezone Issues:**
   - If slots show wrong times, check timezone handling
   - Backend and frontend should use same timezone reference

2. **Stale Slot Data:**
   - If slots don't refresh after date change, check useEffect dependencies

3. **Material-UI Theme Issues:**
   - If colors/styles look wrong, verify MUI theme provider wraps app

4. **Token Expiration:**
   - If get 401 errors, check portal token validity
   - Token should auto-refresh via api.ts interceptor

---

## Success Criteria

The implementation is considered successful when:
- ✅ All 15 test scenarios pass
- ✅ No console errors during normal usage
- ✅ All API endpoints return expected data
- ✅ Mobile view works without issues
- ✅ Can complete booking in < 2 minutes
- ✅ Error messages are clear and helpful
- ✅ Accessibility score > 90 in Lighthouse
- ✅ No regressions in existing portal functionality

---

**Happy Testing!**

For questions or issues, check:
- Implementation report: `PORTAL_SELF_SCHEDULING_IMPLEMENTATION_REPORT.md`
- Backend API documentation
- Material-UI component docs: https://mui.com
- date-fns documentation: https://date-fns.org
