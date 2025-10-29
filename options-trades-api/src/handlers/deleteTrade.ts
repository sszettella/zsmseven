import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTrade, deleteTrade } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createNoContentResponse, createErrorResponse } from '../utils/response';
import { UserRole } from '../types';

/**
 * DELETE /api/trades/:id
 * Delete a trade (open or closed)
 * Authorization: User must own the trade OR be admin
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[DELETE_TRADE] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[DELETE_TRADE] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[DELETE_TRADE] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[DELETE_TRADE] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get trade ID from path parameters
    const tradeId = event.pathParameters?.id;
    if (!tradeId) {
      return createErrorResponse('Trade ID is required', 400);
    }

    // Fetch the trade
    console.log('[DELETE_TRADE] Fetching trade:', tradeId);
    const trade = await getTrade(tradeId);

    if (!trade) {
      console.log('[DELETE_TRADE] Trade not found:', tradeId);
      return createErrorResponse('Trade not found', 404);
    }

    // Check authorization: user must own the trade or be admin
    if (trade.userId !== payload.userId && payload.role !== UserRole.ADMIN) {
      console.log('[DELETE_TRADE] Access denied - user does not own trade');
      return createErrorResponse('Forbidden - You do not have access to this trade', 403);
    }

    // Delete the trade
    console.log('[DELETE_TRADE] Deleting trade:', tradeId);
    await deleteTrade(tradeId);

    console.log('[DELETE_TRADE] Success - trade deleted');
    return createNoContentResponse();

  } catch (error) {
    console.error('[DELETE_TRADE] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
