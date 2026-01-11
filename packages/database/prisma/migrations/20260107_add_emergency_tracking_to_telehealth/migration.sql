-- Add emergency tracking fields to TelehealthSession
-- Module 6: Telehealth - Emergency Safety Features
-- Created: 2025-01-07

-- Add emergency tracking columns (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencyActivated') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyActivated" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencyActivatedAt') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyActivatedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencyNotes') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyNotes" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencyResolution') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyResolution" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencyContactNotified') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyContactNotified" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
