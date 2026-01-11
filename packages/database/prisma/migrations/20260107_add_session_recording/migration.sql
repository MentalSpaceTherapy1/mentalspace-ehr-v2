-- AddSessionRecording
-- This migration adds the SessionRecording model for storing telehealth session recordings
-- with HIPAA-compliant storage, access logging, and retention policies.

-- Update TelehealthSession model with new recording fields (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'recordingDuration') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "recordingDuration" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'recordingStatus') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "recordingStatus" TEXT;
  END IF;
END $$;

-- Note: session_recordings table is created in 20260106_add_telehealth_phase2_ai_models
-- This migration may add additional columns if they don't exist

-- Add any additional columns that may not exist from the earlier migration
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'twilioRoomSid') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "twilioRoomSid" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'recordingFormat') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "recordingFormat" TEXT DEFAULT 'mp4';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'twilioRecordingUrl') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "twilioRecordingUrl" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'twilioMediaUrl') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "twilioMediaUrl" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'storageProvider') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "storageProvider" TEXT DEFAULT 'S3';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'storageBucket') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "storageBucket" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'storageKey') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "storageKey" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'storageRegion') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "storageRegion" TEXT DEFAULT 'us-east-1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'recordingSize') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "recordingSize" BIGINT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'recordingStartedAt') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "recordingStartedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'recordingEndedAt') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "recordingEndedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'uploadedAt') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "uploadedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'lastAccessedAt') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "lastAccessedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'processingError') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "processingError" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'clientConsentGiven') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "clientConsentGiven" BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'consentIpAddress') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "consentIpAddress" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'scheduledDeletionAt') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "scheduledDeletionAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'viewCount') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "viewCount" INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'accessLog') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "accessLog" JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'createdBy') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "createdBy" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_recordings' AND column_name = 'lastModifiedBy') THEN
    ALTER TABLE "session_recordings" ADD COLUMN "lastModifiedBy" TEXT;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "session_recordings_sessionId_idx" ON "session_recordings"("sessionId");
CREATE INDEX IF NOT EXISTS "session_recordings_status_idx" ON "session_recordings"("status");
CREATE INDEX IF NOT EXISTS "session_recordings_scheduledDeletionAt_idx" ON "session_recordings"("scheduledDeletionAt");
CREATE INDEX IF NOT EXISTS "session_recordings_twilioRecordingSid_idx" ON "session_recordings"("twilioRecordingSid");

-- Add comments for documentation
COMMENT ON TABLE "session_recordings" IS 'Stores HIPAA-compliant telehealth session recordings with encryption, access logging, and retention policies';
COMMENT ON COLUMN "session_recordings"."retentionDays" IS 'Georgia law requires 7 years (2555 days) retention for medical records';
COMMENT ON COLUMN "session_recordings"."accessLog" IS 'JSON array tracking all access: [{timestamp, userId, action, ipAddress, userAgent}]';
COMMENT ON COLUMN "session_recordings"."encryptionMethod" IS 'Server-side encryption type (AES256 or AWS-KMS)';
