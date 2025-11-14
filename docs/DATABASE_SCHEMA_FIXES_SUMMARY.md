# Database Schema Fixes - Client Module Backend APIs

## Summary

This document details all database schema drift issues that were identified and fixed to resolve broken backend endpoints in the Client Module. All 500 server errors caused by missing database columns have been resolved.

**Date**: 2024-01-XX
**Environment**: Development Database (mentalspace-db-dev)
**Root Cause**: Database schema drift - Prisma schema defined columns that didn't exist in actual PostgreSQL database tables

---

## Fixed Endpoints

### ✅ 1. Portal Forms API - GET `/clients/:id/forms`

**Issue**: 500 error - Missing database columns
**Error**: `The column form_assignments.assignmentNotes does not exist in the current database`

**Fix**: Added 3 missing columns to `form_assignments` table

```sql
ALTER TABLE "form_assignments" ADD COLUMN "assignmentNotes" TEXT;
ALTER TABLE "form_assignments" ADD COLUMN "clientMessage" TEXT;
ALTER TABLE "form_assignments" ADD COLUMN "lastReminderSent" TIMESTAMP;
```

**Verification**: ✅ Query successful, endpoint working

---

### ✅ 2. Emergency Contacts - POST `/emergency-contacts`

**Issue**: 500 error - Schema mismatch between API and database
**Error**: `Argument name is missing`

**Root Cause**:
- Controller validation expected: `firstName`, `lastName`, `phoneNumber`, `canPickup`, `notes`
- Database had: `name`, `phone`, `okayToDiscussHealth`, `okayToLeaveMessage`

**Fix**: Added data transformation layer in controller

**Modified File**: [`packages/backend/src/controllers/emergencyContact.controller.ts`](packages/backend/src/controllers/emergencyContact.controller.ts:91-234)

**Changes**:
- Transform `firstName` + `lastName` → `name` in database
- Map `phoneNumber` → `phone`
- Add default values for database-only fields (`okayToDiscussHealth`, `okayToLeaveMessage`)
- Handle partial updates by parsing existing name field

**Why not change database schema**: Database contained 5 existing emergency contacts. Data transformation was safer than schema migration.

**Verification**: ✅ Test contact created and deleted successfully

---

### ✅ 3. Client Diagnoses - Multiple endpoints

**Issue**: 500 errors across POST and GET endpoints
**Error**: Multiple missing columns

**Fix 1**: Added 11 initial missing columns

```sql
ALTER TABLE "client_diagnoses" ADD COLUMN "diagnosisType" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "icd10Code" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "dsm5Code" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "diagnosisName" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "diagnosisCategory" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "severitySpecifier" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "courseSpecifier" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "onsetDate" TIMESTAMP;
ALTER TABLE "client_diagnoses" ADD COLUMN "supportingEvidence" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "differentialConsiderations" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "diagnosedById" TEXT;
```

**Fix 2**: Added 6 additional missing columns

```sql
ALTER TABLE "client_diagnoses" ADD COLUMN "remissionDate" TIMESTAMP;
ALTER TABLE "client_diagnoses" ADD COLUMN "dateDiagnosed" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "client_diagnoses" ADD COLUMN "lastReviewedDate" TIMESTAMP;
ALTER TABLE "client_diagnoses" ADD COLUMN "lastReviewedById" TEXT;
ALTER TABLE "client_diagnoses" ADD COLUMN "dateResolved" TIMESTAMP;
ALTER TABLE "client_diagnoses" ADD COLUMN "resolutionNotes" TEXT;
```

**Fix 3**: Made legacy column nullable

```sql
ALTER TABLE "client_diagnoses" ALTER COLUMN "diagnosisCode" DROP NOT NULL;
```

**Total columns added**: 17
**Verification**: ✅ Test diagnosis created successfully with all relations

---

### ✅ 4. Clinical Notes APIs - Multiple GET endpoints

**Issue**: 500 errors on GET endpoints
**Error**: `The column clinical_notes.unlockRequested does not exist in the current database`

**Fix**: Added 6 missing unlock-related columns

```sql
ALTER TABLE "clinical_notes" ADD COLUMN "unlockRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clinical_notes" ADD COLUMN "unlockRequestDate" TIMESTAMP;
ALTER TABLE "clinical_notes" ADD COLUMN "unlockReason" TEXT;
ALTER TABLE "clinical_notes" ADD COLUMN "unlockApprovedBy" TEXT;
ALTER TABLE "clinical_notes" ADD COLUMN "unlockApprovalDate" TIMESTAMP;
ALTER TABLE "clinical_notes" ADD COLUMN "unlockUntil" TIMESTAMP;
```

**Feature**: Sunday Lockout & Unlock Request system for clinical notes compliance

**Verification**: ✅ Query successful, found 0 clinical notes

---

### ✅ 5. Outcome Measures API - GET `/outcome-measures/client/:id`

**Issue**: 500 error - Missing database columns
**Error**: `The column outcome_measures.administeredById does not exist in the current database`

**Fix 1**: Added 11 data columns

```sql
ALTER TABLE "outcome_measures" ADD COLUMN "administeredById" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "outcome_measures" ADD COLUMN "administeredDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "outcome_measures" ADD COLUMN "clinicalNoteId" TEXT;
ALTER TABLE "outcome_measures" ADD COLUMN "appointmentId" TEXT;
ALTER TABLE "outcome_measures" ADD COLUMN "responses" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "outcome_measures" ADD COLUMN "totalScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "outcome_measures" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MINIMAL';
ALTER TABLE "outcome_measures" ADD COLUMN "severityLabel" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "outcome_measures" ADD COLUMN "clinicalNotes" TEXT;
ALTER TABLE "outcome_measures" ADD COLUMN "completionTime" INTEGER;
ALTER TABLE "outcome_measures" ADD COLUMN "wasCompleted" BOOLEAN NOT NULL DEFAULT true;
```

**Fix 2**: Added timestamp column

```sql
ALTER TABLE "outcome_measures" ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

**Note**: `createdAt` column already existed

**Total columns added**: 12
**Verification**: ✅ Query successful, found 0 outcome measures

---

## Verified Working (No Database Issues)

### ✅ 6. Insurance Information - POST `/insurance`

**Status**: Database schema verified working
**Test Result**: Insurance record created and deleted successfully
**Note**: Any 400 validation errors are frontend data format issues, not database schema problems

**Verified Columns**: All 30+ columns in `insurance_information` table match Prisma schema

---

### ✅ 7. Legal Guardians - POST `/guardians`

**Status**: Database schema verified working
**Test Result**: Guardian record created and deleted successfully
**Note**: Any 400 validation errors are frontend data format issues, not database schema problems

**Verified Columns**: All columns in `legal_guardians` table match Prisma schema

---

## Total Impact

- **5 endpoint groups fixed**: Portal Forms, Emergency Contacts, Client Diagnoses, Clinical Notes, Outcome Measures
- **2 endpoints verified**: Insurance, Legal Guardians
- **38 database columns added** across 4 tables
- **1 data transformation layer** added for backward compatibility
- **1 constraint relaxed** on legacy column

---

## Pattern Identified

All 500 errors were caused by **database schema drift**:

1. Prisma schema in codebase defines model with specific columns
2. PostgreSQL database doesn't have those columns (likely from incomplete migrations)
3. Prisma throws error when trying to access missing columns
4. API returns 500 error to client

---

## Solution Patterns Used

### 1. Direct Column Addition
For new columns that don't affect existing data:
```sql
ALTER TABLE "table_name" ADD COLUMN "column_name" DATA_TYPE;
```

### 2. Column Addition with Defaults
For NOT NULL columns being added to tables with existing rows:
```sql
ALTER TABLE "table_name" ADD COLUMN "column_name" DATA_TYPE NOT NULL DEFAULT value;
```

### 3. Data Transformation Layer
For schema mismatches with existing data:
- Keep database schema unchanged
- Add transformation logic in controller
- Map between API format and database format

### 4. Constraint Relaxation
For legacy columns no longer required:
```sql
ALTER TABLE "table_name" ALTER COLUMN "column_name" DROP NOT NULL;
```

---

## Files Modified

1. [`packages/backend/src/controllers/emergencyContact.controller.ts`](../packages/backend/src/controllers/emergencyContact.controller.ts)
   - Lines 91-234: Added data transformation in `createEmergencyContact` and `updateEmergencyContact`

All other fixes were direct database alterations with no code changes required.

---

## Testing Methodology

For each endpoint:

1. **Read controller** to understand query structure
2. **Create test script** to replicate exact Prisma query
3. **Identify specific error** from Prisma error message
4. **Read Prisma schema** to find expected columns
5. **Check database** to identify all missing columns
6. **Add missing columns** with appropriate defaults
7. **Verify fix** by running test query again
8. **Clean up test data** to avoid polluting database

---

## Next Steps

1. **Migration Files**: These fixes should be converted to proper Prisma migration files
2. **Production Deployment**: Apply these same fixes to production database
3. **CI/CD Integration**: Add database schema validation to prevent future drift
4. **Documentation**: Update API documentation to reflect all working endpoints

---

## Prevention

To prevent future database schema drift:

1. **Always use Prisma Migrate**: Never modify database directly without migration files
2. **Version control migrations**: Keep migration history in git
3. **Pre-deployment validation**: Check Prisma schema matches database before deploying
4. **Regular schema audits**: Periodically verify database matches Prisma models
5. **Integration tests**: Add tests that verify database schema on startup

---

## Database Connection Used

```
Development Database: mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr
```

All fixes applied to development database and verified working.

---

## Reference

- Prisma Schema: [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma)
- Controllers: [`packages/backend/src/controllers/`](../packages/backend/src/controllers/)
- Testing Documentation: [`docs/testing/`](./testing/)
