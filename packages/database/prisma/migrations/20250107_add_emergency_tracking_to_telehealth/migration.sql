-- Add emergency tracking fields to TelehealthSession
-- Module 6: Telehealth - Emergency Safety Features
-- Created: 2025-01-07

-- Add emergency tracking columns
ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyActivated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyActivatedAt" TIMESTAMP(3);
ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyNotes" TEXT;
ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyResolution" TEXT;
ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyContactNotified" BOOLEAN NOT NULL DEFAULT false;
