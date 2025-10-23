# Phase 1.4 Deployment Guide

## Quick Start

Since AWS is not accessible from the local development machine, use one of these methods:

### Option 1: Deploy from AWS CloudShell (Recommended - Fastest)

1. **Upload files to CloudShell**:
   ```bash
   # From local machine, save Docker image
   docker save mentalspace-backend:latest | gzip > mentalspace-backend-phase-1.4.tar.gz

   # Upload to S3 temporarily
   aws s3 cp mentalspace-backend-phase-1.4.tar.gz s3://mentalspaceehr-temp/ --region us-east-1
   ```

2. **Open AWS CloudShell** (https://console.aws.amazon.com/cloudshell)

3. **Download and load image**:
   ```bash
   # Download from S3
   aws s3 cp s3://mentalspaceehr-temp/mentalspace-backend-phase-1.4.tar.gz .

   # Load Docker image
   gunzip mentalspace-backend-phase-1.4.tar.gz
   docker load < mentalspace-backend-phase-1.4.tar

   # Clone repository
   git clone https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2.git
   cd mentalspace-ehr-v2
   git checkout 10154ed  # Phase 1.4 commit

   # Run deployment script
   chmod +x deploy-phase-1.4.sh
   ./deploy-phase-1.4.sh
   ```

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Apply Database Migration

```bash
# Get running ECS task
TASK_ARN=$(aws ecs list-tasks \
  --cluster mentalspace-ehr-prod \
  --service-name mentalspace-backend \
  --desired-status RUNNING \
  --query 'taskArns[0]' \
  --output text)

# Connect to task and run migration
aws ecs execute-command \
  --cluster mentalspace-ehr-prod \
  --task $TASK_ARN \
  --container mentalspace-backend \
  --interactive \
  --command "npx prisma migrate deploy"
```

**Verify migration**:
```bash
# Inside the container
npx prisma studio

# Or query directly
echo "SELECT COUNT(*) FROM signature_attestations;" | \
  PGPASSWORD="MentalSpace2024!SecurePwd" psql \
  -h mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com \
  -U mentalspace_admin \
  -d mentalspace_ehr
```

Expected result: 4 attestations (GA clinician, GA supervisor, FL clinician, US generic)

#### Step 2: Push Docker Image to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  706704660887.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag mentalspace-backend:latest \
  706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:phase-1.4

docker tag mentalspace-backend:latest \
  706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Push to ECR
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:phase-1.4
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Get image digest
IMAGE_DIGEST=$(aws ecr describe-images \
  --repository-name mentalspace-backend \
  --image-ids imageTag=phase-1.4 \
  --query 'imageDetails[0].imageDigest' \
  --output text)

echo "Image digest: $IMAGE_DIGEST"
```

#### Step 3: Update ECS Task Definition

```bash
# Download current task definition
aws ecs describe-task-definition \
  --task-definition mentalspace-backend-prod \
  --query 'taskDefinition' > current-task-def.json

# Update image reference (use actual digest from step 2)
# Edit current-task-def.json manually or use Python script
python3 << EOF
import json

with open('current-task-def.json', 'r') as f:
    task_def = json.load(f)

# Update image
task_def['containerDefinitions'][0]['image'] = \
    '706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend@$IMAGE_DIGEST'

# Remove read-only fields
for field in ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes',
              'compatibilities', 'registeredAt', 'registeredBy']:
    task_def.pop(field, None)

with open('new-task-def.json', 'w') as f:
    json.dump(task_def, f, indent=2)
EOF

# Register new task definition
aws ecs register-task-definition --cli-input-json file://new-task-def.json
```

#### Step 4: Update ECS Service

```bash
# Update service with new task definition
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --task-definition mentalspace-backend-prod \
  --force-new-deployment

# Wait for deployment to complete (3-5 minutes)
aws ecs wait services-stable \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend
```

#### Step 5: Deploy Frontend

```bash
# Sync to S3
aws s3 sync packages/frontend/dist/ s3://mentalspaceehr-frontend --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --paths "/*"

# Wait for invalidation
aws cloudfront wait invalidation-completed \
  --distribution-id E3AL81URAGOXL4 \
  --id <invalidation-id-from-previous-command>
```

#### Step 6: Verify Deployment

```bash
# Check backend health
curl https://api.mentalspaceehr.com/api/v1/health

# Check frontend
curl -I https://mentalspaceehr.com

# Check new endpoints
curl -H "Authorization: Bearer <token>" \
  https://api.mentalspaceehr.com/api/v1/users/signature-status

# View ECS service status
aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount,deployment:deployments[0].status}'

# View CloudWatch logs
aws logs tail /aws/ecs/mentalspace-backend-prod --follow
```

### Option 3: Deploy from EC2 Instance

If you have an EC2 instance in the VPC:

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@your-instance

# Install Docker and AWS CLI
sudo yum install -y docker aws-cli git
sudo service docker start

# Clone repo and checkout Phase 1.4
git clone https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2.git
cd mentalspace-ehr-v2
git checkout 10154ed

# Build and deploy
docker build -f packages/backend/Dockerfile -t mentalspace-backend:latest .
chmod +x deploy-phase-1.4.sh
./deploy-phase-1.4.sh
```

---

## Post-Deployment Testing

### 1. Database Verification

```sql
-- Connect to RDS
PGPASSWORD="MentalSpace2024!SecurePwd" psql \
  -h mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com \
  -U mentalspace_admin \
  -d mentalspace_ehr

-- Check attestations
SELECT id, role, noteType, jurisdiction, LEFT(attestationText, 50) as text_preview
FROM signature_attestations
ORDER BY jurisdiction, role;

-- Expected: 4 rows (GA CLINICIAN, GA SUPERVISOR, FL CLINICIAN, US CLINICIAN)

-- Check user signature fields
\d users
-- Should show: signaturePin, signaturePassword, signatureBiometric columns

-- Check signature events table
\d signature_events
-- Should exist with all columns
```

### 2. API Testing

```bash
# Login to get token
TOKEN=$(curl -s -X POST https://api.mentalspaceehr.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ejoseph@chctherapy.com","password":"your-password"}' \
  | jq -r '.data.token')

# Check signature status
curl -H "Authorization: Bearer $TOKEN" \
  https://api.mentalspaceehr.com/api/v1/users/signature-status

# Expected: {"success":true,"data":{"hasPinConfigured":false,"hasPasswordConfigured":false}}

# Set signature PIN
curl -X POST https://api.mentalspaceehr.com/api/v1/users/signature-pin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","currentPassword":"your-password"}'

# Expected: {"success":true,"message":"Signature PIN set successfully"}

# Get attestation for progress note
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.mentalspaceehr.com/api/v1/signatures/attestation/Progress%20Note?signatureType=AUTHOR"

# Expected: JSON with attestationText field
```

### 3. Frontend Testing

1. **Navigate to https://mentalspaceehr.com**
2. **Login** as ejoseph@chctherapy.com
3. **Go to Settings** → Look for "Signature Authentication" section
4. **Set up PIN**:
   - Enter current password
   - Enter 4-6 digit PIN
   - Click "Set PIN"
   - Verify success message
5. **Create a draft note**
6. **Click "Sign Note"**:
   - Verify SignatureModal appears
   - Verify attestation text displays
   - Verify PIN input field appears
   - Enter PIN and sign
   - Verify note status changes

### 4. Database Audit Trail Verification

```sql
-- Check signature events were created
SELECT
  se.id,
  se.signatureType,
  se.authMethod,
  se.signedAt,
  se.ipAddress,
  u.email,
  cn.noteType
FROM signature_events se
JOIN users u ON se.userId = u.id
JOIN clinical_notes cn ON se.noteId = cn.id
ORDER BY se.signedAt DESC
LIMIT 10;

-- Expected: Signature event with IP, user agent, timestamp
```

---

## Rollback Procedure

If issues occur:

### Backend Rollback

```bash
# Get previous task definition revision
PREVIOUS_REV=$(aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text | cut -d':' -f7)

# Update service to previous revision
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --task-definition mentalspace-backend-prod:$PREVIOUS_REV \
  --force-new-deployment

# Wait for rollback
aws ecs wait services-stable \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend
```

### Database Rollback

⚠️ **Database rollback is destructive**. Only do this if absolutely necessary.

```sql
-- Backup signature events first
CREATE TABLE signature_events_backup AS SELECT * FROM signature_events;
CREATE TABLE signature_attestations_backup AS SELECT * FROM signature_attestations;

-- Drop Phase 1.4 tables
DROP TABLE signature_events;
DROP TABLE signature_attestations;

-- Remove user columns
ALTER TABLE users DROP COLUMN IF EXISTS signaturePin;
ALTER TABLE users DROP COLUMN IF EXISTS signaturePassword;
ALTER TABLE users DROP COLUMN IF EXISTS signatureBiometric;
```

### Frontend Rollback

```bash
# Get previous frontend build from git
git checkout <previous-commit>
cd packages/frontend
VITE_API_URL=https://api.mentalspaceehr.com/api/v1 npm run build

# Deploy
aws s3 sync dist/ s3://mentalspaceehr-frontend --delete
aws cloudfront create-invalidation --distribution-id E3AL81URAGOXL4 --paths "/*"
```

---

## Monitoring

### CloudWatch Logs

```bash
# Tail logs
aws logs tail /aws/ecs/mentalspace-backend-prod --follow

# Filter for signature-related logs
aws logs filter-log-events \
  --log-group-name /aws/ecs/mentalspace-backend-prod \
  --filter-pattern "signature" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### Metrics to Watch

1. **ECS Service Health**:
   - Running tasks count should equal desired
   - No tasks in STOPPED state

2. **API Response Times**:
   - Monitor `/api/v1/signatures/*` endpoints
   - Should be < 500ms

3. **Error Rates**:
   - Watch for 401 errors (invalid signature auth)
   - Watch for 500 errors (server errors)

4. **Database Queries**:
   - Monitor signature_events inserts
   - Check for slow queries on signature tables

---

## Troubleshooting

### Issue: "Migration already applied" error

**Solution**: Migration was already applied. Skip to Step 2.

### Issue: "Cannot connect to database" during migration

**Solution**: Check RDS security group allows ECS tasks. Verify DATABASE_URL in ECS task.

### Issue: "Invalid signature PIN or password" in production

**Solution**:
1. Check user has set up credentials in settings
2. Verify bcrypt is working correctly
3. Check database for signaturePin/signaturePassword values

### Issue: Frontend shows old version after deployment

**Solution**:
1. CloudFront cache not invalidated. Run:
   ```bash
   aws cloudfront create-invalidation --distribution-id E3AL81URAGOXL4 --paths "/*"
   ```
2. Clear browser cache (Ctrl+F5)

### Issue: "Attestation not found" error

**Solution**: Check attestations were seeded:
```sql
SELECT COUNT(*) FROM signature_attestations;
```
Should return 4. If 0, re-run migration.

---

## Support Contacts

- **Technical Issues**: Check CloudWatch logs first
- **Database Issues**: Review RDS slow query logs
- **User Issues**: Check signature_events table for failed attempts

---

**Deployment prepared by**: Claude Code
**Date**: October 22, 2025
**Commit**: 10154ed
**Estimated deployment time**: 15-30 minutes
**Risk level**: Low (additive changes only, no breaking changes)
