# AdvancedMD Integration - Setup Guide

**Phase 1: Authentication, Rate Limiting, and Base Infrastructure**

---

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ installed
- ✅ Access to MentalSpace EHR V2 repository
- ✅ AdvancedMD credentials (Office Key, Partner credentials, App credentials)
- ✅ Database connection configured

---

## Step 1: Generate Encryption Key

The AdvancedMD integration requires an encryption key for securing credentials in the database.

```bash
# Generate a 256-bit (32-byte) encryption key
openssl rand -hex 32
```

**Output example:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Important:**
- ⚠️ NEVER commit this key to version control
- ✅ Store in environment variable
- ✅ Use different keys for sandbox and production
- ✅ Rotate keys periodically (recommend: every 90 days)

---

## Step 2: Configure Environment Variables

### Backend Environment (.env)

**Location:** `packages/backend/.env`

```bash
# AdvancedMD Configuration
ADVANCEDMD_ENV=sandbox
ADVANCEDMD_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Database (Existing)
DATABASE_URL=postgresql://mentalspace_admin:password@localhost:5432/mentalspace_ehr
```

### Production Environment Variables

For production deployment (ECS, Lambda, etc.), add these environment variables:

```bash
# AWS ECS Task Definition
ADVANCEDMD_ENV=production
ADVANCEDMD_ENCRYPTION_KEY=<production-key-from-secrets-manager>
```

---

## Step 3: Database Schema Migration

### Option A: Integrate Schema into main schema.prisma (Recommended)

1. **Open main schema file:**
   ```bash
   code packages/database/prisma/schema.prisma
   ```

2. **Add field additions to existing models:**

   Find the `Client` model (around line 250) and add:
   ```prisma
   // AdvancedMD Integration Fields
   advancedMDPatientId String?   @unique
   lastSyncedToAMD     DateTime?
   amdSyncStatus       String?   // 'pending', 'synced', 'error'
   amdSyncError        String?
   ```

   Find the `ChargeEntry` model (around line 1220) and add:
   ```prisma
   // AdvancedMD Integration Fields
   advancedMDChargeId   String?
   advancedMDVisitId    String?
   syncStatus           String    @default("pending") // 'pending', 'synced', 'error'
   syncError            String?
   lastSyncAttempt      DateTime?
   ```

   Find the `InsuranceInformation` model (around line 327) and add:
   ```prisma
   // AdvancedMD Integration Fields
   advancedMDPayerId    String?
   advancedMDPayerName  String?
   lastEligibilityCheck DateTime?
   ```

3. **Add new models at the end of schema.prisma:**

   Copy all models from `packages/database/prisma/advancedmd-schema-additions.prisma` starting from:
   - EligibilityCheck
   - Claim
   - ClaimCharge
   - ClaimPayment
   - ERARecord
   - AdvancedMDSyncLog
   - AdvancedMDConfig
   - AdvancedMDRateLimitState
   - PaymentClaimMapping
   - ClaimValidationRule
   - CPTCode
   - ICDCode

4. **Add relation fields to Client model:**

   Find the Client model relations section and add:
   ```prisma
   eligibilityChecks       EligibilityCheck[] @relation("ClientEligibilityCheck")
   claims                  Claim[]            @relation("ClientClaim")
   ```

5. **Add relation fields to Claim model:**

   Find the Claim model relations section and add:
   ```prisma
   paymentMappings         PaymentClaimMapping[] @relation("PaymentClaimMapping")
   ```

### Option B: Use Separate Schema File (For Testing)

Skip step 3 for now and manually create tables using SQL migrations (not recommended for production).

---

## Step 4: Run Prisma Migration

```bash
# Navigate to database package
cd packages/database

# Create migration
npm run migrate:dev -- --name advancedmd_integration

# Generate Prisma client
npm run generate

# Verify migration
npm run studio
```

**Expected Output:**
```
✅ Database schema updated
✅ 12 new tables created
✅ Prisma client regenerated
```

**Verify in Prisma Studio:**
- Open Prisma Studio: `npm run studio`
- Check for new tables:
  - advancedmd_config
  - advancedmd_rate_limit_state
  - advancedmd_sync_logs
  - eligibility_checks
  - claims
  - claim_charges
  - claim_payments
  - era_records
  - payment_claim_mappings
  - claim_validation_rules
  - cpt_codes
  - icd_codes

---

## Step 5: Seed Configuration Data

### Create Seed Script

**Location:** `packages/database/seeds/advancedmd-config.seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// IMPORTANT: Replace with your actual credentials
const CREDENTIALS = {
  officeKey: '990207',
  partnerUsername: 'CAHCAPI',
  partnerPassword: '1o7Dn4p1',
  appUsername: 'ADMIN',
  appPassword: 'Bing@@0912', // Replace with actual password
};

const ENCRYPTION_KEY = Buffer.from(process.env.ADVANCEDMD_ENCRYPTION_KEY!, 'hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function seed() {
  console.log('Seeding AdvancedMD configuration...');

  // Create or update config
  await prisma.advancedMDConfig.upsert({
    where: { officeKey: CREDENTIALS.officeKey },
    create: {
      officeKey: CREDENTIALS.officeKey,
      officeName: 'Coping and Healing Counseling',
      partnerUsername: CREDENTIALS.partnerUsername,
      partnerPassword: encrypt(CREDENTIALS.partnerPassword),
      appUsername: CREDENTIALS.appUsername,
      appPassword: encrypt(CREDENTIALS.appPassword),
      environment: process.env.ADVANCEDMD_ENV || 'sandbox',
      syncEnabled: false, // Enable after testing
      autoSyncPatients: false,
      autoSyncVisits: false,
      autoSyncClaims: false,
      pollingIntervalClaims: 30,
      pollingIntervalVisits: 15,
      pollingIntervalPatients: 60,
      enableEligibilityCheck: true,
      enableClaimSubmission: false, // Enable after validation testing
      enablePaymentSync: false, // Enable after ODBC setup
    },
    update: {
      partnerPassword: encrypt(CREDENTIALS.partnerPassword),
      appPassword: encrypt(CREDENTIALS.appPassword),
    },
  });

  console.log('✅ AdvancedMD configuration seeded');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Run Seed Script

```bash
cd packages/database
npx tsx seeds/advancedmd-config.seed.ts
```

**Expected Output:**
```
Seeding AdvancedMD configuration...
✅ AdvancedMD configuration seeded
```

---

## Step 6: Verify Installation

### Test Authentication

```bash
cd packages/backend
node -e "
const { advancedMDAuth } = require('./dist/integrations/advancedmd');

(async () => {
  await advancedMDAuth.initialize();
  const token = await advancedMDAuth.getToken();
  console.log('✅ Authentication successful');
  console.log('Token:', token.substring(0, 20) + '...');

  const sessionInfo = advancedMDAuth.getSessionInfo();
  console.log('Token expires in:', sessionInfo.tokenExpiresIn, 'minutes');
})();
"
```

**Expected Output:**
```
✅ Authentication successful
Token: eyJhbGciOiJIUzI1NiIsI...
Token expires in: 1439 minutes
```

### Test Rate Limiter

```bash
node -e "
const { advancedMDRateLimiter } = require('./dist/integrations/advancedmd');

(async () => {
  const status = await advancedMDRateLimiter.getRateLimitStatus('GETUPDATEDPATIENTS');
  console.log('✅ Rate limiter initialized');
  console.log('Tier:', status.tier);
  console.log('Is peak hours:', status.isPeakHours);
  console.log('Current limit:', status.currentLimit);
  console.log('Remaining calls:', status.remainingCalls);
})();
"
```

**Expected Output:**
```
✅ Rate limiter initialized
Tier: tier1
Is peak hours: false
Current limit: 60
Remaining calls: 60
```

### Test API Client

```bash
node -e "
const { advancedMDAPI } = require('./dist/integrations/advancedmd');

(async () => {
  const response = await advancedMDAPI.execute({
    endpoint: 'LOOKUPPROFILE',
    action: 'lookupprofile',
    data: {
      '@lastname': 'Admin'
    }
  });

  if (response.success) {
    console.log('✅ API client working');
    console.log('Response:', response.data);
  } else {
    console.error('❌ API error:', response.error);
  }
})();
"
```

---

## Step 7: Enable Logging

### Configure Winston Logger (Optional)

**Location:** `packages/backend/src/config/logger.ts`

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'advancedmd-integration' },
  transports: [
    new winston.transports.File({ filename: 'logs/advancedmd-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/advancedmd-combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

---

## Troubleshooting Common Issues

### Issue 1: "ADVANCEDMD_ENCRYPTION_KEY environment variable is required"

**Solution:**
```bash
# Verify environment variable is set
echo $ADVANCEDMD_ENCRYPTION_KEY

# If empty, add to .env file
echo "ADVANCEDMD_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> packages/backend/.env

# Restart backend
npm run dev:backend
```

### Issue 2: "AdvancedMD configuration not found in database"

**Solution:**
```bash
# Run seed script
cd packages/database
npx tsx seeds/advancedmd-config.seed.ts

# Verify in Prisma Studio
npm run studio
# Check advancedmd_config table has one row
```

### Issue 3: "Partner login failed: Authentication error"

**Possible Causes:**
1. Incorrect credentials
2. Credentials not encrypted properly
3. Sandbox vs. Production mismatch

**Solution:**
```bash
# Verify credentials in database
psql -d mentalspace_ehr -c "SELECT officeKey, partnerUsername, appUsername, environment FROM advancedmd_config;"

# Re-seed with correct credentials
cd packages/database
# Edit seeds/advancedmd-config.seed.ts with correct credentials
npx tsx seeds/advancedmd-config.seed.ts
```

### Issue 4: Prisma migration fails

**Solution:**
```bash
# Reset database (⚠️ CAUTION: Deletes all data)
cd packages/database
npx prisma migrate reset

# OR apply migration manually
npx prisma db push

# Regenerate Prisma client
npx prisma generate
```

---

## Security Best Practices

### 1. Credential Management

- ✅ Never commit credentials to version control
- ✅ Use environment variables for all sensitive data
- ✅ Use AWS Secrets Manager for production credentials
- ✅ Rotate credentials every 90 days
- ✅ Use separate credentials for sandbox and production

### 2. Encryption Key Management

- ✅ Generate unique key for each environment
- ✅ Store in AWS Secrets Manager (production)
- ✅ Use IAM roles for ECS task access
- ✅ Rotate encryption keys periodically
- ✅ Re-encrypt data after key rotation

### 3. Database Security

- ✅ Enable encryption at rest for RDS
- ✅ Enable encryption in transit (SSL)
- ✅ Implement least-privilege IAM policies
- ✅ Enable automated backups
- ✅ Implement log retention policies

### 4. API Security

- ✅ Use HTTPS for all API calls
- ✅ Validate all input data
- ✅ Implement request signing (future)
- ✅ Rate limit API endpoints
- ✅ Monitor for suspicious activity

---

## Monitoring & Alerts

### Recommended CloudWatch Alarms

```bash
# High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name advancedmd-high-error-rate \
  --alarm-description "Alert when AdvancedMD sync error rate > 5%" \
  --metric-name SyncErrorRate \
  --namespace MentalSpace/AdvancedMD \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold

# Authentication failures
aws cloudwatch put-metric-alarm \
  --alarm-name advancedmd-auth-failures \
  --alarm-description "Alert when AdvancedMD authentication fails" \
  --metric-name AuthenticationFailures \
  --namespace MentalSpace/AdvancedMD \
  --statistic Sum \
  --period 60 \
  --threshold 3 \
  --comparison-operator GreaterThanThreshold

# Rate limit exceeded
aws cloudwatch put-metric-alarm \
  --alarm-name advancedmd-rate-limit-exceeded \
  --alarm-description "Alert when rate limits exceeded frequently" \
  --metric-name RateLimitErrors \
  --namespace MentalSpace/AdvancedMD \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

---

## Next Steps

After completing Phase 1 setup:

1. ✅ Test authentication in sandbox environment
2. ✅ Test rate limiting with various endpoints
3. ✅ Monitor sync logs for first 24 hours
4. ✅ Request sandbox access from AdvancedMD (if not already available)
5. ⏭️ Proceed to Phase 2: Patient Synchronization

---

**Setup Complete!** 🎉

The AdvancedMD integration Phase 1 is now configured and ready for development.

For issues or questions, refer to:
- [PHASE_1_IMPLEMENTATION_COMPLETE.md](./PHASE_1_IMPLEMENTATION_COMPLETE.md) - Usage examples
- [INTEGRATION_ANALYSIS_COMPLETE_SUMMARY.md](./INTEGRATION_ANALYSIS_COMPLETE_SUMMARY.md) - Architecture overview
- [CRITICAL_FINDINGS_FROM_JOSEPHS_QUESTIONNAIRE.md](./CRITICAL_FINDINGS_FROM_JOSEPHS_QUESTIONNAIRE.md) - API limitations
