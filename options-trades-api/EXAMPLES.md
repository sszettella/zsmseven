# API Request/Response Examples

## Authentication

All requests require a JWT token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 1. Create Trade (POST /)

### Request
```json
POST /
Content-Type: application/json
Authorization: Bearer {token}

{
  "portfolioId": "portfolio-uuid-123",
  "symbol": "AAPL",
  "optionType": "call",
  "strikePrice": 150.00,
  "expirationDate": "2024-03-15",
  "openAction": "buy_to_open",
  "openQuantity": 5,
  "openPremium": 3.50,
  "openCommission": 6.50,
  "openTradeDate": "2024-01-15",
  "notes": "Tech sector play"
}
```

### Response (201 Created)
```json
{
  "id": "trade-uuid-456",
  "userId": "user-uuid-789",
  "portfolioId": "portfolio-uuid-123",
  "symbol": "AAPL",
  "optionType": "call",
  "strikePrice": 150.00,
  "expirationDate": "2024-03-15",
  "openAction": "buy_to_open",
  "openQuantity": 5,
  "openPremium": 3.50,
  "openCommission": 6.50,
  "openTradeDate": "2024-01-15",
  "openTotalCost": 1756.50,
  "status": "open",
  "notes": "Tech sector play",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## 2. List All Trades (GET /)

### Request
```
GET /
Authorization: Bearer {token}
```

### Response (200 OK)
```json
[
  {
    "id": "trade-uuid-456",
    "userId": "user-uuid-789",
    "portfolioId": "portfolio-uuid-123",
    "symbol": "AAPL",
    "optionType": "call",
    "strikePrice": 150.00,
    "expirationDate": "2024-03-15",
    "openAction": "buy_to_open",
    "openQuantity": 5,
    "openPremium": 3.50,
    "openCommission": 6.50,
    "openTradeDate": "2024-01-15",
    "openTotalCost": 1756.50,
    "closeAction": "sell_to_close",
    "closeQuantity": 5,
    "closePremium": 4.25,
    "closeCommission": 6.50,
    "closeTradeDate": "2024-02-01",
    "closeTotalCost": 2118.50,
    "status": "closed",
    "profitLoss": 362.00,
    "notes": "Tech sector play",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-02-01T14:20:00.000Z"
  },
  {
    "id": "trade-uuid-999",
    "userId": "user-uuid-789",
    "symbol": "TSLA",
    "optionType": "put",
    "strikePrice": 200.00,
    "expirationDate": "2024-04-20",
    "openAction": "sell_to_open",
    "openQuantity": 10,
    "openPremium": 5.75,
    "openCommission": 8.00,
    "openTradeDate": "2024-01-20",
    "openTotalCost": 5742.00,
    "status": "open",
    "createdAt": "2024-01-20T09:00:00.000Z",
    "updatedAt": "2024-01-20T09:00:00.000Z"
  }
]
```

## 3. List Open Trades (GET /open)

### Request with Filters
```
GET /open?symbol=AAPL&openAction=buy_to_open
Authorization: Bearer {token}
```

### Response (200 OK)
```json
[
  {
    "id": "trade-uuid-111",
    "userId": "user-uuid-789",
    "symbol": "AAPL",
    "optionType": "call",
    "strikePrice": 175.00,
    "expirationDate": "2024-05-17",
    "openAction": "buy_to_open",
    "openQuantity": 3,
    "openPremium": 8.25,
    "openCommission": 5.00,
    "openTradeDate": "2024-02-10",
    "openTotalCost": 2480.00,
    "status": "open",
    "createdAt": "2024-02-10T11:30:00.000Z",
    "updatedAt": "2024-02-10T11:30:00.000Z"
  }
]
```

## 4. Get Specific Trade (GET /:id)

### Request
```
GET /trade-uuid-456
Authorization: Bearer {token}
```

### Response (200 OK)
```json
{
  "id": "trade-uuid-456",
  "userId": "user-uuid-789",
  "portfolioId": "portfolio-uuid-123",
  "symbol": "AAPL",
  "optionType": "call",
  "strikePrice": 150.00,
  "expirationDate": "2024-03-15",
  "openAction": "buy_to_open",
  "openQuantity": 5,
  "openPremium": 3.50,
  "openCommission": 6.50,
  "openTradeDate": "2024-01-15",
  "openTotalCost": 1756.50,
  "status": "open",
  "notes": "Tech sector play",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## 5. Update Trade (PUT /:id)

### Request
```json
PUT /trade-uuid-456
Content-Type: application/json
Authorization: Bearer {token}

{
  "openQuantity": 10,
  "openPremium": 3.75,
  "notes": "Increased position size"
}
```

### Response (200 OK)
```json
{
  "id": "trade-uuid-456",
  "userId": "user-uuid-789",
  "portfolioId": "portfolio-uuid-123",
  "symbol": "AAPL",
  "optionType": "call",
  "strikePrice": 150.00,
  "expirationDate": "2024-03-15",
  "openAction": "buy_to_open",
  "openQuantity": 10,
  "openPremium": 3.75,
  "openCommission": 6.50,
  "openTradeDate": "2024-01-15",
  "openTotalCost": 3756.50,
  "status": "open",
  "notes": "Increased position size",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T09:15:00.000Z"
}
```

## 6. Close Trade (PUT /:id/close)

### Request - Long Position
```json
PUT /trade-uuid-456/close
Content-Type: application/json
Authorization: Bearer {token}

{
  "closeAction": "sell_to_close",
  "closePremium": 4.25,
  "closeCommission": 6.50,
  "closeTradeDate": "2024-02-01"
}
```

### Response (200 OK)
```json
{
  "id": "trade-uuid-456",
  "userId": "user-uuid-789",
  "portfolioId": "portfolio-uuid-123",
  "symbol": "AAPL",
  "optionType": "call",
  "strikePrice": 150.00,
  "expirationDate": "2024-03-15",
  "openAction": "buy_to_open",
  "openQuantity": 10,
  "openPremium": 3.75,
  "openCommission": 6.50,
  "openTradeDate": "2024-01-15",
  "openTotalCost": 3756.50,
  "closeAction": "sell_to_close",
  "closeQuantity": 10,
  "closePremium": 4.25,
  "closeCommission": 6.50,
  "closeTradeDate": "2024-02-01",
  "closeTotalCost": 4243.50,
  "status": "closed",
  "profitLoss": 487.00,
  "notes": "Increased position size",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-02-01T14:20:00.000Z"
}
```

### Request - Short Position
```json
PUT /trade-uuid-999/close
Content-Type: application/json
Authorization: Bearer {token}

{
  "closeAction": "buy_to_close",
  "closePremium": 3.50,
  "closeCommission": 8.00,
  "closeTradeDate": "2024-03-01"
}
```

### Response (200 OK)
```json
{
  "id": "trade-uuid-999",
  "userId": "user-uuid-789",
  "symbol": "TSLA",
  "optionType": "put",
  "strikePrice": 200.00,
  "expirationDate": "2024-04-20",
  "openAction": "sell_to_open",
  "openQuantity": 10,
  "openPremium": 5.75,
  "openCommission": 8.00,
  "openTradeDate": "2024-01-20",
  "openTotalCost": 5742.00,
  "closeAction": "buy_to_close",
  "closeQuantity": 10,
  "closePremium": 3.50,
  "closeCommission": 8.00,
  "closeTradeDate": "2024-03-01",
  "closeTotalCost": 3508.00,
  "status": "closed",
  "profitLoss": 2234.00,
  "createdAt": "2024-01-20T09:00:00.000Z",
  "updatedAt": "2024-03-01T10:15:00.000Z"
}
```

## 7. Delete Trade (DELETE /:id)

### Request
```
DELETE /trade-uuid-456
Authorization: Bearer {token}
```

### Response (204 No Content)
```
(empty body)
```

## Error Responses

### Validation Error (400)
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "openPremium",
        "message": "Open premium must be at least 0.01"
      },
      {
        "field": "symbol",
        "message": "Symbol must be uppercase"
      }
    ]
  }
}
```

### Unauthorized (401)
```json
{
  "error": {
    "message": "Invalid or expired token"
  }
}
```

### Forbidden (403)
```json
{
  "error": {
    "message": "Forbidden - You do not have access to this trade"
  }
}
```

### Not Found (404)
```json
{
  "error": {
    "message": "Trade not found"
  }
}
```

### Trade Already Closed (400)
```json
{
  "error": {
    "message": "Trade is already closed",
    "code": "TRADE_ALREADY_CLOSED"
  }
}
```

### Invalid Closing Action (400)
```json
{
  "error": {
    "message": "Invalid closing action. For buy_to_open, you must use sell_to_close",
    "code": "INVALID_CLOSING_ACTION"
  }
}
```

### Cannot Update Closed Trade (400)
```json
{
  "error": {
    "message": "Cannot update a closed trade",
    "code": "TRADE_CLOSED"
  }
}
```

## Filtering Examples

### Filter by Status
```
GET /?status=open
GET /?status=closed
```

### Filter by Symbol
```
GET /?symbol=AAPL
GET /?symbol=TSLA
```

### Filter by Portfolio
```
GET /?portfolioId=portfolio-uuid-123
```

### Combine Filters
```
GET /?status=open&symbol=AAPL
GET /?status=closed&portfolioId=portfolio-uuid-123
```

### Open Trades with Action Filter
```
GET /open?openAction=buy_to_open
GET /open?openAction=sell_to_open
```

## Calculation Examples

### Long Position (Buy to Open)
```
Opening:
  Action: buy_to_open
  Quantity: 5 contracts
  Premium: $3.50 per share
  Commission: $6.50

  openTotalCost = (3.50 × 5 × 100) + 6.50 = $1,756.50 (debit)

Closing:
  Action: sell_to_close
  Quantity: 5 contracts
  Premium: $4.25 per share
  Commission: $6.50

  closeTotalCost = (4.25 × 5 × 100) - 6.50 = $2,118.50 (credit)

Profit/Loss = $2,118.50 - $1,756.50 = $362.00 profit ✓
```

### Short Position (Sell to Open)
```
Opening:
  Action: sell_to_open
  Quantity: 10 contracts
  Premium: $5.75 per share
  Commission: $8.00

  openTotalCost = (5.75 × 10 × 100) - 8.00 = $5,742.00 (credit)

Closing:
  Action: buy_to_close
  Quantity: 10 contracts
  Premium: $3.50 per share
  Commission: $8.00

  closeTotalCost = (3.50 × 10 × 100) + 8.00 = $3,508.00 (debit)

Profit/Loss = $5,742.00 - $3,508.00 = $2,234.00 profit ✓
```
