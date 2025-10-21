#!/bin/bash
set -e

echo "=== MentalSpace EHR - Production Database Migration Fix ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Method 1: Get from Secrets Manager
echo -e "${YELLOW}Attempting to fetch database credentials from AWS Secrets Manager...${NC}"
if DB_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id mentalspace/db/credentials-prod \
    --query SecretString \
    --output text 2>/dev/null); then

    echo -e "${GREEN}✅ Found credentials in Secrets Manager${NC}"

    DB_HOST=$(echo $DB_SECRET | jq -r '.host')
    DB_USER=$(echo $DB_SECRET | jq -r '.username')
    DB_PASSWORD=$(echo $DB_SECRET | jq -r '.password')
    DB_NAME=$(echo $DB_SECRET | jq -r '.dbname')
    DB_PORT=$(echo $DB_SECRET | jq -r '.port // "5432"')

else
    # Method 2: Get from ECS Task Definition
    echo -e "${YELLOW}Secrets Manager not accessible. Trying ECS task definition...${NC}"

    # Get task definition
    TASK_DEF=$(aws ecs describe-task-definition \
        --task-definition mentalspace-ehr-backend-prod \
        --query 'taskDefinition.containerDefinitions[0].environment' \
        --output json)

    # Check if DATABASE_URL exists
    DATABASE_URL=$(echo $TASK_DEF | jq -r '.[] | select(.name=="DATABASE_URL") | .value')

    if [ ! -z "$DATABASE_URL" ] && [ "$DATABASE_URL" != "null" ]; then
        echo -e "${GREEN}✅ Found DATABASE_URL in task definition${NC}"
        export DATABASE_URL
    else
        # Try to construct from individual variables
        DB_HOST=$(echo $TASK_DEF | jq -r '.[] | select(.name=="DB_HOST") | .value')
        DB_USER=$(echo $TASK_DEF | jq -r '.[] | select(.name=="DB_USER") | .value')
        DB_PASSWORD=$(echo $TASK_DEF | jq -r '.[] | select(.name=="DB_PASSWORD") | .value')
        DB_NAME=$(echo $TASK_DEF | jq -r '.[] | select(.name=="DB_NAME") | .value')
        DB_PORT=$(echo $TASK_DEF | jq -r '.[] | select(.name=="DB_PORT") | .value // "5432"')

        if [ -z "$DB_HOST" ] || [ "$DB_HOST" == "null" ]; then
            echo -e "${RED}❌ Could not find database credentials.${NC}"
            echo -e "${YELLOW}Please set DATABASE_URL manually:${NC}"
            echo "export DATABASE_URL='postgresql://user:password@host:5432/database'"
            echo "Then run: cd packages/database && npx prisma migrate deploy"
            exit 1
        fi
    fi
fi

# Construct DATABASE_URL if we have individual components
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo ""
echo -e "${GREEN}Database Configuration:${NC}"
echo "  Host: ${DB_HOST:-[from DATABASE_URL]}"
echo "  Database: ${DB_NAME:-[from DATABASE_URL]}"
echo "  Port: ${DB_PORT:-[from DATABASE_URL]}"
echo ""

# Navigate to database package
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../packages/database"

echo -e "${YELLOW}Running database migrations...${NC}"
echo ""

# Run migrations
if npx prisma migrate deploy; then
    echo ""
    echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
    echo ""

    # Check migration status
    echo -e "${YELLOW}Checking migration status...${NC}"
    npx prisma migrate status

    echo ""
    echo -e "${GREEN}✅ Database is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test login at https://mentalspaceehr.com"
    echo "2. Check CloudWatch logs: aws logs tail /ecs/mentalspace-ehr-backend-prod --follow"
    echo "3. If still issues, check DATABASE-ERROR-FIX.md for troubleshooting"

else
    echo ""
    echo -e "${RED}❌ Migration failed!${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Verify database is accessible"
    echo "2. Check security groups allow connection"
    echo "3. Verify credentials are correct"
    echo "4. See DATABASE-ERROR-FIX.md for detailed debugging"
    exit 1
fi
