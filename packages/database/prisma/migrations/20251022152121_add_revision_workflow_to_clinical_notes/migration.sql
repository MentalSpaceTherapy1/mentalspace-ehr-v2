-- Add RETURNED_FOR_REVISION to NoteStatus enum
ALTER TYPE "NoteStatus" ADD VALUE 'RETURNED_FOR_REVISION';

-- Add revision workflow fields to clinical_notes table
ALTER TABLE "clinical_notes" ADD COLUMN "revisionHistory" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "clinical_notes" ADD COLUMN "revisionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clinical_notes" ADD COLUMN "currentRevisionComments" TEXT;
ALTER TABLE "clinical_notes" ADD COLUMN "currentRevisionRequiredChanges" TEXT[] NOT NULL DEFAULT '{}';

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS "clinical_notes_status_idx" ON "clinical_notes"("status");

-- Create index on clinician for supervisor queries
CREATE INDEX IF NOT EXISTS "clinical_notes_clinician_status_idx" ON "clinical_notes"("clinicianId", "status");
