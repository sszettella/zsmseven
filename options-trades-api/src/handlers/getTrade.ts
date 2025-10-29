import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTrade } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { UserRole } from '../types';

/**
 * GET /api/trades/:id
 * Get a specific trade by ID
 * Authorization: User must own the trade OR be admin
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[GET_TRADE] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[GET_TRADE] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[GET_TRADE] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[GET_TRADE] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get trade ID from path parameters
    const tradeId = event.pathParameters?.id;
    if (!tradeId) {
      return createErrorResponse('Trade ID is required', 400);
    }

    // Fetch the trade
    console.log('[GET_TRADE] Fetching trade:', tradeId);
    const trade = await getTrade(tradeId);

    if (!trade) {
      console.log('[GET_TRADE] Trade not found:', tradeId);
      return createErrorResponse('Trade not found', 404);
    }

    // Check authorization: user must own the trade or be admin
    if (trade.userId !== payload.userId && payload.role !== UserRole.ADMIN) {
      console.log('[GET_TRADE] Access denied - user does not own trade');
      return createErrorResponse('Forbidden - You do not have access to this trade', 403);
    }

    console.log('[GET_TRADE] Success - returning trade');
    return createSuccessResponse(trade);

  } catch (error) {
    console.error('[GET_TRADE] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
