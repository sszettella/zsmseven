import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getPortfolio } from '../utils/dynamodb';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { PortfolioAnalysis } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const ANALYSES_TABLE = process.env.ANALYSES_TABLE!;

/**
 * Query portfolio analyses table for a specific portfolio
 * Returns analyses sorted by timestamp (most recent first)
 */
async function getPortfolioAnalyses(
  portfolioId: string,
  limit?: number
): Promise<PortfolioAnalysis[]> {
  const params = {
    TableName: ANALYSES_TABLE,
    KeyConditionExpression: 'portfolioId = :portfolioId',
    ExpressionAttributeValues: {
      ':portfolioId': portfolioId,
    },
    ScanIndexForward: false, // Most recent first
    ...(limit && { Limit: limit }),
  };

  const response = await docClient.send(new QueryCommand(params));
  return (response.Items || []) as PortfolioAnalysis[];
}

/**
 * GET /api/portfolios/:portfolioId/analysis
 * Get portfolio analysis results
 * Query params:
 *   - limit: Number of analyses to return (default: 1 for latest)
 *   - includeDetails: Include prompt and full analysis text (default: false)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[GET_PORTFOLIO_ANALYSIS] Handler invoked');

  try {
    // Extract and verify token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[GET_PORTFOLIO_ANALYSIS] No token provided');
      return createErrorResponse('Authorization token is required', 401);
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
      console.log('[GET_PORTFOLIO_ANALYSIS] Token verified for user:', payload.userId);
    } catch (error) {
      console.log('[GET_PORTFOLIO_ANALYSIS] Token verification failed:', (error as Error).message);
      return createErrorResponse('Invalid or expired token', 401);
    }

    // Get portfolio ID from path
    const portfolioId = event.pathParameters?.portfolioId;
    if (!portfolioId) {
      return createErrorResponse('Portfolio ID is required', 400);
    }

    // Get portfolio from database to verify ownership
    console.log('[GET_PORTFOLIO_ANALYSIS] Fetching portfolio:', portfolioId);
    const portfolio = await getPortfolio(portfolioId);

    if (!portfolio) {
      console.log('[GET_PORTFOLIO_ANALYSIS] Portfolio not found');
      return createErrorResponse('Portfolio not found', 404, 'NOT_FOUND');
    }

    // Check if portfolio belongs to user
    if (portfolio.userId !== payload.userId) {
      console.log('[GET_PORTFOLIO_ANALYSIS] Forbidden - portfolio belongs to different user');
      return createErrorResponse('Forbidden - Portfolio belongs to different user', 403, 'FORBIDDEN');
    }

    // Parse query parameters
    const limitParam = event.queryStringParameters?.limit;
    const limit = limitParam ? parseInt(limitParam, 10) : 1;
    const includeDetails = event.queryStringParameters?.includeDetails === 'true';

    // Query analyses
    console.log('[GET_PORTFOLIO_ANALYSIS] Querying analyses for portfolio:', portfolioId);
    const analyses = await getPortfolioAnalyses(portfolioId, limit);

    if (analyses.length === 0) {
      console.log('[GET_PORTFOLIO_ANALYSIS] No analyses found');
      return createErrorResponse('No analyses found for this portfolio', 404, 'NOT_FOUND');
    }

    // Filter fields based on includeDetails
    const response = analyses.map(analysis => {
      const baseResponse: any = {
        portfolioId: analysis.portfolioId,
        timestamp: analysis.timestamp,
        portfolioName: analysis.portfolioName,
        model: analysis.model,
        dataAsOf: analysis.dataAsOf,
      };

      if (includeDetails) {
        baseResponse.analysis = analysis.analysis;
        baseResponse.prompt = analysis.prompt;
        baseResponse.parsed_data = analysis.parsed_data;
      } else {
        // Only include parsed data for summary view
        baseResponse.parsed_data = analysis.parsed_data;
      }

      if (analysis.error) {
        baseResponse.error = analysis.error;
      }

      return baseResponse;
    });

    // If limit is 1, return single object instead of array
    const result = limit === 1 ? response[0] : response;

    console.log('[GET_PORTFOLIO_ANALYSIS] Success, returning', analyses.length, 'analyses');
    return createSuccessResponse(result);

  } catch (error) {
    console.error('[GET_PORTFOLIO_ANALYSIS] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
};
