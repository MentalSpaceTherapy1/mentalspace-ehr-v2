# MentalSpace EHR - Production Deployment Guide

**Complete guide for reproducible, verifiable production deployments using immutable image digests**

---

## Table of Contents

1. [Overview](#overview)
2. [Deployment Methods](#deployment-methods)
3. [Prerequisites](#prerequisites)
4. [Manual Deployment](#manual-deployment)
5. [Automated Deployment (GitHub Actions)](#automated-deployment-github-actions)
6. [Smoke Tests](#smoke-tests)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This deployment infrastructure provides:

- **Immutable Deployments** - Uses Docker image digests (SHA256), not `:latest` tags
- **Reproducible Builds** - Every build includes Git SHA and build timestamp
- **Automated Verification** - Smoke tests run after every deployment
- **Automatic Rollback** - Rolls back on deployment failures
- **Deployment Tracking** - Full audit trail from commit to production
- **Health Checks** - Container and ALB health validation
- **Zero Downtime** - Rolling deployments with health checks

---

## Deployment Methods

### Method 1: Manual Script Deployment (Recommended for Testing)

Use the production release script for manual, controlled deployments.

**When to use:**
- Testing deployment process
- Emergency deployments
- Debugging deployment issues
- First-time setup verification

**Command:**
```bash
./ops/release_backend.sh
```

### Method 2: Automated CI/CD (Recommended for Production)

Use GitHub Actions for automated deployments on every push to master.

**When to use:**
- Regular production deployments
- Continuous delivery workflow
- Team collaboration
- Automated testing pipeline

**Trigger:** Automatic on push to `master` branch, or manual workflow dispatch

---

## Prerequisites

### Required Tools

- **AWS CLI** v2.x or higher
- **Docker** 20.x or higher
- **jq** (JSON processor)
- **curl** (for smoke tests)
- **bc** (for response time calculations)
- **Git** (for version tracking)

**Installation (Windows with Git Bash):**
```bash
# AWS CLI - download from https://aws.amazon.com/cli/
# Docker Desktop - download from https://www.docker.com/products/docker-desktop
# jq - download from https://stedolan.github.io/jq/download/
# curl and bc - included with Git Bash
```

**Installation (macOS):**
```bash
brew install awscli docker jq bc
```

**Installation (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y awscli docker.io jq bc curl git
```

### AWS Credentials

Ensure AWS credentials are configured:

```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### GitHub Secrets (for CI/CD)

Configure these secrets in your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID` - Your AWS access key
   - `AWS_SECRET_ACCESS_KEY` - Your AWS secret key

---

## Manual Deployment

### Step-by-Step Process

**1. Ensure Clean Working Directory**

The deployment script checks for uncommitted changes:

```bash
git status
```

If you have uncommitted changes, you'll be prompted to continue or abort.

**2. Make Script Executable (First time only)**

```bash
chmod +x ./ops/release_backend.sh
chmod +x ./ops/smoke-tests.sh
```

**3. Run Deployment Script**

```bash
./ops/release_backend.sh
```

**4. Deployment Process**

The script will:

1. **Pre-flight Checks**
   - Verify Git repository status
   - Capture current Git SHA
   - Check for uncommitted changes

2. **Build Phase**
   - Login to ECR
   - Build Docker image with Git SHA baked in
   - Tag with short Git SHA (e.g., `abc1234`)

3. **Push Phase**
   - Push image to ECR
   - Capture immutable image digest (SHA256)

4. **Deploy Phase**
   - Get current task definition (for rollback)
   - Create new task definition with image digest
   - Update ECS service
   - Wait for deployment to stabilize (timeout: 15 minutes)

5. **Verification Phase**
   - Check target group health
   - Run smoke tests
   - Verify Git SHA in /version endpoint
   - Check for errors in logs

6. **Report Generation**
   - Generate deployment report in `./ops/deployment-reports/`
   - Display summary on terminal

**5. Review Deployment Report**

After deployment completes, a detailed report is saved:

```
./ops/deployment-reports/deployment-20250121-143022.md
```

### Rollback on Failure

If any step fails (deployment timeout, health check failure, smoke test failure), the script automatically rolls back to the previous task definition.

**Automatic Rollback Triggers:**
- Deployment doesn't stabilize within 15 minutes
- Target health checks fail after 10 attempts
- Smoke tests fail (version mismatch, health endpoint down)

---

## Automated Deployment (GitHub Actions)

### Workflow Triggers

**Automatic Trigger:**
- Pushes to `master` branch
- Changes to backend code (`packages/backend/**`)

**Manual Trigger:**
- Go to **Actions** → **Deploy Backend to Production** → **Run workflow**

### Workflow Steps

The GitHub Actions workflow performs the same steps as the manual script:

1. **Checkout** - Gets the code with full Git history
2. **Git Info** - Captures Git SHA and build time
3. **AWS Auth** - Configures AWS credentials
4. **ECR Login** - Authenticates with ECR
5. **Build** - Builds Docker image with Git SHA
6. **Push** - Pushes to ECR and captures digest
7. **Task Def** - Creates new task definition
8. **Deploy** - Updates ECS service
9. **Wait** - Waits for deployment to stabilize
10. **Health Check** - Verifies target group health
11. **Smoke Tests** - Runs production validation
12. **Summary** - Posts deployment summary

### Viewing Deployment Status

**In GitHub:**
1. Go to **Actions** tab
2. Click on the running workflow
3. View detailed logs for each step
4. Check the deployment summary at the bottom

**In AWS Console:**
1. Go to **ECS** → **Clusters** → **mentalspace-ehr-prod**
2. Click **mentalspace-backend** service
3. View **Deployments** tab
4. Monitor deployment progress

### Manual Workflow Dispatch

To manually trigger a deployment:

1. Go to **Actions** tab in GitHub
2. Select **Deploy Backend to Production**
3. Click **Run workflow**
4. Select branch (usually `master`)
5. Choose whether to run smoke tests
6. Click **Run workflow**

---

## Smoke Tests

### Running Standalone Smoke Tests

You can run smoke tests independently to verify production health:

```bash
./ops/smoke-tests.sh
```

**With expected Git SHA verification:**
```bash
./ops/smoke-tests.sh abc123def456789...
```

### Test Coverage

The smoke tests verify:

1. **Version Endpoint** - Returns correct Git SHA
2. **Health Endpoint** - Liveness check returns 200
3. **Database Connectivity** - Readiness check confirms DB connection
4. **HTTPS Enforcement** - HTTP is blocked/redirected
5. **Authentication** - Protected endpoints require auth (401)
6. **CORS Headers** - Properly configured
7. **Security Headers** - Helmet.js headers present
8. **Response Time** - API responds in < 2 seconds
9. **Error Format** - No PHI/sensitive data in errors
10. **Root Endpoint** - Base API is accessible

### Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MentalSpace EHR - Production Smoke Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[INFO] Testing API at: https://api.mentalspaceehr.com
[INFO] Expected Git SHA: abc123def456...

[INFO] Test 1: Version Endpoint
  Git SHA: abc123def456...
  Build Time: 2025-01-21T14:25:00Z
  Service: mentalspace-backend
[PASS] Version matches expected Git SHA

[INFO] Test 2: Health Endpoint (Liveness)
[PASS] Health endpoint returned 200 OK

[INFO] Test 3: Database Connectivity
[PASS] Database is connected

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SMOKE TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[INFO] Tests Passed: 10
[PASS] All tests passed!
```

---

## Rollback Procedures

### Automatic Rollback

The deployment scripts automatically rollback on failure. No manual intervention needed.

### Manual Rollback

If you need to manually rollback to a previous version:

**1. Find Previous Task Definition**

```bash
aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1 \
  --query 'services[0].deployments'
```

**2. Rollback to Specific Task Definition**

```bash
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --task-definition mentalspace-backend-prod:4 \
  --region us-east-1
```

**3. Wait for Rollback to Complete**

```bash
aws ecs wait services-stable \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1
```

**4. Verify Rollback**

```bash
curl -s https://api.mentalspaceehr.com/api/v1/version | jq
```

### Emergency Stop

To stop all deployments immediately:

```bash
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --desired-count 0 \
  --region us-east-1
```

**To restart:**
```bash
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --desired-count 1 \
  --region us-east-1
```

---

## Monitoring

### Real-time Logs

**CloudWatch Logs:**
```bash
export MSYS_NO_PATHCONV=1
aws logs tail /ecs/mentalspace-backend-prod \
  --follow \
  --region us-east-1
```

**Recent Errors:**
```bash
export MSYS_NO_PATHCONV=1
aws logs tail /ecs/mentalspace-backend-prod \
  --since 30m \
  --filter-pattern "ERROR" \
  --region us-east-1
```

### Health Checks

**ECS Service Status:**
```bash
aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1
```

**Target Group Health:**
```bash
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:706704660887:targetgroup/mentalspace-tg/a6a9aee5b6beffdd \
  --region us-east-1
```

**Current Version:**
```bash
curl -s https://api.mentalspaceehr.com/api/v1/version | jq
```

### Deployment History

View deployment reports:
```bash
ls -lh ./ops/deployment-reports/
```

View specific report:
```bash
cat ./ops/deployment-reports/deployment-20250121-143022.md
```

---

## Troubleshooting

### Deployment Stuck "IN_PROGRESS"

**Symptoms:** Deployment doesn't complete after 15 minutes

**Diagnosis:**
```bash
aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1 \
  --query 'services[0].events[0:10]'
```

**Common Causes:**
- Health check failing (container not responding)
- Resource limits (CPU/memory)
- Container failing to start

**Solution:**
1. Check container logs for errors
2. Verify health check endpoint is working
3. Check resource allocation
4. Manual rollback if needed

### Health Checks Failing

**Symptoms:** Targets marked "unhealthy" in target group

**Diagnosis:**
```bash
# Check container logs
export MSYS_NO_PATHCONV=1
aws logs tail /ecs/mentalspace-backend-prod --since 10m --region us-east-1

# Check health endpoint directly
curl -v https://api.mentalspaceehr.com/api/v1/health/live
```

**Common Causes:**
- Database connection failing
- Application crash on startup
- Missing environment variables
- Health check path incorrect

**Solution:**
1. Verify DATABASE_URL is correct
2. Check application startup logs
3. Verify health endpoint responds
4. Check security group allows ALB → ECS traffic

### Smoke Tests Failing

**Symptoms:** Deployment succeeds but smoke tests fail

**Diagnosis:**
```bash
# Run smoke tests manually
./ops/smoke-tests.sh

# Check specific endpoint
curl -v https://api.mentalspaceehr.com/api/v1/version
```

**Common Causes:**
- Version endpoint not returning Git SHA
- Database not connected
- Application not fully started

**Solution:**
1. Wait a few minutes for application to fully start
2. Re-run smoke tests
3. Check CloudWatch logs for errors

### Image Build Failures

**Symptoms:** Docker build fails

**Diagnosis:**
Check build logs in terminal or GitHub Actions

**Common Causes:**
- Dependency installation failure
- TypeScript compilation errors
- Prisma generation issues

**Solution:**
1. Run build locally: `docker build -f packages/backend/Dockerfile .`
2. Fix compilation errors
3. Verify package.json dependencies
4. Check Prisma schema validity

### Permission Errors

**Symptoms:** AWS CLI commands fail with "Access Denied"

**Diagnosis:**
```bash
aws sts get-caller-identity
```

**Solution:**
1. Verify AWS credentials are configured
2. Check IAM permissions
3. Ensure correct AWS profile is active

---

## Best Practices

1. **Always Test Locally First** - Run manual deployment in dev/staging before production

2. **Monitor Deployments** - Watch CloudWatch logs during deployment

3. **Verify After Deployment** - Always run smoke tests after deployment

4. **Keep Rollback Path Clear** - Don't delete previous task definitions

5. **Document Changes** - Use descriptive commit messages for deployment tracking

6. **Schedule Deployments** - Deploy during low-traffic periods when possible

7. **Have Rollback Plan** - Know how to rollback before deploying

8. **Review Deployment Reports** - Check reports for warnings or issues

9. **Use Feature Flags** - Deploy code changes with features disabled initially

10. **Gradual Rollouts** - For major changes, consider blue-green deployments

---

## Quick Reference

### Deployment Commands

```bash
# Manual deployment
./ops/release_backend.sh

# Smoke tests only
./ops/smoke-tests.sh abc123...

# View logs
export MSYS_NO_PATHCONV=1
aws logs tail /ecs/mentalspace-backend-prod --follow --region us-east-1

# Check version
curl https://api.mentalspaceehr.com/api/v1/version

# Manual rollback
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --task-definition mentalspace-backend-prod:REVISION \
  --region us-east-1
```

### Important URLs

- **API Base:** https://api.mentalspaceehr.com
- **Version:** https://api.mentalspaceehr.com/api/v1/version
- **Health:** https://api.mentalspaceehr.com/api/v1/health/live
- **Readiness:** https://api.mentalspaceehr.com/api/v1/health/ready

### AWS Resources

- **Cluster:** mentalspace-ehr-prod
- **Service:** mentalspace-backend
- **Task Family:** mentalspace-backend-prod
- **Container:** mentalspace-backend
- **ECR Repository:** mentalspace-backend
- **Target Group:** mentalspace-tg
- **Log Group:** /ecs/mentalspace-backend-prod

---

**For questions or issues, refer to the main project README or contact the development team.**
