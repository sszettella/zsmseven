# Portfolio & Positions API

TypeScript Lambda-based API for managing investment portfolios and positions (equity holdings).

## Overview

This API provides endpoints for:
- **Portfolios**: Collections of equity positions with metadata
- **Positions**: Stock/ETF holdings with shares, cost basis, and performance tracking

Portfolios can be associated with options trades (managed by the options-trades-api) for organizational purposes.

## API Endpoints

### Portfolios

- `GET /api/portfolios` - List all portfolios for authenticated user
- `GET /api/portfolios/:id` - Get portfolio by ID (with optional positions, metrics, trades)
- `POST /api/portfolios` - Create a new portfolio
- `PUT /api/portfolios/:id` - Update a portfolio
- `DELETE /api/portfolios/:id` - Delete a portfolio (cascade delete positions)

### Positions

- `GET /api/portfolios/:portfolioId/positions` - List positions in a portfolio
- `GET /api/positions/:id` - Get a position by ID
- `POST /api/portfolios/:portfolioId/positions` - Create a new position
- `PUT /api/positions/:id` - Update a position
- `DELETE /api/positions/:id` - Delete a position
- `PATCH /api/portfolios/:portfolioId/positions/prices` - Batch update position prices

## Data Models

### Portfolio
```typescript
{
  id: string;              // UUID
  userId: string;          // Owner's user ID
  name: string;            // Portfolio name (unique per user)
  description?: string;    // Optional description
  isActive: boolean;       // Active status (default: true)
  isDefault: boolean;      // Default portfolio flag (only one per user)
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

### Position
```typescript
{
  id: string;              // UUID
  portfolioId: string;     // Parent portfolio ID
  ticker: string;          // Stock ticker (uppercase)
  shares: number;          // Number of shares (can be fractional)
  costBasis: number;       // Total cost basis in dollars
  averageCost: number;     // SERVER CALCULATED: costBasis / shares
  currentPrice?: number;   // Current market price per share
  marketValue?: number;    // SERVER CALCULATED: shares × currentPrice
  unrealizedPL?: number;   // SERVER CALCULATED: marketValue - costBasis
  notes?: string;          // Optional notes
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

## Key Features

### Server-Side Calculations
The API automatically calculates:
- **Average Cost**: `costBasis / shares`
- **Market Value**: `shares × currentPrice` (when price available)
- **Unrealized P&L**: `marketValue - costBasis` (when price available)

### Default Portfolio
- Only one portfolio per user can be marked as default
- Setting a portfolio as default automatically unsets others
- Useful for quickly associating trades without manual selection

### Cascade Deletion
- Deleting a portfolio automatically deletes all positions
- Associated trades have their `portfolioId` set to `null` (not deleted)

### Unique Constraints
- Portfolio names must be unique per user
- Tickers must be unique within a portfolio

## Development

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```

### Deploy
```bash
# Deploy to dev
npm run deploy:dev

# Deploy to prod
npm run deploy:prod
```

### Local Testing
```bash
serverless offline
```

## Environment Variables

- `PORTFOLIOS_TABLE` - DynamoDB table name for portfolios
- `POSITIONS_TABLE` - DynamoDB table name for positions
- `TRADES_TABLE` - DynamoDB table name for options trades
- `JWT_SECRET` - Secret key for JWT verification

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## CORS

All endpoints are configured with CORS:
- Origin: `*`
- Headers: `Content-Type, Authorization`
- Methods: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
