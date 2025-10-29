# GitHub Actions Workflows

This directory contains automated deployment workflows for all ZSM Seven APIs.

## Workflows

### Individual API Deployments

Each API has its own workflow that triggers on changes to its directory:

#### 1. Deploy Auth API (`deploy-auth-api.yml`)
- **Triggers**: Push to `main` branch with changes in `auth-api/**`
- **Manual**: Can be triggered via workflow_dispatch
- **Deploys to**: `https://api.zsmproperties.com/auth`
- **Stage**: Production

#### 2. Deploy Users API (`deploy-users-api.yml`)
- **Triggers**: Push to `main` branch with changes in `users-api/**`
- **Manual**: Can be triggered via workflow_dispatch
- **Deploys to**: `https://api.zsmproperties.com/users`
- **Stage**: Production

#### 3. Deploy Options Trades API (`deploy-options-trades-api.yml`)
- **Triggers**: Push to `main` branch with changes in `options-trades-api/**`
- **Manual**: Can be triggered via workflow_dispatch
- **Deploys to**: `https://api.zsmproperties.com/trades`
- **Stage**: Production

#### 4. Deploy Lambda (Portfolio Tracker) (`deploy-lambda.yml`)
- **Triggers**: Push to `main` branch with changes in `api/**`
- **Manual**: Can be triggered via workflow_dispatch
- **Python-based API** for portfolio tracking

### Deploy All APIs (`deploy-all-apis.yml`)

A master workflow that deploys all TypeScript APIs in the correct order:

- **Triggers**: Manual only (workflow_dispatch)
- **Stage Selection**: Choose `dev` or `prod` when triggering
- **Deployment Order**:
  1. Auth API (must be first - creates Users table)
  2. Users API (parallel with Options Trades API)
  3. Options Trades API (parallel with Users API)

## Custom Domain Handling

All workflows use this pattern to handle custom domain mappings:

```bash
serverless create_domain --stage prod || echo "Domain mapping already exists or creation not needed"
```

This ensures:
- ✅ First deployment creates the domain mapping
- ✅ Subsequent deployments don't fail if mapping exists
- ✅ Shared domain `api.zsmproperties.com` works with multiple base paths

### Base Path Mappings

| API | Base Path | Full URL |
|-----|-----------|----------|
| Auth API | `/auth` | `https://api.zsmproperties.com/auth/*` |
| Users API | `/users` | `https://api.zsmproperties.com/users/*` |
| Options Trades API | `/trades` | `https://api.zsmproperties.com/trades/*` |

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### AWS Credentials
- `AWS_ACCESS_KEY_ID` - AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for deployment

### API Secrets
- `JWT_SECRET` - JWT signing secret (must match across all APIs)
- `JWT_REFRESH_SECRET` - JWT refresh token secret

### Portfolio API Secrets (for deploy-lambda.yml)
- `POLYGON_API_KEY` - Polygon.io API key
- `XAI_API_URL` - XAI API URL
- `XAI_API_KEY` - XAI API key

## Manual Deployment

### Deploy Individual API

Go to Actions tab → Select workflow → Click "Run workflow"

Example: Deploy Auth API
1. Go to GitHub Actions
2. Select "Deploy Auth API"
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow"

### Deploy All APIs

1. Go to GitHub Actions
2. Select "Deploy All APIs"
3. Click "Run workflow"
4. Select stage (`dev` or `prod`)
5. Click "Run workflow"

This will deploy all three TypeScript APIs in parallel (after Auth API completes).

## Automatic Deployment

Push changes to `main` branch:

```bash
# Example: Update Auth API
git add auth-api/
git commit -m "Update auth API"
git push origin main

# Automatically triggers deploy-auth-api workflow
```

Only the changed API will be deployed:
- Changes in `auth-api/` → Deploys Auth API only
- Changes in `users-api/` → Deploys Users API only
- Changes in `options-trades-api/` → Deploys Options Trades API only
- Changes in `api/` → Deploys Portfolio Lambda only

## Workflow Steps

Each TypeScript API workflow follows these steps:

1. **Checkout code** - Clone repository
2. **Setup Node.js 20** - Install Node.js runtime
3. **Install Serverless Framework** - Install deployment tool
4. **Configure AWS credentials** - Authenticate with AWS
5. **Install dependencies** - Run `npm install`
6. **Build TypeScript** - Compile to JavaScript
7. **Create custom domain mapping** - Setup base path (skips if exists)
8. **Deploy API** - Deploy Lambda functions and API Gateway
9. **Display deployment info** - Show endpoint URLs

## Troubleshooting

### Domain Mapping Already Exists

If you see:
```
Domain mapping already exists or creation not needed
```

This is normal! The domain `api.zsmproperties.com` is shared across all APIs with different base paths. The workflow continues normally.

### Deployment Failure

1. Check GitHub Actions logs for specific error
2. Verify all required secrets are configured
3. Check AWS CloudFormation console for stack status
4. Ensure JWT_SECRET matches across all APIs

### CORS Issues After Deployment

If you encounter CORS issues:
1. Wait 2-3 minutes for CloudFront/API Gateway to propagate
2. Clear browser cache
3. Verify custom domain mapping exists in API Gateway console
4. Check that all response headers include CORS headers

### TypeScript Build Failures

If build fails:
```
npm run build
```

Check for:
- TypeScript errors in code
- Missing dependencies
- Invalid tsconfig.json

## Deployment Dependencies

**Important**: Auth API must be deployed first!

- **Auth API** creates the Users DynamoDB table
- **Users API** reads from the Users table (created by Auth API)
- **Options Trades API** reads from the Users table for JWT validation

The "Deploy All APIs" workflow handles this dependency automatically.

## Testing Deployments

After deployment, test each API:

```bash
# Test Auth API
curl https://api.zsmproperties.com/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test Users API (with token)
curl https://api.zsmproperties.com/users/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Options Trades API (with token)
curl https://api.zsmproperties.com/trades/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Local Testing Before Deployment

Test locally before pushing:

```bash
# Install dependencies
cd auth-api && npm install && cd ..
cd users-api && npm install && cd ..
cd options-trades-api && npm install && cd ..

# Build TypeScript
cd auth-api && npm run build && cd ..
cd users-api && npm run build && cd ..
cd options-trades-api && npm run build && cd ..

# Test with serverless offline (if needed)
cd auth-api && npx serverless offline
```

## Monitoring Deployments

### GitHub Actions UI

- View workflow runs in the Actions tab
- Each step shows logs and timing
- Failed steps are highlighted in red

### AWS Console

- **Lambda**: Check function deployment and versions
- **API Gateway**: Verify custom domain mappings and base paths
- **CloudFormation**: View stack status and resources
- **CloudWatch**: Monitor logs and metrics

## Cost Optimization

The workflows are optimized for cost:
- Uses GitHub-hosted runners (free for public repos)
- Deploys only changed APIs
- Uses AWS Free Tier resources where possible
- On-demand DynamoDB billing

## Adding New APIs

To add a new API to the deployment pipeline:

1. Create workflow file: `.github/workflows/deploy-new-api.yml`
2. Copy structure from existing API workflow
3. Update paths, directory names, and base path
4. Add to `deploy-all-apis.yml` if needed
5. Configure custom domain in serverless.yml
6. Commit and push to trigger deployment

Example:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'new-api/**'
```
