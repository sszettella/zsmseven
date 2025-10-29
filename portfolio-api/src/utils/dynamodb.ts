import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand
} from '@aws-sdk/lib-dynamodb';
import { Portfolio, Position } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PORTFOLIOS_TABLE = process.env.PORTFOLIOS_TABLE || 'portfolios-dev';
const POSITIONS_TABLE = process.env.POSITIONS_TABLE || 'positions-dev';
const TRADES_TABLE = process.env.TRADES_TABLE || 'options-trades-dev';

// Portfolio operations
export const createPortfolio = async (portfolio: Portfolio): Promise<Portfolio> => {
  const command = new PutCommand({
    TableName: PORTFOLIOS_TABLE,
    Item: portfolio
  });

  await docClient.send(command);
  return portfolio;
};

export const getPortfolio = async (id: string): Promise<Portfolio | null> => {
  const command = new GetCommand({
    TableName: PORTFOLIOS_TABLE,
    Key: { id }
  });

  const result = await docClient.send(command);
  return result.Item as Portfolio || null;
};

export const updatePortfolio = async (portfolio: Portfolio): Promise<Portfolio> => {
  const command = new PutCommand({
    TableName: PORTFOLIOS_TABLE,
    Item: portfolio
  });

  await docClient.send(command);
  return portfolio;
};

export const deletePortfolio = async (id: string): Promise<void> => {
  const command = new DeleteCommand({
    TableName: PORTFOLIOS_TABLE,
    Key: { id }
  });

  await docClient.send(command);
};

export const getPortfoliosByUserId = async (
  userId: string,
  filters?: { isActive?: boolean }
): Promise<Portfolio[]> => {
  const command = new QueryCommand({
    TableName: PORTFOLIOS_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  });

  const result = await docClient.send(command);
  let portfolios = result.Items as Portfolio[] || [];

  // Apply filters
  if (filters?.isActive !== undefined) {
    portfolios = portfolios.filter(p => p.isActive === filters.isActive);
  }

  return portfolios;
};

export const getPortfolioByUserIdAndName = async (
  userId: string,
  name: string
): Promise<Portfolio | null> => {
  const command = new QueryCommand({
    TableName: PORTFOLIOS_TABLE,
    IndexName: 'UserNameIndex',
    KeyConditionExpression: 'userId = :userId AND #name = :name',
    ExpressionAttributeNames: {
      '#name': 'name'
    },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':name': name
    }
  });

  const result = await docClient.send(command);
  const portfolios = result.Items as Portfolio[] || [];
  return portfolios.length > 0 ? portfolios[0] : null;
};

export const unsetDefaultPortfolio = async (userId: string): Promise<void> => {
  // Get all portfolios for the user
  const portfolios = await getPortfoliosByUserId(userId);

  // Update all portfolios that have isDefault = true
  const updatePromises = portfolios
    .filter(p => p.isDefault)
    .map(p => {
      const updated = { ...p, isDefault: false, updatedAt: new Date().toISOString() };
      return updatePortfolio(updated);
    });

  await Promise.all(updatePromises);
};

// Position operations
export const createPosition = async (position: Position): Promise<Position> => {
  const command = new PutCommand({
    TableName: POSITIONS_TABLE,
    Item: position
  });

  await docClient.send(command);
  return position;
};

export const getPosition = async (id: string): Promise<Position | null> => {
  const command = new GetCommand({
    TableName: POSITIONS_TABLE,
    Key: { id }
  });

  const result = await docClient.send(command);
  return result.Item as Position || null;
};

export const updatePosition = async (position: Position): Promise<Position> => {
  const command = new PutCommand({
    TableName: POSITIONS_TABLE,
    Item: position
  });

  await docClient.send(command);
  return position;
};

export const deletePosition = async (id: string): Promise<void> => {
  const command = new DeleteCommand({
    TableName: POSITIONS_TABLE,
    Key: { id }
  });

  await docClient.send(command);
};

export const getPositionsByPortfolioId = async (portfolioId: string): Promise<Position[]> => {
  const command = new QueryCommand({
    TableName: POSITIONS_TABLE,
    IndexName: 'PortfolioIdIndex',
    KeyConditionExpression: 'portfolioId = :portfolioId',
    ExpressionAttributeValues: {
      ':portfolioId': portfolioId
    }
  });

  const result = await docClient.send(command);
  return result.Items as Position[] || [];
};

export const getPositionByPortfolioIdAndTicker = async (
  portfolioId: string,
  ticker: string
): Promise<Position | null> => {
  const command = new QueryCommand({
    TableName: POSITIONS_TABLE,
    IndexName: 'PortfolioTickerIndex',
    KeyConditionExpression: 'portfolioId = :portfolioId AND ticker = :ticker',
    ExpressionAttributeValues: {
      ':portfolioId': portfolioId,
      ':ticker': ticker
    }
  });

  const result = await docClient.send(command);
  const positions = result.Items as Position[] || [];
  return positions.length > 0 ? positions[0] : null;
};

export const deletePositionsByPortfolioId = async (portfolioId: string): Promise<void> => {
  // Get all positions for the portfolio
  const positions = await getPositionsByPortfolioId(portfolioId);

  // Delete all positions
  const deletePromises = positions.map(p => deletePosition(p.id));
  await Promise.all(deletePromises);
};

// Trade-related queries (for portfolio summaries)
export const getTradesByPortfolioId = async (portfolioId: string): Promise<any[]> => {
  const command = new QueryCommand({
    TableName: TRADES_TABLE,
    IndexName: 'PortfolioIdIndex',
    KeyConditionExpression: 'portfolioId = :portfolioId',
    ExpressionAttributeValues: {
      ':portfolioId': portfolioId
    }
  });

  const result = await docClient.send(command);
  return result.Items || [];
};

export const unsetPortfolioIdInTrades = async (portfolioId: string): Promise<void> => {
  // Get all trades for the portfolio
  const trades = await getTradesByPortfolioId(portfolioId);

  // Update all trades to remove portfolioId
  const updatePromises = trades.map(trade => {
    const updated = { ...trade, portfolioId: undefined, updatedAt: new Date().toISOString() };
    return docClient.send(new PutCommand({
      TableName: TRADES_TABLE,
      Item: updated
    }));
  });

  await Promise.all(updatePromises);
};
