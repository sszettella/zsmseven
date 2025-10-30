export enum TradeStatus {
  OPEN = 'open',
  CLOSED = 'closed'
}

export enum OpeningAction {
  BUY_TO_OPEN = 'buy_to_open',
  SELL_TO_OPEN = 'sell_to_open'
}

export enum ClosingAction {
  BUY_TO_CLOSE = 'buy_to_close',
  SELL_TO_CLOSE = 'sell_to_close'
}

export enum OptionType {
  CALL = 'call',
  PUT = 'put'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface Trade {
  // Identifiers
  id: string;
  userId: string;
  portfolioId?: string;

  // Trade Specification
  symbol: string;
  optionType: OptionType;
  strikePrice: number;
  expirationDate: string;

  // Opening Transaction
  openAction: OpeningAction;
  openQuantity: number;
  openPremium: number;
  openCommission: number;
  openTradeDate: string;
  openTotalCost: number;

  // Closing Transaction (nullable)
  closeAction?: ClosingAction;
  closeQuantity?: number;
  closePremium?: number;
  closeCommission?: number;
  closeTradeDate?: string;
  closeTotalCost?: number;

  // Status and Performance
  status: TradeStatus;
  profitLoss?: number;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTradeRequest {
  portfolioId?: string;
  symbol: string;
  optionType: OptionType;
  strikePrice: number;
  expirationDate: string;
  openAction: OpeningAction;
  openQuantity: number;
  openPremium: number;
  openCommission: number;
  openTradeDate: string;
  notes?: string;
}

export interface UpdateTradeRequest {
  portfolioId?: string | null;
  symbol?: string;
  optionType?: OptionType;
  strikePrice?: number;
  expirationDate?: string;
  openAction?: OpeningAction;
  openQuantity?: number;
  openPremium?: number;
  openCommission?: number;
  openTradeDate?: string;
  notes?: string;
  // Closing transaction fields (for updating closed trades)
  closeAction?: ClosingAction;
  closePremium?: number;
  closeCommission?: number;
  closeTradeDate?: string;
}

export interface CloseTradeRequest {
  closeAction: ClosingAction;
  closePremium: number;
  closeCommission: number;
  closeTradeDate: string;
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
