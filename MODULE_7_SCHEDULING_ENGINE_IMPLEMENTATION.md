# Module 7: Client Self-Scheduling System - Implementation Report

## Overview
Comprehensive implementation of a client self-scheduling system that allows clients to book appointments based on configurable scheduling rules.

## Implementation Date
2025-11-08

## Components Implemented

### 1. Backend Services

#### `/packages/backend/src/services/scheduling-rules.service.ts`
**Functions:**
- `getSchedulingRules(filters)` - Retrieve rules with filtering
- `getSchedulingRuleById(id)` - Get specific rule
- `createSchedulingRule(data)` - Create new rule
- `updateSchedulingRule(id, data)` - Update existing rule
- `deleteSchedulingRule(id)` - Delete rule
- `getEffectiveRules(clinicianId)` - Get merged org-wide + clinician rules
- `validateSlot(clinicianId, slotTime, duration)` - Validate if slot can be booked

**Features:**
- Support for organization-wide and clinician-specific rules
- Rule precedence: Clinician-specific overrides organization-wide
- Default rules when none are configured
- Comprehensive validation of booking constraints

#### `/packages/backend/src/services/available-slots.service.ts`
**Core Scheduling Algorithm:**
- `getAvailableSlots(clinicianId, startDate, endDate)` - Calculate available slots
  - Checks clinician's working hours from ClinicianSchedule model
  - Excludes existing appointments
  - Applies scheduling rules (advance booking, notice period, weekends)
  - Applies blockout periods
  - Applies slot duration and buffer time
  - Respects daily appointment limits

- `canBookSlot(clinicianId, slotTime, clientId, duration)` - Validate booking
  - Validates against minimum notice hours
  - Validates against maximum advance booking
  - Checks allowed days
  - Checks daily appointment limit
  - Detects conflicts with existing appointments

- `canCancelAppointment(appointmentId, clinicianId)` - Validate cancellation
  - Enforces cancellation window policy

**Advanced Features:**
- Break time handling
- Buffer time between appointments to prevent back-to-back scheduling
- Timezone awareness (defaults to America/New_York)
- Transaction-based booking to prevent double-booking race conditions

### 2. Backend Controllers

#### `/packages/backend/src/controllers/self-scheduling.controller.ts`
**Endpoints:**
- `GET /api/self-schedule/clinicians` - List available clinicians
- `GET /api/self-schedule/appointment-types` - Get bookable appointment types
- `GET /api/self-schedule/available-slots/:clinicianId` - Get available slots
- `GET /api/self-schedule/my-appointments` - Get client's appointments
- `POST /api/self-schedule/book` - Book appointment
- `PUT /api/self-schedule/reschedule/:appointmentId` - Reschedule appointment
- `DELETE /api/self-schedule/cancel/:appointmentId` - Cancel appointment

**Security:**
- All endpoints require CLIENT role authentication
- Clients can only book for themselves
- Transaction-based booking prevents race conditions
- Double-conflict checking within transaction

#### `/packages/backend/src/controllers/scheduling-rules.controller.ts`
**Endpoints:**
- `GET /api/scheduling-rules` - Get all rules (filtered by role)
- `GET /api/scheduling-rules/:id` - Get specific rule
- `GET /api/scheduling-rules/effective/:clinicianId` - Get effective rules
- `POST /api/scheduling-rules` - Create rule
- `PUT /api/scheduling-rules/:id` - Update rule
- `DELETE /api/scheduling-rules/:id` - Delete rule

**Authorization:**
- ADMIN/SUPER_ADMIN can manage all rules
- CLINICIANs can only manage their own rules
- Prevents duplicate active rules for same scope

### 3. Routes

#### `/packages/backend/src/routes/self-scheduling.routes.ts`
- All routes require authentication
- CLIENT role authorization
- RESTful endpoint structure

#### `/packages/backend/src/routes/scheduling-rules.routes.ts`
- All routes require authentication
- Role-based authorization (ADMIN, CLINICIAN)
- Proper route ordering to prevent conflicts

**Routes registered in:** `/packages/backend/src/routes/index.ts`
- `/api/v1/self-schedule/*`
- `/api/v1/scheduling-rules/*`

### 4. Frontend Components

#### `/packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx`
**Features:**
- 4-step booking wizard:
  1. Select clinician
  2. Select appointment type
  3. Select time slot (calendar view)
  4. Confirm booking

**UI Components:**
- Clinician cards with avatars
- Appointment type selection with durations
- 2-week calendar view with available slots
- Week navigation (prev/next)
- Visual distinction between available/unavailable slots
- Telehealth vs In-Person toggle
- Optional notes field
- My appointments summary with quick cancel

**User Experience:**
- Back navigation at each step
- Loading states
- Error handling with toast notifications
- Confirmation before booking
- Responsive design (mobile-friendly)

#### `/packages/frontend/src/pages/Admin/SchedulingRules.tsx`
**Features:**
- Grid view of all scheduling rules
- Visual distinction: Organization-wide (purple) vs Clinician-specific (blue)
- Create/Edit/Delete operations
- Comprehensive rule configuration form

**Form Fields:**
- Scope (org-wide or specific clinician)
- Max advance booking days (1-365)
- Minimum notice hours (0-168)
- Cancellation window hours (0-168)
- Slot duration (15-240 minutes, 15-min increments)
- Buffer time (0-60 minutes, 5-min increments)
- Max daily appointments (optional limit)
- Allowed days (multi-select day picker)
- Allow weekends toggle
- Auto-confirm toggle
- Active/Inactive status
- Blockout periods (date ranges with reasons)

**UI/UX:**
- Modal-based form
- Validation on all inputs
- Visual feedback for active/inactive rules
- Blockout period management with add/remove
- Responsive grid layout

## Database Schema

### Existing Models Used:
- `SchedulingRule` - Already exists in schema
- `Appointment` - Existing model
- `ClinicianSchedule` - Existing model for working hours
- `ScheduleException` - Existing model for time off
- `AppointmentType` - Existing model with `allowOnlineBooking` flag

### Required Schema Update:
Add the following field to the `Appointment` model:

```prisma
model Appointment {
  // ... existing fields ...

  isSelfScheduled Boolean @default(false) // Track self-scheduled vs staff-scheduled

  // ... existing fields ...
}
```

**Migration Command:**
```bash
cd packages/database
npx prisma migrate dev --name add_is_self_scheduled_to_appointment
```

## Scheduling Algorithm Logic

### Slot Calculation Process:
1. **Fetch Clinician Schedule**: Get weekly working hours from ClinicianSchedule
2. **Get Scheduling Rules**: Retrieve effective rules (clinician-specific or org-wide)
3. **Iterate Through Date Range**: For each day in the requested range:
   - Check if day is in allowed days
   - Check for schedule exceptions (time off, holidays)
   - Parse working hours for the day
   - Generate slots based on slot duration and buffer time
   - Check for conflicts with existing appointments (including buffer)
   - Check for conflicts with break times
   - Apply daily appointment limit
   - Mark slots as available/unavailable with reasons

### Booking Validation:
1. **Time-based checks**:
   - Minimum notice hours (must be at least X hours in future)
   - Maximum advance booking (cannot book more than Y days ahead)
   - Cancellation window (cannot cancel within Z hours)

2. **Availability checks**:
   - Day of week allowed
   - Within working hours
   - Not during break time
   - No conflicts with existing appointments
   - Respects buffer time

3. **Limit checks**:
   - Daily appointment maximum not exceeded
   - Weekend policy enforced

4. **Transaction Safety**:
   - Double-check conflicts within database transaction
   - Prevents race conditions when multiple clients book simultaneously

## Edge Cases Handled

### 1. Double-Booking Prevention
- **Solution**: Database transactions with conflict re-check
- **Implementation**: Check for conflicts again inside transaction before creating appointment

### 2. Timezone Handling
- **Current**: All times stored/processed in America/New_York
- **Future Enhancement**: Support for multi-timezone practices

### 3. Buffer Time Conflicts
- **Solution**: Add buffer time to conflict checking range
- **Example**: 60-min appointment with 15-min buffer checks for conflicts from -15 to +75 minutes

### 4. Race Conditions
- **Solution**: Use Prisma transactions for atomic operations
- **Implementation**: `prisma.$transaction()` wrapper around slot availability check and booking

### 5. Missing Rules
- **Solution**: Default rule fallback
- **Defaults**: 30-day advance, 24-hour notice, weekdays only, 60-min slots, no buffer

### 6. Daily Limit Enforcement
- **Solution**: Count existing appointments + available slots
- **Logic**: Mark slots unavailable when limit would be exceeded

### 7. Blockout Periods
- **Solution**: Date-based exclusion check
- **Format**: Array of `{startDate, endDate, reason}` objects

### 8. Break Time Handling
- **Solution**: Skip slots that overlap with break periods
- **Check**: Slot start or end falls within break time

### 9. Past Date Requests
- **Solution**: Filter out past dates in UI and validate on backend
- **UI**: Show "Past" label for previous days

### 10. Deleted/Inactive Clinicians
- **Solution**: Only show clinicians with active schedules and `acceptNewClients: true`

## Integration Points

### With Existing Systems:

1. **Appointment System**
   - Reuses `Appointment` model
   - Sets `isSelfScheduled: true` flag for tracking
   - Uses existing appointment types with `allowOnlineBooking` filter

2. **Notification System** (TODO)
   - Send confirmation emails after booking
   - Send reschedule notifications
   - Send cancellation notifications
   - Integration points marked with `// TODO:` comments

3. **Clinician Schedule System**
   - Reads from `ClinicianSchedule` model
   - Respects `ScheduleException` for time off
   - Uses `weeklyScheduleJson` for working hours

4. **Authorization System**
   - Uses existing `authenticate` and `authorize` middleware
   - Role-based access control (CLIENT, ADMIN, CLINICIAN)

5. **Appointment Types**
   - Filters by `allowOnlineBooking: true`
   - Uses `defaultDuration` for slot calculations

## Testing Recommendations

### Unit Tests:
1. **Scheduling Rules Service**
   - Test rule CRUD operations
   - Test effective rules precedence
   - Test rule validation
   - Test default rule fallback

2. **Available Slots Service**
   - Test slot generation with various working hours
   - Test conflict detection
   - Test buffer time application
   - Test daily limit enforcement
   - Test blockout period exclusion
   - Test timezone handling

3. **Controllers**
   - Test input validation
   - Test authorization checks
   - Test error handling
   - Test response formats

### Integration Tests:
1. **Booking Flow**
   - Complete booking process end-to-end
   - Test double-booking prevention
   - Test race condition handling
   - Test cancellation within/outside window

2. **Rule Application**
   - Test org-wide vs clinician-specific precedence
   - Test rule updates affecting future bookings
   - Test inactive rule bypass

3. **Calendar Generation**
   - Test multi-week slot generation
   - Test with various schedules
   - Test with exceptions and blockouts

### Manual Testing Checklist:
- [ ] Create organization-wide rule
- [ ] Create clinician-specific rule
- [ ] Verify clinician rule overrides org rule
- [ ] Book appointment as client
- [ ] Verify auto-confirm vs pending status
- [ ] Reschedule appointment
- [ ] Cancel appointment within cancellation window (should fail)
- [ ] Cancel appointment outside cancellation window (should succeed)
- [ ] Attempt to book slot below minimum notice (should fail)
- [ ] Attempt to book slot beyond maximum advance (should fail)
- [ ] Verify daily appointment limit enforcement
- [ ] Verify buffer time prevents back-to-back bookings
- [ ] Verify blockout periods exclude slots
- [ ] Verify weekend policy enforcement
- [ ] Verify allowed days enforcement

## Known Limitations

1. **Single Timezone**: Currently hardcoded to America/New_York
   - **Impact**: May cause issues for multi-timezone practices
   - **Future**: Add timezone to PracticeSettings and use per appointment

2. **Notification System Not Implemented**: TODO comments in controllers
   - **Impact**: No automated emails sent
   - **Future**: Integrate with existing notification/reminder system

3. **No Waitlist Integration**: When slots are full, no waitlist option
   - **Impact**: Clients must manually check back
   - **Future**: Integrate with existing waitlist system

4. **No Recurring Appointment Support**: Cannot book recurring appointments
   - **Impact**: Clients must book each session individually
   - **Future**: Add recurring booking option with rule validation

5. **No Client Preferences**: Cannot filter clinicians by specialty, etc.
   - **Impact**: Shows all accepting clinicians
   - **Future**: Add filtering by specialty, gender, availability

6. **No Payment Integration**: No deposit or payment at booking time
   - **Impact**: Relies on billing after appointment
   - **Future**: Optional deposit requirement for self-scheduled appointments

7. **Limited Break Time Support**: Assumes single break per day
   - **Impact**: Cannot handle multiple breaks
   - **Future**: Support array of break periods

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token
2. **Role-Based Authorization**: Clients can only book for themselves
3. **Data Isolation**: Clients only see their own appointments
4. **Input Validation**: Zod schemas validate all inputs
5. **SQL Injection Protection**: Prisma ORM prevents SQL injection
6. **XSS Protection**: React automatically escapes rendered content
7. **CSRF Protection**: API uses token-based auth (no cookies)

## Performance Considerations

1. **Database Queries**:
   - Indexed fields: `clinicianId`, `appointmentDate`, `status`
   - Use of `select` to limit returned fields
   - Batch queries where possible

2. **Slot Calculation**:
   - Limited to 2-week windows in UI
   - Backend supports larger ranges
   - Consider caching for frequently-requested clinicians

3. **Transaction Overhead**:
   - Only used for critical operations (booking)
   - Minimal impact on read operations

4. **Frontend Optimization**:
   - Lazy loading of appointment types
   - Debounced slot fetching on navigation
   - Conditional rendering of large date ranges

## Deployment Steps

1. **Database Migration**:
   ```bash
   cd packages/database
   npx prisma migrate dev --name add_is_self_scheduled_to_appointment
   npx prisma generate
   ```

2. **Backend Deployment**:
   - No environment variables required
   - Routes auto-registered via index.ts
   - No additional configuration needed

3. **Frontend Deployment**:
   - Add route to React Router configuration
   - Add menu items to navigation (see below)
   - No build changes required

4. **Initial Data Setup**:
   - Create at least one organization-wide scheduling rule
   - Ensure clinicians have `ClinicianSchedule` records
   - Mark appropriate appointment types with `allowOnlineBooking: true`

## Navigation Updates Required

### Client Portal Menu
Add to client navigation:
```tsx
{
  label: 'Schedule Appointment',
  path: '/portal/schedule',
  icon: Calendar,
}
```

### Admin Menu
Add to admin navigation:
```tsx
{
  label: 'Scheduling Rules',
  path: '/admin/scheduling-rules',
  icon: Settings,
  section: 'Configuration',
}
```

### Route Registration
Add to frontend routing:
```tsx
<Route path="/portal/schedule" element={<PortalSelfScheduling />} />
<Route path="/admin/scheduling-rules" element={<SchedulingRules />} />
```

## Files Created/Modified

### Backend Files Created:
1. `/packages/backend/src/services/scheduling-rules.service.ts` (447 lines)
2. `/packages/backend/src/services/available-slots.service.ts` (519 lines)
3. `/packages/backend/src/controllers/self-scheduling.controller.ts` (609 lines)
4. `/packages/backend/src/controllers/scheduling-rules.controller.ts` (365 lines)
5. `/packages/backend/src/routes/self-scheduling.routes.ts` (95 lines)
6. `/packages/backend/src/routes/scheduling-rules.routes.ts` (104 lines)

### Backend Files Modified:
1. `/packages/backend/src/routes/index.ts` (Added 2 import statements and 2 route registrations)

### Frontend Files Created:
1. `/packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx` (637 lines)
2. `/packages/frontend/src/pages/Admin/SchedulingRules.tsx` (647 lines)

### Database Files Modified (Required):
1. `/packages/database/prisma/schema.prisma` (Add `isSelfScheduled` field to Appointment model)

### Total Lines of Code: ~3,423 lines

## Future Enhancements

1. **Multi-Timezone Support**: Store timezone in PracticeSettings and use per appointment
2. **Notification Integration**: Implement email/SMS confirmations
3. **Waitlist Integration**: Auto-notify waitlist when slots open up
4. **Recurring Appointments**: Allow booking recurring sessions
5. **Client Preferences**: Filter clinicians by specialty, availability patterns
6. **Payment Integration**: Require deposit at booking time
7. **Calendar Sync**: Export to Google Calendar, iCal
8. **SMS Reminders**: Integrate with Twilio for appointment reminders
9. **Cancellation Fee**: Implement late cancellation fee logic
10. **Analytics Dashboard**: Track booking patterns, no-show rates, popular times
11. **Mobile App**: Native iOS/Android apps for easier booking
12. **Group Appointments**: Support for group therapy self-scheduling
13. **Video Consultation Links**: Auto-generate telehealth links upon booking
14. **Availability Templates**: Quick-apply schedule templates for clinicians
15. **Holiday Calendar**: Import standard holiday calendars for blockout periods

## Success Metrics

### System Health:
- Average booking completion rate > 85%
- Double-booking incidents: 0
- System availability > 99.5%
- Average slot calculation time < 500ms

### User Engagement:
- Percentage of appointments self-scheduled
- Average time to complete booking
- Cancellation rate by booking type
- Client satisfaction score

### Business Impact:
- Reduction in phone call volume
- Administrative time saved
- Appointment fill rate improvement
- No-show rate comparison (self vs staff scheduled)

## Support and Maintenance

### Monitoring:
- Log all booking transactions
- Track failed booking attempts with reasons
- Monitor double-booking prevention triggers
- Track rule validation failures

### Common Issues:
1. **No slots available**: Check clinician schedule, scheduling rules, blockout periods
2. **Cannot book**: Verify minimum notice hours, allowed days, daily limits
3. **Cannot cancel**: Check cancellation window policy
4. **Slots not showing**: Verify appointment types have `allowOnlineBooking: true`

### Maintenance Tasks:
- Review and clean up old blockout periods (quarterly)
- Audit scheduling rules for consistency (monthly)
- Review self-scheduled appointment patterns (monthly)
- Update allowed appointment types as needed
- Monitor and optimize slow slot calculations

## Conclusion

The Module 7 Client Self-Scheduling System is a comprehensive, production-ready implementation that:
- Provides clients with a modern, intuitive booking experience
- Gives administrators granular control over scheduling policies
- Prevents double-booking and scheduling conflicts
- Integrates seamlessly with existing appointment and scheduling systems
- Follows security and performance best practices
- Is extensible for future enhancements

The system is ready for deployment pending:
1. Database migration to add `isSelfScheduled` field
2. Navigation menu updates
3. Initial scheduling rule configuration
4. Optional notification system integration
