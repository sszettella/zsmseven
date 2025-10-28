# Users API Deployment Guide

## Prerequisites

1. **auth-api must be deployed first** - The users-api depends on the DynamoDB users table created by auth-api
2. AWS CLI configured with appropriate credentials
3. Node.js 20.x installed
4. Serverless Framework installed globally: `npm install -g serverless`

## Initial Setup

### 1. Install Dependencies

```bash
cd users-api
npm install
```

### 2. Configure Environment Variables (Optional)

The service uses the same JWT secrets as auth-api. These are configured in serverless.yml with defaults that match auth-api.

If you want to override them:

```bash
cp .env.example .env
# Edit .env with your JWT secrets (must match auth-api)
```

**Important**: JWT_SECRET and JWT_REFRESH_SECRET must match the values used in auth-api, otherwise token validation will fail.

### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Deployment

### Deploy to Development

```bash
npm run deploy:dev
```

This will:
1. Build the TypeScript code
2. Deploy to AWS Lambda via Serverless Framework
3. Create API Gateway endpoints
4. Configure IAM roles for DynamoDB access
5. Output the API endpoint URLs

### Deploy to Production

```bash
npm run deploy:prod
```

## Verification

After deployment, test the API:

### 1. Get an Auth Token

First, login via auth-api to get a valid JWT token:

```bash
curl -X POST https://api.zsmproperties.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'
```

### 2. Test List Users (Admin Only)

```bash
curl https://api.zsmproperties.com/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Test Get User by ID

```bash
curl https://api.zsmproperties.com/api/users/USER_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## API Gateway Integration

The users-api deploys separate from auth-api. If you need both APIs under the same domain (e.g., `api.zsmproperties.com/api/*`), you'll need to configure:

1. **API Gateway Custom Domain** - Configure a custom domain name
2. **Base Path Mapping** - Map `/auth/*` to auth-api and `/users/*` to users-api

Or use a single API Gateway with both services as different routes.

## Troubleshooting

### Issue: "Authorization token is required" errors

**Cause**: Missing or invalid JWT token

**Solution**:
1. Ensure you're sending the `Authorization: Bearer {token}` header
2. Verify token is valid and not expired (tokens expire after 1 hour by default)
3. Get a fresh token from auth-api `/auth/login`

### Issue: "Invalid or expired token" errors

**Cause**: JWT secrets don't match between auth-api and users-api

**Solution**:
1. Check that JWT_SECRET in users-api serverless.yml matches auth-api
2. Verify environment variables if using .env
3. Redeploy both services with matching secrets

### Issue: "User not found" or DynamoDB errors

**Cause**: auth-api not deployed or DynamoDB table doesn't exist

**Solution**:
1. Deploy auth-api first: `cd auth-api && npm run deploy:dev`
2. Verify the users table exists in DynamoDB console
3. Check the table name matches: `users-{stage}` (e.g., `users-dev`)

### Issue: "Forbidden - Admin access required" errors

**Cause**: Non-admin user trying to access admin-only endpoints

**Solution**:
1. Verify the user's role in DynamoDB
2. Use an admin account for admin operations
3. Or update the user's role to "admin" in DynamoDB

## Rollback

To rollback a deployment:

```bash
serverless remove --stage dev
```

Then redeploy a previous version.

## Monitoring

- **CloudWatch Logs**: Check Lambda function logs in CloudWatch
- **API Gateway Metrics**: Monitor request counts, latencies, errors
- **DynamoDB Metrics**: Monitor read/write capacity, throttling

## Cost Optimization

This deployment uses:
- **Lambda**: Pay per request (free tier: 1M requests/month)
- **DynamoDB**: Pay per request billing mode (no provisioned capacity)
- **API Gateway**: Pay per request (free tier: 1M requests/month for 12 months)

To reduce costs:
- Keep Lambda function code small (use esbuild bundling)
- Minimize DynamoDB scans (use queries with indexes when possible)
- Enable CloudWatch log retention policies

## Security Checklist

- [ ] JWT secrets are strong and match auth-api
- [ ] IAM roles follow principle of least privilege
- [ ] CORS is configured correctly
- [ ] CloudWatch logging is enabled
- [ ] DynamoDB encryption at rest is enabled
- [ ] API Gateway throttling is configured
- [ ] Input validation is comprehensive

## Next Steps

After successful deployment:

1. Update frontend API base URL if needed
2. Test all endpoints with Postman/curl
3. Set up monitoring alerts in CloudWatch
4. Configure custom domain name (optional)
5. Set up CI/CD pipeline for automated deployments
