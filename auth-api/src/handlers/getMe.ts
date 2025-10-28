import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserById, userToResponse } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
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

    // Get user from database
    const user = await getUserById(payload.userId);

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    // Return user data (directly as per spec, not wrapped in {user: ...})
    return createSuccessResponse(userToResponse(user));

  } catch (error) {
    console.error('Get user error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
