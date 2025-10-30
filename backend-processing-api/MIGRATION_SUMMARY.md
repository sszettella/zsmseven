# Backend Processing API - Migration Summary

This document summarizes the migration of backend processing functions from the `api/` directory to the new `backend-processing-api/` service.

## What Was Migrated

### Lambda Functions
The following Python files were moved from `api/` to `backend-processing-api/src/handlers/`:

1. **process_tickers.py**
   - Scans portfolios for ticker symbols
   - Sends tickers to SQS queue with staggered delays
   - Schedule: Tue-Sat 4:30 AM UTC (9:30 PM EST Mon-Fri)

2. **process_ticker.py**
   - Processes individual tickers from SQS
   - Fetches data from Polygon.io (price, RSI, MA50)
   - Stores in DynamoDB ticker-data table
   - Reserved concurrency: 1 (rate limiting)

3. **analyze_portfolio.py**
   - Analyzes portfolios using XAI Grok API
   - Generates opportunity scores for tickers
   - Stores analysis in portfolio-analyses table
   - Schedule: Tue-Sat 6:00 AM UTC (1:00 AM EST Mon-Fri)

### AWS Resources Migrated

#### SQS Queue
- **Old**: `portfolio-queue-{stage}` (in api/serverless.yml)
- **New**: `ticker-processing-queue-{stage}` (in backend-processing-api/serverless.yml)
- Renamed for clarity and separation

#### DynamoDB Tables
The following tables were migrated from api/serverless.yml:

1. **ticker-data-{stage}**
   - Stores market data for tickers
   - Keys: ticker (HASH), timestamp (RANGE)

2. **portfolio-analyses-{stage}**
   - Stores AI-generated portfolio analysis
   - Keys: portfolio (HASH), timestamp (RANGE)

3. **portfolios-{stage}** (Old name)
   - Now references `user-portfolios-{stage}` (from portfolio-api)
   - Table not created by backend-processing-api (shared resource)

### Environment Variables Migrated

From `api/serverless.yml` to `backend-processing-api/serverless.yml`:

- `POLYGON_API_KEY` - Polygon.io API key
- `XAI_API_URL` - XAI API endpoint
- `XAI_API_KEY` - XAI API key
- `TICKER_DATA_TABLE` - Ticker data table name
- `PORTFOLIOS_TABLE` - Updated to use user-portfolios-{stage}
- `POSITIONS_TABLE` - Added for portfolio positions access
- `ANALYSES_TABLE` - Portfolio analyses table name
- `SQS_QUEUE_URL` - SQS queue URL

## Key Changes

### 1. Table Name Updates

| Old Name (api/) | New Name (backend-processing-api/) |
|-----------------|-------------------------------------|
| `portfolios-{stage}` | `user-portfolios-{stage}` |
| `ticker-data-{stage}` | `ticker-data-{stage}` (unchanged) |
| `portfolio-analyses-{stage}` | `portfolio-analyses-{stage}` (unchanged) |

### 2. Queue Name Change

- **Old**: `portfolio-queue-{stage}`
- **New**: `ticker-processing-queue-{stage}`

This provides better clarity about the queue's purpose.

### 3. Shared Resources

The backend-processing-api now reads from tables managed by other services:
- `user-portfolios-{stage}` (created by portfolio-api)
- `portfolio-positions-{stage}` (created by portfolio-api)

It creates its own tables:
- `ticker-data-{stage}`
- `portfolio-analyses-{stage}`

### 4. Stage Separation

The new service has separate dev and prod deployments:
- **Dev**: Deployed from `develop` branch
- **Prod**: Deployed from `main` branch
- Separate SQS queues for each stage
- Separate DynamoDB tables for each stage

## Files Created

### Core Files
- `serverless.yml` - Service configuration
- `requirements.txt` - Python dependencies
- `package.json` - Node.js dependencies and scripts

### Documentation
- `README.md` - Service overview and usage
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `MIGRATION_SUMMARY.md` - This file

### Configuration
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules

### Source Code
- `src/handlers/process_tickers.py`
- `src/handlers/process_ticker.py`
- `src/handlers/analyze_portfolio.py`

### CI/CD
- `.github/workflows/deploy-backend-processing-api.yml` - GitHub Actions workflow

## Next Steps

### 1. Configure GitHub Secrets

Add the following secrets to your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `POLYGON_API_KEY`
- `XAI_API_URL`
- `XAI_API_KEY`

### 2. Deploy to Dev

```bash
cd backend-processing-api
npm install
npm run deploy:dev
```

### 3. Verify Deployment

```bash
# Check Lambda functions
aws lambda list-functions --region us-east-1 | grep backend-processing

# Check SQS queue
aws sqs list-queues --region us-east-1 | grep ticker-processing

# Check DynamoDB tables
aws dynamodb list-tables --region us-east-1 | grep -E "ticker-data|portfolio-analyses"
```

### 4. Monitor First Runs

Watch CloudWatch logs for the first scheduled runs:
- processTickers: Next Tue-Sat at 4:30 AM UTC
- analyzePortfolio: Next Tue-Sat at 6:00 AM UTC

### 5. Test Manually

```bash
# Invoke processTickers
aws lambda invoke \
  --function-name zsmseven-backend-processing-api-dev-processTickers \
  --region us-east-1 \
  output.json

# Invoke analyzePortfolio
aws lambda invoke \
  --function-name zsmseven-backend-processing-api-dev-analyzePortfolio \
  --payload '{"portfolio_name": "ZSM Seven"}' \
  --region us-east-1 \
  output.json
```

### 6. Deploy to Prod

After successful dev testing:

```bash
# Merge develop to main
git checkout main
git merge develop
git push origin main

# Or deploy manually
npm run deploy:prod
```

## Migration Benefits

1. **Separation of Concerns**: Backend processing isolated from API services
2. **Independent Deployment**: Can deploy without affecting API services
3. **Stage Isolation**: Dev and prod completely separate
4. **Better Organization**: Clear structure and documentation
5. **Improved Monitoring**: Dedicated CloudWatch log groups
6. **Scalability**: Easier to scale backend processing independently

## Backward Compatibility

The old `api/` directory functions should continue to work until you're ready to remove them. To clean up:

1. Verify new backend-processing-api is working correctly
2. Test for at least 1 week in prod
3. Remove old resources:
   ```bash
   # Remove old service (if deployed separately)
   cd api
   npx serverless remove --stage dev
   npx serverless remove --stage prod
   ```
4. Delete old files from `api/` directory

## Rollback Plan

If issues arise:

1. Keep old `api/` deployment active during transition
2. Can quickly switch back by disabling new EventBridge rules
3. Re-enable old Lambda schedules
4. Update code to use old queue/table names if needed

## Support

If you encounter issues:
1. Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. Review CloudWatch logs
3. Verify environment variables
4. Check IAM permissions
