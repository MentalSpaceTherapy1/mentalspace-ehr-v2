#!/bin/bash

# Phase 1.4 Production Deployment Script
# This script deploys the electronic signatures feature to production
# Run this from an AWS-connected environment (EC2, CloudShell, or CI/CD)

set -e  # Exit on error

echo "=========================================="
echo "Phase 1.4 Deployment - Electronic Signatures"
echo "=========================================="
echo ""

# Configuration
AWS_REGION="us-east-1"
ECR_REGISTRY="706704660887.dkr.ecr.us-east-1.amazonaws.com"
ECR_REPO="mentalspace-backend"
IMAGE_TAG="phase-1.4"
ECS_CLUSTER="mentalspace-ehr-prod"
ECS_SERVICE="mentalspace-backend"
TASK_FAMILY="mentalspace-backend-prod"
S3_BUCKET="mentalspaceehr-frontend"
CLOUDFRONT_ID="E3AL81URAGOXL4"

# Step 1: Apply Database Migration
echo "Step 1: Applying database migration..."
echo "----------------------------------------"

# Get running task ID
TASK_ARN=$(aws ecs list-tasks \
  --cluster $ECS_CLUSTER \
  --service-name $ECS_SERVICE \
  --desired-status RUNNING \
  --query 'taskArns[0]' \
  --output text \
  --region $AWS_REGION)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
  echo "❌ No running tasks found. Please ensure ECS service is running."
  exit 1
fi

echo "Found running task: $TASK_ARN"

# Apply migration via ECS exec
echo "Applying Prisma migration..."
aws ecs execute-command \
  --cluster $ECS_CLUSTER \
  --task $TASK_ARN \
  --container mentalspace-backend \
  --interactive \
  --command "npx prisma migrate deploy" \
  --region $AWS_REGION

echo "✅ Database migration applied successfully"
echo ""

# Step 2: Build and Push Docker Image
echo "Step 2: Building and pushing Docker image..."
echo "----------------------------------------------"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Check if image exists locally
if ! docker image inspect mentalspace-backend:latest >/dev/null 2>&1; then
  echo "Building Docker image..."
  docker build -f packages/backend/Dockerfile -t mentalspace-backend:latest .
else
  echo "Using existing local image: mentalspace-backend:latest"
fi

# Tag image
echo "Tagging image..."
docker tag mentalspace-backend:latest $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG
docker tag mentalspace-backend:latest $ECR_REGISTRY/$ECR_REPO:latest

# Push to ECR
echo "Pushing to ECR..."
docker push $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG
docker push $ECR_REGISTRY/$ECR_REPO:latest

# Get image digest
IMAGE_DIGEST=$(aws ecr describe-images \
  --repository-name $ECR_REPO \
  --image-ids imageTag=$IMAGE_TAG \
  --query 'imageDetails[0].imageDigest' \
  --output text \
  --region $AWS_REGION)

echo "✅ Image pushed successfully"
echo "   Image: $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG"
echo "   Digest: $IMAGE_DIGEST"
echo ""

# Step 3: Update ECS Task Definition
echo "Step 3: Updating ECS task definition..."
echo "----------------------------------------"

# Get current task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $TASK_FAMILY \
  --query 'taskDefinition' \
  --region $AWS_REGION)

# Create new task definition with updated image
NEW_IMAGE="$ECR_REGISTRY/$ECR_REPO@$IMAGE_DIGEST"

# Extract and update task definition
NEW_TASK_DEF=$(echo $TASK_DEF | jq --arg IMAGE "$NEW_IMAGE" '
  .containerDefinitions[0].image = $IMAGE |
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
')

# Register new task definition
NEW_REVISION=$(aws ecs register-task-definition \
  --cli-input-json "$NEW_TASK_DEF" \
  --query 'taskDefinition.revision' \
  --output text \
  --region $AWS_REGION)

echo "✅ New task definition registered: $TASK_FAMILY:$NEW_REVISION"
echo ""

# Step 4: Update ECS Service
echo "Step 4: Updating ECS service..."
echo "--------------------------------"

aws ecs update-service \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --task-definition $TASK_FAMILY:$NEW_REVISION \
  --force-new-deployment \
  --region $AWS_REGION \
  --query 'service.{serviceName:serviceName,taskDefinition:taskDefinition,desiredCount:desiredCount}' \
  --output table

echo "✅ ECS service updated"
echo ""

# Step 5: Wait for deployment to stabilize
echo "Step 5: Waiting for deployment to stabilize..."
echo "-----------------------------------------------"

echo "Waiting for service to reach steady state (this may take 3-5 minutes)..."
aws ecs wait services-stable \
  --cluster $ECS_CLUSTER \
  --services $ECS_SERVICE \
  --region $AWS_REGION

echo "✅ Backend deployment complete and stable"
echo ""

# Step 6: Deploy Frontend
echo "Step 6: Deploying frontend..."
echo "------------------------------"

if [ ! -d "packages/frontend/dist" ]; then
  echo "Frontend build not found. Building..."
  cd packages/frontend
  VITE_API_URL=https://api.mentalspaceehr.com/api/v1 npm run build
  cd ../..
fi

echo "Syncing to S3..."
aws s3 sync packages/frontend/dist/ s3://$S3_BUCKET --delete --region $AWS_REGION

echo "✅ Frontend uploaded to S3"
echo ""

# Step 7: Invalidate CloudFront Cache
echo "Step 7: Invalidating CloudFront cache..."
echo "------------------------------------------"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "CloudFront invalidation created: $INVALIDATION_ID"
echo "Waiting for invalidation to complete..."

aws cloudfront wait invalidation-completed \
  --distribution-id $CLOUDFRONT_ID \
  --id $INVALIDATION_ID

echo "✅ CloudFront cache invalidated"
echo ""

# Step 8: Verify Deployment
echo "Step 8: Verifying deployment..."
echo "--------------------------------"

echo "Checking backend health..."
HEALTH_STATUS=$(curl -s https://api.mentalspaceehr.com/api/v1/health | jq -r '.status')

if [ "$HEALTH_STATUS" == "ok" ]; then
  echo "✅ Backend health check passed"
else
  echo "⚠️  Backend health check returned: $HEALTH_STATUS"
fi

echo ""
echo "Checking frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://mentalspaceehr.com)

if [ "$FRONTEND_STATUS" == "200" ]; then
  echo "✅ Frontend is accessible"
else
  echo "⚠️  Frontend returned HTTP $FRONTEND_STATUS"
fi

echo ""
echo "=========================================="
echo "🎉 Phase 1.4 Deployment Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ Database migration applied"
echo "  ✅ Backend image: $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG"
echo "  ✅ Task definition: $TASK_FAMILY:$NEW_REVISION"
echo "  ✅ ECS service updated and stable"
echo "  ✅ Frontend deployed to S3"
echo "  ✅ CloudFront cache invalidated"
echo ""
echo "Next Steps:"
echo "  1. Test signature PIN/password setup at https://mentalspaceehr.com/settings"
echo "  2. Create a test note and verify signature modal appears"
echo "  3. Check signature events in database"
echo "  4. Monitor CloudWatch logs for any errors"
echo ""
echo "Monitoring Commands:"
echo "  - View logs: aws logs tail /aws/ecs/mentalspace-backend-prod --follow"
echo "  - Check service: aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE"
echo "  - Check signature events: SELECT COUNT(*) FROM signature_events;"
echo ""
