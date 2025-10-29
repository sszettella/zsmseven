# Portfolio API Endpoint Mapping

This document maps the specification endpoints to the implementation files.

## Portfolio Endpoints

| Spec # | Method | Path | Handler File | Status |
|--------|--------|------|--------------|--------|
| 1 | GET | `/portfolios` | `listPortfolios.ts` | ✅ Implemented |
| 2 | GET | `/portfolios/:id` | `getPortfolio.ts` | ✅ Implemented |
| 3 | POST | `/portfolios` | `createPortfolio.ts` | ✅ Implemented |
| 4 | PUT | `/portfolios/:id` | `updatePortfolio.ts` | ✅ Implemented |
| 5 | DELETE | `/portfolios/:id` | `deletePortfolio.ts` | ✅ Implemented |

## Position Endpoints

| Spec # | Method | Path | Handler File | Status |
|--------|--------|------|--------------|--------|
| 6 | GET | `/portfolios/:portfolioId/positions` | `listPositions.ts` | ✅ Implemented |
| 7 | GET | `/positions/:id` | `getPosition.ts` | ✅ Implemented |
| 8 | POST | `/portfolios/:portfolioId/positions` | `createPosition.ts` | ✅ Implemented |
| 9 | PUT | `/positions/:id` | `updatePosition.ts` | ✅ Implemented |
| 10 | DELETE | `/positions/:id` | `deletePosition.ts` | ✅ Implemented |
| 11 | PATCH | `/portfolios/:portfolioId/positions/prices` | `updatePositionPrices.ts` | ✅ Implemented |

## Trade Endpoints

The specification includes trade endpoints (#12-17), but these are already implemented in the existing `options-trades-api` service. The portfolio API integrates with the trades API by:
- Reading trades via `getTradesByPortfolioId()` in DynamoDB utility
- Calculating associated trade metrics for portfolio summaries
- Unsetting `portfolioId` when a portfolio is deleted (trades remain but become unassigned)

## Features Implemented

### Spec Requirements ✅
- [x] All 17 API endpoints (11 in portfolio-api, 6 already exist in options-trades-api)
- [x] Portfolio CRUD operations
- [x] Position CRUD operations
- [x] Batch price updates
- [x] Server-side calculations (averageCost, marketValue, unrealizedPL)
- [x] Portfolio metrics (totalMarketValue, topGainer, topLoser)
- [x] Associated trades summary
- [x] JWT authentication
- [x] User ownership validation
- [x] Default portfolio management (only one per user)
- [x] Cascade deletion (positions deleted with portfolio)
- [x] Unique constraints (portfolio names, tickers)
- [x] CORS configuration
- [x] Error handling with proper status codes
- [x] Request validation

### DynamoDB Tables ✅
- [x] Portfolios table with GSIs (UserIdIndex, UserNameIndex)
- [x] Positions table with GSIs (PortfolioIdIndex, PortfolioTickerIndex)
- [x] Integration with existing Trades table

### Calculations ✅
- [x] Position.averageCost = costBasis / shares
- [x] Position.marketValue = shares × currentPrice
- [x] Position.unrealizedPL = marketValue - costBasis
- [x] Portfolio.totalMarketValue (sum of all positions)
- [x] Portfolio.totalUnrealizedPL (sum of all positions)
- [x] Portfolio.totalUnrealizedPLPercent
- [x] Portfolio.topGainer (highest unrealized P&L %)
- [x] Portfolio.topLoser (lowest unrealized P&L %)

## Implementation Details

### serverless.yml Configuration
```yaml
service: zsmseven-portfolio-api
runtime: nodejs20.x
stage: dev/prod
```

### Environment Variables
- `PORTFOLIOS_TABLE`: portfolios-${stage}
- `POSITIONS_TABLE`: positions-${stage}
- `TRADES_TABLE`: options-trades-${stage}
- `JWT_SECRET`: (shared with other APIs)

### Lambda Functions
All 11 handlers are configured in `serverless.yml` with:
- HTTP event triggers
- CORS settings
- IAM permissions for DynamoDB access

### DynamoDB Access Patterns
- Query portfolios by userId (UserIdIndex)
- Query portfolios by userId + name (UserNameIndex)
- Query positions by portfolioId (PortfolioIdIndex)
- Query positions by portfolioId + ticker (PortfolioTickerIndex)
- Query trades by portfolioId (PortfolioIdIndex - in trades table)

## Deployment

```bash
cd portfolio-api
npm install
npm run build
npm run deploy:dev   # Deploy to development
npm run deploy:prod  # Deploy to production
```

## Testing

### Authentication Required
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Example Requests

#### Create Portfolio
```bash
curl -X POST https://api.example.com/api/portfolios \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Long-Term Holdings",
    "description": "Core equity positions",
    "isActive": true,
    "isDefault": true
  }'
```

#### Create Position
```bash
curl -X POST https://api.example.com/api/portfolios/{portfolioId}/positions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "shares": 100,
    "costBasis": 15000.00,
    "currentPrice": 175.50,
    "notes": "Added during tech dip"
  }'
```

#### Get Portfolio with Full Data
```bash
curl -X GET "https://api.example.com/api/portfolios/{id}?includePositions=true&includeMetrics=true&includeTrades=true" \
  -H "Authorization: Bearer <token>"
```

#### Batch Update Prices
```bash
curl -X PATCH https://api.example.com/api/portfolios/{portfolioId}/positions/prices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [
      { "ticker": "AAPL", "currentPrice": 175.50 },
      { "ticker": "GOOGL", "currentPrice": 140.25 },
      { "ticker": "MSFT", "currentPrice": 415.80 }
    ]
  }'
```

## Summary

✅ **11 handlers implemented** covering all Portfolio and Position endpoints
✅ **Consistent with existing APIs** (users-api, options-trades-api)
✅ **Full specification compliance** with all required features
✅ **Ready for deployment** - builds successfully, no errors
