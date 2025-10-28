import { APIResponse } from '../types';

export const createResponse = <T>(
  statusCode: number,
  data: T,
  headers: Record<string, any> = {}
): APIResponse<T> => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    },
    body: JSON.stringify(data)
  };
};

export const createSuccessResponse = <T>(data: T, statusCode: number = 200): APIResponse<T> => {
  return createResponse(statusCode, data);
};

export const createCreatedResponse = <T>(data: T): APIResponse<T> => {
  return createResponse(201, data);
};

export const createErrorResponse = (message: string, statusCode: number = 400): APIResponse => {
  return createResponse(statusCode, { error: message });
};
