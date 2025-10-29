# Deployment Checklist

Use this checklist before deploying to ensure everything is configured correctly.

## Pre-Deployment Checklist

### ✅ GitHub Secrets Configuration

Verify all required secrets are set in GitHub repository settings:

- [ ] `AWS_ACCESS_KEY_ID` - AWS access key
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS secret key
- [ ] `JWT_SECRET` - JWT signing secret (MUST match across all APIs!)
- [ ] `JWT_REFRESH_SECRET` - JWT refresh token secret
- [ ] `POLYGON_API_KEY` - For portfolio API (if using)
- [ ] `XAI_API_URL` - For portfolio API (if using)
- [ ] `XAI_API_KEY` - For portfolio API (if using)

**To check:** Go to GitHub → Settings → Secrets and variables → Actions

### ✅ Custom Domain Configuration

Verify custom domain configuration in serverless.yml files:

- [ ] **auth-api/serverless.yml**: basePath = 'auth'
- [ ] **users-api/serverless.yml**: basePath = 'users'
- [ ] **options-trades-api/serverless.yml**: basePath = 'trades'
- [ ] All use domain: `api.zsmproperties.com`

### ✅ Dependencies

Verify dependencies are installed for each API:

```bash
cd auth-api && npm install && cd ..
cd users-api && npm install && cd ..
cd options-trades-api && npm install && cd ..
```

### ✅ TypeScript Compilation

Verify all APIs compile successfully:

```bash
cd auth-api && npm run build && cd ..
cd users-api && npm run build && cd ..
cd options-trades-api && npm run build && cd ..
```

### ✅ JWT Secret Consistency

**CRITICAL:** Verify JWT_SECRET is the same across all APIs:

```bash
# Check auth-api
grep JWT_SECRET auth-api/serverless.yml

# Check users-api
grep JWT_SECRET users-api/serverless.yml

# Check options-trades-api
grep JWT_SECRET options-trades-api/serverless.yml

# They should all reference: ${env:JWT_SECRET, 'same-default-value'}
```

## Deployment Order

### First Time Deployment (Clean Environment)

Deploy in this order:

1. [ ] **Auth API** (creates Users table)
   ```bash
   cd auth-api
   serverless create_domain --stage dev
   serverless deploy --stage dev
   ```

2. [ ] **Users API** (depends on Users table)
   ```bash
   cd users-api
   serverless create_domain --stage dev
   serverless deploy --stage dev
   ```

3. [ ] **Options Trades API** (depends on Users table)
   ```bash
   cd options-trades-api
   serverless create_domain --stage dev
   serverless deploy --stage dev
   ```

### Subsequent Deployments

After initial deployment, you can:

- Deploy any API independently
- Use GitHub Actions workflows
- Deploy all at once with "Deploy All APIs" workflow

## Post-Deployment Verification

### ✅ Check Custom Domain Mappings

```bash
# List base path mappings for the domain
aws apigateway get-base-path-mappings \
  --domain-name api.zsmproperties.com \
  --region us-east-1
```

Expected output should show:
- `/auth` → Auth API
- `/users` → Users API
- `/trades` → Options Trades API

### ✅ Test Each API Endpoint

#### 1. Test Auth API

```bash
# Test login endpoint
curl -X POST https://api.zsmproperties.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'

# Save the token from response
export TOKEN="paste-token-here"
```

Expected: 200 OK with token in response

#### 2. Test Users API

```bash
# Test list users (admin only)
curl https://api.zsmproperties.com/users/ \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 200 OK with user list (if admin) or 403 Forbidden (if regular user)

#### 3. Test Options Trades API

```bash
# Test list trades
curl https://api.zsmproperties.com/trades/ \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 200 OK with trades array (empty if no trades)

```bash
# Test create trade
curl -X POST https://api.zsmproperties.com/trades/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "symbol": "AAPL",
    "optionType": "call",
    "strikePrice": 150.00,
    "expirationDate": "2024-03-15",
    "openAction": "buy_to_open",
    "openQuantity": 1,
    "openPremium": 3.50,
    "openCommission": 0.65,
    "openTradeDate": "2024-01-15",
    "notes": "Test trade"
  }'
```

Expected: 201 Created with trade object

### ✅ Test CORS

```bash
# Test OPTIONS request (preflight)
curl -X OPTIONS https://api.zsmproperties.com/trades/ \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

Expected headers in response:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type,Authorization,...`

### ✅ Check CloudWatch Logs

Verify Lambda functions are logging correctly:

```bash
# Auth API logs
serverless logs -f login --stage dev --tail

# Users API logs
serverless logs -f listUsers --stage dev --tail

# Options Trades API logs
serverless logs -f listTrades --stage dev --tail
```

### ✅ Check DynamoDB Tables

Verify all tables are created:

```bash
# List tables
aws dynamodb list-tables --region us-east-1 | grep -E "(users|trades|blacklist)"
```

Expected tables:
- `users-dev` (created by auth-api)
- `token-blacklist-dev` (created by auth-api)
- `options-trades-dev` (created by options-trades-api)

## GitHub Actions Verification

### ✅ Check Workflow Files

- [ ] `.github/workflows/deploy-auth-api.yml` exists
- [ ] `.github/workflows/deploy-users-api.yml` exists
- [ ] `.github/workflows/deploy-options-trades-api.yml` exists
- [ ] `.github/workflows/deploy-all-apis.yml` exists
- [ ] All workflows have `serverless create_domain` with `|| true` or similar

### ✅ Test Workflow Trigger

1. Make a small change to trigger workflow:
   ```bash
   echo "# Test" >> options-trades-api/README.md
   git add options-trades-api/README.md
   git commit -m "Test workflow trigger"
   git push origin main
   ```

2. Check GitHub Actions tab:
   - [ ] "Deploy Options Trades API" workflow triggered
   - [ ] Workflow completes successfully
   - [ ] API is deployed and accessible

## Rollback Plan

If deployment fails:

### Option 1: Rollback via Serverless

```bash
# List deployments
serverless deploy list --stage dev

# Rollback to previous deployment
serverless rollback --timestamp TIMESTAMP --stage dev
```

### Option 2: Remove and Redeploy

```bash
# Remove failed deployment
serverless remove --stage dev

# Redeploy from scratch
serverless deploy --stage dev
```

### Option 3: Revert Git Changes

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Triggers automatic redeployment
```

## Common Issues

### Issue: Domain Mapping Already Exists

**Symptom:** `serverless create_domain` fails with error
**Solution:** This is expected! The `|| true` in workflows handles this. Continue with deployment.

### Issue: JWT Token Invalid

**Symptom:** Getting 401 Unauthorized errors
**Solution:**
1. Verify JWT_SECRET matches across all APIs
2. Get a fresh token from auth API
3. Check token expiration (default 1 hour)

### Issue: CORS Errors

**Symptom:** Browser shows CORS errors
**Solution:**
1. Wait 2-3 minutes for CloudFront/API Gateway propagation
2. Clear browser cache
3. Verify OPTIONS endpoint returns correct headers
4. Check custom domain mapping exists

### Issue: Users Table Not Found

**Symptom:** Users or Trades API can't find users table
**Solution:**
1. Ensure auth-api was deployed first
2. Check table name matches: `users-{stage}`
3. Verify IAM permissions allow reading from table

## Production Deployment

When ready for production:

1. [ ] Update GitHub secrets for production values
2. [ ] Test in dev environment first
3. [ ] Use "Deploy All APIs" workflow with `prod` stage
4. [ ] Verify all endpoints work with production domain
5. [ ] Monitor CloudWatch logs for errors
6. [ ] Update frontend to use production endpoints
7. [ ] Test complete user flow end-to-end

## Monitoring After Deployment

Set up monitoring:

- [ ] CloudWatch alarms for Lambda errors
- [ ] CloudWatch alarms for API Gateway 5XX errors
- [ ] DynamoDB capacity monitoring
- [ ] Custom dashboard for key metrics

## Success Criteria

Deployment is successful when:

- [ ] All three APIs deployed without errors
- [ ] Custom domain mappings created for all base paths
- [ ] All endpoints return expected responses
- [ ] CORS works from frontend
- [ ] JWT authentication works across APIs
- [ ] DynamoDB tables created and accessible
- [ ] CloudWatch logs show no errors
- [ ] GitHub Actions workflows run successfully

## Next Steps After Deployment

1. [ ] Update frontend API configuration
2. [ ] Test complete user flows
3. [ ] Monitor logs for first 24 hours
4. [ ] Document any issues encountered
5. [ ] Update team on new endpoints
6. [ ] Archive this checklist for future deployments
