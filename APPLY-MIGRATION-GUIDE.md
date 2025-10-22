# Database Migration Application Guide

**Migration**: `20251022022500_add_esignature_to_intake_forms`
**Purpose**: Add e-signature fields to intake_form_submissions table
**Status**: ⚠️ REQUIRED for e-signature feature to work

---

## Quick Summary

The e-signature feature is deployed but needs 5 database columns added to work. Choose **any ONE** of the methods below to apply the migration.

---

## Method 1: Direct SQL (Fastest - 30 seconds)

### Via AWS RDS Query Editor

1. Go to AWS Console → RDS → Query Editor
2. Connect to: `mentalspace-ehr-prod`
3. Database: `mentalspace_ehr`
4. Username: `mentalspace_admin`
5. Password: `MentalSpace2024!SecurePwd`
6. Run this SQL:

```sql
ALTER TABLE intake_form_submissions
ADD COLUMN IF NOT EXISTS "signatureData" TEXT,
ADD COLUMN IF NOT EXISTS "signedByName" TEXT,
ADD COLUMN IF NOT EXISTS "signedDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "signatureIpAddress" TEXT,
ADD COLUMN IF NOT EXISTS "consentAgreed" BOOLEAN NOT NULL DEFAULT false;
```

7. Verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'intake_form_submissions'
AND column_name IN ('signatureData', 'signedByName', 'signedDate', 'signatureIpAddress', 'consentAgreed');
```

Should return 5 rows.

**Done!** ✅

---

## Method 2: Via ECS Exec (If ECS Task is Running)

### Prerequisites
- ECS task for backend is running
- Task has `enableExecuteCommand: true`

### Steps

```bash
# 1. Find running task
TASK_ID=$(aws ecs list-tasks \
  --cluster mentalspace-ehr-prod \
  --service-name mentalspace-backend \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text | cut -d'/' -f3)

echo "Task ID: $TASK_ID"

# 2. Execute migration command in the container
aws ecs execute-command \
  --cluster mentalspace-ehr-prod \
  --task $TASK_ID \
  --container mentalspace-backend \
  --region us-east-1 \
  --interactive \
  --command "/bin/sh -c 'cd /app/packages/database && npx prisma migrate deploy'"
```

---

## Method 3: Temporary Security Group Access (5 minutes)

### Steps

1. **Add Your IP to RDS Security Group**
   ```bash
   # Get your public IP
   MY_IP=$(curl -s https://api.ipify.org)
   echo "Your IP: $MY_IP"

   # Get RDS security group ID
   SG_ID=$(aws rds describe-db-instances \
     --db-instance-identifier mentalspace-ehr-prod \
     --region us-east-1 \
     --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
     --output text)

   echo "Security Group: $SG_ID"

   # Add rule (PostgreSQL port 5432)
   aws ec2 authorize-security-group-ingress \
     --group-id $SG_ID \
     --protocol tcp \
     --port 5432 \
     --cidr $MY_IP/32 \
     --region us-east-1
   ```

2. **Run Migration from Local**
   ```bash
   export DATABASE_URL="postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr"

   cd packages/database
   npx prisma migrate deploy
   ```

3. **Remove the Security Group Rule**
   ```bash
   aws ec2 revoke-security-group-ingress \
     --group-id $SG_ID \
     --protocol tcp \
     --port 5432 \
     --cidr $MY_IP/32 \
     --region us-east-1
   ```

---

## Method 4: Via psql Command Line

If you have `psql` installed and security group access:

```bash
# Set connection string
export PGPASSWORD="MentalSpace2024!SecurePwd"

# Connect and run migration SQL
psql -h mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com \
     -U mentalspace_admin \
     -d mentalspace_ehr \
     -c "ALTER TABLE intake_form_submissions
         ADD COLUMN IF NOT EXISTS \"signatureData\" TEXT,
         ADD COLUMN IF NOT EXISTS \"signedByName\" TEXT,
         ADD COLUMN IF NOT EXISTS \"signedDate\" TIMESTAMP(3),
         ADD COLUMN IF NOT EXISTS \"signatureIpAddress\" TEXT,
         ADD COLUMN IF NOT EXISTS \"consentAgreed\" BOOLEAN NOT NULL DEFAULT false;"

# Verify
psql -h mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com \
     -U mentalspace_admin \
     -d mentalspace_ehr \
     -c "SELECT column_name FROM information_schema.columns
         WHERE table_name = 'intake_form_submissions'
         AND column_name IN ('signatureData', 'signedByName', 'signedDate', 'signatureIpAddress', 'consentAgreed');"
```

---

## Method 5: SQL File (Provided)

I've created a SQL file for you: `apply-migration-direct.sql`

You can run it using any method:
- AWS RDS Query Editor (copy/paste)
- psql: `psql ... -f apply-migration-direct.sql`
- Any PostgreSQL client (DBeaver, pgAdmin, etc.)

---

## Verification

After applying migration by ANY method, verify it worked:

### SQL Verification
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'intake_form_submissions'
AND column_name IN ('signatureData', 'signedByName', 'signedDate', 'signatureIpAddress', 'consentAgreed')
ORDER BY column_name;
```

**Expected Result**: 5 rows showing the new columns

### Application Verification
1. Login to client portal: https://mentalspaceehr.com/portal
2. Open an assigned intake form
3. Scroll to bottom - e-signature section should work
4. Complete signature and submit
5. Login to EHR
6. View the submission
7. Signature should display with audit trail

---

## What These Columns Do

| Column | Type | Purpose |
|--------|------|---------|
| `signatureData` | TEXT | Base64-encoded PNG image of signature |
| `signedByName` | TEXT | Client's full legal name |
| `signedDate` | TIMESTAMP | When signature was applied |
| `signatureIpAddress` | TEXT | IP address for audit trail |
| `consentAgreed` | BOOLEAN | E-signature consent confirmation |

---

## Troubleshooting

### "Permission Denied"
- Check database user has ALTER TABLE permission
- Try using master/admin user

### "Connection Timeout"
- Check security group allows your IP
- Verify RDS endpoint is correct
- Check VPC/network settings

### "Column Already Exists"
- Migration may already be applied
- Verify with: `\d intake_form_submissions` (in psql)
- Or check the verification SQL above

### "Cannot Connect to RDS"
- RDS is in private subnet
- Use one of the VPC-based methods (ECS Exec, EC2, etc.)
- Or temporarily add security group rule

---

## Recommended Method

**For quickest result**: Use **Method 1 (AWS RDS Query Editor)**
- No local setup needed
- Works from browser
- Takes 30 seconds
- No security group changes needed

**Alternative**: If Query Editor isn't enabled, use **Method 3 (Temporary Security Group)** which takes about 5 minutes total.

---

## After Migration is Applied

✅ E-signature feature will be **fully functional**
✅ Clients can sign forms in portal
✅ Signatures stored with complete audit trail
✅ Staff can view signatures in EHR

Then you can:
1. Test the e-signature workflow
2. Train staff on both features
3. Start using in production!

---

**Need Help?**
- All methods are safe and reversible
- Migration uses `ADD COLUMN IF NOT EXISTS` so it's idempotent
- Can run multiple times safely
- Choose the method that works best for your access level

**Estimated Time**: 30 seconds to 5 minutes depending on method chosen
