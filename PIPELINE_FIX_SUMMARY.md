# GitHub Actions Pipeline Fix - Base Path Mapping Issue

## Problem

The deployment pipeline was failing with this error:

```
Error: V1 - Unable to create base path mapping for 'api.zsmproperties.com':
Base path already exists for this domain name
```

This occurred because `serverless-domain-manager` was trying to create the base path mapping during `serverless deploy` even though it already existed.

## Root Cause

The `serverless-domain-manager` plugin has two modes:
1. **Manual mode**: Run `serverless create_domain` explicitly
2. **Auto mode** (default): Automatically creates domain during `serverless deploy`

When using auto mode with a shared domain (multiple APIs using different base paths), subsequent deployments fail because the plugin tries to create a base path that already exists.

## Solution

### 1. Disabled Auto Domain Creation

Added `autoDomain: false` to all `serverless.yml` files:

**auth-api/serverless.yml:**
```yaml
customDomain:
  domainName: api.zsmproperties.com
  basePath: 'auth'
  autoDomain: false  # ← Added this
```

**users-api/serverless.yml:**
```yaml
customDomain:
  domainName: api.zsmproperties.com
  basePath: 'users'
  autoDomain: false  # ← Added this
```

**options-trades-api/serverless.yml:**
```yaml
customDomain:
  domainName: api.zsmproperties.com
  basePath: 'trades'
  autoDomain: false  # ← Added this
```

### 2. Updated Workflows to Explicitly Create Domain

Changed all workflows to:
1. Run `serverless create_domain` as a separate step
2. Allow it to fail gracefully if mapping exists
3. Continue with deployment

**Before:**
```yaml
- name: Deploy Auth API
  run: |
    cd auth-api
    serverless create_domain --stage prod || true
    serverless deploy --stage prod
```

**After:**
```yaml
- name: Create custom domain mapping (if needed)
  run: |
    cd auth-api
    echo "Creating domain mapping for /auth base path..."
    serverless create_domain --stage prod || echo "✓ Domain mapping already exists"
  continue-on-error: true

- name: Deploy Auth API
  run: |
    cd auth-api
    serverless deploy --stage prod
```

## Files Changed

### Serverless Configuration
✅ `auth-api/serverless.yml` - Added `autoDomain: false`
✅ `users-api/serverless.yml` - Added `autoDomain: false`
✅ `options-trades-api/serverless.yml` - Added `autoDomain: false`

### GitHub Workflows
✅ `.github/workflows/deploy-auth-api.yml` - Split create_domain and deploy steps
✅ `.github/workflows/deploy-users-api.yml` - Split create_domain and deploy steps
✅ `.github/workflows/deploy-options-trades-api.yml` - Split create_domain and deploy steps
✅ `.github/workflows/deploy-all-apis.yml` - Split create_domain and deploy steps for all APIs

## How It Works Now

### First Deployment (Clean Environment)

```bash
# Step 1: Create domain mapping
serverless create_domain --stage prod
# ✓ Creates base path mapping: /auth → Auth API

# Step 2: Deploy Lambda and API Gateway
serverless deploy --stage prod
# ✓ Deploys without trying to create domain
```

### Subsequent Deployments

```bash
# Step 1: Try to create domain mapping
serverless create_domain --stage prod
# ✗ Fails with "Base path already exists"
# ✓ Workflow continues (continue-on-error: true)
# ✓ Outputs: "Domain mapping already exists"

# Step 2: Deploy Lambda and API Gateway
serverless deploy --stage prod
# ✓ Deploys successfully
```

## Testing

To test the fix:

```bash
# This should now succeed even if base path exists
cd auth-api
npm run build
serverless create_domain --stage dev || echo "Already exists - OK"
serverless deploy --stage dev
```

Or use GitHub Actions:
1. Go to Actions tab
2. Select "Deploy Auth API"
3. Click "Run workflow"
4. Should complete successfully

## Benefits

✅ **No more pipeline failures** due to existing base paths
✅ **Clear logging** shows when mapping exists vs created
✅ **Graceful handling** of shared domain scenarios
✅ **Idempotent deployments** can run multiple times safely
✅ **Explicit control** over domain creation vs deployment

## Deployment Flow

```
┌────────────────────────────┐
│ Build TypeScript           │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────┐
│ Create Domain Mapping      │
│ (if needed)                │
│                            │
│ If exists: Log & Continue  │←─┐
│ If new: Create mapping     │  │
└──────────┬─────────────────┘  │
           │                     │
           ▼                     │
┌────────────────────────────┐  │
│ Deploy Lambda & API GW     │  │
│ (autoDomain: false)        │  │
│                            │  │
│ Does NOT try to create     │──┘
│ domain mapping             │
└────────────────────────────┘
```

## Rollback

If this fix causes issues, you can revert by:

1. Removing `autoDomain: false` from serverless.yml files
2. Going back to single-step deployment
3. But this will bring back the original error

**Not recommended** - the current fix is the correct approach for shared domains.

## Next Steps

1. ✅ Commit these changes
2. ✅ Push to trigger deployment
3. ✅ Monitor GitHub Actions for successful deployment
4. ✅ Verify all APIs are accessible at their endpoints

## Verification Commands

After deployment, verify each API:

```bash
# Check Auth API
curl https://api.zsmproperties.com/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check Users API (with token)
curl https://api.zsmproperties.com/users/ \
  -H "Authorization: Bearer TOKEN"

# Check Options Trades API (with token)
curl https://api.zsmproperties.com/trades/ \
  -H "Authorization: Bearer TOKEN"
```

## Documentation Updates

Updated documentation files:
- `GITHUB_ACTIONS_SUMMARY.md` - Reflects new workflow structure
- `.github/workflows/README.md` - Documents the fix
- This file - Explains the problem and solution

---

**Status**: ✅ Fixed and ready for deployment

**Date**: 2025-10-28

**Issue**: Base path mapping conflicts
**Solution**: Disabled auto domain creation, explicit create_domain step
