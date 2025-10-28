import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LogoutRequest, LogoutResponse } from '../types';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { blacklistToken } from '../utils/tokenBlacklist';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch (error) {
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Parse request body for optional refresh token
    let refreshToken: string | undefined;
    if (event.body) {
      try {
        const body: LogoutRequest = JSON.parse(event.body);
        refreshToken = body.refreshToken;
      } catch (error) {
        // If body parsing fails, just continue without refresh token
      }
    }

    // Blacklist the access token
    await blacklistToken(token, payload);

    // Blacklist the refresh token if provided
    if (refreshToken) {
      try {
        await blacklistToken(refreshToken);
      } catch (error) {
        // Continue even if refresh token blacklisting fails
        console.error('Failed to blacklist refresh token:', error);
      }
    }

    // Return success response
    const response: LogoutResponse = {
      message: 'Logged out successfully'
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Logout error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
