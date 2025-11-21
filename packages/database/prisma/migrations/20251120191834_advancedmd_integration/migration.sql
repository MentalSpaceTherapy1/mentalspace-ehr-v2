-- AdvancedMD Integration Migration
-- This migration adds AdvancedMD integration tables and fields to existing tables
-- All changes are additive (new tables + new nullable fields)

-- Add AdvancedMD fields to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "advancedMDPatientId" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "lastSyncedToAMD" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "amdSyncStatus" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "amdSyncError" TEXT;

-- Add unique constraint on advancedMDPatientId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clients_advancedMDPatientId_key'
    ) THEN
        CREATE UNIQUE INDEX "clients_advancedMDPatientId_key" ON "clients"("advancedMDPatientId");
    END IF;
END $$;

-- Add AdvancedMD fields to insurance_information table
ALTER TABLE "insurance_information" ADD COLUMN IF NOT EXISTS "advancedMDPayerId" TEXT;
ALTER TABLE "insurance_information" ADD COLUMN IF NOT EXISTS "advancedMDPayerName" TEXT;
ALTER TABLE "insurance_information" ADD COLUMN IF NOT EXISTS "lastEligibilityCheck" TIMESTAMP(3);

-- Add AdvancedMD fields to charge_entries table
ALTER TABLE "charge_entries" ADD COLUMN IF NOT EXISTS "advancedMDChargeId" TEXT;
ALTER TABLE "charge_entries" ADD COLUMN IF NOT EXISTS "advancedMDVisitId" TEXT;
ALTER TABLE "charge_entries" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT DEFAULT 'pending';
ALTER TABLE "charge_entries" ADD COLUMN IF NOT EXISTS "syncError" TEXT;
ALTER TABLE "charge_entries" ADD COLUMN IF NOT EXISTS "lastSyncAttempt" TIMESTAMP(3);

-- Create EligibilityCheck table
CREATE TABLE IF NOT EXISTS "eligibility_checks" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceType" TEXT,
    "providerId" TEXT,
    "responseData" JSONB NOT NULL,
    "coverageActive" BOOLEAN,
    "eligibleForService" BOOLEAN,
    "copay" DECIMAL(10,2),
    "coinsurance" INTEGER,
    "deductible" DECIMAL(10,2),
    "deductibleMet" DECIMAL(10,2),
    "outOfPocketMax" DECIMAL(10,2),
    "outOfPocketMet" DECIMAL(10,2),
    "planName" TEXT,
    "planType" TEXT,
    "coverageLevel" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "authNumber" TEXT,
    "serviceLimit" INTEGER,
    "serviceUsed" INTEGER,
    "serviceRemaining" INTEGER,
    "cachedUntil" TIMESTAMP(3) NOT NULL,
    "checkStatus" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_checks_pkey" PRIMARY KEY ("id")
);

-- Create Claims table
CREATE TABLE IF NOT EXISTS "claims" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "claimType" TEXT NOT NULL DEFAULT 'Professional',
    "billingProvider" TEXT NOT NULL,
    "renderingProvider" TEXT,
    "supervisingProvider" TEXT,
    "serviceStartDate" TIMESTAMP(3) NOT NULL,
    "serviceEndDate" TIMESTAMP(3) NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "claimStatus" TEXT NOT NULL DEFAULT 'draft',
    "statusDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusUpdatedBy" TEXT,
    "totalChargeAmount" DECIMAL(10,2) NOT NULL,
    "totalAllowedAmount" DECIMAL(10,2),
    "totalPaidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAdjustmentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPatientResponsibility" DECIMAL(10,2),
    "advancedMDClaimId" TEXT,
    "advancedMDVisitId" TEXT,
    "clearinghouseId" TEXT,
    "clearinghouseName" TEXT,
    "clearinghouseStatus" TEXT,
    "clearinghouseResponse" JSONB,
    "rejectionReason" TEXT,
    "rejectionCode" TEXT,
    "denialReason" TEXT,
    "denialCode" TEXT,
    "isResubmission" BOOLEAN NOT NULL DEFAULT false,
    "originalClaimId" TEXT,
    "resubmissionReason" TEXT,
    "resubmissionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- Create ClaimCharge table
CREATE TABLE IF NOT EXISTS "claim_charges" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "cptCode" TEXT NOT NULL,
    "modifiers" TEXT[],
    "units" INTEGER NOT NULL,
    "chargeAmount" DECIMAL(10,2) NOT NULL,
    "diagnosisCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_charges_pkey" PRIMARY KEY ("id")
);

-- Create ClaimPayment table
CREATE TABLE IF NOT EXISTS "claim_payments" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentAmount" DECIMAL(10,2) NOT NULL,
    "checkNumber" TEXT,
    "payerClaimNumber" TEXT,
    "paidAmount" DECIMAL(10,2) NOT NULL,
    "adjustmentAmount" DECIMAL(10,2) NOT NULL,
    "patientResponsibility" DECIMAL(10,2),
    "adjustmentCodes" JSONB,
    "remarkCodes" JSONB,
    "paymentSource" TEXT NOT NULL,
    "eraRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "claim_payments_pkey" PRIMARY KEY ("id")
);

-- Create ERARecord table
CREATE TABLE IF NOT EXISTS "era_records" (
    "id" TEXT NOT NULL,
    "claimId" TEXT,
    "transactionType" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerId" TEXT,
    "payerClaimNumber" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "checkEFTNumber" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "totalPaidAmount" DECIMAL(10,2) NOT NULL,
    "eraFileName" TEXT,
    "eraFileS3Key" TEXT,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawEDI" TEXT NOT NULL,
    "parsedData" JSONB NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "processingError" TEXT,
    "processedDate" TIMESTAMP(3),
    "processedBy" TEXT,
    "autoPosted" BOOLEAN NOT NULL DEFAULT false,
    "autoPostingRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "era_records_pkey" PRIMARY KEY ("id")
);

-- Create AdvancedMDSyncLog table
CREATE TABLE IF NOT EXISTS "advancedmd_sync_logs" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "syncDirection" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL,
    "requestData" JSONB,
    "responseData" JSONB,
    "errorMessage" TEXT,
    "advancedMDId" TEXT,
    "syncStarted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncCompleted" TIMESTAMP(3),
    "durationMs" INTEGER,
    "triggeredBy" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advancedmd_sync_logs_pkey" PRIMARY KEY ("id")
);

-- Create AdvancedMDConfig table
CREATE TABLE IF NOT EXISTS "advancedmd_config" (
    "id" TEXT NOT NULL,
    "officeKey" TEXT NOT NULL,
    "officeName" TEXT,
    "partnerUsername" TEXT NOT NULL,
    "partnerPassword" TEXT NOT NULL,
    "appUsername" TEXT NOT NULL,
    "appPassword" TEXT NOT NULL,
    "partnerLoginURL" TEXT NOT NULL DEFAULT 'https://partnerlogin.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx',
    "redirectURLXMLRPC" TEXT,
    "redirectURLRESTPM" TEXT,
    "redirectURLRESTEHR" TEXT,
    "redirectURLScheduler" TEXT,
    "currentToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenRefreshedAt" TIMESTAMP(3),
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoSyncPatients" BOOLEAN NOT NULL DEFAULT false,
    "autoSyncVisits" BOOLEAN NOT NULL DEFAULT false,
    "autoSyncClaims" BOOLEAN NOT NULL DEFAULT false,
    "pollingIntervalClaims" INTEGER NOT NULL DEFAULT 30,
    "pollingIntervalVisits" INTEGER NOT NULL DEFAULT 15,
    "pollingIntervalPatients" INTEGER NOT NULL DEFAULT 60,
    "enableEligibilityCheck" BOOLEAN NOT NULL DEFAULT true,
    "enableClaimSubmission" BOOLEAN NOT NULL DEFAULT true,
    "enablePaymentSync" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "advancedmd_config_pkey" PRIMARY KEY ("id")
);

-- Create AdvancedMDRateLimitState table
CREATE TABLE IF NOT EXISTS "advancedmd_rate_limit_state" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "callsThisMinute" INTEGER NOT NULL DEFAULT 0,
    "callsThisHour" INTEGER NOT NULL DEFAULT 0,
    "currentMinuteStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentHourStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPeakHours" BOOLEAN NOT NULL DEFAULT false,
    "peakHoursStart" TEXT NOT NULL DEFAULT '06:00',
    "peakHoursEnd" TEXT NOT NULL DEFAULT '18:00',
    "limitPeak" INTEGER NOT NULL,
    "limitOffPeak" INTEGER NOT NULL,
    "isBackingOff" BOOLEAN NOT NULL DEFAULT false,
    "backoffUntil" TIMESTAMP(3),
    "backoffRetryCount" INTEGER NOT NULL DEFAULT 0,
    "lastCallAt" TIMESTAMP(3),
    "lastCallSuccess" BOOLEAN NOT NULL DEFAULT true,
    "lastCallError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advancedmd_rate_limit_state_pkey" PRIMARY KEY ("id")
);

-- Create PaymentClaimMapping table
CREATE TABLE IF NOT EXISTS "payment_claim_mappings" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paymentAmount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentSource" TEXT NOT NULL,
    "checkNumber" TEXT,
    "claimId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "matchScore" INTEGER,
    "matchMethod" TEXT NOT NULL,
    "matchReason" TEXT,
    "splitPaymentGroup" TEXT,
    "allocatedAmount" DECIMAL(10,2) NOT NULL,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "reconciledBy" TEXT,
    "reconciliationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_claim_mappings_pkey" PRIMARY KEY ("id")
);

-- Create ClaimValidationRule table
CREATE TABLE IF NOT EXISTS "claim_validation_rules" (
    "id" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "severity" TEXT NOT NULL DEFAULT 'error',
    "cptCode" TEXT,
    "cptCodePattern" TEXT,
    "allowedModifiers" TEXT[],
    "requiredModifiers" TEXT[],
    "maxUnits" INTEGER,
    "minUnits" INTEGER,
    "requiredICDPrefix" TEXT,
    "allowedICDPatterns" TEXT[],
    "minDiagnosisCodes" INTEGER,
    "maxDiagnosisCodes" INTEGER,
    "requiresICDMatch" BOOLEAN NOT NULL DEFAULT false,
    "icdMatchPattern" TEXT,
    "payerId" TEXT,
    "payerName" TEXT,
    "payerCategory" TEXT,
    "placeOfService" TEXT[],
    "requiresPriorAuth" BOOLEAN NOT NULL DEFAULT false,
    "timelyFilingDays" INTEGER,
    "maxFutureDays" INTEGER,
    "maxChargeAmount" DECIMAL(10,2),
    "minChargeAmount" DECIMAL(10,2),
    "customValidationJS" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminationDate" TIMESTAMP(3),
    "allowOverride" BOOLEAN NOT NULL DEFAULT true,
    "overrideRequiresRole" TEXT[],
    "timesTriggered" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastModifiedBy" TEXT,

    CONSTRAINT "claim_validation_rules_pkey" PRIMARY KEY ("id")
);

-- Create CPTCode table
CREATE TABLE IF NOT EXISTS "cpt_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "advancedMDProcId" TEXT,
    "defaultFee" DECIMAL(10,2),
    "rvu" DECIMAL(6,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "billableUnits" BOOLEAN NOT NULL DEFAULT true,
    "maxUnits" INTEGER,
    "minUnits" INTEGER NOT NULL DEFAULT 1,
    "allowedModifiers" TEXT[],
    "typicalModifiers" TEXT[],
    "requiresDiagnosis" BOOLEAN NOT NULL DEFAULT true,
    "requiresPlace" BOOLEAN NOT NULL DEFAULT false,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "telehealthEligible" BOOLEAN NOT NULL DEFAULT false,
    "telehealthModifier" TEXT,
    "medicareApproved" BOOLEAN NOT NULL DEFAULT false,
    "medicaidApproved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "feeSchedules" JSONB,
    "lastSyncedFromAMD" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpt_codes_pkey" PRIMARY KEY ("id")
);

-- Create ICDCode table
CREATE TABLE IF NOT EXISTS "icd_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "codeType" TEXT NOT NULL DEFAULT 'diagnosis',
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "severity" TEXT,
    "acuity" TEXT,
    "medicareApproved" BOOLEAN NOT NULL DEFAULT false,
    "medicaidApproved" BOOLEAN NOT NULL DEFAULT false,
    "isCommonlyUsed" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "relatedCodes" TEXT[],
    "excludesCodes" TEXT[],
    "notes" TEXT,
    "clinicalGuidelines" TEXT,
    "lastSyncedFromAMD" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icd_codes_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claims_claimNumber_key') THEN
        CREATE UNIQUE INDEX "claims_claimNumber_key" ON "claims"("claimNumber");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'advancedmd_config_officeKey_key') THEN
        CREATE UNIQUE INDEX "advancedmd_config_officeKey_key" ON "advancedmd_config"("officeKey");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'advancedmd_rate_limit_state_tier_endpoint_key') THEN
        CREATE UNIQUE INDEX "advancedmd_rate_limit_state_tier_endpoint_key" ON "advancedmd_rate_limit_state"("tier", "endpoint");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_validation_rules_ruleName_key') THEN
        CREATE UNIQUE INDEX "claim_validation_rules_ruleName_key" ON "claim_validation_rules"("ruleName");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cpt_codes_code_key') THEN
        CREATE UNIQUE INDEX "cpt_codes_code_key" ON "cpt_codes"("code");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'icd_codes_code_key') THEN
        CREATE UNIQUE INDEX "icd_codes_code_key" ON "icd_codes"("code");
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "eligibility_checks_clientId_checkDate_idx" ON "eligibility_checks"("clientId", "checkDate");
CREATE INDEX IF NOT EXISTS "eligibility_checks_cachedUntil_idx" ON "eligibility_checks"("cachedUntil");
CREATE INDEX IF NOT EXISTS "claims_clientId_claimStatus_idx" ON "claims"("clientId", "claimStatus");
CREATE INDEX IF NOT EXISTS "claims_claimStatus_submissionDate_idx" ON "claims"("claimStatus", "submissionDate");
CREATE INDEX IF NOT EXISTS "claims_advancedMDClaimId_idx" ON "claims"("advancedMDClaimId");
CREATE INDEX IF NOT EXISTS "claim_charges_claimId_idx" ON "claim_charges"("claimId");
CREATE INDEX IF NOT EXISTS "claim_payments_claimId_paymentDate_idx" ON "claim_payments"("claimId", "paymentDate");
CREATE INDEX IF NOT EXISTS "era_records_payerId_paymentDate_idx" ON "era_records"("payerId", "paymentDate");
CREATE INDEX IF NOT EXISTS "era_records_processingStatus_idx" ON "era_records"("processingStatus");
CREATE INDEX IF NOT EXISTS "era_records_eraFileName_idx" ON "era_records"("eraFileName");
CREATE INDEX IF NOT EXISTS "advancedmd_sync_logs_entityType_entityId_idx" ON "advancedmd_sync_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "advancedmd_sync_logs_syncStatus_syncStarted_idx" ON "advancedmd_sync_logs"("syncStatus", "syncStarted");
CREATE INDEX IF NOT EXISTS "advancedmd_sync_logs_advancedMDId_idx" ON "advancedmd_sync_logs"("advancedMDId");
CREATE INDEX IF NOT EXISTS "advancedmd_rate_limit_state_isPeakHours_currentMinuteStar_idx" ON "advancedmd_rate_limit_state"("isPeakHours", "currentMinuteStart");
CREATE INDEX IF NOT EXISTS "payment_claim_mappings_claimId_isReconciled_idx" ON "payment_claim_mappings"("claimId", "isReconciled");
CREATE INDEX IF NOT EXISTS "payment_claim_mappings_paymentId_isReconciled_idx" ON "payment_claim_mappings"("paymentId", "isReconciled");
CREATE INDEX IF NOT EXISTS "payment_claim_mappings_splitPaymentGroup_idx" ON "payment_claim_mappings"("splitPaymentGroup");
CREATE INDEX IF NOT EXISTS "claim_validation_rules_ruleType_isActive_idx" ON "claim_validation_rules"("ruleType", "isActive");
CREATE INDEX IF NOT EXISTS "claim_validation_rules_cptCode_isActive_idx" ON "claim_validation_rules"("cptCode", "isActive");
CREATE INDEX IF NOT EXISTS "claim_validation_rules_payerId_isActive_idx" ON "claim_validation_rules"("payerId", "isActive");
CREATE INDEX IF NOT EXISTS "claim_validation_rules_effectiveDate_terminationDate_idx" ON "claim_validation_rules"("effectiveDate", "terminationDate");
CREATE INDEX IF NOT EXISTS "cpt_codes_code_isActive_idx" ON "cpt_codes"("code", "isActive");
CREATE INDEX IF NOT EXISTS "cpt_codes_category_isActive_idx" ON "cpt_codes"("category", "isActive");
CREATE INDEX IF NOT EXISTS "cpt_codes_advancedMDProcId_idx" ON "cpt_codes"("advancedMDProcId");
CREATE INDEX IF NOT EXISTS "icd_codes_code_isActive_idx" ON "icd_codes"("code", "isActive");
CREATE INDEX IF NOT EXISTS "icd_codes_category_isActive_idx" ON "icd_codes"("category", "isActive");
CREATE INDEX IF NOT EXISTS "icd_codes_isBillable_isActive_idx" ON "icd_codes"("isBillable", "isActive");

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eligibility_checks_clientId_fkey') THEN
        ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claims_clientId_fkey') THEN
        ALTER TABLE "claims" ADD CONSTRAINT "claims_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_charges_claimId_fkey') THEN
        ALTER TABLE "claim_charges" ADD CONSTRAINT "claim_charges_claimId_fkey"
            FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_payments_claimId_fkey') THEN
        ALTER TABLE "claim_payments" ADD CONSTRAINT "claim_payments_claimId_fkey"
            FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'era_records_claimId_fkey') THEN
        ALTER TABLE "era_records" ADD CONSTRAINT "era_records_claimId_fkey"
            FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_claim_mappings_claimId_fkey') THEN
        ALTER TABLE "payment_claim_mappings" ADD CONSTRAINT "payment_claim_mappings_claimId_fkey"
            FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
