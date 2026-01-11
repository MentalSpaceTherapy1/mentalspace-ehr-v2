# AdvancedMD ERA (Electronic Remittance Advice) Workaround

## Overview

AdvancedMD's Electronic Remittance Advice (ERA) functionality is available only through their user interface (UI) and is not exposed via their API. This document describes the workaround implemented in MentalSpace EHR to handle ERA processing programmatically.

## Limitation

**AdvancedMD ERA is UI-only.** The following ERA-related functionality cannot be automated through the AdvancedMD API:

- Receiving ERA files from clearinghouses
- Parsing 835 transactions
- Automatic payment posting
- ERA reconciliation with submitted claims

This means that practices using AdvancedMD for billing must either:
1. Use the AdvancedMD UI to process ERAs manually, OR
2. Use the workaround documented here to import and process payments outside the AdvancedMD system

## Workaround Implementation

MentalSpace EHR provides a workaround that allows billing staff to:

1. **Import payment data** from various sources
2. **Match payments** to claims/charges
3. **Post payments** to the local billing system
4. **Reconcile** with AdvancedMD periodically

### Architecture

```
Clearinghouse → ERA 835 File → MentalSpace EHR
                                    ↓
                            Payment Matching
                                    ↓
                            Payment Posting
                                    ↓
                            Local Payment Record
                                    ↓
                    Reconciliation with AdvancedMD
```

## Manual Process Steps

### Step 1: Export ERA Data from Clearinghouse

1. Log into your clearinghouse portal (e.g., Waystar, Availity, TriZetto)
2. Navigate to the ERA/835 section
3. Download ERA files for the desired date range
4. Supported formats:
   - **835 EDI files** (standard format from clearinghouses)
   - **CSV exports** (some clearinghouses provide this)
   - **JSON format** (for API integrations)

### Step 2: Import Payments into MentalSpace

#### Option A: 835 File Import

Use the 835 import endpoint:

```http
POST /api/advancedmd/era/import/835
Content-Type: application/json

{
  "fileContent": "<835 file contents as string>",
  "autoMatch": true,
  "autoPost": false
}
```

#### Option B: CSV Import

Use the CSV import endpoint with column mapping:

```http
POST /api/advancedmd/era/import/csv
Content-Type: application/json

{
  "csvContent": "<CSV file contents>",
  "columnMapping": {
    "checkNumber": "Check #",
    "paymentDate": "Payment Date",
    "payerName": "Payer Name",
    "patientName": "Patient",
    "claimId": "Claim ID",
    "chargeDate": "Service Date",
    "procedureCode": "CPT Code",
    "billedAmount": "Billed",
    "allowedAmount": "Allowed",
    "paidAmount": "Paid",
    "adjustmentCode": "Reason Code",
    "adjustmentAmount": "Adjustment"
  },
  "autoMatch": true,
  "autoPost": false
}
```

#### Option C: JSON Import

For programmatic imports:

```http
POST /api/advancedmd/era/import/json
Content-Type: application/json

{
  "records": [
    {
      "checkNumber": "CHK123456",
      "paymentDate": "2024-01-15",
      "payerName": "Blue Cross Blue Shield",
      "payerId": "BCBS001",
      "patientFirstName": "John",
      "patientLastName": "Doe",
      "patientMemberId": "MEM123456",
      "claimNumber": "CLM-2024-001",
      "serviceDate": "2024-01-10",
      "procedureCode": "90834",
      "billedAmount": 150.00,
      "allowedAmount": 120.00,
      "paidAmount": 96.00,
      "patientResponsibility": 24.00,
      "adjustmentCode": "CO-45",
      "adjustmentAmount": 30.00,
      "adjustmentReason": "Charges exceed fee schedule"
    }
  ],
  "autoMatch": true,
  "autoPost": false
}
```

### Step 3: Review Pending Payments

After import, payments will be in one of these statuses:

| Status | Description | Action Required |
|--------|-------------|-----------------|
| `matched` | Automatically matched to a charge | Ready for posting |
| `unmatched` | Could not find matching charge | Manual matching required |
| `manual_review` | Multiple potential matches | Manual selection required |
| `posted` | Payment has been applied | No action needed |

View pending payments:

```http
GET /api/advancedmd/era/pending?status=unmatched
```

### Step 4: Manual Payment Matching

For unmatched or manual_review payments, match to the correct charge:

```http
PUT /api/advancedmd/era/pending/{id}/match
Content-Type: application/json

{
  "chargeId": "charge-uuid-here",
  "claimId": "claim-uuid-here"
}
```

**Tips for Manual Matching:**

1. Use the patient name, service date, and CPT code to find the correct charge
2. Verify the billed amount matches
3. Check that the patient has the same insurance payer

### Step 5: Post Payments

#### Post Single Payment

```http
POST /api/advancedmd/era/pending/{id}/post
```

#### Batch Post

Post multiple matched payments at once:

```http
POST /api/advancedmd/era/batch-post
Content-Type: application/json

{
  "pendingPaymentIds": ["payment-1", "payment-2", "payment-3"]
}
```

Maximum 100 payments per batch.

#### Post All Matched

Post all payments that have been successfully matched:

```http
POST /api/advancedmd/era/post-all-matched
```

### Step 6: Reconciliation

Periodically reconcile payments between MentalSpace and AdvancedMD:

1. Export payment data from AdvancedMD for a date range
2. Run reconciliation in MentalSpace:

```http
POST /api/advancedmd/era/reconcile
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

The reconciliation will:
- Compare local payments to AdvancedMD records
- Identify discrepancies
- Report mismatches for manual review

## Payment Matching Guide

### Automatic Matching Criteria

The system attempts to match payments automatically using the following criteria (in order):

1. **Exact Claim Match**: If the ERA includes a claim ID that matches a submitted claim
2. **Service Match**: Patient + Service Date + CPT Code
3. **Payer Match**: Patient + Service Date + Payer ID
4. **Amount Match**: Patient + Billed Amount + Service Date

### Manual Matching Tips

When automatic matching fails, use these strategies:

1. **Search by Patient Name**: Find all charges for the patient within ±7 days of service date
2. **Search by Check Number**: Group all line items from the same check
3. **Search by Amount**: Find charges with matching billed or allowed amounts
4. **Search by CPT Code**: Narrow down by procedure code

### Common Matching Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Patient not found | Name mismatch between payer and EHR | Search by member ID or DOB |
| Service date mismatch | DOS on claim differs from ERA | Check for date range within ±3 days |
| Amount mismatch | Claim had adjustments before submission | Verify original billed amount |
| CPT code changed | Payer recoded the procedure | Match on original submitted code |

## Statistics and Monitoring

View import statistics:

```http
GET /api/advancedmd/era/stats
```

Response includes:
- Total imports (today/week/month)
- Match rates
- Posting success rates
- Pending payment counts by status

## Best Practices

### Daily Workflow

1. **Morning**: Download new ERA files from clearinghouse
2. **Mid-morning**: Import files and review auto-matching
3. **Midday**: Resolve unmatched payments
4. **Afternoon**: Post all matched payments
5. **End of day**: Review reconciliation reports

### Weekly Workflow

1. Run full reconciliation for the past week
2. Investigate and resolve discrepancies
3. Export reconciliation report for management
4. Update any recurring matching issues

### Monthly Workflow

1. Full month-end reconciliation
2. Generate payment posting reports
3. Compare MentalSpace totals to AdvancedMD
4. Document and escalate unresolved items

## Troubleshooting

### "No valid payment records found"

- Verify file format matches selected import type
- Check column mapping for CSV imports
- Validate 835 file structure for EDI imports

### "Payment matching failed"

- Verify patient exists in the system
- Check that the claim was submitted and has charges
- Confirm service date is within reasonable range

### "Payment posting failed"

- Ensure payment is in 'matched' status
- Verify charge hasn't already been fully paid
- Check for sufficient balance on the charge

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/era/import/json` | POST | Import payments from JSON |
| `/era/import/csv` | POST | Import payments from CSV |
| `/era/import/835` | POST | Import payments from 835 file |
| `/era/pending` | GET | List pending payments |
| `/era/pending/{id}` | GET | Get pending payment details |
| `/era/pending/{id}/match` | PUT | Manually match payment |
| `/era/pending/{id}/post` | POST | Post single payment |
| `/era/batch-post` | POST | Post multiple payments |
| `/era/post-all-matched` | POST | Post all matched payments |
| `/era/reconcile` | POST | Run reconciliation |
| `/era/stats` | GET | Get import statistics |

## Security Considerations

- All ERA endpoints require authentication
- Only users with `ADMINISTRATOR`, `BILLING_STAFF`, or `SUPER_ADMIN` roles can access
- Payment data is logged in audit trail
- Sensitive data (SSN, account numbers) should be masked in reports

## Future Enhancements

When AdvancedMD adds ERA API support, the following improvements will be possible:

1. Direct ERA file retrieval from AdvancedMD
2. Real-time payment synchronization
3. Automatic reconciliation without manual data export
4. Elimination of manual import steps

Until then, this workaround provides a functional bridge between clearinghouse ERA processing and the MentalSpace EHR billing system.
