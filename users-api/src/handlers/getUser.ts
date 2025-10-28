import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserById, userToResponse } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { UserRole } from '../types';

/**
 * GET /api/users/:id
 * Get a single user by ID
 * Requires: Admin role OR self (users can view their own profile)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[GET_USER] Handler invoked');

  try {
    // Extract user ID from path parameters
    const userId = event.pathParameters?.id;
    if (!userId) {
      console.log('[GET_USER] No user ID provided');
      return createErrorResponse('User ID is required', 400);
    }

    console.log('[GET_USER] Requested user ID:', userId);

    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[GET_USER] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[GET_USER] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[GET_USER] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Check authorization: must be admin OR requesting their own profile
    const isAdmin = payload.role === UserRole.ADMIN;
    const isSelf = payload.userId === userId;

    if (!isAdmin && !isSelf) {
      console.log('[GET_USER] Access denied - user is not admin and not requesting own profile');
      return createErrorResponse('Forbidden - You can only view your own profile', 403);
    }

    // Get user from database
    console.log('[GET_USER] Fetching user from database');
    const user = await getUserById(userId);

    if (!user) {
      console.log('[GET_USER] User not found');
      return createErrorResponse('User not found', 404);
    }

    console.log('[GET_USER] Success - returning user');
    return createSuccessResponse(userToResponse(user));

  } catch (error) {
    console.error('[GET_USER] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
