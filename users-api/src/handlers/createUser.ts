import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserRequest, User, UserRole } from '../types';
import { getUserByEmail, createUser, userToResponse } from '../utils/dynamodb';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createCreatedResponse, createErrorResponse } from '../utils/response';
import { validateEmail, validateName, validateRole } from '../utils/validation';

/**
 * POST /api/users
 * Create a new user (admin function)
 * Requires: Admin role
 */
export const handler = async (
  event: APIGatewayProxyEvent | any
): Promise<APIGatewayProxyResult> => {
  console.log('[CREATE_USER] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[CREATE_USER] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[CREATE_USER] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[CREATE_USER] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Check if user is admin
    if (payload.role !== UserRole.ADMIN) {
      console.log('[CREATE_USER] Access denied - user is not admin');
      return createErrorResponse('Forbidden - Admin access required', 403);
    }

    // Parse request body
    let body: CreateUserRequest;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      return createErrorResponse('Request body is required', 400);
    }

    console.log('[CREATE_USER] Parsed body:', { email: body.email, name: body.name, role: body.role });

    // Validation
    const validationErrors: string[] = [];

    if (!body.email || !body.password || !body.name || !body.role) {
      return createErrorResponse('Email, password, name, and role are required', 400,
        ['Email, password, name, and role are required']);
    }

    // Validate email
    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      validationErrors.push(emailValidation.message!);
    }

    // Validate name
    const nameValidation = validateName(body.name);
    if (!nameValidation.valid) {
      validationErrors.push(nameValidation.message!);
    }

    // Validate role
    const roleValidation = validateRole(body.role);
    if (!roleValidation.valid) {
      validationErrors.push(roleValidation.message!);
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      validationErrors.push(passwordValidation.message!);
    }

    if (validationErrors.length > 0) {
      return createErrorResponse('Validation failed', 400, validationErrors);
    }

    // Check if user already exists
    console.log('[CREATE_USER] Checking if user exists:', body.email);
    const existingUser = await getUserByEmail(body.email);

    if (existingUser) {
      console.log('[CREATE_USER] Error: User already exists');
      return createErrorResponse('Email already exists', 400, ['Email already exists']);
    }

    // Hash password
    console.log('[CREATE_USER] Hashing password');
    const passwordHash = await hashPassword(body.password);

    // Create user object
    const now = new Date().toISOString();
    const user: User = {
      id: uuidv4(),
      email: body.email.toLowerCase().trim(),
      name: body.name.trim(),
      role: body.role,
      passwordHash,
      createdAt: now,
      updatedAt: now
    };

    console.log('[CREATE_USER] User object created:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Save to database
    console.log('[CREATE_USER] Saving user to DynamoDB');
    await createUser(user);
    console.log('[CREATE_USER] User created successfully');

    console.log('[CREATE_USER] Success - returning response');
    return createCreatedResponse(userToResponse(user));

  } catch (error) {
    console.error('[CREATE_USER] Error:', error);

    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Handle DynamoDB conditional check failure
    if ((error as any).name === 'ConditionalCheckFailedException') {
      return createErrorResponse('User with this email already exists', 409);
    }

    return createErrorResponse('Internal server error', 500);
  }
};
