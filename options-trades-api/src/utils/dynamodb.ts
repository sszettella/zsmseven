import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { Trade, TradeStatus } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TRADES_TABLE = process.env.TRADES_TABLE || 'options-trades-dev';

export const createTrade = async (trade: Trade): Promise<Trade> => {
  const command = new PutCommand({
    TableName: TRADES_TABLE,
    Item: trade
  });

  await docClient.send(command);
  return trade;
};

export const getTrade = async (id: string): Promise<Trade | null> => {
  const command = new GetCommand({
    TableName: TRADES_TABLE,
    Key: { id }
  });

  const result = await docClient.send(command);
  return result.Item as Trade || null;
};

export const updateTrade = async (trade: Trade): Promise<Trade> => {
  const command = new PutCommand({
    TableName: TRADES_TABLE,
    Item: trade
  });

  await docClient.send(command);
  return trade;
};

export const deleteTrade = async (id: string): Promise<void> => {
  const command = new DeleteCommand({
    TableName: TRADES_TABLE,
    Key: { id }
  });

  await docClient.send(command);
};

export const getTradesByUserId = async (
  userId: string,
  filters?: {
    status?: TradeStatus;
    symbol?: string;
    portfolioId?: string;
  }
): Promise<Trade[]> => {
  let trades: Trade[] = [];

  if (filters?.status) {
    // Use UserStatusIndex for filtering by status
    const command = new QueryCommand({
      TableName: TRADES_TABLE,
      IndexName: 'UserStatusIndex',
      KeyConditionExpression: 'userId = :userId AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':status': filters.status
      }
    });

    const result = await docClient.send(command);
    trades = result.Items as Trade[] || [];
  } else {
    // Use UserIdIndex for all trades by user
    const command = new QueryCommand({
      TableName: TRADES_TABLE,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });

    const result = await docClient.send(command);
    trades = result.Items as Trade[] || [];
  }

  // Apply additional filters in memory
  if (filters?.symbol) {
    trades = trades.filter(trade => trade.symbol === filters.symbol);
  }

  if (filters?.portfolioId) {
    trades = trades.filter(trade => trade.portfolioId === filters.portfolioId);
  }

  return trades;
};

export const getAllTrades = async (
  filters?: {
    status?: TradeStatus;
    symbol?: string;
    portfolioId?: string;
  }
): Promise<Trade[]> => {
  const command = new ScanCommand({
    TableName: TRADES_TABLE
  });

  const result = await docClient.send(command);
  let trades = result.Items as Trade[] || [];

  // Apply filters
  if (filters?.status) {
    trades = trades.filter(trade => trade.status === filters.status);
  }

  if (filters?.symbol) {
    trades = trades.filter(trade => trade.symbol === filters.symbol);
  }

  if (filters?.portfolioId) {
    trades = trades.filter(trade => trade.portfolioId === filters.portfolioId);
  }

  return trades;
};
