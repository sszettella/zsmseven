# CORS Fix Deployment Guide

## What Was Fixed

The users-api was returning 403 errors due to improper CORS configuration at the API Gateway level. The issue was that preflight OPTIONS requests were not being handled correctly.

## Changes Made

### Updated serverless.yml

Changed from simple CORS:
```yaml
cors: true
```

To detailed CORS configuration:
```yaml
cors:
  origin: '*'
  headers:
    - Content-Type
    - X-Amz-Date
    - Authorization
    - X-Api-Key
    - X-Amz-Security-Token
    - X-Amz-User-Agent
  allowCredentials: true
```

This change:
✅ Explicitly allows the `Authorization` header (required for JWT tokens)
✅ Enables credentials (required for Bearer tokens)
✅ Ensures OPTIONS preflight requests return correct headers
✅ Allows all origins (`*`)

## Deployment Steps

### 1. Navigate to users-api directory

```bash
cd /Users/sszettella/Documents/GitHub/zsmseven-api/users-api
```

### 2. Build the TypeScript code

```bash
npm run build
```

### 3. Deploy to development

```bash
npm run deploy:dev
```

This will:
- Update the API Gateway configuration
- Automatically create OPTIONS methods for all endpoints
- Configure proper CORS headers on all responses
- Deploy the updated Lambda functions

### 4. Deploy to production (when ready)

```bash
npm run deploy:prod
```

## Verification

### Test 1: OPTIONS Preflight Request

```bash
curl -X OPTIONS https://api.zsmproperties.com/api/users \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -v
```

**Expected response headers:**
```
access-control-allow-origin: *
access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
access-control-allow-headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent
access-control-allow-credentials: true
```

### Test 2: Actual GET Request with Token

```bash
# First, get a token from auth-api
TOKEN=$(curl -X POST https://api.zsmproperties.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}' \
  | jq -r '.token')

# Then test users API
curl -X GET https://api.zsmproperties.com/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: http://localhost:3000" \
  -v
```

**Expected:**
- Status: 200 (if admin) or 403 (if not admin, but this is correct behavior)
- CORS headers present in response
- No CORS-related errors

### Test 3: Browser Console Test

Open your frontend app in browser and run:

```javascript
// Get token from auth
const loginResponse = await fetch('https://api.zsmproperties.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your@email.com',
    password: 'yourpass'
  })
});

const { token } = await loginResponse.json();

// Test users API
const usersResponse = await fetch('https://api.zsmproperties.com/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

console.log('Status:', usersResponse.status);
console.log('Data:', await usersResponse.json());
```

**Before the fix:**
- ❌ CORS error in console
- ❌ Request blocked by browser
- ❌ 403 with "CORS policy" message

**After the fix:**
- ✅ No CORS errors
- ✅ Request completes
- ✅ 200 (if admin) or 403 with proper error message in body

## What This Fixes

### Before (Broken)
```
Browser → OPTIONS request to /users
API Gateway → ❌ Blocks or returns wrong headers
Browser → ❌ CORS error, blocks the actual request
```

### After (Fixed)
```
Browser → OPTIONS request to /users
API Gateway → ✅ Returns proper CORS headers
Browser → ✅ Allows the actual request
API Gateway → GET /users
Lambda → Processes request
Response → ✅ Includes CORS headers
Browser → ✅ Receives response
```

## Troubleshooting

### Issue: Still getting CORS errors after deployment

**Solution:**
1. Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
2. Verify deployment completed successfully:
   ```bash
   serverless info --stage dev
   ```
3. Check API Gateway in AWS Console:
   - Go to API Gateway → Your API → Resources
   - Verify OPTIONS method exists for each endpoint
   - Check Method Response headers include CORS headers

### Issue: 403 error but no CORS error

**Solution:**
This is actually correct! If you're getting 403 without CORS errors, it means:
- ✅ CORS is working properly
- ❌ Your user doesn't have permission (not an admin)

To fix permission issue, see [TROUBLESHOOTING_403.md](TROUBLESHOOTING_403.md)

### Issue: Deployment fails

**Solution:**
1. Check for syntax errors in serverless.yml:
   ```bash
   serverless print --stage dev
   ```
2. Ensure indentation is correct (YAML is sensitive to spaces)
3. Try deploying a single function first:
   ```bash
   serverless deploy function -f listUsers --stage dev
   ```

## Rollback (If Needed)

If something goes wrong, you can rollback to previous CORS config:

```bash
# In serverless.yml, change back to:
cors: true

# Then redeploy
npm run build
npm run deploy:dev
```

## Expected Timeline

- **Build**: ~10 seconds
- **Deployment**: 2-3 minutes
- **API Gateway update**: Automatic during deployment
- **Propagation**: Immediate (no CloudFront cache to clear)

## Post-Deployment Checklist

- [ ] Deployment completed without errors
- [ ] OPTIONS requests return CORS headers
- [ ] Browser can make requests without CORS errors
- [ ] Authorization header is being sent and accepted
- [ ] Frontend can communicate with users-api
- [ ] CloudWatch logs show requests are reaching Lambda functions

## Summary

✅ **Root Cause:** API Gateway not properly configured for CORS preflight requests

✅ **Fix:** Updated serverless.yml with explicit CORS configuration including Authorization header

✅ **Result:** Browser OPTIONS requests now receive proper CORS headers, allowing subsequent requests with JWT tokens

✅ **Deploy:** Run `npm run deploy:dev` to apply the fix

The users-api will now work correctly from browsers with cross-origin requests! 🚀
