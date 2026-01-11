-- AddSessionRecording
-- This migration adds the SessionRecording model for storing telehealth session recordings
-- with HIPAA-compliant storage, access logging, and retention policies.

-- Update TelehealthSession model with new recording fields
ALTER TABLE "telehealth_sessions"
ADD COLUMN IF NOT EXISTS "recordingDuration" INTEGER,
ADD COLUMN IF NOT EXISTS "recordingStatus" TEXT;

-- Create session_recordings table
CREATE TABLE IF NOT EXISTS "session_recordings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,

    -- Twilio Recording Info
    "twilioRecordingSid" TEXT NOT NULL UNIQUE,
    "twilioCompositionSid" TEXT UNIQUE,
    "twilioRoomSid" TEXT NOT NULL,
    "recordingDuration" INTEGER NOT NULL DEFAULT 0,
    "recordingSize" BIGINT NOT NULL DEFAULT 0,
    "recordingFormat" TEXT NOT NULL DEFAULT 'mp4',
    "twilioRecordingUrl" TEXT,
    "twilioMediaUrl" TEXT,

    -- Storage Info
    "storageProvider" TEXT NOT NULL DEFAULT 'S3',
    "storageBucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageRegion" TEXT NOT NULL DEFAULT 'us-east-1',
    "encryptionType" TEXT NOT NULL DEFAULT 'AES256',

    -- Status & Metadata
    "status" TEXT NOT NULL DEFAULT 'RECORDING',
    "recordingStartedAt" TIMESTAMP(3) NOT NULL,
    "recordingEndedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "processingError" TEXT,

    -- Consent & Compliance
    "clientConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3) NOT NULL,
    "consentIpAddress" TEXT,
    "retentionPolicy" TEXT NOT NULL DEFAULT '7_YEARS',
    "scheduledDeletionAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,

    -- Access Control & Audit
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "accessLog" JSONB,

    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    -- Foreign key constraint
    CONSTRAINT "session_recordings_sessionId_fkey" FOREIGN KEY ("sessionId")
        REFERENCES "telehealth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "session_recordings_sessionId_idx" ON "session_recordings"("sessionId");
CREATE INDEX IF NOT EXISTS "session_recordings_status_idx" ON "session_recordings"("status");
CREATE INDEX IF NOT EXISTS "session_recordings_scheduledDeletionAt_idx" ON "session_recordings"("scheduledDeletionAt");
CREATE INDEX IF NOT EXISTS "session_recordings_twilioRecordingSid_idx" ON "session_recordings"("twilioRecordingSid");

-- Add comments for documentation
COMMENT ON TABLE "session_recordings" IS 'Stores HIPAA-compliant telehealth session recordings with encryption, access logging, and retention policies';
COMMENT ON COLUMN "session_recordings"."retentionPolicy" IS 'Georgia law requires 7 years retention for medical records';
COMMENT ON COLUMN "session_recordings"."accessLog" IS 'JSON array tracking all access: [{timestamp, userId, action, ipAddress, userAgent}]';
COMMENT ON COLUMN "session_recordings"."encryptionType" IS 'Server-side encryption type (AES256 or AWS-KMS)';
