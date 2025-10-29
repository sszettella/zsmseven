import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  getPortfolio,
  updatePortfolio,
  getPortfolioByUserIdAndName,
  unsetDefaultPortfolio
} from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { validateUpdatePortfolioRequest } from '../utils/validation';
import { UpdatePortfolioRequest } from '../types';

/**
 * PUT /api/portfolios/:id
 * Update an existing portfolio
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[UPDATE_PORTFOLIO] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[UPDATE_PORTFOLIO] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[UPDATE_PORTFOLIO] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[UPDATE_PORTFOLIO] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get portfolio ID from path
    const portfolioId = event.pathParameters?.id;
    if (!portfolioId) {
      return createErrorResponse('Portfolio ID is required', 400);
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 400);
    }

    let body: UpdatePortfolioRequest;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validationErrors = validateUpdatePortfolioRequest(body);
    if (validationErrors.length > 0) {
      console.log('[UPDATE_PORTFOLIO] Validation failed:', validationErrors);
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // Get existing portfolio
    console.log('[UPDATE_PORTFOLIO] Fetching portfolio:', portfolioId);
    const portfolio = await getPortfolio(portfolioId);

    if (!portfolio) {
      console.log('[UPDATE_PORTFOLIO] Portfolio not found');
      return createErrorResponse('Portfolio not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[UPDATE_PORTFOLIO] Forbidden - portfolio belongs to different user');
      return createErrorResponse('Forbidden - Portfolio belongs to different user', 403, 'FORBIDDEN');
    }

    // Check if name is being changed and if new name already exists
    if (body.name && body.name !== portfolio.name) {
      const existing = await getPortfolioByUserIdAndName(payload.userId, body.name);
      if (existing) {
        console.log('[UPDATE_PORTFOLIO] Portfolio with new name already exists');
        return createErrorResponse(
          'Portfolio with this name already exists',
          409,
          'CONFLICT'
        );
      }
    }

    // If setting as default, unset other defaults first
    if (body.isDefault === true && !portfolio.isDefault) {
      console.log('[UPDATE_PORTFOLIO] Unsetting other default portfolios');
      await unsetDefaultPortfolio(payload.userId);
    }

    // Update portfolio object
    const updatedPortfolio = {
      ...portfolio,
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      updatedAt: new Date().toISOString()
    };

    // Save to database
    console.log('[UPDATE_PORTFOLIO] Updating portfolio:', portfolioId);
    await updatePortfolio(updatedPortfolio);

    console.log('[UPDATE_PORTFOLIO] Success - portfolio updated');
    return createSuccessResponse(updatedPortfolio);

  } catch (error) {
    console.error('[UPDATE_PORTFOLIO] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
