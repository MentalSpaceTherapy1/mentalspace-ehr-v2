#!/bin/bash

echo "1. Logging in to portal..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/portal-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jessica.anderson@example.com","password":"SecurePass123!"}')

echo "$RESPONSE" > /c/tmp/login-response.json
echo "Login response saved to /c/tmp/login-response.json"

TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "ERROR: No token received"
  cat /c/tmp/login-response.json
  exit 1
fi

echo "2. Token obtained: ${TOKEN:0:50}..."

echo "3. Testing dashboard access..."
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/portal/dashboard

echo ""
echo "4. Done"
