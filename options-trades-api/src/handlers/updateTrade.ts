import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTrade, updateTrade } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateUpdateTradeRequest } from '../utils/validation';
import { calculateOpenTotalCost, calculateCloseTotalCost, calculateProfitLoss } from '../utils/calculations';
import { TradeStatus, UserRole, UpdateTradeRequest } from '../types';

/**
 * PUT /api/trades/:id
 * Update a trade (edit opening and/or closing transaction details)
 * Can update both open and closed trades
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[UPDATE_TRADE] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[UPDATE_TRADE] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[UPDATE_TRADE] Token verified for user:', payload.userId, 'role:', payload.role);
    } catch (error) {
      console.log('[UPDATE_TRADE] Token verification failed:', (error as Error).message);
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

    let body: UpdateTradeRequest;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validationErrors = validateUpdateTradeRequest(body);
    if (validationErrors.length > 0) {
      console.log('[UPDATE_TRADE] Validation failed:', validationErrors);
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // Fetch the trade
    console.log('[UPDATE_TRADE] Fetching trade:', tradeId);
    const trade = await getTrade(tradeId);

    if (!trade) {
      console.log('[UPDATE_TRADE] Trade not found:', tradeId);
      return createErrorResponse('Trade not found', 404);
    }

    // Check authorization: user must own the trade or be admin
    if (trade.userId !== payload.userId && payload.role !== UserRole.ADMIN) {
      console.log('[UPDATE_TRADE] Access denied - user does not own trade');
      return createErrorResponse('Forbidden - You do not have access to this trade', 403);
    }

    // Update trade fields
    const updatedTrade = {
      ...trade,
      ...(body.portfolioId !== undefined && { portfolioId: body.portfolioId || undefined }),
      ...(body.symbol && { symbol: body.symbol.toUpperCase() }),
      ...(body.optionType && { optionType: body.optionType }),
      ...(body.strikePrice !== undefined && { strikePrice: body.strikePrice }),
      ...(body.expirationDate && { expirationDate: body.expirationDate }),
      ...(body.openAction && { openAction: body.openAction }),
      ...(body.openQuantity !== undefined && { openQuantity: body.openQuantity }),
      ...(body.openPremium !== undefined && { openPremium: body.openPremium }),
      ...(body.openCommission !== undefined && { openCommission: body.openCommission }),
      ...(body.openTradeDate && { openTradeDate: body.openTradeDate }),
      ...(body.notes !== undefined && { notes: body.notes }),
      // Closing transaction fields (for closed trades)
      ...(body.closeAction && { closeAction: body.closeAction }),
      ...(body.closePremium !== undefined && { closePremium: body.closePremium }),
      ...(body.closeCommission !== undefined && { closeCommission: body.closeCommission }),
      ...(body.closeTradeDate && { closeTradeDate: body.closeTradeDate }),
      updatedAt: new Date().toISOString()
    };

    // Recalculate openTotalCost if any opening cost-related fields changed
    const openCostFieldsChanged =
      body.openAction !== undefined ||
      body.openQuantity !== undefined ||
      body.openPremium !== undefined ||
      body.openCommission !== undefined;

    if (openCostFieldsChanged) {
      updatedTrade.openTotalCost = calculateOpenTotalCost(
        updatedTrade.openAction,
        updatedTrade.openQuantity,
        updatedTrade.openPremium,
        updatedTrade.openCommission
      );
      console.log('[UPDATE_TRADE] Recalculated openTotalCost:', updatedTrade.openTotalCost);
    }

    // Recalculate closeTotalCost and profitLoss if any closing cost-related fields changed
    const closeCostFieldsChanged =
      body.closeAction !== undefined ||
      body.closePremium !== undefined ||
      body.closeCommission !== undefined ||
      openCostFieldsChanged; // Also recalc if open fields changed

    if (closeCostFieldsChanged && updatedTrade.status === TradeStatus.CLOSED) {
      // Ensure we have all closing fields
      if (updatedTrade.closeAction && updatedTrade.closePremium !== undefined &&
          updatedTrade.closeCommission !== undefined) {

        updatedTrade.closeTotalCost = calculateCloseTotalCost(
          updatedTrade.closeAction,
          updatedTrade.openQuantity, // closeQuantity equals openQuantity
          updatedTrade.closePremium,
          updatedTrade.closeCommission
        );
        console.log('[UPDATE_TRADE] Recalculated closeTotalCost:', updatedTrade.closeTotalCost);

        // Recalculate profit/loss
        updatedTrade.profitLoss = calculateProfitLoss(
          updatedTrade.openAction,
          updatedTrade.openTotalCost,
          updatedTrade.closeTotalCost
        );
        console.log('[UPDATE_TRADE] Recalculated profitLoss:', updatedTrade.profitLoss);
      }
    }

    // Save to database
    console.log('[UPDATE_TRADE] Updating trade:', tradeId);
    await updateTrade(updatedTrade);

    console.log('[UPDATE_TRADE] Success - trade updated');
    return createSuccessResponse(updatedTrade);

  } catch (error) {
    console.error('[UPDATE_TRADE] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
