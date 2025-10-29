import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTrade, updateTrade } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateCloseTradeRequest } from '../utils/validation';
import { calculateCloseTotalCost, calculateProfitLoss, isValidClosingAction } from '../utils/calculations';
import { TradeStatus, UserRole, CloseTradeRequest } from '../types';

/**
 * PUT /api/trades/:id/close
 * Close an open trade by adding closing transaction
 * Validates action pairing, calculates costs and P/L
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[CLOSE_TRADE] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[CLOSE_TRADE] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[CLOSE_TRADE] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[CLOSE_TRADE] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get trade ID from path parameters
    const tradeId = event.pathParameters?.id;
    if (!tradeId) {
      return createErrorResponse('Trade ID is required', 400);
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 400);
    }

    let body: CloseTradeRequest;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validationErrors = validateCloseTradeRequest(body);
    if (validationErrors.length > 0) {
      console.log('[CLOSE_TRADE] Validation failed:', validationErrors);
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // Fetch the trade
    console.log('[CLOSE_TRADE] Fetching trade:', tradeId);
    const trade = await getTrade(tradeId);

    if (!trade) {
      console.log('[CLOSE_TRADE] Trade not found:', tradeId);
      return createErrorResponse('Trade not found', 404);
    }

    // Check authorization: user must own the trade or be admin
    if (trade.userId !== payload.userId && payload.role !== UserRole.ADMIN) {
      console.log('[CLOSE_TRADE] Access denied - user does not own trade');
      return createErrorResponse('Forbidden - You do not have access to this trade', 403);
    }

    // Verify trade is open
    if (trade.status !== TradeStatus.OPEN) {
      console.log('[CLOSE_TRADE] Trade is already closed');
      return createErrorResponse('Trade is already closed', 400, 'TRADE_ALREADY_CLOSED');
    }

    // Verify closing action pairs correctly with opening action
    if (!isValidClosingAction(trade.openAction, body.closeAction)) {
      console.log('[CLOSE_TRADE] Invalid closing action pairing');
      const expectedAction = trade.openAction === 'buy_to_open' ? 'sell_to_close' : 'buy_to_close';
      return createErrorResponse(
        `Invalid closing action. For ${trade.openAction}, you must use ${expectedAction}`,
        400,
        'INVALID_CLOSING_ACTION'
      );
    }

    // Calculate closing costs
    const closeTotalCost = calculateCloseTotalCost(
      body.closeAction,
      trade.openQuantity, // closeQuantity must equal openQuantity
      body.closePremium,
      body.closeCommission
    );

    // Calculate profit/loss
    const profitLoss = calculateProfitLoss(
      trade.openAction,
      trade.openTotalCost,
      closeTotalCost
    );

    // Update trade with closing information
    const updatedTrade = {
      ...trade,
      closeAction: body.closeAction,
      closeQuantity: trade.openQuantity, // Auto-set to match openQuantity
      closePremium: body.closePremium,
      closeCommission: body.closeCommission,
      closeTradeDate: body.closeTradeDate,
      closeTotalCost,
      status: TradeStatus.CLOSED,
      profitLoss,
      updatedAt: new Date().toISOString()
    };

    // Save to database
    console.log('[CLOSE_TRADE] Updating trade:', tradeId);
    await updateTrade(updatedTrade);

    console.log('[CLOSE_TRADE] Success - trade closed with P/L:', profitLoss);
    return createSuccessResponse(updatedTrade);

  } catch (error) {
    console.error('[CLOSE_TRADE] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
