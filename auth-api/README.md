# ZSM Seven Authentication API

A TypeScript-based authentication API built with AWS Lambda, API Gateway, and DynamoDB. Provides JWT-based authentication with access and refresh tokens conforming to the Authentication API Specification.

## Features

- User registration with email/password
- User login with JWT token generation
- Access token and refresh token support
- Token refresh without re-authentication
- Secure logout with token blacklist
- Get current authenticated user information
- Password strength validation
- Secure password hashing with bcrypt
- DynamoDB for user storage and token blacklist
- CORS enabled for cross-origin requests
- TypeScript for type safety

## Architecture

- **Runtime**: Node.js 20.x
- **Framework**: Serverless Framework v3
- **Database**: AWS DynamoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Token Invalidation**: DynamoDB with TTL

## API Endpoints

**Base URL**: `https://api.zsmproperties.com/api/auth`

All endpoints are accessible at `https://api.zsmproperties.com/api/auth/*`

### 1. POST /api/auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "user"  // Optional: "user" or "admin", defaults to "user"
}
```

**Success Response (201 Created):**
```json
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-10-27T12:00:00.000Z",
    "updatedAt": "2025-10-27T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input
- `409 Conflict`: Email already exists

### 2. POST /api/auth/login

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-10-27T12:00:00.000Z",
    "updatedAt": "2025-10-27T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing fields
- `401 Unauthorized`: Invalid credentials

### 3. POST /api/auth/logout

Logout current user and invalidate tokens.

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Request Body (Optional):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

### 4. GET /api/auth/me

Get current authenticated user's information.

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2025-10-27T12:00:00.000Z",
  "updatedAt": "2025-10-27T12:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: User not found

### 5. POST /api/auth/refresh

Obtain a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing refresh token
- `401 Unauthorized`: Invalid or expired refresh token

## Setup and Installation

### Prerequisites

- Node.js 20.x or higher
- AWS CLI configured
- Serverless Framework CLI: `npm install -g serverless`

### Installation

1. Navigate to auth-api directory:
```bash
cd auth-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

4. Generate JWT secrets (IMPORTANT for production):
```bash
openssl rand -base64 32
```

Edit `.env`:
```env
JWT_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
```

### Deployment

#### First Time Setup - Create Custom Domain

Before first deployment, create the custom domain mapping:

```bash
# Create domain for production
serverless create_domain --stage prod

# Or for development
serverless create_domain --stage dev
```

This creates the API Gateway custom domain and Route53 DNS records for `api.zsmproperties.com`.

#### Deploy to AWS

```bash
# Development
npm run deploy:dev

# Production
npm run deploy:prod
```

#### GitHub Actions (Automated Deployment)

Deployments to production are automated via GitHub Actions when you push changes to the `main` branch under the `auth-api/` directory.

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

The workflow will:
1. Build the TypeScript code
2. Create custom domain (if needed)
3. Deploy to production
4. Display deployment info

### Local Development

```bash
npm run build
serverless offline
```

API will be at `http://localhost:3000`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Access token secret | (required) |
| `JWT_REFRESH_SECRET` | Refresh token secret | (required) |
| `JWT_EXPIRES_IN` | Access token lifetime | 1h |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | 7d |

## DynamoDB Tables

### users-{stage}
- Primary Key: `id`
- GSI: `EmailIndex` on `email`
- Stores user accounts

### token-blacklist-{stage}
- Primary Key: `token`
- TTL on `expiresAt`
- Stores invalidated tokens

## Client Integration Example

```javascript
// Login
const loginRes = await fetch('https://api.zsmproperties.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'SecurePass123' })
});
const { user, token, refreshToken } = await loginRes.json();
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);

// Authenticated request
const meRes = await fetch('https://api.zsmproperties.com/api/auth/me', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
});

// Refresh token
const refreshRes = await fetch('https://api.zsmproperties.com/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
});
const { token: newToken } = await refreshRes.json();
localStorage.setItem('accessToken', newToken);

// Logout
await fetch('https://api.zsmproperties.com/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
});
localStorage.clear();
```

## TypeScript Types

```typescript
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}
```

## Security Features

- ✅ Bcrypt password hashing (10 rounds)
- ✅ JWT with expiration
- ✅ Token blacklist on logout
- ✅ Password strength validation
- ✅ Email validation
- ✅ Generic error messages
- ✅ CORS enabled

## Project Structure

```
auth-api/
├── src/
│   ├── handlers/         # Lambda handlers
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities
├── serverless.yml       # AWS config
├── tsconfig.json        # TypeScript config
└── package.json         # Dependencies
```

## Troubleshooting

**Token expired**: Use refresh endpoint to get new access token

**User exists**: Email already registered, use login instead

**Invalid password**: Must have 8+ chars, uppercase, lowercase, number

**DynamoDB errors**: Check AWS credentials and table permissions

## API Specification Compliance

✅ Fully compliant with Authentication API Specification
- POST /api/auth/register (201)
- POST /api/auth/login (200)
- POST /api/auth/logout (200)
- GET /api/auth/me (200)
- POST /api/auth/refresh (200)

## License

MIT
