import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPosition, getPortfolio, deletePosition } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createNoContentResponse, createErrorResponse } from '../utils/response';

/**
 * DELETE /api/positions/:id
 * Delete a position from a portfolio
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[DELETE_POSITION] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[DELETE_POSITION] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[DELETE_POSITION] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[DELETE_POSITION] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get position ID from path
    const positionId = event.pathParameters?.id;
    if (!positionId) {
      return createErrorResponse('Position ID is required', 400);
    }

    // Get position from database
    console.log('[DELETE_POSITION] Fetching position:', positionId);
    const position = await getPosition(positionId);

    if (!position) {
      console.log('[DELETE_POSITION] Position not found');
      return createErrorResponse('Position not found', 404, 'NOT_FOUND');
    }

    // Get portfolio to verify ownership
    console.log('[DELETE_POSITION] Fetching portfolio:', position.portfolioId);
    const portfolio = await getPortfolio(position.portfolioId);

    if (!portfolio) {
      console.log('[DELETE_POSITION] Portfolio not found');
      return createErrorResponse('Position not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[DELETE_POSITION] Forbidden - position belongs to portfolio owned by different user');
      return createErrorResponse('Forbidden - Position belongs to portfolio owned by different user', 403, 'FORBIDDEN');
    }

    // Delete the position
    console.log('[DELETE_POSITION] Deleting position:', positionId);
    await deletePosition(positionId);

    console.log('[DELETE_POSITION] Success - position deleted');
    return createNoContentResponse();

  } catch (error) {
    console.error('[DELETE_POSITION] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
