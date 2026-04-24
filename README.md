# OpenMetadata AI Gateway

Natural language interface for OpenMetadata data catalog operations. An Express API gateway that proxies and enhances OpenMetadata's REST API, enabling AI-powered querying, impact analysis, SQL generation, and data quality alerting.

---

## Architecture

```
┌─────────┐     ┌─────────────────────────────┐     ┌─────────────────┐
│ Client  │────→│   OpenMetadata AI Gateway   │────→│  OpenMetadata   │
│         │     │        (Express.js)          │     │      API        │
└─────────┘     │                             │     └─────────────────┘
                │  • Auth (JWT validation)    │
                │  • Rate limiting            │
                │  • Input validation         │
                │  • Error handling           │
                │  • Response formatting      │
                └──────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ↓               ↓               ↓
          ┌─────────┐   ┌──────────┐   ┌───────────┐
          │  /ask   │   │ /impact  │   │   /sql    │
          │(search) │   │(lineage) │   │(generate) │
          └─────────┘   └──────────┘   └───────────┘
                               │
                          ┌─────────┐
                          │ /alerts │
                          │(webhook)│
                          └─────────┘
```

---

## Tech Stack

- **Runtime:** Node.js 16+
- **Framework:** Express.js 4.x
- **HTTP Client:** Axios
- **Validation:** express-validator
- **Rate Limiting:** express-rate-limit
- **Security:** Helmet, CORS
- **Documentation:** Swagger UI (standalone spec)
- **UI Framework:** Tailwind CSS (via CDN)
- **Icons:** FontAwesome (via CDN)

---

## Setup Instructions

### 1. Create Project Directory

```bash
mkdir openmetadata-ai-gateway
cd openmetadata-ai-gateway
```

### 2. Initialize Node.js Project

```bash
npm init -y
```

### 3. Install Production Dependencies

```bash
npm install express axios express-validator express-rate-limit helmet cors dotenv morgan swagger-ui-express
```

### 4. Install Development Dependencies

```bash
npm install --save-dev nodemon jest
```

### 5. Create Project Structure

```bash
mkdir config controllers middleware public routes services utils
```

### 6. Create All Files

```bash
touch server.js .env .env.example .gitignore README.md
touch config/index.js config/swagger.js
touch controllers/askController.js controllers/impactController.js controllers/alertsController.js controllers/sqlController.js controllers/docsController.js
touch middleware/auth.js middleware/rateLimit.js middleware/validate.js middleware/errorHandler.js
touch public/api-docs.html
touch routes/index.js routes/ask.js routes/impact.js routes/alerts.js routes/sql.js routes/docs.js
touch services/openmetadata.js services/lineage.js services/formatter.js
touch utils/helpers.js
```

### 7. Configure Environment

```bash
cp .env.example .env
# Edit .env with your OpenMetadata credentials
```

### 8. Start Development Server

```bash
npm run dev
```

### 9. Start Production Server

```bash
npm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Server port |
| `OPENMETADATA_BASE_URL` | Yes | — | Your OM instance URL |
| `OPENMETADATA_BOT_TOKEN` | Yes | — | Personal Access Token from OM UI |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `NODE_ENV` | No | `development` | Environment mode |
| `CORS_ORIGIN` | No | `*` | CORS allowed origins |

---

## Authentication Guide

### Generate Personal Access Token

1. Log into your OpenMetadata instance
2. Click your **Profile** (top right corner)
3. Go to **Access Tokens**
4. Click **Generate New Token**
5. Copy the token string

### Use in Swagger UI

1. Open `http://localhost:3000/swagger`
2. Click the **Authorize** button (lock icon)
3. Enter: `Bearer your-token-here`
4. Click **Authorize**, then **Close**

### Token Security

- Store token in `.env` file (never commit to git)
- Token is non-expiring until revoked
- Regenerate from OM UI if compromised

---

## API Endpoints

### POST `/api/v1/ask`

Natural language catalog search.

**Request:**

```json
{
  "query": "customer"
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-04-21T03:25:59.520Z",
  "data": {
    "query": "customer",
    "answer": "Found 10 table(s) related to \"customer\". Top results: dim_customer, dim_customers, customer_metrics.",
    "sources": [
      {
        "name": "dim_customer",
        "fqn": "sample_redshift.staging_db.integration.dim_customer",
        "type": "table",
        "description": "Customer dimension table",
        "url": "https://sandbox.open-metadata.org/table/sample_redshift.staging_db.integration.dim_customer"
      }
    ],
    "confidence": "medium"
  },
  "meta": {
    "requestId": "1776741959520-tw9wn5cjj"
  }
}
```

**curl:**

```bash
curl -X POST http://localhost:3000/api/v1/ask \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"query": "customer"}'
```

---

### POST `/api/v1/impact`

Analyze downstream impact of schema changes.

**Request:**

```json
{
  "table": "sample_redshift.staging_db.integration.dim_customer",
  "change": "rename column customer_id to user_id"
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-04-21T03:53:32.193Z",
  "data": {
    "table": "sample_redshift.staging_db.integration.dim_customer",
    "change": {
      "description": "rename column customer_id to user_id",
      "type": "rename",
      "severity": "high"
    },
    "summary": "Changing sample_redshift.staging_db.integration.dim_customer (rename) affects 0 downstream assets with low risk.",
    "riskScore": 0,
    "riskLevel": "low",
    "affectedAssets": {
      "upstream": [],
      "downstream": [],
      "totalUpstream": 0,
      "totalDownstream": 0,
      "criticalCount": 0
    },
    "recommendations": [
      "Use alias/view to maintain backward compatibility during transition"
    ]
  }
}
```

**curl:**

```bash
curl -X POST http://localhost:3000/api/v1/impact \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "table": "sample_redshift.staging_db.integration.dim_customer",
    "change": "rename column customer_id to user_id"
  }'
```

---

### POST `/api/v1/sql`

Generate SQL from natural language.

**Request:**

```json
{
  "question": "Show me total revenue by customer region",
  "tables": ["sample_redshift.staging_db.integration.dim_customer"]
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-04-21T03:53:32.254Z",
  "data": {
    "sql": "SELECT customer_region, SUM(revenue) FROM dim_customer GROUP BY customer_region LIMIT 100;",
    "explanation": "Generated SQL using 1 table(s)",
    "tablesUsed": [
      {
        "name": "dim_customer",
        "fqn": "sample_redshift.staging_db.integration.dim_customer",
        "columns": ["customer_key", "customer_id", "customer_name", "valid_from", "valid_to"]
      }
    ],
    "warnings": [],
    "estimatedComplexity": "simple"
  }
}
```

**curl:**

```bash
curl -X POST http://localhost:3000/api/v1/sql \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Show me total revenue by customer region",
    "tables": ["sample_redshift.staging_db.integration.dim_customer"]
  }'
```

---

### POST `/api/v1/alerts`

Format data quality alerts for external channels.

**Request:**

```json
{
  "testCaseId": "803e26db-eea4-4e24-99ce-a57cd80117fd",
  "channels": ["slack", "email"]
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-04-23T01:38:41.474Z",
  "data": {
    "testCaseId": "803e26db-eea4-4e24-99ce-a57cd80117fd",
    "alertSent": true,
    "channels": [
      {
        "channel": "slack",
        "sent": true,
        "preview": "🚨 *MEDIUM* | Test *customer_id_test_library_tcu_5* Failed on `unknown`",
        "payload": {
          "text": "Data quality test \"customer_id_test_library_tcu_5\" failed for unknown",
          "attachments": ["..."]
        }
      },
      {
        "channel": "email",
        "sent": true,
        "preview": "Data quality test \"customer_id_test_library_tcu_5\" failed for unknown",
        "payload": {
          "subject": "[MEDIUM] Data Quality Alert: customer_id_test_library_tcu_5",
          "body": "...",
          "html": "..."
        }
      }
    ],
    "summary": "Alert formatted for 2 channel(s)"
  }
}
```

**curl:**

```bash
curl -X POST http://localhost:3000/api/v1/alerts \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "testCaseId": "803e26db-eea4-4e24-99ce-a57cd80117fd",
    "channels": ["slack", "email"]
  }'
```

---

## Custom Documentation

Visit `http://localhost:3000/api-docs` for a branded HTML documentation page with:

- Tailwind CSS styling
- FontAwesome icons
- Interactive endpoint summaries
- curl examples

---

## Validation Rules

| Field | Rule |
|---|---|
| `query` | Required, max 500 chars |
| `table` (FQN) | Required, format: `service.schema.table` or deeper |
| `change` | Required, max 200 chars |
| `question` | Required, max 500 chars |
| `tables` array | Max 10 items |
| `testCaseId` | Required, valid UUID |
| `channels` array | Min 1, max 5, valid values only |

---

## Error Format

All errors return a consistent structure:

```json
{
  "error": "Descriptive message",
  "code": "ERROR_CODE",
  "timestamp": "2026-04-21T03:11:03.326Z",
  "path": "/api/v1/ask",
  "details": {}
}
```

---

## Rate Limiting

- 100 requests per 15 minutes per IP
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Production server |
| `npm run dev` | Development with nodemon |
| `npm test` | Run Jest tests |

---

<!-- ## License -->

<!-- MIT -->