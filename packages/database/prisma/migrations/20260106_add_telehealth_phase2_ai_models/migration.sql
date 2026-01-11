-- Phase 2: Telehealth AI Models Migration
-- Session Recording and AI Note Generation

-- Create SessionRecording model
CREATE TABLE IF NOT EXISTS "session_recordings" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "recordingType" TEXT NOT NULL DEFAULT 'AUDIO',
    "twilioRecordingSid" TEXT,
    "twilioCompositionSid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "fileSize" BIGINT,
    "s3Bucket" TEXT,
    "s3Key" TEXT,
    "s3Url" TEXT,
    "expiresAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "encryptionKey" TEXT,
    "encryptionMethod" TEXT,
    "consentRecorded" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "consentProvidedBy" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "deleteAfter" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletionReason" TEXT,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_recordings_pkey" PRIMARY KEY ("id")
);

-- Create enums for AI Generated Notes
DO $$ BEGIN
    CREATE TYPE "AIGeneratedNoteStatus" AS ENUM ('GENERATING', 'COMPLETED', 'REVIEWED', 'APPROVED', 'REJECTED', 'ERROR', 'PENDING_REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AIRiskLevel" AS ENUM ('NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AIGeneratedNoteType" AS ENUM ('PROGRESS_NOTE', 'INTAKE_NOTE', 'TREATMENT_PLAN_UPDATE', 'DISCHARGE_SUMMARY', 'SESSION_SUMMARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create AIGeneratedNote model
CREATE TABLE IF NOT EXISTS "ai_generated_notes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "noteType" "AIGeneratedNoteType" NOT NULL DEFAULT 'PROGRESS_NOTE',
    "status" "AIGeneratedNoteStatus" NOT NULL DEFAULT 'GENERATING',
    "transcriptText" TEXT NOT NULL,
    "transcriptId" TEXT,
    "sessionMetadata" JSONB NOT NULL DEFAULT '{}',
    "soapNote" JSONB NOT NULL DEFAULT '{}',
    "riskAssessment" JSONB NOT NULL DEFAULT '{}',
    "treatmentPlanUpdates" JSONB DEFAULT '{}',
    "generationConfidence" DOUBLE PRECISION,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
    "promptVersion" TEXT NOT NULL DEFAULT '1.0',
    "generationTimeMs" INTEGER,
    "tokenCount" INTEGER,
    "transcriptQuality" TEXT,
    "missingInformation" TEXT[],
    "warnings" TEXT[],
    "clinicianReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "clinicianEdits" JSONB DEFAULT '{}',
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "regenerationFeedback" TEXT[],
    "previousVersions" JSONB DEFAULT '[]',
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "ai_generated_notes_pkey" PRIMARY KEY ("id")
);

-- Create AIGenerationAuditLog model
CREATE TABLE IF NOT EXISTS "ai_generation_audit_log" (
    "id" TEXT NOT NULL,
    "aiNoteId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL DEFAULT '{}',
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_audit_log_pkey" PRIMARY KEY ("id")
);

-- Create AIPromptTemplate model
CREATE TABLE IF NOT EXISTS "ai_prompt_templates" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "modelConfig" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "ai_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "session_recordings_sessionId_key" ON "session_recordings"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_generated_notes_sessionId_key" ON "ai_generated_notes"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_prompt_templates_templateName_version_key" ON "ai_prompt_templates"("templateName", "version");

-- Add indexes
CREATE INDEX IF NOT EXISTS "session_recordings_status_idx" ON "session_recordings"("status");
CREATE INDEX IF NOT EXISTS "session_recordings_createdAt_idx" ON "session_recordings"("createdAt");

CREATE INDEX IF NOT EXISTS "ai_generated_notes_sessionId_idx" ON "ai_generated_notes"("sessionId");
CREATE INDEX IF NOT EXISTS "ai_generated_notes_appointmentId_idx" ON "ai_generated_notes"("appointmentId");
CREATE INDEX IF NOT EXISTS "ai_generated_notes_clientId_idx" ON "ai_generated_notes"("clientId");
CREATE INDEX IF NOT EXISTS "ai_generated_notes_clinicianId_idx" ON "ai_generated_notes"("clinicianId");
CREATE INDEX IF NOT EXISTS "ai_generated_notes_status_idx" ON "ai_generated_notes"("status");
CREATE INDEX IF NOT EXISTS "ai_generated_notes_reviewedBy_idx" ON "ai_generated_notes"("reviewedBy");
CREATE INDEX IF NOT EXISTS "ai_generated_notes_createdAt_idx" ON "ai_generated_notes"("createdAt");

CREATE INDEX IF NOT EXISTS "ai_generation_audit_log_aiNoteId_idx" ON "ai_generation_audit_log"("aiNoteId");
CREATE INDEX IF NOT EXISTS "ai_generation_audit_log_eventType_idx" ON "ai_generation_audit_log"("eventType");
CREATE INDEX IF NOT EXISTS "ai_generation_audit_log_timestamp_idx" ON "ai_generation_audit_log"("timestamp");

CREATE INDEX IF NOT EXISTS "ai_prompt_templates_templateType_idx" ON "ai_prompt_templates"("templateType");
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_isActive_idx" ON "ai_prompt_templates"("isActive");

-- Add foreign keys
ALTER TABLE "session_recordings"
    DROP CONSTRAINT IF EXISTS "session_recordings_sessionId_fkey";
ALTER TABLE "session_recordings"
    ADD CONSTRAINT "session_recordings_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "telehealth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_notes"
    DROP CONSTRAINT IF EXISTS "ai_generated_notes_appointmentId_fkey";
ALTER TABLE "ai_generated_notes"
    ADD CONSTRAINT "ai_generated_notes_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_notes"
    DROP CONSTRAINT IF EXISTS "ai_generated_notes_clientId_fkey";
ALTER TABLE "ai_generated_notes"
    ADD CONSTRAINT "ai_generated_notes_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_notes"
    DROP CONSTRAINT IF EXISTS "ai_generated_notes_clinicianId_fkey";
ALTER TABLE "ai_generated_notes"
    ADD CONSTRAINT "ai_generated_notes_clinicianId_fkey"
    FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_notes"
    DROP CONSTRAINT IF EXISTS "ai_generated_notes_reviewedBy_fkey";
ALTER TABLE "ai_generated_notes"
    ADD CONSTRAINT "ai_generated_notes_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_generation_audit_log"
    DROP CONSTRAINT IF EXISTS "ai_generation_audit_log_aiNoteId_fkey";
ALTER TABLE "ai_generation_audit_log"
    ADD CONSTRAINT "ai_generation_audit_log_aiNoteId_fkey"
    FOREIGN KEY ("aiNoteId") REFERENCES "ai_generated_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generation_audit_log"
    DROP CONSTRAINT IF EXISTS "ai_generation_audit_log_userId_fkey";
ALTER TABLE "ai_generation_audit_log"
    ADD CONSTRAINT "ai_generation_audit_log_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_prompt_templates"
    DROP CONSTRAINT IF EXISTS "ai_prompt_templates_createdBy_fkey";
ALTER TABLE "ai_prompt_templates"
    ADD CONSTRAINT "ai_prompt_templates_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_prompt_templates"
    DROP CONSTRAINT IF EXISTS "ai_prompt_templates_updatedBy_fkey";
ALTER TABLE "ai_prompt_templates"
    ADD CONSTRAINT "ai_prompt_templates_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
