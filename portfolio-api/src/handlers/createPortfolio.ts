import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { createPortfolio, getPortfolioByUserIdAndName, unsetDefaultPortfolio } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createCreatedResponse, createErrorResponse } from '../utils/response';
import { validateCreatePortfolioRequest } from '../utils/validation';
import { Portfolio, CreatePortfolioRequest } from '../types';

/**
 * POST /api/portfolios
 * Create a new portfolio for the authenticated user
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[CREATE_PORTFOLIO] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[CREATE_PORTFOLIO] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[CREATE_PORTFOLIO] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[CREATE_PORTFOLIO] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse('Request body is required', 400);
    }

    let body: CreatePortfolioRequest;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate request
    const validationErrors = validateCreatePortfolioRequest(body);
    if (validationErrors.length > 0) {
      console.log('[CREATE_PORTFOLIO] Validation failed:', validationErrors);
      return createErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // Check if portfolio with same name already exists for this user
    const existing = await getPortfolioByUserIdAndName(payload.userId, body.name);
    if (existing) {
      console.log('[CREATE_PORTFOLIO] Portfolio with same name already exists');
      return createErrorResponse(
        'Portfolio with this name already exists',
        409,
        'CONFLICT'
      );
    }

    // If setting as default, unset other defaults first
    if (body.isDefault === true) {
      console.log('[CREATE_PORTFOLIO] Unsetting other default portfolios');
      await unsetDefaultPortfolio(payload.userId);
    }

    // Create portfolio object
    const now = new Date().toISOString();
    const portfolio: Portfolio = {
      id: uuidv4(),
      userId: payload.userId,
      name: body.name,
      description: body.description,
      isActive: body.isActive !== undefined ? body.isActive : true,
      isDefault: body.isDefault !== undefined ? body.isDefault : false,
      createdAt: now,
      updatedAt: now
    };

    // Save to database
    console.log('[CREATE_PORTFOLIO] Creating portfolio:', portfolio.id);
    await createPortfolio(portfolio);

    console.log('[CREATE_PORTFOLIO] Success - portfolio created');
    return createCreatedResponse(portfolio);

  } catch (error) {
    console.error('[CREATE_PORTFOLIO] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
