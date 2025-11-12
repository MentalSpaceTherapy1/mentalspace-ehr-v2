# ✅ Module 7 Testing Checklist for Cursor

**Test Client:** John Doe (john.doe@example.com / TestClient123!)
**Test Date:** _____________
**Tester:** Cursor AI

---

## 🔐 Phase 1: Authentication & Access

### Client Portal Login
- [ ] Navigate to http://localhost:5175/portal/login
- [ ] Enter email: john.doe@example.com
- [ ] Enter password: TestClient123!
- [ ] Click "Login"
- [ ] ✅ **Expected:** Successfully logged in, redirected to dashboard
- [ ] 📝 **Notes:** _____________________________________________

### Portal Navigation
- [ ] Verify client name displays: "John Doe"
- [ ] Check navigation menu is visible
- [ ] Verify all Module 7 menu items appear:
  - [ ] Progress Tracking submenu
  - [ ] Self-Schedule option
  - [ ] Guardian Portal submenu
- [ ] 📝 **Notes:** _____________________________________________

---

## 📊 Phase 2: Progress Tracking Features

### Symptom Diary (Route: `/client/symptoms`)
- [ ] Click "Progress Tracking" → "Symptom Diary"
- [ ] Page loads without errors
- [ ] UI elements render correctly:
  - [ ] Date picker
  - [ ] Symptom input fields
  - [ ] Severity sliders/scales
  - [ ] Notes/comments section
  - [ ] Save button

**Create New Entry:**
- [ ] Select today's date
- [ ] Add symptom: "Anxiety"
- [ ] Set severity: 7/10
- [ ] Add notes: "Test symptom entry"
- [ ] Click "Save"
- [ ] ✅ **Expected:** Entry saved successfully, appears in list
- [ ] 📝 **Notes:** _____________________________________________

**View Existing Entries:**
- [ ] Previously created entry displays
- [ ] Date shows correctly
- [ ] Severity indicator visible
- [ ] Can filter by date range
- [ ] Can edit existing entry
- [ ] Can delete entry
- [ ] 📝 **Notes:** _____________________________________________

**Data Visualization:**
- [ ] Chart/graph displays symptom trends
- [ ] Legend is clear
- [ ] Tooltips work on hover
- [ ] Data updates when date range changes
- [ ] 📝 **Notes:** _____________________________________________

### Sleep Diary (Route: `/client/sleep`)
- [ ] Click "Progress Tracking" → "Sleep Diary"
- [ ] Page loads without errors
- [ ] UI elements render correctly:
  - [ ] Date picker
  - [ ] Bedtime input
  - [ ] Wake time input
  - [ ] Sleep quality rating
  - [ ] Notes section
  - [ ] Save button

**Create New Entry:**
- [ ] Select today's date
- [ ] Bedtime: 11:00 PM
- [ ] Wake time: 7:00 AM
- [ ] Sleep quality: 4/5
- [ ] Notes: "Test sleep entry"
- [ ] Click "Save"
- [ ] ✅ **Expected:** Entry saved, total hours calculated (8 hours)
- [ ] 📝 **Notes:** _____________________________________________

**View & Analyze:**
- [ ] Sleep duration calculated correctly
- [ ] Sleep quality trend visible
- [ ] Calendar view (if implemented)
- [ ] Statistics/averages display
- [ ] Export functionality (if implemented)
- [ ] 📝 **Notes:** _____________________________________________

### Exercise Log (Route: `/client/exercise`)
- [ ] Click "Progress Tracking" → "Exercise Log"
- [ ] Page loads without errors
- [ ] UI elements render correctly:
  - [ ] Date picker
  - [ ] Exercise type dropdown/input
  - [ ] Duration input
  - [ ] Intensity level
  - [ ] Notes section
  - [ ] Save button

**Create New Entry:**
- [ ] Select today's date
- [ ] Exercise type: "Walking"
- [ ] Duration: 30 minutes
- [ ] Intensity: Moderate
- [ ] Notes: "Morning walk"
- [ ] Click "Save"
- [ ] ✅ **Expected:** Entry saved successfully
- [ ] 📝 **Notes:** _____________________________________________

**View & Analyze:**
- [ ] Exercise entries display in list
- [ ] Total duration calculated
- [ ] Activity breakdown (if implemented)
- [ ] Progress charts visible
- [ ] Filter by exercise type
- [ ] 📝 **Notes:** _____________________________________________

---

## 📅 Phase 3: Self-Scheduling

### View Available Appointments (Route: `/portal/schedule`)
- [ ] Navigate to "Self-Schedule"
- [ ] Page loads without errors
- [ ] Calendar view displays
- [ ] Available time slots visible
- [ ] Therapist information shown (Dr. John Smith)
- [ ] 📝 **Notes:** _____________________________________________

### Book Appointment
- [ ] Select a future date
- [ ] Click on an available time slot
- [ ] Appointment details modal opens
- [ ] Verify therapist: Dr. John Smith
- [ ] Verify date/time correct
- [ ] Add reason (if field exists)
- [ ] Click "Book Appointment"
- [ ] ✅ **Expected:** Success message, appointment confirmed
- [ ] Appointment appears in client's calendar
- [ ] 📝 **Notes:** _____________________________________________

### Manage Appointments
- [ ] View booked appointment
- [ ] Click "Reschedule" (if available)
  - [ ] Can select new time slot
  - [ ] Changes saved successfully
- [ ] Click "Cancel" (if available)
  - [ ] Confirmation dialog appears
  - [ ] Cancellation processes correctly
- [ ] 📝 **Notes:** _____________________________________________

---

## 👨‍👩‍👧 Phase 4: Guardian Features (Client Side)

### Guardian Consent (Route: `/client/guardian-consent`)
- [ ] Navigate to guardian consent page
- [ ] Page loads without errors
- [ ] UI elements render:
  - [ ] List of guardian requests (if any)
  - [ ] Consent status indicators
  - [ ] Approve/Deny buttons
- [ ] 📝 **Notes:** _____________________________________________

### Request Access (Route: `/guardian/request-access`)
- [ ] Navigate to "Request Access"
- [ ] Page loads without errors
- [ ] Request form displays:
  - [ ] Guardian name field
  - [ ] Guardian email field
  - [ ] Relationship dropdown
  - [ ] Reason for access
  - [ ] Submit button
- [ ] 📝 **Notes:** _____________________________________________

**Submit Request (Optional Test):**
- [ ] Fill in guardian details
- [ ] Select relationship type
- [ ] Add reason for request
- [ ] Click "Submit"
- [ ] ✅ **Expected:** Request submitted, confirmation shown
- [ ] 📝 **Notes:** _____________________________________________

---

## 👨‍⚕️ Phase 5: Clinician View Testing

**Note:** Requires clinician login credentials

### Client Progress Dashboard (Route: `/clinician/client-progress`)
- [ ] Log in as Dr. John Smith (if credentials available)
- [ ] Navigate to "Clinician Tools" → "Client Progress"
- [ ] Page loads without errors
- [ ] Can select client: John Doe
- [ ] ✅ **Expected:** Display tracking data entered in Phase 2
- [ ] Symptom data visible
- [ ] Sleep data visible
- [ ] Exercise data visible
- [ ] Charts/graphs render correctly
- [ ] Can filter by date range
- [ ] Can export data (if implemented)
- [ ] 📝 **Notes:** _____________________________________________

### My Waitlist (Route: `/clinician/my-waitlist`)
- [ ] Navigate to "Clinician Tools" → "My Waitlist"
- [ ] Page loads without errors
- [ ] Waitlist displays (may be empty)
- [ ] Can add clients to waitlist
- [ ] Can set priority levels
- [ ] Can remove from waitlist
- [ ] 📝 **Notes:** _____________________________________________

---

## 👨‍💼 Phase 6: Admin Functions Testing

**Note:** Requires admin login credentials

### Session Ratings (Route: `/admin/session-ratings`)
- [ ] Log in as Super Admin (if credentials available)
- [ ] Navigate to "Admin Tools" → "Session Ratings"
- [ ] Page loads without errors
- [ ] Session ratings display (may be empty)
- [ ] Can filter by date/therapist
- [ ] Can view details
- [ ] 📝 **Notes:** _____________________________________________

### Crisis Detections (Route: `/admin/crisis-detections`)
- [ ] Navigate to "Admin Tools" → "Crisis Detections"
- [ ] Page loads without errors
- [ ] Alert list displays (may be empty)
- [ ] Can view flagged content
- [ ] Can mark as reviewed
- [ ] Can take action
- [ ] 📝 **Notes:** _____________________________________________

### Guardian Verification (Route: `/admin/guardian-verification`)
- [ ] Navigate to "Admin Tools" → "Guardian Verification"
- [ ] Page loads without errors
- [ ] Pending requests display (if any from Phase 4)
- [ ] Can view request details
- [ ] Can approve request
- [ ] Can deny request
- [ ] Can request additional documentation
- [ ] 📝 **Notes:** _____________________________________________

### Scheduling Rules (Route: `/admin/scheduling-rules`)
- [ ] Navigate to "Admin Tools" → "Scheduling Rules"
- [ ] Page loads without errors
- [ ] Existing rules display
- [ ] Can create new rule
- [ ] Can edit existing rule
- [ ] Can delete rule
- [ ] Can set appointment types
- [ ] Can set buffer times
- [ ] Can set availability windows
- [ ] 📝 **Notes:** _____________________________________________

### Waitlist Management (Route: `/admin/waitlist-management`)
- [ ] Navigate to "Admin Tools" → "Waitlist Management"
- [ ] Page loads without errors
- [ ] All waitlists display
- [ ] Can view by therapist
- [ ] Can assign clients
- [ ] Can adjust priorities
- [ ] Can view statistics
- [ ] 📝 **Notes:** _____________________________________________

---

## 🔄 Phase 7: Integration Testing

### Client → Clinician Data Flow
- [ ] Client enters symptom data
- [ ] Clinician can view that data in Client Progress
- [ ] Data updates in real-time (or after refresh)
- [ ] Charts reflect new data
- [ ] 📝 **Notes:** _____________________________________________

### Appointment Workflow
- [ ] Client books appointment via Self-Scheduling
- [ ] Appointment appears in main calendar
- [ ] Clinician can see appointment
- [ ] Appointment can be modified
- [ ] Cancellation reflects everywhere
- [ ] 📝 **Notes:** _____________________________________________

### Guardian Request Workflow
- [ ] Guardian request submitted
- [ ] Admin receives notification (if implemented)
- [ ] Admin reviews in Guardian Verification
- [ ] Admin approves request
- [ ] Client sees approved request in Guardian Consent
- [ ] Client approves/denies
- [ ] Guardian gains/doesn't gain access
- [ ] 📝 **Notes:** _____________________________________________

---

## ⚡ Phase 8: Performance & UX

### Page Load Times
- [ ] All pages load within 2 seconds
- [ ] No console errors
- [ ] No 404 errors for resources
- [ ] 📝 **Slow Pages:** _____________________________________________

### Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] All elements visible and functional
- [ ] 📝 **Issues:** _____________________________________________

### Error Handling
- [ ] Invalid form submissions show errors
- [ ] Network errors show user-friendly messages
- [ ] Failed saves offer retry option
- [ ] 📝 **Notes:** _____________________________________________

### Accessibility
- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] ARIA labels present (check inspector)
- [ ] 📝 **Notes:** _____________________________________________

---

## 🐛 Phase 9: Bug Reporting

### Critical Bugs (P0 - Blocks Functionality)
**Bug #:** ___
**Page:** _____________________________________________
**Steps to Reproduce:**
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________
**Expected:** _____________________________________________
**Actual:** _____________________________________________
**Screenshot/Error:** _____________________________________________

---

### Major Bugs (P1 - Significant Impact)
**Bug #:** ___
**Page:** _____________________________________________
**Issue:** _____________________________________________

---

### Minor Bugs (P2 - Low Impact)
**Bug #:** ___
**Page:** _____________________________________________
**Issue:** _____________________________________________

---

### Enhancement Suggestions
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

## 📝 Overall Assessment

### What Works Well:
- _____________________________________________
- _____________________________________________
- _____________________________________________

### What Needs Improvement:
- _____________________________________________
- _____________________________________________
- _____________________________________________

### Blocker Issues (Must Fix Before Production):
- _____________________________________________
- _____________________________________________

### Ready for UAT?
- [ ] Yes - All critical functionality works
- [ ] No - Critical issues must be resolved first

**Tester Signature:** _________________ **Date:** _____________

---

## 📊 Testing Summary

**Total Tests:** _____ / _____
**Passed:** _____
**Failed:** _____
**Skipped:** _____

**Pass Rate:** _____%

**Recommendation:**
- [ ] ✅ Ready for production
- [ ] ⚠️ Ready with minor fixes
- [ ] ❌ Requires significant fixes

---

**For detailed project status, see:** `CURSOR_COMPREHENSIVE_PROJECT_STATUS.md`
**For quick reference, see:** `CURSOR_QUICK_REFERENCE.md`
