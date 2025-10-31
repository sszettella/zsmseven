export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  portfolioId: string;
  ticker: string;
  shares: number;
  costBasis: number;
  averageCost: number;
  currentPrice?: number;
  marketValue?: number;
  unrealizedPL?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface CreatePositionRequest {
  ticker: string;
  shares: number;
  costBasis: number;
  currentPrice?: number;
  notes?: string;
}

export interface UpdatePositionRequest {
  ticker?: string;
  shares?: number;
  costBasis?: number;
  currentPrice?: number;
  notes?: string;
}

export interface UpdatePricesRequest {
  prices: Array<{
    ticker: string;
    currentPrice: number;
  }>;
}

export interface PortfolioMetrics {
  totalPositions: number;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  topGainer?: {
    ticker: string;
    unrealizedPLPercent: number;
  };
  topLoser?: {
    ticker: string;
    unrealizedPLPercent: number;
  };
}

export interface AssociatedTrades {
  openCount: number;
  closedCount: number;
  totalProfitLoss: number;
}

export interface PortfolioSummary {
  portfolio: Portfolio;
  positions: Position[];
  metrics: PortfolioMetrics;
  associatedTrades?: AssociatedTrades;
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

export interface PortfolioAnalysis {
  portfolioId: string;
  timestamp: string;
  portfolioName: string;
  analysis: string;
  parsed_data?: string;
  prompt?: string;
  model: string;
  dataAsOf: string;
  error?: string;
}
