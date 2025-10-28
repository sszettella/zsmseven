import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { JWTPayload } from '../types';
import jwt from 'jsonwebtoken';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const BLACKLIST_TABLE = process.env.BLACKLIST_TABLE || 'token-blacklist-dev';

interface BlacklistedToken {
  token: string;
  expiresAt: number;
  blacklistedAt: string;
  userId?: string;
}

export const blacklistToken = async (
  token: string,
  payload?: JWTPayload
): Promise<void> => {
  try {
    // Decode token to get expiration time
    const decoded = jwt.decode(token) as any;
    const expiresAt = decoded?.exp || Math.floor(Date.now() / 1000) + 3600; // Default 1 hour if no exp

    const blacklistedToken: BlacklistedToken = {
      token,
      expiresAt,
      blacklistedAt: new Date().toISOString(),
      userId: payload?.userId
    };

    const command = new PutCommand({
      TableName: BLACKLIST_TABLE,
      Item: blacklistedToken
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Failed to blacklist token:', error);
    throw error;
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const command = new GetCommand({
      TableName: BLACKLIST_TABLE,
      Key: { token }
    });

    const response = await docClient.send(command);

    if (!response.Item) {
      return false;
    }

    // Check if token has expired (can be cleaned up from blacklist)
    const blacklistedToken = response.Item as BlacklistedToken;
    const now = Math.floor(Date.now() / 1000);

    if (blacklistedToken.expiresAt < now) {
      // Token has expired naturally, no longer needs to be blacklisted
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to check token blacklist:', error);
    // On error, fail open (allow the token) to prevent lockouts
    return false;
  }
};
