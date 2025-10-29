import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  getPosition,
  getPortfolio,
  updatePosition,
  getPositionByPortfolioIdAndTicker
} from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateUpdatePositionRequest } from '../utils/validation';
import { updatePositionCalculations } from '../utils/calculations';
import { UpdatePositionRequest } from '../types';

/**
 * PUT /api/positions/:id
 * Update an existing position
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[UPDATE_POSITION] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[UPDATE_POSITION] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[UPDATE_POSITION] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[UPDATE_POSITION] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get position ID from path
    const positionId = event.pathParameters?.id;
    if (!positionId) {
      return createErrorResponse('Position ID is required', 400);
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 400);
    }

    let body: UpdatePositionRequest;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validationErrors = validateUpdatePositionRequest(body);
    if (validationErrors.length > 0) {
      console.log('[UPDATE_POSITION] Validation failed:', validationErrors);
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // Get existing position
    console.log('[UPDATE_POSITION] Fetching position:', positionId);
    const position = await getPosition(positionId);

    if (!position) {
      console.log('[UPDATE_POSITION] Position not found');
      return createErrorResponse('Position not found', 404, 'NOT_FOUND');
    }

    // Get portfolio to verify ownership
    console.log('[UPDATE_POSITION] Fetching portfolio:', position.portfolioId);
    const portfolio = await getPortfolio(position.portfolioId);

    if (!portfolio) {
      console.log('[UPDATE_POSITION] Portfolio not found');
      return createErrorResponse('Position not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[UPDATE_POSITION] Forbidden - position belongs to portfolio owned by different user');
      return createErrorResponse('Forbidden - Position belongs to portfolio owned by different user', 403, 'FORBIDDEN');
    }

    // Check if ticker is being changed and if new ticker already exists
    if (body.ticker && body.ticker.toUpperCase() !== position.ticker) {
      const ticker = body.ticker.toUpperCase();
      const existing = await getPositionByPortfolioIdAndTicker(position.portfolioId, ticker);
      if (existing) {
        console.log('[UPDATE_POSITION] Position with new ticker already exists');
        return createErrorResponse(
          'Position with this ticker already exists in portfolio',
          409,
          'CONFLICT'
        );
      }
    }

    // Update position object
    const updatedBasePosition = {
      ...position,
      ...(body.ticker !== undefined && { ticker: body.ticker.toUpperCase() }),
      ...(body.shares !== undefined && { shares: body.shares }),
      ...(body.costBasis !== undefined && { costBasis: body.costBasis }),
      ...(body.currentPrice !== undefined && { currentPrice: body.currentPrice }),
      ...(body.notes !== undefined && { notes: body.notes }),
      updatedAt: new Date().toISOString()
    };

    // Recalculate derived fields
    const updatedPosition = updatePositionCalculations(updatedBasePosition);

    // Save to database
    console.log('[UPDATE_POSITION] Updating position:', positionId);
    await updatePosition(updatedPosition);

    console.log('[UPDATE_POSITION] Success - position updated');
    return createSuccessResponse(updatedPosition);

  } catch (error) {
    console.error('[UPDATE_POSITION] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
