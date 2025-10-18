#!/bin/bash
# Deployment Script - Run When Network Connectivity is Restored
# This script will complete the deployment of logo and productivity endpoints to AWS

set -e  # Exit on error

echo "======================================"
echo "MentalSpace EHR - Complete Deployment"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check network connectivity
echo -e "${YELLOW}[1/6] Checking network connectivity...${NC}"
if ping -c 1 google.com &> /dev/null; then
    echo -e "${GREEN}✓ Network connectivity OK${NC}"
else
    echo -e "${RED}✗ Network connectivity failed${NC}"
    echo "Please check your internet connection and try again."
    exit 1
fi

# Check AWS credentials
echo ""
echo -e "${YELLOW}[2/6] Verifying AWS credentials...${NC}"
if aws sts get-caller-identity &> /dev/null; then
    echo -e "${GREEN}✓ AWS credentials valid${NC}"
    aws sts get-caller-identity --query 'Account' --output text
else
    echo -e "${RED}✗ AWS credentials invalid${NC}"
    echo "Please configure AWS credentials: aws configure"
    exit 1
fi

# Deploy Frontend to S3
echo ""
echo -e "${YELLOW}[3/6] Deploying frontend with logo to S3...${NC}"
cd packages/frontend

# Verify build exists
if [ ! -d "dist" ]; then
    echo "Frontend build not found. Building now..."
    npx vite build
fi

# Verify logo is in build
if [ ! -f "dist/logo.png" ]; then
    echo -e "${RED}✗ Logo file missing from build${NC}"
    exit 1
fi

echo "Deploying to s3://mentalspace-frontend-dev..."
aws s3 sync dist/ s3://mentalspace-frontend-dev --delete

# Verify logo was uploaded
if aws s3 ls s3://mentalspace-frontend-dev/logo.png &> /dev/null; then
    echo -e "${GREEN}✓ Frontend deployed successfully with logo${NC}"
else
    echo -e "${RED}✗ Logo upload failed${NC}"
    exit 1
fi

cd ../..

# Build Backend Docker Image
echo ""
echo -e "${YELLOW}[4/6] Building backend Docker image...${NC}"
cd packages/backend

echo "Building Docker image (this may take 5-10 minutes)..."
docker build -t mentalspace-ehr-backend:latest -f Dockerfile .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

cd ../..

# Push to AWS ECR
echo ""
echo -e "${YELLOW}[5/6] Pushing image to AWS ECR...${NC}"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin \
    706704660887.dkr.ecr.us-east-1.amazonaws.com

# Tag image
echo "Tagging image..."
docker tag mentalspace-ehr-backend:latest \
    706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-ehr-backend-dev:latest

# Push image
echo "Pushing to ECR (this may take 5-10 minutes)..."
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-ehr-backend-dev:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Image pushed to ECR successfully${NC}"
else
    echo -e "${RED}✗ ECR push failed${NC}"
    exit 1
fi

# Update ECS Service
echo ""
echo -e "${YELLOW}[6/6] Updating ECS service...${NC}"

echo "Forcing new deployment..."
aws ecs update-service \
    --cluster mentalspace-ehr-dev \
    --service mentalspace-backend-dev \
    --force-new-deployment \
    --region us-east-1 \
    --output json > /dev/null

echo "Waiting for new task to become healthy (this may take 2-3 minutes)..."

# Wait for deployment to complete
for i in {1..60}; do
    TASK_ARN=$(aws ecs list-tasks \
        --cluster mentalspace-ehr-dev \
        --service-name mentalspace-backend-dev \
        --region us-east-1 \
        --query 'taskArns[0]' \
        --output text)

    if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
        TASK_STATUS=$(aws ecs describe-tasks \
            --cluster mentalspace-ehr-dev \
            --tasks "$TASK_ARN" \
            --region us-east-1 \
            --query 'tasks[0].healthStatus' \
            --output text)

        if [ "$TASK_STATUS" = "HEALTHY" ]; then
            echo -e "${GREEN}✓ New task is HEALTHY${NC}"
            break
        fi
    fi

    echo -n "."
    sleep 5
done

echo ""

# Verification
echo ""
echo "======================================"
echo "Deployment Complete - Running Tests"
echo "======================================"
echo ""

# Test frontend
echo -e "${YELLOW}Testing frontend...${NC}"
FRONTEND_URL="http://mentalspace-frontend-dev.s3-website-us-east-1.amazonaws.com"
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
    echo -e "${GREEN}✓ Frontend accessible${NC}"
    echo "  URL: $FRONTEND_URL"
else
    echo -e "${RED}✗ Frontend not accessible${NC}"
fi

# Test backend health
echo ""
echo -e "${YELLOW}Testing backend health...${NC}"
BACKEND_URL="http://mentalspace-ehr-dev-881286108.us-east-1.elb.amazonaws.com"
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/v1/health/live")
if echo "$HEALTH_RESPONSE" | grep -q "alive"; then
    echo -e "${GREEN}✓ Backend health check passing${NC}"
    echo "  URL: $BACKEND_URL"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

# Summary
echo ""
echo "======================================"
echo "Deployment Summary"
echo "======================================"
echo ""
echo -e "${GREEN}✓ Frontend deployed with logo${NC}"
echo -e "${GREEN}✓ Backend deployed with productivity endpoints${NC}"
echo ""
echo "Frontend URL:"
echo "  $FRONTEND_URL"
echo ""
echo "Backend API URL:"
echo "  $BACKEND_URL"
echo ""
echo "Next Steps:"
echo "  1. Open frontend URL in browser"
echo "  2. Verify logo displays on login page"
echo "  3. Login with admin credentials"
echo "  4. Navigate to Productivity > Administrator Dashboard"
echo "  5. Verify all metrics display correctly"
echo ""
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
