# Event Parsing Fix

## Issue Identified

The register endpoint was receiving the request data directly in the `event` object, not wrapped in `event.body`. This caused the error:

```
[REGISTER] Error: No request body
```

Even though the event clearly contained the data:
```json
{
  "email": "steve@szettella.com",
  "password": "password",
  "name": "Steve Szettella",
  "role": "admin"
}
```

## Root Cause

Lambda functions can be invoked in different ways:

1. **API Gateway Integration** - Request body is in `event.body` as a JSON string
2. **Direct Invocation** - Request data is directly in the `event` object
3. **Lambda Function URLs** - Can vary based on configuration

The original code only handled case #1 (API Gateway), but your Lambda was being invoked differently (likely case #2 or #3).

## Solution Applied

Updated both `register.ts` and `login.ts` handlers to support **both** invocation formats:

### Before (Register Handler)
```typescript
export const handler = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return createErrorResponse('Request body is required', 400);
  }
  const body: RegisterRequest = JSON.parse(event.body);
  // ...
}
```

### After (Register Handler)
```typescript
export const handler = async (event: APIGatewayProxyEvent | any) => {
  let body: RegisterRequest;

  // Handle both API Gateway format (event.body) and direct invocation (event directly)
  if (event.body) {
    // API Gateway format - body is a JSON string
    console.log('[REGISTER] Parsing from event.body (API Gateway format)');
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } else if (event.email || event.password || event.name) {
    // Direct invocation - event is the body itself
    console.log('[REGISTER] Using event directly (Direct invocation format)');
    body = event as RegisterRequest;
  } else {
    console.log('[REGISTER] Error: No request body found');
    return createErrorResponse('Request body is required', 400);
  }
  // ...
}
```

## Handlers Updated

1. ✅ **register.ts** - Now handles both formats with detailed logging
2. ✅ **login.ts** - Now handles both formats with logging

## Other Handlers to Update (If Needed)

These handlers also parse request bodies and may need the same fix:

- `refreshToken.ts` - Parses `event.body` for refresh token
- `logout.ts` - Parses optional `event.body` for refresh token
- `getMe.ts` - Only reads headers, should be fine

## Testing the Fix

After deploying, try the registration again:

```bash
curl -X POST https://your-api-url/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "name": "Test User"
  }'
```

## What the Logs Will Show Now

### Successful Parse (API Gateway)
```
[REGISTER] Handler invoked
[REGISTER] Event type: object
[REGISTER] Event.body type: string
[REGISTER] Parsing from event.body (API Gateway format)
[REGISTER] Parsed body: { email: 'test@example.com', name: 'Test User', role: undefined }
```

### Successful Parse (Direct Invocation)
```
[REGISTER] Handler invoked
[REGISTER] Event type: object
[REGISTER] Event.body type: undefined
[REGISTER] Event has email?: true
[REGISTER] Using event directly (Direct invocation format)
[REGISTER] Parsed body: { email: 'test@example.com', name: 'Test User', role: undefined }
```

## Why This Happens

Different invocation methods format the event differently:

### API Gateway HTTP API
```json
{
  "body": "{\"email\":\"test@example.com\",\"password\":\"pass123\"}",
  "headers": {...},
  "requestContext": {...}
}
```

### Lambda Function URL (Payload 1.0)
```json
{
  "body": "{\"email\":\"test@example.com\",\"password\":\"pass123\"}",
  "headers": {...}
}
```

### Lambda Function URL (Payload 2.0) or Direct Invoke
```json
{
  "email": "test@example.com",
  "password": "pass123"
}
```

### Test Event / Direct Invocation
```json
{
  "email": "test@example.com",
  "password": "pass123"
}
```

## Recommendation

For production, consider:

1. **Standardize invocation method** - Use API Gateway for consistent event format
2. **Keep dual-format support** - Current fix supports both, which is safer
3. **Add event type logging** - Current logs show which format is being used

## Next Steps

1. ✅ Code has been updated
2. ✅ Build succeeded
3. ⬜ Deploy the updated code
4. ⬜ Test registration again
5. ⬜ Check logs to confirm it's working

The handler will now properly parse the request body regardless of invocation method! 🎉
