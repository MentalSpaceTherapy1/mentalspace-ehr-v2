# ERA and Claim Attachments Bridge System
**Purpose:** Transport data from AdvancedMD to MentalSpace EHR
**Status:** Design Complete, Ready for Implementation
**Last Updated:** January 2025

---

## Problem Statement

AdvancedMD does not support the following via API:
1. **ERA (Electronic Remittance Advice / 835 files)** - UI only, no API access
2. **Claim Attachments** - Can be uploaded in UI, but not retrievable via API

We need bridge systems to transport this data from AdvancedMD into our EHR.

---

## Solution Overview

### Option 1: ERA Bridge System (Recommended)
**Method:** Automated file import with reconciliation

**How It Works:**
1. ERAs arrive in AdvancedMD from clearinghouse (Waystar)
2. User downloads ERA files (835 format) from AdvancedMD UI
3. User uploads ERA files to our EHR
4. System parses 835 EDI format automatically
5. System matches payments to claims/charges
6. System auto-posts payments with adjustments
7. Manual review for unmatched items

### Option 2: ODBC Direct Connection (Advanced)
**Method:** Direct database query from AdvancedMD

**How It Works:**
1. AdvancedMD provides ODBC connection credentials
2. We query their database for ERA data
3. Scheduled sync pulls new ERAs automatically
4. Same parsing and auto-posting logic

### Option 3: Claim Attachments Bridge
**Method:** Document management with metadata tracking

**How It Works:**
1. User uploads clinical documentation to AdvancedMD UI
2. User also uploads same documents to our EHR
3. System links documents to claims via claim control number
4. Documents stored in S3 with encryption
5. Version control and audit trail maintained

---

## ERA Bridge System - Detailed Architecture

### 1. ERA File Upload Interface

**Frontend Component:**
```typescript
Location: /billing/era/upload
Features:
- Drag-and-drop file upload
- Multi-file selection (batch upload)
- File validation (must be 835 format)
- Upload progress indicator
- Preview parsed ERA data before import
- Manual matching interface for unmatched claims
```

**File Storage:**
```
S3 Bucket: mentalspace-era-files
Path: /era/{year}/{month}/{filename}
Encryption: KMS
Retention: 7 years (compliance)
```

### 2. 835 EDI Parser

**Segments Parsed:**
- **ISA** - Interchange Control Header
- **GS** - Functional Group Header
- **ST** - Transaction Set Header (835)
- **BPR** - Financial Information (payment amount, method, date)
- **TRN** - Trace Number (check/EFT number)
- **N1** - Payer/Payee identification
- **CLP** - Claim Payment Information
- **NM1** - Patient Name
- **DTM** - Service Date
- **SVC** - Service Line Information (CPT, amounts)
- **CAS** - Claim Adjustment Segments (CARC/RARC codes)
- **SE/GE/IEA** - Trailer segments

**Output Data Structure:**
```typescript
interface ParsedERA {
  interchangeControlNumber: string;
  paymentInfo: {
    paymentAmount: number;
    paymentMethod: string; // ACH, Check, Wire
    paymentDate: string;
    checkNumber?: string;
    traceNumber?: string;
  };
  payer: {
    name: string;
    identifier: string;
  };
  claims: Array<{
    claimControlNumber: string;
    claimStatus: string; // Paid, Partial, Denied
    totalChargeAmount: number;
    paymentAmount: number;
    patientResponsibility: number;
    serviceLines: Array<{
      cptCode: string;
      chargeAmount: number;
      paymentAmount: number;
      adjustments: Array<{
        groupCode: string; // CO, PR, OA, PI
        reasonCode: string; // CARC code
        amount: number;
      }>;
    }>;
  }>;
}
```

### 3. Automatic Matching Logic

**Matching Strategy (in order):**
1. **Match by Claim Control Number** (if we stored it when submitting)
2. **Match by Patient + Service Date + Amount**
3. **Match by Patient + CPT Code + Amount**
4. **Fuzzy match with confidence score**
5. **Manual review queue for unmatched**

**Matching Algorithm:**
```typescript
1. Parse ERA file
2. For each claim in ERA:
   a. Search our Claims table by claimControlNumber
   b. If found: auto-match
   c. If not found: Search by client + serviceDate + amount
   d. If multiple matches: Flag for manual review
   e. If no match: Add to unmatched queue
3. Display match results with confidence scores
4. Allow user to confirm/modify matches
5. Post payments after confirmation
```

### 4. Auto-Posting Workflow

**After Matching:**
```typescript
For each matched claim:
  1. Create PaymentRecord
     - paymentAmount from ERA
     - paymentMethod from ERA (ACH/Check)
     - paymentDate from ERA
     - payer from ERA
     - referenceNumber = check/trace number

  2. For each service line:
     - Find matching ChargeEntry
     - Apply payment amount
     - Create adjustments (contractual, patient responsibility)
     - Update charge status (Paid/Partial/Denied)

  3. Handle adjustments:
     - CO (Contractual Obligation) = write-off
     - PR (Patient Responsibility) = transfer to patient balance
     - OA (Other Adjustment) = review needed
     - PI (Payer Initiated) = payer adjustment

  4. Update claim status
  5. Audit log all transactions
```

### 5. Adjustment Codes Management

**Common CARC (Claim Adjustment Reason Codes):**
- 1 = Deductible amount
- 2 = Coinsurance amount
- 3 = Copayment amount
- 45 = Charge exceeds fee schedule
- 50 = Non-covered service
- 96 = Non-covered charge
- 97 = Benefit maximum exceeded
- 204 = Service partially paid

**System Actions by Code:**
- Deductible/Coinsurance/Copay (1,2,3) → Transfer to patient balance
- Fee schedule exceed (45) → Contractual write-off
- Non-covered (50,96) → Patient responsibility or write-off
- Denied codes → Flag for appeal review

### 6. Manual Review Interface

**Unmatched Claims Dashboard:**
```
Location: /billing/era/review
Features:
- List of unmatched ERA claims
- Search our claims by patient/date/amount
- Side-by-side comparison
- One-click match + post
- Skip/defer for later review
- Bulk actions
```

### 7. Reconciliation Reports

**Daily Reconciliation:**
- ERAs received (count, total $)
- Auto-matched (count, total $)
- Manual matched (count, total $)
- Unmatched (count, total $)
- Posted payments (count, total $)
- Pending review (count, total $)

**Month-End Reconciliation:**
- Total claims submitted
- Total ERAs received
- Payment variance (expected vs. received)
- Outstanding ERA files
- Aging of unmatched items

---

## Claim Attachments Bridge System

### Problem
- Clinical documentation (notes, treatment plans) must be submitted with claims
- AdvancedMD supports attachments in UI
- No API to retrieve attachments
- Need to maintain attachments in our system

### Solution: Dual Upload + Metadata Linking

### 1. Document Upload Interface

**Features:**
```typescript
Location: /billing/claims/{claimId}/attachments
Upload Options:
- From our Documents library (already uploaded)
- New upload (PDF, images, Word)
- Link to Clinical Note (auto-generate PDF)
- Link to Treatment Plan (auto-generate PDF)
```

**Workflow:**
```
1. User creates claim in our system
2. User selects required attachments
3. System generates single PDF if multiple docs
4. User submits claim via our UI → AdvancedMD API
5. System displays: "Upload attachments in AdvancedMD"
6. User clicks link → opens AdvancedMD UI
7. User uploads same documents in AdvancedMD
8. User confirms attachment uploaded
9. System marks claim as "attachments complete"
```

### 2. Attachment Tracking

**Database Schema:**
```sql
CREATE TABLE "ClaimAttachment" (
  "id" TEXT PRIMARY KEY,
  "claimId" TEXT NOT NULL REFERENCES "Claim"("id"),
  "documentId" TEXT REFERENCES "Document"("id"),
  "clinicalNoteId" TEXT REFERENCES "ClinicalNote"("id"),
  "attachmentType" TEXT NOT NULL, -- clinical_note, treatment_plan, lab_result, etc.
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "s3Key" TEXT NOT NULL,
  "uploadedToAdvancedMD" BOOLEAN DEFAULT false,
  "uploadedToAdvancedMDDate" TIMESTAMP,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

**S3 Storage:**
```
Bucket: mentalspace-claim-attachments
Path: /claims/{claimId}/{attachmentId}/{filename}
Encryption: KMS (HIPAA compliant)
Versioning: Enabled
Retention: 7 years
```

### 3. Automatic PDF Generation

**For Clinical Notes:**
```typescript
- Convert note to formatted PDF
- Include:
  - Practice letterhead
  - Patient demographics
  - Service date
  - Note content (SOAP format)
  - Diagnoses with ICD-10 codes
  - Clinician signature
  - NPI and license numbers
```

**For Treatment Plans:**
```typescript
- Convert plan to formatted PDF
- Include:
  - Patient demographics
  - Current diagnoses
  - Treatment goals
  - Interventions
  - Target dates
  - Signatures (client + clinician)
```

### 4. Compliance Checklist

**Before Claim Submission:**
```
□ All required attachments uploaded to our system
□ Attachments linked to claim
□ Attachments uploaded to AdvancedMD (user confirmed)
□ Claim control number recorded
□ Submission date logged
```

### 5. Alternative: SFTP Bridge (Future)

**If AdvancedMD supports:**
```
1. We upload attachments to SFTP server
2. AdvancedMD polls SFTP and imports
3. Attachments auto-linked by claim control number
4. Confirmation webhook/polling
```

---

## ODBC Direct Connection (Advanced Option)

### Setup
1. Request ODBC credentials from AdvancedMD
2. Configure read-only database connection
3. Set up VPN or secure connection
4. Map AdvancedMD tables to our data model

### Pros
- Fully automated (no file uploads)
- Real-time or near-real-time data
- Can retrieve ERA data automatically
- Can retrieve appointment status, patient updates

### Cons
- Requires AdvancedMD approval
- Complex setup
- Potential performance impact on their DB
- Schema changes could break integration
- Security/compliance considerations

### Recommended Usage
- Only if AdvancedMD officially supports ODBC for customers
- Use for read-only operations (ERAs, reports)
- Cache data locally to minimize queries
- Schedule queries during off-peak hours

---

## Implementation Priority

### Phase 1: ERA File Upload (Week 1)
- [x] S3 bucket setup for ERA files
- [x] 835 EDI parser implementation
- [ ] Upload interface (drag-and-drop)
- [ ] File validation
- [ ] Preview parsed data

### Phase 2: Auto-Matching (Week 1-2)
- [ ] Claim matching algorithm
- [ ] Confidence scoring
- [ ] Manual review interface
- [ ] Match confirmation workflow

### Phase 3: Auto-Posting (Week 2)
- [ ] Payment creation from ERA
- [ ] Charge updates
- [ ] Adjustment handling
- [ ] Audit logging

### Phase 4: Claim Attachments (Week 2-3)
- [ ] S3 bucket setup for attachments
- [ ] Document upload interface
- [ ] Link to claims
- [ ] PDF generation from notes
- [ ] Upload tracking

### Phase 5: Reporting (Week 3)
- [ ] Reconciliation reports
- [ ] Unmatched items dashboard
- [ ] Month-end reports
- [ ] Exception reports

---

## Database Schema Additions

```sql
-- ERA Files
CREATE TABLE "ERAFile" (
  "id" TEXT PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "s3Key" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMP,
  "processingStatus" TEXT DEFAULT 'pending', -- pending, processing, completed, error
  "processingError" TEXT,
  "paymentAmount" DECIMAL(10,2),
  "paymentMethod" TEXT,
  "paymentDate" DATE,
  "checkNumber" TEXT,
  "traceNumber" TEXT,
  "payerName" TEXT,
  "payerIdentifier" TEXT,
  "claimsCount" INTEGER DEFAULT 0,
  "matchedCount" INTEGER DEFAULT 0,
  "unmatchedCount" INTEGER DEFAULT 0,
  "interchangeControlNumber" TEXT,
  "rawContent" TEXT
);

-- ERA Claims (from file)
CREATE TABLE "ERAClaim" (
  "id" TEXT PRIMARY KEY,
  "eraFileId" TEXT NOT NULL REFERENCES "ERAFile"("id") ON DELETE CASCADE,
  "claimControlNumber" TEXT NOT NULL,
  "claimStatus" TEXT NOT NULL, -- Paid, Partial, Denied
  "totalChargeAmount" DECIMAL(10,2) NOT NULL,
  "paymentAmount" DECIMAL(10,2) NOT NULL,
  "patientResponsibility" DECIMAL(10,2) NOT NULL,
  "patientFirstName" TEXT,
  "patientLastName" TEXT,
  "patientIdentifier" TEXT,
  "serviceDate" DATE,
  "matchedClaimId" TEXT REFERENCES "Claim"("id"),
  "matchedClientId" TEXT REFERENCES "Client"("id"),
  "matchStatus" TEXT DEFAULT 'unmatched', -- matched, unmatched, manual_review
  "matchConfidence" DECIMAL(3,2), -- 0.00 to 1.00
  "matchedAt" TIMESTAMP,
  "matchedBy" TEXT,
  "posted" BOOLEAN DEFAULT false,
  "postedAt" TIMESTAMP,
  "postedBy" TEXT,
  "serviceLines" JSONB NOT NULL
);

-- ERA Service Line Adjustments
CREATE TABLE "ERAdjustment" (
  "id" TEXT PRIMARY KEY,
  "eraClaimId" TEXT NOT NULL REFERENCES "ERAClaim"("id") ON DELETE CASCADE,
  "groupCode" TEXT NOT NULL, -- CO, PR, OA, PI
  "reasonCode" TEXT NOT NULL, -- CARC code
  "reasonDescription" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "appliedToChargeId" TEXT REFERENCES "ChargeEntry"("id"),
  "adjustmentAction" TEXT, -- write_off, patient_balance, pending_review
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Claim Attachments
CREATE TABLE "ClaimAttachment" (
  "id" TEXT PRIMARY KEY,
  "claimId" TEXT NOT NULL REFERENCES "Claim"("id") ON DELETE CASCADE,
  "documentId" TEXT REFERENCES "Document"("id"),
  "clinicalNoteId" TEXT REFERENCES "ClinicalNote"("id"),
  "attachmentType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "s3Key" TEXT NOT NULL,
  "s3Bucket" TEXT NOT NULL,
  "uploadedToAdvancedMD" BOOLEAN DEFAULT false,
  "uploadedToAdvancedMDDate" TIMESTAMP,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "fk_attachment_claim" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "idx_era_file_status" ON "ERAFile"("processingStatus");
CREATE INDEX "idx_era_file_uploaded_at" ON "ERAFile"("uploadedAt");
CREATE INDEX "idx_era_claim_match_status" ON "ERAClaim"("matchStatus");
CREATE INDEX "idx_era_claim_control_number" ON "ERAClaim"("claimControlNumber");
CREATE INDEX "idx_era_claim_file" ON "ERAClaim"("eraFileId");
CREATE INDEX "idx_claim_attachment_claim" ON "ClaimAttachment"("claimId");
```

---

## API Endpoints

### ERA Management
```typescript
POST   /api/v1/billing/era/upload          // Upload ERA file
GET    /api/v1/billing/era                 // List ERA files
GET    /api/v1/billing/era/:id             // Get ERA details
POST   /api/v1/billing/era/:id/process     // Process/parse ERA
GET    /api/v1/billing/era/:id/claims      // Get claims from ERA
POST   /api/v1/billing/era/claims/:id/match    // Match claim manually
POST   /api/v1/billing/era/claims/:id/post     // Post payment from ERA claim
GET    /api/v1/billing/era/unmatched       // Get unmatched claims
GET    /api/v1/billing/era/reconciliation  // Reconciliation report
```

### Claim Attachments
```typescript
POST   /api/v1/billing/claims/:id/attachments        // Add attachment
GET    /api/v1/billing/claims/:id/attachments        // List attachments
DELETE /api/v1/billing/claims/:id/attachments/:attachId  // Remove attachment
POST   /api/v1/billing/claims/:id/attachments/:attachId/confirm-upload  // Confirm AMD upload
POST   /api/v1/billing/claims/:id/generate-pdf       // Generate PDF from note
```

---

## Testing Strategy

### Unit Tests
- ERA parser with sample 835 files
- Matching algorithm with various scenarios
- Adjustment code handlers
- PDF generation

### Integration Tests
- Upload ERA → Parse → Match → Post workflow
- Attachment upload → Link → Track workflow
- Reconciliation report generation

### User Acceptance Testing
- Upload real ERA files from AdvancedMD
- Verify auto-matching accuracy
- Test manual matching interface
- Verify payment posting
- Test attachment workflow

---

## Training & Documentation

### User Guide Topics
1. How to download ERA files from AdvancedMD
2. How to upload ERA files to our system
3. Understanding ERA reconciliation dashboard
4. How to manually match unmatched claims
5. How to upload claim attachments
6. How to confirm attachments in AdvancedMD

### Video Tutorials
1. ERA processing workflow (5 min)
2. Manual claim matching (3 min)
3. Attachment management (4 min)
4. Month-end reconciliation (6 min)

---

## Success Metrics

- **Auto-match rate:** >85% of ERA claims auto-matched
- **Processing time:** <5 minutes per ERA file
- **Unmatched backlog:** <10 items per month
- **Attachment completeness:** 100% of claims have required attachments
- **Reconciliation accuracy:** 100% match between ERA and posted payments

---

## Future Enhancements

### Phase 2 (Post-Launch)
- AI-powered matching with machine learning
- OCR for scanned ERA documents
- Automated adjustment rule engine
- Predictive denial prevention
- SFTP bridge for automated ERA import

### Phase 3 (Advanced)
- ODBC direct connection (if supported)
- Real-time ERA notifications
- Automated attachment extraction from notes
- Batch claim attachment generation
- Integration with clearinghouse APIs (Waystar direct)

---

**Document Owner:** Development Team Lead
**Last Review:** January 2025
**Next Review:** After ERA implementation complete
