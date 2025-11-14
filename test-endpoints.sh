#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="https://api.mentalspaceehr.com/api/v1"

echo "=== COMPREHENSIVE API ENDPOINT TESTING ==="
echo ""

# Login and get token
echo "=== LOGGING IN ==="
LOGIN_RESPONSE=$(curl -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ejoseph@chctherapy.com","password":"Bing@@0912"}' \
  -s -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d':' -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

if [ "$HTTP_STATUS" == "200" ]; then
  TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "  Token: ${TOKEN:0:20}..."
  echo ""
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "  Status: $HTTP_STATUS"
  exit 1
fi

# Test endpoints
PASSED=0
FAILED=0
ERRORS=""

test_endpoint() {
  local NAME="$1"
  local METHOD="$2"
  local PATH="$3"

  RESPONSE=$(curl -X $METHOD "${API_BASE}${PATH}" \
    -H "Authorization: Bearer $TOKEN" \
    -s -w "\nHTTP_STATUS:%{http_code}")

  STATUS=$(echo "$RESPONSE" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d':' -f2)

  if [ "$STATUS" == "200" ]; then
    echo -e "${GREEN}✓${NC} $NAME (HTTP $STATUS)"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $NAME (HTTP $STATUS)"
    ((FAILED++))
    ERRORS="${ERRORS}\n  - $NAME (HTTP $STATUS)"
  fi
}

echo "=== TESTING CRITICAL ENDPOINTS ==="
echo ""

echo "--- Module 3: Group Therapy ---"
test_endpoint "GET /group-sessions" "GET" "/group-sessions"
test_endpoint "GET /group-sessions/categories" "GET" "/group-sessions/categories"
echo ""

echo "--- Module 1: Client Management ---"
test_endpoint "GET /clients" "GET" "/clients"
test_endpoint "GET /clients/potential-duplicates" "GET" "/clients/potential-duplicates"
echo ""

echo "--- Module 2: Appointments ---"
test_endpoint "GET /appointments" "GET" "/appointments"
test_endpoint "GET /appointments/types" "GET" "/appointments/types"
echo ""

echo "--- Module 4: Clinical Notes ---"
test_endpoint "GET /clinical-notes" "GET" "/clinical-notes"
echo ""

echo "--- Module 7: Waitlist ---"
test_endpoint "GET /waitlist" "GET" "/waitlist"
echo ""

echo "--- Module 8: Dashboard ---"
test_endpoint "GET /dashboard/stats" "GET" "/dashboard/stats"
echo ""

echo "--- Module 9: HR Management ---"
test_endpoint "GET /hr/employees" "GET" "/hr/employees"
test_endpoint "GET /hr/time-attendance" "GET" "/hr/time-attendance"
test_endpoint "GET /hr/pto-requests" "GET" "/hr/pto-requests"
echo ""

echo "--- Module 9: Communication ---"
test_endpoint "GET /messages" "GET" "/messages"
test_endpoint "GET /channels" "GET" "/channels"
test_endpoint "GET /documents" "GET" "/documents"
echo ""

echo "--- Module 9: Compliance ---"
test_endpoint "GET /compliance/policies" "GET" "/compliance/policies"
test_endpoint "GET /compliance/incidents" "GET" "/compliance/incidents"
echo ""

echo "--- Module 9: Training ---"
test_endpoint "GET /training/courses" "GET" "/training/courses"
test_endpoint "GET /training/records" "GET" "/training/records"
echo ""

echo "--- Module 9: Finance ---"
test_endpoint "GET /finance/vendors" "GET" "/finance/vendors"
test_endpoint "GET /finance/budgets" "GET" "/finance/budgets"
test_endpoint "GET /finance/expenses" "GET" "/finance/expenses"
echo ""

# Summary
echo "=== TEST SUMMARY ==="
TOTAL=$((PASSED + FAILED))
echo "Total Tests: $TOTAL"
echo -e "${GREEN}✓ Passed: $PASSED${NC}"

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}✗ Failed: $FAILED${NC}"
  echo ""
  echo "Failed Endpoints:"
  echo -e "$ERRORS"
else
  echo -e "${RED}✗ Failed: 0${NC}"
  echo ""
  echo -e "${GREEN}🎉 ALL TESTS PASSED! No API errors detected.${NC}"
fi
