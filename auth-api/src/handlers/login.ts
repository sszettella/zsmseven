import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LoginRequest, LoginResponse } from '../types';
import { getUserByEmail, userToResponse } from '../utils/dynamodb';
import { comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent | any
): Promise<APIGatewayProxyResult> => {
  console.log('[LOGIN] Handler invoked');

  try {
    let body: LoginRequest;

    // Handle both API Gateway format (event.body) and direct invocation (event directly)
    if (event.body) {
      console.log('[LOGIN] Parsing from event.body');
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else if (event.email || event.password) {
      console.log('[LOGIN] Using event directly');
      body = event as LoginRequest;
    } else {
      console.log('[LOGIN] Error: No request body found');
      return createErrorResponse('Request body is required', 400);
    }

    console.log('[LOGIN] Attempting login for:', body.email);

    // Validate input
    if (!body.email || !body.password) {
      return createErrorResponse('Email and password are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    // Get user from database
    const user = await getUserByEmail(body.email);

    if (!user) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(body.password, user.passwordHash);

    if (!isPasswordValid) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Prepare response
    const response: LoginResponse = {
      user: userToResponse(user),
      token,
      refreshToken
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('[LOGIN] ERROR:', error);
    console.error('[LOGIN] Error stack:', (error as Error).stack);

    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    return createErrorResponse('Internal server error', 500);
  }
};
