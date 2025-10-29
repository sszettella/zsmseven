import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPortfolio, getPositionsByPortfolioId, getTradesByPortfolioId } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { PortfolioMetrics, Position, AssociatedTrades } from '../types';
import { calculateUnrealizedPLPercent } from '../utils/calculations';

/**
 * GET /api/portfolios/:id
 * Get a single portfolio with optional related data
 * Query params: includePositions, includeMetrics, includeTrades
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[GET_PORTFOLIO] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[GET_PORTFOLIO] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[GET_PORTFOLIO] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[GET_PORTFOLIO] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get portfolio ID from path
    const portfolioId = event.pathParameters?.portfolioId;
    if (!portfolioId) {
      return createErrorResponse('Portfolio ID is required', 400);
    }

    // Get portfolio from database
    console.log('[GET_PORTFOLIO] Fetching portfolio:', portfolioId);
    const portfolio = await getPortfolio(portfolioId);

    if (!portfolio) {
      console.log('[GET_PORTFOLIO] Portfolio not found');
      return createErrorResponse('Portfolio not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[GET_PORTFOLIO] Forbidden - portfolio belongs to different user');
      return createErrorResponse('Forbidden - Portfolio belongs to different user', 403, 'FORBIDDEN');
    }

    // Parse query parameters
    const includePositions = event.queryStringParameters?.includePositions === 'true';
    const includeMetrics = event.queryStringParameters?.includeMetrics === 'true';
    const includeTrades = event.queryStringParameters?.includeTrades === 'true';

    // Build response
    const response: any = { ...portfolio };

    if (includePositions || includeMetrics) {
      const positions = await getPositionsByPortfolioId(portfolioId);

      if (includePositions) {
        response.positions = positions;
      }

      if (includeMetrics) {
        response.metrics = calculatePortfolioMetrics(positions);
      }
    }

    if (includeTrades) {
      const trades = await getTradesByPortfolioId(portfolioId);
      response.associatedTrades = calculateAssociatedTrades(trades);
    }

    console.log('[GET_PORTFOLIO] Success');
    return createSuccessResponse(response);

  } catch (error) {
    console.error('[GET_PORTFOLIO] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};

function calculatePortfolioMetrics(positions: Position[]): PortfolioMetrics {
  const totalPositions = positions.length;
  let totalMarketValue = 0;
  let totalCostBasis = 0;
  let totalUnrealizedPL = 0;
  let topGainer: { ticker: string; unrealizedPLPercent: number } | undefined;
  let topLoser: { ticker: string; unrealizedPLPercent: number } | undefined;

  positions.forEach(position => {
    if (position.marketValue !== undefined) {
      totalMarketValue += position.marketValue;
    }
    totalCostBasis += position.costBasis;
    if (position.unrealizedPL !== undefined) {
      totalUnrealizedPL += position.unrealizedPL;
    }

    // Calculate unrealized P&L percent for this position
    const plPercent = calculateUnrealizedPLPercent(position.unrealizedPL, position.costBasis);
    if (plPercent !== undefined) {
      if (!topGainer || plPercent > topGainer.unrealizedPLPercent) {
        topGainer = { ticker: position.ticker, unrealizedPLPercent: plPercent };
      }
      if (!topLoser || plPercent < topLoser.unrealizedPLPercent) {
        topLoser = { ticker: position.ticker, unrealizedPLPercent: plPercent };
      }
    }
  });

  const totalUnrealizedPLPercent = totalCostBasis > 0
    ? (totalUnrealizedPL / totalCostBasis) * 100
    : 0;

  return {
    totalPositions,
    totalMarketValue,
    totalCostBasis,
    totalUnrealizedPL,
    totalUnrealizedPLPercent,
    topGainer,
    topLoser
  };
}

function calculateAssociatedTrades(trades: any[]): AssociatedTrades {
  let openCount = 0;
  let closedCount = 0;
  let totalProfitLoss = 0;

  trades.forEach(trade => {
    if (trade.status === 'open') {
      openCount++;
    } else if (trade.status === 'closed') {
      closedCount++;
      if (trade.profitLoss !== undefined) {
        totalProfitLoss += trade.profitLoss;
      }
    }
  });

  return {
    openCount,
    closedCount,
    totalProfitLoss
  };
}
