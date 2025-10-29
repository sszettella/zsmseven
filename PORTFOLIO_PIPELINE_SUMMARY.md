# Portfolio API Pipeline Implementation Summary

## Overview

Successfully created GitHub Actions CI/CD pipelines for deploying the Portfolio API, following the same patterns as the existing auth-api, users-api, and options-trades-api.

## Files Created/Modified

### 1. New Pipeline: deploy-portfolio-api.yml
**Location**: `.github/workflows/deploy-portfolio-api.yml`

**Triggers**:
- Push to `main` branch when `portfolio-api/**` files change
- Manual trigger via `workflow_dispatch`

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install Serverless Framework v3
4. Configure AWS credentials
5. Install npm dependencies
6. Build TypeScript
7. Deploy to AWS (prod stage)
8. Map custom domain to `/portfolios` base path
9. Display deployment info

**Environment Variables**:
- `JWT_SECRET` - From GitHub secrets

**Custom Domain Mapping**:
- Domain: `api.zsmproperties.com`
- Base path: `/portfolios`
- API accessible at: `https://api.zsmproperties.com/portfolios`

### 2. Updated Pipeline: deploy-all-apis.yml
**Location**: `.github/workflows/deploy-all-apis.yml`

**Changes**:
- Added `deploy-portfolio-api` job
- Runs in parallel with `deploy-options-trades-api` and `deploy-users-api`
- Depends on `deploy-auth-api` (auth must deploy first)
- Updated `deploy-summary` to include Portfolio API in needs list
- Added Portfolio API URL to deployment summary output

**Deployment Order**:
```
deploy-auth-api (first)
    ├── deploy-users-api
    ├── deploy-options-trades-api
    └── deploy-portfolio-api
            ↓
    deploy-summary (after all complete)
```

## Pipeline Features

### Automatic Deployment
When changes are pushed to `main` branch in the `portfolio-api/` directory:
- Pipeline automatically triggers
- Builds TypeScript code
- Deploys to AWS Lambda + API Gateway
- Creates/updates DynamoDB tables
- Maps custom domain

### Manual Deployment
Can be triggered manually from GitHub Actions UI:
- Go to Actions → Deploy Portfolio API
- Click "Run workflow"
- Pipeline will execute immediately

### Deploy All APIs
The "Deploy All APIs" workflow can deploy all services at once:
- Go to Actions → Deploy All APIs
- Click "Run workflow"
- Select stage (dev/prod)
- All 4 APIs deploy in parallel (after auth-api)

## API Endpoints After Deployment

### Custom Domain URLs
- Auth API: `https://api.zsmproperties.com/auth`
- Users API: `https://api.zsmproperties.com/users`
- Options Trades API: `https://api.zsmproperties.com/trades`
- **Portfolio API**: `https://api.zsmproperties.com/portfolios` ✨

### Full Portfolio API Endpoints
All accessible under `https://api.zsmproperties.com/portfolios`:
- `GET /` - List portfolios
- `GET /{id}` - Get portfolio
- `POST /` - Create portfolio
- `PUT /{id}` - Update portfolio
- `DELETE /{id}` - Delete portfolio
- `GET /{portfolioId}/positions` - List positions
- `POST /{portfolioId}/positions` - Create position
- `GET /positions/{id}` - Get position
- `PUT /positions/{id}` - Update position
- `DELETE /positions/{id}` - Delete position
- `PATCH /{portfolioId}/positions/prices` - Batch update prices

## Consistency with Existing Pipelines

### Matching Patterns ✅
- Same Node.js version (20)
- Same Serverless Framework version (3)
- Same AWS region (us-east-1)
- Same stage naming (dev/prod)
- Same secret names (JWT_SECRET)
- Same domain mapping approach
- Same error handling (continue-on-error)

### Pipeline Structure ✅
```yaml
name: Deploy Portfolio API
on:
  push:
    branches: [main]
    paths: ['portfolio-api/**']
  workflow_dispatch:

jobs:
  deploy-portfolio-api:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Node
      - Install Serverless
      - Configure AWS
      - Install deps
      - Build TypeScript
      - Deploy to AWS
      - Map custom domain
      - Display info
```

## GitHub Secrets Required

These secrets must be configured in GitHub repository settings:
- `AWS_ACCESS_KEY_ID` - AWS credentials for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS credentials for deployment
- `JWT_SECRET` - Shared secret for JWT token verification

## Testing the Pipeline

### 1. Test Automatic Trigger
```bash
# Make a change to portfolio-api
echo "# Test" >> portfolio-api/README.md

# Commit and push
git add portfolio-api/
git commit -m "Test portfolio API deployment"
git push origin main

# Pipeline will trigger automatically
```

### 2. Test Manual Trigger
1. Go to GitHub Actions
2. Select "Deploy Portfolio API"
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow"

### 3. Test Deploy All
1. Go to GitHub Actions
2. Select "Deploy All APIs"
3. Click "Run workflow"
4. Select stage: `dev` or `prod`
5. Click "Run workflow"

## Deployment Verification

After successful deployment, verify:

### 1. Check CloudFormation Stack
```bash
aws cloudformation describe-stacks \
  --stack-name zsmseven-portfolio-api-prod \
  --region us-east-1
```

### 2. Check API Gateway
```bash
aws apigateway get-rest-apis \
  --query "items[?name=='zsmseven-portfolio-api-prod']" \
  --region us-east-1
```

### 3. Check DynamoDB Tables
```bash
aws dynamodb list-tables \
  --query "TableNames[?contains(@, 'portfolio')]" \
  --region us-east-1
```

### 4. Test API Endpoint
```bash
# Get auth token first
TOKEN=$(curl -X POST https://api.zsmproperties.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.accessToken')

# Test portfolio API
curl -X GET https://api.zsmproperties.com/portfolios \
  -H "Authorization: Bearer $TOKEN"
```

## Rollback Procedure

If deployment fails or needs rollback:

### 1. Via Serverless CLI
```bash
cd portfolio-api
serverless rollback --stage prod
```

### 2. Via AWS Console
1. Go to CloudFormation
2. Find `zsmseven-portfolio-api-prod` stack
3. Select previous working version
4. Click "Rollback"

### 3. Redeploy Previous Version
```bash
git checkout <previous-commit>
git push origin main --force
# Pipeline will redeploy previous version
```

## Monitoring

### Pipeline Execution
- View logs: GitHub → Actions → Select workflow run
- Each step shows detailed logs
- Failed steps highlighted in red
- Duration and status visible

### Application Logs
```bash
# View Lambda logs
serverless logs -f listPortfolios --tail --stage prod
serverless logs -f createPosition --tail --stage prod
```

### CloudWatch Dashboards
- Lambda function metrics
- API Gateway metrics
- DynamoDB table metrics

## Cost Considerations

Same cost structure as other APIs:
- **Lambda**: Pay per request + execution time
- **API Gateway**: Pay per API call
- **DynamoDB**: Pay per request (on-demand billing)
- **CloudWatch**: Log storage and metrics

Estimated cost for low-medium usage: $5-20/month

## Security

### IAM Permissions
Pipeline uses AWS credentials with permissions for:
- Lambda (create, update, invoke)
- API Gateway (create, update, deploy)
- DynamoDB (create, update tables)
- CloudFormation (stack operations)
- IAM (role creation for Lambda)

### Secrets Management
- JWT_SECRET stored in GitHub Secrets
- Not exposed in logs
- Passed securely to Lambda via environment variables

### API Security
- All endpoints require JWT authentication
- CORS configured (origin: *)
- Rate limiting via API Gateway
- User ownership validation in handlers

## Future Enhancements

### Pipeline Improvements
- [ ] Add automated testing before deployment
- [ ] Add smoke tests after deployment
- [ ] Add deployment notifications (Slack/email)
- [ ] Add canary deployments
- [ ] Add blue-green deployment strategy

### Monitoring
- [ ] Add CloudWatch alarms for errors
- [ ] Add custom metrics dashboard
- [ ] Add API performance monitoring
- [ ] Add cost monitoring alerts

## Summary

✅ **Created**: `deploy-portfolio-api.yml` - Individual deployment pipeline
✅ **Updated**: `deploy-all-apis.yml` - Added Portfolio API to unified deployment
✅ **Consistent**: Follows exact same pattern as existing API pipelines
✅ **Custom Domain**: Maps to `https://api.zsmproperties.com/portfolios`
✅ **Parallel Deployment**: Runs alongside other APIs in deploy-all workflow
✅ **Ready**: Pipeline ready to use, just needs GitHub secrets configured

The Portfolio API deployment pipeline is fully implemented and ready for use!
