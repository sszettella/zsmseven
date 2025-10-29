# Custom Domain API Deployment Instructions

All APIs are now configured to use `api.zsmproperties.com` with the following base paths:

- **Auth API**: `/auth`
- **Users API**: `/users`
- **Options Trades API**: `/trades`

## Prerequisites

Ensure you have:
- AWS CLI configured with proper credentials
- JWT_SECRET environment variable set
- serverless-domain-manager plugin installed in each API

## Deployment Steps

### 1. Deploy Auth API

```bash
cd auth-api

# Create custom domain mapping (if not already created)
npx serverless create_domain --stage dev

# Build and deploy
npm run build
npx serverless deploy --stage dev
```

**Endpoints will be:**
- POST `https://api.zsmproperties.com/auth/login`
- POST `https://api.zsmproperties.com/auth/register`
- POST `https://api.zsmproperties.com/auth/refresh`
- GET `https://api.zsmproperties.com/auth/me`
- POST `https://api.zsmproperties.com/auth/logout`

### 2. Deploy Users API

```bash
cd ../users-api

# Create custom domain mapping (if not already created)
npx serverless create_domain --stage dev

# Build and deploy
npm run build
npx serverless deploy --stage dev
```

**Endpoints will be:**
- GET `https://api.zsmproperties.com/users/`
- GET `https://api.zsmproperties.com/users/{id}`
- POST `https://api.zsmproperties.com/users/`
- PUT `https://api.zsmproperties.com/users/{id}`
- DELETE `https://api.zsmproperties.com/users/{id}`

### 3. Deploy Options Trades API

```bash
cd ../options-trades-api

# Create custom domain mapping (if not already created)
npx serverless create_domain --stage dev

# Build and deploy
npm run build
npx serverless deploy --stage dev
```

**Endpoints will be:**
- GET `https://api.zsmproperties.com/trades/`
- GET `https://api.zsmproperties.com/trades/open`
- GET `https://api.zsmproperties.com/trades/{id}`
- POST `https://api.zsmproperties.com/trades/`
- PUT `https://api.zsmproperties.com/trades/{id}/close`
- PUT `https://api.zsmproperties.com/trades/{id}`
- DELETE `https://api.zsmproperties.com/trades/{id}`

## CORS Configuration

All APIs are configured with:
- Origin: `*` (allows all origins)
- Headers: `Content-Type`, `Authorization`
- Methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- Credentials: `false`

The serverless framework will automatically create OPTIONS endpoints for CORS preflight requests.

## Troubleshooting

### Domain Already Exists Error

If you get an error that the domain already exists:
```bash
npx serverless create_domain --stage dev
# Error: Domain already exists

# This is normal - the domain is shared across all APIs
# Just proceed with deployment
npx serverless deploy --stage dev
```

### CORS Issues

If you encounter CORS errors:
1. Verify the API is deployed: `npx serverless info --stage dev`
2. Check the custom domain mapping: Look for "customDomain" in the output
3. Wait 2-3 minutes for CloudFront/API Gateway changes to propagate
4. Clear browser cache and retry

### Testing Custom Domain

```bash
# Test auth API
curl https://api.zsmproperties.com/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test users API (with token)
curl https://api.zsmproperties.com/users/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test trades API (with token)
curl https://api.zsmproperties.com/trades/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Base Path Configuration

Each API uses a different base path on the same domain:

```yaml
customDomain:
  domainName: api.zsmproperties.com
  basePath: 'auth'    # or 'users' or 'trades'
  stage: dev
  createRoute53Record: true
  endpointType: REGIONAL
```

This configuration is in each API's `serverless.yml` file.

## Updating Frontend Configuration

Update your frontend to use these endpoints:

```javascript
const API_BASE_URL = 'https://api.zsmproperties.com';

const endpoints = {
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    refresh: `${API_BASE_URL}/auth/refresh`,
    me: `${API_BASE_URL}/auth/me`,
    logout: `${API_BASE_URL}/auth/logout`,
  },
  users: {
    list: `${API_BASE_URL}/users/`,
    get: (id) => `${API_BASE_URL}/users/${id}`,
    create: `${API_BASE_URL}/users/`,
    update: (id) => `${API_BASE_URL}/users/${id}`,
    delete: (id) => `${API_BASE_URL}/users/${id}`,
  },
  trades: {
    list: `${API_BASE_URL}/trades/`,
    listOpen: `${API_BASE_URL}/trades/open`,
    get: (id) => `${API_BASE_URL}/trades/${id}`,
    create: `${API_BASE_URL}/trades/`,
    close: (id) => `${API_BASE_URL}/trades/${id}/close`,
    update: (id) => `${API_BASE_URL}/trades/${id}`,
    delete: (id) => `${API_BASE_URL}/trades/${id}`,
  },
};
```

## Production Deployment

To deploy to production:

```bash
# Set production JWT secret
export JWT_SECRET="your-production-secret"

# Deploy each API
cd auth-api && npx serverless create_domain --stage prod && npx serverless deploy --stage prod
cd ../users-api && npx serverless create_domain --stage prod && npx serverless deploy --stage prod
cd ../options-trades-api && npx serverless create_domain --stage prod && npx serverless deploy --stage prod
```

Production endpoints will use the same domain with prod stage.
