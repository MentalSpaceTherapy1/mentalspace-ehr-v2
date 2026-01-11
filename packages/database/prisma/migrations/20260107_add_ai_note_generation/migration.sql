-- Module 6 Telehealth Phase 2: AI Note Generation
-- Add AI-powered clinical note generation with Claude AI

-- ============================================================================
-- ENUMS
-- ============================================================================

-- AI Note Status
CREATE TYPE "AIGeneratedNoteStatus" AS ENUM (
  'GENERATING',
  'GENERATED',
  'REVIEWED',
  'APPROVED',
  'REJECTED',
  'REGENERATING',
  'FAILED'
);

-- Risk Level
CREATE TYPE "AIRiskLevel" AS ENUM (
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL'
);

-- Note Type
CREATE TYPE "AIGeneratedNoteType" AS ENUM (
  'PROGRESS_NOTE',
  'INTAKE_NOTE',
  'CRISIS_NOTE',
  'TERMINATION_NOTE'
);

-- ============================================================================
-- AI GENERATED NOTES TABLE
-- ============================================================================

CREATE TABLE "ai_generated_notes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,

    -- Note Configuration
    "noteType" "AIGeneratedNoteType" NOT NULL DEFAULT 'PROGRESS_NOTE',
    "status" "AIGeneratedNoteStatus" NOT NULL DEFAULT 'GENERATING',

    -- Source Data
    "transcriptText" TEXT NOT NULL,
    "transcriptId" TEXT,
    "sessionMetadata" JSONB NOT NULL DEFAULT '{}',

    -- Generated SOAP Note (JSON structure)
    "soapNote" JSONB NOT NULL DEFAULT '{}',
    -- Structure: {
    --   subjective: { chiefComplaint, mood, symptoms, recentEvents },
    --   objective: { appearance, affect, behavior, speech, mentalStatus },
    --   assessment: { clinicalImpressions, diagnosis, progress },
    --   plan: { interventionsUsed, homeworkAssigned, medicationChanges, nextSession, safetyPlan }
    -- }

    -- Risk Assessment
    "riskAssessment" JSONB NOT NULL DEFAULT '{}',
    -- Structure: {
    --   riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
    --   suicidalIdeation: boolean,
    --   suicidalPlan: boolean,
    --   homicidalIdeation: boolean,
    --   selfHarm: boolean,
    --   substanceAbuse: boolean,
    --   nonCompliance: boolean,
    --   indicators: string[],
    --   recommendedActions: string[],
    --   requiresImmediateAction: boolean
    -- }

    -- Treatment Plan Updates
    "treatmentPlanUpdates" JSONB DEFAULT '{}',
    -- Structure: {
    --   goalsDiscussed: string[],
    --   progressNotes: string[],
    --   newInterventions: string[],
    --   modifications: string[]
    -- }

    -- AI Metadata
    "generationConfidence" DOUBLE PRECISION,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
    "promptVersion" TEXT NOT NULL DEFAULT '1.0',
    "generationTimeMs" INTEGER,
    "tokenCount" INTEGER,

    -- Quality Indicators
    "transcriptQuality" TEXT, -- POOR, FAIR, GOOD, EXCELLENT
    "missingInformation" TEXT[],
    "warnings" TEXT[],

    -- Clinician Review
    "clinicianReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "clinicianEdits" JSONB DEFAULT '{}',
    -- Structure: {
    --   changes: Array<{
    --     section: string,
    --     fieldPath: string,
    --     originalValue: string,
    --     editedValue: string,
    --     timestamp: string
    --   }>
    -- }

    -- Regeneration Tracking
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "regenerationFeedback" TEXT[],
    "previousVersions" JSONB DEFAULT '[]',
    -- Array of previous SOAP notes and metadata

    -- Error Handling
    "errorMessage" TEXT,
    "errorDetails" JSONB,

    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "ai_generated_notes_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- EXTEND TELEHEALTH SESSION TABLE
-- ============================================================================

-- Add AI transcription and note generation tracking to TelehealthSession
ALTER TABLE "telehealth_sessions"
ADD COLUMN "transcriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "transcriptionStatus" TEXT,
ADD COLUMN "transcriptionStartedAt" TIMESTAMP(3),
ADD COLUMN "transcriptionCompletedAt" TIMESTAMP(3),
ADD COLUMN "transcriptionS3Key" TEXT,
ADD COLUMN "transcriptText" TEXT,
ADD COLUMN "aiNoteGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aiNoteGeneratedAt" TIMESTAMP(3),
ADD COLUMN "aiNoteId" TEXT;

-- ============================================================================
-- EXTEND CLINICAL NOTE TABLE
-- ============================================================================

-- Add AI generation tracking to existing ClinicalNote table
ALTER TABLE "clinical_notes"
ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "generatedFrom" TEXT,
ADD COLUMN "aiGeneratedNoteId" TEXT,
ADD COLUMN "generationConfidence" DOUBLE PRECISION,
ADD COLUMN "clinicianReviewedAI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aiEditCount" INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- AI GENERATION AUDIT LOG
-- ============================================================================

CREATE TABLE "ai_generation_audit_log" (
    "id" TEXT NOT NULL,
    "aiNoteId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    -- Event types: GENERATION_STARTED, GENERATION_COMPLETED, GENERATION_FAILED,
    --              REVIEW_STARTED, REVIEW_COMPLETED, APPROVED, REJECTED,
    --              REGENERATION_REQUESTED, EDIT_MADE, EXPORTED_TO_NOTE
    "eventData" JSONB NOT NULL DEFAULT '{}',
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_audit_log_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- AI PROMPT TEMPLATES
-- ============================================================================

CREATE TABLE "ai_prompt_templates" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    -- Types: SOAP_GENERATION, RISK_ASSESSMENT, TREATMENT_PLAN_UPDATE
    "version" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "modelConfig" JSONB NOT NULL DEFAULT '{}',
    -- { temperature, maxTokens, topP, etc. }
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "ai_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- AI Generated Notes indexes
CREATE INDEX "ai_generated_notes_sessionId_idx" ON "ai_generated_notes"("sessionId");
CREATE INDEX "ai_generated_notes_appointmentId_idx" ON "ai_generated_notes"("appointmentId");
CREATE INDEX "ai_generated_notes_clientId_idx" ON "ai_generated_notes"("clientId");
CREATE INDEX "ai_generated_notes_clinicianId_idx" ON "ai_generated_notes"("clinicianId");
CREATE INDEX "ai_generated_notes_status_idx" ON "ai_generated_notes"("status");
CREATE INDEX "ai_generated_notes_reviewedBy_idx" ON "ai_generated_notes"("reviewedBy");
CREATE INDEX "ai_generated_notes_createdAt_idx" ON "ai_generated_notes"("createdAt");
CREATE UNIQUE INDEX "ai_generated_notes_sessionId_key" ON "ai_generated_notes"("sessionId");

-- Telehealth Session indexes for AI features
CREATE INDEX "telehealth_sessions_aiNoteId_idx" ON "telehealth_sessions"("aiNoteId");
CREATE INDEX "telehealth_sessions_transcriptionStatus_idx" ON "telehealth_sessions"("transcriptionStatus");

-- Clinical Notes indexes for AI features
CREATE INDEX "clinical_notes_aiGeneratedNoteId_idx" ON "clinical_notes"("aiGeneratedNoteId");
CREATE INDEX "clinical_notes_aiGenerated_idx" ON "clinical_notes"("aiGenerated");

-- Audit Log indexes
CREATE INDEX "ai_generation_audit_log_aiNoteId_idx" ON "ai_generation_audit_log"("aiNoteId");
CREATE INDEX "ai_generation_audit_log_eventType_idx" ON "ai_generation_audit_log"("eventType");
CREATE INDEX "ai_generation_audit_log_timestamp_idx" ON "ai_generation_audit_log"("timestamp");

-- Prompt Templates indexes
CREATE INDEX "ai_prompt_templates_templateType_idx" ON "ai_prompt_templates"("templateType");
CREATE INDEX "ai_prompt_templates_isActive_idx" ON "ai_prompt_templates"("isActive");
CREATE UNIQUE INDEX "ai_prompt_templates_name_version_key" ON "ai_prompt_templates"("templateName", "version");

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE "ai_generated_notes" ADD CONSTRAINT "ai_generated_notes_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "telehealth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_notes" ADD CONSTRAINT "ai_generated_notes_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_notes" ADD CONSTRAINT "ai_generated_notes_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_notes" ADD CONSTRAINT "ai_generated_notes_clinicianId_fkey"
    FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generated_notes" ADD CONSTRAINT "ai_generated_notes_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_aiNoteId_fkey"
    FOREIGN KEY ("aiNoteId") REFERENCES "ai_generated_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_aiGeneratedNoteId_fkey"
    FOREIGN KEY ("aiGeneratedNoteId") REFERENCES "ai_generated_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_generation_audit_log" ADD CONSTRAINT "ai_generation_audit_log_aiNoteId_fkey"
    FOREIGN KEY ("aiNoteId") REFERENCES "ai_generated_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generation_audit_log" ADD CONSTRAINT "ai_generation_audit_log_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
