# Portfolio API Quick Start Guide

## Prerequisites

- Node.js 20.x installed
- AWS CLI configured with appropriate credentials
- Serverless Framework CLI installed: `npm install -g serverless`
- JWT_SECRET environment variable set (or use default from serverless.yml)

## Installation

```bash
cd portfolio-api
npm install
```

## Build

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Deploy to AWS

### Development Environment
```bash
npm run deploy:dev
```

### Production Environment
```bash
npm run deploy:prod
```

The deploy command will:
1. Build the TypeScript code
2. Package the Lambda functions
3. Create/update DynamoDB tables
4. Deploy API Gateway endpoints
5. Output the API endpoint URLs

## Local Development

Run locally with serverless-offline:
```bash
serverless offline
```

This starts a local API Gateway emulator at `http://localhost:3000`

## Environment Variables

Set these in your environment or AWS Systems Manager Parameter Store:

```bash
export JWT_SECRET="your-jwt-secret-key"
```

The JWT_SECRET should match the one used by the auth-api and options-trades-api.

## API Base URLs

After deployment, your API will be available at:
- **Dev**: `https://{api-id}.execute-api.us-east-1.amazonaws.com/dev`
- **Prod**: `https://{api-id}.execute-api.us-east-1.amazonaws.com/prod`

The API Gateway URL will be shown in the deployment output.

## Testing

### Get Auth Token First

Before testing portfolio endpoints, you need a valid JWT token. Obtain one from the auth-api:

```bash
# Login to get token
curl -X POST https://{auth-api-url}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

Save the `accessToken` from the response.

### Test Portfolio Endpoints

#### List Portfolios
```bash
curl -X GET https://{api-url}/api/portfolios \
  -H "Authorization: Bearer {your-token}"
```

#### Create Portfolio
```bash
curl -X POST https://{api-url}/api/portfolios \
  -H "Authorization: Bearer {your-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Portfolio",
    "description": "Test portfolio",
    "isActive": true,
    "isDefault": true
  }'
```

#### Get Portfolio with All Data
```bash
curl -X GET "https://{api-url}/api/portfolios/{portfolio-id}?includePositions=true&includeMetrics=true" \
  -H "Authorization: Bearer {your-token}"
```

#### Create Position
```bash
curl -X POST https://{api-url}/api/portfolios/{portfolio-id}/positions \
  -H "Authorization: Bearer {your-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "shares": 100,
    "costBasis": 15000.00,
    "currentPrice": 175.50
  }'
```

#### Update Position Prices (Batch)
```bash
curl -X PATCH https://{api-url}/api/portfolios/{portfolio-id}/positions/prices \
  -H "Authorization: Bearer {your-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [
      {"ticker": "AAPL", "currentPrice": 180.00},
      {"ticker": "MSFT", "currentPrice": 420.00}
    ]
  }'
```

## Monitoring

### CloudWatch Logs

View Lambda function logs:
```bash
serverless logs -f listPortfolios --tail
serverless logs -f createPosition --tail
```

### DynamoDB Tables

Check tables in AWS Console:
- `portfolios-dev` / `portfolios-prod`
- `positions-dev` / `positions-prod`

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Deployment Errors

1. **IAM Permissions**: Ensure AWS credentials have permissions for:
   - Lambda function creation/update
   - API Gateway creation/update
   - DynamoDB table creation/update
   - CloudFormation stack operations

2. **Table Already Exists**: If deploying to an existing stage:
   ```bash
   serverless remove --stage dev  # Remove old stack
   npm run deploy:dev             # Redeploy
   ```

3. **JWT Secret Mismatch**: Ensure JWT_SECRET matches across all APIs

### Runtime Errors

Check CloudWatch logs for detailed error messages:
```bash
serverless logs -f {function-name} --tail --stage dev
```

## Common Issues

### 401 Unauthorized
- Token expired or invalid
- JWT_SECRET mismatch between APIs
- Token not properly formatted in Authorization header

### 403 Forbidden
- Trying to access another user's portfolio/position
- User ID in token doesn't match resource owner

### 409 Conflict
- Portfolio name already exists for user
- Ticker already exists in portfolio

## API Documentation

For full API documentation, see:
- [README.md](README.md) - Complete API reference
- [ENDPOINT_MAPPING.md](ENDPOINT_MAPPING.md) - Endpoint to handler mapping
- Original specification in project root

## Next Steps

1. Deploy to dev environment
2. Test all endpoints with Postman or curl
3. Integrate with frontend application
4. Deploy to production when ready
5. Set up monitoring and alerts

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review serverless.yml configuration
3. Verify DynamoDB table structure
4. Check IAM permissions
