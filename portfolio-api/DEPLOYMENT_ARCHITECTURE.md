# Portfolio API Deployment Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
│                    zsmseven-api/portfolio-api                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Push to main / Manual trigger
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions Pipeline                     │
│                   deploy-portfolio-api.yml                      │
│                                                                  │
│  1. Checkout Code                                               │
│  2. Setup Node.js 20                                            │
│  3. Install Serverless Framework                                │
│  4. Build TypeScript → JavaScript                               │
│  5. Deploy to AWS                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ serverless deploy
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                         AWS CloudFormation                       │
│                  Creates/Updates Infrastructure                  │
└─────┬──────────────┬──────────────┬──────────────┬─────────────┘
      │              │              │              │
      ↓              ↓              ↓              ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Lambda  │  │   API    │  │ DynamoDB │  │   IAM    │
│Functions │  │ Gateway  │  │  Tables  │  │  Roles   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## AWS Infrastructure Components

### 1. Lambda Functions (11 Functions)
```
Portfolio Handlers:
├── listPortfolios      → GET /portfolios
├── getPortfolio        → GET /portfolios/:id
├── createPortfolio     → POST /portfolios
├── updatePortfolio     → PUT /portfolios/:id
└── deletePortfolio     → DELETE /portfolios/:id

Position Handlers:
├── listPositions       → GET /portfolios/:portfolioId/positions
├── getPosition         → GET /positions/:id
├── createPosition      → POST /portfolios/:portfolioId/positions
├── updatePosition      → PUT /positions/:id
├── deletePosition      → DELETE /positions/:id
└── updatePositionPrices → PATCH /portfolios/:portfolioId/positions/prices
```

### 2. API Gateway Configuration
```
API: zsmseven-portfolio-api-prod
├── Custom Domain: api.zsmproperties.com
├── Base Path: /portfolios
├── Stage: prod
└── CORS: Enabled (origin: *)
```

### 3. DynamoDB Tables

#### Portfolios Table
```
Table: portfolios-prod
├── Primary Key: id (String)
├── Global Secondary Indexes:
│   ├── UserIdIndex
│   │   └── Partition Key: userId
│   └── UserNameIndex
│       ├── Partition Key: userId
│       └── Sort Key: name
└── Billing: PAY_PER_REQUEST
```

#### Positions Table
```
Table: positions-prod
├── Primary Key: id (String)
├── Global Secondary Indexes:
│   ├── PortfolioIdIndex
│   │   └── Partition Key: portfolioId
│   └── PortfolioTickerIndex
│       ├── Partition Key: portfolioId
│       └── Sort Key: ticker
└── Billing: PAY_PER_REQUEST
```

### 4. IAM Roles
```
Lambda Execution Role
├── DynamoDB Permissions
│   ├── Query (portfolios, positions, trades)
│   ├── Scan (portfolios, positions, trades)
│   ├── GetItem (portfolios, positions, trades)
│   ├── PutItem (portfolios, positions, trades)
│   ├── UpdateItem (portfolios, positions, trades)
│   └── DeleteItem (portfolios, positions, trades)
└── CloudWatch Logs Permissions
    ├── CreateLogGroup
    ├── CreateLogStream
    └── PutLogEvents
```

## Request Flow

### Example: Create Portfolio

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /portfolios
     │ Authorization: Bearer <JWT>
     ↓
┌────────────────────────────────────────────────────┐
│            Custom Domain: api.zsmproperties.com     │
└────────────────────┬───────────────────────────────┘
                     │ /portfolios → Portfolio API
                     ↓
┌────────────────────────────────────────────────────┐
│                  API Gateway                        │
│  - Validates HTTP method                           │
│  - Applies CORS headers                            │
│  - Routes to Lambda                                │
└────────────────────┬───────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────┐
│       Lambda: createPortfolio.handler              │
│  1. Extract JWT from Authorization header          │
│  2. Verify JWT signature                           │
│  3. Parse request body                             │
│  4. Validate portfolio data                        │
│  5. Check for duplicate name                       │
│  6. Create portfolio object (UUID, timestamps)     │
│  7. Save to DynamoDB                               │
│  8. Return 201 Created response                    │
└────────────────────┬───────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────┐
│           DynamoDB: portfolios-prod                │
│  - PutItem operation                               │
│  - Automatic GSI updates                           │
└────────────────────┬───────────────────────────────┘
                     │
                     ↓ Success
┌────────────────────────────────────────────────────┐
│              Response to Client                     │
│  {                                                 │
│    "id": "uuid",                                   │
│    "userId": "uuid",                               │
│    "name": "Long-Term Holdings",                   │
│    "isActive": true,                               │
│    "isDefault": false,                             │
│    "createdAt": "2024-10-29T...",                  │
│    "updatedAt": "2024-10-29T..."                   │
│  }                                                 │
└────────────────────────────────────────────────────┘
```

## Multi-API Integration

```
┌─────────────────────────────────────────────────────────┐
│         Custom Domain: api.zsmproperties.com            │
└─────┬─────────┬─────────────┬─────────────┬────────────┘
      │         │             │             │
      │ /auth   │ /users      │ /trades     │ /portfolios
      ↓         ↓             ↓             ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│Auth API  │ │Users API │ │Trades API│ │Portfolio API │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘
     │            │            │               │
     │            │            │               │
     └────────────┴────────────┴───────────────┘
                  │
                  ↓
         ┌─────────────────┐
         │  Shared JWT      │
         │  Authentication  │
         └─────────────────┘
```

## Data Flow Between APIs

### Portfolio ↔ Trades Integration

```
┌─────────────────────┐         ┌─────────────────────┐
│   Portfolio API     │         │   Trades API        │
│                     │         │                     │
│ GET /portfolios/:id │────────→│ Query trades by     │
│ ?includeTrades=true │         │ portfolioId         │
│                     │←────────│ Return trades data  │
│                     │         │                     │
│ DELETE /portfolios  │────────→│ Update trades:      │
│ /:id                │         │ set portfolioId=null│
└─────────────────────┘         └─────────────────────┘
```

### Authentication Flow

```
┌──────────┐      ┌──────────┐      ┌──────────────┐
│  Client  │─────→│Auth API  │      │Portfolio API │
│          │ Login│          │      │              │
│          │←─────│ JWT Token│      │              │
│          │      └──────────┘      │              │
│          │                        │              │
│          │ Request + JWT Token───→│ Verify JWT   │
│          │                        │ Process      │
│          │←────── Response ───────│              │
└──────────┘                        └──────────────┘
```

## Deployment Strategies

### 1. Individual API Deployment
```bash
# Triggered automatically on push to main
git push origin main

# Or manually via GitHub Actions UI
GitHub → Actions → Deploy Portfolio API → Run workflow
```

### 2. Unified Deployment (All APIs)
```bash
# Manual trigger only
GitHub → Actions → Deploy All APIs → Run workflow → Select stage
```

### 3. Local Development
```bash
# Run locally with serverless-offline
cd portfolio-api
npm install
serverless offline

# API available at http://localhost:3000
```

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────┐
│                  CloudWatch Logs                     │
│  ├── /aws/lambda/zsmseven-portfolio-api-prod-*     │
│  ├── Execution logs for each Lambda                │
│  └── Error tracking and debugging                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                CloudWatch Metrics                    │
│  ├── Lambda: Invocations, Duration, Errors         │
│  ├── API Gateway: Requests, Latency, 4xx/5xx       │
│  └── DynamoDB: Read/Write capacity, Throttles      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  X-Ray Tracing                       │
│  ├── End-to-end request tracing                    │
│  ├── Service map visualization                     │
│  └── Performance bottleneck identification         │
└─────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│                   API Gateway                        │
│  ├── HTTPS only (TLS 1.2+)                          │
│  ├── Custom domain with ACM certificate             │
│  ├── Request throttling                             │
│  └── API keys (optional)                            │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│              Lambda: JWT Verification                │
│  ├── Extract Bearer token from header               │
│  ├── Verify signature with JWT_SECRET               │
│  ├── Check issuer & audience                        │
│  └── Extract userId from token                      │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│            Resource Ownership Validation             │
│  ├── Get resource from DynamoDB                     │
│  ├── Compare resource.userId with token.userId      │
│  ├── Return 403 if mismatch                         │
│  └── Proceed if authorized                          │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│              DynamoDB Access Control                 │
│  ├── IAM role with least privilege                  │
│  ├── Table-level permissions only                   │
│  ├── No direct database access from client          │
│  └── All queries through Lambda                     │
└─────────────────────────────────────────────────────┘
```

## Cost Structure

```
Monthly Estimated Costs (Low-Medium Usage):

Lambda
├── 1M requests/month                    $0.20
├── 128MB memory, 500ms average          $0.83
└── Total Lambda                         $1.03

API Gateway
├── 1M API calls                         $3.50
└── Data transfer                        $0.50
└── Total API Gateway                    $4.00

DynamoDB
├── 1M read requests                     $0.25
├── 500K write requests                  $0.63
└── Storage (1GB)                        $0.25
└── Total DynamoDB                       $1.13

CloudWatch
├── Log ingestion (5GB)                  $2.50
└── Log storage                          $0.50
└── Total CloudWatch                     $3.00

──────────────────────────────────────────────
Total Estimated Cost/Month               $9.16
```

## Scaling Considerations

### Lambda Auto-Scaling
- Concurrent executions: Up to 1,000 (default)
- Automatic scaling based on request volume
- Cold start mitigation via provisioned concurrency (optional)

### DynamoDB Auto-Scaling
- Pay-per-request billing mode
- Automatically scales to handle traffic
- No capacity planning required

### API Gateway
- Handles up to 10,000 requests/second (default)
- Automatic scaling
- Regional distribution

## Disaster Recovery

### Backup Strategy
```
DynamoDB Point-in-Time Recovery (PITR)
├── Enabled on both tables
├── 35-day backup retention
└── Restore to any point in time

Lambda Versions
├── Immutable function versions
├── Automatic rollback capability
└── Previous versions retained

CloudFormation Stacks
├── Stack updates tracked
├── Rollback on failure
└── Change sets for review
```

### Recovery Procedures
1. **Table Restoration**: Use PITR to restore tables
2. **Function Rollback**: Deploy previous Lambda version
3. **Stack Rollback**: Revert CloudFormation stack
4. **Data Recovery**: Import from backup/export

## Summary

✅ 11 Lambda functions deployed
✅ 2 DynamoDB tables with GSIs
✅ API Gateway with custom domain
✅ JWT authentication integrated
✅ CloudWatch monitoring enabled
✅ Auto-scaling configured
✅ HTTPS encryption enabled
✅ IAM least privilege access
✅ Backup and recovery enabled

The Portfolio API infrastructure is production-ready!
