import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPortfoliosByUserId } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

/**
 * GET /api/portfolios
 * List all portfolios for the authenticated user
 * Query params: isActive (optional)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[LIST_PORTFOLIOS] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[LIST_PORTFOLIOS] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[LIST_PORTFOLIOS] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[LIST_PORTFOLIOS] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Parse query parameters
    const isActiveParam = event.queryStringParameters?.isActive;
    const filters: { isActive?: boolean } = {};

    if (isActiveParam !== undefined) {
      filters.isActive = isActiveParam === 'true';
    }

    // Get portfolios from database
    console.log('[LIST_PORTFOLIOS] Fetching portfolios for user:', payload.userId);
    const portfolios = await getPortfoliosByUserId(payload.userId, filters);
    console.log('[LIST_PORTFOLIOS] Found', portfolios.length, 'portfolios');

    // Sort by createdAt descending (newest first)
    const sortedPortfolios = portfolios.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log('[LIST_PORTFOLIOS] Success - returning', sortedPortfolios.length, 'portfolios');
    return createSuccessResponse(sortedPortfolios);

  } catch (error) {
    console.error('[LIST_PORTFOLIOS] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
