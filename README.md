# ZSM Seven API

Comprehensive API platform for portfolio management, user authentication, options trading, and automated backend processing.

## Architecture Overview

This monorepo contains multiple microservices deployed as AWS Lambda functions:

```
zsmseven-api/
├── portfolio-api/          # Portfolio and position management
├── users-api/              # User management
├── auth-api/               # Authentication and authorization
├── options-trades-api/     # Options trading management
└── backend-processing-api/ # Automated ticker updates and analysis
```

## Services

### 1. Portfolio API
**Endpoint**: `/portfolios`

Manages user portfolios and positions with real-time market data.

- Create, read, update, delete portfolios
- Manage positions within portfolios
- Track portfolio performance
- Update position prices

**Tables**:
- `user-portfolios-{stage}`
- `portfolio-positions-{stage}`

[View Documentation](portfolio-api/README.md)

### 2. Users API
**Endpoint**: `/users`

User account management and profile operations.

- Create and manage user accounts
- Update user profiles
- List and search users

**Tables**:
- `users-{stage}`

[View Documentation](users-api/README.md)

### 3. Auth API
**Endpoint**: `/auth`

Authentication, authorization, and session management.

- User registration and login
- JWT token generation and refresh
- Password management
- Session handling

**Tables**:
- `users-{stage}` (shared with users-api)

[View Documentation](auth-api/README.md)

### 4. Options Trades API
**Endpoint**: `/trades`

Options trading lifecycle management.

- Create and track options trades
- Close trades with P&L calculation
- Filter trades by status, symbol, portfolio
- List open and closed trades

**Tables**:
- `options-trades-{stage}`

[View Documentation](options-trades-api/README.md)

### 5. Backend Processing API
**Background Service** (No HTTP endpoints)

Automated backend processing for ticker data updates and portfolio analysis.

- Scheduled ticker data updates from Polygon.io
- AI-powered portfolio analysis using XAI (Grok)
- SQS-based message processing with rate limiting
- Automated job scheduling via EventBridge

**Tables**:
- `ticker-data-{stage}`
- `portfolio-analyses-{stage}`

[View Documentation](backend-processing-api/README.md)

## Deployment

### Stages

- **dev**: Deployed from `develop` branch
- **prod**: Deployed from `main` branch

### Automated Deployment

All services use GitHub Actions for CI/CD:

- Push to `develop` → Deploys to dev
- Push to `main` → Deploys to prod

### Manual Deployment

```bash
# Deploy a specific service to dev
cd <service-name>
npm run deploy:dev

# Deploy a specific service to prod
cd <service-name>
npm run deploy:prod
```

## Environment Variables

Each service requires specific environment variables. See individual service documentation for details.

Common variables:
- `JWT_SECRET` - JWT signing secret
- `AWS_REGION` - AWS region (us-east-1)
- API-specific keys (Polygon, XAI, etc.)

## Local Development

### Prerequisites

- Node.js v20.x
- Python 3.10 (for backend-processing-api)
- AWS CLI configured
- Serverless Framework

### Setup

```bash
# Install dependencies for a service
cd <service-name>
npm install

# For Python services
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your credentials
```

### Testing Locally

```bash
# Invoke a function locally
npx serverless invoke local -f <function-name> --stage dev

# Run offline (if supported)
npm run offline
```

## API Endpoints

### Production URLs

- **Portfolio API**: `https://portfolio.api.zsmproperties.com`
- **Users API**: `https://users.api.zsmproperties.com`
- **Auth API**: `https://auth.api.zsmproperties.com`
- **Options Trades API**: `https://trades.api.zsmproperties.com`

### Development URLs

Development endpoints are available via AWS API Gateway URLs (see individual service deployments).

## Data Model

### Relationships

```
Users (users-{stage})
  ↓
  └─→ Portfolios (user-portfolios-{stage})
       ↓
       ├─→ Positions (portfolio-positions-{stage})
       │    ↓
       │    └─→ Ticker Data (ticker-data-{stage})
       │
       ├─→ Trades (options-trades-{stage})
       │
       └─→ Analyses (portfolio-analyses-{stage})
```

## Monitoring

### CloudWatch

Each service logs to CloudWatch:
- Lambda execution logs
- API Gateway access logs
- Custom application logs

### Viewing Logs

```bash
# Via npm scripts
cd <service-name>
npm run logs:<function-name>:dev

# Via serverless CLI
npx serverless logs -f <function-name> --stage prod --tail
```

## Security

- All APIs use JWT authentication (except auth endpoints)
- CORS configured for frontend origins
- IAM roles follow least-privilege principle
- Secrets stored in GitHub Actions secrets
- DynamoDB encryption at rest enabled by default

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Test locally
4. Push to `develop` for dev deployment
5. Create PR to `main` for prod deployment

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Verify AWS credentials
   - Check GitHub Actions secrets
   - Review CloudWatch logs

2. **CORS Errors**
   - Verify origin configuration in serverless.yml
   - Check API Gateway CORS settings

3. **Database Access Issues**
   - Verify IAM permissions
   - Check table names match stage
   - Ensure tables exist in AWS

## Cost Management

### Monthly Estimates (per stage)

- Lambda: $5-10 (depends on usage)
- DynamoDB: $2-5 (on-demand)
- API Gateway: $3-7 (per 1M requests)
- CloudWatch: $1-2 (logs and metrics)
- **Total**: ~$11-24/month per stage

## Support

For issues or questions:
- Check individual service documentation
- Review CloudWatch logs
- Contact the development team

## License

MIT
