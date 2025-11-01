# Portfolio API Specification

## Overview

The Portfolio API provides endpoints for managing investment portfolios, positions, and accessing AI-generated portfolio analysis. All endpoints require JWT authentication.

**Base URL:** `https://api.example.com/api/portfolios`

**Authentication:** All endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Table of Contents

1. [Portfolio Endpoints](#portfolio-endpoints)
2. [Position Endpoints](#position-endpoints)
3. [Analysis Endpoints](#analysis-endpoints)
4. [Data Models](#data-models)
5. [Error Responses](#error-responses)

---

## Portfolio Endpoints

### 1. List Portfolios

Get all portfolios for the authenticated user.

**Endpoint:** `GET /`

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:** `200 OK`
```json
[
  {
    "id": "portfolio_abc123",
    "userId": "user_xyz789",
    "name": "Long-Term Holdings",
    "description": "Core equity positions",
    "isActive": true,
    "isDefault": true,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

---

### 2. Get Portfolio

Get a specific portfolio by ID with optional detailed information.

**Endpoint:** `GET /{portfolioId}`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID

**Query Parameters:**
- `includePositions` (boolean, optional) - Include all positions in the response
- `includeMetrics` (boolean, optional) - Include calculated metrics (totals, top gainer/loser)
- `includeTrades` (boolean, optional) - Include associated trades summary

**Example:** `GET /portfolio_abc123?includePositions=true&includeMetrics=true`

**Response:** `200 OK`
```json
{
  "portfolio": {
    "id": "portfolio_abc123",
    "userId": "user_xyz789",
    "name": "Long-Term Holdings",
    "description": "Core equity positions",
    "isActive": true,
    "isDefault": true,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "positions": [
    {
      "id": "position_def456",
      "portfolioId": "portfolio_abc123",
      "ticker": "AAPL",
      "shares": 100,
      "costBasis": 15000.00,
      "averageCost": 150.00,
      "currentPrice": 175.50,
      "marketValue": 17550.00,
      "unrealizedPL": 2550.00,
      "notes": "Added during tech dip",
      "createdAt": "2025-01-15T10:35:00Z",
      "updatedAt": "2025-01-20T14:20:00Z"
    }
  ],
  "metrics": {
    "totalPositions": 1,
    "totalMarketValue": 17550.00,
    "totalCostBasis": 15000.00,
    "totalUnrealizedPL": 2550.00,
    "totalUnrealizedPLPercent": 17.00,
    "topGainer": {
      "ticker": "AAPL",
      "unrealizedPLPercent": 17.00
    }
  },
  "associatedTrades": {
    "openCount": 3,
    "closedCount": 12,
    "totalProfitLoss": 5420.50
  }
}
```

**Errors:**
- `404 NOT_FOUND` - Portfolio not found
- `403 FORBIDDEN` - Portfolio belongs to different user

---

### 3. Get Default Portfolio

Get the user's default portfolio with optional detailed information.

**Endpoint:** `GET /default`

**Query Parameters:**
- `includePositions` (boolean, optional) - Include all positions
- `includeMetrics` (boolean, optional) - Include calculated metrics
- `includeTrades` (boolean, optional) - Include associated trades summary

**Response:** `200 OK` (same structure as Get Portfolio)

**Errors:**
- `404 NOT_FOUND` - No default portfolio found

---

### 4. Create Portfolio

Create a new portfolio for the authenticated user.

**Endpoint:** `POST /`

**Request Body:**
```json
{
  "name": "Long-Term Holdings",
  "description": "Core equity positions",
  "isActive": true,
  "isDefault": true
}
```

**Fields:**
- `name` (string, required) - Portfolio name (must be unique per user)
- `description` (string, optional) - Portfolio description
- `isActive` (boolean, optional, default: true) - Whether portfolio is active
- `isDefault` (boolean, optional, default: false) - Whether this is the default portfolio

**Response:** `201 Created`
```json
{
  "id": "portfolio_abc123",
  "userId": "user_xyz789",
  "name": "Long-Term Holdings",
  "description": "Core equity positions",
  "isActive": true,
  "isDefault": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Errors:**
- `400 BAD_REQUEST` - Invalid request body or duplicate portfolio name
- `409 CONFLICT` - Portfolio with this name already exists

---

### 5. Update Portfolio

Update an existing portfolio.

**Endpoint:** `PUT /{portfolioId}`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Portfolio Name",
  "description": "Updated description",
  "isActive": false,
  "isDefault": true
}
```

**Response:** `200 OK`
```json
{
  "id": "portfolio_abc123",
  "userId": "user_xyz789",
  "name": "Updated Portfolio Name",
  "description": "Updated description",
  "isActive": false,
  "isDefault": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T15:45:00Z"
}
```

**Errors:**
- `404 NOT_FOUND` - Portfolio not found
- `403 FORBIDDEN` - Portfolio belongs to different user
- `409 CONFLICT` - Portfolio name already in use

---

### 6. Delete Portfolio

Delete a portfolio and all its positions.

**Endpoint:** `DELETE /{portfolioId}`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID

**Response:** `200 OK`
```json
{
  "message": "Portfolio and 5 associated positions deleted successfully"
}
```

**Errors:**
- `404 NOT_FOUND` - Portfolio not found
- `403 FORBIDDEN` - Portfolio belongs to different user

**Note:** Deleting a portfolio will:
- Delete all positions associated with the portfolio
- Unset `portfolioId` on any associated trades (trades remain but become unassigned)

---

## Position Endpoints

### 7. List Positions

Get all positions for a specific portfolio.

**Endpoint:** `GET /{portfolioId}/positions`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID

**Response:** `200 OK`
```json
[
  {
    "id": "position_def456",
    "portfolioId": "portfolio_abc123",
    "ticker": "AAPL",
    "shares": 100,
    "costBasis": 15000.00,
    "averageCost": 150.00,
    "currentPrice": 175.50,
    "marketValue": 17550.00,
    "unrealizedPL": 2550.00,
    "notes": "Added during tech dip",
    "createdAt": "2025-01-15T10:35:00Z",
    "updatedAt": "2025-01-20T14:20:00Z"
  }
]
```

**Errors:**
- `404 NOT_FOUND` - Portfolio not found
- `403 FORBIDDEN` - Portfolio belongs to different user

---

### 8. Get Position

Get a specific position by ID.

**Endpoint:** `GET /{portfolioId}/positions/{positionId}`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID
- `positionId` (string, required) - The position ID

**Response:** `200 OK`
```json
{
  "id": "position_def456",
  "portfolioId": "portfolio_abc123",
  "ticker": "AAPL",
  "shares": 100,
  "costBasis": 15000.00,
  "averageCost": 150.00,
  "currentPrice": 175.50,
  "marketValue": 17550.00,
  "unrealizedPL": 2550.00,
  "notes": "Added during tech dip",
  "createdAt": "2025-01-15T10:35:00Z",
  "updatedAt": "2025-01-20T14:20:00Z"
}
```

**Errors:**
- `404 NOT_FOUND` - Position or portfolio not found
- `403 FORBIDDEN` - Position belongs to different user's portfolio

---

### 9. Create Position

Create a new position in a portfolio.

**Endpoint:** `POST /{portfolioId}/positions`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID

**Request Body:**
```json
{
  "ticker": "AAPL",
  "shares": 100,
  "costBasis": 15000.00,
  "currentPrice": 175.50,
  "notes": "Added during tech dip"
}
```

**Fields:**
- `ticker` (string, required) - Stock ticker symbol (must be unique per portfolio)
- `shares` (number, required) - Number of shares
- `costBasis` (number, required) - Total cost basis
- `currentPrice` (number, optional) - Current price per share
- `notes` (string, optional) - Additional notes

**Response:** `201 Created`
```json
{
  "id": "position_def456",
  "portfolioId": "portfolio_abc123",
  "ticker": "AAPL",
  "shares": 100,
  "costBasis": 15000.00,
  "averageCost": 150.00,
  "currentPrice": 175.50,
  "marketValue": 17550.00,
  "unrealizedPL": 2550.00,
  "notes": "Added during tech dip",
  "createdAt": "2025-01-15T10:35:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

**Server-side Calculations:**
- `averageCost = costBasis / shares`
- `marketValue = shares × currentPrice` (if currentPrice provided)
- `unrealizedPL = marketValue - costBasis` (if marketValue calculated)

**Errors:**
- `404 NOT_FOUND` - Portfolio not found
- `403 FORBIDDEN` - Portfolio belongs to different user
- `409 CONFLICT` - Position with this ticker already exists in portfolio

---

### 10. Update Position

Update an existing position.

**Endpoint:** `PUT /{portfolioId}/positions/{positionId}`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID
- `positionId` (string, required) - The position ID

**Request Body:** (all fields optional)
```json
{
  "ticker": "AAPL",
  "shares": 150,
  "costBasis": 22500.00,
  "currentPrice": 180.25,
  "notes": "Increased position"
}
```

**Response:** `200 OK`
```json
{
  "id": "position_def456",
  "portfolioId": "portfolio_abc123",
  "ticker": "AAPL",
  "shares": 150,
  "costBasis": 22500.00,
  "averageCost": 150.00,
  "currentPrice": 180.25,
  "marketValue": 27037.50,
  "unrealizedPL": 4537.50,
  "notes": "Increased position",
  "createdAt": "2025-01-15T10:35:00Z",
  "updatedAt": "2025-01-22T09:15:00Z"
}
```

**Errors:**
- `404 NOT_FOUND` - Position or portfolio not found
- `403 FORBIDDEN` - Position belongs to different user's portfolio
- `409 CONFLICT` - Ticker already in use by another position in this portfolio

---

### 11. Delete Position

Delete a position from a portfolio.

**Endpoint:** `DELETE /{portfolioId}/positions/{positionId}`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID
- `positionId` (string, required) - The position ID

**Response:** `200 OK`
```json
{
  "message": "Position deleted successfully"
}
```

**Errors:**
- `404 NOT_FOUND` - Position or portfolio not found
- `403 FORBIDDEN` - Position belongs to different user's portfolio

---

### 12. Batch Update Position Prices

Update current prices for multiple positions in a portfolio at once.

**Endpoint:** `PATCH /{portfolioId}/positions/prices`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID

**Request Body:**
```json
{
  "prices": [
    { "ticker": "AAPL", "currentPrice": 175.50 },
    { "ticker": "GOOGL", "currentPrice": 140.25 },
    { "ticker": "MSFT", "currentPrice": 415.80 }
  ]
}
```

**Fields:**
- `prices` (array, required) - Array of price updates
  - `ticker` (string, required) - Stock ticker symbol
  - `currentPrice` (number, required) - New current price

**Response:** `200 OK`
```json
{
  "message": "Prices updated successfully",
  "updated": 3,
  "skipped": ["TSLA"],
  "positions": [
    {
      "id": "position_def456",
      "portfolioId": "portfolio_abc123",
      "ticker": "AAPL",
      "shares": 100,
      "costBasis": 15000.00,
      "averageCost": 150.00,
      "currentPrice": 175.50,
      "marketValue": 17550.00,
      "unrealizedPL": 2550.00,
      "createdAt": "2025-01-15T10:35:00Z",
      "updatedAt": "2025-01-23T16:00:00Z"
    }
  ]
}
```

**Notes:**
- Only positions that exist in the portfolio will be updated
- Non-existent tickers are silently skipped
- Market value and unrealized P&L are recalculated automatically

**Errors:**
- `404 NOT_FOUND` - Portfolio not found
- `403 FORBIDDEN` - Portfolio belongs to different user

---

## Analysis Endpoints

### 13. Get Portfolio Analysis

Retrieve AI-generated analysis for a specific portfolio. The analysis is generated asynchronously by a separate process and stored in the `portfolio-analyses` DynamoDB table.

**Endpoint:** `GET /{portfolioId}/analysis`

**Path Parameters:**
- `portfolioId` (string, required) - The portfolio ID

**Query Parameters:**
- `limit` (number, optional, default: 1) - Number of analyses to return (sorted by most recent first)
- `includeDetails` (boolean, optional, default: false) - Include full analysis text and prompt

**Example:** `GET /portfolio_abc123/analysis?limit=1&includeDetails=true`

**Response (with includeDetails=false):** `200 OK`
```json
{
  "portfolioId": "portfolio_abc123",
  "timestamp": "2025-01-23T18:30:00Z",
  "portfolioName": "Long-Term Holdings",
  "model": "claude-3-sonnet-20240229",
  "dataAsOf": "2025-01-23T18:00:00Z",
  "parsed_data": {
    "summary": {
      "total_value": 142500.50,
      "total_pl": 12450.25,
      "pl_percentage": 9.58,
      "risk_level": "moderate"
    },
    "top_positions": [
      {
        "ticker": "AAPL",
        "weight_percent": 35.2,
        "pl_percent": 17.0
      }
    ],
    "recommendations": [
      "Consider diversifying tech exposure",
      "Monitor concentration risk in top 3 positions"
    ]
  }
}
```

**Response (with includeDetails=true):** `200 OK`
```json
{
  "portfolioId": "portfolio_abc123",
  "timestamp": "2025-01-23T18:30:00Z",
  "portfolioName": "Long-Term Holdings",
  "model": "claude-3-sonnet-20240229",
  "dataAsOf": "2025-01-23T18:00:00Z",
  "analysis": "Based on the current portfolio composition, here is a detailed analysis...\n\nStrengths:\n- Strong diversification across sectors\n- Healthy unrealized gains\n\nRisks:\n- High concentration in technology sector (45%)\n- Limited exposure to defensive sectors\n\nRecommendations:\n1. Consider rebalancing to reduce tech concentration\n2. Add defensive positions for downside protection",
  "prompt": "Analyze this portfolio and provide insights on diversification, risk, and recommendations...",
  "parsed_data": {
    "summary": {
      "total_value": 142500.50,
      "total_pl": 12450.25,
      "pl_percentage": 9.58,
      "risk_level": "moderate"
    },
    "top_positions": [
      {
        "ticker": "AAPL",
        "weight_percent": 35.2,
        "pl_percent": 17.0
      }
    ],
    "recommendations": [
      "Consider diversifying tech exposure",
      "Monitor concentration risk in top 3 positions"
    ]
  }
}
```

**Response (with limit > 1):** `200 OK`
```json
[
  {
    "portfolioId": "portfolio_abc123",
    "timestamp": "2025-01-23T18:30:00Z",
    "portfolioName": "Long-Term Holdings",
    "model": "claude-3-sonnet-20240229",
    "dataAsOf": "2025-01-23T18:00:00Z",
    "parsed_data": { /* ... */ }
  },
  {
    "portfolioId": "portfolio_abc123",
    "timestamp": "2025-01-22T18:30:00Z",
    "portfolioName": "Long-Term Holdings",
    "model": "claude-3-sonnet-20240229",
    "dataAsOf": "2025-01-22T18:00:00Z",
    "parsed_data": { /* ... */ }
  }
]
```

**Response Fields:**
- `portfolioId` (string) - The portfolio ID
- `timestamp` (string) - When the analysis was generated (ISO 8601)
- `portfolioName` (string) - Name of the portfolio at time of analysis
- `model` (string) - AI model used for analysis
- `dataAsOf` (string) - Timestamp of the portfolio data used for analysis
- `parsed_data` (object, optional) - Structured data extracted from analysis
- `analysis` (string, only with includeDetails=true) - Full AI-generated analysis text
- `prompt` (string, only with includeDetails=true) - The prompt used to generate the analysis
- `error` (string, optional) - Error message if analysis failed

**Errors:**
- `404 NOT_FOUND` - Portfolio not found or no analyses available for this portfolio
- `403 FORBIDDEN` - Portfolio belongs to different user
- `401 UNAUTHORIZED` - Invalid or missing authentication token

**Notes:**
- Analysis is generated asynchronously by a separate process (not through this API)
- Most recent analyses are returned first (sorted by timestamp descending)
- When `limit=1`, a single object is returned instead of an array
- The `parsed_data` field contains structured insights extracted from the full analysis text
- Set `includeDetails=true` to get the full analysis text and prompt (useful for displaying to users)

---

## Data Models

### Portfolio
```typescript
{
  id: string;                // Unique portfolio ID
  userId: string;            // Owner's user ID
  name: string;              // Portfolio name (unique per user)
  description?: string;      // Optional description
  isActive: boolean;         // Whether portfolio is active
  isDefault: boolean;        // Whether this is the user's default portfolio
  createdAt: string;         // ISO 8601 timestamp
  updatedAt: string;         // ISO 8601 timestamp
}
```

### Position
```typescript
{
  id: string;                // Unique position ID
  portfolioId: string;       // Parent portfolio ID
  ticker: string;            // Stock ticker (unique per portfolio)
  shares: number;            // Number of shares
  costBasis: number;         // Total cost basis
  averageCost: number;       // Cost per share (calculated)
  currentPrice?: number;     // Current price per share
  marketValue?: number;      // Current market value (calculated)
  unrealizedPL?: number;     // Unrealized P&L (calculated)
  notes?: string;            // Optional notes
  createdAt: string;         // ISO 8601 timestamp
  updatedAt: string;         // ISO 8601 timestamp
}
```

### Portfolio Metrics
```typescript
{
  totalPositions: number;              // Count of positions
  totalMarketValue: number;            // Sum of all position market values
  totalCostBasis: number;              // Sum of all position cost bases
  totalUnrealizedPL: number;           // Total unrealized P&L
  totalUnrealizedPLPercent: number;    // Overall P&L percentage
  topGainer?: {                        // Best performing position
    ticker: string;
    unrealizedPLPercent: number;
  };
  topLoser?: {                         // Worst performing position
    ticker: string;
    unrealizedPLPercent: number;
  };
}
```

### Associated Trades
```typescript
{
  openCount: number;           // Number of open trades
  closedCount: number;         // Number of closed trades
  totalProfitLoss: number;     // Sum of P&L from closed trades
}
```

### Portfolio Analysis
```typescript
{
  portfolioId: string;         // Portfolio ID
  timestamp: string;           // When analysis was generated
  portfolioName: string;       // Portfolio name at time of analysis
  analysis: string;            // Full AI analysis text
  parsed_data?: object;        // Structured data extracted from analysis
  prompt?: string;             // Prompt used for analysis
  model: string;               // AI model identifier
  dataAsOf: string;            // Timestamp of portfolio data
  error?: string;              // Error message if analysis failed
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Status Code | Code | Description |
|-------------|------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters or body |
| 401 | UNAUTHORIZED | Missing or invalid authentication token |
| 403 | FORBIDDEN | User doesn't have permission to access resource |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict (e.g., duplicate name) |
| 500 | INTERNAL_ERROR | Server error |

### Example Error Response

```json
{
  "error": "Portfolio not found",
  "code": "NOT_FOUND"
}
```

---

## Authentication

All endpoints require a valid JWT token obtained from the authentication service. Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The JWT payload contains:
```typescript
{
  userId: string;    // User's unique ID
  email: string;     // User's email
  role: "user" | "admin";  // User role
}
```

---

## Rate Limiting

Currently, no rate limiting is enforced, but this may be added in future versions.

---

## CORS

All endpoints support Cross-Origin Resource Sharing (CORS) with the following configuration:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Headers: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token`
- `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`

---

## Examples

### Complete Workflow Example

```bash
# 1. Create a portfolio
curl -X POST https://api.example.com/api/portfolios \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Growth",
    "description": "High-growth technology stocks",
    "isDefault": true
  }'

# Response: { "id": "portfolio_123", ... }

# 2. Add positions
curl -X POST https://api.example.com/api/portfolios/portfolio_123/positions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "shares": 100,
    "costBasis": 15000.00,
    "currentPrice": 175.50
  }'

# 3. Update prices
curl -X PATCH https://api.example.com/api/portfolios/portfolio_123/positions/prices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [
      { "ticker": "AAPL", "currentPrice": 180.00 }
    ]
  }'

# 4. Get portfolio with full details
curl -X GET "https://api.example.com/api/portfolios/portfolio_123?includePositions=true&includeMetrics=true" \
  -H "Authorization: Bearer <token>"

# 5. Get latest portfolio analysis
curl -X GET "https://api.example.com/api/portfolios/portfolio_123/analysis?includeDetails=true" \
  -H "Authorization: Bearer <token>"

# 6. Get historical analyses (last 5)
curl -X GET "https://api.example.com/api/portfolios/portfolio_123/analysis?limit=5" \
  -H "Authorization: Bearer <token>"
```

---

## Version History

- **v1.1.0** (2025-01-23) - Added Portfolio Analysis endpoint
- **v1.0.0** (2025-01-15) - Initial release with Portfolio and Position management
