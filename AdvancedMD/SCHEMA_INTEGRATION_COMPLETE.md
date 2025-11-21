# AdvancedMD Schema Integration - Complete

**Date:** 2025-11-20
**Status:** ✅ Schema Integration Complete | ⚠️ Database Migration Pending

---

## ✅ Completed Tasks

### 1. Schema Integration into main schema.prisma

All AdvancedMD schema additions have been successfully integrated into the main Prisma schema file:

**File:** `packages/database/prisma/schema.prisma`

#### Fields Added to Existing Models:

**Client Model** (Lines 650-654):
```prisma
// AdvancedMD Integration Fields
advancedMDPatientId String?   @unique
lastSyncedToAMD     DateTime?
amdSyncStatus       String?   // 'pending', 'synced', 'error'
amdSyncError        String?
```

**Client Model Relations** (Lines 740-742):
```prisma
// AdvancedMD Integration Relations
eligibilityChecks EligibilityCheck[] @relation("ClientEligibilityCheck")
claims            Claim[]            @relation("ClientClaim")
```

**InsuranceInformation Model** (Lines 862-865):
```prisma
// AdvancedMD Integration Fields
advancedMDPayerId    String?
advancedMDPayerName  String?
lastEligibilityCheck DateTime?
```

**ChargeEntry Model** (Lines 2230-2235):
```prisma
// AdvancedMD Integration Fields
advancedMDChargeId String?
advancedMDVisitId  String?
syncStatus         String    @default("pending") // 'pending', 'synced', 'error'
syncError          String?
lastSyncAttempt    DateTime?
```

#### New Models Added (Lines 5476-6073):

1. **EligibilityCheck** - Insurance eligibility verification results
2. **Claim** - Claims management with full lifecycle tracking
3. **ClaimCharge** - Claim charge line items
4. **ClaimPayment** - Payment tracking from ERA/EOB
5. **ERARecord** - Electronic Remittance Advice (835 EDI) records
6. **AdvancedMDSyncLog** - Sync operation logging
7. **AdvancedMDConfig** - Configuration and credentials (encrypted)
8. **AdvancedMDRateLimitState** - Rate limiting state tracking
9. **PaymentClaimMapping** - Manual payment reconciliation
10. **ClaimValidationRule** - In-house claim validation rules
11. **CPTCode** - CPT code management
12. **ICDCode** - ICD-10 code management

**Total:** 12 new models + fields in 3 existing models

### 2. Prisma Client Generation

✅ **Prisma Client successfully generated** with all new models and types.

**Command Run:**
```bash
cd packages/database
npm run generate
```

**Output:**
```
✔ Generated Prisma Client (v5.22.0) to .\..\..\node_modules\@prisma\client in 2.21s
```

The Prisma client now includes all AdvancedMD models and can be used in the integration services.

---

## ⚠️ Database Migration Status

### Migration Attempt

**Attempted Command:**
```bash
npm run migrate:dev -- --name advancedmd_integration
```

**Result:** ⚠️ Migration blocked due to potential data loss from previous schema changes

### Issues Identified

The database migration detected potential data loss from **unrelated schema changes** (not from AdvancedMD integration):

1. **Column Drops with Data:**
   - `clinical_notes.revisionHistory` - would be dropped and recreated
   - `telehealth_sessions.clientLocationCaptured` - contains 4 non-null values
   - `telehealth_sessions.emergency911Called` - contains 4 non-null values
   - `telehealth_sessions.emergencyActivated` - contains 4 non-null values
   - `telehealth_sessions.emergencyContactNotified` - contains 4 non-null values
   - `telehealth_sessions.emergencyResourcesSentToClient` - contains 4 non-null values
   - `telehealth_sessions.emergencySupervisorNotified` - contains 4 non-null values
   - `users.credentials` - contains 7 non-null values

2. **Unique Constraints to Add:**
   - `appointment_types[typeName]`
   - `client_relationships[client1Id, client2Id, relationshipType]`
   - `clients[advancedMDPatientId]` ⭐ **(AdvancedMD)**
   - `clinical_notes[appointmentId, noteType]`
   - `crisis_detection_logs[messageId]`
   - `incidents[incidentNumber]`
   - `policies[policyNumber]`
   - `policy_acknowledgments[policyId, userId]`
   - `prior_authorizations[authorizationNumber]`
   - `provider_client_compatibility[providerId, clientId]`
   - `pto_balances[userId]`
   - `purchase_orders[poNumber]`
   - `reminder_configurations[practiceSettingsId]`
   - `session_ratings[sessionId]`
   - `time_attendance[userId, date]`
   - `users[employeeId]`

### Analysis

- **AdvancedMD Integration:** All AdvancedMD changes are **additive only** (new tables + new nullable fields)
- **Other Changes:** The migration warnings are from **previous schema modifications** that haven't been applied yet
- **Impact:** AdvancedMD integration won't cause data loss, but other pending changes might

---

## 🔄 Next Steps for Database Migration

### Option 1: Manual Database Migration (Recommended for Production)

Since the development database contains production data, manually apply AdvancedMD changes only:

#### Step 1: Create AdvancedMD Tables Only

Connect to the database and run the following SQL (generated from Prisma schema):

```sql
-- Create AdvancedMD tables only
CREATE TABLE "eligibility_checks" (
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

CREATE TABLE "claims" (
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

CREATE TABLE "claim_charges" (
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

CREATE TABLE "claim_payments" (
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

CREATE TABLE "era_records" (
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

CREATE TABLE "advancedmd_sync_logs" (
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

CREATE TABLE "advancedmd_config" (
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

CREATE TABLE "advancedmd_rate_limit_state" (
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

CREATE TABLE "payment_claim_mappings" (
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

CREATE TABLE "claim_validation_rules" (
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

CREATE TABLE "cpt_codes" (
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

CREATE TABLE "icd_codes" (
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

-- Add unique constraints
CREATE UNIQUE INDEX "claims_claimNumber_key" ON "claims"("claimNumber");
CREATE UNIQUE INDEX "advancedmd_config_officeKey_key" ON "advancedmd_config"("officeKey");
CREATE UNIQUE INDEX "advancedmd_rate_limit_state_tier_endpoint_key" ON "advancedmd_rate_limit_state"("tier", "endpoint");
CREATE UNIQUE INDEX "claim_validation_rules_ruleName_key" ON "claim_validation_rules"("ruleName");
CREATE UNIQUE INDEX "cpt_codes_code_key" ON "cpt_codes"("code");
CREATE UNIQUE INDEX "icd_codes_code_key" ON "icd_codes"("code");

-- Add indexes
CREATE INDEX "eligibility_checks_clientId_checkDate_idx" ON "eligibility_checks"("clientId", "checkDate");
CREATE INDEX "eligibility_checks_cachedUntil_idx" ON "eligibility_checks"("cachedUntil");
CREATE INDEX "claims_clientId_claimStatus_idx" ON "claims"("clientId", "claimStatus");
CREATE INDEX "claims_claimStatus_submissionDate_idx" ON "claims"("claimStatus", "submissionDate");
CREATE INDEX "claims_advancedMDClaimId_idx" ON "claims"("advancedMDClaimId");
CREATE INDEX "claim_charges_claimId_idx" ON "claim_charges"("claimId");
CREATE INDEX "claim_payments_claimId_paymentDate_idx" ON "claim_payments"("claimId", "paymentDate");
CREATE INDEX "era_records_payerId_paymentDate_idx" ON "era_records"("payerId", "paymentDate");
CREATE INDEX "era_records_processingStatus_idx" ON "era_records"("processingStatus");
CREATE INDEX "era_records_eraFileName_idx" ON "era_records"("eraFileName");
CREATE INDEX "advancedmd_sync_logs_entityType_entityId_idx" ON "advancedmd_sync_logs"("entityType", "entityId");
CREATE INDEX "advancedmd_sync_logs_syncStatus_syncStarted_idx" ON "advancedmd_sync_logs"("syncStatus", "syncStarted");
CREATE INDEX "advancedmd_sync_logs_advancedMDId_idx" ON "advancedmd_sync_logs"("advancedMDId");
CREATE INDEX "advancedmd_rate_limit_state_isPeakHours_currentMinuteStar_idx" ON "advancedmd_rate_limit_state"("isPeakHours", "currentMinuteStart");
CREATE INDEX "payment_claim_mappings_claimId_isReconciled_idx" ON "payment_claim_mappings"("claimId", "isReconciled");
CREATE INDEX "payment_claim_mappings_paymentId_isReconciled_idx" ON "payment_claim_mappings"("paymentId", "isReconciled");
CREATE INDEX "payment_claim_mappings_splitPaymentGroup_idx" ON "payment_claim_mappings"("splitPaymentGroup");
CREATE INDEX "claim_validation_rules_ruleType_isActive_idx" ON "claim_validation_rules"("ruleType", "isActive");
CREATE INDEX "claim_validation_rules_cptCode_isActive_idx" ON "claim_validation_rules"("cptCode", "isActive");
CREATE INDEX "claim_validation_rules_payerId_isActive_idx" ON "claim_validation_rules"("payerId", "isActive");
CREATE INDEX "claim_validation_rules_effectiveDate_terminationDate_idx" ON "claim_validation_rules"("effectiveDate", "terminationDate");
CREATE INDEX "cpt_codes_code_isActive_idx" ON "cpt_codes"("code", "isActive");
CREATE INDEX "cpt_codes_category_isActive_idx" ON "cpt_codes"("category", "isActive");
CREATE INDEX "cpt_codes_advancedMDProcId_idx" ON "cpt_codes"("advancedMDProcId");
CREATE INDEX "icd_codes_code_isActive_idx" ON "icd_codes"("code", "isActive");
CREATE INDEX "icd_codes_category_isActive_idx" ON "icd_codes"("category", "isActive");
CREATE INDEX "icd_codes_isBillable_isActive_idx" ON "icd_codes"("isBillable", "isActive");

-- Add foreign key constraints
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "claim_charges" ADD CONSTRAINT "claim_charges_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_payments" ADD CONSTRAINT "claim_payments_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "era_records" ADD CONSTRAINT "era_records_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_claim_mappings" ADD CONSTRAINT "payment_claim_mappings_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### Step 2: Add Fields to Existing Tables

```sql
-- Add AdvancedMD fields to clients table
ALTER TABLE "clients" ADD COLUMN "advancedMDPatientId" TEXT;
ALTER TABLE "clients" ADD COLUMN "lastSyncedToAMD" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "amdSyncStatus" TEXT;
ALTER TABLE "clients" ADD COLUMN "amdSyncError" TEXT;

-- Add unique constraint
CREATE UNIQUE INDEX "clients_advancedMDPatientId_key" ON "clients"("advancedMDPatientId");

-- Add AdvancedMD fields to insurance_information table
ALTER TABLE "insurance_information" ADD COLUMN "advancedMDPayerId" TEXT;
ALTER TABLE "insurance_information" ADD COLUMN "advancedMDPayerName" TEXT;
ALTER TABLE "insurance_information" ADD COLUMN "lastEligibilityCheck" TIMESTAMP(3);

-- Add AdvancedMD fields to charge_entries table
ALTER TABLE "charge_entries" ADD COLUMN "advancedMDChargeId" TEXT;
ALTER TABLE "charge_entries" ADD COLUMN "advancedMDVisitId" TEXT;
ALTER TABLE "charge_entries" ADD COLUMN "syncStatus" TEXT DEFAULT 'pending';
ALTER TABLE "charge_entries" ADD COLUMN "syncError" TEXT;
ALTER TABLE "charge_entries" ADD COLUMN "lastSyncAttempt" TIMESTAMP(3);
```

### Option 2: Reset Database (Development Only)

⚠️ **WARNING: This will delete ALL existing data**

Only use this option if the database is purely for development and data loss is acceptable:

```bash
cd packages/database
npx prisma migrate reset
npx prisma migrate dev --name advancedmd_integration
```

### Option 3: Push Schema with Data Loss Flag (Development Only)

⚠️ **WARNING: This will cause data loss for unrelated schema changes**

```bash
cd packages/database
npx prisma db push --accept-data-loss
```

---

## ✅ What Works Right Now

Even without the database migration, the following are ready:

1. ✅ **TypeScript Types** - All AdvancedMD types available in `@mentalspace/shared/types/advancedmd.types`
2. ✅ **Prisma Client** - Generated with all AdvancedMD models
3. ✅ **Auth Service** - `packages/backend/src/integrations/advancedmd/auth.service.ts`
4. ✅ **Rate Limiter Service** - `packages/backend/src/integrations/advancedmd/rate-limiter.service.ts`
5. ✅ **API Client** - `packages/backend/src/integrations/advancedmd/api-client.ts`
6. ✅ **Integration Exports** - `packages/backend/src/integrations/advancedmd/index.ts`

**You can import and use these services in code**, but they will fail at runtime when trying to access database tables that don't exist yet.

---

## 📋 Complete Phase 1 Setup Checklist

Once database migration is complete, follow these steps:

### 1. Generate Encryption Key

```bash
openssl rand -hex 32
```

Save this key - you'll need it for the `.env` file.

### 2. Configure Environment Variables

Create/update `packages/backend/.env`:

```bash
# AdvancedMD Configuration
ADVANCEDMD_ENV=sandbox
ADVANCEDMD_ENCRYPTION_KEY=<key-from-step-1>

# Database (existing)
DATABASE_URL=postgresql://mentalspace_admin:password@host:5432/mentalspace_ehr
```

### 3. Seed Configuration Data

Create seed script at `packages/database/seeds/advancedmd-config.seed.ts` (see [SETUP_GUIDE.md](./SETUP_GUIDE.md) for full script).

Run seed:
```bash
cd packages/database
npx tsx seeds/advancedmd-config.seed.ts
```

### 4. Test Phase 1 Components

```bash
cd packages/backend

# Test authentication
node -e "
const { advancedMDAuth } = require('./dist/integrations/advancedmd');
(async () => {
  await advancedMDAuth.initialize();
  const token = await advancedMDAuth.getToken();
  console.log('✅ Authentication successful');
})();
"

# Test rate limiter
node -e "
const { advancedMDRateLimiter } = require('./dist/integrations/advancedmd');
(async () => {
  const status = await advancedMDRateLimiter.getRateLimitStatus('GETUPDATEDPATIENTS');
  console.log('✅ Rate limiter initialized', status);
})();
"
```

---

## 📚 Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions
- [PHASE_1_IMPLEMENTATION_COMPLETE.md](./PHASE_1_IMPLEMENTATION_COMPLETE.md) - Usage examples and API reference
- [INTEGRATION_ANALYSIS_COMPLETE_SUMMARY.md](./INTEGRATION_ANALYSIS_COMPLETE_SUMMARY.md) - Architecture overview

---

## 🎯 Summary

**Schema Integration:** ✅ Complete
**Prisma Client:** ✅ Generated
**Database Migration:** ⚠️ Pending (manual SQL recommended due to unrelated schema changes with data)
**Phase 1 Code:** ✅ Ready to use (after database migration)

**Recommended Next Action:** Apply manual database migration using SQL from Option 1 above.
