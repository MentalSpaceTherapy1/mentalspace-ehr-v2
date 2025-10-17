# AdvancedMD Integration Plan
**Timeline:** Within 1 week
**Status:** Ready for Implementation
**Last Updated:** January 2025

---

## Executive Summary

This document outlines the complete integration plan for AdvancedMD API, including authentication, rate limiting, patient sync, eligibility checks, claim submission, and payment posting. The billing module has been architected to fully support AdvancedMD integration based on their API capabilities and limitations.

---

## Key Integration Facts

### Authentication
- **Token Expiration:** 24 hours (rotating every 23 hours to avoid expiration)
- **Credentials Required:**
  - Office Key (Practice ID)
  - API Username/Password
  - Client ID / Client Secret
  - Separate credentials for Sandbox vs. Production

### API Rate Limits

#### Peak Hours
- **Definition:** 6:00 AM - 6:00 PM Mountain Time, Monday-Friday
- **Impact:** Significantly reduced rate limits during peak hours

#### Tier 1 - High Impact Calls
- **Endpoints:** `GETUPDATEDVISITS`, `GETUPDATEDPATIENTS`
- **Peak Hours:** 1 call/minute (60 calls/hour)
- **Off-Peak:** 60 calls/minute (3,600 calls/hour)
- **Strategy:** Use sparingly, batch sync during off-peak hours

#### Tier 2 - Medium Impact Calls
- **Endpoints:** `SAVECHARGES`, `GETDEMOGRAPHIC`, `GETDATEVISITS`, `UPDVISITWITHNEWCHARGES`, `GETTXHISTORY`, `GETAPPTS`, `GETPAYMENTDETAILDATA`
- **Peak Hours:** 12 calls/minute (720 calls/hour)
- **Off-Peak:** 120 calls/minute (7,200 calls/hour)

#### Tier 3 - Low Impact Calls
- **Endpoints:** All `LOOKUP` APIs (CPT, ICD-10, Payers, etc.)
- **Peak Hours:** 24 calls/minute (1,440 calls/hour)
- **Off-Peak:** 120 calls/minute (7,200 calls/hour)

### Eligibility Checks
- **Real-Time:** Yes
- **Response Time:** <30 seconds
- **Success Rate:** 99.9%
- **Cost:** No per-query cost
- **Clearinghouse:** Waystar (direct connections to all major payers)
- **Caching:** Cache results for 24 hours to reduce API calls

### Claims Management
- **Submission:** Electronic via API (837P format)
- **Batch Support:** Yes (batch size TBD, estimated 100-500)
- **Acceptance Rate:** 99.5% guaranteed
- **Clearinghouse:** Waystar or Change
- **Claim Resubmission:** Supported via API (resend charge to existing visit voids previous)
- **Claim Attachments:** Supported in UI, not via API

### Payment Posting
- **API Support:** Yes, can post payments via API
- **Payment Application:** Manual application via UI (not via API)
- **ERA Retrieval:** Not available via API (UI only)
- **Auto-Posting:** Can post payments, but cannot auto-apply to specific charges via API

### Webhooks
- **Support:** No webhooks available
- **Workaround:** Polling for updates (use Tier 1 calls sparingly)

### Reporting
- **Via API:** Limited
- **Via UI:** Comprehensive reporting available
- **Via ODBC:** Yes, for data export and custom reporting
- **Date Range:** Up to 24 months

---

## Architecture Implementation

### 1. Configuration Layer
**File:** `packages/backend/src/config/advancedmd.config.ts`

**Features:**
- Environment-specific configuration (sandbox vs. production)
- Rate limit definitions (Tier 1, 2, 3)
- Peak hours detection (Mountain Time)
- Token management configuration
- Timeout settings per operation type
- IP whitelist configuration

**Key Functions:**
- `getAdvancedMDConfig()` - Get current environment config
- `isPeakHours()` - Check if current time is peak
- `getRateLimitForEndpoint()` - Get applicable rate limit

### 2. Rate Limiter
**File:** `packages/backend/src/services/advancedmd/rateLimiter.ts`

**Features:**
- Intelligent queue management
- Per-minute and per-hour tracking
- Automatic wait/retry when limits reached
- Tier-based rate limiting
- Peak hours awareness

**Key Methods:**
- `acquire(endpoint, officeKey)` - Acquire rate limit slot
- `getStatus(endpoint, officeKey)` - Check current usage
- `reset()` - Clear limits (for testing)

### 3. API Client
**File:** `packages/backend/src/services/advancedmd/client.ts`

**Features:**
- Automatic token refresh (every 23 hours)
- Rate limiting integration
- Exponential backoff retry logic
- Request/response interceptors
- Performance logging
- Error handling with context

**Key Methods:**
- `checkEligibility()` - Real-time eligibility check
- `savePatient()` - Create/update patient
- `searchPatients()` - Find existing patients
- `saveCharges()` - Submit charges
- `submitClaim()` - Submit claim
- `postPayment()` - Post payment
- `lookupCPTCodes()` - Lookup procedure codes
- `lookupICD10Codes()` - Lookup diagnosis codes
- `lookupPayers()` - Lookup insurance companies

---

## Integration Phases

### Phase 1: Setup & Authentication (Days 1-2)
- [ ] Receive sandbox credentials from AdvancedMD
- [ ] Store credentials in AWS Secrets Manager
- [ ] Update environment variables
- [ ] Test authentication and token refresh
- [ ] Verify IP whitelist configuration
- [ ] Test rate limiter with various endpoints

**Deliverables:**
- Successful authentication to sandbox
- Token auto-refresh working
- Rate limiter tested and validated

### Phase 2: Patient Sync (Days 2-3)
- [ ] Build patient data mapper (MentalSpace → AdvancedMD)
- [ ] Implement patient search (avoid duplicates)
- [ ] Implement patient create/update
- [ ] Test with sample patients
- [ ] Handle duplicate detection
- [ ] Store AdvancedMD patient IDs in our database

**API Endpoints Used:**
- `searchPatients()` - Find existing
- `savePatient()` - Create/update
- `getPatient()` - Retrieve details

**Database Changes:**
```sql
ALTER TABLE "Client" ADD COLUMN "advancedMDPatientId" TEXT;
CREATE INDEX "idx_advancedmd_patient_id" ON "Client"("advancedMDPatientId");
```

### Phase 3: Eligibility Checks (Day 3)
- [ ] Build eligibility check workflow
- [ ] Implement 24-hour caching
- [ ] Display results in frontend
- [ ] Handle payer not found scenarios
- [ ] Log all eligibility checks for audit

**Frontend Updates:**
- Add "Check Eligibility" button on insurance page
- Display eligibility results (copay, deductible, coverage status)
- Show last check date and cache status

**Database Changes:**
```sql
CREATE TABLE "EligibilityCheck" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL REFERENCES "Client"("id"),
  "insuranceId" TEXT NOT NULL REFERENCES "Insurance"("id"),
  "checkDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "responseData" JSONB NOT NULL,
  "coverageActive" BOOLEAN,
  "copay" DECIMAL(10,2),
  "deductible" DECIMAL(10,2),
  "deductibleMet" DECIMAL(10,2),
  "cachedUntil" TIMESTAMP NOT NULL,
  CONSTRAINT "fk_eligibility_client" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
);
```

### Phase 4: Charge Submission (Days 4-5)
- [ ] Map charges from our system to AdvancedMD format
- [ ] Implement charge submission
- [ ] Handle charge updates (void + resubmit logic)
- [ ] Test with various CPT codes
- [ ] Implement batch charge submission
- [ ] Error handling and validation

**API Endpoints Used:**
- `saveCharges()` - Submit charges
- `updateVisitWithCharges()` - Update existing visit

**Workflow:**
1. User creates charge in our system
2. Validate charge data (CPT, diagnosis, units)
3. Submit to AdvancedMD via API
4. Store AdvancedMD charge ID
5. Poll for acceptance status

**Database Changes:**
```sql
ALTER TABLE "ChargeEntry" ADD COLUMN "advancedMDChargeId" TEXT;
ALTER TABLE "ChargeEntry" ADD COLUMN "advancedMDVisitId" TEXT;
ALTER TABLE "ChargeEntry" ADD COLUMN "syncStatus" TEXT DEFAULT 'pending';
ALTER TABLE "ChargeEntry" ADD COLUMN "syncError" TEXT;
ALTER TABLE "ChargeEntry" ADD COLUMN "lastSyncAttempt" TIMESTAMP;
```

### Phase 5: Claim Submission (Days 5-6)
- [ ] Build claim generation logic (837P format)
- [ ] Group charges into claims
- [ ] Submit claims via API
- [ ] Track claim status
- [ ] Handle claim rejections
- [ ] Implement claim resubmission

**API Endpoints Used:**
- `submitClaim()` - Submit claim
- `getClaimStatus()` - Check claim status

**Claim Statuses:**
- Draft
- Ready to Bill
- Submitted
- Accepted (by clearinghouse)
- Rejected (by clearinghouse)
- In Process (at payer)
- Paid
- Denied
- Partially Paid

**Database Changes:**
```sql
CREATE TABLE "Claim" (
  "id" TEXT PRIMARY KEY,
  "claimNumber" TEXT UNIQUE NOT NULL,
  "clientId" TEXT NOT NULL REFERENCES "Client"("id"),
  "insuranceId" TEXT NOT NULL REFERENCES "Insurance"("id"),
  "submissionDate" TIMESTAMP,
  "claimStatus" TEXT NOT NULL DEFAULT 'draft',
  "totalChargeAmount" DECIMAL(10,2) NOT NULL,
  "totalPaymentAmount" DECIMAL(10,2) DEFAULT 0,
  "advancedMDClaimId" TEXT,
  "clearinghouseId" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_claim_client" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT
);

CREATE TABLE "ClaimCharge" (
  "id" TEXT PRIMARY KEY,
  "claimId" TEXT NOT NULL REFERENCES "Claim"("id") ON DELETE CASCADE,
  "chargeId" TEXT NOT NULL REFERENCES "ChargeEntry"("id") ON DELETE RESTRICT
);
```

### Phase 6: Payment Posting (Day 6)
- [ ] Build payment posting logic
- [ ] Post payments via API
- [ ] Manual charge application in UI (since API doesn't support auto-apply)
- [ ] Handle over/under payments
- [ ] Reconciliation workflow

**API Endpoints Used:**
- `postPayment()` - Post payment record

**Limitations:**
- Cannot auto-apply payments to charges via API
- Must be done manually in AdvancedMD UI or our UI

**Workaround:**
- Post payment to AdvancedMD
- Apply payment to charges in our system
- Manual reconciliation in AdvancedMD UI

### Phase 7: Sync Workflows (Day 7)
- [ ] Build scheduled sync jobs
- [ ] Sync updated patients (Tier 1 - off-peak only)
- [ ] Sync updated visits (Tier 1 - off-peak only)
- [ ] Sync claim statuses (Tier 2)
- [ ] Handle sync conflicts
- [ ] Implement sync monitoring

**Sync Schedule:**
- **Patient Sync:** Daily at 2:00 AM MT (off-peak)
- **Visit Sync:** Daily at 2:30 AM MT (off-peak)
- **Claim Status:** Every 2 hours (peak-aware)
- **Eligibility Cache Refresh:** As needed (user-triggered or weekly)

### Phase 8: Testing & Production (Days 7+)
- [ ] Complete end-to-end testing in sandbox
- [ ] Data validation and reconciliation
- [ ] Performance testing under load
- [ ] Receive production credentials
- [ ] Deploy to production
- [ ] Monitor for 1 week
- [ ] Production sign-off

---

## Environment Variables

Add to AWS Secrets Manager and `.env`:

```bash
# AdvancedMD Sandbox
ADVANCEDMD_SANDBOX_URL=https://api-sandbox.advancedmd.com
ADVANCEDMD_SANDBOX_OFFICE_KEY=<provided_by_amd>
ADVANCEDMD_SANDBOX_USERNAME=<provided_by_amd>
ADVANCEDMD_SANDBOX_PASSWORD=<provided_by_amd>
ADVANCEDMD_SANDBOX_CLIENT_ID=<provided_by_amd>
ADVANCEDMD_SANDBOX_CLIENT_SECRET=<provided_by_amd>

# AdvancedMD Production (when ready)
ADVANCEDMD_PROD_URL=https://api.advancedmd.com
ADVANCEDMD_PROD_OFFICE_KEY=<provided_by_amd>
ADVANCEDMD_PROD_USERNAME=<provided_by_amd>
ADVANCEDMD_PROD_PASSWORD=<provided_by_amd>
ADVANCEDMD_PROD_CLIENT_ID=<provided_by_amd>
ADVANCEDMD_PROD_CLIENT_SECRET=<provided_by_amd>

# IP Whitelist (if needed)
ADVANCEDMD_ALLOWED_IPS=<our_server_ips>
```

---

## Testing Strategy

### Unit Tests
- Rate limiter logic
- Token refresh mechanism
- Data mappers
- Error handling

### Integration Tests
- API authentication
- Patient create/update
- Eligibility checks
- Charge submission
- Claim submission
- Payment posting

### End-to-End Tests
1. Create patient in our system → Sync to AdvancedMD → Verify
2. Check eligibility → Cache → Re-check → Use cache
3. Create charge → Submit to AdvancedMD → Verify
4. Generate claim → Submit → Track status → Verify
5. Post payment → Verify in AdvancedMD

### Load Tests
- Test rate limiting under high load
- Verify queue behavior when limits exceeded
- Test peak vs. off-peak performance

---

## Monitoring & Alerts

### CloudWatch Metrics
- AdvancedMD API call count (by endpoint, by tier)
- AdvancedMD API latency (p50, p95, p99)
- AdvancedMD API errors (by type)
- Rate limit hits (how often we hit limits)
- Token refresh success/failure

### Alerts
- **Critical:** Token refresh failure
- **Critical:** API authentication failure
- **High:** Rate limit exceeded for >10 minutes
- **High:** API error rate >5%
- **Medium:** Slow API response time (>10s)

### Dashboards
- Real-time API call volume
- Rate limit utilization (by tier)
- Sync status (patients, visits, claims)
- Eligibility check success rate
- Claim acceptance rate

---

## Risk Mitigation

### Risk 1: Rate Limits During Peak Hours
**Mitigation:**
- Schedule Tier 1 syncs during off-peak only
- Implement intelligent queueing
- Show user-friendly messages when rate limited
- Cache eligibility checks for 24 hours

### Risk 2: Token Expiration
**Mitigation:**
- Automatic refresh every 23 hours
- Retry with new token on 401 errors
- Monitor token refresh failures

### Risk 3: API Downtime
**Mitigation:**
- Implement exponential backoff retry
- Queue failed operations for retry
- Show status page to users
- Manual fallback processes documented

### Risk 4: Data Sync Conflicts
**Mitigation:**
- Store AdvancedMD IDs in our database
- Implement conflict resolution logic
- Manual reconciliation UI
- Audit log all sync operations

### Risk 5: Duplicate Patients
**Mitigation:**
- Search before create
- Fuzzy matching on name + DOB
- Manual merge tool
- Flag potential duplicates for review

---

## Success Criteria

- [ ] 99.5% claim acceptance rate (guaranteed by AdvancedMD)
- [ ] 99.9% eligibility check success rate
- [ ] <30 second eligibility response time
- [ ] Zero duplicate patients created
- [ ] <1% sync error rate
- [ ] Zero data loss during sync
- [ ] All rate limits respected (no hard blocks)

---

## Support & Contacts

- **Technical Contact:** AdvancedMD Interops Team
- **Support Method:** Case ticket system
- **Response Time:** Business hours (6 AM - 6 PM MT)
- **Documentation:** API docs (PDF), Postman collections, F1 help files
- **Provisioning Time:** Sandbox access within 2 weeks

---

## Next Steps

1. **Request Sandbox Credentials** (if not already received)
2. **Set Up AWS Secrets Manager** with credentials
3. **Deploy AdvancedMD integration code** (already complete)
4. **Begin Phase 1 Testing** (authentication & rate limiting)
5. **Schedule Daily Sync with AdvancedMD Team** for questions

---

**Document Owner:** Development Team Lead
**Last Review:** January 2025
**Next Review:** After Production Go-Live
