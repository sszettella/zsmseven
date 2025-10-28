export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface LoginResponse {
  user: UserResponse;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface LogoutResponse {
  message: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface APIResponse<T = any> {
  statusCode: number;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials'?: boolean | string;
    'Access-Control-Allow-Headers'?: string;
    'Access-Control-Allow-Methods'?: string;
    [key: string]: any;
  };
  body: string;
}
