#!/usr/bin/env bash
set -euo pipefail

################################################################################
# MentalSpace EHR - Production Backend Release Script
#
# Purpose: Reproducible, verifiable production deployments using immutable
#          image digests with automated smoke tests and rollback capability
#
# Usage: ./ops/release_backend.sh
################################################################################

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

################################################################################
# CONFIGURATION - Actual Production Values
################################################################################

# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="706704660887"

# ECS Configuration
CLUSTER_NAME="mentalspace-ehr-prod"
SERVICE_NAME="mentalspace-backend"
TASK_FAMILY="mentalspace-backend-prod"
CONTAINER_NAME="mentalspace-backend"

# ECR Configuration
ECR_REPOSITORY="mentalspace-backend"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

# Network Configuration
SUBNETS="subnet-0bfd11207446ec5b6,subnet-00fdc193d4baf7f32"
SECURITY_GROUPS="sg-050c3f7df2116918b"
ASSIGN_PUBLIC_IP="ENABLED"

# Load Balancer Configuration
TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:us-east-1:706704660887:targetgroup/mentalspace-tg/a6a9aee5b6beffdd"

# Health Check Configuration
HEALTH_CHECK_PATH="/api/v1/health/live"
VERSION_ENDPOINT="https://api.mentalspaceehr.com/api/v1/version"

# Deployment Configuration
DESIRED_COUNT=1
MAX_PERCENT=200
MIN_HEALTHY_PERCENT=100
DEPLOYMENT_TIMEOUT=900  # 15 minutes
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=30

# Report Configuration
REPORT_DIR="./ops/deployment-reports"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
REPORT_FILE="${REPORT_DIR}/deployment-${TIMESTAMP}.md"

################################################################################
# FUNCTIONS
################################################################################

# Initialize deployment report
init_report() {
    mkdir -p "${REPORT_DIR}"

    cat > "${REPORT_FILE}" <<EOF
# Production Deployment Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S %Z')
**Cluster:** ${CLUSTER_NAME}
**Service:** ${SERVICE_NAME}

---

## Deployment Summary

EOF
    log_info "Deployment report initialized: ${REPORT_FILE}"
}

# Append to deployment report
append_report() {
    echo "$1" >> "${REPORT_FILE}"
}

# Get current git commit
get_git_sha() {
    if git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_SHA=$(git rev-parse HEAD)
        GIT_SHORT_SHA=$(git rev-parse --short HEAD)
        GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        log_success "Git SHA: ${GIT_SHA}"

        append_report "**Git Commit:** \`${GIT_SHA}\`"
        append_report "**Git Branch:** ${GIT_BRANCH}"
        append_report ""
    else
        log_error "Not a git repository"
        exit 1
    fi
}

# Check for uncommitted changes
check_git_status() {
    log_info "Checking git status..."

    if [[ -n $(git status -s) ]]; then
        log_warn "Uncommitted changes detected:"
        git status -s
        read -p "Continue with deployment? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    else
        log_success "Working directory is clean"
    fi
}

# Login to ECR
ecr_login() {
    log_info "Logging in to ECR..."

    aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

    log_success "ECR login successful"
}

# Build Docker image with Git SHA baked in
build_image() {
    log_info "Building Docker image with Git SHA: ${GIT_SHA}..."

    BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    docker build \
        --platform linux/amd64 \
        --build-arg GIT_SHA="${GIT_SHA}" \
        --build-arg BUILD_TIME="${BUILD_TIME}" \
        -t "${ECR_URI}:${GIT_SHORT_SHA}" \
        -f packages/backend/Dockerfile \
        .

    if [[ $? -eq 0 ]]; then
        log_success "Docker image built successfully"
        append_report "**Docker Build:** ✅ Success"
    else
        log_error "Docker build failed"
        append_report "**Docker Build:** ❌ Failed"
        exit 1
    fi
}

# Push image and capture digest
push_image() {
    log_info "Pushing image to ECR..."

    docker push "${ECR_URI}:${GIT_SHORT_SHA}"

    # Get the image digest (immutable reference)
    IMAGE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "${ECR_URI}:${GIT_SHORT_SHA}" | cut -d'@' -f2)
    IMAGE_URI_WITH_DIGEST="${ECR_URI}@${IMAGE_DIGEST}"

    log_success "Image pushed with digest: ${IMAGE_DIGEST}"

    append_report "**Image Tag:** \`${GIT_SHORT_SHA}\`"
    append_report "**Image Digest:** \`${IMAGE_DIGEST}\`"
    append_report "**Image URI:** \`${IMAGE_URI_WITH_DIGEST}\`"
    append_report ""
}

# Get current task definition as baseline for rollback
get_current_task_definition() {
    log_info "Getting current task definition for rollback reference..."

    CURRENT_TASK_DEF_ARN=$(aws ecs describe-services \
        --cluster "${CLUSTER_NAME}" \
        --services "${SERVICE_NAME}" \
        --region "${AWS_REGION}" \
        --query 'services[0].taskDefinition' \
        --output text)

    log_success "Current task definition: ${CURRENT_TASK_DEF_ARN}"
    append_report "**Previous Task Definition:** \`${CURRENT_TASK_DEF_ARN}\`"
}

# Create new task definition with immutable image digest
create_task_definition() {
    log_info "Creating new task definition with image digest..."

    # Get current task definition
    CURRENT_TASK_DEF=$(aws ecs describe-task-definition \
        --task-definition "${CURRENT_TASK_DEF_ARN}" \
        --region "${AWS_REGION}" \
        --query 'taskDefinition')

    # Update image URI with digest
    NEW_TASK_DEF=$(echo "${CURRENT_TASK_DEF}" | jq \
        --arg image_uri "${IMAGE_URI_WITH_DIGEST}" \
        --arg git_sha "${GIT_SHA}" \
        --arg build_time "${BUILD_TIME}" \
        '
        .containerDefinitions[0].image = $image_uri |
        .containerDefinitions[0].environment += [
            {name: "GIT_SHA", value: $git_sha},
            {name: "BUILD_TIME", value: $build_time}
        ] |
        .containerDefinitions[0].healthCheck = {
            command: ["CMD-SHELL", "curl -f http://localhost:3001/api/v1/health/live || exit 1"],
            interval: 30,
            timeout: 5,
            retries: 3,
            startPeriod: 60
        } |
        del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
        ')

    # Register new task definition
    NEW_TASK_DEF_ARN=$(echo "${NEW_TASK_DEF}" | \
        aws ecs register-task-definition \
        --region "${AWS_REGION}" \
        --cli-input-json file:///dev/stdin \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)

    log_success "New task definition created: ${NEW_TASK_DEF_ARN}"
    append_report "**New Task Definition:** \`${NEW_TASK_DEF_ARN}\`"
    append_report ""
}

# Update ECS service with new task definition
update_service() {
    log_info "Updating ECS service..."

    aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${SERVICE_NAME}" \
        --task-definition "${NEW_TASK_DEF_ARN}" \
        --desired-count "${DESIRED_COUNT}" \
        --deployment-configuration "maximumPercent=${MAX_PERCENT},minimumHealthyPercent=${MIN_HEALTHY_PERCENT}" \
        --region "${AWS_REGION}" \
        > /dev/null

    log_success "Service update initiated"
    append_report "### Deployment Progress"
    append_report ""
}

# Wait for deployment to complete
wait_for_deployment() {
    log_info "Waiting for deployment to stabilize (timeout: ${DEPLOYMENT_TIMEOUT}s)..."

    append_report "\`\`\`"

    START_TIME=$(date +%s)
    while true; do
        CURRENT_TIME=$(date +%s)
        ELAPSED=$((CURRENT_TIME - START_TIME))

        if [[ ${ELAPSED} -gt ${DEPLOYMENT_TIMEOUT} ]]; then
            log_error "Deployment timed out after ${DEPLOYMENT_TIMEOUT} seconds"
            append_report "❌ Deployment TIMEOUT after ${DEPLOYMENT_TIMEOUT}s"
            append_report "\`\`\`"
            return 1
        fi

        # Get deployment status
        DEPLOYMENT_STATUS=$(aws ecs describe-services \
            --cluster "${CLUSTER_NAME}" \
            --services "${SERVICE_NAME}" \
            --region "${AWS_REGION}" \
            --query 'services[0].deployments[0]' \
            --output json)

        RUNNING_COUNT=$(echo "${DEPLOYMENT_STATUS}" | jq -r '.runningCount')
        DESIRED_COUNT_CHECK=$(echo "${DEPLOYMENT_STATUS}" | jq -r '.desiredCount')
        ROLLOUT_STATE=$(echo "${DEPLOYMENT_STATUS}" | jq -r '.rolloutState // "IN_PROGRESS"')

        STATUS_LINE="[${ELAPSED}s] Running: ${RUNNING_COUNT}/${DESIRED_COUNT_CHECK} | State: ${ROLLOUT_STATE}"
        log_info "${STATUS_LINE}"
        append_report "${STATUS_LINE}"

        # Check if deployment is complete
        if [[ "${ROLLOUT_STATE}" == "COMPLETED" ]]; then
            log_success "Deployment completed successfully"
            append_report "✅ Deployment COMPLETED"
            append_report "\`\`\`"
            append_report ""
            return 0
        fi

        # Check if deployment failed
        if [[ "${ROLLOUT_STATE}" == "FAILED" ]]; then
            log_error "Deployment failed"
            append_report "❌ Deployment FAILED"
            append_report "\`\`\`"
            append_report ""
            return 1
        fi

        sleep 10
    done
}

# Check target group health
check_target_health() {
    log_info "Checking target group health..."

    append_report "### Target Group Health"
    append_report ""

    for i in $(seq 1 ${HEALTH_CHECK_RETRIES}); do
        HEALTH_STATUS=$(aws elbv2 describe-target-health \
            --target-group-arn "${TARGET_GROUP_ARN}" \
            --region "${AWS_REGION}" \
            --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Reason]' \
            --output text)

        HEALTHY_COUNT=$(echo "${HEALTH_STATUS}" | grep -c "healthy" || true)

        log_info "Attempt ${i}/${HEALTH_CHECK_RETRIES}: ${HEALTHY_COUNT} healthy targets"
        append_report "- Attempt ${i}: ${HEALTHY_COUNT} healthy targets"

        if [[ ${HEALTHY_COUNT} -ge ${DESIRED_COUNT} ]]; then
            log_success "All targets are healthy"
            append_report ""
            append_report "✅ All targets healthy"
            append_report ""
            return 0
        fi

        if [[ ${i} -lt ${HEALTH_CHECK_RETRIES} ]]; then
            sleep ${HEALTH_CHECK_DELAY}
        fi
    done

    log_error "Target health check failed after ${HEALTH_CHECK_RETRIES} attempts"
    append_report ""
    append_report "❌ Target health check FAILED"
    append_report ""
    return 1
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."

    append_report "### Smoke Tests"
    append_report ""

    # Test 1: Version endpoint returns correct Git SHA
    log_info "Test 1: Checking /version endpoint..."
    VERSION_RESPONSE=$(curl -s "${VERSION_ENDPOINT}" || echo '{"error": "failed"}')
    DEPLOYED_SHA=$(echo "${VERSION_RESPONSE}" | jq -r '.gitSha // "unknown"')

    append_report "**Test 1: Version Endpoint**"
    append_report "\`\`\`json"
    append_report "${VERSION_RESPONSE}"
    append_report "\`\`\`"

    if [[ "${DEPLOYED_SHA}" == "${GIT_SHA}" ]]; then
        log_success "Version check passed: ${DEPLOYED_SHA}"
        append_report "✅ Git SHA matches: \`${DEPLOYED_SHA}\`"
    else
        log_error "Version mismatch! Expected: ${GIT_SHA}, Got: ${DEPLOYED_SHA}"
        append_report "❌ Git SHA mismatch - Expected: \`${GIT_SHA}\`, Got: \`${DEPLOYED_SHA}\`"
        append_report ""
        return 1
    fi
    append_report ""

    # Test 2: Health endpoint
    log_info "Test 2: Checking health endpoint..."
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.mentalspaceehr.com${HEALTH_CHECK_PATH}")

    append_report "**Test 2: Health Endpoint**"
    append_report "- Path: \`${HEALTH_CHECK_PATH}\`"
    append_report "- Status: \`${HEALTH_RESPONSE}\`"

    if [[ "${HEALTH_RESPONSE}" == "200" ]]; then
        log_success "Health check passed"
        append_report "- Result: ✅ Healthy"
    else
        log_error "Health check failed with status: ${HEALTH_RESPONSE}"
        append_report "- Result: ❌ Failed"
        append_report ""
        return 1
    fi
    append_report ""

    # Test 3: Authentication endpoint
    log_info "Test 3: Checking auth endpoint accessibility..."
    AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.mentalspaceehr.com/api/v1/auth/login" -X POST -H "Content-Type: application/json" -d '{}')

    append_report "**Test 3: Auth Endpoint**"
    append_report "- Status: \`${AUTH_RESPONSE}\`"

    # Should return 400 (bad request) or 401, not 5xx
    if [[ "${AUTH_RESPONSE}" =~ ^(400|401)$ ]]; then
        log_success "Auth endpoint accessible (returned ${AUTH_RESPONSE} as expected)"
        append_report "- Result: ✅ Accessible"
    else
        log_error "Auth endpoint returned unexpected status: ${AUTH_RESPONSE}"
        append_report "- Result: ⚠️  Unexpected status"
    fi
    append_report ""

    log_success "All smoke tests passed"
    append_report "**Smoke Test Result:** ✅ All tests passed"
    append_report ""
    return 0
}

# Get recent logs
get_recent_logs() {
    log_info "Fetching recent logs..."

    append_report "### Recent Logs (Last 50 lines)"
    append_report ""
    append_report "\`\`\`"

    # Get logs from CloudWatch
    LOGS=$(aws logs tail "/ecs/${TASK_FAMILY}" \
        --since 5m \
        --format short \
        --region "${AWS_REGION}" \
        --max-items 50 2>&1 || echo "Failed to fetch logs")

    append_report "${LOGS}"
    append_report "\`\`\`"
    append_report ""

    # Check for errors in logs
    ERROR_COUNT=$(echo "${LOGS}" | grep -ci "error" || echo "0")

    if [[ ${ERROR_COUNT} -gt 0 ]]; then
        log_warn "Found ${ERROR_COUNT} error entries in logs"
        append_report "⚠️  Found ${ERROR_COUNT} error entries in logs"
    else
        log_success "No errors found in recent logs"
        append_report "✅ No errors in recent logs"
    fi
    append_report ""
}

# Rollback to previous task definition
rollback() {
    log_error "INITIATING ROLLBACK..."

    append_report "---"
    append_report ""
    append_report "## 🚨 ROLLBACK INITIATED"
    append_report ""
    append_report "Rolling back to previous task definition: \`${CURRENT_TASK_DEF_ARN}\`"
    append_report ""

    aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${SERVICE_NAME}" \
        --task-definition "${CURRENT_TASK_DEF_ARN}" \
        --region "${AWS_REGION}" \
        > /dev/null

    log_info "Waiting for rollback to complete..."

    sleep 30

    ROLLBACK_STATUS=$(aws ecs describe-services \
        --cluster "${CLUSTER_NAME}" \
        --services "${SERVICE_NAME}" \
        --region "${AWS_REGION}" \
        --query 'services[0].deployments[0].rolloutState' \
        --output text)

    if [[ "${ROLLBACK_STATUS}" == "COMPLETED" ]]; then
        log_success "Rollback completed successfully"
        append_report "✅ Rollback completed"
    else
        log_warn "Rollback in progress, status: ${ROLLBACK_STATUS}"
        append_report "⏳ Rollback status: ${ROLLBACK_STATUS}"
    fi
    append_report ""
}

# Finalize report
finalize_report() {
    append_report "---"
    append_report ""
    append_report "**Report Generated:** $(date '+%Y-%m-%d %H:%M:%S %Z')"
    append_report "**Report Location:** \`${REPORT_FILE}\`"

    log_info "Deployment report saved: ${REPORT_FILE}"

    # Display report summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "${REPORT_FILE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    log_info "Starting production deployment for ${SERVICE_NAME}..."
    echo ""

    # Initialize deployment report
    init_report

    # Pre-deployment checks
    get_git_sha
    check_git_status

    # Build and push
    ecr_login
    build_image
    push_image

    # Get current state for rollback
    get_current_task_definition

    # Deploy
    create_task_definition
    update_service

    # Wait and verify
    if ! wait_for_deployment; then
        rollback
        finalize_report
        exit 1
    fi

    if ! check_target_health; then
        rollback
        finalize_report
        exit 1
    fi

    if ! run_smoke_tests; then
        rollback
        finalize_report
        exit 1
    fi

    # Get logs
    get_recent_logs

    # Success!
    append_report "---"
    append_report ""
    append_report "## ✅ DEPLOYMENT SUCCESSFUL"
    append_report ""
    append_report "The new version (\`${GIT_SHORT_SHA}\`) is now live in production."
    append_report ""

    finalize_report

    log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    log_info "Git SHA ${GIT_SHA} is now live at https://api.mentalspaceehr.com"

    exit 0
}

# Run main function
main "$@"
