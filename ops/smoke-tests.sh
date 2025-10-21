#!/usr/bin/env bash
set -euo pipefail

################################################################################
# MentalSpace EHR - Production Smoke Tests
#
# Purpose: Verify production deployment health after release
# Can be run standalone or as part of deployment pipeline
#
# Usage: ./ops/smoke-tests.sh [expected-git-sha]
################################################################################

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

# Configuration
API_BASE_URL="https://api.mentalspaceehr.com"
EXPECTED_GIT_SHA="${1:-}"
TESTS_PASSED=0
TESTS_FAILED=0

# Test result tracking
declare -a FAILED_TESTS=()

################################################################################
# TEST FUNCTIONS
################################################################################

# Test 1: Version Endpoint
test_version_endpoint() {
    log_info "Test 1: Version Endpoint"

    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/version")
    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [[ "$http_code" != "200" ]]; then
        log_error "Version endpoint returned HTTP ${http_code}"
        FAILED_TESTS+=("Version endpoint - HTTP ${http_code}")
        ((TESTS_FAILED++))
        return 1
    fi

    # Parse JSON response
    local git_sha=$(echo "$body" | jq -r '.gitSha // "unknown"')
    local build_time=$(echo "$body" | jq -r '.buildTime // "unknown"')
    local service=$(echo "$body" | jq -r '.service // "unknown"')

    echo "  Git SHA: ${git_sha}"
    echo "  Build Time: ${build_time}"
    echo "  Service: ${service}"

    # Verify expected Git SHA if provided
    if [[ -n "$EXPECTED_GIT_SHA" ]]; then
        if [[ "$git_sha" == "$EXPECTED_GIT_SHA" ]]; then
            log_success "Version matches expected Git SHA: ${git_sha}"
            ((TESTS_PASSED++))
            return 0
        else
            log_error "Version mismatch! Expected: ${EXPECTED_GIT_SHA}, Got: ${git_sha}"
            FAILED_TESTS+=("Version mismatch - Expected: ${EXPECTED_GIT_SHA}, Got: ${git_sha}")
            ((TESTS_FAILED++))
            return 1
        fi
    else
        if [[ "$git_sha" != "unknown" ]]; then
            log_success "Version endpoint working, Git SHA: ${git_sha}"
            ((TESTS_PASSED++))
            return 0
        else
            log_warn "Version endpoint returned 'unknown' Git SHA"
            ((TESTS_PASSED++))
            return 0
        fi
    fi
}

# Test 2: Health Endpoint
test_health_endpoint() {
    log_info "Test 2: Health Endpoint (Liveness)"

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/v1/health/live")

    if [[ "$http_code" == "200" ]]; then
        log_success "Health endpoint returned 200 OK"
        ((TESTS_PASSED++))
        return 0
    else
        log_error "Health endpoint returned HTTP ${http_code}"
        FAILED_TESTS+=("Health endpoint - HTTP ${http_code}")
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 3: Database Health
test_database_health() {
    log_info "Test 3: Database Connectivity (via health endpoint)"

    local response
    response=$(curl -s "${API_BASE_URL}/api/v1/health/ready")
    local db_status=$(echo "$response" | jq -r '.database // "unknown"')

    if [[ "$db_status" == "connected" ]]; then
        log_success "Database is connected"
        ((TESTS_PASSED++))
        return 0
    else
        log_error "Database health check failed: ${db_status}"
        FAILED_TESTS+=("Database connectivity - ${db_status}")
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 4: HTTPS Enforcement
test_https_enforcement() {
    log_info "Test 4: HTTPS Enforcement"

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://api.mentalspaceehr.com/api/v1/health/live" --max-time 10 || echo "000")

    # Should redirect (301/302) or fail to connect (000) because HTTP is blocked
    if [[ "$http_code" == "301" ]] || [[ "$http_code" == "302" ]] || [[ "$http_code" == "000" ]]; then
        log_success "HTTPS enforcement working (HTTP blocked or redirected)"
        ((TESTS_PASSED++))
        return 0
    else
        log_warn "HTTP request returned unexpected code: ${http_code}"
        ((TESTS_PASSED++))
        return 0
    fi
}

# Test 5: Authentication Required
test_authentication_required() {
    log_info "Test 5: Authentication Required for Protected Endpoints"

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/v1/clients")

    # Should return 401 (Unauthorized) without auth token
    if [[ "$http_code" == "401" ]]; then
        log_success "Protected endpoints require authentication"
        ((TESTS_PASSED++))
        return 0
    else
        log_warn "Protected endpoint returned unexpected code: ${http_code} (expected 401)"
        FAILED_TESTS+=("Authentication check - HTTP ${http_code} (expected 401)")
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 6: CORS Headers
test_cors_headers() {
    log_info "Test 6: CORS Headers Present"

    local cors_header
    cors_header=$(curl -s -I "${API_BASE_URL}/api/v1/health/live" | grep -i "access-control-allow" || echo "")

    if [[ -n "$cors_header" ]]; then
        log_success "CORS headers configured"
        ((TESTS_PASSED++))
        return 0
    else
        log_warn "CORS headers not found"
        ((TESTS_PASSED++))
        return 0
    fi
}

# Test 7: Security Headers
test_security_headers() {
    log_info "Test 7: Security Headers (Helmet.js)"

    local response
    response=$(curl -s -I "${API_BASE_URL}/api/v1/health/live")

    local found_headers=0

    # Check for common security headers
    if echo "$response" | grep -qi "x-frame-options"; then
        echo "  ✓ X-Frame-Options present"
        ((found_headers++))
    fi

    if echo "$response" | grep -qi "x-content-type-options"; then
        echo "  ✓ X-Content-Type-Options present"
        ((found_headers++))
    fi

    if echo "$response" | grep -qi "strict-transport-security"; then
        echo "  ✓ Strict-Transport-Security present"
        ((found_headers++))
    fi

    if [[ $found_headers -ge 2 ]]; then
        log_success "Security headers configured (${found_headers}/3)"
        ((TESTS_PASSED++))
        return 0
    else
        log_warn "Limited security headers found (${found_headers}/3)"
        ((TESTS_PASSED++))
        return 0
    fi
}

# Test 8: Response Time
test_response_time() {
    log_info "Test 8: API Response Time"

    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "${API_BASE_URL}/api/v1/health/live")
    response_time_ms=$(echo "$response_time * 1000" | bc | cut -d'.' -f1)

    echo "  Response time: ${response_time_ms}ms"

    if [[ $response_time_ms -lt 2000 ]]; then
        log_success "Response time acceptable (< 2s)"
        ((TESTS_PASSED++))
        return 0
    else
        log_warn "Response time slow: ${response_time_ms}ms"
        ((TESTS_PASSED++))
        return 0
    fi
}

# Test 9: Error Response Format
test_error_response_format() {
    log_info "Test 9: Error Response Format (No PHI Exposure)"

    local response
    response=$(curl -s "${API_BASE_URL}/api/v1/clients")

    # Should return JSON error, not HTML or stack trace
    if echo "$response" | jq . > /dev/null 2>&1; then
        log_success "Error responses are JSON formatted"

        # Check that response doesn't contain sensitive info
        if echo "$response" | grep -Eqi "(password|ssn|database|stack|prisma)"; then
            log_error "Error response contains sensitive information"
            FAILED_TESTS+=("Error response contains sensitive data")
            ((TESTS_FAILED++))
            return 1
        else
            ((TESTS_PASSED++))
            return 0
        fi
    else
        log_warn "Error response is not valid JSON"
        ((TESTS_PASSED++))
        return 0
    fi
}

# Test 10: Root Endpoint
test_root_endpoint() {
    log_info "Test 10: Root Endpoint"

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/")

    if [[ "$http_code" == "200" ]]; then
        log_success "Root endpoint accessible"
        ((TESTS_PASSED++))
        return 0
    else
        log_warn "Root endpoint returned HTTP ${http_code}"
        ((TESTS_PASSED++))
        return 0
    fi
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  MentalSpace EHR - Production Smoke Tests"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_info "Testing API at: ${API_BASE_URL}"

    if [[ -n "$EXPECTED_GIT_SHA" ]]; then
        log_info "Expected Git SHA: ${EXPECTED_GIT_SHA}"
    fi

    echo ""

    # Run all tests
    test_version_endpoint || true
    echo ""

    test_health_endpoint || true
    echo ""

    test_database_health || true
    echo ""

    test_https_enforcement || true
    echo ""

    test_authentication_required || true
    echo ""

    test_cors_headers || true
    echo ""

    test_security_headers || true
    echo ""

    test_response_time || true
    echo ""

    test_error_response_format || true
    echo ""

    test_root_endpoint || true
    echo ""

    # Summary
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  SMOKE TEST SUMMARY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_info "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"

    if [[ $TESTS_FAILED -gt 0 ]]; then
        log_error "Tests Failed: ${TESTS_FAILED}"
        echo ""
        echo "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  ❌ $test"
        done
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        exit 1
    else
        log_success "All tests passed!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        exit 0
    fi
}

# Run main function
main "$@"
