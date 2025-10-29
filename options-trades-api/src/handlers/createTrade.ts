import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { createTrade } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createCreatedResponse, createErrorResponse } from '../utils/response';
import { validateCreateTradeRequest } from '../utils/validation';
import { calculateOpenTotalCost } from '../utils/calculations';
import { Trade, TradeStatus, CreateTradeRequest } from '../types';

/**
 * POST /api/trades
 * Create a new trade (opening transaction only)
 * Automatically sets userId from token and calculates openTotalCost
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[CREATE_TRADE] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[CREATE_TRADE] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[CREATE_TRADE] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[CREATE_TRADE] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 400);
    }

    let body: CreateTradeRequest;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validationErrors = validateCreateTradeRequest(body);
    if (validationErrors.length > 0) {
      console.log('[CREATE_TRADE] Validation failed:', validationErrors);
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // Calculate openTotalCost
    const openTotalCost = calculateOpenTotalCost(
      body.openAction,
      body.openQuantity,
      body.openPremium,
      body.openCommission
    );

    // Create trade object
    const now = new Date().toISOString();
    const trade: Trade = {
      id: uuidv4(),
      userId: payload.userId,
      portfolioId: body.portfolioId || undefined,

      symbol: body.symbol.toUpperCase(),
      optionType: body.optionType,
      strikePrice: body.strikePrice,
      expirationDate: body.expirationDate,

      openAction: body.openAction,
      openQuantity: body.openQuantity,
      openPremium: body.openPremium,
      openCommission: body.openCommission,
      openTradeDate: body.openTradeDate,
      openTotalCost,

      // Closing fields are undefined for new trades
      closeAction: undefined,
      closeQuantity: undefined,
      closePremium: undefined,
      closeCommission: undefined,
      closeTradeDate: undefined,
      closeTotalCost: undefined,

      status: TradeStatus.OPEN,
      profitLoss: undefined,

      notes: body.notes,
      createdAt: now,
      updatedAt: now
    };

    // Save to database
    console.log('[CREATE_TRADE] Creating trade:', trade.id);
    await createTrade(trade);

    console.log('[CREATE_TRADE] Success - trade created');
    return createCreatedResponse(trade);

  } catch (error) {
    console.error('[CREATE_TRADE] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
