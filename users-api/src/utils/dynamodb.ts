import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
      ':email': email.toLowerCase()
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

export const getAllUsers = async (): Promise<User[]> => {
  console.log('[DYNAMODB] getAllUsers - Table:', USERS_TABLE);

  const command = new ScanCommand({
    TableName: USERS_TABLE
  });

  try {
    const response = await docClient.send(command);
    console.log('[DYNAMODB] getAllUsers - Users found:', response.Items?.length || 0);
    return (response.Items || []) as User[];
  } catch (error) {
    console.error('[DYNAMODB] getAllUsers - Error:', error);
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
    throw error;
  }
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User> => {
  console.log('[DYNAMODB] updateUser - Table:', USERS_TABLE, 'ID:', id);
  console.log('[DYNAMODB] updateUser - Updates:', updates);

  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  // Always update updatedAt
  updates.updatedAt = new Date().toISOString();

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id') {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  if (updateExpressions.length === 0) {
    throw new Error('No valid fields to update');
  }

  const command = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { id },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(id)',
    ReturnValues: 'ALL_NEW'
  });

  try {
    const response = await docClient.send(command);
    console.log('[DYNAMODB] updateUser - Success');
    return response.Attributes as User;
  } catch (error) {
    console.error('[DYNAMODB] updateUser - Error:', error);
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  console.log('[DYNAMODB] deleteUser - Table:', USERS_TABLE, 'ID:', id);

  const command = new DeleteCommand({
    TableName: USERS_TABLE,
    Key: { id },
    ConditionExpression: 'attribute_exists(id)'
  });

  try {
    await docClient.send(command);
    console.log('[DYNAMODB] deleteUser - Success');
  } catch (error) {
    console.error('[DYNAMODB] deleteUser - Error:', error);
    throw error;
  }
};

export const userToResponse = (user: User) => {
  const { passwordHash, ...userResponse } = user;
  return userResponse;
};
