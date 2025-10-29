import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPortfolio, getPositionsByPortfolioId } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

/**
 * GET /api/portfolios/:portfolioId/positions
 * List all positions for a portfolio
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[LIST_POSITIONS] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[LIST_POSITIONS] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[LIST_POSITIONS] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[LIST_POSITIONS] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get portfolio ID from path
    const portfolioId = event.pathParameters?.portfolioId;
    if (!portfolioId) {
      return createErrorResponse('Portfolio ID is required', 400);
    }

    // Get portfolio to verify ownership
    console.log('[LIST_POSITIONS] Fetching portfolio:', portfolioId);
    const portfolio = await getPortfolio(portfolioId);

    if (!portfolio) {
      console.log('[LIST_POSITIONS] Portfolio not found');
      return createErrorResponse('Portfolio not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[LIST_POSITIONS] Forbidden - portfolio belongs to different user');
      return createErrorResponse('Forbidden - Portfolio belongs to different user', 403, 'FORBIDDEN');
    }

    // Get positions from database
    console.log('[LIST_POSITIONS] Fetching positions for portfolio:', portfolioId);
    const positions = await getPositionsByPortfolioId(portfolioId);
    console.log('[LIST_POSITIONS] Found', positions.length, 'positions');

    // Sort by createdAt descending (newest first)
    const sortedPositions = positions.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log('[LIST_POSITIONS] Success - returning', sortedPositions.length, 'positions');
    return createSuccessResponse(sortedPositions);

  } catch (error) {
    console.error('[LIST_POSITIONS] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
