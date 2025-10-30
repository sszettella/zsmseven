import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDefaultPortfolio } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

/**
 * GET /api/portfolios/default
 * Get the default portfolio for the authenticated user
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[GET_DEFAULT_PORTFOLIO] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[GET_DEFAULT_PORTFOLIO] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[GET_DEFAULT_PORTFOLIO] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[GET_DEFAULT_PORTFOLIO] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get default portfolio from database
    console.log('[GET_DEFAULT_PORTFOLIO] Fetching default portfolio for user:', payload.userId);
    const portfolio = await getDefaultPortfolio(payload.userId);

    if (!portfolio) {
      console.log('[GET_DEFAULT_PORTFOLIO] No default portfolio found');
      return createErrorResponse('No default portfolio found', 404, 'NOT_FOUND');
    }

    console.log('[GET_DEFAULT_PORTFOLIO] Success - found portfolio:', portfolio.id);
    return createSuccessResponse(portfolio);

  } catch (error) {
    console.error('[GET_DEFAULT_PORTFOLIO] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
