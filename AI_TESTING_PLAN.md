# AI Integration End-to-End Testing Plan

## Overview
This document outlines the comprehensive testing plan for the AI-powered clinical notes feature with appointment-based workflow integration.

## Test Environment
- **Backend**: Running on port 3001
- **Frontend**: Running on port 5173
- **Database**: PostgreSQL with unique constraint applied on `(appointmentId, noteType)`

## Database Constraint Status
✅ **Applied**: Unique constraint `@@unique([appointmentId, noteType])` on ClinicalNote model
- Cleaned up 2 duplicate note groups before applying constraint
- Constraint now enforces: One note per appointment per note type

---

## Testing Checklist

### Phase 1: Appointment Workflow Testing (8 Note Forms)

#### 1.1 IntakeAssessmentForm
- [ ] Load form without appointmentId - should show AppointmentPicker
- [ ] Select existing appointment from picker
- [ ] ScheduleHeader displays correctly with appointment details
- [ ] Create new appointment via CreateAppointmentModal
- [ ] Form auto-populates with appointment data
- [ ] Submit note successfully
- [ ] Verify note appears in clinical notes list

#### 1.2 ProgressNoteForm
- [ ] Load form - should show AppointmentPicker
- [ ] Select appointment
- [ ] **Diagnosis Inheritance**: Verify diagnoses auto-populate from latest signed Intake
- [ ] ScheduleHeader displays correctly
- [ ] Submit note successfully
- [ ] Verify diagnosis display section shows inherited diagnoses

#### 1.3 TreatmentPlanForm
- [ ] Load form - should show AppointmentPicker
- [ ] Select appointment
- [ ] **Diagnosis Inheritance**: Verify diagnoses auto-populate from latest signed Intake
- [ ] ScheduleHeader displays correctly
- [ ] Submit note successfully
- [ ] Verify diagnosis display section shows inherited diagnoses

#### 1.4 CancellationNoteForm
- [ ] Load form - should show AppointmentPicker
- [ ] Select appointment
- [ ] ScheduleHeader displays correctly
- [ ] Submit note successfully

#### 1.5 ConsultationNoteForm
- [ ] Load form - should show AppointmentPicker
- [ ] Select appointment
- [ ] ScheduleHeader displays correctly
- [ ] Submit note successfully

#### 1.6 ContactNoteForm
- [ ] Load form - should show AppointmentPicker
- [ ] Select appointment
- [ ] ScheduleHeader displays correctly
- [ ] Submit note successfully

#### 1.7 TerminationNoteForm
- [ ] Load form - should show AppointmentPicker
- [ ] Select appointment
- [ ] ScheduleHeader displays correctly
- [ ] Submit note successfully

#### 1.8 MiscellaneousNoteForm
- [ ] Load form - should show AppointmentPicker
- [ ] Select appointment
- [ ] ScheduleHeader displays correctly
- [ ] Submit note successfully

---

### Phase 2: AI Features Testing

#### 2.1 SessionInputBox Component
- [ ] Component appears on all 8 note forms
- [ ] Text input accepts multi-line transcription
- [ ] "Generate Note" button is clickable
- [ ] Loading state shows spinner during generation
- [ ] Error handling for API failures

#### 2.2 AI Note Generation (Per Note Type)
Test AI generation for each note type:

- [ ] **Intake Assessment**: Generate from sample transcript
  - Verify presenting problems populated
  - Verify mental status fields populated
  - Verify history sections populated
  - Verify risk assessment populated

- [ ] **Progress Note**: Generate from sample transcript
  - Verify subjective section populated
  - Verify objective observations populated
  - Verify assessment populated
  - Verify plan populated

- [ ] **Treatment Plan**: Generate from sample transcript
  - Verify goals populated
  - Verify interventions populated
  - Verify objectives populated

- [ ] **Cancellation Note**: Generate from sample transcript
  - Verify cancellation reason populated
  - Verify notice details populated

- [ ] **Consultation Note**: Generate from sample transcript
  - Verify consulted person populated
  - Verify reason for consultation populated
  - Verify recommendations populated

- [ ] **Contact Note**: Generate from sample transcript
  - Verify contact type populated
  - Verify purpose populated
  - Verify summary populated

- [ ] **Termination Note**: Generate from sample transcript
  - Verify termination reason populated
  - Verify progress achieved populated
  - Verify aftercare recommendations populated

- [ ] **Miscellaneous Note**: Generate from sample transcript
  - Verify subject populated
  - Verify content populated
  - Verify category populated

#### 2.3 ReviewModal Component
- [ ] Modal opens after AI generation completes
- [ ] Shows generated content in readable format
- [ ] Displays AI confidence score
- [ ] Displays warnings if any
- [ ] "Accept" button populates form with generated data
- [ ] "Reject" button closes modal and discards data
- [ ] Can edit data in modal before accepting

---

### Phase 3: Database Constraint Testing

#### 3.1 Unique Constraint Enforcement
- [ ] Create a note for a specific appointment (e.g., Intake Assessment)
- [ ] Attempt to create a second note for the same appointment with same note type
- [ ] **Expected**: Should receive error from backend
- [ ] **Expected**: Error message: "A clinical note already exists for this appointment"

#### 3.2 Allowed Duplicate Scenarios
- [ ] Create Progress Note for Appointment A
- [ ] Create Progress Note for Appointment B (different appointment)
- [ ] **Expected**: Should succeed (different appointments)

- [ ] Create Progress Note for Appointment A
- [ ] Create Intake Assessment for Appointment A (different note type)
- [ ] **Expected**: Should succeed (different note types)

---

### Phase 4: Integration Testing

#### 4.1 Complete Workflow - New Client
1. [ ] Create new client
2. [ ] Create appointment for Intake Assessment
3. [ ] Create Intake Assessment note (with AI generation)
4. [ ] Sign the Intake Assessment
5. [ ] Create appointment for Progress Note
6. [ ] Create Progress Note (verify diagnosis inheritance)
7. [ ] Verify diagnoses from Intake appear in Progress Note
8. [ ] Create Treatment Plan (verify diagnosis inheritance)
9. [ ] Verify diagnoses appear in Treatment Plan

#### 4.2 AppointmentPicker Edge Cases
- [ ] Client with no appointments - verify empty state message
- [ ] Client with only used appointments - verify "no eligible appointments" message
- [ ] Client with mix of used/unused appointments - verify only unused shown
- [ ] Pagination works if client has many appointments

#### 4.3 CreateAppointmentModal
- [ ] Opens when "Create New Appointment" clicked
- [ ] Pre-fills with default config for note type
- [ ] Date/time pickers work correctly
- [ ] Service code defaults correctly per note type
- [ ] Successfully creates appointment and auto-selects it
- [ ] Closes modal after creation

---

### Phase 5: Error Handling & Edge Cases

#### 5.1 API Error Scenarios
- [ ] Backend down - shows error message
- [ ] Invalid appointment ID - shows error
- [ ] No diagnoses for inheritance - graceful handling
- [ ] AI service timeout - shows timeout message
- [ ] Malformed transcript - AI handles gracefully

#### 5.2 Form Validation
- [ ] Required fields validated before AI generation
- [ ] Required fields validated before submission
- [ ] Date fields validate proper formats
- [ ] CPT/ICD-10 codes validate against database

#### 5.3 Race Conditions
- [ ] Generate AI note, then immediately generate again - should queue properly
- [ ] Save note while AI generating - should handle state correctly

---

## Sample Test Data

### Sample Transcript for Intake Assessment
```
Client came in reporting difficulty sleeping and feeling anxious for the past 3 months.
States they wake up multiple times per night with racing thoughts.
Mood appears depressed, affect is constricted.
Speech is normal rate and volume. Thought process is logical and goal-directed.
Denies suicidal or homicidal ideation. No psychotic symptoms observed.
Client is motivated for treatment and willing to try both therapy and medication if needed.
Plan to start CBT for insomnia and anxiety management techniques.
```

### Sample Transcript for Progress Note
```
Client reports improvement in sleep since last session.
Still waking 1-2 times per night but falling back asleep more easily.
Practicing relaxation techniques we discussed.
Mood is improved, more energy during the day.
Client completed homework of thought records.
Continue with CBT-I techniques and add cognitive restructuring for anxiety.
```

### Sample Transcript for Contact Note
```
Client called concerned about increased anxiety after a stressful work event.
Spoke for 15 minutes, provided crisis coping strategies.
Client denies safety concerns, agreed to practice breathing exercises.
Will follow up in scheduled session next week.
```

---

## Success Criteria

### Must Pass
- ✅ All 8 note forms have working appointment workflow
- ✅ AI generation works for all note types
- ✅ ReviewModal accepts/rejects generated content correctly
- ✅ Diagnosis inheritance works for Progress Note and Treatment Plan
- ✅ Unique constraint prevents duplicate notes
- ✅ Form submission succeeds with valid data

### Should Pass
- Error messages are user-friendly
- Loading states provide good UX feedback
- Forms are responsive on different screen sizes
- AI confidence scores are meaningful

### Nice to Have
- AI warnings help clinicians review content critically
- Generated content is clinically accurate
- Form auto-saves drafts

---

## Known Issues
None at this time.

---

## Testing Notes
- Test with multiple browsers (Chrome, Firefox, Edge)
- Test with different screen sizes
- Test with slow network connections
- Test with various transcript lengths and complexity

---

## Post-Testing Actions
1. Document any bugs found
2. Create issues for feature enhancements
3. Update user documentation
4. Create demo video for training

