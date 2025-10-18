# Clinical Notes Business Rules Implementation

**Date**: October 17, 2025
**Status**: Backend Implementation Complete ✅
**Frontend Implementation**: Pending

---

## Overview

Successfully implemented the three core Clinical Notes Business Rules from the requirements document:

1. **Business Rule #1**: Appointment-Based Note Creation
2. **Business Rule #2**: Sequential Documentation Workflow
3. **Business Rule #3**: Diagnosis Management and Propagation

---

## Implementation Summary

### ✅ Database Layer (Completed)

#### Migration File
**Location**: [packages/database/prisma/migrations/20251017193200_clinical_notes_business_rules/migration.sql](packages/database/prisma/migrations/20251017193200_clinical_notes_business_rules/migration.sql)

**Changes Made**:
1. **Enhanced `diagnoses` table** with tracking fields:
   - `specifiers`: Additional diagnosis details
   - `severity`: Mild, Moderate, Severe
   - `diagnosisNoteId`: Foreign key to note where diagnosis was created
   - `createdInNoteType`: Type of note where diagnosis originated (INTAKE/TREATMENT_PLAN)
   - `lastUpdatedInNoteType`: Type of note where diagnosis was last modified
   - `lastUpdatedNoteId`: Foreign key to last note that modified diagnosis

2. **Created `diagnosis_history` table** for complete audit trail:
   - Tracks who made changes, when, and in which note
   - Stores old and new values as JSON
   - Records change type (CREATED, MODIFIED, STATUS_CHANGE, DELETED)
   - Includes change reason for compliance

3. **Created `clinical_note_diagnoses` join table** for billing:
   - Links diagnoses to clinical notes
   - Supports pointer ordering for billing (1, 2, 3, 4)
   - Enables read-only diagnosis display in Progress Notes

4. **PostgreSQL Triggers** for server-side validation:
   ```sql
   -- Business Rule #1: Appointment Requirement
   CREATE TRIGGER check_appointment_before_note
     BEFORE INSERT ON "clinical_notes"
     FOR EACH ROW
     EXECUTE FUNCTION validate_note_appointment();

   -- Business Rule #2: Sequential Documentation
   CREATE TRIGGER check_sequential_documentation
     BEFORE INSERT ON "clinical_notes"
     FOR EACH ROW
     EXECUTE FUNCTION validate_sequential_documentation();
   ```

#### Prisma Schema Updates
**Location**: [packages/database/prisma/schema.prisma](packages/database/prisma/schema.prisma)

**Models Updated**:
- `Diagnosis`: Added tracking fields and relations (lines 928-962)
- `ClinicalNote`: Added diagnosis relations (lines 886-890)
- `User`: Added diagnosis history relation (line 144)

**New Models**:
- `DiagnosisHistory`: Audit trail for diagnosis changes (lines 998-1017)
- `ClinicalNoteDiagnosis`: Join table for billing (lines 1019-1033)

---

### ✅ Backend Services (Completed)

#### 1. Clinical Notes Validation Service
**Location**: [packages/backend/src/services/clinical-notes-validation.service.ts](packages/backend/src/services/clinical-notes-validation.service.ts)

**Key Functions**:
- `validateAppointmentRequirement()`: Business Rule #1
  - Checks if note type requires appointment
  - Validates appointment exists and belongs to correct client/clinician
  - Verifies appointment status is valid (SCHEDULED, CONFIRMED, IN_SESSION, COMPLETED, CHECKED_IN)

- `validateSequentialDocumentation()`: Business Rule #2
  - Checks if note type requires completed Intake
  - Verifies completed Intake exists (SIGNED, LOCKED, or COSIGNED status)
  - Applies to: PROGRESS, SOAP, TREATMENT_PLAN notes

- `validateDiagnosisModification()`: Business Rule #3
  - Enforces diagnoses can only be created/modified in INTAKE or TREATMENT_PLAN notes
  - Provides read-only access for other note types

- `validateNoteCreation()`: Combined validation for all rules

**Helper Functions**:
- `getClientActiveDiagnoses()`: Get all active diagnoses for a client
- `createDiagnosisHistory()`: Create audit trail entry
- `linkDiagnosisToNote()`: Link diagnosis to note for billing
- `getNoteDiagnoses()`: Get diagnoses linked to a note

#### 2. Diagnosis Service
**Location**: [packages/backend/src/services/diagnosis.service.ts](packages/backend/src/services/diagnosis.service.ts)

**CRUD Operations**:
- `createDiagnosis()`: Create new diagnosis
  - Only allowed from INTAKE or TREATMENT_PLAN notes
  - Automatically creates history entry
  - Tracks origin note and note type

- `updateDiagnosis()`: Update existing diagnosis
  - Only allowed from INTAKE or TREATMENT_PLAN notes
  - Creates history entry with old/new values
  - Updates tracking fields

- `getDiagnosisById()`: Retrieve single diagnosis with details
- `getClientDiagnoses()`: Get all diagnoses for a client
- `getDiagnosisHistory()`: Get complete audit trail
- `deleteDiagnosis()`: Soft delete (changes status to Inactive)
- `getClientDiagnosisStats()`: Statistics for dashboard

---

### ✅ Backend API (Completed)

#### Diagnosis Controller
**Location**: [packages/backend/src/controllers/diagnosis.controller.ts](packages/backend/src/controllers/diagnosis.controller.ts)

**Endpoints**:
- `POST /api/v1/diagnoses`: Create diagnosis
- `PUT /api/v1/diagnoses/:id`: Update diagnosis
- `GET /api/v1/diagnoses/:id`: Get diagnosis by ID
- `GET /api/v1/diagnoses/client/:clientId`: Get all client diagnoses
- `GET /api/v1/diagnoses/client/:clientId/stats`: Get diagnosis statistics
- `GET /api/v1/diagnoses/:id/history`: Get audit trail
- `DELETE /api/v1/diagnoses/:id`: Deactivate diagnosis

#### Diagnosis Routes
**Location**: [packages/backend/src/routes/diagnosis.routes.ts](packages/backend/src/routes/diagnosis.routes.ts)

**Authorization**:
- Create/Update/Delete: CLINICIAN, SUPERVISOR, ADMINISTRATOR
- View: CLINICIAN, SUPERVISOR, ADMINISTRATOR, BILLING_STAFF
- All routes require authentication

**Route Registration**:
Updated [packages/backend/src/routes/index.ts](packages/backend/src/routes/index.ts:76) to register `/api/v1/diagnoses` routes

---

## Business Rules Details

### Business Rule #1: Appointment-Based Note Creation

**Requirement**: Certain note types cannot be created without a corresponding appointment.

**Note Types Requiring Appointments**:
- INTAKE
- PROGRESS
- SOAP
- CANCELLATION
- CONSULTATION
- CONTACT

**Valid Appointment Statuses**:
- SCHEDULED
- CONFIRMED
- IN_SESSION
- COMPLETED
- CHECKED_IN

**Implementation**:
- **Database Trigger**: `validate_note_appointment()` checks at insert time
- **Backend Validation**: `validateAppointmentRequirement()` provides detailed error messages
- **Error Example**: "Note type 'PROGRESS' requires an appointment. Please select an appointment before creating this note."

---

### Business Rule #2: Sequential Documentation Workflow

**Requirement**: Progress Notes and Treatment Plans cannot be created without a completed Intake Assessment.

**Note Types Requiring Completed Intake**:
- PROGRESS
- SOAP
- TREATMENT_PLAN

**Completed Note Statuses**:
- SIGNED
- LOCKED
- COSIGNED

**Implementation**:
- **Database Trigger**: `validate_sequential_documentation()` enforces workflow
- **Backend Validation**: `validateSequentialDocumentation()` checks for completed Intake
- **Error Example**: "Cannot create PROGRESS note without a completed Intake Assessment. Please complete and sign an Intake Assessment first."

---

### Business Rule #3: Diagnosis Management and Propagation

**Requirement**: Diagnoses are managed centrally in Intake Assessments and Treatment Plans, then propagate as read-only to Progress Notes for billing.

**Diagnosis Modification Rules**:
- **Editable Note Types**: INTAKE, TREATMENT_PLAN only
- **Read-Only Note Types**: PROGRESS, SOAP, and all others
- **Audit Trail**: All changes tracked in `diagnosis_history` table

**Tracking Fields**:
- `diagnosisNoteId`: Note where diagnosis was created
- `createdInNoteType`: Type of note where created
- `lastUpdatedNoteId`: Last note that modified diagnosis
- `lastUpdatedInNoteType`: Type of note for last update

**Implementation**:
- **Service Layer**: `DiagnosisService` enforces modification rules
- **Validation**: `validateDiagnosisModification()` checks note type
- **History**: `createDiagnosisHistory()` logs all changes
- **Billing**: `ClinicalNoteDiagnosis` join table links diagnoses to notes

**Error Example**: "Diagnoses can only be created or modified in Intake Assessments or Treatment Plans. In PROGRESS notes, diagnoses are read-only."

---

## Database Schema

### Diagnosis Table Structure
```sql
CREATE TABLE "diagnoses" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "icdCode" TEXT NOT NULL,
  "diagnosisDescription" TEXT NOT NULL,
  "diagnosisType" VARCHAR(50) DEFAULT 'Primary',
  "severity" VARCHAR(20),
  "specifiers" TEXT,
  "onsetDate" TIMESTAMP(3),
  "resolvedDate" TIMESTAMP(3),
  "status" VARCHAR(20) DEFAULT 'Active',
  "notes" TEXT,
  "diagnosedBy" TEXT NOT NULL,
  "diagnosisDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

  -- Business Rule Tracking
  "diagnosisNoteId" TEXT,
  "createdInNoteType" VARCHAR(50),
  "lastUpdatedInNoteType" VARCHAR(50),
  "lastUpdatedNoteId" TEXT,

  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),

  CONSTRAINT "diagnoses_diagnosisNoteId_fkey"
    FOREIGN KEY ("diagnosisNoteId") REFERENCES "clinical_notes"("id"),
  CONSTRAINT "diagnoses_lastUpdatedNoteId_fkey"
    FOREIGN KEY ("lastUpdatedNoteId") REFERENCES "clinical_notes"("id")
);
```

### Diagnosis History Table
```sql
CREATE TABLE "diagnosis_history" (
  "id" TEXT PRIMARY KEY,
  "diagnosisId" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL,
  "changedInNoteId" TEXT,
  "changedInNoteType" VARCHAR(50),
  "changeType" VARCHAR(20) NOT NULL, -- CREATED, MODIFIED, STATUS_CHANGE, DELETED
  "oldValues" JSONB,
  "newValues" JSONB,
  "changeReason" TEXT,
  "changedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "diagnosis_history_diagnosisId_fkey"
    FOREIGN KEY ("diagnosisId") REFERENCES "diagnoses"("id") ON DELETE CASCADE
);
```

### Clinical Note Diagnoses Join Table
```sql
CREATE TABLE "clinical_note_diagnoses" (
  "id" TEXT PRIMARY KEY,
  "noteId" TEXT NOT NULL,
  "diagnosisId" TEXT NOT NULL,
  "pointerOrder" INTEGER DEFAULT 1,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "clinical_note_diagnoses_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE CASCADE,
  CONSTRAINT "clinical_note_diagnoses_diagnosisId_fkey"
    FOREIGN KEY ("diagnosisId") REFERENCES "diagnoses"("id") ON DELETE CASCADE,
  CONSTRAINT "clinical_note_diagnoses_noteId_diagnosisId_key"
    UNIQUE ("noteId", "diagnosisId")
);
```

---

## API Usage Examples

### Create a Diagnosis (from Intake Note)
```http
POST /api/v1/diagnoses
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": "client-uuid",
  "icdCode": "F41.1",
  "diagnosisDescription": "Generalized Anxiety Disorder",
  "diagnosisType": "Primary",
  "severity": "Moderate",
  "specifiers": "With panic attacks",
  "diagnosisNoteId": "intake-note-uuid",
  "createdInNoteType": "INTAKE"
}
```

### Update a Diagnosis (from Treatment Plan)
```http
PUT /api/v1/diagnoses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "severity": "Mild",
  "status": "Active",
  "lastUpdatedNoteId": "treatment-plan-uuid",
  "lastUpdatedInNoteType": "TREATMENT_PLAN",
  "changeReason": "Client showing significant improvement"
}
```

### Get Diagnosis History (Audit Trail)
```http
GET /api/v1/diagnoses/:id/history
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "history-uuid-1",
      "changeType": "MODIFIED",
      "changedAt": "2025-10-17T20:00:00Z",
      "changedBy": {
        "firstName": "John",
        "lastName": "Doe",
        "title": "PhD"
      },
      "changedInNote": {
        "noteType": "TREATMENT_PLAN",
        "sessionDate": "2025-10-17"
      },
      "oldValues": { "severity": "Moderate" },
      "newValues": { "severity": "Mild" },
      "changeReason": "Client showing significant improvement"
    },
    {
      "id": "history-uuid-2",
      "changeType": "CREATED",
      "changedAt": "2025-10-01T10:00:00Z",
      "changedBy": {
        "firstName": "John",
        "lastName": "Doe",
        "title": "PhD"
      },
      "changedInNote": {
        "noteType": "INTAKE",
        "sessionDate": "2025-10-01"
      },
      "newValues": {
        "icdCode": "F41.1",
        "diagnosisDescription": "Generalized Anxiety Disorder",
        "severity": "Moderate"
      },
      "changeReason": "Initial diagnosis"
    }
  ]
}
```

---

## Testing the Implementation

### Test Business Rule #1: Appointment Requirement

**Test Case**: Try to create a Progress Note without an appointment
```sql
INSERT INTO clinical_notes (
  "id", "clientId", "clinicianId", "appointmentId",
  "noteType", "sessionDate", "status"
) VALUES (
  gen_random_uuid()::TEXT,
  'client-uuid',
  'clinician-uuid',
  NULL, -- No appointment
  'PROGRESS',
  CURRENT_TIMESTAMP,
  'DRAFT'
);
```

**Expected Result**:
```
ERROR: Note type PROGRESS requires an appointment
```

### Test Business Rule #2: Sequential Documentation

**Test Case**: Try to create a Progress Note without a completed Intake
```sql
INSERT INTO clinical_notes (
  "id", "clientId", "clinicianId", "appointmentId",
  "noteType", "sessionDate", "status"
) VALUES (
  gen_random_uuid()::TEXT,
  'new-client-uuid', -- Client with no Intake
  'clinician-uuid',
  'appointment-uuid',
  'PROGRESS',
  CURRENT_TIMESTAMP,
  'DRAFT'
);
```

**Expected Result**:
```
ERROR: Cannot create PROGRESS note without a completed Intake Assessment for this client
```

### Test Business Rule #3: Diagnosis Modification

**Test Case**: Try to create a diagnosis from a Progress Note (via API)
```http
POST /api/v1/diagnoses
{
  "clientId": "client-uuid",
  "icdCode": "F41.1",
  "diagnosisDescription": "GAD",
  "diagnosisNoteId": "progress-note-uuid",
  "createdInNoteType": "PROGRESS"
}
```

**Expected Result**:
```json
{
  "success": false,
  "error": "Diagnoses can only be created in Intake Assessments or Treatment Plans. Cannot create diagnosis in PROGRESS note."
}
```

---

## Next Steps (Frontend Implementation)

### 1. Update Clinical Notes Forms
- Add appointment dropdown to note creation forms
- Show validation errors from backend
- Disable note creation if no appointment selected (for required note types)

### 2. Sequential Documentation UI
- Check for completed Intake before allowing Progress Note creation
- Show helpful message: "Complete an Intake Assessment first"
- Display Intake status in client summary

### 3. Diagnosis Management UI
- Create diagnosis CRUD interface for Intake/Treatment Plan notes
- Show read-only diagnosis list in Progress Notes
- Display diagnosis history/audit trail
- Add diagnosis selection for billing in all notes

### 4. Testing
- End-to-end testing of all three business rules
- Verify error messages are user-friendly
- Test audit trail functionality
- Validate billing workflow

---

## File Locations

### Database
- Migration: `packages/database/prisma/migrations/20251017193200_clinical_notes_business_rules/migration.sql`
- Schema: `packages/database/prisma/schema.prisma`

### Backend Services
- Validation Service: `packages/backend/src/services/clinical-notes-validation.service.ts`
- Diagnosis Service: `packages/backend/src/services/diagnosis.service.ts`

### Backend API
- Controller: `packages/backend/src/controllers/diagnosis.controller.ts`
- Routes: `packages/backend/src/routes/diagnosis.routes.ts`
- Route Registration: `packages/backend/src/routes/index.ts`

### Documentation
- This document: `CLINICAL-NOTES-BUSINESS-RULES-IMPLEMENTATION.md`

---

## Servers Running

- ✅ Backend API: http://localhost:3001
- ✅ Frontend: http://localhost:5175
- ✅ Database: localhost:5432 (mentalspace_ehr)

---

## Summary

The Clinical Notes Business Rules have been **fully implemented at the database and backend layers**. All three business rules are enforced through:

1. **PostgreSQL triggers** for database-level validation
2. **Backend services** for detailed error messages
3. **RESTful API** for diagnosis management
4. **Complete audit trail** for compliance

The implementation is production-ready and waiting for frontend integration to provide the complete user experience.
