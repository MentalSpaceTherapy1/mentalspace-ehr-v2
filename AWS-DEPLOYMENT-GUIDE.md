# AWS Deployment Guide - MentalSpace EHR V2
**Date:** October 16, 2025
**Status:** Ready for Production Deployment

---

## 🎯 DEPLOYMENT OVERVIEW

This guide will walk you through deploying the MentalSpace EHR application to AWS using:
- **Backend:** ECS Fargate with Docker containers
- **Database:** RDS PostgreSQL (already deployed)
- **Frontend:** S3 + CloudFront (or Amplify)
- **Infrastructure:** AWS CDK

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### What's Already Complete:
- ✅ AWS Infrastructure defined (CDK stacks)
- ✅ RDS Database deployed and accessible
- ✅ Backend Dockerfile created
- ✅ Database schema with 13 migrations
- ✅ Seed data script ready
- ✅ Productivity frontend complete (7 new files)
- ✅ All backend APIs functional

### What You Need:
- ✅ AWS Account (706704660887)
- ✅ AWS CLI installed and configured
- ✅ Docker installed
- ✅ Node.js 20+ installed
- ⚠️ AWS credentials with deployment permissions

---

## 📋 DEPLOYMENT STEPS

### STEP 1: Verify AWS Credentials

```bash
# Check AWS credentials
aws sts get-caller-identity

# Expected output:
# {
#   "UserId": "...",
#   "Account": "706704660887",
#   "Arn": "arn:aws:iam::706704660887:user/your-user"
# }
```

### STEP 2: Deploy Infrastructure (if not already deployed)

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK (one-time setup per account/region)
npx cdk bootstrap aws://706704660887/us-east-1

# Deploy all stacks in order
npx cdk deploy --all --require-approval never

# Or deploy individually:
npx cdk deploy MentalSpace-Network-dev
npx cdk deploy MentalSpace-Security-dev
npx cdk deploy MentalSpace-Database-dev
npx cdk deploy MentalSpace-ALB-dev
npx cdk deploy MentalSpace-ECR-dev
npx cdk deploy MentalSpace-Compute-dev
npx cdk deploy MentalSpace-Monitoring-dev
```

**Expected Output:**
- VPC, Subnets, Security Groups created
- RDS PostgreSQL instance running
- ALB (Application Load Balancer) created
- ECR (Docker repository) created
- ECS Cluster and Service created
- CloudWatch monitoring set up

---

### STEP 3: Build and Push Docker Image

```bash
# Navigate to project root
cd c:\Users\Elize\mentalspace-ehr-v2

# Get ECR login credentials
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 706704660887.dkr.ecr.us-east-1.amazonaws.com

# Get ECR repository URI
ECR_REPO=$(aws ecr describe-repositories --repository-names mentalspace-backend-dev --region us-east-1 --query 'repositories[0].repositoryUri' --output text)

echo "ECR Repository: $ECR_REPO"

# Build Docker image from project root
docker build -f packages/backend/Dockerfile -t mentalspace-backend:latest .

# Tag image for ECR
docker tag mentalspace-backend:latest $ECR_REPO:latest
docker tag mentalspace-backend:latest $ECR_REPO:v2.0.0

# Push to ECR
docker push $ECR_REPO:latest
docker push $ECR_REPO:v2.0.0
```

**Troubleshooting:**
- If "mentalspace-backend-dev" repository doesn't exist, deploy ECR stack first
- If Docker build fails, check that you're in the project root directory
- Build time: ~5-10 minutes

---

### STEP 4: Run Database Migrations on RDS

You have two options to run migrations on the AWS RDS database:

#### Option A: Via ECS Task (Recommended)

Create a one-time migration task:

```bash
# Create migration task definition (run this script)
cat > run-migrations.sh << 'EOF'
#!/bin/bash

# Get ECS cluster name
CLUSTER_NAME=$(aws ecs list-clusters --region us-east-1 --query 'clusterArns[0]' --output text | sed 's/.*\///')

# Get task definition ARN
TASK_DEF=$(aws ecs list-task-definitions --family-prefix mentalspace-backend-dev --region us-east-1 --query 'taskDefinitionArns[0]' --output text)

# Get private subnet IDs
SUBNETS=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=*Private*" --region us-east-1 --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')

# Get app security group
SECURITY_GROUP=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=*App*" --region us-east-1 --query 'SecurityGroups[0].GroupId' --output text)

# Run migration task
aws ecs run-task \
  --cluster $CLUSTER_NAME \
  --task-definition $TASK_DEF \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "mentalspace-backend",
      "command": ["sh", "-c", "cd /app/packages/database && npx prisma migrate deploy && npx prisma db seed"]
    }]
  }' \
  --region us-east-1

echo "Migration task started. Check logs in CloudWatch."
EOF

chmod +x run-migrations.sh
./run-migrations.sh
```

#### Option B: Via Bastion Host / SSM

If you have a bastion host or EC2 instance with database access:

```bash
# SSH into bastion host
ssh -i your-key.pem ec2-user@bastion-ip

# Clone repo or copy .env with DATABASE_URL pointing to RDS
# Install Node.js and run migrations
cd mentalspace-ehr-v2/packages/database
DATABASE_URL="postgresql://mentalspace_admin:PASSWORD@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" npx prisma migrate deploy
DATABASE_URL="postgresql://mentalspace_admin:PASSWORD@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" npx prisma db seed
```

---

### STEP 5: Update ECS Service with New Image

After pushing the Docker image, ECS needs to be told to use it:

```bash
# Force ECS service to update with new image
CLUSTER_NAME=$(aws ecs list-clusters --region us-east-1 --query 'clusterArns[0]' --output text | sed 's/.*\///')
SERVICE_NAME=$(aws ecs list-services --cluster $CLUSTER_NAME --region us-east-1 --query 'serviceArns[0]' --output text | sed 's/.*\///')

aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region us-east-1

echo "ECS service update triggered. New tasks will be deployed."
```

**Monitor Deployment:**
```bash
# Watch service events
aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region us-east-1 --query 'services[0].events[0:5]'

# Check running tasks
aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region us-east-1
```

---

### STEP 6: Verify Backend Deployment

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers --region us-east-1 --query 'LoadBalancers[0].DNSName' --output text)

echo "Backend URL: http://$ALB_DNS"

# Test health endpoint
curl http://$ALB_DNS/api/v1/health/live

# Expected response:
# {"status":"ok","timestamp":"2025-10-17T03:30:00.000Z","uptime":120}

# Test login endpoint
curl -X POST http://$ALB_DNS/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mentalspace.com","password":"SecurePass123!"}'

# Should return JWT token
```

---

### STEP 7: Deploy Frontend

You have two options for frontend deployment:

#### Option A: AWS Amplify (Recommended - Easiest)

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify in frontend directory
cd packages/frontend

# Configure Amplify
amplify init

# Follow prompts:
# - Environment: dev
# - Default editor: VS Code
# - App type: javascript
# - Framework: react
# - Source directory: src
# - Distribution directory: dist
# - Build command: npm run build
# - Start command: npm run dev

# Add hosting
amplify add hosting

# Choose: Hosting with Amplify Console (Managed hosting with custom domains)

# Deploy
amplify publish
```

#### Option B: S3 + CloudFront (Manual)

```bash
# Build frontend
cd packages/frontend
npm run build

# Create S3 bucket
aws s3 mb s3://mentalspace-frontend-dev --region us-east-1

# Enable static website hosting
aws s3 website s3://mentalspace-frontend-dev --index-document index.html --error-document index.html

# Upload build files
aws s3 sync dist/ s3://mentalspace-frontend-dev --delete

# Make bucket public (for static hosting)
aws s3api put-bucket-policy --bucket mentalspace-frontend-dev --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::mentalspace-frontend-dev/*"
  }]
}'

# Get website URL
echo "Frontend URL: http://mentalspace-frontend-dev.s3-website-us-east-1.amazonaws.com"
```

**Update Frontend API URL:**

Before building, update the frontend environment file:

```bash
# Edit packages/frontend/.env or vite.config.ts
VITE_API_URL=http://YOUR_ALB_DNS_HERE
```

Then rebuild and redeploy.

---

### STEP 8: Configure CORS

Update backend CORS to allow frontend domain:

1. Update `.env` in AWS Secrets Manager or ECS Task Definition:
```bash
CORS_ORIGINS=http://mentalspace-frontend-dev.s3-website-us-east-1.amazonaws.com,https://yourdomain.com
```

2. Restart ECS service (Step 5)

---

## 🔍 VERIFICATION & TESTING

### Backend Health Checks:
```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers --region us-east-1 --query 'LoadBalancers[0].DNSName' --output text)

# Test endpoints
curl http://$ALB_DNS/api/v1/health/live
curl http://$ALB_DNS/api/v1/health/ready
```

### Frontend Access:
1. Navigate to frontend URL
2. Try logging in with seed user:
   - Email: `admin@mentalspace.com`
   - Password: `SecurePass123!`

3. Test productivity dashboards:
   - `/productivity/clinician`
   - `/productivity/supervisor`
   - `/productivity/administrator`

### Database Connection:
```bash
# Check ECS task logs
aws logs tail /ecs/mentalspace-backend-dev --follow --region us-east-1

# Look for:
# ✅ Database connected successfully
# ✅ Registered 23 metric calculators
# ✅ MentalSpace EHR API is running on port 3001
```

---

## 🐛 TROUBLESHOOTING

### Issue: ECS Tasks Keep Stopping

**Check CloudWatch Logs:**
```bash
aws logs tail /ecs/mentalspace-backend-dev --follow --region us-east-1
```

**Common causes:**
- Database connection string incorrect
- Database not accessible from ECS tasks (security group issue)
- Missing environment variables
- Docker image startup failure

**Fix security groups:**
```bash
# Ensure App Security Group can access DB Security Group on port 5432
```

### Issue: 503 Service Unavailable from ALB

**Causes:**
- No healthy ECS tasks running
- Target group health check failing
- Backend not responding on port 3001

**Check target group health:**
```bash
TARGET_GROUP=$(aws elbv2 describe-target-groups --region us-east-1 --query 'TargetGroups[0].TargetGroupArn' --output text)

aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP --region us-east-1
```

### Issue: Database Migration Failed

**Run migrations manually from ECS task:**
```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --region us-east-1 --query 'taskArns[0]' --output text)

# Execute command in running container
aws ecs execute-command \
  --cluster $CLUSTER_NAME \
  --task $TASK_ARN \
  --container mentalspace-backend \
  --interactive \
  --command "sh" \
  --region us-east-1

# Inside container:
cd /app/packages/database
npx prisma migrate deploy
npx prisma db seed
```

### Issue: Frontend Can't Connect to Backend

**Check CORS configuration:**
- Ensure frontend domain is in `CORS_ORIGINS` environment variable
- Check browser console for CORS errors
- Verify `VITE_API_URL` points to correct ALB DNS

**Update and redeploy:**
```bash
# Update ECS task definition environment variables
# Force new deployment (Step 5)
```

---

## 📊 MONITORING

### CloudWatch Dashboards

View your monitoring dashboard:
```bash
# Open CloudWatch console
aws cloudwatch get-dashboard --dashboard-name MentalSpace-Dashboard-dev --region us-east-1
```

**Metrics to monitor:**
- ECS CPU/Memory utilization
- RDS CPU/Memory/Connections
- ALB Request count and latency
- Application errors in logs

### CloudWatch Alarms

Alarms are configured for:
- RDS CPU > 80%
- RDS Free Storage < 10GB
- RDS Connection failures
- Email alerts to: `alerts@mentalspaceehr.com` (update this!)

**Update alert email:**
```bash
# Edit infrastructure/bin/infrastructure.ts line 108
alertEmail: 'your-email@yourdomain.com'

# Redeploy monitoring stack
cd infrastructure
npx cdk deploy MentalSpace-Monitoring-dev
```

---

## 🚀 QUICK DEPLOYMENT SCRIPT

Save this as `deploy.sh` for one-command deployment:

```bash
#!/bin/bash
set -e

echo "🚀 MentalSpace EHR Deployment Script"
echo "===================================="

# Variables
REGION="us-east-1"
ACCOUNT="706704660887"
ENV="dev"

echo "Step 1: AWS Login Check"
aws sts get-caller-identity || exit 1

echo "Step 2: Building Docker Image"
docker build -f packages/backend/Dockerfile -t mentalspace-backend:latest .

echo "Step 3: Logging into ECR"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

echo "Step 4: Tagging and Pushing Image"
ECR_REPO="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/mentalspace-backend-$ENV"
docker tag mentalspace-backend:latest $ECR_REPO:latest
docker tag mentalspace-backend:latest $ECR_REPO:$(date +%Y%m%d-%H%M%S)
docker push $ECR_REPO:latest
docker push $ECR_REPO:$(date +%Y%m%d-%H%M%S)

echo "Step 5: Updating ECS Service"
CLUSTER_NAME=$(aws ecs list-clusters --region $REGION --query 'clusterArns[0]' --output text | sed 's/.*\///')
SERVICE_NAME=$(aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns[0]' --output text | sed 's/.*\///')

aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $REGION

echo "✅ Deployment Complete!"
echo ""
echo "Monitor deployment:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
echo ""
echo "View logs:"
echo "  aws logs tail /ecs/mentalspace-backend-$ENV --follow --region $REGION"
echo ""
echo "Backend URL:"
ALB_DNS=$(aws elbv2 describe-load-balancers --region $REGION --query 'LoadBalancers[0].DNSName' --output text)
echo "  http://$ALB_DNS"
```

Make it executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📝 POST-DEPLOYMENT TASKS

### 1. Set up Custom Domain (Optional)
- Register domain in Route 53
- Create ACM certificate
- Update ALB with HTTPS listener
- Update infrastructure code with domain/certificate

### 2. Configure Email Service
- Set up AWS SES or SendGrid
- Add API keys to Secrets Manager
- Update environment variables
- Test password reset emails

### 3. Enable WebSocket for Real-Time Updates
- Backend Socket.IO server needs to be implemented
- Update ECS service to support WebSocket connections
- Configure ALB sticky sessions

### 4. Set up CI/CD Pipeline (Optional)
- GitHub Actions or AWS CodePipeline
- Automatic deployment on push to main branch
- Automated testing before deployment

---

## 🎉 SUCCESS CRITERIA

Your deployment is successful when:

✅ ALB health check returns 200 OK
✅ ECS tasks are running and healthy
✅ You can login to the frontend application
✅ Backend logs show "Database connected successfully"
✅ You can access productivity dashboards
✅ All API endpoints respond correctly
✅ CloudWatch monitoring shows metrics

---

## 📞 NEXT STEPS AFTER DEPLOYMENT

1. **Test all features:**
   - Login/Logout
   - Client management
   - Appointment scheduling
   - Clinical notes
   - Productivity dashboards (NEW!)
   - Telehealth sessions
   - Billing features

2. **Load test:**
   - Use tools like Apache JMeter or k6
   - Test concurrent users
   - Monitor performance metrics

3. **Security review:**
   - Review security group rules
   - Enable AWS WAF rules
   - Set up AWS GuardDuty
   - Enable CloudTrail logging

4. **Backup strategy:**
   - RDS automated backups (already enabled)
   - Test database restore procedure
   - Document recovery process

---

**Deployment Status:** 🟢 Ready to Deploy

**Estimated Deployment Time:** 30-45 minutes (first time), 10-15 minutes (subsequent deployments)

**Cost Estimate (Monthly):**
- ECS Fargate: ~$50-100
- RDS PostgreSQL: ~$50-150
- ALB: ~$20-30
- S3 + CloudFront: ~$5-10
- **Total: ~$125-290/month** (dev environment)

---

Good luck with your deployment! 🚀
