# Authentication API Deployment Guide

## Custom Domain Configuration

The authentication API is configured to be published at:
**`https://api.zsmproperties.com/api/auth/*`**

This matches your existing Python Lambda API setup and provides a unified API domain.

## Endpoint URLs

All endpoints are accessible via the custom domain:

- POST `https://api.zsmproperties.com/api/auth/register`
- POST `https://api.zsmproperties.com/api/auth/login`
- POST `https://api.zsmproperties.com/api/auth/logout`
- GET  `https://api.zsmproperties.com/api/auth/me`
- POST `https://api.zsmproperties.com/api/auth/refresh`

## Prerequisites

### 1. AWS Credentials

Configure AWS credentials with permissions for:
- API Gateway
- Lambda
- DynamoDB
- Route53
- ACM (Certificate Manager)
- CloudFormation

```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### 2. GitHub Secrets (For Automated Deployment)

Add these secrets to your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `JWT_SECRET` (generate with `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` (generate with `openssl rand -base64 32`)

## Manual Deployment Steps

### Step 1: Install Dependencies

```bash
cd auth-api
npm install
```

### Step 2: Build TypeScript

```bash
npm run build
```

### Step 3: Create Custom Domain (First Time Only)

This step creates the API Gateway custom domain and Route53 DNS record:

```bash
# For production
serverless create_domain --stage prod

# For development
serverless create_domain --stage dev
```

**Note**: Domain creation can take 20-40 minutes as it provisions:
- ACM SSL certificate (if needed)
- API Gateway custom domain
- Route53 DNS record
- CloudFront distribution

### Step 4: Deploy the API

```bash
# Deploy to production
npm run deploy:prod

# Or deploy to development
npm run deploy:dev
```

### Step 5: Verify Deployment

```bash
# Get deployment info
serverless info --stage prod
```

## Automated Deployment (GitHub Actions)

The workflow at `.github/workflows/deploy-auth-api.yml` automatically deploys when:
- You push changes to the `main` branch
- Changes are in the `auth-api/` directory

The workflow will:
1. Check out code
2. Set up Node.js 20
3. Install dependencies
4. Build TypeScript
5. Create custom domain (if needed)
6. Deploy to production
7. Display deployment info

## Testing the Deployment

### Test Registration

```bash
curl -X POST https://api.zsmproperties.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "name": "Test User"
  }'
```

### Test Login

```bash
curl -X POST https://api.zsmproperties.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

### Test Get User (requires token from login)

```bash
curl -X GET https://api.zsmproperties.com/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

### Custom Domain Creation Fails

If `serverless create_domain` fails:

1. **Check Route53**: Ensure `zsmproperties.com` hosted zone exists
2. **Check ACM**: Verify SSL certificate exists or can be created
3. **Check Permissions**: Ensure AWS credentials have Route53 and ACM permissions
4. **Wait and Retry**: Sometimes AWS propagation takes time

```bash
# Delete and recreate
serverless delete_domain --stage prod
serverless create_domain --stage prod
```

### Deployment Fails

1. **AWS Credentials**: Verify with `aws sts get-caller-identity`
2. **Build Errors**: Run `npm run build` separately to check for TypeScript errors
3. **Environment Variables**: Ensure JWT secrets are set

### Domain Not Resolving

1. **Check DNS**: `dig api.zsmproperties.com`
2. **Check Route53**: Verify A/AAAA record exists
3. **Wait**: DNS propagation can take up to 48 hours (usually 5-10 minutes)

### 403/404 Errors

1. **Check basePath**: Ensure you're using `/api/auth/*` not `/auth/*`
2. **Check CORS**: Verify CORS is enabled in serverless.yml
3. **Check Stage**: Ensure you're hitting the right stage (dev/prod)

## Configuration Details

### serverless.yml Custom Domain Config

```yaml
custom:
  customDomain:
    domainName: api.zsmproperties.com
    basePath: 'api'
    stage: ${self:provider.stage}
    createRoute53Record: true
    endpointType: REGIONAL
```

### Path Mapping

- serverless.yml path: `auth/login`
- Custom domain basePath: `api`
- Final URL: `https://api.zsmproperties.com/api/auth/login`

## Removing the Deployment

### Remove API Deployment

```bash
serverless remove --stage prod
```

### Remove Custom Domain

```bash
serverless delete_domain --stage prod
```

**Warning**: This will delete the API Gateway custom domain and Route53 record.

## Monitoring and Logs

### View Lambda Logs

```bash
serverless logs -f login --stage prod --tail
```

### CloudWatch Logs

Logs are available in AWS CloudWatch under:
- Log Group: `/aws/lambda/zsmseven-auth-api-prod-login`
- Log Group: `/aws/lambda/zsmseven-auth-api-prod-register`
- etc.

### DynamoDB Tables

- Users: `users-prod`
- Token Blacklist: `token-blacklist-prod`

## Cost Considerations

### AWS Services Used

- **Lambda**: Pay per invocation ($0.20 per 1M requests)
- **API Gateway**: Pay per request ($3.50 per 1M requests)
- **DynamoDB**: On-demand billing (pay per read/write)
- **Route53**: $0.50/month per hosted zone
- **ACM**: SSL certificates are FREE

### Estimated Monthly Cost (low traffic)

- Lambda: ~$0.00-$1.00
- API Gateway: ~$0.00-$5.00
- DynamoDB: ~$0.00-$2.00
- Route53: $0.50
- **Total**: ~$0.50-$8.50/month for low traffic

## Next Steps

1. ✅ Configure AWS credentials
2. ✅ Set GitHub secrets for automated deployment
3. ⬜ Run `serverless create_domain --stage prod`
4. ⬜ Run `npm run deploy:prod`
5. ⬜ Test endpoints
6. ⬜ Update frontend to use `https://api.zsmproperties.com/api/auth`

## Support

For issues:
- Check logs: `serverless logs -f login --stage prod --tail`
- Check AWS Console: Lambda, API Gateway, DynamoDB
- Review serverless.yml configuration
- Verify GitHub Actions workflow output
