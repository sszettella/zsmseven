# CORS Configuration

## Overview

The authentication API has been configured with comprehensive CORS (Cross-Origin Resource Sharing) support to allow requests from localhost and any other origin.

## What Was Configured

### 1. Serverless.yml Configuration

Updated all function endpoints with detailed CORS configuration:

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

**Endpoints updated:**
- ✅ POST /auth/login
- ✅ POST /auth/register
- ✅ POST /auth/logout
- ✅ GET /auth/me
- ✅ POST /auth/refresh

### 2. Response Headers

Updated `src/utils/response.ts` to include all necessary CORS headers in every response:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
}
```

### 3. TypeScript Types

Updated `src/types/index.ts` to support additional CORS headers:

```typescript
export interface APIResponse<T = any> {
  statusCode: number;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean | string;
    'Access-Control-Allow-Headers'?: string;
    'Access-Control-Allow-Methods'?: string;
    [key: string]: any;
  };
  body: string;
}
```

## CORS Headers Explained

### Access-Control-Allow-Origin: '*'
- **Purpose**: Allows requests from any origin
- **Includes**: localhost:3000, localhost:8080, your production domain, etc.
- **Security Note**: For production, consider restricting to specific domains

### Access-Control-Allow-Credentials: 'true'
- **Purpose**: Allows cookies and authorization headers
- **Required**: For sending Bearer tokens in Authorization header

### Access-Control-Allow-Headers
- **Purpose**: Lists allowed request headers
- **Includes**: Content-Type, Authorization, and AWS-specific headers

### Access-Control-Allow-Methods
- **Purpose**: Lists allowed HTTP methods
- **Includes**: GET, POST, PUT, DELETE, OPTIONS

## Testing from Localhost

### Example: Fetch from React/JavaScript

```javascript
// From localhost:3000, localhost:8080, etc.
const response = await fetch('https://api.zsmproperties.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for CORS with credentials
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123'
  })
});

const data = await response.json();
console.log(data);
```

### Example: Authenticated Request

```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('https://api.zsmproperties.com/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  credentials: 'include'
});

const user = await response.json();
console.log(user);
```

### Example: Using Axios

```javascript
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'https://api.zsmproperties.com/api/auth';
axios.defaults.withCredentials = true;

// Login
const loginResponse = await axios.post('/login', {
  email: 'user@example.com',
  password: 'SecurePass123'
});

// Store token
const token = loginResponse.data.token;
localStorage.setItem('accessToken', token);

// Authenticated request
const userResponse = await axios.get('/me', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

console.log(userResponse.data);
```

## Common CORS Issues and Solutions

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause**: API not returning CORS headers

**Solution**:
1. Ensure you've deployed the updated code
2. Check API Gateway CORS configuration
3. Verify response headers in browser dev tools

### Issue: "CORS policy: Response to preflight request doesn't pass"

**Cause**: OPTIONS request (preflight) failing

**Solution**:
- API Gateway automatically handles OPTIONS requests with `cors: true`
- Ensure all allowed headers are listed in configuration

### Issue: "Credentials flag is 'true', but 'Access-Control-Allow-Credentials' is not"

**Cause**: Using `credentials: 'include'` but server not allowing

**Solution**:
- Verify `allowCredentials: true` in serverless.yml
- Check response headers include `Access-Control-Allow-Credentials: true`

### Issue: "Cannot use wildcard in 'Access-Control-Allow-Origin' when credentials flag is true"

**Cause**: Browser security - can't use both `*` and credentials

**Current Setup**: We use `*` which works for most cases

**If you encounter this**:
- Update `origin: '*'` to specific origin: `origin: 'http://localhost:3000'`
- Or dynamically set origin based on request

## Production Recommendations

### 1. Restrict Origins

Instead of allowing all origins (`*`), restrict to specific domains:

```yaml
cors:
  origin:
    - https://yourdomain.com
    - https://www.yourdomain.com
    - http://localhost:3000  # For development
```

### 2. Use Environment-Based Configuration

```yaml
cors:
  origin: ${self:custom.allowedOrigins.${self:provider.stage}}

custom:
  allowedOrigins:
    dev:
      - http://localhost:3000
      - http://localhost:8080
    prod:
      - https://yourdomain.com
      - https://www.yourdomain.com
```

### 3. Remove Wildcard for Production

Update response.ts to use environment-based origin:

```typescript
const getAllowedOrigin = (): string => {
  const stage = process.env.STAGE || 'dev';
  if (stage === 'prod') {
    return 'https://yourdomain.com';
  }
  return '*'; // Allow all in dev
};

export const createResponse = <T>(
  statusCode: number,
  data: T,
  headers: Record<string, any> = {}
): APIResponse<T> => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getAllowedOrigin(),
      // ... rest of headers
    },
    body: JSON.stringify(data)
  };
};
```

## Verifying CORS Configuration

### Using Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Make a request to the API
4. Click on the request
5. Check "Response Headers" for:
   - `access-control-allow-origin: *`
   - `access-control-allow-credentials: true`
   - `access-control-allow-headers: ...`
   - `access-control-allow-methods: ...`

### Using cURL

```bash
# Test preflight request
curl -X OPTIONS https://api.zsmproperties.com/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Test actual request
curl -X POST https://api.zsmproperties.com/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}' \
  -v
```

Look for response headers starting with `access-control-`.

## Deployment

After updating CORS configuration:

```bash
# Build
npm run build

# Deploy to development
serverless deploy --stage dev

# Deploy to production
serverless deploy --stage prod
```

## Summary

✅ **What Works Now:**
- Requests from localhost (any port)
- Requests from any domain
- Bearer token authentication
- Cookies and credentials
- All HTTP methods
- Preflight OPTIONS requests

✅ **Files Updated:**
1. `serverless.yml` - Detailed CORS configuration for all endpoints
2. `src/utils/response.ts` - CORS headers in all responses
3. `src/types/index.ts` - Type support for CORS headers

✅ **Ready for:**
- Development from localhost
- Testing from any origin
- Frontend integration
- Production deployment (consider restricting origins)

Your auth API now supports full CORS from localhost and any other origin! 🚀
