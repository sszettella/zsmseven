import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateUserRequest, User, UserRole } from '../types';
import { getUserById, getUserByEmail, updateUser, userToResponse } from '../utils/dynamodb';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateEmail, validateName, validateRole } from '../utils/validation';

/**
 * PUT /api/users/:id
 * Update an existing user
 * Requires: Admin role OR self (with limited fields)
 * Business Rules:
 * - Password is optional: if missing or empty, do NOT change existing password
 * - Role changes: only admins can change the role field
 * - Self-update: regular users can update their own name, email, and password only
 */
export const handler = async (
  event: APIGatewayProxyEvent | any
): Promise<APIGatewayProxyResult> => {
  console.log('[UPDATE_USER] Handler invoked');

  try {
    // Extract user ID from path parameters
    const userId = event.pathParameters?.id;
    if (!userId) {
      console.log('[UPDATE_USER] No user ID provided');
      return createErrorResponse('User ID is required', 400);
    }

    console.log('[UPDATE_USER] Requested user ID:', userId);

    // Extract and verify token
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[UPDATE_USER] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[UPDATE_USER] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[UPDATE_USER] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Check authorization: must be admin OR updating their own profile
    const isAdmin = payload.role === UserRole.ADMIN;
    const isSelf = payload.userId === userId;

    if (!isAdmin && !isSelf) {
      console.log('[UPDATE_USER] Access denied - user is not admin and not updating own profile');
      return createErrorResponse('Forbidden - You can only update your own profile', 403);
    }

    // Parse request body
    let body: UpdateUserRequest;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      return createErrorResponse('Request body is required', 400);
    }

    console.log('[UPDATE_USER] Parsed body:', {
      email: body.email,
      name: body.name,
      role: body.role,
      hasPassword: !!body.password && body.password.length > 0
    });

    // Check if user exists
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      console.log('[UPDATE_USER] User not found');
      return createErrorResponse('User not found', 404);
    }

    // Validation
    const validationErrors: string[] = [];
    const updates: Partial<User> = {};

    // Validate and prepare email update
    if (body.email !== undefined && body.email !== null && body.email !== existingUser.email) {
      const emailValidation = validateEmail(body.email);
      if (!emailValidation.valid) {
        validationErrors.push(emailValidation.message!);
      } else {
        // Check if email is already taken by another user
        const userWithEmail = await getUserByEmail(body.email);
        if (userWithEmail && userWithEmail.id !== userId) {
          validationErrors.push('Email already exists');
        } else {
          updates.email = body.email.toLowerCase().trim();
        }
      }
    }

    // Validate and prepare name update
    if (body.name !== undefined && body.name !== null) {
      const nameValidation = validateName(body.name);
      if (!nameValidation.valid) {
        validationErrors.push(nameValidation.message!);
      } else {
        updates.name = body.name.trim();
      }
    }

    // Handle password update
    // CRITICAL: Only update password if it's explicitly provided and not empty
    if (body.password && body.password.length > 0) {
      const passwordValidation = validatePasswordStrength(body.password);
      if (!passwordValidation.valid) {
        validationErrors.push(passwordValidation.message!);
      } else {
        console.log('[UPDATE_USER] Hashing new password');
        updates.passwordHash = await hashPassword(body.password);
      }
    } else {
      console.log('[UPDATE_USER] No password update (empty or missing)');
    }

    // Handle role update
    // CRITICAL: Only admins can change roles
    if (body.role !== undefined && body.role !== null) {
      if (!isAdmin) {
        console.log('[UPDATE_USER] Non-admin attempted to change role');
        return createErrorResponse('Forbidden - Only admins can change user roles', 403);
      }

      const roleValidation = validateRole(body.role);
      if (!roleValidation.valid) {
        validationErrors.push(roleValidation.message!);
      } else {
        updates.role = body.role;
      }
    }

    if (validationErrors.length > 0) {
      return createErrorResponse('Validation failed', 400, validationErrors);
    }

    // Check if there are any updates to make
    if (Object.keys(updates).length === 0) {
      console.log('[UPDATE_USER] No fields to update');
      return createSuccessResponse(userToResponse(existingUser));
    }

    // Update user in database
    console.log('[UPDATE_USER] Updating user with fields:', Object.keys(updates));
    const updatedUser = await updateUser(userId, updates);
    console.log('[UPDATE_USER] User updated successfully');

    console.log('[UPDATE_USER] Success - returning updated user');
    return createSuccessResponse(userToResponse(updatedUser));

  } catch (error) {
    console.error('[UPDATE_USER] Error:', error);

    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Handle DynamoDB conditional check failure (user doesn't exist)
    if ((error as any).name === 'ConditionalCheckFailedException') {
      return createErrorResponse('User not found', 404);
    }

    return createErrorResponse('Internal server error', 500);
  }
};
