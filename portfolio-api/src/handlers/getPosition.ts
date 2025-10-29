import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPosition, getPortfolio } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

/**
 * GET /api/positions/:id
 * Get a single position by ID
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[GET_POSITION] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[GET_POSITION] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[GET_POSITION] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[GET_POSITION] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get position ID from path
    const positionId = event.pathParameters?.positionId;
    if (!positionId) {
      return createErrorResponse('Position ID is required', 400);
    }

    // Get position from database
    console.log('[GET_POSITION] Fetching position:', positionId);
    const position = await getPosition(positionId);

    if (!position) {
      console.log('[GET_POSITION] Position not found');
      return createErrorResponse('Position not found', 404, 'NOT_FOUND');
    }

    // Get portfolio to verify ownership
    console.log('[GET_POSITION] Fetching portfolio:', position.portfolioId);
    const portfolio = await getPortfolio(position.portfolioId);

    if (!portfolio) {
      console.log('[GET_POSITION] Portfolio not found');
      return createErrorResponse('Position not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[GET_POSITION] Forbidden - position belongs to portfolio owned by different user');
      return createErrorResponse('Forbidden - Position belongs to portfolio owned by different user', 403, 'FORBIDDEN');
    }

    console.log('[GET_POSITION] Success');
    return createSuccessResponse(position);

  } catch (error) {
    console.error('[GET_POSITION] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
