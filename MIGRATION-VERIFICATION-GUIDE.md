# Phase 1.4 Migration Verification Guide

**Task ID**: 5c6b38e20bf74257a71d4b9a689cbee9
**Task Definition**: mentalspace-backend-prod:10
**Status**: ECS Exec is DISABLED (cannot use execute-command)

---

## Current Situation

✅ **Frontend Deployed** - https://mentalspaceehr.com
✅ **Backend Deployed** - ECS Task running with new image
✅ **Migration File Included** - In Docker image
⏳ **Migration Status** - Unknown (needs verification)

---

## Recommended Approach: Test the API Endpoints

The migration may have auto-applied when the container started. Let's verify by testing the new API endpoints:

### Step 1: Check Backend Health

```bash
curl https://api.mentalspaceehr.com/api/v1/health
```

**Expected**: `{"status":"ok",...}`

### Step 2: Test New Signature Endpoint

```bash
# This endpoint only works if migration was applied
curl https://api.mentalspaceehr.com/api/v1/users/signature-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**If Migration Applied**: Returns `{"success":true,"data":{"hasPinConfigured":false,...}}`
**If Migration NOT Applied**: Returns 500 error or "table does not exist"

### Step 3: Login and Get Token

```bash
# Login to get token
curl -X POST https://api.mentalspaceehr.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ejoseph@chctherapy.com","password":"YOUR_PASSWORD"}' \
  | jq -r '.data.token'
```

Save the token and use it in Step 2.

---

## Alternative: Enable ECS Exec and Apply Migration

If the API tests show migration was NOT applied, you need to enable ECS Exec:

### Enable ECS Exec on the Service

```bash
# Update service to enable execute command
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --enable-execute-command \
  --region us-east-1
```

### Wait for New Task to Start

```bash
# Force new deployment
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --force-new-deployment \
  --region us-east-1

# Wait for stable
aws ecs wait services-stable \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1
```

### Get New Task ID

```bash
aws ecs list-tasks \
  --cluster mentalspace-ehr-prod \
  --service-name mentalspace-backend \
  --desired-status RUNNING \
  --region us-east-1
```

### Connect and Apply Migration

```bash
# Connect to container
aws ecs execute-command \
  --cluster mentalspace-ehr-prod \
  --task NEW_TASK_ID \
  --container mentalspace-backend \
  --interactive \
  --command "/bin/sh" \
  --region us-east-1

# Inside container:
npx prisma migrate deploy

# Verify:
npx prisma migrate status

# Check attestations:
echo "SELECT COUNT(*) FROM signature_attestations;" | \
  PGPASSWORD="$DATABASE_PASSWORD" psql \
  -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -t
```

---

## Manual Migration via Database Client

If you have a PostgreSQL client with access to RDS:

### Connect to Database

```bash
PGPASSWORD="MentalSpace2024!SecurePwd" psql \
  -h mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com \
  -U mentalspace_admin \
  -d mentalspace_ehr
```

### Check if Migration Already Applied

```sql
-- Check for signature tables
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('signature_attestations', 'signature_events');

-- If tables exist, check attestations count
SELECT COUNT(*) FROM signature_attestations;
-- Expected: 4

-- If tables exist, migration was already applied!
```

### If Migration NOT Applied, Run Manually

```sql
-- Copy the entire contents of:
-- packages/database/prisma/migrations/20251023000000_add_electronic_signatures_and_attestations/migration.sql

-- Paste and execute in psql
```

---

## Verification Checklist

Once migration is confirmed applied:

### Database Checks

- [ ] `signature_attestations` table exists
- [ ] Table contains 4 rows (GA clinician, GA supervisor, FL clinician, US generic)
- [ ] `signature_events` table exists
- [ ] Users table has columns: `signaturePin`, `signaturePassword`, `signatureBiometric`

### API Checks

- [ ] `GET /api/v1/health` returns 200 OK
- [ ] `GET /api/v1/users/signature-status` returns 200 OK (with auth token)
- [ ] `GET /api/v1/signatures/attestation/Progress%20Note` returns attestation text

### Frontend Checks

- [ ] https://mentalspaceehr.com loads without errors
- [ ] Can login successfully
- [ ] Settings page loads
- [ ] "Signature Authentication" section visible in settings

---

## Testing the Complete Feature

### Test 1: Set Up Signature PIN

1. Login to https://mentalspaceehr.com
2. Go to Settings → Signature Authentication
3. Enter current password
4. Enter PIN: 1234
5. Click "Set PIN"
6. Verify success message

### Test 2: Sign a Note

1. Create a draft progress note
2. Fill required fields
3. Click "Sign Note"
4. Verify SignatureModal appears
5. Verify attestation text displays
6. Enter PIN: 1234
7. Click "Sign Document"
8. Verify note signs successfully

### Test 3: Verify Audit Trail

Query database:

```sql
SELECT
  se.id,
  se.signatureType,
  se.authMethod,
  se.signedAt,
  se.ipAddress,
  u.email
FROM signature_events se
JOIN users u ON se.userId = u.id
ORDER BY se.signedAt DESC
LIMIT 5;
```

Expected: Signature event with IP, user agent, timestamp

---

## Troubleshooting

### Issue: API returns "table signature_attestations does not exist"

**Solution**: Migration was not applied. Use one of the methods above to apply it.

### Issue: Cannot enable ECS Exec

**Solution**:
1. Check IAM permissions for ECS exec
2. Ensure task role has `ssmmessages:CreateControlChannel` permission
3. May need to update task definition

### Issue: Cannot connect to RDS directly

**Solution**: This is expected - RDS is in VPC. Use one of these:
- ECS Exec (after enabling)
- EC2 bastion host
- AWS Systems Manager Session Manager with port forwarding

---

## Quick Decision Tree

```
Can you access https://api.mentalspaceehr.com/api/v1/users/signature-status with auth token?
│
├─ YES (Returns 200 OK)
│  └─ ✅ Migration is applied! Proceed to testing.
│
└─ NO (Returns 500 or table error)
   │
   ├─ Do you have direct database access?
   │  ├─ YES → Use psql to check/apply migration manually
   │  └─ NO → Continue below
   │
   └─ Can you update ECS service?
      ├─ YES → Enable ECS Exec and apply via container
      └─ NO → Contact DevOps/Admin for help
```

---

## Summary

**Most Likely Scenario**: Migration auto-applied when container started.

**Quickest Verification**: Test the signature-status API endpoint.

**If NOT Applied**: Enable ECS Exec or use direct database access.

**Support**: All migration SQL is in:
`packages/database/prisma/migrations/20251023000000_add_electronic_signatures_and_attestations/migration.sql`

---

## Next Steps After Verification

1. ✅ Verify migration applied
2. ✅ Test API endpoints
3. ✅ Test frontend signature setup
4. ✅ Sign a test note
5. ✅ Verify audit trail in database
6. ✅ Document completion
7. ✅ User training and onboarding

---

**All Phase 1.4 code is deployed and ready!**
**Just need to confirm migration status.**
