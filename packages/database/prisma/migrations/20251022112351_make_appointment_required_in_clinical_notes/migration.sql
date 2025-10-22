-- AlterTable: Make appointmentId required in clinical_notes
-- This migration will fail if there are any clinical notes without an appointmentId

-- First, check if there are any notes without appointments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM clinical_notes WHERE "appointmentId" IS NULL) THEN
        RAISE EXCEPTION 'Cannot make appointmentId required: % clinical notes exist without an appointment',
            (SELECT COUNT(*) FROM clinical_notes WHERE "appointmentId" IS NULL);
    END IF;
END $$;

-- Make appointmentId NOT NULL
ALTER TABLE "clinical_notes" ALTER COLUMN "appointmentId" SET NOT NULL;
