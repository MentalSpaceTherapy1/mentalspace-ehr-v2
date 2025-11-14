#!/bin/bash
set -e

echo "🚀 MentalSpace EHR Deployment Script"
echo "===================================="
echo ""

# Variables
REGION="us-east-1"
ACCOUNT="706704660887"
ENV="dev"

echo "Step 1: AWS Login Check"
echo "----------------------"
aws sts get-caller-identity || { echo "❌ AWS credentials not configured"; exit 1; }
echo "✅ AWS credentials verified"
echo ""

echo "Step 2: Building Docker Image"
echo "-----------------------------"
docker build -f packages/backend/Dockerfile -t mentalspace-backend:latest . || { echo "❌ Docker build failed"; exit 1; }
echo "✅ Docker image built"
echo ""

echo "Step 3: Logging into ECR"
echo "-----------------------"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com || { echo "❌ ECR login failed"; exit 1; }
echo "✅ ECR login successful"
echo ""

echo "Step 4: Tagging and Pushing Image"
echo "---------------------------------"
ECR_REPO="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/mentalspace-backend"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

docker tag mentalspace-backend:latest $ECR_REPO:latest
docker tag mentalspace-backend:latest $ECR_REPO:$TIMESTAMP

echo "Pushing $ECR_REPO:latest ..."
docker push $ECR_REPO:latest || { echo "❌ Docker push failed"; exit 1; }

echo "Pushing $ECR_REPO:$TIMESTAMP ..."
docker push $ECR_REPO:$TIMESTAMP

echo "✅ Images pushed to ECR"
echo ""

echo "Step 5: Updating ECS Service"
echo "----------------------------"
CLUSTER_NAME=$(aws ecs list-clusters --region $REGION --query 'clusterArns[0]' --output text | sed 's/.*\///')
SERVICE_NAME=$(aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns[0]' --output text | sed 's/.*\///')

echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"

aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $REGION > /dev/null

echo "✅ ECS service update triggered"
echo ""

echo "Step 6: Getting Backend URL"
echo "---------------------------"
ALB_DNS=$(aws elbv2 describe-load-balancers --region $REGION --query 'LoadBalancers[0].DNSName' --output text)
echo "Backend URL: http://$ALB_DNS"
echo ""

echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "📊 Monitor deployment:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
echo ""
echo "📝 View logs:"
echo "  aws logs tail /ecs/mentalspace-backend --follow --region $REGION"
echo ""
echo "🔍 Test health endpoint:"
echo "  curl http://$ALB_DNS/api/v1/health/live"
echo ""
echo "🌐 Access URLs:"
echo "  Backend: http://$ALB_DNS"
echo "  Clinician Dashboard: http://$ALB_DNS/productivity/clinician"
echo "  Supervisor Dashboard: http://$ALB_DNS/productivity/supervisor"
echo "  Administrator Dashboard: http://$ALB_DNS/productivity/administrator"
echo ""
echo "⏱️  Wait 2-3 minutes for ECS tasks to become healthy"
echo ""
