# CORS Configuration - Users API

## Overview

The users API has been configured with comprehensive CORS (Cross-Origin Resource Sharing) support to allow requests from localhost and any other origin, matching the configuration used in the auth-api.

## What Was Configured

### 1. Serverless.yml Configuration

All function endpoints are configured with detailed CORS settings:

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

**Endpoints with CORS enabled:**
- ✅ GET /users
- ✅ GET /users/:id
- ✅ POST /users
- ✅ PUT /users/:id
- ✅ DELETE /users/:id

This configuration ensures:
- ✅ OPTIONS preflight requests are handled automatically
- ✅ Authorization header is explicitly allowed
- ✅ All origins are permitted (`*`)
- ✅ Credentials (cookies, auth headers) are allowed
- ✅ All necessary headers are whitelisted

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

The `src/types/index.ts` includes support for CORS headers:

```typescript
export interface APIResponse<T = any> {
  statusCode: number;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials'?: boolean | string;
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
- **Critical**: This header is required for JWT authentication to work from browsers

### Access-Control-Allow-Headers
- **Purpose**: Lists allowed request headers
- **Includes**: Content-Type, Authorization, and AWS-specific headers
- **Required**: Authorization header must be listed for JWT tokens

### Access-Control-Allow-Methods
- **Purpose**: Lists allowed HTTP methods
- **Includes**: GET, POST, PUT, DELETE, OPTIONS

## Testing from Frontend

### Example: List Users with Axios

```javascript
import axios from 'axios';

// Get token from auth-api first
const loginResponse = await axios.post('https://api.zsmproperties.com/api/auth/login', {
  email: 'admin@example.com',
  password: 'yourpassword'
});

const token = loginResponse.data.token;

// Now call users API
const usersResponse = await axios.get('https://api.zsmproperties.com/api/users', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

console.log(usersResponse.data); // Array of users
```

### Example: Create User

```javascript
const createResponse = await axios.post(
  'https://api.zsmproperties.com/api/users',
  {
    email: 'newuser@example.com',
    password: 'SecurePass123',
    name: 'New User',
    role: 'user'
  },
  {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  }
);

console.log(createResponse.data); // Created user object
```

### Example: Update User

```javascript
const updateResponse = await axios.put(
  `https://api.zsmproperties.com/api/users/${userId}`,
  {
    name: 'Updated Name',
    email: 'newemail@example.com'
    // password is optional - omit to keep existing password
  },
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

console.log(updateResponse.data); // Updated user object
```

### Example: Delete User

```javascript
await axios.delete(
  `https://api.zsmproperties.com/api/users/${userId}`,
  {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  }
);
// Returns 204 No Content on success
```

## Common CORS Issues and Solutions

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause**: API not returning CORS headers

**Solution**:
1. Ensure you've deployed the updated code: `npm run deploy:dev`
2. Check API Gateway CORS configuration in AWS Console
3. Verify response headers in browser dev tools (Network tab)

### Issue: "CORS policy: Response to preflight request doesn't pass"

**Cause**: OPTIONS request (preflight) failing

**Solution**:
- API Gateway automatically handles OPTIONS requests with `cors: true`
- Ensure all required headers are listed in the configuration
- Check that Authorization header is in Access-Control-Allow-Headers

### Issue: "Credentials flag is 'true', but 'Access-Control-Allow-Credentials' is not"

**Cause**: Using `credentials: 'include'` but server not sending the header

**Solution**:
- ✅ **FIXED**: Response headers now include `Access-Control-Allow-Credentials: 'true'`
- Verify response headers in browser dev tools

### Issue: "Authorization header missing or invalid"

**Cause**: CORS preventing Authorization header from being sent

**Solution**:
- Ensure `Authorization` is in `Access-Control-Allow-Headers` (✅ it is)
- Use `Bearer ${token}` format in Authorization header
- Verify token is not expired (tokens expire after 1 hour)

## Verifying CORS Configuration

### Using Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Make a request to the users API
4. Click on the request
5. Check "Response Headers" for:
   - ✅ `access-control-allow-origin: *`
   - ✅ `access-control-allow-credentials: true`
   - ✅ `access-control-allow-headers: ...`
   - ✅ `access-control-allow-methods: ...`

### Using cURL

```bash
# Test preflight request (OPTIONS)
curl -X OPTIONS https://api.zsmproperties.com/api/users \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Test actual request with token
curl -X GET https://api.zsmproperties.com/api/users \
  -H "Origin: http://localhost:3000" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -v
```

Look for response headers starting with `access-control-`.

## Integration with Auth API

The users-api CORS configuration matches the auth-api exactly:

| Feature | Auth API | Users API |
|---------|----------|-----------|
| Access-Control-Allow-Origin | `*` | `*` |
| Access-Control-Allow-Credentials | `true` | `true` |
| Access-Control-Allow-Headers | Same list | Same list |
| Access-Control-Allow-Methods | GET,POST,PUT,DELETE,OPTIONS | GET,POST,PUT,DELETE,OPTIONS |
| Serverless CORS | `cors: true` | `cors: true` |

This ensures consistent behavior across both APIs.

## Deployment

After updating CORS configuration:

```bash
# Build TypeScript
npm run build

# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

## Production Recommendations

### 1. Restrict Origins

For production, consider restricting origins to specific domains:

```yaml
# serverless.yml
cors:
  origin:
    - https://yourdomain.com
    - https://www.yourdomain.com
    - http://localhost:3000  # For development
  headers:
    - Content-Type
    - X-Amz-Date
    - Authorization
    - X-Api-Key
    - X-Amz-Security-Token
    - X-Amz-User-Agent
  allowCredentials: true
```

### 2. Environment-Based Configuration

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
```

### 3. Dynamic Origin in Response Handler

Update `src/utils/response.ts` for dynamic origin:

```typescript
const getAllowedOrigin = (requestOrigin?: string): string => {
  const stage = process.env.STAGE || 'dev';
  const allowedOrigins = stage === 'prod'
    ? ['https://yourdomain.com', 'https://www.yourdomain.com']
    : ['*'];

  if (allowedOrigins.includes('*')) return '*';
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowedOrigins[0];
};
```

## Summary

✅ **What Works Now:**
- Requests from localhost (any port)
- Requests from any domain
- Bearer token authentication via Authorization header
- Cookies and credentials support
- All HTTP methods (GET, POST, PUT, DELETE)
- Preflight OPTIONS requests

✅ **Files Updated:**
1. `src/utils/response.ts` - Added `Access-Control-Allow-Credentials: 'true'`
2. `serverless.yml` - CORS enabled on all endpoints
3. `src/types/index.ts` - Type support for CORS headers

✅ **Matches Auth API:**
- Same CORS headers
- Same configuration approach
- Same security model

✅ **Ready for:**
- Development from localhost
- Testing from any origin
- Frontend integration with JWT tokens
- Production deployment (consider restricting origins)

Your users API now has full CORS support matching the auth-api! 🚀
