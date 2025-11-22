# Order Execution Engine (Mock, Limit Orders)

A Node.js + TypeScript order execution engine demonstrating DEX routing (Raydium vs Meteora), a single order type (Limit Order), BullMQ queue processing, and HTTP→WebSocket live status updates.

Why Limit Orders?
- Limit orders balance realism with clear routing + price checks. They also show slippage protection logic cleanly.
- Extending to Market and Sniper orders: reuse the same pipeline, adjust the price guard and triggering condition. Market ignores limit thresholds; Sniper triggers when a token appears or migrates.

## Features
- Fastify API with single endpoint that serves both HTTP POST and WebSocket subscription at `/api/orders/execute`
- DEX router querying mocked Raydium/Meteora quotes with 2–5% variance and realistic delays
- Order lifecycle statuses via WebSocket: `pending → routing → building → submitted → confirmed | failed`
- BullMQ queue with 10 concurrency, ~100 jobs/min rate limit, and exponential backoff (≤3 attempts)
- PostgreSQL via TypeORM for order history; Redis for active queue
- Unit tests for routing, validation, and WebSocket lifecycle (mocked)

## Getting Started

### Prerequisites
- Node 18+
- Redis running locally on `redis://127.0.0.1:6379`
- PostgreSQL running locally; default `postgres://postgres:postgres@127.0.0.1:5432/orders`

### Install
1) Copy `.env.example` to `.env` and adjust if needed.
2) Install deps:
```
npm install
```

If PowerShell blocks scripts, run CMD as Admin or adjust ExecutionPolicy temporarily.

### Run
```
npm run dev
```
Server runs at `http://localhost:3001` (configurable via `PORT`).

### API
- POST `http://localhost:3001/api/orders/execute`
  Body:
  ```json
  {
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 1,
    "limitPrice": 2.5
  }
  ```
  Response:
  ```json
  { "orderId": "<uuid>" }
  ```

- WebSocket `ws://localhost:3001/api/orders/execute?orderId=<uuid>`
  Messages:
  ```json
  { "orderId": "...", "status": "pending" | "routing" | "building" | "submitted" | "confirmed" | "failed", "txHash?": "...", "executedPrice?": 2.51, "error?": "..." }
  ```

### DEX Routing (Mock)
- Compares quotes from Raydium and Meteora with slight variance and fees
- Picks best price; enforces limit threshold before executing
- Mocks execution delay (2–3 seconds), returns `txHash` and `executedPrice`

### Queue
- BullMQ with 10 concurrency and limiter ~100 jobs/min
- Retries up to 3 times with exponential backoff
- On final failure: emits `failed` and persists error reason to DB

### Extend to Other Order Types
- Market: omit the limit check and always execute at the current best price
- Sniper: add a trigger step before routing that waits for token launch/migration signal, then proceed with routing and execution

### Tests
Run all tests:
```
npm run test
```
The tests use a custom lightweight runner in `tests/run-tests.ts` and do not require Redis or Postgres.

### Postman/Insomnia
See `postman_collection.json`. Import and:
- Send 3–5 POST /execute requests quickly
- Open WS tabs to observe all status updates

### Docker Deployment

#### Using Docker Compose (Recommended for Local Development)
1. Ensure Docker and Docker Compose are installed
2. Run all services:
```bash
docker-compose up -d
```
This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- The application on port 3001

3. View logs:
```bash
docker-compose logs -f app
```

4. Stop all services:
```bash
docker-compose down
```

#### Environment Variables
The application uses the following environment variables:

- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
  - Local: `postgres://postgres:postgres@127.0.0.1:5432/orders`
  - Docker: `postgres://postgres:postgres@postgres:5432/orders`
- `REDIS_URL` - Redis connection string
  - Local: `redis://127.0.0.1:6379`
  - Docker: `redis://redis:6379`
- `QUEUE_NAME` - BullMQ queue name (default: `orders`)
- `NODE_ENV` - Environment mode (`development` or `production`)

When deploying to cloud platforms (Railway/Render/Fly), set these environment variables in your platform's dashboard. The application will automatically detect the environment and use appropriate connection strings.

### Railway Deployment

1. **Create a new Railway project** and connect your GitHub repository

2. **Add PostgreSQL service:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create a `DATABASE_URL` environment variable
   - Your app service will automatically have access to this variable

3. **Add Redis service:**
   - Click "New" → "Database" → "Add Redis"
   - Railway will automatically create a `REDIS_URL` environment variable
   - Your app service will automatically have access to this variable

4. **Verify environment variables:**
   - Go to your app service → "Variables" tab
   - Ensure `DATABASE_URL` and `REDIS_URL` are listed (they should be automatically linked)
   - If not, click "Reference Variable" and select them from the PostgreSQL and Redis services

5. **Deploy:**
   - Railway will automatically detect your `nixpacks.toml` and build your app
   - The app will start once the build completes

**Important:** The application will now fail fast with clear error messages if `DATABASE_URL` or `REDIS_URL` are missing in cloud environments, preventing connection to `127.0.0.1`.

### Cloud Deployment (Other Platforms)
- Any Node hosting (Railway/Render/Fly). Ensure Redis and Postgres URLs are set in env vars.
- The application automatically detects cloud environments and requires environment variables to be set

### Notes
- This project uses `synchronize: true` for TypeORM in development. For production, use migrations.
- For a real devnet integration, swap `MockDexRouter` with real SDK calls (Raydium/Meteora) and keep the same interface.
