# Critical Findings from Joseph's Tech Questionnaire
## Impact Analysis & Implementation Changes Required

**Document Date:** 2025-11-20
**Source:** Joseph's Tech Questionnaire (AdvancedMD Technical Q&A)
**Status:** CRITICAL - Requires immediate implementation plan updates

---

## Executive Summary

Analysis of Joseph's Tech Questionnaire revealed **12 critical limitations** and **8 confirmed capabilities** that significantly impact the AdvancedMD integration architecture. Most notably:

🔴 **CRITICAL BLOCKERS:**
1. **No webhook support** - Must implement polling architecture
2. **No ERA retrieval via API** - Must use ODBC or UI
3. **No claim validation via API** - Must build our own validation layer
4. **No claim updates/cancellations via API** - Must use UI
5. **No payment-to-claim reconciliation via API** - Manual tracking required

✅ **CONFIRMED CAPABILITIES:**
1. Real-time eligibility checks (<30s, 99.9% success, no cost)
2. Waystar clearinghouse (99.5% claim acceptance rate)
3. Sandbox environment (2 weeks provisioning)
4. Claims appear immediately (not batched)
5. Support via Interops team (business hours)

---

## 🔴 Critical Limitations Discovered

### 1. No Webhook Support

**Finding:**
> "Do you support webhook notifications for real-time updates?"
> → "We do not support webhooks"

**Impact:**
- Cannot receive real-time notifications for:
  - Claim status changes
  - ERA arrivals
  - Patient updates
  - Appointment changes
  - Payment postings

**Required Changes:**
```typescript
// BEFORE (Planned):
app.post('/webhooks/advancedmd/claim-status', handleClaimWebhook);
app.post('/webhooks/advancedmd/era', handleERAWebhook);

// AFTER (Required):
// Implement polling jobs instead
enum PollingJob {
  POLL_CLAIM_STATUS = 'poll_claim_status',      // Every 30 minutes
  POLL_VISIT_UPDATES = 'poll_visit_updates',    // Every 15 minutes
  POLL_PATIENT_UPDATES = 'poll_patient_updates', // Every 60 minutes
}

// Cron jobs:
cron.schedule('*/30 * * * *', pollClaimStatus);   // Every 30 min
cron.schedule('*/15 * * * *', pollVisitUpdates);  // Every 15 min
cron.schedule('0 * * * *', pollPatientUpdates);   // Every hour
```

**Implementation Changes:**
1. ✅ Already planned: BullMQ job queue system
2. ✅ Already planned: Incremental sync with `@datechanged` parameter
3. ❌ NEW: Need more frequent polling schedules
4. ❌ NEW: Need status change detection algorithm
5. ❌ NEW: Need deduplication logic for poll results

---

### 2. No ERA (Electronic Remittance Advice) Retrieval via API

**Finding:**
> "Do you provide ERA (835) files via API?"
> → "No"
> "How far back can we retrieve historical ERAs?"
> → "Can't via the API"

**Impact:**
- Cannot programmatically retrieve:
  - ERA/835 files (payment explanations)
  - Insurance payment details
  - Adjustment reason codes
  - Check/EFT information

**Alternative Solutions:**

**Option 1: ODBC Connection (Recommended)**
```typescript
// Database connection to AdvancedMD reporting database
interface ODBCConfig {
  driver: 'SQL Server' | 'MySQL' | 'PostgreSQL';
  host: string;
  database: string;
  username: string;
  password: string;
  readOnly: true; // NEVER write via ODBC
}

// Query ERA data from reporting tables
async function getERAData(dateRange: DateRange): Promise<ERARecord[]> {
  const query = `
    SELECT
      era_id,
      claim_id,
      check_number,
      check_date,
      check_amount,
      adjustment_codes,
      payment_details
    FROM era_table
    WHERE check_date BETWEEN @startDate AND @endDate
  `;
  // Execute via ODBC
}
```

**Option 2: Manual UI Export (Temporary)**
- Export ERAs manually from AdvancedMD UI
- Import into MentalSpace via CSV upload
- Interim solution until ODBC configured

**Option 3: Payment Posting Only (Limited)**
- Use payment posting API to record payments
- Cannot retrieve ERA details or reconcile automatically
- Must manually track payment source

**Required Changes:**
1. ❌ Remove ERA API endpoints from implementation plan
2. ✅ Add ODBC connection configuration
3. ✅ Add manual ERA import functionality (CSV)
4. ✅ Update payment reconciliation to use manual matching

---

### 3. No Claim Validation via API

**Finding:**
> "Do you perform validation on claims before submitting to payers?"
> → "In the UI, sure. Via API no."
> "Can we get validation errors before submission?"
> → "Yes (UI only)"

**Impact:**
- AdvancedMD API does NOT validate:
  - Missing required fields
  - Invalid CPT/ICD codes
  - Invalid code combinations
  - Missing modifiers
  - Invalid date ranges
- Claims submitted via API may be rejected by clearinghouse

**Required Solution: Build Comprehensive Validation Layer**

```typescript
// New Service: packages/backend/src/services/advancedmd/claim-validator.service.ts

interface ClaimValidationRules {
  // Field-level validation
  requiredFields: string[];
  fieldFormats: Record<string, RegExp>;

  // Code validation
  validCPTCodes: Set<string>;
  validICDCodes: Set<string>;
  validModifiers: Set<string>;

  // Business rules
  cptModifierRules: Record<string, string[]>; // CPT → required modifiers
  cptICDRules: Record<string, string[]>;      // CPT → allowed ICD codes
  dateRules: {
    maxDaysBackBilled: number;
    maxFutureDays: number;
  };

  // Insurance-specific rules
  payerRules: Record<string, PayerValidationRules>;
}

class ClaimValidatorService {
  async validateClaim(charge: ChargeData): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // 1. Validate required fields
    errors.push(...this.validateRequiredFields(charge));

    // 2. Validate CPT codes
    errors.push(...this.validateCPTCodes(charge.cptCode));

    // 3. Validate ICD codes
    errors.push(...this.validateICDCodes(charge.icdCodes));

    // 4. Validate CPT-ICD combinations
    errors.push(...this.validateCodeCombinations(charge));

    // 5. Validate modifiers
    errors.push(...this.validateModifiers(charge));

    // 6. Validate dates
    errors.push(...this.validateDates(charge));

    // 7. Validate payer-specific rules
    errors.push(...this.validatePayerRules(charge));

    // 8. Validate units and amounts
    errors.push(...this.validateUnitsAndAmounts(charge));

    return {
      isValid: errors.length === 0,
      errors,
      warnings: this.generateWarnings(charge)
    };
  }

  private validateCPTCodes(cptCode: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if code exists
    if (!this.validCPTCodes.has(cptCode)) {
      errors.push({
        field: 'cptCode',
        code: 'INVALID_CPT',
        message: `CPT code ${cptCode} is not valid or not found in our database`
      });
    }

    // Check format (5 digits)
    if (!/^\d{5}$/.test(cptCode)) {
      errors.push({
        field: 'cptCode',
        code: 'INVALID_FORMAT',
        message: 'CPT code must be exactly 5 digits'
      });
    }

    return errors;
  }

  private validateCodeCombinations(charge: ChargeData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Example: 90837 (psychotherapy 60 min) requires mental health diagnosis
    if (charge.cptCode === '90837') {
      const hasValidDiagnosis = charge.icdCodes.some(icd =>
        icd.startsWith('F') // Mental health diagnoses
      );

      if (!hasValidDiagnosis) {
        errors.push({
          field: 'icdCodes',
          code: 'INVALID_COMBINATION',
          message: 'CPT 90837 requires at least one mental health diagnosis (F codes)'
        });
      }
    }

    return errors;
  }
}
```

**Validation Rules to Implement:**

1. **CPT Code Validation:**
   - Valid 5-digit format
   - Code exists in current CPT database
   - Code not expired/deleted
   - Units allowed for code (some codes allow 1 unit only)

2. **ICD-10 Code Validation:**
   - Valid format (A00-Z99.9999)
   - Code exists in current ICD-10 database
   - Code is billable (not just category)
   - Code effective date is valid

3. **CPT-ICD Combination Rules:**
   - Mental health CPT codes require mental health diagnoses
   - Medical CPT codes require appropriate medical diagnoses
   - Evaluation codes (90791) can be billed with any diagnosis

4. **Modifier Validation:**
   - Valid modifier codes (25, 59, GT, etc.)
   - Modifiers allowed for specific CPT codes
   - Multiple modifier rules (order matters)

5. **Date Validation:**
   - Service date not in future
   - Service date not older than timely filing limit (90-365 days depending on payer)
   - Patient was covered by insurance on service date

6. **Payer-Specific Rules:**
   - Medicare: No telehealth for certain codes
   - Medicaid: Prior authorization required for certain codes
   - Commercial: Some require place of service = 11 (office)

**Required Changes:**
1. ✅ Create ClaimValidatorService
2. ✅ Load CPT/ICD databases from AdvancedMD lookup APIs
3. ✅ Store validation rules in database
4. ✅ Add validation before SaveCharges API call
5. ✅ Show validation errors in UI before submission
6. ✅ Add override capability for admin users (with audit log)

---

### 4. No Claim Updates/Cancellations via API

**Finding:**
> "Can we update or cancel a claim after submission?"
> → "Yes"
> "Via API or only through your portal?"
> → "Not via API"

**Impact:**
- Cannot programmatically:
  - Cancel submitted claims
  - Update claim information
  - Add/remove CPT codes after submission
  - Void charges via API

**Workaround:**
> "Can we submit corrected claims via API?"
> → "Yes. You will need to resend the charge. When you push a charge to an
>    existing visit that has a charge, it will void the previous one and set
>    the new one. This works if the claim is not already processed."

**Solution:**

```typescript
// Corrected claim submission workflow
async function submitCorrectedClaim(
  visitId: string,
  correctedCharge: ChargeData
): Promise<CorrectionResult> {

  // 1. Check if claim already processed
  const claimStatus = await this.getClaimStatus(visitId);

  if (claimStatus.isProcessed) {
    return {
      success: false,
      error: 'Cannot void claim - already processed by insurance',
      resolution: 'Must submit corrected claim via UI or contact AdvancedMD support'
    };
  }

  // 2. If not processed, submit new charge (will auto-void old one)
  const result = await this.submitCharges({
    visitId,
    charges: [correctedCharge]
  });

  // 3. Log the correction
  await this.logClaimCorrection({
    visitId,
    originalCharge: oldCharge,
    correctedCharge,
    voidedAutomatically: true,
    timestamp: new Date()
  });

  return {
    success: true,
    voidedPreviousCharge: true,
    newChargeId: result.chargeId
  };
}
```

**UI Workflow:**
```
When user needs to correct a claim:

1. Check claim status via API
2. If NOT processed:
   → Allow re-submission (auto-voids old)
   → Show warning: "This will void the previous submission"
3. If processed:
   → Show error: "Claim already processed"
   → Provide link to AdvancedMD UI
   → Show support contact: "Contact Interops for assistance"
```

**Required Changes:**
1. ❌ Remove claim update/cancel API endpoints
2. ✅ Add claim correction workflow (re-submission)
3. ✅ Add claim status check before correction
4. ✅ Add UI warnings for corrections
5. ✅ Add audit logging for all corrections
6. ✅ Add "Open in AdvancedMD" link for processed claims

---

### 5. No Payment-to-Claim Reconciliation via API

**Finding:**
> "Can we reconcile payments to specific claims?"
> → "No"
> "Does the API provide claim-to-payment mapping?"
> → "No"
> "Can we handle split payments (partial payments on multiple claims)?"
> → "Not via the API"

**Impact:**
- Cannot programmatically:
  - Match insurance payments to specific claims
  - Track partial payments
  - Split payments across multiple claims
  - Reconcile ERA to specific service lines

**Solution: Manual Tracking System**

```typescript
// New table: payment_claim_mapping
CREATE TABLE payment_claim_mapping (
  id UUID PRIMARY KEY,
  payment_id UUID NOT NULL,
  advancedmd_charge_id VARCHAR(50) NOT NULL,
  claim_control_number VARCHAR(50),

  -- Payment details
  payment_amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50), -- 'insurance', 'patient', 'eft', 'check'
  check_number VARCHAR(50),

  -- Reconciliation
  expected_amount DECIMAL(10, 2),
  adjustment_amount DECIMAL(10, 2),
  adjustment_reason VARCHAR(255),

  -- Status
  reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES users(id),

  -- Manual tracking
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

// Service for manual reconciliation
class PaymentReconciliationService {

  // UI feature: Match payments to claims
  async suggestClaimMatches(
    payment: PaymentData
  ): Promise<ClaimMatch[]> {

    // Find potential matches based on:
    // 1. Same patient
    // 2. Similar amount
    // 3. Similar date range
    // 4. Same insurance

    const potentialMatches = await this.findPotentialMatches({
      patientId: payment.patientId,
      amount: payment.amount,
      tolerance: 0.01, // $0.01 difference allowed
      dateRange: {
        start: subDays(payment.date, 90),
        end: payment.date
      }
    });

    return potentialMatches.map(claim => ({
      claim,
      matchScore: this.calculateMatchScore(payment, claim),
      reason: this.getMatchReason(payment, claim)
    }));
  }

  // Manual reconciliation action
  async reconcilePayment(
    paymentId: string,
    claimId: string,
    userId: string
  ): Promise<void> {

    await this.db.query(`
      INSERT INTO payment_claim_mapping (
        payment_id,
        advancedmd_charge_id,
        reconciled,
        reconciled_at,
        reconciled_by
      ) VALUES ($1, $2, true, NOW(), $3)
    `, [paymentId, claimId, userId]);

    // Audit log
    await this.auditLog({
      action: 'PAYMENT_RECONCILED',
      userId,
      paymentId,
      claimId
    });
  }
}
```

**UI Component:**
```typescript
// Reconciliation dashboard
function PaymentReconciliationDashboard() {
  return (
    <div>
      <h2>Unreconciled Payments</h2>

      {unreconciledPayments.map(payment => (
        <PaymentCard payment={payment}>
          <h3>Suggested Matches</h3>

          {suggestedMatches.map(match => (
            <ClaimMatchCard
              claim={match.claim}
              matchScore={match.matchScore}
              onReconcile={() => reconcile(payment.id, match.claim.id)}
            />
          ))}

          <Button onClick={() => manuallySelectClaim(payment.id)}>
            Manually Select Claim
          </Button>
        </PaymentCard>
      ))}
    </div>
  );
}
```

**Required Changes:**
1. ✅ Create payment_claim_mapping table
2. ✅ Create PaymentReconciliationService
3. ✅ Build reconciliation dashboard UI
4. ✅ Implement smart matching algorithm
5. ✅ Add manual override capability
6. ✅ Add audit logging for all reconciliations
7. ✅ Consider ODBC for ERA data to improve matching

---

### 6. Session Token Expiration (24 Hours)

**Finding:**
> "How often do tokens/keys need to be rotated?"
> → "Every 24 hours"

**Impact:**
- Session tokens expire after 24 hours
- All API calls will fail after expiration
- Must re-authenticate to get new token

**Solution: Automatic Token Refresh**

```typescript
class AdvancedMDAuthService {
  private tokenExpiresAt: Date | null = null;
  private refreshBuffer = 30 * 60 * 1000; // 30 minutes before expiry

  async getValidToken(): Promise<string> {
    // Check if token needs refresh
    if (this.needsRefresh()) {
      await this.refreshToken();
    }

    return this.currentToken;
  }

  private needsRefresh(): boolean {
    if (!this.tokenExpiresAt) return true;

    const now = new Date();
    const expiryWithBuffer = new Date(
      this.tokenExpiresAt.getTime() - this.refreshBuffer
    );

    return now >= expiryWithBuffer;
  }

  private async refreshToken(): Promise<void> {
    // Perform two-step login
    const newToken = await this.performLogin();

    // Store token and expiration
    this.currentToken = newToken;
    this.tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Persist to database
    await this.db.query(`
      UPDATE advancedmd_config
      SET session_token = $1,
          session_expires_at = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [newToken, this.tokenExpiresAt, this.configId]);

    // Log refresh
    logger.info('AdvancedMD session token refreshed', {
      expiresAt: this.tokenExpiresAt
    });
  }
}

// Background job to refresh token proactively
cron.schedule('0 */23 * * *', async () => {
  // Refresh token every 23 hours (1 hour before expiry)
  await authService.refreshToken();
});
```

**Required Changes:**
✅ Already planned in implementation
✅ Add background cron job for proactive refresh
✅ Add token expiration monitoring/alerts

---

### 7. Eligibility Check Response Time (<30 seconds)

**Finding:**
> "What is the typical response time (milliseconds)?"
> → "It takes less than 30 seconds"

**Impact:**
- NOT real-time (30 seconds is long for UI)
- Must implement async/polling UI pattern

**Solution: Async Eligibility Checks**

```typescript
// Backend: Queue-based eligibility checks
async function checkEligibility(
  patientId: string,
  serviceDate: Date
): Promise<{ jobId: string }> {

  // Queue the eligibility check
  const job = await eligibilityQueue.add('check-eligibility', {
    patientId,
    serviceDate
  });

  return { jobId: job.id };
}

// Worker processes the check
eligibilityQueue.process('check-eligibility', async (job) => {
  const { patientId, serviceDate } = job.data;

  // Call AdvancedMD API (may take up to 30 seconds)
  const result = await advancedMDService.checkInsuranceEligibility({
    patientId,
    serviceDate
  });

  // Store result
  await db.query(`
    INSERT INTO insurance_eligibility_checks (
      patient_id,
      check_date,
      status,
      response_data,
      created_at
    ) VALUES ($1, $2, $3, $4, NOW())
  `, [patientId, serviceDate, result.status, result]);

  return result;
});

// Frontend: Polling UI
function EligibilityCheckButton() {
  const [checking, setChecking] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  async function startCheck() {
    setChecking(true);

    // Start check
    const { jobId } = await api.checkEligibility(patientId);
    setJobId(jobId);

    // Poll for result
    const result = await pollForResult(jobId);

    setChecking(false);
    showResult(result);
  }

  async function pollForResult(jobId: string): Promise<EligibilityResult> {
    while (true) {
      const status = await api.getJobStatus(jobId);

      if (status.completed) {
        return status.result;
      }

      // Wait 2 seconds before next poll
      await sleep(2000);
    }
  }

  return (
    <Button onClick={startCheck} disabled={checking}>
      {checking ? (
        <>
          <Spinner /> Checking eligibility... (may take up to 30 seconds)
        </>
      ) : (
        'Check Eligibility'
      )}
    </Button>
  );
}
```

**Required Changes:**
1. ✅ Use BullMQ for eligibility checks (already planned)
2. ✅ Add job status polling endpoint
3. ✅ Implement async UI with loading state
4. ✅ Show progress indicator (0-30 seconds)
5. ✅ Add timeout handling (>30 seconds = error)

---

### 8. Sandbox Provisioning Time (2 weeks)

**Finding:**
> "How long does it take to provision sandbox access?"
> → "2 weeks max"

**Impact:**
- Cannot start development immediately
- Need to request sandbox access NOW

**Action Items:**
- [ ] Request sandbox credentials from AdvancedMD (Joseph/Interops)
- [ ] Confirm production credentials already received
- [ ] Verify IP whitelisting requirements
- [ ] Set up separate config for sandbox vs. production

---

### 9. Waystar Clearinghouse (99.5% Acceptance Rate)

**Finding:**
> "What clearinghouse do you use for claim processing?"
> → "Waystar"
> "What is the clearinghouse's track record for claim acceptance rates?"
> → "We guarantee a 99.5% acceptance rate"

**Impact:**
- Very high acceptance rate (good!)
- 0.5% of claims may be rejected
- Need robust error handling for rejections

**Solution: Already planned**
✅ Claim rejection handling
✅ Error logging
✅ User notifications for rejections

---

### 10. Claims Appear Immediately

**Finding:**
> "How long does it take for a submitted claim to appear in the AdvancedMD
>  system?"
> → "You can submit claims anytime you want."
> "Is it immediate or batched (e.g., nightly)?"
> → Immediate

**Impact:**
- No delay in claim submission
- Can verify submission immediately

**Benefit:** ✅ Better UX, faster feedback

---

### 11. Support Hours (Business Hours Only)

**Finding:**
> "What is the typical API response time for support tickets?"
> "Business hours only or 24/7?"
> → "Business hours only"

**Impact:**
- No after-hours support
- Critical issues may wait until next business day
- Need to plan for self-service troubleshooting

**Mitigation:**
1. ✅ Comprehensive error logging
2. ✅ Detailed error messages
3. ✅ Self-service troubleshooting guide
4. ✅ Fallback to manual processes for critical operations

---

### 12. Eligibility Checks - No Cost

**Finding:**
> "Is there a per-query cost for eligibility checks?"
> → "No"

**Impact:**
- Can check eligibility frequently without cost concerns
- No need to cache/limit eligibility checks

**Benefit:**
- ✅ Check eligibility before every appointment
- ✅ Re-check if insurance changes
- ✅ Verify coverage for all service types

---

## ✅ Confirmed Capabilities

### 1. Real-Time Eligibility Verification
- Response time: <30 seconds
- Success rate: 99.9%
- No cost per check
- Covers all Waystar-connected payers (comprehensive)

### 2. Comprehensive Eligibility Data
Fields returned:
- Coverage status (active/inactive)
- Copay, coinsurance, deductible amounts
- Deductible met vs. remaining
- Out-of-pocket max and amounts met
- Prior authorization requirements (varies by insurance)
- Service-type-specific coverage (therapy, evaluation, etc.)
- Dependent coverage

### 3. Duplicate Patient Detection
- Automatic duplicate warnings
- Can search by: name, DOB, MRN, SSN
- Prevents duplicate patient creation

### 4. Claims Submission
- 837P professional claims format
- Individual or batch submission
- Immediate appearance in system
- 99.5% acceptance rate via Waystar

### 5. Provider/Patient Synchronization
- Full CRUD via API
- NPI, taxonomy codes, license numbers
- Demographics, insurance, contact info
- Appointment history retrieval

### 6. CPT/ICD Code Management
- Can retrieve code lists via API
- Updated annually
- Payer-specific fee schedules (user-configured)
- Can auto-populate charge amounts

### 7. Audit Logging
- API activity logged
- Can see who accessed what and when
- Can retrieve audit logs via API
- Retention period: TBD (need to confirm)

### 8. Testing Support
- Sandbox environment available
- Test patient records provided
- Test payers for eligibility checks
- Test claims (auto-accept and reject scenarios)
- Parallel processing during go-live supported

---

## 📋 Implementation Changes Required

### High Priority (Must Do)

| #  | Change                                  | Reason                           | Effort |
|----|-----------------------------------------|----------------------------------|--------|
| 1  | Remove all webhook-related code         | No webhook support               | Low    |
| 2  | Implement polling architecture          | Replace webhooks                 | High   |
| 3  | Build claim validation layer            | No API validation                | High   |
| 4  | Add ODBC connection for ERA data        | No ERA via API                   | Medium |
| 5  | Create payment reconciliation UI        | No auto-reconciliation           | Medium |
| 6  | Update claim correction workflow        | No API updates, only resubmit    | Medium |
| 7  | Implement async eligibility checks      | 30-second response time          | Medium |
| 8  | Request sandbox credentials             | 2 week provisioning              | Low    |

### Medium Priority (Should Do)

| #  | Change                                  | Reason                           | Effort |
|----|-----------------------------------------|----------------------------------|--------|
| 9  | Add manual ERA import (CSV)             | Temporary solution for ERA       | Low    |
| 10 | Build claim validation rules engine     | Complex business rules           | High   |
| 11 | Add "Open in AdvancedMD" links          | For processed claims             | Low    |
| 12 | Create self-service troubleshooting     | Business hours support only      | Medium |
| 13 | Add smart payment matching algorithm    | Help with reconciliation         | Medium |

### Low Priority (Nice to Have)

| #  | Change                                  | Reason                           | Effort |
|----|-----------------------------------------|----------------------------------|--------|
| 14 | Add eligibility check caching           | Optimize performance             | Low    |
| 15 | Build admin override for validation     | Handle edge cases                | Low    |
| 16 | Create reconciliation reports           | Analytics                        | Low    |

---

## 📅 Updated Implementation Timeline

### Phase 1: Foundation (Weeks 1-2) - NO CHANGES
- Authentication & token management ✅
- Rate limiter ✅
- Database schema ✅

### Phase 2: Patient Sync (Weeks 3-4) - NO CHANGES
- Patient CRUD operations ✅
- Incremental sync ✅

### Phase 3: Visit & Billing (Weeks 5-6) - MAJOR CHANGES

**BEFORE:**
- Visit creation ✅
- Charge submission ✅
- Webhook handlers for claim status ❌

**AFTER:**
- Visit creation ✅
- **Claim validation layer** ⭐ NEW
- Charge submission ✅
- **Polling for claim status** ⭐ CHANGED
- **Claim correction workflow** ⭐ NEW

### Phase 4: Insurance (Week 7) - MINOR CHANGES

**BEFORE:**
- Insurance sync ✅
- Eligibility checks ✅
- Real-time webhook notifications ❌

**AFTER:**
- Insurance sync ✅
- **Async eligibility checks** ⭐ CHANGED
- **Job status polling** ⭐ NEW

### Phase 5: Payment Processing (NEW - Week 8)

**BEFORE:**
- ERA retrieval via API ❌
- Auto-payment reconciliation ❌

**AFTER:**
- **ODBC setup for ERA data** ⭐ NEW
- **Manual ERA import (CSV)** ⭐ NEW
- **Payment reconciliation UI** ⭐ NEW
- **Smart payment matching** ⭐ NEW

### Phase 6: Incremental Sync (Week 9) - MAJOR CHANGES

**BEFORE:**
- Webhook-driven sync ❌

**AFTER:**
- **Polling-based incremental sync** ⭐ CHANGED
- **Cron jobs for scheduled polling** ⭐ NEW
  - Claims status: Every 30 min
  - Visits: Every 15 min
  - Patients: Every hour

### Phase 7: Admin Dashboard (Week 10) - ADDITIONS

**BEFORE:**
- Sync monitoring ✅
- Rate limit status ✅

**AFTER:**
- Sync monitoring ✅
- Rate limit status ✅
- **Payment reconciliation dashboard** ⭐ NEW
- **Claim validation override UI** ⭐ NEW
- **Manual ERA import interface** ⭐ NEW

### Phase 8: Testing (Week 11) - ADDITIONS

**BEFORE:**
- Unit tests ✅
- Integration tests ✅
- E2E tests ✅

**AFTER:**
- Unit tests ✅
- Integration tests ✅
- E2E tests ✅
- **Claim validation tests** ⭐ NEW
- **Polling mechanism tests** ⭐ NEW
- **ODBC connection tests** ⭐ NEW

### Phase 9: Pilot (Week 12) - NO CHANGES
### Phase 10: Production (Week 13-14) - NO CHANGES

---

## 🚨 Action Items for Next Steps

### Immediate (This Week)
- [ ] Request sandbox credentials from AdvancedMD (Joseph)
- [ ] Confirm ODBC connection details for ERA access
- [ ] Design claim validation rules database schema
- [ ] Prototype async eligibility check UI
- [ ] Update implementation plan document

### Short Term (Next 2 Weeks)
- [ ] Build claim validation service skeleton
- [ ] Implement token auto-refresh cron job
- [ ] Design payment reconciliation UI mockups
- [ ] Research ODBC libraries for Node.js/TypeScript
- [ ] Create polling scheduler architecture

### Medium Term (Weeks 3-4)
- [ ] Implement CPT/ICD validation rules
- [ ] Build polling jobs for claim status
- [ ] Set up ODBC connection to AdvancedMD
- [ ] Create manual ERA import feature
- [ ] Build payment matching algorithm

---

## 📊 Risk Assessment Changes

### New Risks Identified

| Risk                                    | Probability | Impact | Mitigation                              |
|-----------------------------------------|-------------|--------|-----------------------------------------|
| No webhook support slows sync           | High        | Medium | Implement aggressive polling            |
| Claim validation errors high            | Medium      | High   | Comprehensive validation layer          |
| Payment reconciliation manual effort    | High        | Medium | Smart matching algorithm + ODBC         |
| 30s eligibility checks hurt UX          | Medium      | Medium | Async UI with clear expectations        |
| ODBC complexity                         | Medium      | Medium | Use proven libraries, test thoroughly   |
| Business hours support only             | Low         | Medium | Self-service tools, detailed logging    |

---

## 📖 References

- [Joseph's Tech Questionnaire - Full Text](./JOSEPHS_TECH_QUESTIONNAIRE.txt)
- [AdvancedMD Integration Plan](../ADVANCEDMD_INTEGRATION_PLAN.md)
- [AdvancedMD API Limits](./api-sandbox/AdvancedMD API Limits.pdf)
- [AdvancedMD Common Workflows](./api-sandbox/AdvancedMD Common Workflows.pdf)

---

**Document Status:** READY FOR REVIEW
**Next Update:** After sandbox access received
**Owner:** Development Team
**Last Reviewed:** 2025-11-20
