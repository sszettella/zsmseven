import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  getPortfolio,
  createPosition,
  getPositionByPortfolioIdAndTicker
} from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createCreatedResponse, createErrorResponse } from '../utils/response';
import { validateCreatePositionRequest } from '../utils/validation';
import { updatePositionCalculations } from '../utils/calculations';
import { Position, CreatePositionRequest } from '../types';

/**
 * POST /api/portfolios/:portfolioId/positions
 * Create a new position in a portfolio
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[CREATE_POSITION] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[CREATE_POSITION] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[CREATE_POSITION] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[CREATE_POSITION] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get portfolio ID from path
    const portfolioId = event.pathParameters?.portfolioId;
    if (!portfolioId) {
      return createErrorResponse('Portfolio ID is required', 400);
    }

    // Get portfolio to verify ownership
    console.log('[CREATE_POSITION] Fetching portfolio:', portfolioId);
    const portfolio = await getPortfolio(portfolioId);

    if (!portfolio) {
      console.log('[CREATE_POSITION] Portfolio not found');
      return createErrorResponse('Portfolio not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[CREATE_POSITION] Forbidden - portfolio belongs to different user');
      return createErrorResponse('Forbidden - Portfolio belongs to different user', 403, 'FORBIDDEN');
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 400);
    }

    let body: CreatePositionRequest;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validationErrors = validateCreatePositionRequest(body);
    if (validationErrors.length > 0) {
      console.log('[CREATE_POSITION] Validation failed:', validationErrors);
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // Check if position with same ticker already exists in portfolio
    const ticker = body.ticker.toUpperCase();
    const existing = await getPositionByPortfolioIdAndTicker(portfolioId, ticker);
    if (existing) {
      console.log('[CREATE_POSITION] Position with same ticker already exists');
      return createErrorResponse(
        'Position with this ticker already exists in portfolio',
        409,
        'CONFLICT'
      );
    }

    // Create position object
    const now = new Date().toISOString();
    const basePosition = {
      id: uuidv4(),
      portfolioId,
      ticker,
      shares: body.shares,
      costBasis: body.costBasis,
      currentPrice: body.currentPrice,
      notes: body.notes,
      createdAt: now,
      updatedAt: now
    };

    // Calculate derived fields
    const position = updatePositionCalculations(basePosition);

    // Save to database
    console.log('[CREATE_POSITION] Creating position:', position.id);
    await createPosition(position);

    console.log('[CREATE_POSITION] Success - position created');
    return createCreatedResponse(position);

  } catch (error) {
    console.error('[CREATE_POSITION] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
