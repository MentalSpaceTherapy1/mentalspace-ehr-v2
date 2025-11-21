# AdvancedMD Billing Integration - Comprehensive Implementation Plan

## Executive Summary

This document outlines the complete integration strategy between MentalSpace EHR and AdvancedMD Practice Management System for billing, claims, insurance verification, and payment processing.

**Integration Scope:**
- Patient demographics synchronization (bidirectional)
- Appointment/visit data synchronization
- Billing charges submission (CPT/ICD codes)
- Insurance verification
- Claims management
- Payment processing
- Clinical data exchange (limited scope)

---

## 1. API Overview & Authentication

### 1.1 AdvancedMD API Architecture

**API Types:**
- **Legacy XMLRPC API**: Primary billing/practice management endpoints
- **REST PM API**: Modern practice management endpoints
- **REST EHR API**: Clinical data endpoints
- **Scheduler API**: Appointment management (JSON-based)

**Base URLs (Dynamic via Login Redirect):**
```
Initial Login: https://partnerlogin.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx

After successful login, redirect URLs are returned:
- XMLRPC: {baseURL}/{path}/xmlrpc/processrequest.aspx
- REST PM: {baseURL}/api/{host}/{appname}
- REST EHR: {baseURL}/ehr-api/{host}/{appname}
- Scheduler: https://login-app.advancedmd.com/API/scheduler/help/index.html
```

### 1.2 Authentication Flow

**Two-Step Login Process:**

**Step 1: Partner Login** (Get redirect URLs)
```json
POST https://partnerlogin.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx

{
  "ppmdmsg": {
    "@action": "login",
    "@class": "login",
    "@msgtime": "04/02/2021 2:07:00 PM",
    "@username": "CAHCAPI",
    "@psw": "1o7Dn4p1",
    "@officecode": 990207,
    "@appname": "API"
  }
}

Response includes:
- webserver URL (for building redirect URLs)
- Redirect_URL_XLMRPC
- Redirect_URL_REST_PM
- Redirect_URL_REST_EHR
```

**Step 2: Redirect Login** (Get session token)
```json
POST {Redirect_URL_XLMRPC}
(Same payload as Step 1)

Response:
- AMD_TOKEN: Session token valid for 24 hours
```

**Session Management:**
- Token stored in Cookie: `token={AMD_TOKEN}`
- Token expires after 24 hours
- Must re-authenticate after expiration

### 1.3 Credentials

```
Office Key: 990207

API Authentication (Programmatic):
Username: CAHCAPI
Password: 1o7Dn4p1

Application Login (UI):
Username: ADMIN
Password: Bing@@0912
```

---

## 2. Rate Limiting & Performance Requirements

### 2.1 API Rate Limits

**Peak Hours:** 6:00 AM - 6:00 PM Mountain Time, Monday-Friday

**Tier 1 - High Impact Calls:**
- Peak: 1 call/minute
- Off-Peak: 60 calls/minute
- Examples: `GETUPDATEDVISITS`, `GETUPDATEDPATIENTS`

**Tier 2 - Medium Impact Calls:**
- Peak: 12 calls/minute
- Off-Peak: 120 calls/minute
- Examples: `SAVECHARGES`, `GETDEMOGRAPHIC`, `GETDATEVISITS`, `UPDVISITWITHNEWCHARGES`, `GETTXHISTORY`, `GETAPPTS`, `GETPAYMENTDETAILDATA`

**Tier 3 - Low Impact Calls:**
- Peak: 24 calls/minute
- Off-Peak: 120 calls/minute
- Examples: All `LOOKUP*` APIs

### 2.2 Rate Limiting Strategy

**Implementation Requirements:**
1. **Rate Limiter Service** with tiered queues:
   - Separate queues for Tier 1, Tier 2, Tier 3
   - Time-aware scheduling (detect peak hours)
   - Exponential backoff on rate limit errors

2. **Job Queue System:**
   - Background job processor (Bull/BullMQ)
   - Persistent queue (Redis)
   - Retry logic with jitter
   - Dead letter queue for failed jobs

3. **Synchronization Windows:**
   - Schedule high-impact syncs during off-peak hours
   - Batch operations where possible
   - Incremental sync using `@datechanged` parameter

---

## 3. Standard Integration Workflows

### 3.1 Workflow: Add Patient and Charges to AdvancedMD

**Use Case:** After a completed appointment in MentalSpace, send billing data to AdvancedMD

**Steps:**

1. **Check if Patient Exists** (Lookup)
   ```
   API: LookUpPatient
   Input: Patient name, DOB, or custom identifier
   Output: Patient ID or null
   ```

2. **Add/Update Patient** (if needed)
   ```
   API: AddPatient (if new) or UpdatePatient (if exists)
   Input: Demographics (name, DOB, address, phone, email, etc.)
   Output: Patient ID

   Dependencies:
   - LookUpProfile: Get valid provider profile ID
   ```

3. **Add Insurance** (if applicable)
   ```
   API: AddInsurance
   Input: Insurance carrier, policy number, subscriber info
   Output: Insurance coverage ID
   ```

4. **Add Visit** (Billable encounter)
   ```
   API: AddVisit
   Input: Patient ID, appointment date, provider, facility
   Output: Visit ID
   ```

5. **Save Charges** (CPT/ICD codes)
   ```
   API: SaveCharges
   Input: Visit ID, procedure codes, diagnosis codes, modifiers

   Dependencies:
   - LookUpProcCode: Get internal ID for CPT code
   - Can use ICD code directly (no lookup needed)
   ```

### 3.2 Workflow: Pull Demographics from AdvancedMD

**Use Case:** Sync patient updates made in AdvancedMD back to MentalSpace

**Incremental Sync:**
```
API: GetUpdatedPatients
Input:
  - @datechanged: Last sync timestamp
  - @msgtime: Current timestamp
Output: All patients added/updated between timestamps

For detailed demographics:
  API: GetDemographic (class: "api" or "demographic")
  Input: Patient ID
  Output: Complete demographic data, insurance, documents
```

### 3.3 Workflow: Pull Appointments and Charges

**Use Case:** Sync appointment updates and billing changes from AdvancedMD

```
API: GetUpdatedVisits
Input:
  - @datechanged: Last sync timestamp
  - @msgtime: Current timestamp
  - Include "charge" node for billing data
Output: All visits/appointments updated, with charges if specified
```

### 3.4 Workflow: Insurance Eligibility Check

**Use Case:** Verify patient insurance before appointment

**Steps:**

1. **Trigger Eligibility Check**
   ```
   API: Check insurance Eligibility
   Input: Patient ID, insurance coverage ID
   Output: 270 Eligibility Request sent to Change Healthcare clearinghouse
   ```

2. **Retrieve Eligibility Response**
   ```
   API: Check Insurance Eligilibility Response
   Input: Request ID from step 1
   Output: 271 Eligibility Response from clearinghouse

   Note: Response content varies by carrier (some detailed, some minimal)
   ```

---

## 4. Key API Endpoints by Category

### 4.1 Patient Management (PM)

| Endpoint | Type | Purpose | Rate Tier |
|----------|------|---------|-----------|
| `GetUpdatedPatients` | XMLRPC | Get patients changed since last sync | Tier 1 (High) |
| `GetDemographic` | XMLRPC | Get full patient demographics | Tier 2 (Medium) |
| `AddPatient` | XMLRPC | Create new patient | Tier 3 (Low) |
| `UpdatePatient` | XMLRPC | Update patient demographics | Tier 3 (Low) |
| `LookUpPatient` | XMLRPC | Search for patient | Tier 3 (Low) |
| `GetTxHistory` | XMLRPC | Get patient transaction history | Tier 2 (Medium) |

### 4.2 Visits/Appointments (PM)

| Endpoint | Type | Purpose | Rate Tier |
|----------|------|---------|-----------|
| `GetUpdatedVisits` | XMLRPC | Get visits changed since last sync | Tier 1 (High) |
| `GetDateVisits` | XMLRPC | Get visits for specific date range | Tier 2 (Medium) |
| `AddVisit` | XMLRPC | Create billable visit | Tier 3 (Low) |
| `GetAppointments` | REST | Get scheduler appointments | Tier 2 (Medium) |

### 4.3 Billing/Charges (PM)

| Endpoint | Type | Purpose | Rate Tier |
|----------|------|---------|-----------|
| `SaveCharges` | XMLRPC | Submit billing charges (CPT/ICD) | Tier 2 (Medium) |
| `UpdateVisitWithNewCharges` | XMLRPC | Update visit with charges | Tier 2 (Medium) |
| `GetChargeDetailData` | XMLRPC | Get charge details | Tier 2 (Medium) |
| `VoidCharges` | XMLRPC | Void/delete charges | Tier 3 (Low) |
| `LookUpProcCode` | XMLRPC | Get internal ID for CPT code | Tier 3 (Low) |
| `LookUpDiagCode` | XMLRPC | Get internal ID for ICD code | Tier 3 (Low) |
| `LookUpModCode` | XMLRPC | Get internal ID for modifier | Tier 3 (Low) |

### 4.4 Insurance (PM)

| Endpoint | Type | Purpose | Rate Tier |
|----------|------|---------|-----------|
| `AddInsurance` | XMLRPC | Add insurance to patient | Tier 3 (Low) |
| `UpdateInsurance` | XMLRPC | Update insurance coverage | Tier 3 (Low) |
| `Check insurance Eligibility` | XMLRPC | Send 270 eligibility request | Tier 3 (Low) |
| `Check Insurance Eligilibility Response` | XMLRPC | Get 271 eligibility response | Tier 3 (Low) |
| `LookUpCarrier` | XMLRPC | Search insurance carriers | Tier 3 (Low) |

### 4.5 Payments (PM)

| Endpoint | Type | Purpose | Rate Tier |
|----------|------|---------|-----------|
| `AddPayment Patient REST` | REST | Record patient payment | Tier 3 (Low) |
| `AddPayment Insurance REST` | REST | Record insurance payment | Tier 3 (Low) |
| `GetPaymentDetailData` | XMLRPC | Get payment details | Tier 2 (Medium) |
| `GetPaymentCodes` | XMLRPC | Get payment method codes | Tier 3 (Low) |

### 4.6 Claims (PM)

| Endpoint | Type | Purpose | Rate Tier |
|----------|------|---------|-----------|
| `Check ClaimStatus` | XMLRPC | Check claim submission status | Tier 3 (Low) |
| `ClaimStatus List` | XMLRPC | Get all claim statuses | Tier 3 (Low) |

### 4.7 Lookups (PM) - All Tier 3

| Endpoint | Purpose |
|----------|---------|
| `LookUpProfile` | Get provider profile IDs |
| `LookUpProvider` | Search providers |
| `LookUpFacility` | Search facilities |
| `LookUpFinClass` | Get financial class codes |
| `LookUpAcctType` | Get account type codes |
| `LookUpZipCode` | Validate/lookup zip codes |

### 4.8 EHR Endpoints (Limited Scope for Integration)

| Endpoint | Type | Purpose |
|----------|------|---------|
| `GetEhrNotes` | REST | Get clinical notes |
| `AddEhrNote` | REST | Add clinical note |
| `GetEhrTemplates` | REST | Get note templates |

**Note:** Clinical notes remain in MentalSpace. EHR endpoints used only if needed for specific workflows.

---

## 5. Database Schema Changes

### 5.1 New Tables

#### `advancedmd_config`
Configuration for AdvancedMD connection and sync settings.

```sql
CREATE TABLE advancedmd_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_key VARCHAR(50) NOT NULL,
  api_username VARCHAR(255) NOT NULL,
  api_password_encrypted TEXT NOT NULL, -- Encrypted
  app_name VARCHAR(50) NOT NULL DEFAULT 'API',

  -- Redirect URLs (cached after login)
  redirect_url_xmlrpc TEXT,
  redirect_url_rest_pm TEXT,
  redirect_url_rest_ehr TEXT,
  redirect_url_stream_pm TEXT,

  -- Session management
  session_token TEXT,
  session_expires_at TIMESTAMPTZ,

  -- Sync settings
  last_patient_sync_at TIMESTAMPTZ,
  last_visit_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_advancedmd_config_session_expires ON advancedmd_config(session_expires_at);
```

#### `advancedmd_patients`
Mapping between MentalSpace patients and AdvancedMD patients.

```sql
CREATE TABLE advancedmd_patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- AdvancedMD identifiers
  amd_patient_id VARCHAR(50) NOT NULL,
  amd_chart_number VARCHAR(50),
  amd_account_number VARCHAR(50),

  -- Sync metadata
  last_synced_to_amd_at TIMESTAMPTZ,
  last_synced_from_amd_at TIMESTAMPTZ,
  sync_status VARCHAR(50), -- 'synced', 'pending', 'error', 'conflict'
  sync_error TEXT,

  -- Demographics hash (for change detection)
  demographics_hash VARCHAR(64),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(patient_id),
  UNIQUE(amd_patient_id)
);

CREATE INDEX idx_amd_patients_patient_id ON advancedmd_patients(patient_id);
CREATE INDEX idx_amd_patients_amd_id ON advancedmd_patients(amd_patient_id);
CREATE INDEX idx_amd_patients_sync_status ON advancedmd_patients(sync_status);
```

#### `advancedmd_visits`
Mapping between MentalSpace appointments and AdvancedMD visits.

```sql
CREATE TABLE advancedmd_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

  -- AdvancedMD identifiers
  amd_visit_id VARCHAR(50) NOT NULL,
  amd_patient_id VARCHAR(50) NOT NULL,

  -- Visit details
  visit_date TIMESTAMPTZ NOT NULL,
  visit_type VARCHAR(100),
  provider_id VARCHAR(50),
  facility_id VARCHAR(50),

  -- Billing status
  charges_submitted BOOLEAN DEFAULT false,
  charges_submitted_at TIMESTAMPTZ,

  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(50), -- 'synced', 'pending', 'error'
  sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(appointment_id),
  UNIQUE(amd_visit_id)
);

CREATE INDEX idx_amd_visits_appointment_id ON advancedmd_visits(appointment_id);
CREATE INDEX idx_amd_visits_amd_id ON advancedmd_visits(amd_visit_id);
CREATE INDEX idx_amd_visits_charges_submitted ON advancedmd_visits(charges_submitted);
CREATE INDEX idx_amd_visits_sync_status ON advancedmd_visits(sync_status);
```

#### `advancedmd_charges`
Billing charges submitted to AdvancedMD.

```sql
CREATE TABLE advancedmd_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amd_visit_id VARCHAR(50) NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

  -- CPT/Procedure codes
  cpt_code VARCHAR(10) NOT NULL,
  amd_proc_code_id VARCHAR(50), -- Internal AdvancedMD ID
  units INTEGER DEFAULT 1,
  charge_amount DECIMAL(10, 2),

  -- ICD/Diagnosis codes (array)
  icd_codes TEXT[], -- ['F41.1', 'F43.10']

  -- Modifiers
  modifiers TEXT[], -- ['25', 'GT']

  -- Submission metadata
  submitted_at TIMESTAMPTZ,
  submission_response TEXT, -- JSON response from AdvancedMD
  submission_status VARCHAR(50), -- 'success', 'error', 'pending'
  submission_error TEXT,

  -- Billing status
  billed BOOLEAN DEFAULT false,
  paid BOOLEAN DEFAULT false,
  voided BOOLEAN DEFAULT false,
  voided_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_amd_charges_visit_id ON advancedmd_charges(amd_visit_id);
CREATE INDEX idx_amd_charges_appointment_id ON advancedmd_charges(appointment_id);
CREATE INDEX idx_amd_charges_submission_status ON advancedmd_charges(submission_status);
CREATE INDEX idx_amd_charges_billed ON advancedmd_charges(billed);
```

#### `advancedmd_insurance`
Patient insurance coverage in AdvancedMD.

```sql
CREATE TABLE advancedmd_insurance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amd_patient_id VARCHAR(50) NOT NULL,

  -- Insurance details
  amd_coverage_id VARCHAR(50), -- AdvancedMD insurance coverage ID
  carrier_name VARCHAR(255),
  carrier_code VARCHAR(50),
  policy_number VARCHAR(100),
  group_number VARCHAR(100),

  -- Subscriber info
  subscriber_name VARCHAR(255),
  subscriber_dob DATE,
  subscriber_ssn VARCHAR(11),
  relationship_to_patient VARCHAR(50), -- 'self', 'spouse', 'child', etc.

  -- Coverage details
  coverage_type VARCHAR(50), -- 'primary', 'secondary', 'tertiary'
  effective_date DATE,
  termination_date DATE,

  -- Eligibility check
  last_eligibility_check_at TIMESTAMPTZ,
  eligibility_status VARCHAR(50), -- 'active', 'inactive', 'unknown'
  eligibility_response TEXT, -- JSON 271 response

  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_amd_insurance_patient_id ON advancedmd_insurance(patient_id);
CREATE INDEX idx_amd_insurance_amd_patient_id ON advancedmd_insurance(amd_patient_id);
CREATE INDEX idx_amd_insurance_coverage_type ON advancedmd_insurance(coverage_type);
```

#### `advancedmd_sync_log`
Audit log for all sync operations.

```sql
CREATE TABLE advancedmd_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  sync_type VARCHAR(50) NOT NULL, -- 'patient', 'visit', 'charge', 'insurance'
  sync_direction VARCHAR(20) NOT NULL, -- 'to_amd', 'from_amd'

  -- Operation details
  operation VARCHAR(50), -- 'create', 'update', 'delete', 'sync'
  entity_id UUID, -- Reference to patient_id, appointment_id, etc.
  amd_entity_id VARCHAR(50), -- AdvancedMD entity ID

  -- Request/Response
  request_payload TEXT, -- JSON
  response_payload TEXT, -- JSON

  -- Status
  status VARCHAR(50), -- 'success', 'error', 'retry'
  error_message TEXT,
  http_status_code INTEGER,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_amd_sync_log_sync_type ON advancedmd_sync_log(sync_type);
CREATE INDEX idx_amd_sync_log_status ON advancedmd_sync_log(status);
CREATE INDEX idx_amd_sync_log_started_at ON advancedmd_sync_log(started_at);
CREATE INDEX idx_amd_sync_log_entity_id ON advancedmd_sync_log(entity_id);
```

#### `advancedmd_rate_limit_state`
Track API rate limiting state.

```sql
CREATE TABLE advancedmd_rate_limit_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  tier VARCHAR(20) NOT NULL, -- 'tier1', 'tier2', 'tier3'
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  call_count INTEGER DEFAULT 0,
  limit_per_window INTEGER NOT NULL,

  is_peak_hours BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tier, window_start)
);

CREATE INDEX idx_amd_rate_limit_tier_window ON advancedmd_rate_limit_state(tier, window_start);
```

### 5.2 Schema Updates to Existing Tables

#### Update `appointments` table
Add billing-related fields if not present:

```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cpt_codes TEXT[]; -- ['90834', '90837']
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS icd_codes TEXT[]; -- ['F41.1', 'F43.10']
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS billing_submitted BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS billing_submitted_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50); -- 'pending', 'submitted', 'billed', 'paid', 'error'
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS billing_notes TEXT;
```

#### Update `patients` table
Add AdvancedMD sync flag:

```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sync_to_advancedmd BOOLEAN DEFAULT true;
```

---

## 6. Backend Services Architecture

### 6.1 Service Structure

```
packages/backend/src/services/advancedmd/
├── advancedmd.service.ts          # Main service orchestrator
├── auth.service.ts                 # Authentication & session management
├── rate-limiter.service.ts         # Rate limiting logic
├── patient-sync.service.ts         # Patient synchronization
├── visit-sync.service.ts           # Visit/appointment synchronization
├── charge-sync.service.ts          # Billing charges submission
├── insurance-sync.service.ts       # Insurance management
├── lookup.service.ts               # Lookup/reference data caching
├── webhook-handler.service.ts      # Handle AdvancedMD webhooks (if available)
└── types/
    ├── api-request.types.ts        # Request type definitions
    ├── api-response.types.ts       # Response type definitions
    └── sync.types.ts               # Sync operation types
```

### 6.2 Core Services

#### 6.2.1 `advancedmd.service.ts`

Main orchestrator for all AdvancedMD operations.

**Responsibilities:**
- Initialize and configure AdvancedMD connection
- Coordinate sync operations
- Manage background jobs
- Handle errors and retries

**Key Methods:**
```typescript
class AdvancedMDService {
  // Initialization
  async initialize(): Promise<void>
  async testConnection(): Promise<boolean>

  // Patient operations
  async syncPatientToAMD(patientId: string): Promise<void>
  async syncPatientFromAMD(amdPatientId: string): Promise<void>
  async syncAllPatientsIncremental(): Promise<SyncResult>

  // Visit operations
  async createVisit(appointmentId: string): Promise<string> // Returns AMD visit ID
  async syncVisitToAMD(appointmentId: string): Promise<void>
  async syncVisitsIncremental(): Promise<SyncResult>

  // Billing operations
  async submitCharges(appointmentId: string): Promise<void>
  async voidCharges(chargeId: string): Promise<void>

  // Insurance operations
  async addInsurance(patientId: string, insuranceData: InsuranceData): Promise<void>
  async checkEligibility(patientId: string): Promise<EligibilityResult>

  // Sync orchestration
  async runFullSync(): Promise<SyncReport>
  async runIncrementalSync(): Promise<SyncReport>
}
```

#### 6.2.2 `auth.service.ts`

Handles AdvancedMD authentication and session management.

**Responsibilities:**
- Perform two-step login
- Cache and refresh session tokens
- Manage redirect URLs
- Handle token expiration

**Key Methods:**
```typescript
class AdvancedMDAuthService {
  async login(): Promise<AuthResult>
  async getValidToken(): Promise<string>
  async refreshTokenIfNeeded(): Promise<void>
  async getRedirectUrl(type: 'xmlrpc' | 'rest_pm' | 'rest_ehr'): Promise<string>

  private async performPartnerLogin(): Promise<LoginStep1Response>
  private async performRedirectLogin(): Promise<LoginStep2Response>
  private async cacheSession(token: string, redirectUrls: RedirectUrls): Promise<void>
}
```

#### 6.2.3 `rate-limiter.service.ts`

Implements tiered rate limiting with peak hour detection.

**Responsibilities:**
- Track API call rates per tier
- Detect peak hours (6 AM - 6 PM MT, Mon-Fri)
- Queue requests when limit reached
- Implement exponential backoff

**Key Methods:**
```typescript
class AdvancedMDRateLimiterService {
  async checkAndWait(apiCall: string): Promise<void>
  async recordCall(tier: RateTier): Promise<void>

  private isPeakHours(): boolean
  private getCurrentLimit(tier: RateTier): number
  private async waitForSlot(tier: RateTier): Promise<void>
  private getTierForApiCall(apiCall: string): RateTier
}

enum RateTier {
  TIER1_HIGH_IMPACT = 'tier1',
  TIER2_MEDIUM_IMPACT = 'tier2',
  TIER3_LOW_IMPACT = 'tier3'
}

const TIER_MAPPING = {
  'getupdatedvisits': RateTier.TIER1_HIGH_IMPACT,
  'getupdatedpatients': RateTier.TIER1_HIGH_IMPACT,
  'savecharges': RateTier.TIER2_MEDIUM_IMPACT,
  'getdemographic': RateTier.TIER2_MEDIUM_IMPACT,
  'lookup*': RateTier.TIER3_LOW_IMPACT,
  // ... etc
};
```

#### 6.2.4 `patient-sync.service.ts`

Bidirectional patient synchronization.

**Responsibilities:**
- Push patient demographics to AdvancedMD
- Pull patient updates from AdvancedMD
- Detect and resolve conflicts
- Map MentalSpace fields to AMD fields

**Key Methods:**
```typescript
class AdvancedMDPatientSyncService {
  // Push to AdvancedMD
  async createPatientInAMD(patientId: string): Promise<string> // Returns AMD patient ID
  async updatePatientInAMD(patientId: string): Promise<void>

  // Pull from AdvancedMD
  async pullUpdatedPatients(since: Date): Promise<Patient[]>
  async pullPatientDetails(amdPatientId: string): Promise<PatientData>
  async updateLocalPatient(amdPatientData: AMDPatientData): Promise<void>

  // Conflict resolution
  async detectConflicts(patientId: string): Promise<Conflict[]>
  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>

  // Mapping
  private mapToAMDFormat(patient: Patient): AMDPatientPayload
  private mapFromAMDFormat(amdPatient: AMDPatientData): Partial<Patient>
}
```

#### 6.2.5 `visit-sync.service.ts`

Visit/appointment synchronization.

**Responsibilities:**
- Create billable visits in AdvancedMD after appointments
- Sync appointment status changes
- Link MentalSpace appointments to AMD visits

**Key Methods:**
```typescript
class AdvancedMDVisitSyncService {
  async createVisitForAppointment(appointmentId: string): Promise<string>
  async syncVisitUpdates(since: Date): Promise<void>
  async linkAppointmentToVisit(appointmentId: string, amdVisitId: string): Promise<void>

  private mapAppointmentToVisit(appointment: Appointment): AMDVisitPayload
}
```

#### 6.2.6 `charge-sync.service.ts`

Billing charges submission and management.

**Responsibilities:**
- Submit CPT/ICD codes to AdvancedMD
- Lookup procedure codes (CPT → AMD internal IDs)
- Track charge submission status
- Void charges when needed

**Key Methods:**
```typescript
class AdvancedMDChargeSyncService {
  async submitChargesForAppointment(appointmentId: string): Promise<ChargeSubmissionResult>
  async voidCharges(chargeId: string, reason: string): Promise<void>

  // Lookups (cached)
  async lookupProcCode(cptCode: string): Promise<string> // Returns AMD internal ID
  async lookupDiagCode(icdCode: string): Promise<string>
  async lookupModifierCode(modifierCode: string): Promise<string>

  private buildChargesPayload(appointment: Appointment): AMDChargesPayload
  private validateCodes(cptCodes: string[], icdCodes: string[]): ValidationResult
}
```

#### 6.2.7 `insurance-sync.service.ts`

Insurance verification and management.

**Responsibilities:**
- Add/update insurance in AdvancedMD
- Check eligibility via 270/271 transactions
- Parse and store eligibility responses

**Key Methods:**
```typescript
class AdvancedMDInsuranceSyncService {
  async addInsurance(patientId: string, insuranceData: InsuranceData): Promise<string>
  async updateInsurance(coverageId: string, insuranceData: InsuranceData): Promise<void>
  async checkEligibility(patientId: string, coverageId: string): Promise<EligibilityResult>

  private parse271Response(response: string): EligibilityData
  private mapInsuranceToAMD(insurance: Insurance): AMDInsurancePayload
}
```

#### 6.2.8 `lookup.service.ts`

Caching service for reference data (providers, facilities, codes, etc.).

**Responsibilities:**
- Cache lookup results to avoid repeated API calls
- Refresh cache periodically
- Provide fast local lookups

**Key Methods:**
```typescript
class AdvancedMDLookupService {
  async getProfile(profileName: string): Promise<string>
  async getProvider(providerName: string): Promise<AMDProvider>
  async getFacility(facilityName: string): Promise<AMDFacility>
  async getCarrier(carrierName: string): Promise<AMDCarrier>

  async refreshCache(): Promise<void>

  private cache: Map<string, CachedLookup>
}
```

### 6.3 Background Jobs (Bull Queue)

#### Job Types

```typescript
enum AdvancedMDJobType {
  SYNC_PATIENT_TO_AMD = 'sync_patient_to_amd',
  SYNC_PATIENT_FROM_AMD = 'sync_patient_from_amd',
  SYNC_PATIENTS_INCREMENTAL = 'sync_patients_incremental',

  CREATE_VISIT = 'create_visit',
  SYNC_VISITS_INCREMENTAL = 'sync_visits_incremental',

  SUBMIT_CHARGES = 'submit_charges',

  CHECK_ELIGIBILITY = 'check_eligibility',

  REFRESH_LOOKUPS = 'refresh_lookups',

  FULL_SYNC = 'full_sync'
}
```

#### Job Scheduling

```typescript
// Incremental patient sync (every hour, off-peak)
cron.schedule('0 * * * *', async () => {
  if (!rateLimiter.isPeakHours()) {
    await advancedMDQueue.add(AdvancedMDJobType.SYNC_PATIENTS_INCREMENTAL, {});
  }
});

// Incremental visit sync (every 30 minutes, off-peak)
cron.schedule('*/30 * * * *', async () => {
  if (!rateLimiter.isPeakHours()) {
    await advancedMDQueue.add(AdvancedMDJobType.SYNC_VISITS_INCREMENTAL, {});
  }
});

// Refresh lookup cache (daily, 2 AM)
cron.schedule('0 2 * * *', async () => {
  await advancedMDQueue.add(AdvancedMDJobType.REFRESH_LOOKUPS, {});
});
```

---

## 7. API Routes

### 7.1 AdvancedMD Integration Routes

**Base Path:** `/api/advancedmd`

```typescript
// Configuration
GET    /api/advancedmd/config                  // Get current config
POST   /api/advancedmd/config                  // Update config
POST   /api/advancedmd/test-connection         // Test connection

// Patient sync
POST   /api/advancedmd/patients/:id/sync       // Sync specific patient to AMD
POST   /api/advancedmd/patients/sync-all       // Trigger incremental sync
GET    /api/advancedmd/patients/:id/status     // Get sync status

// Visit/appointment sync
POST   /api/advancedmd/appointments/:id/create-visit     // Create visit in AMD
POST   /api/advancedmd/appointments/:id/submit-charges   // Submit billing charges
GET    /api/advancedmd/appointments/:id/charges          // Get charge status

// Insurance
POST   /api/advancedmd/patients/:id/insurance            // Add insurance
POST   /api/advancedmd/patients/:id/check-eligibility    // Check eligibility
GET    /api/advancedmd/patients/:id/insurance            // Get insurance list

// Lookups
GET    /api/advancedmd/lookup/providers         // Get providers
GET    /api/advancedmd/lookup/facilities        // Get facilities
GET    /api/advancedmd/lookup/proc-codes        // Get procedure codes
GET    /api/advancedmd/lookup/diag-codes        // Get diagnosis codes

// Sync operations
POST   /api/advancedmd/sync/run                 // Trigger full sync
GET    /api/advancedmd/sync/status              // Get sync status
GET    /api/advancedmd/sync/logs                // Get sync logs

// Admin
GET    /api/advancedmd/admin/rate-limit-status  // Check rate limit state
POST   /api/advancedmd/admin/reset-token        // Force token refresh
```

### 7.2 Route Handlers

```typescript
// packages/backend/src/routes/advancedmd.routes.ts

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permissions.middleware';
import { AdvancedMDService } from '../services/advancedmd/advancedmd.service';

const router = express.Router();

router.use(authenticateToken);

// Test connection
router.post('/test-connection', checkPermission('admin'), async (req, res) => {
  const result = await AdvancedMDService.testConnection();
  res.json(result);
});

// Sync patient to AMD
router.post('/patients/:id/sync', checkPermission('billing.manage'), async (req, res) => {
  const { id } = req.params;
  await AdvancedMDService.syncPatientToAMD(id);
  res.json({ success: true });
});

// Submit charges
router.post('/appointments/:id/submit-charges', checkPermission('billing.manage'), async (req, res) => {
  const { id } = req.params;
  const result = await AdvancedMDService.submitCharges(id);
  res.json(result);
});

// Check eligibility
router.post('/patients/:id/check-eligibility', checkPermission('billing.view'), async (req, res) => {
  const { id } = req.params;
  const result = await AdvancedMDService.checkEligibility(id);
  res.json(result);
});

export default router;
```

---

## 8. Frontend Components

### 8.1 Patient Profile - AdvancedMD Sync Status

**Component:** `packages/web/src/components/AdvancedMD/PatientSyncStatus.tsx`

**Features:**
- Display sync status badge (synced, pending, error)
- Show last sync timestamp
- Button to manually trigger sync
- Display AdvancedMD patient ID and chart number
- Show sync error details if failed

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ AdvancedMD Sync Status                  │
├─────────────────────────────────────────┤
│ Status: ✓ Synced                        │
│ Last Sync: 2025-01-15 10:30 AM          │
│ AMD Patient ID: 6022746                 │
│ Chart Number: 12345                     │
│                                         │
│ [Sync Now]  [View Sync History]        │
└─────────────────────────────────────────┘
```

### 8.2 Appointment Details - Billing Integration

**Component:** `packages/web/src/components/AdvancedMD/AppointmentBilling.tsx`

**Features:**
- Select CPT codes (autocomplete)
- Select ICD-10 codes (autocomplete)
- Select modifiers
- Preview charges before submission
- Submit to AdvancedMD button
- Display submission status

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ Billing Information                     │
├─────────────────────────────────────────┤
│ CPT Codes:                              │
│  [90834 - Psychotherapy 45 min  ] [×]   │
│  [+ Add CPT Code]                       │
│                                         │
│ ICD-10 Codes:                           │
│  [F41.1 - Generalized Anxiety  ] [×]    │
│  [F43.10 - PTSD, Unspecified   ] [×]    │
│  [+ Add Diagnosis Code]                 │
│                                         │
│ Modifiers: [GT] [95]                    │
│                                         │
│ Preview:                                │
│  90834 (1 unit) - $150.00               │
│  Diagnoses: F41.1, F43.10               │
│  Modifiers: GT, 95                      │
│                                         │
│ Status: Not Submitted                   │
│ [Submit to AdvancedMD]                  │
└─────────────────────────────────────────┘
```

### 8.3 Insurance Verification

**Component:** `packages/web/src/components/AdvancedMD/InsuranceVerification.tsx`

**Features:**
- Display patient insurance on file
- Check eligibility button
- Show eligibility results (active/inactive, benefits, copay, deductible)
- Add/edit insurance coverage

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ Insurance Coverage                      │
├─────────────────────────────────────────┤
│ Primary Insurance:                      │
│  Carrier: Aetna                         │
│  Policy #: ABC123456789                 │
│  Group #: 55555                         │
│                                         │
│  Last Eligibility Check: 1/10/2025      │
│  Status: ✓ Active                       │
│  Copay: $30.00                          │
│  Deductible: $500 ($200 remaining)      │
│                                         │
│  [Check Eligibility Now]  [Edit]        │
│                                         │
│ [+ Add Insurance]                       │
└─────────────────────────────────────────┘
```

### 8.4 Admin - Sync Dashboard

**Component:** `packages/web/src/components/AdvancedMD/SyncDashboard.tsx`

**Features:**
- Overall sync status
- Last sync timestamps by type
- Sync statistics (patients synced, visits created, charges submitted)
- Manual sync triggers
- View sync logs
- Rate limit status

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ AdvancedMD Integration Dashboard                       │
├─────────────────────────────────────────────────────────┤
│ Connection Status: ✓ Connected                          │
│ Session Expires: 11:30 PM (18 hours remaining)          │
│                                                         │
│ Last Syncs:                                             │
│  Patients:      1/15/2025 10:00 AM  [Sync Now]         │
│  Visits:        1/15/2025 10:30 AM  [Sync Now]         │
│  Charges:       1/15/2025 09:45 AM                      │
│                                                         │
│ Statistics (Last 24h):                                  │
│  Patients Synced:       24                              │
│  Visits Created:        18                              │
│  Charges Submitted:     15                              │
│  Eligibility Checks:    8                               │
│                                                         │
│ Rate Limit Status:                                      │
│  Current Time: 2:30 PM MT (Peak Hours)                  │
│  Tier 1: 0/1 calls this minute                          │
│  Tier 2: 5/12 calls this minute                         │
│  Tier 3: 8/24 calls this minute                         │
│                                                         │
│ [View Sync Logs]  [Run Full Sync]  [Settings]          │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Error Handling & Retry Logic

### 9.1 Error Categories

```typescript
enum AdvancedMDErrorType {
  AUTH_ERROR = 'auth_error',              // Token expired, login failed
  RATE_LIMIT_ERROR = 'rate_limit_error',  // Rate limit exceeded
  VALIDATION_ERROR = 'validation_error',  // Invalid data sent
  NOT_FOUND_ERROR = 'not_found_error',    // Patient/visit not found
  CONFLICT_ERROR = 'conflict_error',      // Data conflict
  NETWORK_ERROR = 'network_error',        // Connection timeout
  API_ERROR = 'api_error'                 // AdvancedMD API error
}
```

### 9.2 Retry Strategy

```typescript
const RETRY_CONFIG = {
  [AdvancedMDErrorType.AUTH_ERROR]: {
    maxRetries: 1,
    action: 'refresh_token'
  },
  [AdvancedMDErrorType.RATE_LIMIT_ERROR]: {
    maxRetries: 5,
    backoff: 'exponential',
    initialDelay: 60000, // 1 minute
    maxDelay: 900000     // 15 minutes
  },
  [AdvancedMDErrorType.NETWORK_ERROR]: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 10000
  },
  [AdvancedMDErrorType.VALIDATION_ERROR]: {
    maxRetries: 0,
    action: 'log_and_alert'
  },
  [AdvancedMDErrorType.API_ERROR]: {
    maxRetries: 2,
    backoff: 'linear',
    initialDelay: 5000
  }
};
```

### 9.3 Error Handling Flow

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  context: OperationContext
): Promise<T> {
  const { maxRetries, backoff, initialDelay } = getRetryConfig(context.errorType);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const errorType = classifyError(error);

      // Handle auth errors immediately
      if (errorType === AdvancedMDErrorType.AUTH_ERROR) {
        await authService.refreshTokenIfNeeded();
        continue;
      }

      // Don't retry validation errors
      if (errorType === AdvancedMDErrorType.VALIDATION_ERROR) {
        await logError(error, context);
        await alertAdmin(error, context);
        throw error;
      }

      // Rate limit errors: wait and retry
      if (errorType === AdvancedMDErrorType.RATE_LIMIT_ERROR) {
        const delay = calculateBackoff(attempt, backoff, initialDelay);
        await sleep(delay);
        continue;
      }

      // Last attempt: throw error
      if (attempt === maxRetries) {
        await logError(error, context);
        throw error;
      }

      // Wait before retry
      const delay = calculateBackoff(attempt, backoff, initialDelay);
      await sleep(delay);
    }
  }
}
```

---

## 10. Security & Compliance

### 10.1 Data Security

**API Credentials Storage:**
- Store API password encrypted in database using AES-256
- Use environment variables for encryption key
- Never log credentials in plaintext
- Rotate credentials quarterly

**Session Token Management:**
- Store session token encrypted
- Clear expired tokens automatically
- Implement token refresh before expiration

**Data Transmission:**
- All API calls over HTTPS
- Validate SSL certificates
- Use TLS 1.2+

### 10.2 HIPAA Compliance

**Audit Logging:**
- Log all sync operations with timestamps
- Record who initiated manual syncs
- Log all eligibility checks
- Maintain audit trail for 6 years minimum

**Access Controls:**
- Restrict AdvancedMD sync to authorized users only
- Implement role-based permissions:
  - `billing.view`: View billing data
  - `billing.manage`: Submit charges, sync data
  - `billing.admin`: Configure integration, view logs

**Data Minimization:**
- Only sync necessary patient data
- Don't sync clinical notes to AdvancedMD (billing only)
- Filter sensitive fields before transmission

### 10.3 Data Integrity

**Checksums & Validation:**
- Calculate demographics hash to detect changes
- Validate all CPT/ICD codes before submission
- Check for duplicate submissions

**Conflict Resolution:**
- Detect conflicts when data changed in both systems
- Alert users to resolve manually
- Provide merge UI for conflict resolution

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Services to Test:**
- `auth.service.ts`: Login flow, token refresh, session management
- `rate-limiter.service.ts`: Rate limiting logic, peak hour detection
- `patient-sync.service.ts`: Data mapping, validation
- `charge-sync.service.ts`: Code lookups, charge payload building

**Test Coverage Target:** 80%

### 11.2 Integration Tests

**API Integration:**
- Test two-step login with sandbox credentials
- Test patient CRUD operations
- Test visit creation
- Test charge submission
- Test eligibility checks

**Database Integration:**
- Test sync table operations
- Test transaction rollbacks on errors
- Test concurrent sync operations

### 11.3 End-to-End Tests

**User Workflows:**
1. Create patient in MentalSpace → Sync to AdvancedMD → Verify in AMD UI
2. Complete appointment → Submit charges → Verify in AMD billing
3. Add insurance → Check eligibility → Verify response stored
4. Update patient in AMD → Incremental sync → Verify updated in MentalSpace

### 11.4 Performance Tests

**Load Testing:**
- Simulate 100 concurrent sync jobs
- Test rate limiter under load
- Test queue processing performance

**Rate Limit Testing:**
- Verify rate limits enforced correctly
- Test peak hour vs off-peak behavior
- Test backoff and retry logic

---

## 12. Deployment & Rollout Plan

### 12.1 Phase 1: Foundation (Week 1-2)

**Goals:**
- Set up AdvancedMD connection
- Implement authentication service
- Implement rate limiter
- Create database schema

**Tasks:**
1. Create migration files for new tables
2. Implement `auth.service.ts`
3. Implement `rate-limiter.service.ts`
4. Test login and session management
5. Configure environment variables

**Success Criteria:**
- Successful login and token retrieval
- Rate limiter enforces limits correctly
- Database schema deployed

### 12.2 Phase 2: Patient Sync (Week 3-4)

**Goals:**
- Implement patient synchronization (push to AMD)
- Test with sample patients

**Tasks:**
1. Implement `patient-sync.service.ts`
2. Implement `lookup.service.ts` (for provider profiles)
3. Create API routes for patient sync
4. Build frontend sync status component
5. Test with 10 sample patients

**Success Criteria:**
- Patients successfully created in AdvancedMD
- Sync status tracked in database
- No rate limit violations

### 12.3 Phase 3: Visit & Billing (Week 5-6)

**Goals:**
- Implement visit creation
- Implement charge submission
- Test end-to-end billing workflow

**Tasks:**
1. Implement `visit-sync.service.ts`
2. Implement `charge-sync.service.ts`
3. Add CPT/ICD code selection to appointment form
4. Implement charge submission UI
5. Test with completed appointments

**Success Criteria:**
- Visits created in AMD after appointments
- Charges submitted successfully
- CPT code lookups cached

### 12.4 Phase 4: Insurance (Week 7)

**Goals:**
- Implement insurance management
- Implement eligibility checks

**Tasks:**
1. Implement `insurance-sync.service.ts`
2. Build insurance verification UI
3. Test eligibility checks with real carriers
4. Display eligibility results

**Success Criteria:**
- Insurance added to AMD successfully
- Eligibility checks return valid responses
- Results parsed and displayed

### 12.5 Phase 5: Incremental Sync (Week 8)

**Goals:**
- Implement bidirectional incremental sync
- Set up background jobs

**Tasks:**
1. Implement `GetUpdatedPatients` sync
2. Implement `GetUpdatedVisits` sync
3. Set up Bull queue and cron jobs
4. Test conflict detection

**Success Criteria:**
- Changes in AMD reflected in MentalSpace
- Changes in MentalSpace pushed to AMD
- No data loss or corruption

### 12.6 Phase 6: Admin Dashboard & Monitoring (Week 9)

**Goals:**
- Build admin dashboard
- Implement monitoring and alerts

**Tasks:**
1. Build sync dashboard component
2. Implement sync logs viewer
3. Set up error alerting (email/Slack)
4. Create admin documentation

**Success Criteria:**
- Admins can monitor sync status
- Errors trigger alerts
- Sync logs searchable and filterable

### 12.7 Phase 7: Testing & Validation (Week 10)

**Goals:**
- Comprehensive end-to-end testing
- User acceptance testing

**Tasks:**
1. Run full test suite
2. Perform load testing
3. UAT with billing staff
4. Fix identified issues

**Success Criteria:**
- All tests passing
- No critical bugs
- Billing staff sign-off

### 12.8 Phase 8: Production Rollout (Week 11)

**Goals:**
- Deploy to production
- Monitor closely

**Tasks:**
1. Deploy database migrations
2. Deploy backend services
3. Deploy frontend updates
4. Enable sync for pilot group (5-10 patients)
5. Monitor for 1 week

**Success Criteria:**
- No errors in production
- Pilot group syncing successfully
- Billing data accurate

### 12.9 Phase 9: Full Rollout (Week 12)

**Goals:**
- Enable for all patients
- Full production use

**Tasks:**
1. Enable sync for all patients
2. Run full historical sync (off-peak hours)
3. Train staff on new features
4. Monitor performance

**Success Criteria:**
- All patients synced
- Billing workflow adopted
- No performance degradation

---

## 13. Monitoring & Maintenance

### 13.1 Key Metrics to Monitor

**Sync Performance:**
- Sync success rate (%)
- Sync failure rate (%)
- Average sync duration
- Sync queue depth

**API Usage:**
- API calls per minute (by tier)
- Rate limit violations
- Token refresh frequency
- API error rate

**Business Metrics:**
- Charges submitted per day
- Eligibility checks per day
- Patients synced per day
- Billing turnaround time

### 13.2 Alerting Rules

```typescript
const ALERT_RULES = {
  sync_failure_rate: {
    threshold: 5, // %
    window: '1 hour',
    action: 'email_admin'
  },
  rate_limit_violations: {
    threshold: 10,
    window: '1 hour',
    action: 'email_admin'
  },
  api_error_rate: {
    threshold: 10, // %
    window: '15 minutes',
    action: 'page_on_call'
  },
  queue_depth: {
    threshold: 1000,
    window: 'realtime',
    action: 'email_admin'
  },
  token_expiration: {
    threshold: '2 hours before',
    action: 'auto_refresh'
  }
};
```

### 13.3 Regular Maintenance Tasks

**Daily:**
- Review sync logs for errors
- Check rate limit status
- Verify token validity

**Weekly:**
- Review failed syncs and retry
- Analyze sync performance metrics
- Check for data conflicts

**Monthly:**
- Refresh lookup cache
- Review and optimize slow syncs
- Update code mappings if needed

**Quarterly:**
- Rotate API credentials
- Review and update rate limit strategy
- Audit sync logs for compliance

---

## 14. Risks & Mitigation

### 14.1 Identified Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Rate limit violations | High | Medium | Implement robust rate limiter, schedule syncs off-peak |
| Token expiration mid-sync | Medium | Low | Auto-refresh tokens proactively, retry on auth errors |
| Data conflicts | High | Medium | Implement conflict detection and resolution UI |
| API downtime | High | Low | Queue failed requests, retry with backoff |
| Invalid CPT/ICD codes | Medium | Medium | Validate codes before submission, maintain code library |
| Duplicate charges | High | Low | Check for existing charges before submission |
| Session timeout | Low | High | Refresh session before expiration, handle gracefully |

### 14.2 Rollback Plan

**If critical issues arise:**

1. **Disable Sync:**
   ```sql
   UPDATE advancedmd_config SET sync_enabled = false;
   ```

2. **Pause Background Jobs:**
   ```typescript
   await advancedMDQueue.pause();
   ```

3. **Investigate Issues:**
   - Review sync logs
   - Check error messages
   - Analyze failed requests

4. **Fix and Redeploy:**
   - Deploy hotfix
   - Test in staging
   - Resume sync gradually

5. **Data Cleanup (if needed):**
   - Identify corrupted records
   - Manual cleanup in AdvancedMD
   - Resync affected patients

---

## 15. Documentation & Training

### 15.1 Technical Documentation

**For Developers:**
- API integration guide
- Service architecture diagram
- Database schema documentation
- Error handling guide
- Testing guide

**For DevOps:**
- Deployment guide
- Monitoring setup
- Alert configuration
- Backup and recovery procedures

### 15.2 User Documentation

**For Billing Staff:**
- How to submit charges
- How to check eligibility
- How to view sync status
- How to resolve errors
- CPT/ICD code reference

**For Administrators:**
- How to configure integration
- How to monitor sync status
- How to troubleshoot issues
- How to run manual syncs

### 15.3 Training Plan

**Week 1: Billing Staff Training**
- Overview of AdvancedMD integration
- Hands-on: Submit charges for appointments
- Hands-on: Check insurance eligibility
- Q&A session

**Week 2: Admin Training**
- Integration architecture overview
- Admin dashboard walkthrough
- Troubleshooting common issues
- Escalation procedures

---

## 16. Success Criteria

### 16.1 Technical Success Metrics

- ✅ 99% sync success rate
- ✅ <1% rate limit violations
- ✅ <5 seconds average sync time per patient
- ✅ Zero data loss
- ✅ 100% API authentication success rate

### 16.2 Business Success Metrics

- ✅ 100% of appointments have billing data submitted within 24 hours
- ✅ 95% of insurance eligibility checks complete within 1 minute
- ✅ 50% reduction in manual billing data entry
- ✅ Zero billing errors due to sync issues

### 16.3 User Satisfaction Metrics

- ✅ >90% billing staff satisfaction with new workflow
- ✅ <5 support tickets per week related to integration
- ✅ >80% of staff feel billing is faster/easier

---

## 17. Next Steps

### Immediate Actions (Before Development)

1. **Review and Approve Plan**
   - Stakeholder review
   - User feedback on proposed workflows
   - Final approval from leadership

2. **Set Up Sandbox Environment**
   - Request sandbox access from AdvancedMD (if available)
   - Test credentials in sandbox
   - Validate API endpoints

3. **Finalize Data Mappings**
   - Map all MentalSpace patient fields to AMD fields
   - Define required vs optional fields
   - Document field transformations

4. **Create Development Tasks**
   - Break down phases into Jira/GitHub issues
   - Assign to development team
   - Set sprint milestones

### Development Kickoff (Week 1)

1. Create feature branch: `feature/advancedmd-integration`
2. Set up database migrations
3. Configure environment variables
4. Begin Phase 1 implementation

---

## Appendix A: AdvancedMD API Credentials

```
Office Key: 990207

API Username: CAHCAPI
API Password: 1o7Dn4p1

Application Username: ADMIN
Application Password: Bing@@0912

API Documentation: https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Home.htm
Scheduler API: https://login-app.advancedmd.com/API/scheduler/help/index.html
```

---

## Appendix B: Common CPT Codes for Mental Health

| CPT Code | Description | Typical Duration |
|----------|-------------|------------------|
| 90791 | Psychiatric diagnostic evaluation | 60 min |
| 90832 | Psychotherapy, 30 minutes | 30 min |
| 90834 | Psychotherapy, 45 minutes | 45 min |
| 90837 | Psychotherapy, 60 minutes | 60 min |
| 90846 | Family psychotherapy (without patient) | 50 min |
| 90847 | Family psychotherapy (with patient) | 50 min |
| 90853 | Group psychotherapy | 60 min |
| 99211 | Office visit, minimal | 5-10 min |
| 99213 | Office visit, low complexity | 15 min |
| 99214 | Office visit, moderate complexity | 25 min |

**Common Modifiers:**
- `GT`: Via interactive audio/video (telehealth)
- `95`: Synchronous telemedicine
- `25`: Significant, separately identifiable E/M service

---

## Appendix C: Common ICD-10 Codes for Mental Health

| ICD-10 Code | Description |
|-------------|-------------|
| F41.1 | Generalized anxiety disorder |
| F43.10 | Post-traumatic stress disorder, unspecified |
| F43.21 | Adjustment disorder with depressed mood |
| F43.23 | Adjustment disorder with mixed anxiety and depressed mood |
| F32.0 | Major depressive disorder, single episode, mild |
| F32.1 | Major depressive disorder, single episode, moderate |
| F33.0 | Major depressive disorder, recurrent, mild |
| F33.1 | Major depressive disorder, recurrent, moderate |
| F41.0 | Panic disorder |
| F40.10 | Social phobia, unspecified |
| F42 | Obsessive-compulsive disorder |
| F60.3 | Borderline personality disorder |

---

## Appendix D: Rate Limit Reference

### Peak Hours (6 AM - 6 PM MT, Mon-Fri)

| Tier | Calls/Minute | Example APIs |
|------|--------------|--------------|
| Tier 1 | 1 | GetUpdatedVisits, GetUpdatedPatients |
| Tier 2 | 12 | SaveCharges, GetDemographic, GetDateVisits |
| Tier 3 | 24 | Lookup*, AddPatient, UpdatePatient |

### Off-Peak (All other times)

| Tier | Calls/Minute | Example APIs |
|------|--------------|--------------|
| Tier 1 | 60 | GetUpdatedVisits, GetUpdatedPatients |
| Tier 2 | 120 | SaveCharges, GetDemographic, GetDateVisits |
| Tier 3 | 120 | Lookup*, AddPatient, UpdatePatient |

---

**Document Version:** 1.0
**Last Updated:** January 15, 2025
**Author:** MentalSpace Development Team
**Status:** Draft for Review
