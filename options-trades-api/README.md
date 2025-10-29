# Options Trades API

RESTful API for managing options trades with an open/close transaction model. Built with TypeScript, AWS Lambda, and DynamoDB.

## Features

- **Open/Close Model**: Trades have opening and optional closing transactions
- **Automatic Calculations**: Server-side calculation of costs and profit/loss
- **Action Pairing**: Validates correct pairing of opening and closing actions
- **JWT Authentication**: Secure authentication using JWT tokens
- **Role-Based Access**: User and Admin roles with appropriate permissions
- **Portfolio Support**: Optional portfolio organization for trades

## API Endpoints

### GET /api/trades
Get all trades for authenticated user (or all trades if admin).

**Query Parameters:**
- `status` (optional): Filter by "open" or "closed"
- `symbol` (optional): Filter by stock symbol
- `portfolioId` (optional): Filter by portfolio UUID

### GET /api/trades/open
Get only open trades for authenticated user.

**Query Parameters:**
- `openAction` (optional): Filter by "buy_to_open" or "sell_to_open"
- `symbol` (optional): Filter by stock symbol

### GET /api/trades/:id
Get a specific trade by ID. User must own the trade or be admin.

### POST /api/trades
Create a new trade (opening transaction only).

**Required Fields:**
- `symbol`: Stock ticker (1-10 chars, uppercase)
- `optionType`: "call" or "put"
- `strikePrice`: Strike price (> 0)
- `expirationDate`: ISO date (YYYY-MM-DD)
- `openAction`: "buy_to_open" or "sell_to_open"
- `openQuantity`: Number of contracts (positive integer)
- `openPremium`: Premium per share (≥ 0.01)
- `openCommission`: Commission (≥ 0)
- `openTradeDate`: ISO date (YYYY-MM-DD)

**Optional Fields:**
- `portfolioId`: Portfolio UUID
- `notes`: Trade notes (max 1000 chars)

### PUT /api/trades/:id/close
Close an open trade by adding closing transaction.

**Required Fields:**
- `closeAction`: "buy_to_close" or "sell_to_close" (must pair with openAction)
- `closePremium`: Premium per share (≥ 0.01)
- `closeCommission`: Commission (≥ 0)
- `closeTradeDate`: ISO date (YYYY-MM-DD)

**Action Pairing Rules:**
- `buy_to_open` must close with `sell_to_close`
- `sell_to_open` must close with `buy_to_close`

### PUT /api/trades/:id
Update an open trade. Cannot update closed trades.

**Allowed Updates:**
- Trade specification (symbol, optionType, strikePrice, expirationDate)
- Opening transaction details
- Portfolio assignment
- Notes

### DELETE /api/trades/:id
Delete a trade (open or closed). User must own the trade or be admin.

## Data Model

### Trade Object
```typescript
{
  id: string;                    // UUID
  userId: string;                // Owner UUID
  portfolioId?: string;          // Optional portfolio UUID

  // Trade Specification
  symbol: string;                // Stock ticker
  optionType: "call" | "put";
  strikePrice: number;
  expirationDate: string;        // YYYY-MM-DD

  // Opening Transaction
  openAction: "buy_to_open" | "sell_to_open";
  openQuantity: number;
  openPremium: number;
  openCommission: number;
  openTradeDate: string;         // YYYY-MM-DD
  openTotalCost: number;         // SERVER-CALCULATED

  // Closing Transaction (null when open)
  closeAction?: "buy_to_close" | "sell_to_close";
  closeQuantity?: number;
  closePremium?: number;
  closeCommission?: number;
  closeTradeDate?: string;       // YYYY-MM-DD
  closeTotalCost?: number;       // SERVER-CALCULATED

  // Status and Performance
  status: "open" | "closed";
  profitLoss?: number;           // SERVER-CALCULATED (when closed)

  // Metadata
  notes?: string;
  createdAt: string;             // ISO datetime
  updatedAt: string;             // ISO datetime
}
```

## Server-Side Calculations

### Opening Total Cost
```
BUY_TO_OPEN:  (premium × quantity × 100) + commission  [debit]
SELL_TO_OPEN: (premium × quantity × 100) - commission  [credit]
```

### Closing Total Cost
```
SELL_TO_CLOSE: (premium × quantity × 100) - commission  [credit]
BUY_TO_CLOSE:  (premium × quantity × 100) + commission  [debit]
```

### Profit/Loss (when closed)
```
Long Position (BUY_TO_OPEN):  closeTotalCost - openTotalCost
Short Position (SELL_TO_OPEN): openTotalCost - closeTotalCost
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <token>
```

The JWT payload must include:
- `userId`: User's UUID
- `email`: User's email
- `role`: "user" or "admin"

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Request validation failed
- `TRADE_ALREADY_CLOSED`: Attempting to close an already closed trade
- `INVALID_CLOSING_ACTION`: Closing action doesn't pair with opening action
- `TRADE_CLOSED`: Attempting to update a closed trade

## Deployment

### Prerequisites
- Node.js 20.x
- AWS CLI configured
- Serverless Framework

### Environment Variables
- `JWT_SECRET`: Secret for JWT verification (default: dev key)
- `TRADES_TABLE`: DynamoDB table name (auto-set by stage)
- `USERS_TABLE`: Users table name (auto-set by stage)

### Deploy Commands
```bash
# Install dependencies
npm install

# Deploy to dev
npm run deploy:dev

# Deploy to prod
npm run deploy:prod
```

## Database

### DynamoDB Table: options-trades-{stage}

**Indexes:**
- `UserIdIndex`: Query all trades by userId
- `UserStatusIndex`: Query trades by userId and status
- `SymbolIndex`: Query trades by symbol
- `PortfolioIdIndex`: Query trades by portfolioId

## Development

### Build
```bash
npm run build
```

### Local Testing
```bash
serverless offline
```

## Project Structure
```
options-trades-api/
├── src/
│   ├── handlers/          # Lambda function handlers
│   │   ├── closeTrade.ts
│   │   ├── createTrade.ts
│   │   ├── deleteTrade.ts
│   │   ├── getTrade.ts
│   │   ├── listOpenTrades.ts
│   │   ├── listTrades.ts
│   │   └── updateTrade.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   └── utils/             # Utility modules
│       ├── calculations.ts
│       ├── dynamodb.ts
│       ├── jwt.ts
│       ├── response.ts
│       └── validation.ts
├── package.json
├── serverless.yml
└── tsconfig.json
```
