-- Clinical Notes Business Rules Migration
-- Implements: Appointment-based notes, Sequential documentation, Diagnosis management

-- Step 1: Enhance Diagnosis table to track note origin and changes
ALTER TABLE "diagnoses" ADD COLUMN "specifiers" TEXT;
ALTER TABLE "diagnoses" ADD COLUMN "severity" VARCHAR(20);
ALTER TABLE "diagnoses" ADD COLUMN "diagnosisNoteId" TEXT;
ALTER TABLE "diagnoses" ADD COLUMN "createdInNoteType" VARCHAR(50);
ALTER TABLE "diagnoses" ADD COLUMN "lastUpdatedInNoteType" VARCHAR(50);
ALTER TABLE "diagnoses" ADD COLUMN "lastUpdatedNoteId" TEXT;

-- Add foreign key constraints
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_diagnosisNoteId_fkey"
  FOREIGN KEY ("diagnosisNoteId") REFERENCES "clinical_notes"("id") ON DELETE SET NULL;

ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_lastUpdatedNoteId_fkey"
  FOREIGN KEY ("lastUpdatedNoteId") REFERENCES "clinical_notes"("id") ON DELETE SET NULL;

-- Step 2: Create diagnosis history table for audit trail
CREATE TABLE "diagnosis_history" (
  "id" TEXT PRIMARY KEY,
  "diagnosisId" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL,
  "changedInNoteId" TEXT,
  "changedInNoteType" VARCHAR(50),
  "changeType" VARCHAR(20) NOT NULL,
  "oldValues" JSONB,
  "newValues" JSONB,
  "changeReason" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "diagnosis_history_diagnosisId_fkey"
    FOREIGN KEY ("diagnosisId") REFERENCES "diagnoses"("id") ON DELETE CASCADE,
  CONSTRAINT "diagnosis_history_changedBy_fkey"
    FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "diagnosis_history_changedInNoteId_fkey"
    FOREIGN KEY ("changedInNoteId") REFERENCES "clinical_notes"("id") ON DELETE SET NULL
);

CREATE INDEX "diagnosis_history_diagnosisId_idx" ON "diagnosis_history"("diagnosisId");
CREATE INDEX "diagnosis_history_changedAt_idx" ON "diagnosis_history"("changedAt");

-- Step 3: Add validation trigger for appointment-based notes
CREATE OR REPLACE FUNCTION validate_note_appointment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if note type requires appointment
  IF NEW."noteType" IN ('INTAKE', 'PROGRESS', 'SOAP', 'CANCELLATION', 'CONSULTATION', 'CONTACT') THEN
    -- Verify appointment exists and is valid
    IF NEW."appointmentId" IS NULL THEN
      RAISE EXCEPTION 'Note type % requires an appointment', NEW."noteType";
    END IF;

    -- Verify appointment belongs to the same client and clinician
    IF NOT EXISTS (
      SELECT 1 FROM "appointments"
      WHERE "id" = NEW."appointmentId"
        AND "clientId" = NEW."clientId"
        AND "clinicianId" = NEW."clinicianId"
        AND "status" IN ('SCHEDULED', 'CONFIRMED', 'IN_SESSION', 'COMPLETED', 'CHECKED_IN')
    ) THEN
      RAISE EXCEPTION 'Invalid appointment for this note. Appointment must belong to the same client and clinician.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_appointment_before_note
  BEFORE INSERT ON "clinical_notes"
  FOR EACH ROW
  EXECUTE FUNCTION validate_note_appointment();

-- Step 4: Add validation trigger for sequential documentation workflow
CREATE OR REPLACE FUNCTION validate_sequential_documentation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if note type requires prior Intake
  IF NEW."noteType" IN ('PROGRESS', 'SOAP') THEN
    -- Verify completed Intake exists for this client
    IF NOT EXISTS (
      SELECT 1 FROM "clinical_notes"
      WHERE "clientId" = NEW."clientId"
        AND "noteType" = 'INTAKE'
        AND "status" IN ('SIGNED', 'LOCKED', 'COSIGNED')
    ) THEN
      RAISE EXCEPTION 'Cannot create % note without a completed Intake Assessment for this client', NEW."noteType";
    END IF;
  END IF;

  -- Check if Treatment Plan requires Intake
  IF NEW."noteType" = 'TREATMENT_PLAN' THEN
    IF NOT EXISTS (
      SELECT 1 FROM "clinical_notes"
      WHERE "clientId" = NEW."clientId"
        AND "noteType" = 'INTAKE'
        AND "status" IN ('SIGNED', 'LOCKED', 'COSIGNED')
    ) THEN
      RAISE EXCEPTION 'Cannot create Treatment Plan without a completed Intake Assessment for this client';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_sequential_documentation
  BEFORE INSERT ON "clinical_notes"
  FOR EACH ROW
  EXECUTE FUNCTION validate_sequential_documentation();

-- Step 5: Create clinical_note_diagnoses join table for billing
CREATE TABLE "clinical_note_diagnoses" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "noteId" TEXT NOT NULL,
  "diagnosisId" TEXT NOT NULL,
  "pointerOrder" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "clinical_note_diagnoses_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE CASCADE,
  CONSTRAINT "clinical_note_diagnoses_diagnosisId_fkey"
    FOREIGN KEY ("diagnosisId") REFERENCES "diagnoses"("id") ON DELETE CASCADE,
  CONSTRAINT "clinical_note_diagnoses_noteId_diagnosisId_key"
    UNIQUE ("noteId", "diagnosisId")
);

CREATE INDEX "clinical_note_diagnoses_noteId_idx" ON "clinical_note_diagnoses"("noteId");
CREATE INDEX "clinical_note_diagnoses_diagnosisId_idx" ON "clinical_note_diagnoses"("diagnosisId");
