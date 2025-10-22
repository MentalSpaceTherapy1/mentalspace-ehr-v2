-- Create note_validation_rules table for Phase 1.3
CREATE TABLE "note_validation_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "validationPattern" TEXT,
    "errorMessage" TEXT,
    "conditionalOn" TEXT,
    "conditionalValue" TEXT,
    "displayLabel" TEXT,
    "helpText" TEXT,
    "validationOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT
);

-- Create unique index
CREATE UNIQUE INDEX "note_validation_rules_noteType_fieldName_key" ON "note_validation_rules"("noteType", "fieldName");

-- Create index for faster lookups
CREATE INDEX "note_validation_rules_noteType_isActive_idx" ON "note_validation_rules"("noteType", "isActive");

-- Seed default validation rules for Progress Notes
INSERT INTO "note_validation_rules" ("id", "noteType", "fieldName", "isRequired", "minLength", "displayLabel", "errorMessage", "validationOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Progress Note', 'subjective', true, 20, 'Subjective (Client Report)', 'Subjective section is required and must be at least 20 characters', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Progress Note', 'objective', true, 20, 'Objective (Clinical Observations)', 'Objective section is required and must be at least 20 characters', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Progress Note', 'assessment', true, 30, 'Assessment (Clinical Impression)', 'Assessment section is required and must be at least 30 characters', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Progress Note', 'plan', true, 20, 'Plan (Treatment Plan)', 'Plan section is required and must be at least 20 characters', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Progress Note', 'diagnosisCodes', true, NULL, 'Diagnosis Codes', 'At least one diagnosis code is required', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed default validation rules for Intake Assessments
INSERT INTO "note_validation_rules" ("id", "noteType", "fieldName", "isRequired", "minLength", "displayLabel", "errorMessage", "validationOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Intake Assessment', 'subjective', true, 50, 'Presenting Problem', 'Presenting problem is required and must be at least 50 characters', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Intake Assessment', 'assessment', true, 100, 'Clinical Assessment', 'Clinical assessment is required and must be at least 100 characters', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Intake Assessment', 'plan', true, 50, 'Treatment Plan', 'Treatment plan is required and must be at least 50 characters', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Intake Assessment', 'diagnosisCodes', true, NULL, 'Diagnosis Codes', 'At least one diagnosis code is required', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed default validation rules for Treatment Plans
INSERT INTO "note_validation_rules" ("id", "noteType", "fieldName", "isRequired", "minLength", "displayLabel", "errorMessage", "validationOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Treatment Plan', 'assessment', true, 50, 'Clinical Assessment', 'Clinical assessment is required and must be at least 50 characters', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Treatment Plan', 'plan', true, 100, 'Treatment Goals and Interventions', 'Treatment plan is required and must be at least 100 characters', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Treatment Plan', 'diagnosisCodes', true, NULL, 'Diagnosis Codes', 'At least one diagnosis code is required', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
