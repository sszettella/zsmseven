import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAllUsers, userToResponse } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { UserRole } from '../types';

/**
 * GET /api/users
 * List all users in the system
 * Requires: Admin role
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[LIST_USERS] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[LIST_USERS] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[LIST_USERS] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[LIST_USERS] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Check if user is admin
    if (payload.role !== UserRole.ADMIN) {
      console.log('[LIST_USERS] Access denied - user is not admin');
      return createErrorResponse('Forbidden - Admin access required', 403);
    }

    // Get all users from database
    console.log('[LIST_USERS] Fetching all users from database');
    const users = await getAllUsers();
    console.log('[LIST_USERS] Found', users.length, 'users');

    // Sort by createdAt descending (newest first)
    const sortedUsers = users.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Remove password hash from all users
    const userResponses = sortedUsers.map(user => userToResponse(user));

    console.log('[LIST_USERS] Success - returning', userResponses.length, 'users');
    return createSuccessResponse(userResponses);

  } catch (error) {
    console.error('[LIST_USERS] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
