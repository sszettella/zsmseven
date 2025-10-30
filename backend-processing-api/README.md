# Backend Processing API

Backend processing service for ZSM Seven portfolio management system. This service handles automated ticker data updates and portfolio analysis using AI.

## Overview

This service runs scheduled background jobs that:
1. Process ticker symbols from portfolios
2. Fetch market data from Polygon.io
3. Analyze portfolios using XAI (Grok) API
4. Store results in DynamoDB

## Architecture

### Lambda Functions

#### 1. processTickers
- **Trigger**: EventBridge (CloudWatch Events)
- **Schedule**: Monday-Friday at 9:30 PM EST (4:30 AM UTC Tuesday-Saturday)
- **Purpose**: Scans portfolio tables for ticker symbols and queues them for processing
- **Output**: Messages sent to SQS queue for individual processing

#### 2. processTicker
- **Trigger**: SQS Queue (ticker-processing-queue)
- **Concurrency**: 1 (rate-limited for Polygon API)
- **Purpose**: Fetches market data (price, RSI, MA50) for individual tickers
- **Data Source**: Polygon.io API
- **Output**: Stores ticker data in DynamoDB

#### 3. analyzePortfolio
- **Trigger**: EventBridge (CloudWatch Events)
- **Schedule**: Monday-Friday at 1:00 AM EST (6:00 AM UTC Tuesday-Saturday)
- **Purpose**: Analyzes portfolio using XAI Grok API
- **Output**: Stores analysis results with opportunity scores in DynamoDB

### AWS Resources

#### DynamoDB Tables

1. **ticker-data-{stage}**
   - Stores market data for tickers
   - Keys: ticker (HASH), timestamp (RANGE)
   - Attributes: price, rsi, ma50, asOf

2. **portfolio-analyses-{stage}**
   - Stores AI-generated portfolio analysis
   - Keys: portfolio (HASH), timestamp (RANGE)
   - Attributes: analysis, model, dataAsOf, parsed_data

#### SQS Queue

- **ticker-processing-queue-{stage}**
  - Visibility timeout: 300 seconds
  - Message retention: 14 days
  - Used for processing individual tickers with rate limiting

### Shared Resources

The service reads from and writes to the following shared tables:
- **user-portfolios-{stage}** - Portfolio data (owned by portfolio-api)
- **portfolio-positions-{stage}** - Position data (owned by portfolio-api)

## Environment Variables

Required environment variables:

```bash
POLYGON_API_KEY=your_polygon_api_key
XAI_API_URL=https://api.x.ai/v1/chat/completions
XAI_API_KEY=your_xai_api_key
```

See [.env.example](.env.example) for a template.

## Deployment

### Stages

- **dev**: Deployed from `develop` branch
- **prod**: Deployed from `main` branch

### Manual Deployment

```bash
# Install dependencies
npm install

# Deploy to dev
npm run deploy:dev

# Deploy to prod
npm run deploy:prod
```

### Automated Deployment

Deployments are automated via GitHub Actions:
- Push to `develop` → deploys to dev
- Push to `main` → deploys to prod
- Changes to `backend-processing-api/**` trigger deployment

## Development

### Local Testing

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Set environment variables
export POLYGON_API_KEY=your_key
export XAI_API_KEY=your_key
export XAI_API_URL=https://api.x.ai/v1/chat/completions

# Test individual functions locally
serverless invoke local -f processTickers --stage dev
serverless invoke local -f analyzePortfolio --stage dev --data '{"portfolio_name": "ZSM Seven"}'
```

### Viewing Logs

```bash
# View logs for processTickers (dev)
npm run logs:processTickers:dev

# View logs for processTicker (dev)
npm run logs:processTicker:dev

# View logs for analyzePortfolio (prod)
npm run logs:analyzePortfolio:prod

# Or use serverless directly
serverless logs -f processTickers --stage prod --tail
```

## Data Flow

1. **Ticker Processing Flow**:
   ```
   EventBridge (cron) → processTickers → SQS Queue → processTicker → DynamoDB (ticker-data)
   ```

2. **Portfolio Analysis Flow**:
   ```
   EventBridge (cron) → analyzePortfolio → XAI API → DynamoDB (portfolio-analyses)
   ```

## Rate Limiting

- **Polygon API**: Limited by processTicker concurrency (1) and message delays (75 seconds between tickers)
- **XAI API**: No specific rate limiting implemented, relies on API quotas

## Monitoring

Monitor the service through:
- **CloudWatch Logs**: Lambda function execution logs
- **CloudWatch Metrics**: Lambda invocations, errors, duration
- **SQS Metrics**: Queue depth, message age
- **DynamoDB Metrics**: Read/write capacity, throttles

## Cost Considerations

- Lambda: Pay per invocation and execution time
- DynamoDB: On-demand billing (pay per request)
- SQS: First 1M requests free, then $0.40 per million
- CloudWatch: Log storage and data transfer

## Troubleshooting

### Common Issues

1. **Rate Limit Errors from Polygon**
   - Check CloudWatch logs for 429 responses
   - Adjust delay between SQS messages if needed
   - Verify Polygon API key and plan limits

2. **XAI API Timeout**
   - Increase Lambda timeout (currently 300 seconds)
   - Check XAI API status

3. **Missing Data in DynamoDB**
   - Verify Lambda execution completed successfully
   - Check IAM permissions for DynamoDB access
   - Review CloudWatch logs for errors

## Related Services

- **portfolio-api**: Manages portfolios and positions
- **users-api**: Manages user accounts
- **options-trades-api**: Manages options trades
- **auth-api**: Handles authentication

## Security

- API keys stored as GitHub secrets
- IAM roles follow least-privilege principle
- No public endpoints (all background jobs)
- DynamoDB encryption at rest enabled by default

## Future Enhancements

- [ ] Add Dead Letter Queue (DLQ) for failed messages
- [ ] Implement exponential backoff for API failures
- [ ] Add email/SNS notifications for critical errors
- [ ] Create dashboard for monitoring job execution
- [ ] Add support for multiple portfolios in analysis
