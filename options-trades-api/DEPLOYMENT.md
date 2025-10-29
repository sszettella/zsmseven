# Deployment Guide - Options Trades API

## Prerequisites

1. **Node.js and NPM**: Ensure Node.js 20.x is installed
2. **AWS CLI**: Configured with appropriate credentials
3. **Serverless Framework**: Installed globally (`npm install -g serverless`)
4. **Environment Variables**: JWT_SECRET must match the auth-api configuration

## Environment Setup

The API requires the following environment variables:

```bash
# JWT secret (must match auth-api)
export JWT_SECRET="your-jwt-secret-here"

# Optional: Override default JWT refresh secret
export JWT_REFRESH_SECRET="your-refresh-secret-here"
```

## Installation

```bash
cd options-trades-api
npm install
```

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

## Deploy

### Deploy to Dev
```bash
npm run deploy:dev
```

### Deploy to Production
```bash
npm run deploy:prod
```

## API Gateway Configuration

The options-trades-api will be deployed with its own API Gateway endpoint. To integrate it into your main API:

### Option 1: Custom Domain (Recommended)

Use serverless-domain-manager to map the API to a custom domain path:

```yaml
# Add to serverless.yml
custom:
  customDomain:
    domainName: api.yourdomain.com
    basePath: 'trades'  # Access via api.yourdomain.com/trades
    stage: ${self:provider.stage}
    createRoute53Record: true
```

### Option 2: Separate Endpoint

Access the API through the generated API Gateway URL:
```
https://{api-id}.execute-api.us-east-1.amazonaws.com/{stage}/
```

## Shared Resources

### DynamoDB Tables

The API creates its own DynamoDB table:
- **options-trades-{stage}**: Main trades table with GSIs

### Users Table

The API references the existing users table:
- **users-{stage}**: Created by auth-api (READ-ONLY access)

The options-trades-api only needs READ access to the users table for JWT validation.

## Post-Deployment Verification

### 1. Check Lambda Functions

```bash
aws lambda list-functions --query "Functions[?contains(FunctionName, 'options-trades')]"
```

### 2. Check DynamoDB Tables

```bash
aws dynamodb describe-table --table-name options-trades-dev
```

### 3. Test API Endpoint

Get the API Gateway URL:
```bash
serverless info --stage dev
```

Test with curl:
```bash
# Login first (using auth-api)
TOKEN=$(curl -X POST https://your-auth-api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# List trades
curl -X GET https://your-trades-api/ \
  -H "Authorization: Bearer $TOKEN"
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   API Gateway                        │
│          (options-trades-api endpoint)               │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌──────────┐   ┌──────────┐
   │ Lambda  │    │  Lambda  │   │  Lambda  │
   │ Handlers│    │ Handlers │   │ Handlers │
   └─────────┘    └──────────┘   └──────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │      DynamoDB Tables          │
        ├───────────────────────────────┤
        │  options-trades-{stage}       │
        │  (with GSIs)                  │
        │                               │
        │  users-{stage}                │
        │  (read-only)                  │
        └───────────────────────────────┘
```

## Monitoring

### CloudWatch Logs

Each Lambda function creates its own log group:
```
/aws/lambda/zsmseven-options-trades-api-{stage}-{functionName}
```

View logs:
```bash
serverless logs -f listTrades --stage dev --tail
```

### CloudWatch Metrics

Monitor key metrics:
- Lambda invocations
- Lambda errors
- API Gateway 4XX/5XX errors
- DynamoDB read/write capacity

## Rollback

If deployment fails or issues occur:

```bash
# Remove the deployed stack
serverless remove --stage dev
```

## Security Considerations

1. **JWT Validation**: All endpoints validate JWT tokens
2. **Authorization**: User-level and admin-level access controls
3. **CORS**: Configured to allow browser-based clients
4. **IAM Roles**: Lambda functions have minimal required permissions
5. **Data Isolation**: Users can only access their own trades (unless admin)

## Troubleshooting

### JWT Token Errors

Ensure JWT_SECRET matches across auth-api and options-trades-api:
```bash
# Check current value
echo $JWT_SECRET

# Update if needed
export JWT_SECRET="matching-secret-here"
```

### DynamoDB Access Errors

Verify IAM role has proper permissions:
```bash
serverless info --stage dev --verbose
```

### API Gateway 403 Errors

Check CORS configuration in serverless.yml matches your frontend domain.

## Cost Estimation

With AWS Free Tier:
- **Lambda**: First 1M requests/month free
- **DynamoDB**: 25 GB storage free, 25 write/read capacity units free
- **API Gateway**: First 1M API calls free

Typical monthly cost (beyond free tier): $5-20 for moderate usage.
