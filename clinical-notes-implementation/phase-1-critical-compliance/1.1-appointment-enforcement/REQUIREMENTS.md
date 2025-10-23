# Phase 1.1: Hard Appointment Requirement Enforcement

## Overview
Make appointment linking mandatory for all clinical notes. Every note must be associated with a specific appointment before it can be created.

## Business Requirements

### Current State
- `appointmentId` is optional in ClinicalNote model
- Users can create notes without linking to appointments
- No enforcement of appointment association
- Appointment metadata not pre-populated in notes

### Desired State
- Every clinical note MUST be linked to an appointment
- System enforces appointment selection before note creation
- If appointment doesn't exist, user can create one inline
- Note header automatically shows appointment metadata (date, time, location, modality)
- Cannot save or submit note without valid appointment association

## Technical Requirements

### Database Changes
1. **Prisma Schema Update**
   - Remove `?` from `appointmentId` field in ClinicalNote model
   - Make field required: `appointmentId String`
   - Update foreign key constraint

2. **Migration**
   - Handle existing notes without appointments (if any)
   - Add NOT NULL constraint
   - Ensure referential integrity

### Backend Changes

1. **New Endpoint: GET/POST /api/v1/appointments/get-or-create**
   - Search for existing appointment by client + date + time
   - If found, return appointment
   - If not found, create new appointment and return it
   - Validate required fields: clientId, startTime, endTime, type

2. **Updated Validation**
   - Enforce appointmentId presence in note creation
   - Return clear error message if missing
   - Validate appointment exists and belongs to client

3. **Note Service Updates**
   - Pre-populate note fields from appointment:
     - Client name
     - Appointment date/time
     - Location (in-office, telehealth)
     - Session type
   - Fetch appointment metadata when loading note

### Frontend Changes

1. **Note Creation Flow**
   - Add mandatory appointment selection step
   - Show searchable list of client's appointments
   - Provide "Create New Appointment" quick action
   - Block progression without appointment selection

2. **Appointment Selection UI**
   - Date picker for appointment date
   - Time selector (start/end)
   - Location selector (office/telehealth)
   - Session type dropdown
   - Search existing appointments by date range
   - Inline appointment creation modal

3. **Note Header Display**
   - Show appointment badge with:
     - Date and time
     - Location icon
     - Session type
     - Duration
   - Make appointment info always visible in note editor

## User Stories

### US-1: Mandatory Appointment Selection
**As a** therapist
**I want** to select an appointment before creating a note
**So that** every note is properly linked to a session

**Acceptance Criteria**:
- Cannot create note without selecting appointment
- System shows clear prompt to select/create appointment
- Validation error if appointment missing

### US-2: Quick Appointment Creation
**As a** therapist
**I want** to quickly create an appointment inline
**So that** I don't have to leave the note creation flow

**Acceptance Criteria**:
- Modal allows creating appointment without navigation
- Pre-fills client from note context
- Defaults to today's date
- Saves and associates with note in one action

### US-3: Appointment Metadata Display
**As a** therapist
**I want** to see appointment details in the note
**So that** I can verify I'm documenting the correct session

**Acceptance Criteria**:
- Note header shows appointment date, time, location
- Metadata visible throughout note editing
- Cannot accidentally change appointment after selection

## Validation Rules

### Backend Validation
1. `appointmentId` must be present (required field)
2. Appointment must exist in database
3. Appointment must belong to the client specified in note
4. Appointment cannot be in the past by more than 7 days (Georgia rule)
5. Cannot have multiple notes for same appointment of same type

### Frontend Validation
1. Appointment selection required before note form shows
2. Date/time required for new appointments
3. End time must be after start time
4. Location and type must be selected
5. Real-time feedback on validation errors

## Error Messages

| Error Condition | Message |
|----------------|---------|
| No appointment selected | "Please select or create an appointment before creating this note." |
| Appointment not found | "The selected appointment could not be found. Please select a different appointment." |
| Appointment client mismatch | "The selected appointment belongs to a different client." |
| Past appointment (>7 days) | "Cannot create notes for appointments older than 7 days." |
| Duplicate note for appointment | "A {noteType} note already exists for this appointment." |

## Testing Requirements

### Unit Tests
- [ ] Schema validation enforces required appointmentId
- [ ] Note creation fails without appointment
- [ ] getOrCreateAppointment finds existing appointments
- [ ] getOrCreateAppointment creates new appointments
- [ ] Appointment metadata correctly fetched

### Integration Tests
- [ ] End-to-end note creation with appointment selection
- [ ] Inline appointment creation flow
- [ ] Validation error handling
- [ ] Appointment metadata display

### Manual Testing
- [ ] Create note with existing appointment
- [ ] Create note with new appointment (inline)
- [ ] Attempt to create note without appointment (should fail)
- [ ] Verify appointment metadata displays correctly
- [ ] Test with different note types

## Migration Strategy

### Development
1. Update Prisma schema
2. Generate migration
3. Test migration on local database
4. Verify all existing notes have appointments (or assign default)

### Production
1. Audit existing notes for missing appointments
2. Create placeholder appointments for orphaned notes (if any)
3. Run migration during maintenance window
4. Verify constraint applied successfully
5. Deploy backend changes
6. Deploy frontend changes
7. Smoke test note creation flow

## Rollback Plan

If issues arise:
1. Revert database migration (remove NOT NULL constraint)
2. Revert backend to previous version
3. Revert frontend to previous version
4. Investigate and fix issues
5. Re-deploy with fixes

## Dependencies

- Existing Appointment model and service
- ClinicalNote model and service
- Note creation UI components
- User permissions for creating appointments

## Success Criteria

- [ ] All new notes require valid appointment association
- [ ] Zero notes created without appointments in production
- [ ] Note creation time increases by less than 30 seconds
- [ ] User satisfaction with inline appointment creation
- [ ] No increase in note creation errors
- [ ] 100% of notes linked to appointments within 1 week of deployment
