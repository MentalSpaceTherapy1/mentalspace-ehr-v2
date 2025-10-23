# Manual Deployment Guide for MentalSpace EHR

## ⚠️ CRITICAL: GitHub Actions is Broken

**DO NOT TRUST GitHub Actions for deployments.** All automated deployments via GitHub Actions have been failing silently, completing in 20-60 seconds when they should take 10-15 minutes. This means many "deployments" never actually occurred.

**ALL FUTURE DEPLOYMENTS MUST BE DONE MANUALLY USING THIS GUIDE.**

---

## Backend Deployment Process

### Prerequisites
1. AWS CLI configured with proper credentials
2. Docker installed and running
3. Git repository up to date
4. Access to ECR repository: `706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend`

### Step-by-Step Backend Deployment

#### 1. Prepare for Deployment
```bash
# Ensure you're on the correct branch
git checkout master
git pull origin master

# Get current commit information
export GIT_SHA=$(git rev-parse HEAD)
export SHORT_SHA=$(git rev-parse --short HEAD)
export BUILD_TIME=$(date -u +"%Y-%m-%dTHH:%MM:%SSZ")

echo "Deploying commit: $GIT_SHA"
echo "Short SHA: $SHORT_SHA"
echo "Build time: $BUILD_TIME"
```

#### 2. Login to ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 706704660887.dkr.ecr.us-east-1.amazonaws.com
```

#### 3. Build Docker Image
```bash
# Build for linux/amd64 platform (required for AWS ECS)
docker build \
  --platform linux/amd64 \
  --build-arg GIT_SHA=$GIT_SHA \
  --build-arg BUILD_TIME=$BUILD_TIME \
  -t 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:$SHORT_SHA \
  -t 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest \
  -f packages/backend/Dockerfile \
  .
```

**Expected Duration:** 2-5 minutes

**Watch for:**
- Successful completion of both builder and production stages
- Prisma client generation completing successfully
- No errors in dependency installation

#### 4. Push to ECR
```bash
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:$SHORT_SHA
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest
```

**Expected Duration:** 1-3 minutes

#### 5. Get Image Digest
```bash
# Get the immutable image digest
export IMAGE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:$SHORT_SHA | cut -d'@' -f2)
export IMAGE_URI=706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend@$IMAGE_DIGEST

echo "Image URI: $IMAGE_URI"
echo "Image Digest: $IMAGE_DIGEST"
```

#### 6. Create New Task Definition

First, get the current task definition:
```bash
# Find current task definition
export CURRENT_REVISION=$(aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1 \
  --query 'services[0].taskDefinition' \
  --output text | grep -o '[0-9]*$')

echo "Current revision: $CURRENT_REVISION"

# Download current task definition
aws ecs describe-task-definition \
  --task-definition mentalspace-backend-prod:$CURRENT_REVISION \
  --region us-east-1 \
  --query 'taskDefinition' > task-def-temp.json
```

Create update script:
```javascript
// save as update-task-def.js
const fs = require('fs');

const IMAGE_URI = process.env.IMAGE_URI;
const GIT_SHA = process.env.GIT_SHA;
const BUILD_TIME = process.env.BUILD_TIME;

const taskDef = JSON.parse(fs.readFileSync('task-def-temp.json', 'utf8'));

// Update image
taskDef.containerDefinitions[0].image = IMAGE_URI;

// Add/update environment variables
const envVars = taskDef.containerDefinitions[0].environment;
const gitShaIndex = envVars.findIndex(e => e.name === 'GIT_SHA');
const buildTimeIndex = envVars.findIndex(e => e.name === 'BUILD_TIME');

if (gitShaIndex >= 0) envVars[gitShaIndex].value = GIT_SHA;
else envVars.push({ name: 'GIT_SHA', value: GIT_SHA });

if (buildTimeIndex >= 0) envVars[buildTimeIndex].value = BUILD_TIME;
else envVars.push({ name: 'BUILD_TIME', value: BUILD_TIME });

// Add healthcheck
taskDef.containerDefinitions[0].healthCheck = {
  command: ['CMD-SHELL', 'curl -f http://localhost:3001/api/v1/health/live || exit 1'],
  interval: 30,
  timeout: 5,
  retries: 3,
  startPeriod: 60
};

// Remove AWS-managed fields
delete taskDef.taskDefinitionArn;
delete taskDef.revision;
delete taskDef.status;
delete taskDef.requiresAttributes;
delete taskDef.compatibilities;
delete taskDef.registeredAt;
delete taskDef.registeredBy;

fs.writeFileSync('task-def-updated.json', JSON.stringify(taskDef, null, 2));
console.log('Task definition updated successfully');
```

Run the update:
```bash
node update-task-def.js

# Register new task definition
export NEW_TASK_DEF=$(aws ecs register-task-definition \
  --region us-east-1 \
  --cli-input-json file://task-def-updated.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "New task definition: $NEW_TASK_DEF"
```

#### 7. Deploy to ECS
```bash
# Update service with new task definition
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --task-definition $NEW_TASK_DEF \
  --region us-east-1 \
  --force-new-deployment

echo "Deployment initiated at $(date)"
```

#### 8. Wait for Deployment to Stabilize
```bash
# This will wait until the new task is running and healthy
# and the old task is stopped (takes 5-10 minutes)
aws ecs wait services-stable \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1

echo "Deployment completed successfully!"
```

**Expected Duration:** 5-10 minutes

**What's happening:**
1. ECS starts a new task with the new task definition
2. The docker-entrypoint.sh script runs database migrations
3. The application starts and passes health checks
4. The load balancer marks the new task as healthy
5. The old task is drained and stopped

#### 9. Verify Deployment
```bash
# Check service status
aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1 \
  --query 'services[0].{TaskDefinition:taskDefinition,RunningCount:runningCount,DesiredCount:desiredCount}'

# Test API health
curl https://api.mentalspaceehr.com/api/v1/health/live

# Check application version
curl https://api.mentalspaceehr.com/api/v1/version

# View recent logs
aws logs tail /ecs/mentalspace-backend-prod \
  --since 10m \
  --format short \
  --region us-east-1
```

#### 10. Document Deployment
```bash
# Create deployment record
echo "Deployment completed at $(date)" >> DEPLOYMENT_LOG.md
echo "Git SHA: $GIT_SHA" >> DEPLOYMENT_LOG.md
echo "Image: $IMAGE_URI" >> DEPLOYMENT_LOG.md
echo "Task Definition: $NEW_TASK_DEF" >> DEPLOYMENT_LOG.md
echo "---" >> DEPLOYMENT_LOG.md
```

---

## Frontend Deployment Process

### Step-by-Step Frontend Deployment

#### 1. Set Environment Variables
```bash
# Set production API URL
export VITE_API_URL=https://api.mentalspaceehr.com/api/v1
```

#### 2. Build Frontend
```bash
cd packages/frontend

# Build for production
npm run build
# OR if using Vite directly:
npx vite build --mode production
```

**Expected Duration:** 30-60 seconds

**Watch for:**
- TypeScript compilation success (or warnings if using vite build)
- Bundle size warnings (< 2.5MB is acceptable)
- Output in `dist/` directory

#### 3. Deploy to S3
```bash
# Sync to S3 bucket (--delete removes old files)
aws s3 sync dist/ s3://mentalspaceehr-frontend \
  --delete \
  --region us-east-1

cd ../..
```

**Expected Duration:** 10-30 seconds

#### 4. Invalidate CloudFront Cache
```bash
# Create cache invalidation
aws cloudfront create-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --paths "/*" \
  --region us-east-1
```

**Expected Duration:** 5-15 minutes for full propagation

#### 5. Verify Frontend Deployment
```bash
# Wait a few seconds for S3 propagation
sleep 5

# Test frontend (will be cached until CloudFront invalidation completes)
curl -I https://mentalspaceehr.com

# Check CloudFront invalidation status
aws cloudfront get-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --id <INVALIDATION_ID_FROM_STEP_4> \
  --region us-east-1
```

---

## Rollback Procedures

### Backend Rollback
```bash
# Find previous working revision
aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1 \
  --query 'services[0].deployments[*].{Status:status,TaskDef:taskDefinition}'

# Rollback to previous task definition
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --task-definition mentalspace-backend-prod:<PREVIOUS_REVISION> \
  --region us-east-1 \
  --force-new-deployment

# Wait for rollback to complete
aws ecs wait services-stable \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1
```

### Frontend Rollback
Keep previous `dist/` builds:
```bash
# Before deploying, backup current frontend
aws s3 sync s3://mentalspaceehr-frontend frontend-backup-$(date +%Y%m%d-%H%M%S)/ --region us-east-1

# To rollback
aws s3 sync frontend-backup-TIMESTAMP/ s3://mentalspaceehr-frontend --delete --region us-east-1
aws cloudfront create-invalidation --distribution-id E3AL81URAGOXL4 --paths "/*"
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All changes committed and pushed to Git
- [ ] Code reviewed (if applicable)
- [ ] Local testing completed
- [ ] Database migrations tested locally
- [ ] Environment variables verified

### During Backend Deployment
- [ ] Docker image built successfully
- [ ] Image pushed to ECR
- [ ] Task definition registered
- [ ] ECS service updated
- [ ] Deployment stabilized (no errors in logs)
- [ ] Health checks passing

### During Frontend Deployment
- [ ] Build completed without errors
- [ ] Files synced to S3
- [ ] CloudFront cache invalidated

### Post-Deployment Verification
- [ ] API health endpoint responding
- [ ] API version endpoint shows correct Git SHA
- [ ] Frontend loads without errors
- [ ] Frontend can communicate with backend (CORS working)
- [ ] Key features tested in production
- [ ] No error spikes in logs
- [ ] Database migrations applied correctly

### Documentation
- [ ] Deployment logged with Git SHA and timestamp
- [ ] Any manual migration steps documented
- [ ] Team notified of deployment

---

## Troubleshooting

### Issue: ECS Service Fails to Stabilize
**Symptoms:** `aws ecs wait services-stable` times out or fails

**Debug:**
```bash
# Check task status
aws ecs list-tasks --cluster mentalspace-ehr-prod --service-name mentalspace-backend --region us-east-1

# Get task details
aws ecs describe-tasks --cluster mentalspace-ehr-prod --tasks <TASK_ARN> --region us-east-1

# Check logs for errors
aws logs tail /ecs/mentalspace-backend-prod --since 10m --region us-east-1 | grep -i error
```

**Common Causes:**
- Database connection issues
- Migration failures
- Environment variable misconfiguration
- Health check failing

### Issue: Database Migration Fails
**Symptoms:** Container starts but crashes, logs show Prisma errors

**Fix:**
```bash
# Access the database directly (from within VPC or via bastion)
# Run migrations manually:
cd packages/database
npx prisma migrate deploy
```

### Issue: Frontend Shows Old Version
**Symptoms:** Changes not visible on frontend

**Fix:**
```bash
# Check CloudFront invalidation status
aws cloudfront list-invalidations --distribution-id E3AL81URAGOXL4 --region us-east-1

# Create new invalidation if needed
aws cloudfront create-invalidation --distribution-id E3AL81URAGOXL4 --paths "/*" --region us-east-1

# Clear browser cache and hard refresh (Ctrl+Shift+R)
```

---

## Deployment History Tracking

**Current Production State (as of 2025-10-23):**
- Task Definition: Revision 17
- Git SHA: `b2590657727e6c40666ab4a5d55e0f94f4ff935d`
- Deployed: Phase 1.5 (Amendment History System)
- Image Digest: `sha256:2eb1416302794b9e427ed1f313b4be5c5fd0a80a8e11c0bbd2d4d408186f4a44`

**⚠️ Previous Revisions (10-16) Have No Git SHA Tracking**
Revisions 10-16 were deployed via the broken GitHub Actions workflow and have no Git SHA metadata. We cannot determine exactly what code is in those revisions.

---

## Key Infrastructure Details

### AWS Resources
- **Region:** us-east-1
- **ECS Cluster:** mentalspace-ehr-prod
- **ECS Service:** mentalspace-backend
- **ECR Repository:** mentalspace-backend
- **S3 Bucket:** mentalspaceehr-frontend
- **CloudFront Distribution:** E3AL81URAGOXL4
- **RDS Instance:** mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com
- **Load Balancer Target Group:** mentalspace-tg

### Endpoints
- **API:** https://api.mentalspaceehr.com
- **Frontend:** https://mentalspaceehr.com
- **Health Check:** https://api.mentalspaceehr.com/api/v1/health/live
- **Version:** https://api.mentalspaceehr.com/api/v1/version

### Database
- **Host:** mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com
- **Port:** 5432
- **Database:** mentalspace_ehr
- **User:** mentalspace_admin
- **Note:** Not publicly accessible (VPC-only)

---

## Future: Fix GitHub Actions (When Time Permits)

The GitHub Actions workflow at `.github/workflows/deploy-backend.yml` needs debugging:

**Known Issues:**
- Workflows completing in 20-60 seconds (should be 10-15 min)
- No task definitions being registered
- No logs indicating what's failing

**Investigation Needed:**
1. Check AWS credentials in GitHub Secrets
2. Verify path filtering is triggering correctly
3. Review Docker build step for failures
4. Check ECR permissions

**For Now:** Continue using manual deployments as documented above.

---

*This guide was created on 2025-10-23 after discovering GitHub Actions deployment failures.*
