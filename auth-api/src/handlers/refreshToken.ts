import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RefreshTokenRequest, RefreshTokenResponse } from '../types';
import { getUserById } from '../utils/dynamodb';
import { verifyRefreshToken, generateAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 400);
    }

    const body: RefreshTokenRequest = JSON.parse(event.body);

    // Validate input
    if (!body.refreshToken) {
      return createErrorResponse('Refresh token is required', 400);
    }

    // Verify refresh token
    let payload;
    try {
      payload = await verifyRefreshToken(body.refreshToken);
    } catch (error) {
      return createErrorResponse('Invalid or expired refresh token', 401);
    }

    // Get user from database to ensure they still exist
    const user = await getUserById(payload.userId);

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // Generate new access token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = generateAccessToken(tokenPayload);

    // Prepare response
    const response: RefreshTokenResponse = {
      token
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Refresh token error:', error);

    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    return createErrorResponse('Internal server error', 500);
  }
};
