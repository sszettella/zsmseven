# Quick Start Guide

## Installation & Deployment (5 minutes)

```bash
# 1. Navigate to the project
cd options-trades-api

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build

# 4. Set environment variable (match your auth-api)
export JWT_SECRET="your-secret-key"

# 5. Deploy to AWS
npm run deploy:dev

# Note the API Gateway URL from output
```

## Testing the API

### 1. Get an Authentication Token

First, login via your auth-api:

```bash
# Replace with your auth-api URL
curl -X POST https://your-auth-api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'

# Save the token from response
export TOKEN="eyJhbGc..."
```

### 2. Create a Trade

```bash
curl -X POST https://your-trades-api/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
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
  }'

# Save the trade ID from response
export TRADE_ID="uuid-here"
```

### 3. List Trades

```bash
# All trades
curl -X GET https://your-trades-api/ \
  -H "Authorization: Bearer $TOKEN"

# Only open trades
curl -X GET https://your-trades-api/open \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -X GET "https://your-trades-api/?status=open" \
  -H "Authorization: Bearer $TOKEN"

# Filter by symbol
curl -X GET "https://your-trades-api/?symbol=AAPL" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Specific Trade

```bash
curl -X GET https://your-trades-api/$TRADE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Update Trade

```bash
curl -X PUT https://your-trades-api/$TRADE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "openQuantity": 10,
    "notes": "Increased position"
  }'
```

### 6. Close Trade

```bash
curl -X PUT https://your-trades-api/$TRADE_ID/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "closeAction": "sell_to_close",
    "closePremium": 4.25,
    "closeCommission": 6.50,
    "closeTradeDate": "2024-02-01"
  }'
```

### 7. Delete Trade

```bash
curl -X DELETE https://your-trades-api/$TRADE_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Common Issues

### "Authorization token is required"
- Include the Authorization header with Bearer token
- Token format: `Bearer eyJhbGc...`

### "Invalid or expired token"
- Get a fresh token from auth-api
- Ensure JWT_SECRET matches between services

### "Validation failed"
- Check request body matches required fields
- Ensure types are correct (numbers, strings, dates)

### "Trade not found"
- Verify trade ID is correct
- User must own the trade (or be admin)

### "Cannot update a closed trade"
- Use GET to check trade status first
- Closed trades are read-only

### "Invalid closing action"
- BUY_TO_OPEN must close with SELL_TO_CLOSE
- SELL_TO_OPEN must close with BUY_TO_CLOSE

## Quick Reference

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List all trades |
| GET | /open | List open trades |
| GET | /:id | Get specific trade |
| POST | / | Create trade |
| PUT | /:id/close | Close trade |
| PUT | /:id | Update trade |
| DELETE | /:id | Delete trade |

### Action Pairing
| Opening | Closing |
|---------|---------|
| buy_to_open | sell_to_close |
| sell_to_open | buy_to_close |

### P/L Calculations
- **Long (buy_to_open)**: P/L = close total - open total
- **Short (sell_to_open)**: P/L = open total - close total

### Query Parameters
- `status`: "open" or "closed"
- `symbol`: Stock ticker (e.g., "AAPL")
- `portfolioId`: Portfolio UUID
- `openAction`: "buy_to_open" or "sell_to_open"

## Next Steps

1. ✅ Deploy to production: `npm run deploy:prod`
2. ✅ Set up custom domain in serverless.yml
3. ✅ Configure CloudWatch alarms
4. ✅ Add monitoring dashboard
5. ✅ Test with your frontend application

## Documentation

- [README.md](README.md) - Full API documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details

## Support

Check the logs if something goes wrong:
```bash
serverless logs -f listTrades --stage dev --tail
```

View all deployed resources:
```bash
serverless info --stage dev
```

Remove deployment:
```bash
serverless remove --stage dev
```
