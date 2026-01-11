-- Phase 2: Emergency System Enhancements for Telehealth
-- Module 6 - Telehealth Phase 2
-- Date: 2025-01-07

-- ============================================================================
-- 1. Add Location Tracking Fields to TelehealthSession (idempotent)
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'clientLocationPermission') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "clientLocationPermission" BOOLEAN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'clientLocationCaptured') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "clientLocationCaptured" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'clientLatitude') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "clientLatitude" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'clientLongitude') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "clientLongitude" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'clientAddress') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "clientAddress" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'clientCity') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "clientCity" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'clientState') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "clientState" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'clientZipCode') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "clientZipCode" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'locationCapturedAt') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "locationCapturedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'locationCaptureMethod') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "locationCaptureMethod" TEXT;
  END IF;
END $$;

-- ============================================================================
-- 2. Add Enhanced Emergency Tracking Fields to TelehealthSession (idempotent)
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencyType') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyType" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencySeverity') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencySeverity" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergency911Called') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergency911Called" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergency911CalledAt') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergency911CalledAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergency911CalledBy') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergency911CalledBy" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencySupervisorNotified') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencySupervisorNotified" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencySupervisorId') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencySupervisorId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencySupervisorNotifiedAt') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencySupervisorNotifiedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencyProtocolFollowed') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyProtocolFollowed" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'telehealth_sessions' AND column_name = 'emergencyResourcesSentToClient') THEN
    ALTER TABLE "telehealth_sessions" ADD COLUMN "emergencyResourcesSentToClient" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN "telehealth_sessions"."emergencyType" IS 'Type of emergency: SUICIDAL, SELF_HARM, VIOLENCE_RISK, MEDICAL, OTHER';
COMMENT ON COLUMN "telehealth_sessions"."emergencySeverity" IS 'Severity level: LOW, MODERATE, HIGH, CRITICAL';
COMMENT ON COLUMN "telehealth_sessions"."locationCaptureMethod" IS 'Method used to capture location: BROWSER, IP, MANUAL';

-- ============================================================================
-- 3. Create Crisis Resources Table (idempotent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "crisis_resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "textNumber" TEXT,
    "website" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "geographicScope" TEXT NOT NULL,
    "stateSpecific" TEXT,
    "citySpecific" TEXT,
    "language" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT
);

-- Create indexes for efficient querying (idempotent)
CREATE INDEX IF NOT EXISTS "crisis_resources_category_idx" ON "crisis_resources"("category");
CREATE INDEX IF NOT EXISTS "crisis_resources_geographic_idx" ON "crisis_resources"("geographicScope", "stateSpecific");
CREATE INDEX IF NOT EXISTS "crisis_resources_active_idx" ON "crisis_resources"("isActive");

-- Add comments
COMMENT ON TABLE "crisis_resources" IS 'Comprehensive database of crisis hotlines and resources for emergency situations';
COMMENT ON COLUMN "crisis_resources"."category" IS 'Category: SUICIDE, SUBSTANCE_ABUSE, DOMESTIC_VIOLENCE, LGBTQ, VETERANS, YOUTH, etc.';
COMMENT ON COLUMN "crisis_resources"."availability" IS 'Availability: 24/7, BUSINESS_HOURS, etc.';
COMMENT ON COLUMN "crisis_resources"."serviceType" IS 'Service Type: HOTLINE, TEXT, CHAT, IN_PERSON, etc.';
COMMENT ON COLUMN "crisis_resources"."geographicScope" IS 'Geographic Scope: NATIONAL, STATE, LOCAL';

-- ============================================================================
-- 4. Create Emergency Protocols Table (idempotent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "emergency_protocols" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "triggerConditions" TEXT[],
    "steps" JSONB NOT NULL,
    "requiredActions" JSONB NOT NULL,
    "documentationReqs" JSONB NOT NULL,
    "notificationRules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT
);

-- Create index for active protocols (idempotent)
CREATE INDEX IF NOT EXISTS "emergency_protocols_active_idx" ON "emergency_protocols"("isActive");

-- Add comments
COMMENT ON TABLE "emergency_protocols" IS 'Standardized emergency response protocols for various crisis situations';
COMMENT ON COLUMN "emergency_protocols"."triggerConditions" IS 'Array of conditions that trigger this protocol (e.g., suicidal_ideation_with_plan)';
COMMENT ON COLUMN "emergency_protocols"."steps" IS 'JSON array of step-by-step guidance for clinicians';
COMMENT ON COLUMN "emergency_protocols"."requiredActions" IS 'JSON array of checklist items that must be completed';
COMMENT ON COLUMN "emergency_protocols"."documentationReqs" IS 'JSON object with required documentation fields and templates';
COMMENT ON COLUMN "emergency_protocols"."notificationRules" IS 'JSON object defining who to notify and when (supervisor, emergency contact, etc.)';

-- ============================================================================
-- 5. Data Retention Policy for Location Data
-- ============================================================================

-- Create function to automatically delete location data after 30 days if no emergency
CREATE OR REPLACE FUNCTION cleanup_location_data()
RETURNS void AS $$
BEGIN
    UPDATE "telehealth_sessions"
    SET
        "clientLatitude" = NULL,
        "clientLongitude" = NULL,
        "clientAddress" = NULL,
        "clientCity" = NULL,
        "clientState" = NULL,
        "clientZipCode" = NULL,
        "locationCapturedAt" = NULL,
        "locationCaptureMethod" = NULL,
        "clientLocationCaptured" = false
    WHERE
        "clientLocationCaptured" = true
        AND "emergencyActivated" = false
        AND "locationCapturedAt" < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job comment (actual scheduling would be done via pg_cron or application-level job)
COMMENT ON FUNCTION cleanup_location_data IS 'Automatically deletes location data older than 30 days if no emergency occurred (HIPAA compliance)';

-- ============================================================================
-- 6. Audit Log Enhancement
-- ============================================================================

-- Add audit trigger for crisis resources
CREATE OR REPLACE FUNCTION audit_crisis_resources()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW."updatedAt" = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crisis_resources_audit ON "crisis_resources";
CREATE TRIGGER crisis_resources_audit
    BEFORE UPDATE ON "crisis_resources"
    FOR EACH ROW
    EXECUTE FUNCTION audit_crisis_resources();

-- Add audit trigger for emergency protocols (idempotent)
DROP TRIGGER IF EXISTS emergency_protocols_audit ON "emergency_protocols";
CREATE TRIGGER emergency_protocols_audit
    BEFORE UPDATE ON "emergency_protocols"
    FOR EACH ROW
    EXECUTE FUNCTION audit_crisis_resources();

-- ============================================================================
-- 7. Grant Permissions (adjust based on your database roles)
-- ============================================================================

-- GRANT SELECT ON "crisis_resources" TO app_readonly;
-- GRANT ALL ON "crisis_resources" TO app_readwrite;
-- GRANT SELECT ON "emergency_protocols" TO app_readonly;
-- GRANT ALL ON "emergency_protocols" TO app_readwrite;
