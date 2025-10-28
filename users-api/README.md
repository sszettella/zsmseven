# ZSMSeven Users API

User management REST API for the ZSMSeven trading/portfolio management application. Built with TypeScript, AWS Lambda, and DynamoDB.

## Overview

This API provides complete user management functionality including:
- List all users (admin only)
- Get user by ID (admin or self)
- Create new users (admin only)
- Update user information (admin or self with restrictions)
- Delete users (admin only)

## Prerequisites

- Node.js 20.x
- AWS CLI configured with appropriate credentials
- Serverless Framework
- DynamoDB users table (created by auth-api)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (optional, defaults are provided):
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build the project:
```bash
npm run build
```

## Deployment

Deploy to development:
```bash
npm run deploy:dev
```

Deploy to production:
```bash
npm run deploy:prod
```

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer {token}` header.

### GET /users
List all users in the system.
- **Auth**: Admin only
- **Response**: Array of user objects (sorted by createdAt descending)

### GET /users/:id
Get a single user by ID.
- **Auth**: Admin OR self
- **Response**: User object

### POST /users
Create a new user.
- **Auth**: Admin only
- **Body**: `{ email, password, name, role }`
- **Response**: Created user object (201)

### PUT /users/:id
Update an existing user.
- **Auth**: Admin OR self (with restrictions)
- **Body**: `{ email?, password?, name?, role? }`
- **Notes**:
  - All fields are optional
  - Empty/missing password = don't change password
  - Only admins can change role
  - Regular users can only update their own email, name, and password
- **Response**: Updated user object

### DELETE /users/:id
Delete a user.
- **Auth**: Admin only
- **Response**: 204 No Content
- **Restrictions**: Cannot delete the last admin user

## Shared Resources

This API shares the DynamoDB users table with the auth-api service. The table is created and managed by auth-api's CloudFormation stack.

### Users Table Structure
- **Primary Key**: `id` (String, UUID)
- **Global Secondary Index**: `EmailIndex` on `email`
- **Attributes**:
  - `id`: User UUID
  - `email`: Unique email (lowercase)
  - `name`: User's full name
  - `role`: `user` or `admin`
  - `passwordHash`: Bcrypt hashed password
  - `createdAt`: ISO 8601 timestamp
  - `updatedAt`: ISO 8601 timestamp

## Security

- **JWT Authentication**: All endpoints require valid JWT tokens from auth-api
- **Role-Based Access Control**: Admin and user roles with appropriate permissions
- **Password Security**: Bcrypt hashing with salt rounds = 10
- **Input Validation**: Email format, name length, password strength, role enum
- **CORS**: Enabled for cross-origin requests

## Development

Run locally with serverless-offline:
```bash
serverless offline
```

Run tests:
```bash
npm test
```

Lint code:
```bash
npm run lint
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "details": ["Specific error 1", "Specific error 2"]
}
```

Common status codes:
- `200`: Success
- `201`: Created
- `204`: No Content (delete success)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (e.g., email already exists, cannot delete last admin)
- `500`: Internal Server Error

## Integration with Frontend

Frontend expects:
- Base URL: `https://api.zsmproperties.com/api`
- All responses in camelCase
- ISO 8601 date format
- No password field in responses
- Consistent error format
