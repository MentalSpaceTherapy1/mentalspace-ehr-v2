# AdvancedMD Integration - Implementation Summary
**Date:** October 16, 2025
**Module:** Module 6 - AdvancedMD/Billing Integration
**Status:** Ready for Implementation

---

## 🎯 IMPLEMENTATION SCOPE

This implementation provides complete AdvancedMD API integration including:

1. ✅ **Patient/Appointment Sync** - Bidirectional sync of patient demographics
2. ✅ **Eligibility Verification** - Real-time insurance eligibility checks (24-hour caching)
3. ✅ **Claim Submission** - Electronic claim submission via 837P format
4. ✅ **ERA (835 EDI) Parsing** - Automated parsing of Electronic Remittance Advice files

---

## 📊 DATABASE SCHEMA UPDATES

### New Models Created:

1. **EligibilityCheck** - Stores eligibility verification results with 24-hour caching
2. **Claim** - Claims management with full status tracking
3. **ClaimCharge** - Individual charge line items within claims
4. **ClaimPayment** - Payment records from ERA/EOB
5. **ERARecord** - Raw and parsed 835 EDI data
6. **AdvancedMDSyncLog** - Comprehensive sync audit trail

### Enhanced Existing Models:

1. **Client** - Added: `advancedMDPatientId`, `lastSyncedToAMD`, `amdSyncStatus`, `amdSyncError`
2. **ChargeEntry** - Added: `advancedMDChargeId`, `advancedMDVisitId`, `syncStatus`, `syncError`, `lastSyncAttempt`
3. **InsuranceInformation** - Added: `advancedMDPayerId`, `advancedMDPayerName`, `lastEligibilityCheck`

### Schema File Location:
`packages/database/prisma/advancedmd-schema-additions.prisma`

**ACTION REQUIRED:**
- Manually merge these additions into `schema.prisma`
- Run `npx prisma migrate dev --name add_advancedmd_integration`
- Run `npx prisma generate`

---

## 🏗️ SERVICES ARCHITECTURE

### 1. Rate Limiter Service
**File:** `packages/backend/src/services/advancedmd/rateLimiter.ts`

**Features:**
- Tier-based rate limiting (Tier 1, 2, 3)
- Peak hours awareness (6 AM - 6 PM MT, Mon-Fri)
- Intelligent queueing system
- Per-minute and per-hour tracking
- Automatic queue processing

**Usage Example:**
```typescript
import { rateLimiter } from './rateLimiter';

// Acquire rate limit slot
await rateLimiter.acquire('GETDEMOGRAPHIC');

// Make API call...
```

**Rate Limits:**
- **Tier 1** (GETUPDATEDVISITS, GETUPDATEDPATIENTS):
  Peak: 1/min, Off-Peak: 60/min
- **Tier 2** (SAVECHARGES, GETDEMOGRAPHIC, etc.):
  Peak: 12/min, Off-Peak: 120/min
- **Tier 3** (LOOKUP APIs):
  Peak: 24/min, Off-Peak: 120/min

---

### 2. AdvancedMD API Client
**File:** `packages/backend/src/services/advancedmd/client.ts`

**Core Features:**
- Automatic token refresh (every 23 hours)
- Rate limiting integration
- Exponential backoff retry logic
- Request/response logging
- Error handling with context

**Key Methods:**

#### Authentication
```typescript
await client.authenticate();
```

#### Patient Operations
```typescript
// Search for existing patient
const patients = await client.searchPatients({
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1980-01-15'
});

// Create/Update patient
const amdPatientId = await client.savePatient({
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1980-01-15',
  // ... all patient data
});
```

#### Eligibility
```typescript
const eligibility = await client.checkEligibility({
  patientId: 'amd-patient-id',
  insuranceId: 'insurance-id',
  serviceType: '30', // Mental Health
  serviceDate: '2025-10-16'
});
```

#### Claims
```typescript
// Submit charges
const chargeId = await client.saveCharges({
  patientId: 'amd-patient-id',
  serviceDate: '2025-10-16',
  cptCode: '90834',
  diagnosisCodes: ['F32.0', 'F41.1'],
  // ... charge details
});

// Submit claim
const claimId = await client.submitClaim({
  visitId: 'amd-visit-id',
  // ... claim details
});
```

---

### 3. Eligibility Verification Service
**File:** `packages/backend/src/services/advancedmd/eligibility.service.ts`

**Features:**
- Real-time eligibility checks via AdvancedMD → Waystar → Payer
- 24-hour result caching
- Automatic cache lookup before API call
- Comprehensive response parsing
- Database persistence

**API Method:**
```typescript
export async function checkEligibility(params: {
  clientId: string;
  insuranceId: string;
  serviceDate?: string;
  forceFresh?: boolean; // Skip cache
}): Promise<EligibilityCheckResult>
```

**Response includes:**
- Coverage active status
- Copay amount
- Deductible (total & met)
- Out-of-pocket max (total & met)
- Coinsurance percentage
- Authorization requirements
- Service limits (visits)
- Error handling

**Cache Strategy:**
```typescript
// Check cache first
const cached = await findCachedEligibility(clientId, insuranceId);
if (cached && cached.cachedUntil > new Date() && !forceFresh) {
  return cached;
}

// Make fresh API call
const result = await client.checkEligibility({...});

// Save to database with 24-hour cache
await saveEligibilityCheck({
  ...result,
  cachedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
});
```

---

### 4. Claim Submission Service
**File:** `packages/backend/src/services/advancedmd/claims.service.ts`

**Features:**
- Electronic claim submission (837P format)
- Automatic charge grouping
- Claim status tracking
- Resubmission support
- Clearinghouse integration (Waystar)

**Workflow:**

#### 1. Create Claim
```typescript
export async function createClaim(params: {
  clientId: string;
  chargeIds: string[]; // Charges to include
  insuranceId: string;
}): Promise<Claim>
```

**Claim Status Flow:**
```
draft → ready → submitted → accepted → in_process → paid
                                    ↓
                              rejected → resubmitted
```

#### 2. Submit to AdvancedMD
```typescript
export async function submitClaimToAdvancedMD(claimId: string): Promise<void>
```

**Process:**
1. Validate claim data
2. Group charges by service date
3. Map to AdvancedMD format
4. Submit via API
5. Store `advancedMDClaimId`
6. Update status to 'submitted'

#### 3. Check Claim Status
```typescript
export async function syncClaimStatus(claimId: string): Promise<void>
```

**Polls AdvancedMD for claim status updates:**
- Clearinghouse acceptance/rejection
- Payer acceptance/denial
- Payment information

#### 4. Resubmit Claim
```typescript
export async function resubmitClaim(params: {
  originalClaimId: string;
  reason: string;
  corrections?: any;
}): Promise<Claim>
```

---

### 5. ERA (835 EDI) Parsing Service
**File:** `packages/backend/src/services/advancedmd/era.service.ts`

**Features:**
- Parse 835 EDI files (Electronic Remittance Advice)
- Extract payment information
- Map payments to claims
- Automatic posting (configurable)
- Adjustment code parsing

**Key Components:**

#### Parse 835 File
```typescript
export async function parse835File(params: {
  fileContent: string;
  fileName: string;
  s3Key?: string;
}): Promise<ERARecord>
```

**Parses:**
- Header (ISA, GS, ST segments)
- Payer information (N1, REF loops)
- Payment details (BPR, TRN segments)
- Claim-level details (CLP loops)
- Service-level details (SVC segments)
- Adjustment codes (CAS segments)
- Remark codes (REF segments)

#### Map to Claims
```typescript
export async function mapERAToClai ms(eraRecordId: string): Promise<void>
```

**Process:**
1. Find matching claims by payer claim number
2. Create ClaimPayment records
3. Update claim status
4. Calculate patient responsibility
5. Apply adjustments

#### Auto-Post Payments
```typescript
export async function autoPostERA(eraRecordId: string): Promise<void>
```

**Rules:**
- Match claim by payer claim number (exact match required)
- Verify payment amount matches expected
- Apply standard adjustment codes automatically
- Flag exceptions for manual review

**835 Segment Examples:**
```
ISA*00*          *00*          *ZZ*WAYSTAR        *ZZ*MENTALSPACE    *251016*1230*^*00501*000000001*0*P*:~
GS*HP*WAYSTAR*MENTALSPACE*20251016*1230*1*X*005010X221A1~
ST*835*0001*005010X221A1~
BPR*I*5000.00*C*ACH*CCP*01*123456789*DA*987654321*1234567890**01*111000025*DA*9876543210*20251016~
TRN*1*12345678901234*1234567890~
REF*EV*WAYSTAR123~
DTM*405*20251016~

N1*PR*UNITED HEALTHCARE~
N3*123 INSURANCE WAY~
N4*ATLANTA*GA*30301~
REF*2U*12345~

N1*PE*MENTALSPACE EHR*XX*1234567890~

CLP*CLAIM123*1*200.00*180.00**12*CLM123456*11*1~
CAS*CO*45*20.00~
NM1*QC*1*DOE*JOHN****MI*123456789~
DTM*232*20251001~
DTM*233*20251001~

SVC*HC:90834*200.00*180.00**1~
DTM*472*20251001~
CAS*CO*45*20.00~
REF*6R*LINE1~

SE*25*0001~
GE*1*1~
IEA*1*000000001~
```

**Parsed Output:**
```json
{
  "payerName": "UNITED HEALTHCARE",
  "payerId": "12345",
  "paymentMethod": "ACH",
  "checkNumber": "12345678901234",
  "paymentAmount": 5000.00,
  "paymentDate": "2025-10-16",
  "claims": [
    {
      "claimNumber": "CLAIM123",
      "patientName": "DOE, JOHN",
      "chargeAmount": 200.00,
      "paidAmount": 180.00,
      "adjustmentAmount": 20.00,
      "adjustments": [
        {
          "groupCode": "CO", // Contractual Obligation
          "reasonCode": "45", // Charge exceeds fee schedule
          "amount": 20.00
        }
      ]
    }
  ]
}
```

---

## 🔌 API ENDPOINTS

### Eligibility Verification

#### Check Eligibility
```http
POST /api/v1/advancedmd/eligibility/check
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "clientId": "uuid",
  "insuranceId": "uuid",
  "serviceDate": "2025-10-16",
  "forceFresh": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clientId": "uuid",
    "insuranceId": "uuid",
    "checkDate": "2025-10-16T12:00:00Z",
    "coverageActive": true,
    "eligibleForService": true,
    "copay": 25.00,
    "deductible": 1000.00,
    "deductibleMet": 500.00,
    "outOfPocketMax": 5000.00,
    "outOfPocketMet": 1000.00,
    "requiresAuth": false,
    "serviceLimit": 30,
    "serviceUsed": 10,
    "serviceRemaining": 20,
    "cachedUntil": "2025-10-17T12:00:00Z",
    "checkStatus": "success"
  }
}
```

---

### Claims

#### Create Claim
```http
POST /api/v1/advancedmd/claims
Authorization: Bearer <jwt_token>

{
  "clientId": "uuid",
  "chargeIds": ["uuid1", "uuid2"],
  "insuranceId": "uuid"
}
```

#### Submit Claim
```http
POST /api/v1/advancedmd/claims/:claimId/submit
```

#### Get Claim Status
```http
GET /api/v1/advancedmd/claims/:claimId
```

#### Resubmit Claim
```http
POST /api/v1/advancedmd/claims/:claimId/resubmit

{
  "reason": "Corrected diagnosis code",
  "corrections": {
    "diagnosisCodes": ["F32.1", "F41.1"]
  }
}
```

---

### ERA Processing

#### Upload ERA File
```http
POST /api/v1/advancedmd/era/upload
Content-Type: multipart/form-data

file: <835_file.txt>
```

#### Parse ERA
```http
POST /api/v1/advancedmd/era/:eraRecordId/parse
```

#### Auto-Post ERA
```http
POST /api/v1/advancedmd/era/:eraRecordId/auto-post
```

#### Get ERA Details
```http
GET /api/v1/advancedmd/era/:eraRecordId
```

---

### Patient Sync

#### Sync Patient to AdvancedMD
```http
POST /api/v1/advancedmd/patients/:clientId/sync
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "uuid",
    "advancedMDPatientId": "12345",
    "syncStatus": "synced",
    "lastSyncedToAMD": "2025-10-16T12:00:00Z"
  }
}
```

---

## 🔐 ENVIRONMENT VARIABLES

Add to `.env` and AWS Secrets Manager:

```bash
# AdvancedMD Sandbox
ADVANCEDMD_SANDBOX_URL=https://api-sandbox.advancedmd.com
ADVANCEDMD_SANDBOX_OFFICE_KEY=
ADVANCEDMD_SANDBOX_USERNAME=
ADVANCEDMD_SANDBOX_PASSWORD=
ADVANCEDMD_SANDBOX_CLIENT_ID=
ADVANCEDMD_SANDBOX_CLIENT_SECRET=

# AdvancedMD Production
ADVANCEDMD_PROD_URL=https://api.advancedmd.com
ADVANCEDMD_PROD_OFFICE_KEY=
ADVANCEDMD_PROD_USERNAME=
ADVANCEDMD_PROD_PASSWORD=
ADVANCEDMD_PROD_CLIENT_ID=
ADVANCEDMD_PROD_CLIENT_SECRET=

# IP Whitelist
ADVANCEDMD_ALLOWED_IPS=<comma_separated>
```

---

## 📈 MONITORING & ALERTS

### CloudWatch Metrics

1. **AdvancedMD API Calls**
   - Metric: `AdvancedMD/APICallCount`
   - Dimensions: Endpoint, Status (success/error)

2. **Rate Limit Hits**
   - Metric: `AdvancedMD/RateLimitHits`
   - Alert: >10 hits/hour

3. **Eligibility Check Duration**
   - Metric: `AdvancedMD/EligibilityCheckDuration`
   - Alert: >35 seconds (30s + 5s buffer)

4. **Claim Submission Success Rate**
   - Metric: `AdvancedMD/ClaimSubmissionSuccess`
   - Target: >99.5%

5. **ERA Processing Errors**
   - Metric: `AdvancedMD/ERAProcessingErrors`
   - Alert: Any error

### Alert Thresholds

- ❗ **Critical:** Token refresh failure, API authentication failure
- ⚠️ **High:** Rate limit exceeded >10 min, API error rate >5%
- ℹ️ **Medium:** Slow API response (>10s), claim rejection

---

## 🧪 TESTING CHECKLIST

### Unit Tests
- [ ] Rate limiter logic (tier 1, 2, 3)
- [ ] Peak hours detection
- [ ] 835 EDI parser
- [ ] Data mappers (Client → AMD Patient)
- [ ] Token refresh mechanism

### Integration Tests
- [ ] Authentication & token refresh
- [ ] Patient search & create
- [ ] Eligibility check (live API)
- [ ] Charge submission
- [ ] Claim submission
- [ ] ERA parsing & posting

### End-to-End Tests
1. [ ] Create patient → Sync to AMD → Verify
2. [ ] Check eligibility → Cache → Re-check (use cache)
3. [ ] Create charge → Submit → Track status
4. [ ] Generate claim → Submit → Track → Post payment
5. [ ] Upload 835 → Parse → Auto-post → Verify

---

## 📋 IMPLEMENTATION STEPS

### Phase 1: Setup (Day 1)
1. Merge database schema changes
2. Run migrations
3. Add environment variables
4. Test authentication

### Phase 2: Patient Sync (Day 2)
1. Implement patient mapper
2. Implement search/create logic
3. Test with sample patients
4. Verify in AdvancedMD sandbox

### Phase 3: Eligibility (Day 3)
1. Implement eligibility service
2. Add 24-hour caching
3. Create API endpoints
4. Test with real insurance

### Phase 4: Claims (Days 4-5)
1. Implement claim creation
2. Implement submission logic
3. Add status tracking
4. Test resubmission

### Phase 5: ERA (Day 6)
1. Implement 835 parser
2. Add payment mapping
3. Implement auto-posting
4. Test with sample 835 files

### Phase 6: Testing (Day 7)
1. Complete all integration tests
2. Load testing
3. Error scenario testing
4. Production readiness review

---

## ✅ SUCCESS CRITERIA

- [ ] 99.5% claim acceptance rate (guaranteed by AdvancedMD)
- [ ] 99.9% eligibility check success rate
- [ ] <30 second eligibility response time
- [ ] Zero duplicate patients created
- [ ] <1% sync error rate
- [ ] Zero data loss during sync
- [ ] All rate limits respected (no hard blocks)
- [ ] ERA auto-posting accuracy >95%

---

## 📝 NEXT ACTIONS

1. **Review & Approve** this implementation plan
2. **Merge schema changes** into `schema.prisma`
3. **Run database migrations**
4. **Obtain AdvancedMD credentials** (sandbox & production)
5. **Begin Phase 1 implementation**

---

**Implementation Date:** October 16, 2025
**Estimated Completion:** 7 business days
**Total Effort:** 40-56 hours
