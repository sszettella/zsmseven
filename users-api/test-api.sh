#!/bin/bash

# Test script for users API
# Usage: ./test-api.sh <your-jwt-token>

API_BASE="https://api.zsmproperties.com/api"
TOKEN="${1}"

echo "=========================================="
echo "Testing Users API"
echo "=========================================="
echo ""

if [ -z "$TOKEN" ]; then
    echo "ERROR: No token provided"
    echo "Usage: ./test-api.sh <your-jwt-token>"
    echo ""
    echo "First, get a token from auth API:"
    echo "curl -X POST $API_BASE/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"your@email.com\",\"password\":\"yourpass\"}'"
    exit 1
fi

echo "Token (first 20 chars): ${TOKEN:0:20}..."
echo ""

# Test 1: GET /users (admin only)
echo "=========================================="
echo "Test 1: GET /users (list all users)"
echo "=========================================="
curl -X GET "$API_BASE/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received but not JSON"
echo ""
echo ""

# Test 2: Check CORS headers
echo "=========================================="
echo "Test 2: Check CORS Headers"
echo "=========================================="
curl -X OPTIONS "$API_BASE/users" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  -v \
  2>&1 | grep -i "access-control"
echo ""
echo ""

# Test 3: Get specific user (replace USER_ID)
echo "=========================================="
echo "Test 3: GET /users/:id (need to provide user ID)"
echo "=========================================="
echo "Skipped - need specific user ID"
echo "Manual command: curl -X GET \"$API_BASE/users/USER_ID_HERE\" -H \"Authorization: Bearer $TOKEN\""
echo ""
echo ""

echo "=========================================="
echo "Debugging Information"
echo "=========================================="

# Decode JWT to see user info
echo "JWT Token Info (header + payload):"
echo "$TOKEN" | cut -d. -f1,2 | while IFS=. read header payload; do
    echo "Header:"
    echo "$header" | base64 -d 2>/dev/null | jq '.' 2>/dev/null || echo "Could not decode header"
    echo ""
    echo "Payload:"
    echo "$payload" | base64 -d 2>/dev/null | jq '.' 2>/dev/null || echo "Could not decode payload"
done
echo ""

echo "=========================================="
echo "Common 403 Causes:"
echo "=========================================="
echo "1. Token is expired (check 'exp' in payload above)"
echo "2. User is not admin (check 'role' in payload above)"
echo "3. Token signature is invalid (wrong JWT_SECRET)"
echo "4. API Gateway authorizer issue"
echo "5. Lambda function not deployed correctly"
echo ""
