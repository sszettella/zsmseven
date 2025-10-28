import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { RegisterRequest, LoginResponse, User, UserRole } from '../types';
import { getUserByEmail, createUser, userToResponse } from '../utils/dynamodb';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { createCreatedResponse, createErrorResponse } from '../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent | any
): Promise<APIGatewayProxyResult> => {
  console.log('[REGISTER] Handler invoked');
  console.log('[REGISTER] Event type:', typeof event);
  console.log('[REGISTER] Event keys:', Object.keys(event));
  console.log('[REGISTER] Event.body type:', typeof event.body);
  console.log('[REGISTER] Event.body value:', event.body);
  console.log('[REGISTER] Event has email?:', 'email' in event);

  try {
    let body: RegisterRequest;

    // Handle both API Gateway format (event.body) and direct invocation (event directly)
    if (event.body) {
      // API Gateway format - body is a JSON string
      console.log('[REGISTER] Parsing from event.body (API Gateway format)');
      console.log('[REGISTER] Raw body:', event.body);
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else if (event.email || event.password || event.name) {
      // Direct invocation - event is the body itself
      console.log('[REGISTER] Using event directly (Direct invocation format)');
      body = event as RegisterRequest;
    } else {
      console.log('[REGISTER] Error: No request body found');
      console.log('[REGISTER] Event structure:', JSON.stringify(event, null, 2));
      return createErrorResponse('Request body is required', 400);
    }

    console.log('[REGISTER] Parsed body:', { email: body.email, name: body.name, role: body.role });

    // Validate input
    if (!body.email || !body.password || !body.name) {
      return createErrorResponse('Email, password, and name are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    // Validate name
    if (body.name.trim().length < 2) {
      return createErrorResponse('Name must be at least 2 characters long', 400);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      return createErrorResponse(passwordValidation.message || 'Invalid password', 400);
    }

    // Check if user already exists
    console.log('[REGISTER] Checking if user exists:', body.email);
    const existingUser = await getUserByEmail(body.email);
    console.log('[REGISTER] Existing user check result:', existingUser ? 'User exists' : 'User does not exist');

    if (existingUser) {
      console.log('[REGISTER] Error: User already exists');
      return createErrorResponse('User with this email already exists', 409);
    }

    // Validate role if provided
    if (body.role && body.role !== UserRole.USER && body.role !== UserRole.ADMIN) {
      return createErrorResponse('Role must be either "user" or "admin"', 400);
    }

    // Hash password
    console.log('[REGISTER] Hashing password');
    const passwordHash = await hashPassword(body.password);
    console.log('[REGISTER] Password hashed successfully');

    // Create user object
    const now = new Date().toISOString();
    const user: User = {
      id: uuidv4(),
      email: body.email.toLowerCase(),
      name: body.name.trim(),
      role: body.role || UserRole.USER,
      passwordHash,
      createdAt: now,
      updatedAt: now
    };

    console.log('[REGISTER] User object created:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    console.log('[REGISTER] Environment USERS_TABLE:', process.env.USERS_TABLE);

    // Save to database
    console.log('[REGISTER] Attempting to save user to DynamoDB');
    await createUser(user);
    console.log('[REGISTER] User saved to DynamoDB successfully');

    // Generate tokens
    console.log('[REGISTER] Generating tokens');
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    console.log('[REGISTER] Tokens generated successfully');

    // Prepare response
    const response: LoginResponse = {
      user: userToResponse(user),
      token,
      refreshToken
    };

    console.log('[REGISTER] Success - returning response');
    return createCreatedResponse(response);

  } catch (error) {
    console.error('[REGISTER] ERROR caught in handler:', error);
    console.error('[REGISTER] Error stack:', (error as Error).stack);
    console.error('[REGISTER] Error name:', (error as any).name);
    console.error('[REGISTER] Error message:', (error as any).message);

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
