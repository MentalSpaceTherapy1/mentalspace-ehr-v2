# Database Schema Error - Debugging & Fix Guide

## Error Summary
**Error:** 500 Internal Server Error on login
**Cause:** Database schema mismatch - migrations not applied to production database
**API Endpoint:** `https://api.mentalspaceehr.com/api/v1/auth/login`

---

## Step 1: Check Backend Logs in CloudWatch

The exact error will be in your ECS container logs. Run these commands to see the error:

```bash
# Find your backend log group
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `mentalspace`)].logGroupName'

# Get the most recent log stream
aws logs describe-log-streams \
  --log-group-name /ecs/mentalspace-ehr-backend-prod \
  --order-by LastEventTime \
  --descending \
  --max-items 5

# View recent error logs (last 1 hour)
aws logs tail /ecs/mentalspace-ehr-backend-prod --since 1h --follow
```

**Look for errors like:**
```
Error: P1001: Can't reach database server
Error: P2021: The table does not exist in the current database
Error: P2002: Unique constraint failed
PrismaClientInitializationError: Schema is not up to date
```

---

## Step 2: Check Database Connection

Verify the backend can reach the RDS database:

```bash
# Get RDS endpoint
aws rds describe-db-instances \
  --query 'DBInstances[?contains(DBInstanceIdentifier, `mentalspace`)].{ID:DBInstanceIdentifier,Endpoint:Endpoint.Address,Status:DBInstanceStatus}'

# Check ECS task environment variables
aws ecs describe-task-definition \
  --task-definition mentalspace-ehr-backend-prod \
  --query 'taskDefinition.containerDefinitions[0].environment[?name==`DATABASE_URL` || name==`DB_HOST`]'
```

---

## Step 3: Apply Database Migrations (FIX)

The most likely issue is that **database migrations haven't been applied** to your production RDS instance.

### Option A: Run Migrations from Local Machine (Recommended)

```bash
# 1. Get your production database URL from ECS task definition
aws ecs describe-task-definition \
  --task-definition mentalspace-ehr-backend-prod \
  --query 'taskDefinition.containerDefinitions[0].environment' \
  | grep -E 'DATABASE_URL|DB_HOST|DB_PASSWORD|DB_USER|DB_NAME'

# 2. Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://USERNAME:PASSWORD@RDS_ENDPOINT:5432/DATABASE_NAME"

# 3. Navigate to database package
cd /home/user/mentalspace-ehr-v2/packages/database

# 4. Run migrations
npx prisma migrate deploy

# 5. Verify schema
npx prisma db pull
```

### Option B: Run Migrations via ECS Exec (In Container)

```bash
# Enable ECS Exec if not already enabled
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-ehr-backend-prod \
  --enable-execute-command

# Get running task ID
TASK_ID=$(aws ecs list-tasks \
  --cluster mentalspace-ehr-prod \
  --service-name mentalspace-ehr-backend-prod \
  --query 'taskArns[0]' \
  --output text | awk -F/ '{print $NF}')

# Connect to container
aws ecs execute-command \
  --cluster mentalspace-ehr-prod \
  --task $TASK_ID \
  --container mentalspace-ehr-backend \
  --interactive \
  --command "/bin/sh"

# Once inside container, run:
cd /app
npx prisma migrate deploy
exit
```

### Option C: Add Migration to Deployment Pipeline

Update your ECS task definition to run migrations on startup:

**Create migration script:** `packages/backend/scripts/run-migrations.sh`
```bash
#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/node_modules/.prisma/client
npx prisma migrate deploy

echo "Starting application..."
exec node dist/index.js
```

Then update your Dockerfile to use this as the entry point.

---

## Step 4: Check Migration Status

After running migrations, verify they applied successfully:

```bash
# Check which migrations are applied
export DATABASE_URL="postgresql://..."
cd /home/user/mentalspace-ehr-v2/packages/database

npx prisma migrate status
```

**Expected output:**
```
The following migrations have been applied:

migrations/
  └─ 20251013002302_init/
  └─ 20251013045625_add_legal_guardian_model/
  └─ 20251013143959_add_productivity_module/
  └─ 20251013160420_add_scheduling_enhancements/
  └─ 20251013180424_add_telehealth_sessions/
  └─ 20251013213554_add_telehealth_appointment_relation/
  └─ 20251014023842_make_user_fields_optional/
  └─ 20251014025443_make_client_maritalstatus_optional/
  └─ 20251016022832_add_telehealth_consent_model/
  └─ 20251016032353_add_client_portal_models/
  └─ 20251016044310_add_enhanced_client_portal_module_9/
  └─ 20251016150929_add_assessment_assignments/
  └─ 20251016152725_add_portal_enhancements/
  └─ 20251017184656_add_multiple_roles_support/
  └─ 20251017193200_clinical_notes_business_rules/

Database schema is up to date!
```

---

## Step 5: Test After Migration

```bash
# Test database connection from backend
curl -X POST https://api.mentalspaceehr.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://mentalspaceehr.com" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }' \
  -v
```

**Expected response:** `200 OK` with JWT tokens

---

## Common Database Errors & Fixes

### Error: "P2021: The table `User` does not exist"
**Cause:** Migrations not applied
**Fix:** Run `npx prisma migrate deploy`

### Error: "P1001: Can't reach database server"
**Cause:** Database connection issue
**Fix:**
1. Check RDS security group allows ECS tasks
2. Verify DATABASE_URL is correct
3. Check RDS is running

### Error: "P3005: The database schema is not empty"
**Cause:** Trying to run `prisma migrate dev` on production
**Fix:** Use `npx prisma migrate deploy` instead

### Error: "Unique constraint failed on the fields: (`email`)"
**Cause:** Duplicate user in database
**Fix:** Clean up duplicate users or use different email

### Error: "Column does not exist"
**Cause:** Schema mismatch - new code deployed but migrations not run
**Fix:** Run migrations BEFORE deploying new backend code

---

## Security Group Configuration

Ensure your RDS security group allows connections from ECS:

```bash
# Get RDS security group
aws rds describe-db-instances \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text

# Get ECS task security group
aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-ehr-backend-prod \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' \
  --output text

# Add inbound rule to RDS security group allowing ECS
aws ec2 authorize-security-group-ingress \
  --group-id <RDS_SG_ID> \
  --protocol tcp \
  --port 5432 \
  --source-group <ECS_SG_ID>
```

---

## Quick Fix Script

Save this as `fix-production-db.sh`:

```bash
#!/bin/bash
set -e

echo "=== MentalSpace EHR - Production Database Migration ==="

# 1. Get database credentials from AWS Secrets Manager
echo "Fetching database credentials..."
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id mentalspace/db/credentials-prod \
  --query SecretString \
  --output text)

DB_HOST=$(echo $DB_SECRET | jq -r '.host')
DB_USER=$(echo $DB_SECRET | jq -r '.username')
DB_PASSWORD=$(echo $DB_SECRET | jq -r '.password')
DB_NAME=$(echo $DB_SECRET | jq -r '.dbname')
DB_PORT=$(echo $DB_SECRET | jq -r '.port // "5432"')

# 2. Construct DATABASE_URL
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Database: ${DB_NAME}@${DB_HOST}"

# 3. Navigate to database package
cd /home/user/mentalspace-ehr-v2/packages/database

# 4. Run migrations
echo "Running migrations..."
npx prisma migrate deploy

# 5. Check migration status
echo "Checking migration status..."
npx prisma migrate status

echo "✅ Database migrations complete!"
echo ""
echo "Next steps:"
echo "1. Test login at https://mentalspaceehr.com"
echo "2. Check CloudWatch logs for any remaining errors"
echo "3. Monitor application health"
```

Run it:
```bash
chmod +x fix-production-db.sh
./fix-production-db.sh
```

---

## Prevention: Auto-Run Migrations on Deploy

To prevent this in the future, update your deployment to run migrations automatically.

### Update ECS Task Definition

Add an init container or modify the startup command:

**Option 1: Add init container**
```json
{
  "name": "migration",
  "image": "your-backend-image",
  "essential": false,
  "command": ["npx", "prisma", "migrate", "deploy"],
  "environment": [
    {"name": "DATABASE_URL", "value": "..."}
  ]
}
```

**Option 2: Modify startup command**
```json
{
  "name": "backend",
  "command": ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
}
```

---

## Debugging Checklist

- [ ] Check CloudWatch logs for exact error message
- [ ] Verify RDS instance is running and accessible
- [ ] Check DATABASE_URL environment variable is set correctly
- [ ] Verify security groups allow ECS → RDS connection
- [ ] Run `npx prisma migrate deploy` to apply migrations
- [ ] Check migration status with `npx prisma migrate status`
- [ ] Test login endpoint after migration
- [ ] Monitor CloudWatch logs for new errors

---

## Need Help?

If migrations fail or you see other errors:

1. **Get full error from CloudWatch:**
   ```bash
   aws logs tail /ecs/mentalspace-ehr-backend-prod --since 30m
   ```

2. **Check database connectivity:**
   ```bash
   # From an EC2 instance in same VPC
   psql -h YOUR_RDS_ENDPOINT -U postgres -d mentalspace
   ```

3. **Verify Prisma client is generated:**
   ```bash
   # In backend container
   ls -la node_modules/.prisma/client
   ```

---

**Most Likely Fix:** Run `npx prisma migrate deploy` with your production DATABASE_URL to apply all pending migrations.
