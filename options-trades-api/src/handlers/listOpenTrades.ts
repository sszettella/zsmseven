import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTradesByUserId } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { TradeStatus, OpeningAction } from '../types';

/**
 * GET /api/trades/open
 * Get only open trades for authenticated user
 * Query parameters:
 * - openAction: Filter by "buy_to_open" or "sell_to_open"
 * - symbol: Filter by stock symbol
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[LIST_OPEN_TRADES] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[LIST_OPEN_TRADES] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[LIST_OPEN_TRADES] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[LIST_OPEN_TRADES] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Parse query parameters
    const openAction = event.queryStringParameters?.openAction as OpeningAction | undefined;
    const symbol = event.queryStringParameters?.symbol;

    // Validate openAction filter if provided
    if (openAction && !Object.values(OpeningAction).includes(openAction)) {
      return createErrorResponse('Invalid openAction filter. Must be "buy_to_open" or "sell_to_open"', 400);
    }

    // Fetch only open trades for the user
    console.log('[LIST_OPEN_TRADES] Fetching open trades for user:', payload.userId);
    let trades = await getTradesByUserId(payload.userId, {
      status: TradeStatus.OPEN,
      ...(symbol && { symbol: symbol.toUpperCase() })
    });

    // Apply additional openAction filter if provided
    if (openAction) {
      trades = trades.filter(trade => trade.openAction === openAction);
    }

    console.log('[LIST_OPEN_TRADES] Found', trades.length, 'open trades');

    // Sort by openTradeDate descending (newest first)
    const sortedTrades = trades.sort((a, b) => {
      return new Date(b.openTradeDate).getTime() - new Date(a.openTradeDate).getTime();
    });

    console.log('[LIST_OPEN_TRADES] Success - returning', sortedTrades.length, 'trades');
    return createSuccessResponse(sortedTrades);

  } catch (error) {
    console.error('[LIST_OPEN_TRADES] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
