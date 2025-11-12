# Module 7: Self-Scheduling & Waitlist - Testing Guide for Cursor

**Date**: 2025-11-10
**Status**: Ready for Testing  
**Backend**: http://localhost:3001
**Frontend**: http://localhost:5176

---

## VERIFICATION SUMMARY

### What I've Completed ✅
1. Backend routes registered at /api/v1/self-schedule and /api/v1/waitlist
2. Frontend route registered at /portal/schedule
3. Database schema complete (WaitlistEntry, WaitlistOffer models exist)
4. Seed data populated: 3 clinicians, 3 schedules, 3 rules, 13 appointment types

### CRITICAL FINDINGS ⚠️

#### Finding #1: Notifications NOT Implemented
**Evidence**: TODO comments in self-scheduling.controller.ts lines 258, 426, 545

**Impact**:
- NO email/SMS confirmations
- NO clinician alerts for new bookings
- NO waitlist notifications

**Recommendation**: Document as known limitation (Phase 2 feature)

#### Finding #2: Approval Workflow Configuration
**Current State**: autoConfirm NOT set in seed data

**Result**: Defaults to FALSE - appointments require manual approval

**To Test Auto-Approval**: Update scheduling rule with autoConfirm = true

---

## COMPREHENSIVE TEST PLAN

### TEST A1: Client Books Appointment

**Steps**:
1. Login as client
2. Navigate to /portal/schedule
3. Select clinician
4. Select appointment type
5. Pick time slot (weekday, 24+ hours ahead)
6. Click Book

**Expected**:
- Success message
- Appointment in My Appointments with status SCHEDULED (pending) or CONFIRMED
- NO email sent

**Endpoint**: POST /api/v1/self-schedule/book

---

### TEST A2: Clinician Views Request

**Steps**:
1. Login as clinician
2. Navigate to appointments calendar
3. Find appointment from TEST A1

**Expected**:
- Appointment visible with SCHEDULED status
- Client details shown
- NO notification received

---

### TEST A3: Client Reschedules

**Steps**:
1. Find appointment in My Appointments
2. Click Reschedule
3. Select new time
4. Confirm

**Expected**: Date updated, NO notification

**Endpoint**: PUT /api/v1/self-schedule/reschedule/:appointmentId

---

### TEST A4: Client Cancels

**Steps**:
1. Find appointment
2. Click Cancel
3. Confirm

**Expected**: Status = CANCELLED, check if waitlist triggers

**Endpoint**: DELETE /api/v1/self-schedule/cancel/:appointmentId

---

### TEST B: Slot Availability Rules

**B1: 24-Hour Minimum**
- Try booking today/tomorrow
- Expected: No slots available or error

**B2: Buffer Time (10 minutes)**
- Book 10:00-10:50 AM
- Expected: Next slot is 11:00 AM

**B3: Weekday Only**  
- Navigate to Saturday/Sunday
- Expected: No slots available

**B4: Max Daily (8 appointments)**
- Create 8 appointments for one clinician
- Expected: Day fully booked

---

### TEST C: Waitlist

**C1: Join Waitlist**
1. Select clinician with no availability
2. Look for Join Waitlist option
3. Fill form (preferences, type, priority)
4. Submit

**Expected**: Waitlist entry created

**Endpoint**: POST /api/v1/waitlist

**C2: Waitlist Matching**
1. Cancel an appointment
2. Check backend logs
3. Query: GET /api/v1/waitlist/my-offers

**Expected**: WaitlistOffer created with matchScore

**C3: Accept Offer**
1. View offers
2. Accept one

**Expected**: Appointment created, offer = ACCEPTED

---

## API ENDPOINTS

### Self-Scheduling
- GET /api/v1/self-schedule/clinicians
- GET /api/v1/self-schedule/appointment-types
- GET /api/v1/self-schedule/available-slots/:clinicianId
- POST /api/v1/self-schedule/book
- PUT /api/v1/self-schedule/reschedule/:id
- DELETE /api/v1/self-schedule/cancel/:id
- GET /api/v1/self-schedule/my-appointments

### Waitlist
- GET /api/v1/waitlist (staff)
- POST /api/v1/waitlist (join)
- GET /api/v1/waitlist/my-entries
- GET /api/v1/waitlist/my-offers
- POST /api/v1/waitlist/:entryId/accept/:offerId
- POST /api/v1/waitlist/:entryId/decline/:offerId

---

## TESTING CHECKLIST

### Client Self-Scheduling
- [ ] View clinicians list
- [ ] View appointment types
- [ ] View available slots
- [ ] Book appointment successfully
- [ ] View My Appointments
- [ ] Reschedule appointment
- [ ] Cancel appointment

### Clinician Management
- [ ] View appointments calendar
- [ ] See incoming requests (SCHEDULED)
- [ ] Approve appointments
- [ ] See confirmed appointments

### Slot Logic
- [ ] 24-hour minimum enforced
- [ ] Buffer time prevents back-to-back
- [ ] Weekday-only restriction works
- [ ] Max daily limit enforced
- [ ] Double-booking prevented

### Waitlist
- [ ] Join waitlist
- [ ] Matching runs on cancellation
- [ ] Offers created
- [ ] View offers
- [ ] Accept offer creates appointment

---

## KNOWN LIMITATIONS

1. Notifications NOT implemented (Phase 2)
2. Approval workflow defaults to manual
3. Waitlist frontend UI integration may need verification

---

## TEST DATA

### Clinicians
- Sarah Smith, PhD: Mon-Fri, 9AM-5PM (full-time)
- Michael Johnson, LCSW: Tue-Thu, 1PM-8PM (part-time evening)
- Jennifer Williams, MD: Thu-Sat, 10AM-6PM (weekend)

### Rules
- 24-hour minimum advance booking
- 60-day maximum advance booking
- 50-minute slots, 10-minute buffer
- 8 appointments max per day
- Weekdays only (Mon-Fri)

---

## SUCCESS CRITERIA

### MVP
- Client can book appointments
- Clinician can view appointments
- Double-booking prevented
- Rules enforced
- Reschedule/cancel working

### Full Feature
- All MVP criteria
- Waitlist functional
- Matching algorithm works
- Accept/decline offers working

---

**Files to Reference**:
- Backend: packages/backend/src/controllers/self-scheduling.controller.ts
- Waitlist: packages/backend/src/services/waitlist-integration.service.ts
- Frontend: packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx

**END OF GUIDE**
