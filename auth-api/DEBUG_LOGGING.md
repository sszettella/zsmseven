# Debug Logging Guide

## Overview

Comprehensive debug logging has been added to the register endpoint and DynamoDB operations to troubleshoot issues with user registration not writing to the database.

## Added Debug Logging

### Register Handler (`src/handlers/register.ts`)

The register handler now logs:
- **[REGISTER] Handler invoked** - Entry point
- **[REGISTER] Event** - Full event object (request details)
- **[REGISTER] Raw body** - Unparsed request body
- **[REGISTER] Parsed body** - Parsed registration data (email, name, role)
- **[REGISTER] Checking if user exists** - Before email lookup
- **[REGISTER] Existing user check result** - Result of email lookup
- **[REGISTER] Hashing password** - Before password hashing
- **[REGISTER] Password hashed successfully** - After hashing
- **[REGISTER] User object created** - User details before DB save
- **[REGISTER] Environment USERS_TABLE** - Table name being used
- **[REGISTER] Attempting to save user to DynamoDB** - Before DB write
- **[REGISTER] User saved to DynamoDB successfully** - After successful write
- **[REGISTER] Generating tokens** - Before token generation
- **[REGISTER] Tokens generated successfully** - After tokens created
- **[REGISTER] Success - returning response** - Final success
- **[REGISTER] ERROR** - Any errors with full stack trace

### DynamoDB Utilities (`src/utils/dynamodb.ts`)

#### `getUserById`
- Table name and user ID
- Success/failure status
- Error details if failed

#### `getUserByEmail`
- Table name and email
- Number of items found
- User ID if found
- Error details if failed

#### `createUser` (Most Important for Debugging)
- **Table name** - Which DynamoDB table is being used
- **User data** - ID, email, name, role, createdAt, updatedAt
- **Sending PutCommand** - Before DynamoDB write
- **SUCCESS! Response** - Full DynamoDB response on success
- **FAILED! Error** - Detailed error information:
  - Error name
  - Error message
  - Error code
  - Full error object

## How to View Logs

### Option 1: AWS CloudWatch (Recommended)

1. **Via AWS Console:**
   - Go to AWS CloudWatch Console
   - Click "Logs" → "Log groups"
   - Find log group: `/aws/lambda/zsmseven-auth-api-{stage}-register`
   - Click on the latest log stream
   - Search for `[REGISTER]` or `[DYNAMODB]` tags

2. **Via AWS CLI:**
   ```bash
   # Tail logs in real-time
   aws logs tail /aws/lambda/zsmseven-auth-api-prod-register --follow

   # Get recent logs
   aws logs tail /aws/lambda/zsmseven-auth-api-prod-register --since 1h

   # Filter for specific tags
   aws logs tail /aws/lambda/zsmseven-auth-api-prod-register --follow --filter-pattern "[DYNAMODB]"
   ```

### Option 2: Serverless CLI

```bash
# View logs for register function
serverless logs -f register --stage prod --tail

# View logs for specific time period
serverless logs -f register --stage prod --startTime 1h

# View logs from development
serverless logs -f register --stage dev --tail
```

### Option 3: During Local Testing

If running with `serverless offline`:
```bash
npm run build
serverless offline
```

Logs will appear in your terminal in real-time.

## Interpreting the Logs

### Successful Registration Flow

You should see logs in this order:
1. `[REGISTER] Handler invoked`
2. `[REGISTER] Parsed body: {...}`
3. `[DYNAMODB] getUserByEmail - No user found`
4. `[REGISTER] Password hashed successfully`
5. `[REGISTER] User object created: {...}`
6. `[REGISTER] Environment USERS_TABLE: users-prod`
7. `[DYNAMODB] createUser - Sending PutCommand to DynamoDB`
8. `[DYNAMODB] createUser - SUCCESS! Response: {...}`
9. `[REGISTER] Tokens generated successfully`
10. `[REGISTER] Success - returning response`

### Failed Registration (User Not Written)

If the user is not being written to DynamoDB, look for:

1. **Missing DynamoDB success log:**
   - If you see `[REGISTER] Attempting to save user` but NOT `[DYNAMODB] createUser - SUCCESS!`
   - The write is failing silently or throwing an error

2. **Permission errors:**
   ```
   [DYNAMODB] createUser - FAILED!
   Error name: AccessDeniedException
   Error message: User: arn:aws:... is not authorized to perform: dynamodb:PutItem
   ```
   **Solution**: Update IAM role permissions in serverless.yml

3. **Table doesn't exist:**
   ```
   [DYNAMODB] createUser - FAILED!
   Error name: ResourceNotFoundException
   Error message: Cannot do operations on a non-existent table
   ```
   **Solution**: Deploy the stack to create tables: `serverless deploy`

4. **Wrong table name:**
   ```
   [REGISTER] Environment USERS_TABLE: undefined
   ```
   **Solution**: Check environment variables in serverless.yml

5. **Conditional check failure (duplicate ID):**
   ```
   [DYNAMODB] createUser - FAILED!
   Error name: ConditionalCheckFailedException
   Error message: The conditional request failed
   ```
   **Solution**: This is expected if a user with the same ID exists

## Common Issues and Solutions

### Issue: Logs show success but user not in DynamoDB

**Check:**
1. Are you looking at the correct DynamoDB table?
   - Dev: `users-dev`
   - Prod: `users-prod`

2. Are you checking the correct AWS region?
   - Default: `us-east-1`

3. Is the table name environment variable correct?
   ```
   [REGISTER] Environment USERS_TABLE: users-prod
   ```

### Issue: No logs appearing

**Solutions:**
1. Wait 30-60 seconds for logs to appear in CloudWatch
2. Check you're looking at the correct stage (dev vs prod)
3. Verify the Lambda function was actually invoked
4. Check CloudWatch log group exists

### Issue: Permission denied errors

**Solution:**
Update `serverless.yml` IAM permissions:
```yaml
iam:
  role:
    statements:
      - Effect: Allow
        Action:
          - dynamodb:PutItem
          - dynamodb:GetItem
          - dynamodb:Query
        Resource:
          - arn:aws:dynamodb:us-east-1:*:table/users-${self:provider.stage}
          - arn:aws:dynamodb:us-east-1:*:table/users-${self:provider.stage}/index/*
```

Then redeploy:
```bash
serverless deploy --stage prod
```

## Testing the Debug Logging

### 1. Make a registration request:

```bash
curl -X POST https://api.zsmproperties.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "debug-test@example.com",
    "password": "TestPass123",
    "name": "Debug Test User"
  }'
```

### 2. Immediately tail the logs:

```bash
serverless logs -f register --stage prod --tail
```

### 3. Look for the log sequence

Search for these key indicators:
- `[REGISTER] Handler invoked` - Function started
- `[DYNAMODB] createUser - Sending PutCommand` - About to write
- `[DYNAMODB] createUser - SUCCESS!` - Write succeeded
- OR `[DYNAMODB] createUser - FAILED!` - Write failed with error details

## Removing Debug Logging (Production)

Once debugging is complete, you may want to reduce log verbosity:

1. Remove or comment out console.log statements
2. Keep console.error statements for error tracking
3. Rebuild and redeploy:
   ```bash
   npm run build
   serverless deploy --stage prod
   ```

## CloudWatch Insights Queries

Use these CloudWatch Insights queries for advanced debugging:

### Find all registration attempts:
```
fields @timestamp, @message
| filter @message like /\[REGISTER\] Handler invoked/
| sort @timestamp desc
| limit 20
```

### Find failed DynamoDB writes:
```
fields @timestamp, @message
| filter @message like /\[DYNAMODB\] createUser - FAILED!/
| sort @timestamp desc
```

### Count registrations by status:
```
fields @timestamp
| filter @message like /\[REGISTER\]/
| stats count() by @message
```

## Support

If you're still experiencing issues after reviewing the logs:
1. Share the full log output from registration attempt
2. Verify the DynamoDB table exists in AWS Console
3. Check IAM role permissions in AWS Console
4. Confirm environment variables are set correctly
