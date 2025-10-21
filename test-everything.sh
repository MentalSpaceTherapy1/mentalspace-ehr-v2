#!/bin/bash

##############################################################################
# TEST EVERYTHING - Comprehensive Test Suite Runner
#
# Runs ALL tests for the MentalSpace EHR application:
# - Unit tests
# - Integration tests
# - API tests
# - Database tests
# - Security tests
# - Performance tests
#
# Usage: ./test-everything.sh [--verbose] [--coverage]
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
VERBOSE=false
COVERAGE=false

for arg in "$@"; do
    case $arg in
        --verbose)
            VERBOSE=true
            ;;
        --coverage)
            COVERAGE=true
            ;;
    esac
done

echo "======================================================================"
echo "MENTALSPACE EHR - COMPREHENSIVE TEST SUITE"
echo "======================================================================"
echo ""
echo "This will run ALL tests. This may take several minutes..."
echo ""

START_TIME=$(date +%s)

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test_suite() {
    local NAME=$1
    local COMMAND=$2

    echo ""
    echo "======================================================================"
    echo -e "${BLUE}Running: $NAME${NC}"
    echo "======================================================================"
    echo ""

    if $VERBOSE; then
        OUTPUT_FILE="/dev/stdout"
    else
        OUTPUT_FILE="test-output-$(echo $NAME | tr ' ' '-').log"
    fi

    if $COMMAND 2>&1 | tee "$OUTPUT_FILE"; then
        echo -e "${GREEN}✅ $NAME - PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ $NAME - FAILED${NC}"
        echo "See $OUTPUT_FILE for details"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

##############################################################################
# 1. UNIT TESTS
##############################################################################

echo "======================================================================"
echo "PHASE 1: UNIT TESTS"
echo "======================================================================"

cd packages/backend

run_test_suite "Unit Tests - Controllers" "npm run test:unit:controllers" || true
run_test_suite "Unit Tests - Services" "npm run test:unit:services" || true
run_test_suite "Unit Tests - Middleware" "npm run test:unit:middleware" || true
run_test_suite "Unit Tests - Utilities" "npm run test:unit:utils" || true

cd ../..

##############################################################################
# 2. INTEGRATION TESTS
##############################################################################

echo ""
echo "======================================================================"
echo "PHASE 2: INTEGRATION TESTS"
echo "======================================================================"

cd packages/backend

run_test_suite "Integration - Patient Workflow" "npm run test:integration:patient" || true
run_test_suite "Integration - Appointment Workflow" "npm run test:integration:appointment" || true
run_test_suite "Integration - Clinical Notes Workflow" "npm run test:integration:notes" || true
run_test_suite "Integration - Billing Workflow" "npm run test:integration:billing" || true
run_test_suite "Integration - Portal Workflow" "npm run test:integration:portal" || true

cd ../..

##############################################################################
# 3. API ENDPOINT TESTS
##############################################################################

echo ""
echo "======================================================================"
echo "PHASE 3: API ENDPOINT TESTS"
echo "======================================================================"

cd packages/backend

run_test_suite "API Tests - Authentication" "npm run test:api:auth" || true
run_test_suite "API Tests - Clients" "npm run test:api:clients" || true
run_test_suite "API Tests - Appointments" "npm run test:api:appointments" || true
run_test_suite "API Tests - Clinical Notes" "npm run test:api:notes" || true
run_test_suite "API Tests - Billing" "npm run test:api:billing" || true
run_test_suite "API Tests - Portal" "npm run test:api:portal" || true

cd ../..

##############################################################################
# 4. DATABASE TESTS
##############################################################################

echo ""
echo "======================================================================"
echo "PHASE 4: DATABASE TESTS"
echo "======================================================================"

cd packages/backend

run_test_suite "Database - Schema Validation" "npm run test:database:schema" || true
run_test_suite "Database - Constraints" "npm run test:database:constraints" || true
run_test_suite "Database - Migrations" "npm run test:database:migrations" || true
run_test_suite "Database - Data Integrity" "npm run test:database:integrity" || true

cd ../..

##############################################################################
# 5. SECURITY TESTS
##############################################################################

echo ""
echo "======================================================================"
echo "PHASE 5: SECURITY TESTS"
echo "======================================================================"

cd packages/backend

run_test_suite "Security - PHI Protection" "npm run test:security:phi" || true
run_test_suite "Security - SQL Injection" "npm run test:security:sqli" || true
run_test_suite "Security - XSS Protection" "npm run test:security:xss" || true
run_test_suite "Security - CSRF Protection" "npm run test:security:csrf" || true
run_test_suite "Security - Authentication" "npm run test:security:auth" || true
run_test_suite "Security - Authorization" "npm run test:security:authz" || true
run_test_suite "Security - Audit Logging" "npm run test:security:audit" || true

cd ../..

##############################################################################
# 6. PERFORMANCE TESTS
##############################################################################

echo ""
echo "======================================================================"
echo "PHASE 6: PERFORMANCE TESTS"
echo "======================================================================"

cd packages/backend

run_test_suite "Performance - API Response Times" "npm run test:performance:api" || true
run_test_suite "Performance - Database Queries" "npm run test:performance:db" || true
run_test_suite "Performance - Load Testing" "npm run test:performance:load" || true

cd ../..

##############################################################################
# 7. CODE QUALITY
##############################################################################

echo ""
echo "======================================================================"
echo "PHASE 7: CODE QUALITY"
echo "======================================================================"

run_test_suite "Linting" "npm run lint" || true

##############################################################################
# 8. DEPENDENCY CHECK
##############################################################################

echo ""
echo "======================================================================"
echo "PHASE 8: DEPENDENCY SECURITY"
echo "======================================================================"

run_test_suite "Dependency Audit" "npm audit --audit-level=moderate" || true

##############################################################################
# 9. BUILD VERIFICATION
##############################################################################

echo ""
echo "======================================================================"
echo "PHASE 9: BUILD VERIFICATION"
echo "======================================================================"

cd packages/backend
run_test_suite "TypeScript Build" "npm run build" || true
cd ../..

##############################################################################
# 10. COVERAGE REPORT (if requested)
##############################################################################

if $COVERAGE; then
    echo ""
    echo "======================================================================"
    echo "PHASE 10: CODE COVERAGE"
    echo "======================================================================"

    cd packages/backend
    run_test_suite "Coverage Report Generation" "npm run test:coverage" || true
    cd ../..

    if [ -f "packages/backend/coverage/coverage-summary.json" ]; then
        echo ""
        echo "Coverage Summary:"
        cat packages/backend/coverage/coverage-summary.json | jq '.total'
    fi
fi

##############################################################################
# FINAL REPORT
##############################################################################

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))

echo ""
echo "======================================================================"
echo "TEST SUITE COMPLETE"
echo "======================================================================"
echo ""
echo "Duration: ${MINUTES}m ${SECONDS}s"
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ "$FAILED_TESTS" -eq "0" ]; then
    echo -e "${GREEN}======================================================================"
    echo "✅ ALL TESTS PASSED"
    echo "======================================================================"
    echo "Ready for deployment"
    echo -e "${NC}"

    if $COVERAGE; then
        COVERAGE_PCT=$(cat packages/backend/coverage/coverage-summary.json | jq '.total.lines.pct' 2>/dev/null || echo "0")
        echo "Code coverage: ${COVERAGE_PCT}%"
    fi

    exit 0
else
    echo -e "${RED}======================================================================"
    echo "❌ SOME TESTS FAILED"
    echo "======================================================================"
    echo "Review the failed test outputs above"
    echo "Do not deploy until all tests pass"
    echo -e "${NC}"

    exit 1
fi
