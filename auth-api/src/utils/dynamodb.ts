import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { User, UserRole } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'users-dev';

export const getUserById = async (id: string): Promise<User | null> => {
  console.log('[DYNAMODB] getUserById - Table:', USERS_TABLE, 'ID:', id);

  const command = new GetCommand({
    TableName: USERS_TABLE,
    Key: { id }
  });

  try {
    const response = await docClient.send(command);
    console.log('[DYNAMODB] getUserById - Response:', response.Item ? 'User found' : 'User not found');
    return response.Item as User | null;
  } catch (error) {
    console.error('[DYNAMODB] getUserById - Error:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  console.log('[DYNAMODB] getUserByEmail - Table:', USERS_TABLE, 'Email:', email);

  const command = new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  });

  try {
    const response = await docClient.send(command);
    console.log('[DYNAMODB] getUserByEmail - Items found:', response.Items?.length || 0);

    if (!response.Items || response.Items.length === 0) {
      console.log('[DYNAMODB] getUserByEmail - No user found');
      return null;
    }

    console.log('[DYNAMODB] getUserByEmail - User found:', response.Items[0].id);
    return response.Items[0] as User;
  } catch (error) {
    console.error('[DYNAMODB] getUserByEmail - Error:', error);
    throw error;
  }
};

export const createUser = async (user: User): Promise<User> => {
  console.log('[DYNAMODB] createUser - Table:', USERS_TABLE);
  console.log('[DYNAMODB] createUser - User data:', {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    hasPassword: !!user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });

  const command = new PutCommand({
    TableName: USERS_TABLE,
    Item: user,
    ConditionExpression: 'attribute_not_exists(id)'
  });

  console.log('[DYNAMODB] createUser - Sending PutCommand to DynamoDB');
  try {
    const response = await docClient.send(command);
    console.log('[DYNAMODB] createUser - SUCCESS! Response:', JSON.stringify(response, null, 2));
    console.log('[DYNAMODB] createUser - User created successfully');
    return user;
  } catch (error) {
    console.error('[DYNAMODB] createUser - FAILED! Error:', error);
    console.error('[DYNAMODB] createUser - Error name:', (error as any).name);
    console.error('[DYNAMODB] createUser - Error message:', (error as any).message);
    console.error('[DYNAMODB] createUser - Error code:', (error as any).code);
    console.error('[DYNAMODB] createUser - Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
};

export const userToResponse = (user: User) => {
  const { passwordHash, ...userResponse } = user;
  return userResponse;
};
