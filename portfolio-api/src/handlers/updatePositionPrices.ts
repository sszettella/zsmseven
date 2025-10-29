import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPortfolio, getPositionsByPortfolioId, updatePosition } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateUpdatePricesRequest } from '../utils/validation';
import { updatePositionCalculations } from '../utils/calculations';
import { UpdatePricesRequest } from '../types';

/**
 * PATCH /api/portfolios/:portfolioId/positions/prices
 * Update current prices for multiple positions at once
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[UPDATE_POSITION_PRICES] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[UPDATE_POSITION_PRICES] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[UPDATE_POSITION_PRICES] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[UPDATE_POSITION_PRICES] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get portfolio ID from path
    const portfolioId = event.pathParameters?.portfolioId;
    if (!portfolioId) {
      return createErrorResponse('Portfolio ID is required', 400);
    }

    // Get portfolio to verify ownership
    console.log('[UPDATE_POSITION_PRICES] Fetching portfolio:', portfolioId);
    const portfolio = await getPortfolio(portfolioId);

    if (!portfolio) {
      console.log('[UPDATE_POSITION_PRICES] Portfolio not found');
      return createErrorResponse('Portfolio not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[UPDATE_POSITION_PRICES] Forbidden - portfolio belongs to different user');
      return createErrorResponse('Forbidden - Portfolio belongs to different user', 403, 'FORBIDDEN');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 400);
    }

    let body: UpdatePricesRequest;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validationErrors = validateUpdatePricesRequest(body);
    if (validationErrors.length > 0) {
      console.log('[UPDATE_POSITION_PRICES] Validation failed:', validationErrors);
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // Get all positions for the portfolio
    console.log('[UPDATE_POSITION_PRICES] Fetching positions for portfolio:', portfolioId);
    const positions = await getPositionsByPortfolioId(portfolioId);

    // Create a map of ticker -> currentPrice for quick lookup
    const priceMap = new Map<string, number>();
    body.prices.forEach(({ ticker, currentPrice }) => {
      priceMap.set(ticker.toUpperCase(), currentPrice);
    });

    // Update positions that match the provided tickers
    const updatedPositions = [];
    for (const position of positions) {
      const newPrice = priceMap.get(position.ticker);
      if (newPrice !== undefined) {
        const updatedBasePosition = {
          ...position,
          currentPrice: newPrice,
          updatedAt: new Date().toISOString()
        };

        // Recalculate derived fields
        const updatedPosition = updatePositionCalculations(updatedBasePosition);

        // Save to database
        await updatePosition(updatedPosition);

        updatedPositions.push({
          id: updatedPosition.id,
          ticker: updatedPosition.ticker,
          currentPrice: updatedPosition.currentPrice,
          marketValue: updatedPosition.marketValue,
          unrealizedPL: updatedPosition.unrealizedPL
        });
      }
    }

    console.log('[UPDATE_POSITION_PRICES] Success - updated', updatedPositions.length, 'positions');
    return createSuccessResponse({
      updated: updatedPositions.length,
      positions: updatedPositions
    });

  } catch (error) {
    console.error('[UPDATE_POSITION_PRICES] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
