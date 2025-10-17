# Deployment Guide - MentalSpace EHR V2

**Version:** 2.0
**Last Updated:** October 13, 2025

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Infrastructure Deployment](#infrastructure-deployment)
4. [Secrets Migration](#secrets-migration)
5. [Application Deployment](#application-deployment)
6. [Verification & Testing](#verification--testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Node.js 20.x LTS
node --version  # Should be v20.x.x

# AWS CLI v2
aws --version  # Should be 2.x.x

# AWS CDK CLI
npm install -g aws-cdk
cdk --version  # Should be 2.x.x

# Git
git --version

# PostgreSQL client (for database operations)
psql --version
```

### AWS Account Setup

1. **AWS Account with appropriate permissions:**
   - Administrator access (for initial setup)
   - Or specific IAM policies for CDK deployment

2. **Configure AWS CLI profiles:**

```bash
# Configure development profile
aws configure --profile mentalspace-dev
# Enter: Access Key ID
# Enter: Secret Access Key
# Enter: Default region (us-east-1)
# Enter: Default output format (json)

# Configure staging profile
aws configure --profile mentalspace-staging

# Configure production profile
aws configure --profile mentalspace-prod
```

3. **Verify AWS credentials:**

```bash
aws sts get-caller-identity --profile mentalspace-dev
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd mentalspace-ehr-v2
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run bootstrap
```

### 3. Generate Prisma Client

```bash
cd packages/database
npx prisma generate
cd ../..
```

---

## Infrastructure Deployment

### Step 1: Bootstrap AWS CDK (First Time Only)

```bash
cd infrastructure

# Bootstrap for development
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1 --profile mentalspace-dev

# Bootstrap for staging
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1 --profile mentalspace-staging

# Bootstrap for production
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1 --profile mentalspace-prod
```

### Step 2: Review Infrastructure Changes

```bash
# Review what will be deployed
cdk diff --all --profile mentalspace-dev
```

### Step 3: Deploy Network Stack

```bash
# Deploy VPC and networking
cdk deploy NetworkStack \
  --profile mentalspace-dev \
  -c environment=dev \
  --require-approval never

# Note the outputs (VPC ID, Subnet IDs, etc.)
```

### Step 4: Deploy Security Stack

```bash
# Deploy KMS keys and Secrets Manager
cdk deploy SecurityStack \
  --profile mentalspace-dev \
  -c environment=dev \
  --require-approval never

# Note the KMS Key ID and Secret ARNs
```

### Step 5: Deploy Database Stack

```bash
# Deploy RDS PostgreSQL and DynamoDB
cdk deploy DatabaseStack \
  --profile mentalspace-dev \
  -c environment=dev \
  --require-approval never

# IMPORTANT: Save the database endpoint and credentials ARN
```

**Retrieve Database Password:**

```bash
# Get the secret ARN from the output
export SECRET_ARN="arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:..."

# Retrieve the password
aws secretsmanager get-secret-value \
  --secret-id $SECRET_ARN \
  --profile mentalspace-dev \
  --query SecretString \
  --output text | jq -r .password
```

### Step 6: Deploy ALB Stack

**IMPORTANT:** You need a domain name and hosted zone for this step.

```bash
# If you have a domain in Route 53
cdk deploy AlbStack \
  --profile mentalspace-dev \
  -c environment=dev \
  -c domainName=mentalspaceehr.com \
  -c hostedZoneId=Z1234567890ABC \
  --require-approval never

# If you don't have a domain, skip SSL for now
# (Use IP address temporarily for development)
```

### Step 7: Deploy Monitoring Stack

```bash
# Deploy CloudWatch dashboards and alarms
cdk deploy MonitoringStack \
  --profile mentalspace-dev \
  -c environment=dev \
  -c alertEmail=admin@mentalspaceehr.com \
  --require-approval never

# Confirm SNS subscription in your email
```

### Step 8: Verify Deployment

```bash
# List all stacks
cdk list --profile mentalspace-dev

# Check stack status
aws cloudformation describe-stacks \
  --profile mentalspace-dev \
  --query 'Stacks[?StackName==`DatabaseStack`].StackStatus'
```

---

## Secrets Migration

### Step 1: Prepare Environment Variables

```bash
cd mentalspace-ehr-v2

# Ensure .env file has all secrets
cp .env.example .env
# Edit .env with actual values
```

### Step 2: Install Migration Dependencies

```bash
npm install @aws-sdk/client-secrets-manager dotenv
```

### Step 3: Run Migration Script

```bash
# Dry run (review what will be migrated)
npm run migrate-secrets -- --environment=dev --dry-run

# Actual migration
npm run migrate-secrets -- --environment=dev
```

### Step 4: Verify Secrets

```bash
# List secrets
aws secretsmanager list-secrets \
  --profile mentalspace-dev \
  --query 'SecretList[?starts_with(Name, `mentalspace/dev`)].Name'

# Get a specific secret
aws secretsmanager get-secret-value \
  --secret-id mentalspace/dev/jwt-secret \
  --profile mentalspace-dev \
  --query SecretString \
  --output text
```

---

## Application Deployment

### Development Environment

#### 1. Update Configuration

```typescript
// packages/backend/src/config/index.ts
import { initializeSecrets, getJwtSecret, getDatabaseUrl } from './secrets';

let config: any = null;

export async function loadConfig() {
  if (config) return config;

  // Initialize secrets from AWS Secrets Manager
  await initializeSecrets();

  config = {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: await getJwtSecret(),
    databaseUrl: await getDatabaseUrl(),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    // ... other config
  };

  return config;
}
```

#### 2. Update Application Entry Point

```typescript
// packages/backend/src/index.ts
import app from './app';
import logger from './utils/logger';
import { loadConfig } from './config';
import { PrismaClient } from '@mentalspace/database';

const prisma = new PrismaClient();

async function startServer() {
  try {
    // Load configuration (includes secrets)
    const config = await loadConfig();
    logger.info('Configuration loaded successfully');

    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
```

#### 3. Run Database Migrations

```bash
cd packages/database

# Set database URL from Secrets Manager or use the one from infrastructure output
export DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

#### 4. Start Backend Server

```bash
cd packages/backend

# Development mode
npm run dev

# Production mode
npm run build
npm start
```

#### 5. Start Frontend

```bash
cd packages/frontend

# Update .env with backend URL
echo "VITE_API_URL=http://localhost:3001" > .env.local

# Start development server
npm run dev
```

#### 6. Verify Application

```bash
# Test health endpoint
curl http://localhost:3001/api/v1/health

# Test detailed health
curl http://localhost:3001/api/v1/health/detailed

# Test readiness
curl http://localhost:3001/api/v1/health/ready
```

---

### Staging Environment

#### 1. Configure GitHub Secrets

Go to GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
STAGING_DATABASE_URL=<rds-endpoint-url>
STAGING_CLOUDFRONT_DISTRIBUTION_ID=<distribution-id>
SNYK_TOKEN=<snyk-api-token> (optional)
SLACK_WEBHOOK=<slack-webhook-url> (optional)
```

#### 2. Trigger Deployment

```bash
# Push to develop branch
git checkout develop
git add .
git commit -m "Deploy to staging"
git push origin develop

# GitHub Actions will automatically:
# 1. Run tests
# 2. Build application
# 3. Deploy infrastructure
# 4. Deploy backend to Lambda
# 5. Deploy frontend to S3
# 6. Invalidate CloudFront cache
# 7. Run smoke tests
```

#### 3. Monitor Deployment

- Go to GitHub Actions tab
- Watch the deployment workflow
- Check for any errors
- Review deployment logs

#### 4. Verify Staging Deployment

```bash
# Test staging URL
curl https://staging.mentalspaceehr.com/api/v1/health

# Test frontend
open https://staging.mentalspaceehr.com
```

---

### Production Environment

#### 1. Create Production Environment

```bash
# Deploy production infrastructure
cd infrastructure

cdk deploy --all \
  --profile mentalspace-prod \
  -c environment=prod \
  -c domainName=mentalspaceehr.com \
  -c hostedZoneId=Z1234567890ABC \
  --require-approval broadening
```

#### 2. Migrate Secrets to Production

```bash
npm run migrate-secrets -- --environment=prod
```

#### 3. Configure Production Secrets in GitHub

Add production secrets to GitHub:

```
PROD_AWS_ACCESS_KEY_ID=<prod-access-key>
PROD_AWS_SECRET_ACCESS_KEY=<prod-secret-key>
PROD_DATABASE_URL=<prod-rds-endpoint>
PROD_CLOUDFRONT_DISTRIBUTION_ID=<prod-distribution-id>
```

#### 4. Deploy to Production

```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main

# Manually trigger production deployment
# (Requires approval in GitHub Actions)
```

---

## Verification & Testing

### Infrastructure Verification

```bash
# Check VPC
aws ec2 describe-vpcs --profile mentalspace-dev

# Check RDS instance
aws rds describe-db-instances --profile mentalspace-dev

# Check load balancer
aws elbv2 describe-load-balancers --profile mentalspace-dev

# Check CloudWatch alarms
aws cloudwatch describe-alarms --profile mentalspace-dev
```

### Application Health Checks

```bash
# Basic health
curl https://your-domain/api/v1/health

# Detailed health (includes database check)
curl https://your-domain/api/v1/health/detailed

# Readiness probe
curl https://your-domain/api/v1/health/ready

# Liveness probe
curl https://your-domain/api/v1/health/live
```

### Database Connection Test

```bash
# Connect to RDS
psql -h mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com \
     -U mentalspace_admin \
     -d mentalspace_ehr

# List tables
\dt

# Check user count
SELECT COUNT(*) FROM "User";
```

### Monitoring Verification

```bash
# View CloudWatch dashboard
aws cloudwatch list-dashboards --profile mentalspace-dev

# Get dashboard URL
echo "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=MentalSpace-EHR-dev"
```

---

## Troubleshooting

### Database Connection Issues

**Problem:** Cannot connect to RDS

```bash
# Check security group
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*database*" \
  --profile mentalspace-dev

# Check if database is accessible
telnet mentalspace-db-dev.xxxxx.us-east-1.rds.amazonaws.com 5432

# Verify credentials
aws secretsmanager get-secret-value \
  --secret-id mentalspace/dev/database/credentials \
  --profile mentalspace-dev
```

**Solution:**
- Ensure backend is running in VPC or security group allows your IP
- For development, temporarily allow public access (then revert)
- Use bastion host or VPN for production

---

### Secrets Manager Issues

**Problem:** Cannot retrieve secrets

```bash
# Check IAM permissions
aws iam get-user --profile mentalspace-dev

# Test secret retrieval
aws secretsmanager get-secret-value \
  --secret-id mentalspace/dev/jwt-secret \
  --profile mentalspace-dev
```

**Solution:**
- Ensure IAM user/role has `secretsmanager:GetSecretValue` permission
- Check KMS key permissions
- Verify secret name is correct

---

### CDK Deployment Failures

**Problem:** CDK deploy fails

```bash
# Check CDK bootstrap
cdk bootstrap --show-template --profile mentalspace-dev

# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name DatabaseStack \
  --profile mentalspace-dev
```

**Solution:**
- Review CloudFormation error messages
- Check resource limits (VPC limit, RDS instance limit)
- Ensure sufficient IAM permissions

---

### Health Check Failures

**Problem:** ALB health checks failing

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn> \
  --profile mentalspace-dev

# Check application logs
# (If using ECS or Lambda, check CloudWatch Logs)
```

**Solution:**
- Verify application is listening on correct port (3001)
- Ensure `/api/v1/health/ready` endpoint returns 200
- Check security groups allow ALB to reach targets

---

## Rollback Procedures

### Rollback Database Migration

```bash
cd packages/database

# View migration history
npx prisma migrate status

# Rollback is not directly supported by Prisma
# Manual rollback required:
# 1. Restore from RDS snapshot
# 2. Or manually run DOWN migrations if you have them
```

### Rollback Infrastructure

```bash
# Destroy specific stack
cdk destroy DatabaseStack --profile mentalspace-dev

# Destroy all stacks
cdk destroy --all --profile mentalspace-dev
```

### Rollback Application Deployment

```bash
# For Lambda: Update to previous version
aws lambda update-function-code \
  --function-name mentalspace-ehr-api-dev \
  --s3-bucket my-bucket \
  --s3-key previous-version.zip \
  --profile mentalspace-dev

# For ECS: Update service to previous task definition
aws ecs update-service \
  --cluster mentalspace-ehr-dev \
  --service api-service \
  --task-definition mentalspace-api:previous-version \
  --profile mentalspace-dev
```

---

## Best Practices

### Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Secrets migrated and verified
- [ ] Infrastructure changes reviewed
- [ ] Backup taken (for production)
- [ ] Monitoring configured
- [ ] Rollback plan documented

### Post-Deployment Checklist

- [ ] Health checks passing
- [ ] Smoke tests executed
- [ ] CloudWatch alarms reviewed
- [ ] Database connections healthy
- [ ] No errors in logs
- [ ] Users can access application
- [ ] Monitor for 1 hour (staging) or 4 hours (production)

---

## Support Contacts

- **Infrastructure Issues:** DevOps Team
- **Application Issues:** Engineering Team
- **Database Issues:** DBA / Engineering Team
- **AWS Support:** Create support ticket in AWS Console

---

## References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

---

**Document Version:** 1.0
**Last Reviewed:** October 13, 2025
**Next Review:** Monthly or after major changes
