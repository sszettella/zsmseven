import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserById, deleteUser, getAllUsers } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createNoContentResponse, createErrorResponse } from '../utils/response';
import { UserRole } from '../types';

/**
 * DELETE /api/users/:id
 * Delete a user from the system
 * Requires: Admin role
 * Business Rules:
 * - Prevent deletion of the last admin user
 * - Optional: prevent users from deleting themselves
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[DELETE_USER] Handler invoked');

  try {
    // Extract user ID from path parameters
    const userId = event.pathParameters?.id;
    if (!userId) {
      console.log('[DELETE_USER] No user ID provided');
      return createErrorResponse('User ID is required', 400);
    }

    console.log('[DELETE_USER] Requested user ID:', userId);

    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[DELETE_USER] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[DELETE_USER] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[DELETE_USER] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Check if user is admin
    if (payload.role !== UserRole.ADMIN) {
      console.log('[DELETE_USER] Access denied - user is not admin');
      return createErrorResponse('Forbidden - Admin access required', 403);
    }

    // Check if user exists
    console.log('[DELETE_USER] Fetching user from database');
    const userToDelete = await getUserById(userId);

    if (!userToDelete) {
      console.log('[DELETE_USER] User not found');
      return createErrorResponse('User not found', 404);
    }

    // Prevent deletion of last admin
    if (userToDelete.role === UserRole.ADMIN) {
      console.log('[DELETE_USER] Checking if this is the last admin');
      const allUsers = await getAllUsers();
      const adminCount = allUsers.filter(u => u.role === UserRole.ADMIN).length;

      if (adminCount <= 1) {
        console.log('[DELETE_USER] Error: Cannot delete last admin');
        return createErrorResponse('Cannot delete the last admin user', 409);
      }
    }

    // Delete user from database
    console.log('[DELETE_USER] Deleting user from database');
    await deleteUser(userId);
    console.log('[DELETE_USER] User deleted successfully');

    console.log('[DELETE_USER] Success - returning 204 No Content');
    return createNoContentResponse();

  } catch (error) {
    console.error('[DELETE_USER] Error:', error);

    // Handle DynamoDB conditional check failure (user doesn't exist)
    if ((error as any).name === 'ConditionalCheckFailedException') {
      return createErrorResponse('User not found', 404);
    }

    return createErrorResponse('Internal server error', 500);
  }
};
