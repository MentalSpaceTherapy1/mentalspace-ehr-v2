# Phase 1.1 Deployment Guide: Appointment Requirement Enforcement

**Date**: October 22, 2025
**Version**: 1.0.0
**Estimated Time**: 30-45 minutes
**Risk Level**: LOW

---

## 📋 Pre-Deployment Checklist

### Prerequisites Verified
- [x] Database migration created and tested locally
- [x] All existing notes have appointments (100% - 10/10 notes audited)
- [x] Backend endpoint implemented and ready
- [x] Frontend UI integrated
- [x] Local testing completed successfully
- [x] Migration safety check in place (fails if orphaned notes exist)

### Required Access
- [ ] AWS ECR access (Docker image push)
- [ ] AWS ECS access (Task definition update)
- [ ] AWS S3 access (Frontend deployment)
- [ ] AWS CloudFront access (Cache invalidation)
- [ ] Production database access (Migration)
- [ ] Production RDS security group access (Temporary - for migration)

### Required Credentials
- [ ] AWS CLI configured
- [ ] Production DATABASE_URL
- [ ] ECS cluster name: `mentalspace-ehr-prod`
- [ ] ECR repository: `706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend`
- [ ] S3 bucket: `mentalspace-ehr-frontend`
- [ ] CloudFront distribution: `E3AL81URAGOXL4`

---

## 🚀 Deployment Steps

### STEP 1: Build Frontend (5 minutes)

```bash
# Navigate to frontend
cd packages/frontend

# Set production API URL
export VITE_API_URL=https://api.mentalspaceehr.com/api/v1

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Verify build
ls -lh dist/
```

**Expected Output:**
```
dist/
  ├── assets/
  ├── index.html
  └── ... (minified JS/CSS files)
```

**Success Criteria:**
- ✅ Build completes without errors
- ✅ `dist/` folder contains index.html
- ✅ Bundle size is reasonable (<5MB total)

---

### STEP 2: Build Backend Docker Image (5 minutes)

```bash
# Navigate to backend
cd packages/backend

# Build Docker image
docker build -t mentalspace-backend:appointment-enforcement -f Dockerfile .

# Tag for ECR
docker tag mentalspace-backend:appointment-enforcement \
  706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Verify image
docker images | grep mentalspace-backend
```

**Expected Output:**
```
mentalspace-backend  appointment-enforcement  <IMAGE_ID>  X minutes ago  XXX MB
```

**Success Criteria:**
- ✅ Docker image builds successfully
- ✅ Image size < 500MB
- ✅ Image tagged correctly

---

### STEP 3: Push Docker Image to ECR (3 minutes)

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  706704660887.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Get the image digest (we'll need this)
aws ecr describe-images \
  --repository-name mentalspace-backend \
  --image-ids imageTag=latest \
  --region us-east-1 \
  --query 'imageDetails[0].imageDigest' \
  --output text
```

**Save the image digest** - you'll need it for ECS deployment!

**Success Criteria:**
- ✅ Image pushed successfully
- ✅ Image digest retrieved
- ✅ No authentication errors

---

### STEP 4: Deploy Database Migration (5 minutes)

⚠️ **CRITICAL STEP - READ CAREFULLY**

This step makes appointmentId required in the database. There's NO easy rollback.

```bash
# Navigate to database package
cd packages/database

# Set production database URL
export DATABASE_URL="postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr"

# Run migration
npx prisma migrate deploy
```

**Expected Output:**
```
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "mentalspace_ehr"

19 migrations found in prisma/migrations

Applying migration `20251022112351_make_appointment_required_in_clinical_notes`

The following migration(s) have been applied:

migrations/
  └─ 20251022112351_make_appointment_required_in_clinical_notes/
    └─ migration.sql

All migrations have been successfully applied.
```

**Success Criteria:**
- ✅ Migration applied without errors
- ✅ No "Cannot make appointmentId required" error (would indicate orphaned notes)
- ✅ Connection to production database successful

**If Migration Fails:**
1. Check error message for details
2. If orphaned notes found, run audit script to identify them
3. Create appointments for orphaned notes manually
4. Re-run migration

---

### STEP 5: Verify Migration (2 minutes)

```bash
# Verify constraint was applied
npx prisma db execute --stdin <<'SQL'
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'clinical_notes'
  AND column_name = 'appointmentId';
SQL
```

**Expected Output:**
```
column_name    | is_nullable | data_type
appointmentId  | NO          | text
```

`is_nullable` must be **NO**.

**Success Criteria:**
- ✅ appointmentId column is NOT NULL
- ✅ No errors querying database

---

### STEP 6: Deploy Backend to ECS (8 minutes)

```bash
# Update ECS task definition with new image
# Note: Replace <IMAGE_DIGEST> with actual digest from Step 3

aws ecs register-task-definition \
  --region us-east-1 \
  --cli-input-json file://task-definition.json

# Update ECS service to use new task definition
aws ecs update-service \
  --region us-east-1 \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend-service \
  --force-new-deployment

# Monitor deployment
aws ecs describe-services \
  --region us-east-1 \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend-service \
  --query 'services[0].deployments' \
  --output table
```

**Monitor the deployment:**
- Watch for "PRIMARY" deployment to reach "runningCount" = desired count
- Old deployment will drain connections and shut down
- Typical deployment time: 5-8 minutes

**Success Criteria:**
- ✅ New task definition registered
- ✅ Service update triggered
- ✅ New tasks running and healthy
- ✅ Old tasks drained and stopped

---

### STEP 7: Verify Backend Deployment (3 minutes)

```bash
# Check API health
curl https://api.mentalspaceehr.com/health

# Test new endpoint
curl -X POST https://api.mentalspaceehr.com/api/v1/appointments/get-or-create \
  -H "Authorization: Bearer <TEST_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "<TEST_CLIENT_ID>",
    "appointmentDate": "2025-10-23T14:00:00Z",
    "startTime": "14:00",
    "endTime": "15:00"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Existing appointment found" or "New appointment created",
  "data": { ... appointment object ... },
  "created": true/false
}
```

**Success Criteria:**
- ✅ Health endpoint returns 200 OK
- ✅ New endpoint responds correctly
- ✅ No 500 errors in CloudWatch logs

---

### STEP 8: Deploy Frontend to S3 (3 minutes)

```bash
# Navigate to frontend dist folder
cd packages/frontend/dist

# Sync to S3 (with delete flag to remove old files)
aws s3 sync . s3://mentalspace-ehr-frontend --delete

# Verify upload
aws s3 ls s3://mentalspace-ehr-frontend/
```

**Expected Output:**
```
                           PRE assets/
2025-10-22 ... index.html
2025-10-22 ... favicon.ico
...
```

**Success Criteria:**
- ✅ All files uploaded
- ✅ index.html present
- ✅ assets/ folder present

---

### STEP 9: Invalidate CloudFront Cache (2 minutes)

```bash
# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --paths "/*"

# Get invalidation ID from output, then check status
aws cloudfront get-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --id <INVALIDATION_ID>
```

**Expected Status:** `InProgress` → `Completed` (1-2 minutes)

**Success Criteria:**
- ✅ Invalidation created
- ✅ Status shows "Completed"

---

### STEP 10: Post-Deployment Verification (10 minutes)

#### Frontend Verification

```bash
# 1. Open frontend in browser
open https://mentalspaceehr.com

# 2. Navigate to a client
# 3. Click "Create Clinical Note"
# 4. Select "Progress Note"
# 5. Verify appointment selection screen shows with search/filter
# 6. Click "Create New Appointment"
# 7. Verify inline modal opens
# 8. Fill in appointment details
# 9. Click "Create & Continue"
# 10. Verify note form loads with appointment
```

**Manual Test Checklist:**
- [ ] Frontend loads without console errors
- [ ] Can navigate to note creation
- [ ] Appointment selection screen shows
- [ ] Search box works
- [ ] Filter dropdowns work
- [ ] "Create New Appointment" button works
- [ ] Modal opens and closes
- [ ] Can create appointment inline
- [ ] Appointment appears in list after creation
- [ ] Can select appointment and proceed to form
- [ ] Cannot create note without appointment (if you skip selection)

#### Backend Verification

```bash
# Check CloudWatch logs for errors
aws logs filter-log-events \
  --log-group-name /ecs/mentalspace-backend \
  --start-time $(date -u -d '10 minutes ago' +%s)000 \
  --filter-pattern "ERROR"

# Should show no critical errors related to appointments
```

#### Database Verification

```bash
# Check that new notes have appointments
node -e "
const { PrismaClient } = require('@mentalspace/database');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

(async () => {
  const count = await prisma.clinicalNote.count();
  const withAppt = await prisma.clinicalNote.count({
    where: { appointmentId: { not: null } }
  });
  console.log(\`Total notes: \${count}, With appointments: \${withAppt}\`);
  console.log(count === withAppt ? '✅ ALL GOOD' : '❌ PROBLEM');
  await prisma.\$disconnect();
})();
"
```

**Success Criteria:**
- ✅ All notes have appointments (100%)
- ✅ New notes can be created with appointments
- ✅ Inline appointment creation works
- ✅ Search/filter works
- ✅ No console errors
- ✅ No backend errors in logs

---

## 📊 Monitoring (30 minutes after deployment)

### Key Metrics to Watch

1. **API Response Times**
   - `/appointments/get-or-create` should be < 500ms
   - `/clinical-notes` POST should be < 1s

2. **Error Rates**
   - Check CloudWatch for 500 errors
   - Check for validation errors (should be rare)

3. **User Activity**
   - Monitor note creation success rate
   - Check for support tickets

4. **Database Performance**
   - No significant change in query times
   - NOT NULL constraint has minimal overhead

### CloudWatch Dashboard

```bash
# View recent errors
aws logs tail /ecs/mentalspace-backend --follow --filter-pattern "ERROR"

# View note creation attempts
aws logs tail /ecs/mentalspace-backend --follow --filter-pattern "clinical-note"
```

---

## 🔄 Rollback Plan

If critical issues occur:

### Rollback Backend (5 minutes)

```bash
# Revert to previous ECS task definition
aws ecs update-service \
  --region us-east-1 \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend-service \
  --task-definition mentalspace-backend:<PREVIOUS_REVISION>

# Monitor rollback
aws ecs describe-services \
  --region us-east-1 \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend-service
```

### Rollback Frontend (3 minutes)

```bash
# Re-deploy previous frontend version from backup/git
git checkout <PREVIOUS_COMMIT>
cd packages/frontend
npm run build
aws s3 sync dist/ s3://mentalspace-ehr-frontend --delete
aws cloudfront create-invalidation --distribution-id E3AL81URAGOXL4 --paths "/*"
```

### Database Migration Rollback

⚠️ **Database rollback is NOT recommended** because:
1. All notes already have appointments (verified)
2. Removing NOT NULL constraint doesn't fix any problem
3. Would require new migration

**If absolutely necessary:**
```sql
ALTER TABLE clinical_notes ALTER COLUMN "appointmentId" DROP NOT NULL;
```

---

## ✅ Success Criteria Summary

### Immediate (Day 1)
- [ ] Zero deployment errors
- [ ] All tests pass in production
- [ ] Note creation works end-to-end
- [ ] Inline appointment creation works
- [ ] Search/filter works
- [ ] 100% of notes have appointments

### Week 1
- [ ] Note creation success rate > 95%
- [ ] Average note creation time < 3 minutes
- [ ] Zero critical bugs
- [ ] Positive user feedback
- [ ] No support tickets about confusion

---

## 📞 Support Contact

If issues arise during deployment:

1. **Check CloudWatch Logs** first
2. **Review this guide** for troubleshooting steps
3. **Verify each step** was completed successfully
4. **Check database connectivity** if errors occur
5. **Review rollback plan** if critical issues

---

## 📝 Post-Deployment Tasks

After successful deployment:

- [ ] Update IMPLEMENTATION-COMPLETE.md with deployment timestamp
- [ ] Update PROJECT-TRACKER.md (mark Phase 1.1 as deployed)
- [ ] Create deployment summary document
- [ ] Archive deployment logs
- [ ] Schedule Phase 1.2 planning meeting
- [ ] Collect user feedback (1 week)
- [ ] Review metrics dashboard (1 week)

---

**Deployment Prepared By**: Claude AI Assistant
**Date**: October 22, 2025
**Version**: 1.0.0
**Status**: Ready for Execution
