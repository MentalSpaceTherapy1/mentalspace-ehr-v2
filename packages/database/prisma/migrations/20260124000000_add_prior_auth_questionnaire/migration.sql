-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "SeverityLevel" AS ENUM ('NA', 'MILD', 'MODERATE', 'SEVERE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "TransportationOption" AS ENUM ('YES', 'NO', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: prior_authorizations (if not exists)
CREATE TABLE IF NOT EXISTS "prior_authorizations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "authorizationNumber" VARCHAR(100) NOT NULL,
    "authorizationType" TEXT NOT NULL,
    "cptCodes" TEXT[],
    "diagnosisCodes" TEXT[],
    "sessionsAuthorized" INTEGER NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsRemaining" INTEGER NOT NULL,
    "sessionUnit" TEXT NOT NULL DEFAULT 'SESSIONS',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "lastUsedDate" TIMESTAMP(3),
    "requestingProviderId" TEXT NOT NULL,
    "performingProviderId" TEXT,
    "status" TEXT NOT NULL,
    "denialReason" TEXT,
    "appealStatus" TEXT,
    "appealDate" TIMESTAMP(3),
    "appealNotes" TEXT,
    "documentationSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "clinicalJustification" TEXT,
    "supportingDocuments" TEXT[],
    "renewalRequested" BOOLEAN NOT NULL DEFAULT false,
    "renewalRequestDate" TIMESTAMP(3),
    "renewedFromId" TEXT,
    "renewedToId" TEXT,
    "warningsSent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "prior_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for prior_authorizations (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "prior_authorizations_authorizationNumber_key" ON "prior_authorizations"("authorizationNumber");
CREATE INDEX IF NOT EXISTS "prior_authorizations_clientId_idx" ON "prior_authorizations"("clientId");
CREATE INDEX IF NOT EXISTS "prior_authorizations_insuranceId_idx" ON "prior_authorizations"("insuranceId");
CREATE INDEX IF NOT EXISTS "prior_authorizations_status_idx" ON "prior_authorizations"("status");
CREATE INDEX IF NOT EXISTS "prior_authorizations_endDate_idx" ON "prior_authorizations"("endDate");
CREATE INDEX IF NOT EXISTS "prior_authorizations_sessionsRemaining_idx" ON "prior_authorizations"("sessionsRemaining");

-- AddForeignKeys for prior_authorizations (if not exists)
DO $$ BEGIN
    ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_insuranceId_fkey"
        FOREIGN KEY ("insuranceId") REFERENCES "insurance_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_requestingProviderId_fkey"
        FOREIGN KEY ("requestingProviderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_performingProviderId_fkey"
        FOREIGN KEY ("performingProviderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_renewedFromId_fkey"
        FOREIGN KEY ("renewedFromId") REFERENCES "prior_authorizations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable: prior_authorization_questionnaires
CREATE TABLE IF NOT EXISTS "prior_authorization_questionnaires" (
    "id" TEXT NOT NULL,
    "priorAuthorizationId" TEXT NOT NULL,

    -- Header Fields
    "clientName" TEXT NOT NULL,
    "clientDOB" TIMESTAMP(3) NOT NULL,
    "diagnosisDisplay" TEXT NOT NULL,
    "insuranceDisplay" VARCHAR(255) NOT NULL,

    -- ANXIETY DISORDERS (6 fields)
    "anxiety_obsessions_compulsions" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "anxiety_generalized" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "anxiety_panic_attacks" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "anxiety_phobias" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "anxiety_somatic_complaints" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "anxiety_ptsd_symptoms" "SeverityLevel" NOT NULL DEFAULT 'NA',

    -- MANIA (5 fields)
    "mania_insomnia" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "mania_grandiosity" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "mania_pressured_speech" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "mania_racing_thoughts" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "mania_poor_judgement" "SeverityLevel" NOT NULL DEFAULT 'NA',

    -- PSYCHOTIC DISORDERS (5 fields)
    "psychotic_delusions_paranoia" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "psychotic_selfcare_issues" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "psychotic_hallucinations" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "psychotic_disorganized_thought" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "psychotic_loose_associations" "SeverityLevel" NOT NULL DEFAULT 'NA',

    -- DEPRESSION (9 fields)
    "depression_impaired_concentration" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "depression_impaired_memory" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "depression_psychomotor_retardation" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "depression_sexual_issues" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "depression_appetite_disturbance" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "depression_irritability" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "depression_agitation" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "depression_sleep_disturbance" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "depression_hopelessness" "SeverityLevel" NOT NULL DEFAULT 'NA',

    -- SUBSTANCE ABUSE (7 dropdowns + 1 text)
    "substance_loss_of_control" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "substance_amnesic_episodes" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "substance_legal_problems" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "substance_alcohol_abuse" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "substance_opiate_abuse" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "substance_prescription_abuse" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "substance_polysubstance_abuse" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "substance_other_drugs" TEXT,

    -- PERSONALITY DISORDER (7 dropdowns + 1 text)
    "personality_oddness" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "personality_oppositional" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "personality_disregard_law" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "personality_self_injuries" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "personality_entitlement" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "personality_passive_aggressive" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "personality_dependency" "SeverityLevel" NOT NULL DEFAULT 'NA',
    "personality_enduring_traits" TEXT,

    -- NARRATIVE SECTIONS (12 fields)
    "narrative_risk_of_harm" TEXT NOT NULL,
    "narrative_functional_status" TEXT NOT NULL,
    "narrative_comorbidities" TEXT NOT NULL,
    "narrative_environmental_stressors" TEXT NOT NULL,
    "narrative_natural_support" TEXT NOT NULL,
    "narrative_treatment_response" TEXT NOT NULL,
    "narrative_level_of_care" TEXT NOT NULL,
    "transportation_available" "TransportationOption" NOT NULL DEFAULT 'YES',
    "transportation_notes" TEXT,
    "narrative_history" TEXT NOT NULL,
    "narrative_presenting_problems" TEXT NOT NULL,
    "narrative_other_clinical_info" TEXT,
    "narrative_current_medications" TEXT NOT NULL,

    -- AI GENERATION TRACKING
    "aiGeneratedAt" TIMESTAMP(3),
    "aiGeneratedBy" TEXT,
    "aiDataSourcesSummary" JSONB,
    "aiConfidenceScores" JSONB,

    -- METADATA
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT NOT NULL,

    CONSTRAINT "prior_authorization_questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for questionnaires
CREATE UNIQUE INDEX IF NOT EXISTS "prior_authorization_questionnaires_priorAuthorizationId_key" ON "prior_authorization_questionnaires"("priorAuthorizationId");
CREATE INDEX IF NOT EXISTS "prior_authorization_questionnaires_priorAuthorizationId_idx" ON "prior_authorization_questionnaires"("priorAuthorizationId");

-- AddForeignKeys for questionnaires
DO $$ BEGIN
    ALTER TABLE "prior_authorization_questionnaires" ADD CONSTRAINT "prior_authorization_questionnaires_priorAuthorizationId_fkey"
        FOREIGN KEY ("priorAuthorizationId") REFERENCES "prior_authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "prior_authorization_questionnaires" ADD CONSTRAINT "prior_authorization_questionnaires_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "prior_authorization_questionnaires" ADD CONSTRAINT "prior_authorization_questionnaires_lastModifiedBy_fkey"
        FOREIGN KEY ("lastModifiedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
