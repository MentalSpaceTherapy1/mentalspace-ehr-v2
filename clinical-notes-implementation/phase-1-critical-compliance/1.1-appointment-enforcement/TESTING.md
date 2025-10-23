# Testing Plan: Phase 1.1 - Appointment Requirement Enforcement

## Test Coverage Goals
- **Unit Tests**: 95%+ coverage
- **Integration Tests**: All critical paths
- **Manual Tests**: Complete user flows

---

## Unit Tests

### Database/Schema Tests

#### Test: appointmentId is required
```typescript
describe('ClinicalNote Schema', () => {
  it('should require appointmentId', async () => {
    const noteWithoutAppointment = {
      clientId: 'client-123',
      noteType: 'PROGRESS',
      // Missing appointmentId
    };

    await expect(prisma.clinicalNote.create({ data: noteWithoutAppointment }))
      .rejects.toThrow();
  });
});
```

#### Test: Foreign key constraint enforced
```typescript
it('should enforce valid appointment reference', async () => {
  const noteWithInvalidAppointment = {
    clientId: 'client-123',
    appointmentId: 'nonexistent-appointment',
    noteType: 'PROGRESS',
  };

  await expect(prisma.clinicalNote.create({ data: noteWithInvalidAppointment }))
    .rejects.toThrow();
});
```

---

### Service Tests

#### Test: getOrCreateAppointment - finds existing
```typescript
describe('AppointmentService.getOrCreateAppointment', () => {
  it('should return existing appointment when found', async () => {
    const existingAppointment = await createTestAppointment({
      clientId: 'client-123',
      startTime: new Date('2025-10-22T10:00:00Z'),
    });

    const result = await appointmentService.getOrCreateAppointment({
      clientId: 'client-123',
      startTime: new Date('2025-10-22T10:00:00Z'),
      endTime: new Date('2025-10-22T11:00:00Z'),
      type: 'THERAPY',
    });

    expect(result.id).toBe(existingAppointment.id);
  });
});
```

#### Test: getOrCreateAppointment - creates new
```typescript
it('should create new appointment when not found', async () => {
  const result = await appointmentService.getOrCreateAppointment({
    clientId: 'client-123',
    startTime: new Date('2025-10-22T14:00:00Z'),
    endTime: new Date('2025-10-22T15:00:00Z'),
    type: 'THERAPY',
    location: 'TELEHEALTH',
  });

  expect(result).toHaveProperty('id');
  expect(result.clientId).toBe('client-123');
  expect(result.type).toBe('THERAPY');
});
```

#### Test: Note creation requires appointment
```typescript
describe('ClinicalNoteService.create', () => {
  it('should reject note creation without appointmentId', async () => {
    await expect(
      clinicalNoteService.create({
        clientId: 'client-123',
        noteType: 'PROGRESS',
        // Missing appointmentId
      })
    ).rejects.toThrow('Appointment is required');
  });
});
```

#### Test: Appointment metadata fetched
```typescript
it('should fetch appointment metadata when creating note', async () => {
  const appointment = await createTestAppointment({
    clientId: 'client-123',
    startTime: new Date('2025-10-22T10:00:00Z'),
    type: 'THERAPY',
  });

  const note = await clinicalNoteService.create({
    clientId: 'client-123',
    appointmentId: appointment.id,
    noteType: 'PROGRESS',
  });

  expect(note.appointment).toBeDefined();
  expect(note.appointment.type).toBe('THERAPY');
});
```

---

### Validation Tests

#### Test: Appointment-client match validation
```typescript
it('should reject note if appointment belongs to different client', async () => {
  const appointment = await createTestAppointment({
    clientId: 'client-123',
  });

  await expect(
    clinicalNoteService.create({
      clientId: 'client-456', // Different client
      appointmentId: appointment.id,
      noteType: 'PROGRESS',
    })
  ).rejects.toThrow('Appointment does not belong to this client');
});
```

#### Test: 7-day rule enforcement
```typescript
it('should reject notes for appointments older than 7 days', async () => {
  const oldAppointment = await createTestAppointment({
    clientId: 'client-123',
    startTime: new Date('2025-10-10T10:00:00Z'), // 12 days ago
  });

  await expect(
    clinicalNoteService.create({
      clientId: 'client-123',
      appointmentId: oldAppointment.id,
      noteType: 'PROGRESS',
    })
  ).rejects.toThrow('Cannot create notes for appointments older than 7 days');
});
```

#### Test: Duplicate note prevention
```typescript
it('should prevent multiple notes of same type for one appointment', async () => {
  const appointment = await createTestAppointment({
    clientId: 'client-123',
  });

  await clinicalNoteService.create({
    clientId: 'client-123',
    appointmentId: appointment.id,
    noteType: 'PROGRESS',
  });

  await expect(
    clinicalNoteService.create({
      clientId: 'client-123',
      appointmentId: appointment.id,
      noteType: 'PROGRESS', // Same type
    })
  ).rejects.toThrow('A PROGRESS note already exists for this appointment');
});
```

---

## Integration Tests

### End-to-End Note Creation Flow

#### Test: Create note with existing appointment
```typescript
describe('E2E: Note Creation with Appointment', () => {
  it('should create note with existing appointment', async () => {
    const user = await createTestUser({ role: 'THERAPIST' });
    const client = await createTestClient();
    const appointment = await createTestAppointment({
      clientId: client.id,
      therapistId: user.id,
    });

    const response = await request(app)
      .post('/api/v1/clinical-notes')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        clientId: client.id,
        appointmentId: appointment.id,
        noteType: 'PROGRESS',
        content: { chiefComplaint: 'Test' },
      });

    expect(response.status).toBe(201);
    expect(response.body.appointmentId).toBe(appointment.id);
  });
});
```

#### Test: Create note with inline appointment creation
```typescript
it('should create note with new appointment', async () => {
  const user = await createTestUser({ role: 'THERAPIST' });
  const client = await createTestClient();

  // First, create appointment via getOrCreate
  const appointmentResponse = await request(app)
    .post('/api/v1/appointments/get-or-create')
    .set('Authorization', `Bearer ${user.token}`)
    .send({
      clientId: client.id,
      startTime: new Date('2025-10-22T14:00:00Z'),
      endTime: new Date('2025-10-22T15:00:00Z'),
      type: 'THERAPY',
    });

  expect(appointmentResponse.status).toBe(200);
  const appointment = appointmentResponse.body;

  // Then create note
  const noteResponse = await request(app)
    .post('/api/v1/clinical-notes')
    .set('Authorization', `Bearer ${user.token}`)
    .send({
      clientId: client.id,
      appointmentId: appointment.id,
      noteType: 'PROGRESS',
    });

  expect(noteResponse.status).toBe(201);
});
```

#### Test: Validation error handling
```typescript
it('should return validation error when appointmentId missing', async () => {
  const user = await createTestUser({ role: 'THERAPIST' });
  const client = await createTestClient();

  const response = await request(app)
    .post('/api/v1/clinical-notes')
    .set('Authorization', `Bearer ${user.token}`)
    .send({
      clientId: client.id,
      // Missing appointmentId
      noteType: 'PROGRESS',
    });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('appointment');
});
```

---

## Manual Testing Checklist

### Prerequisite Setup
- [ ] Test environment with clean database
- [ ] Test user account (therapist role)
- [ ] Test client account
- [ ] At least 3 existing appointments (past, today, future)

### Test Case 1: Create Note with Existing Appointment
**Steps**:
1. Navigate to client chart
2. Click "Create New Note"
3. Select "Progress Note"
4. System prompts for appointment selection
5. Select today's appointment from list
6. Verify appointment metadata displays in note header
7. Fill required fields
8. Save note

**Expected**:
- Appointment selection is mandatory
- Appointment list shows client's appointments
- Metadata displays: date, time, location, type
- Note saves successfully

**Result**: [ ] Pass [ ] Fail

---

### Test Case 2: Create Note with New Appointment (Inline)
**Steps**:
1. Navigate to client chart
2. Click "Create New Note"
3. Select "Progress Note"
4. Click "Create New Appointment" in selection modal
5. Fill appointment details:
   - Date: Today
   - Start time: 2:00 PM
   - End time: 3:00 PM
   - Type: Therapy
   - Location: Telehealth
6. Click "Create & Use"
7. Verify appointment created and selected
8. Verify metadata displays in note header
9. Complete and save note

**Expected**:
- Inline appointment creation works
- New appointment appears in system
- Note successfully linked to new appointment
- No navigation away from note creation

**Result**: [ ] Pass [ ] Fail

---

### Test Case 3: Attempt to Create Note Without Appointment
**Steps**:
1. Navigate to client chart
2. Click "Create New Note"
3. Select "Progress Note"
4. Try to skip appointment selection
5. Try to save without selecting appointment

**Expected**:
- Cannot proceed without appointment selection
- Clear error message displayed
- Form blocks submission

**Result**: [ ] Pass [ ] Fail

---

### Test Case 4: Appointment Client Mismatch
**Steps**:
1. Manually create note with different client's appointment (API call or DB manipulation)

**Expected**:
- Backend rejects with validation error
- Error message: "Appointment does not belong to this client"

**Result**: [ ] Pass [ ] Fail

---

### Test Case 5: Old Appointment (>7 days)
**Steps**:
1. Navigate to client chart
2. Click "Create New Note"
3. Try to select appointment from 10 days ago

**Expected**:
- System shows warning or prevents selection
- Error message about 7-day rule

**Result**: [ ] Pass [ ] Fail

---

### Test Case 6: Duplicate Note for Same Appointment
**Steps**:
1. Create Progress Note for today's 2 PM appointment
2. Try to create another Progress Note for same appointment

**Expected**:
- System prevents duplicate
- Error message: "A PROGRESS note already exists for this appointment"

**Result**: [ ] Pass [ ] Fail

---

### Test Case 7: Different Note Types for Same Appointment
**Steps**:
1. Create Progress Note for appointment
2. Create Consultation Note for same appointment

**Expected**:
- Both notes created successfully
- Different note types allowed for same appointment

**Result**: [ ] Pass [ ] Fail

---

### Test Case 8: Appointment Metadata Display
**Steps**:
1. Create note with appointment at 2:00 PM, Telehealth, Therapy
2. Verify note header shows:
   - Date (October 22, 2025)
   - Time (2:00 PM - 3:00 PM)
   - Location icon (Telehealth)
   - Type badge (Therapy)
3. Edit note and verify metadata still visible

**Expected**:
- All metadata displays correctly
- Metadata visible throughout editing
- Icons and formatting correct

**Result**: [ ] Pass [ ] Fail

---

## Performance Tests

### Load Test: Note Creation with Appointments
- [ ] Create 100 notes with appointments in 1 minute
- [ ] Verify no database deadlocks
- [ ] Verify response times < 500ms

### Stress Test: Concurrent Appointment Creation
- [ ] 10 users create appointments simultaneously for same client/time
- [ ] Verify only one appointment created (no duplicates)
- [ ] Verify proper error handling

---

## Regression Tests

After deployment, verify:
- [ ] Existing notes still accessible
- [ ] All notes have appointments (check database)
- [ ] No orphaned notes without appointments
- [ ] Note search/filtering still works
- [ ] Note export includes appointment data
- [ ] Supervisor review workflow still functional

---

## Test Execution Log

| Test Type | Date | Result | Notes |
|-----------|------|--------|-------|
| Unit Tests | TBD | - | - |
| Integration Tests | TBD | - | - |
| Manual Tests | TBD | - | - |
| Performance Tests | TBD | - | - |
| Regression Tests | TBD | - | - |

---

## Test Results Summary

**Unit Tests**: 0/0 passing
**Integration Tests**: 0/0 passing
**Manual Tests**: 0/8 completed
**Coverage**: TBD

---

## Issues Found During Testing

None yet.
