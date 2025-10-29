# GitHub Actions Pipeline - Summary of Changes

## Overview

Updated and created GitHub Actions workflows to automatically deploy all APIs with proper custom domain handling and prevent failures when base paths already exist.

## ✅ Changes Made

### 1. Updated Existing Workflows

#### Auth API Workflow (`deploy-auth-api.yml`)
- ✅ Improved custom domain creation step with better error messaging
- ✅ Uses `|| echo` to prevent pipeline failure if domain exists
- ✅ Maintains production deployment on push to main

### 2. Created New Workflows

#### Users API Workflow (`deploy-users-api.yml`)
- ✅ Automatic deployment on changes to `users-api/**`
- ✅ Manual deployment via workflow_dispatch
- ✅ Custom domain mapping to `/users` base path
- ✅ Handles existing domain mappings gracefully

#### Options Trades API Workflow (`deploy-options-trades-api.yml`)
- ✅ Automatic deployment on changes to `options-trades-api/**`
- ✅ Manual deployment via workflow_dispatch
- ✅ Custom domain mapping to `/trades` base path
- ✅ Handles existing domain mappings gracefully

#### Deploy All APIs Workflow (`deploy-all-apis.yml`)
- ✅ Manual-only deployment workflow
- ✅ Stage selection (dev or prod)
- ✅ Deploys all three APIs in correct order:
  1. Auth API (creates Users table)
  2. Users API + Options Trades API (parallel)
- ✅ Deployment summary with endpoint URLs

### 3. Custom Domain Configuration

Updated all API serverless.yml files:

**Auth API** (`auth-api/serverless.yml`)
```yaml
customDomain:
  domainName: api.zsmproperties.com
  basePath: 'auth'
```

**Users API** (`users-api/serverless.yml`)
```yaml
customDomain:
  domainName: api.zsmproperties.com
  basePath: 'users'
```

**Options Trades API** (`options-trades-api/serverless.yml`)
```yaml
customDomain:
  domainName: api.zsmproperties.com
  basePath: 'trades'
```

## 🔧 Key Features

### Smart Domain Mapping

All workflows use this pattern:
```bash
serverless create_domain --stage prod || echo "Domain mapping already exists or creation not needed"
```

**Benefits:**
- ✅ First deployment creates the domain mapping
- ✅ Subsequent deployments don't fail
- ✅ Shared domain with multiple base paths works correctly
- ✅ Clear log messages indicate what happened

### Automatic vs Manual Deployment

**Automatic (on push to main):**
- Push to `auth-api/` → Deploys Auth API only
- Push to `users-api/` → Deploys Users API only
- Push to `options-trades-api/` → Deploys Options Trades API only
- Push to `api/` → Deploys Portfolio Lambda only

**Manual (workflow_dispatch):**
- Any individual API can be deployed manually
- "Deploy All APIs" deploys everything with stage selection

### Dependency Management

The "Deploy All APIs" workflow handles dependencies:
1. Auth API deploys first (creates Users table)
2. Users API and Options Trades API deploy in parallel
3. Both depend on Users table existing

## 📋 Workflow Files

| File | Purpose | Trigger |
|------|---------|---------|
| `deploy-auth-api.yml` | Deploy Auth API | Push to `auth-api/**` or manual |
| `deploy-users-api.yml` | Deploy Users API | Push to `users-api/**` or manual |
| `deploy-options-trades-api.yml` | Deploy Options Trades API | Push to `options-trades-api/**` or manual |
| `deploy-all-apis.yml` | Deploy all APIs | Manual only |
| `deploy-lambda.yml` | Deploy Portfolio API | Push to `api/**` or manual |

## 🚀 How to Use

### Deploy Individual API

**Option 1: Push Changes**
```bash
git add auth-api/
git commit -m "Update auth API"
git push origin main
# Automatically deploys Auth API
```

**Option 2: Manual Trigger**
1. Go to GitHub Actions
2. Select the workflow (e.g., "Deploy Auth API")
3. Click "Run workflow"
4. Click "Run workflow" again

### Deploy All APIs

1. Go to GitHub Actions
2. Select "Deploy All APIs"
3. Click "Run workflow"
4. Choose stage: `dev` or `prod`
5. Click "Run workflow"

## 🔐 Required Secrets

Ensure these are configured in GitHub repository settings:

### AWS
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### API Configuration
- `JWT_SECRET` (must match across all APIs)
- `JWT_REFRESH_SECRET`

### Portfolio API (for deploy-lambda.yml)
- `POLYGON_API_KEY`
- `XAI_API_URL`
- `XAI_API_KEY`

## 🌐 Deployed Endpoints

After deployment, APIs are available at:

| API | Endpoint |
|-----|----------|
| Auth | `https://api.zsmproperties.com/auth/*` |
| Users | `https://api.zsmproperties.com/users/*` |
| Trades | `https://api.zsmproperties.com/trades/*` |

## ✅ Testing Deployments

```bash
# Test Auth API
curl https://api.zsmproperties.com/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Save token from response
export TOKEN="your-token-here"

# Test Users API
curl https://api.zsmproperties.com/users/ \
  -H "Authorization: Bearer $TOKEN"

# Test Trades API
curl https://api.zsmproperties.com/trades/ \
  -H "Authorization: Bearer $TOKEN"
```

## 🐛 Troubleshooting

### "Domain mapping already exists"
This is normal and expected! The message means the base path mapping for that API already exists on the shared domain. The workflow continues normally.

### Deployment Fails
1. Check GitHub Actions logs
2. Verify all secrets are configured
3. Check AWS CloudFormation console
4. Ensure JWT_SECRET matches across all APIs

### CORS Issues
1. Wait 2-3 minutes for changes to propagate
2. Clear browser cache
3. Verify custom domain mapping in API Gateway console

## 📚 Documentation

Created comprehensive documentation:
- `.github/workflows/README.md` - Detailed workflow documentation
- `CUSTOM_DOMAIN_DEPLOYMENT.md` - Manual deployment guide
- This file - Quick reference for changes

## 🎯 Next Steps

1. **Test the workflows:**
   ```bash
   # Make a small change to test
   echo "# Test" >> options-trades-api/README.md
   git add .
   git commit -m "Test workflow"
   git push origin main
   ```

2. **Verify deployment:**
   - Check GitHub Actions tab
   - Confirm workflow runs successfully
   - Test the API endpoint

3. **Update frontend:**
   - Update API base URLs to use new endpoints
   - Test CORS functionality
   - Verify authentication flow

## 💡 Benefits

✅ Automatic deployments on code changes
✅ Manual deployment control when needed
✅ No pipeline failures from existing domain mappings
✅ Proper dependency ordering (Auth → Users/Trades)
✅ Stage selection for dev/prod deployments
✅ Clear deployment logs and summaries
✅ Shared domain with multiple base paths
✅ CORS configured correctly for all APIs
