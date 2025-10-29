import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTradesByUserId } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { TradeStatus } from '../types';

/**
 * GET /api/trades
 * Get all trades for authenticated user
 * Query parameters:
 * - status: Filter by "open" or "closed"
 * - symbol: Filter by stock symbol
 * - portfolioId: Filter by portfolio UUID
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[LIST_TRADES] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[LIST_TRADES] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[LIST_TRADES] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[LIST_TRADES] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Parse query parameters
    const status = event.queryStringParameters?.status as TradeStatus | undefined;
    const symbol = event.queryStringParameters?.symbol;
    const portfolioId = event.queryStringParameters?.portfolioId;

    // Validate status filter if provided
    if (status && !Object.values(TradeStatus).includes(status)) {
      return createErrorResponse('Invalid status filter. Must be "open" or "closed"', 400);
    }

    const filters = {
      ...(status && { status }),
      ...(symbol && { symbol: symbol.toUpperCase() }),
      ...(portfolioId && { portfolioId })
    };

    // All users (including admins) see only their own trades
    console.log('[LIST_TRADES] Fetching trades for user:', payload.userId);
    const trades = await getTradesByUserId(payload.userId, filters);

    console.log('[LIST_TRADES] Found', trades.length, 'trades');

    // Sort by createdAt descending (newest first)
    const sortedTrades = trades.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log('[LIST_TRADES] Success - returning', sortedTrades.length, 'trades');
    return createSuccessResponse(sortedTrades);

  } catch (error) {
    console.error('[LIST_TRADES] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
