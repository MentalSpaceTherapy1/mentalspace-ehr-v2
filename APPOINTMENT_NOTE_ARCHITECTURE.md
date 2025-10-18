# Appointment-Based Clinical Notes Architecture

## Implementation Plan

### Phase 1: Database & Backend (CURRENT)
1. ✅ Fix Prisma singleton instance
2. Add unique constraint: one note per appointment per note type
3. Create appointment eligibility service
4. Update clinical note controller to enforce appointment linkage
5. Add diagnosis inheritance logic

### Phase 2: Frontend Components
1. Create `AppointmentPicker` component
2. Create `ScheduleHeader` component
3. Create `CreateAppointmentModal` component
4. Update all 8 note forms to use new workflow

### Phase 3: Validation & Guards
1. Prevent duplicate notes per appointment
2. Block signing without diagnosis (Progress/Treatment Plan)
3. Add audit logging for appointment changes

### Phase 4: Testing
1. Test complete workflow for each note type
2. Verify diagnosis inheritance
3. Test edge cases (no appointments, rescheduling, etc.)

## Current Status
- Fixed: Prisma singleton to resolve database query errors
- Next: Implement appointment eligibility checking
