import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  getPortfolio,
  deletePortfolio,
  deletePositionsByPortfolioId,
  unsetPortfolioIdInTrades
} from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createNoContentResponse, createErrorResponse } from '../utils/response';

/**
 * DELETE /api/portfolios/:id
 * Delete a portfolio (cascade delete positions, unset trades)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[DELETE_PORTFOLIO] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[DELETE_PORTFOLIO] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[DELETE_PORTFOLIO] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[DELETE_PORTFOLIO] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get portfolio ID from path
    const portfolioId = event.pathParameters?.id;
    if (!portfolioId) {
      return createErrorResponse('Portfolio ID is required', 400);
    }

    // Get portfolio from database
    console.log('[DELETE_PORTFOLIO] Fetching portfolio:', portfolioId);
    const portfolio = await getPortfolio(portfolioId);

    if (!portfolio) {
      console.log('[DELETE_PORTFOLIO] Portfolio not found');
      return createErrorResponse('Portfolio not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[DELETE_PORTFOLIO] Forbidden - portfolio belongs to different user');
      return createErrorResponse('Forbidden - Portfolio belongs to different user', 403, 'FORBIDDEN');
    }

    // Delete all positions in the portfolio (cascade)
    console.log('[DELETE_PORTFOLIO] Deleting positions for portfolio:', portfolioId);
    await deletePositionsByPortfolioId(portfolioId);

    // Unset portfolioId in all trades associated with this portfolio
    console.log('[DELETE_PORTFOLIO] Unsetting portfolioId in trades');
    await unsetPortfolioIdInTrades(portfolioId);

    // Delete the portfolio
    console.log('[DELETE_PORTFOLIO] Deleting portfolio:', portfolioId);
    await deletePortfolio(portfolioId);

    console.log('[DELETE_PORTFOLIO] Success - portfolio deleted');
    return createNoContentResponse();

  } catch (error) {
    console.error('[DELETE_PORTFOLIO] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
