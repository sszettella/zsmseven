# Troubleshooting 403 Forbidden Error

## Understanding 403 vs 401

- **401 Unauthorized**: No token or invalid/expired token
- **403 Forbidden**: Valid token, but insufficient permissions

If you're getting 403, it means:
✅ Your token is valid
❌ But you don't have permission for this operation

## Most Common Causes

### 1. User is Not Admin (MOST LIKELY)

The `GET /api/users` endpoint requires admin role.

**Check your user role:**

```javascript
// In browser console
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Role:', payload.role);
```

**Expected output for admin:**
```json
{
  "userId": "...",
  "email": "admin@example.com",
  "role": "admin"  ← Must be "admin", not "user"
}
```

**Solution:**
- Log in with an admin account
- Or promote your user to admin in DynamoDB

### 2. Endpoint Authorization Rules

| Endpoint | Admin Only | User (Self) Allowed |
|----------|-----------|-------------------|
| GET /users | ✅ Yes | ❌ No |
| GET /users/:id | ✅ Yes | ✅ Own profile only |
| POST /users | ✅ Yes | ❌ No |
| PUT /users/:id | ✅ Yes | ✅ Own profile only |
| DELETE /users/:id | ✅ Yes | ❌ No |

**If you're trying to list all users**, you MUST be an admin.

### 3. Token is Valid but Handler Returns 403

Check the handler logs in CloudWatch:

```bash
# View recent logs
serverless logs -f listUsers --stage dev --tail

# Or in AWS Console:
# CloudWatch > Log Groups > /aws/lambda/zsmseven-users-api-dev-listUsers
```

Look for log entries like:
```
[LIST_USERS] Access denied - user is not admin
[LIST_USERS] Token verified for user: xyz role: user
```

## Quick Diagnostic Steps

### Step 1: Verify You Have a Token

```bash
# In terminal
curl https://api.zsmproperties.com/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

- **No Authorization header?** → Add it
- **Token is empty?** → Log in to get a token

### Step 2: Check Token Contents

Decode your JWT token: https://jwt.io/

Or in bash:
```bash
TOKEN="your.jwt.token"
echo $TOKEN | cut -d. -f2 | base64 -d | jq '.'
```

Look for:
- `role`: Should be "admin" for most endpoints
- `exp`: Expiration timestamp (should be in the future)
- `userId`: Your user ID

### Step 3: Check API Gateway Response

In browser DevTools Network tab, check the response body:

**If you see:**
```json
{
  "error": "Forbidden - Admin access required"
}
```
→ You need an admin account

**If you see:**
```json
{
  "error": "Invalid or expired token"
}
```
→ This would be 401, not 403 (check your status code)

**If you see:**
```json
{
  "message": "Missing Authentication Token"
}
```
→ This is API Gateway error - wrong endpoint or API not deployed

### Step 4: Verify API is Deployed

```bash
cd users-api
serverless info --stage dev
```

Should show:
```
endpoints:
  GET - https://xxx.execute-api.us-east-1.amazonaws.com/dev/users
  GET - https://xxx.execute-api.us-east-1.amazonaws.com/dev/users/{id}
  POST - https://xxx.execute-api.us-east-1.amazonaws.com/dev/users
  PUT - https://xxx.execute-api.us-east-1.amazonaws.com/dev/users/{id}
  DELETE - https://xxx.execute-api.us-east-1.amazonaws.com/dev/users/{id}
```

## How to Create an Admin User

### Option 1: Update Existing User in DynamoDB

1. Go to AWS Console → DynamoDB
2. Find table: `users-dev` (or `users-prod`)
3. Find your user by email
4. Edit the item
5. Change `role` from `"user"` to `"admin"`
6. Save

### Option 2: Register as Admin via Auth API

If your auth-api register endpoint allows setting role:

```bash
curl -X POST https://api.zsmproperties.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123",
    "name": "Admin User",
    "role": "admin"
  }'
```

**Note**: Check if your register endpoint allows role selection or defaults to "user".

### Option 3: Create Admin via Users API (if you already have an admin)

If you already have one admin account, log in as that admin and create another:

```bash
# First, login as existing admin
curl -X POST https://api.zsmproperties.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"existing-admin@example.com","password":"pass"}'

# Use the token to create new admin
curl -X POST https://api.zsmproperties.com/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "email": "newadmin@example.com",
    "password": "SecurePass123",
    "name": "New Admin",
    "role": "admin"
  }'
```

## Testing with the Right Permissions

### Test 1: Admin Listing All Users

```javascript
// Must be logged in as admin
const response = await axios.get('https://api.zsmproperties.com/api/users', {
  headers: {
    Authorization: `Bearer ${adminToken}`
  }
});
// Should return array of all users
```

### Test 2: User Viewing Own Profile

```javascript
// Regular user can view their own profile
const response = await axios.get(`https://api.zsmproperties.com/api/users/${userId}`, {
  headers: {
    Authorization: `Bearer ${userToken}`
  }
});
// Should return user object
```

### Test 3: User Trying to List All Users (Should Fail)

```javascript
// Regular user trying to list all users
const response = await axios.get('https://api.zsmproperties.com/api/users', {
  headers: {
    Authorization: `Bearer ${userToken}`
  }
});
// Should return 403 Forbidden
```

## Still Getting 403?

### Check CloudWatch Logs

```bash
cd users-api
serverless logs -f listUsers --stage dev --tail
```

Make a request and watch the logs in real-time. Look for:
- Token verification messages
- Role checks
- Any error messages

### Enable More Detailed Logging

The handlers already have detailed logging. Check CloudWatch for:
```
[LIST_USERS] Handler invoked
[LIST_USERS] Token verified for user: xxx role: user
[LIST_USERS] Access denied - user is not admin
```

### Verify Handler is Being Called

If you don't see ANY logs, the Lambda might not be invoked. This could mean:
- API Gateway is blocking the request
- Wrong endpoint URL
- API not deployed

## Summary Checklist

- [ ] I have a valid JWT token (not expired)
- [ ] My user has `role: "admin"` in the token payload
- [ ] I'm sending the Authorization header: `Bearer {token}`
- [ ] The API is deployed: `serverless info --stage dev`
- [ ] I'm hitting the correct endpoint: `https://api.zsmproperties.com/api/users`
- [ ] CloudWatch logs show the Lambda is being invoked
- [ ] The error message indicates permission issue, not auth issue

**If all checked and still getting 403**, share:
1. CloudWatch logs from the Lambda function
2. JWT token payload (decoded)
3. Exact error message from response body
