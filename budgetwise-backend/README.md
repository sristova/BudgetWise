# BudgetWise Backend — Setup & Deployment Guide

## Why PostgreSQL over MySQL / SQLite

| Feature | PostgreSQL ✅ | MySQL | SQLite |
|---|---|---|---|
| Decimal precision for money | ✅ Native DECIMAL | ✅ | ⚠️ Float bugs |
| JSONB for metadata/AI chats | ✅ Native, indexed | ⚠️ JSON only | ❌ |
| Window functions (analytics) | ✅ Full | ⚠️ Partial | ⚠️ Limited |
| Concurrent users | ✅ Excellent | ✅ | ❌ |
| Row-level security | ✅ | ❌ | ❌ |
| Full-text search | ✅ GIN indexes | ⚠️ | ❌ |
| UUID native | ✅ | ⚠️ | ❌ |

---

## Folder Structure

```
budgetwise-backend/
├── prisma/
│   └── schema.prisma          # All DB models
├── src/
│   ├── server.ts              # Entry point
│   ├── app.ts                 # Express setup + middleware
│   ├── lib/
│   │   ├── prisma.ts          # Prisma singleton
│   │   ├── jwt.ts             # Token signing/verification
│   │   ├── logger.ts          # Pino logger
│   │   ├── errors.ts          # AppError classes
│   │   └── response.ts        # API response helpers
│   ├── middleware/
│   │   ├── authenticate.ts    # JWT auth guard
│   │   ├── rateLimit.ts       # Rate limiting
│   │   ├── errorHandler.ts    # Global error handler
│   │   └── notFound.ts        # 404 handler
│   ├── routes/
│   │   ├── index.ts           # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── transaction.routes.ts
│   │   ├── category.routes.ts
│   │   ├── budget.routes.ts
│   │   ├── goal.routes.ts
│   │   ├── report.routes.ts
│   │   ├── notification.routes.ts
│   │   └── aiChat.routes.ts
│   ├── controllers/           # Request handlers
│   ├── validators/            # Zod schemas
│   └── prisma/
│       └── seed.ts            # Demo data
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Local Development Setup

### 1. Clone and install
```bash
git clone <repo>
cd budgetwise-backend
npm install
```

### 2. Setup environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start PostgreSQL (Docker)
```bash
docker compose up postgres -d
```

### 4. Run migrations and seed
```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```

### 5. Start dev server
```bash
npm run dev
# API running at http://localhost:3000/api/v1
```

---

## API Endpoints

### Auth
```
POST   /api/v1/auth/register     Register new user
POST   /api/v1/auth/login        Login
POST   /api/v1/auth/refresh      Refresh access token
POST   /api/v1/auth/logout       Logout (revoke refresh token)
GET    /api/v1/auth/me           Current user info
```

### Transactions
```
GET    /api/v1/transactions               List with pagination + filters
GET    /api/v1/transactions/dashboard     Dashboard summary
GET    /api/v1/transactions/:id           Single transaction
POST   /api/v1/transactions               Create
PATCH  /api/v1/transactions/:id           Update
DELETE /api/v1/transactions/:id           Delete
```

### Query params for GET /transactions
```
?page=1&limit=20
?type=EXPENSE
?categoryId=uuid
?startDate=2024-01-01&endDate=2024-01-31
?search=mercator
?sortBy=date&sortOrder=desc
```

### Goals
```
GET    /api/v1/goals
POST   /api/v1/goals
PATCH  /api/v1/goals/:id
POST   /api/v1/goals/:id/contribute     Add money to goal
DELETE /api/v1/goals/:id
```

### Reports
```
GET    /api/v1/reports/monthly?year=2024&month=1
GET    /api/v1/reports/yearly?year=2024
GET    /api/v1/reports/categories?startDate=2024-01-01&endDate=2024-01-31
```

### AI Chat
```
GET    /api/v1/ai-chat/history
POST   /api/v1/ai-chat/message     { "message": "..." }
DELETE /api/v1/ai-chat/history
```

---

## Expo Integration

### Find your local IP (for Expo Go)
```bash
# macOS/Linux
ipconfig getifaddr en0

# Windows
ipconfig
```

### Install in Expo project
```bash
npx expo install expo-secure-store
npm install axios
```

Copy `EXPO_API_CLIENT.ts` → `lib/api.ts` in your Expo project.

Update the IP in `lib/api.ts`:
```ts
const BASE_URL = __DEV__
  ? 'http://YOUR_LOCAL_IP:3000/api/v1'
  : 'https://your-production-url.com/api/v1';
```

### Auth Flow in Expo
```ts
// Login
const user = await authApi.login('demo@budgetwise.app', 'Demo1234!');
// Tokens are automatically saved to SecureStore

// Make authenticated requests
const dashboard = await transactionsApi.getDashboard();
// Access token is automatically attached

// Token refresh happens automatically on 401
// No manual handling needed
```

---

## Deployment

### Railway (easiest)
1. Push to GitHub
2. New project on [railway.app](https://railway.app)
3. Add PostgreSQL plugin
4. Add environment variables from `.env.example`
5. Deploy — Railway auto-detects Node.js

### Render
1. New Web Service → connect GitHub repo
2. Build: `npm run build && npm run db:migrate:prod`
3. Start: `npm start`
4. Add PostgreSQL database (free tier available)

### DigitalOcean / VPS
```bash
# On server
git clone <repo>
cd budgetwise-backend
cp .env.example .env
# fill in .env

docker compose up -d
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed
```

### Production checklist
- [ ] Strong JWT secrets (min 32 chars, random)
- [ ] BCRYPT_ROUNDS=12
- [ ] NODE_ENV=production
- [ ] ALLOWED_ORIGINS set to your Expo app URLs
- [ ] PostgreSQL not exposed publicly
- [ ] HTTPS via reverse proxy (nginx / Caddy)
- [ ] Set up daily DB backups

---

## Database Indexing

Already included in schema:
- `users.email` — login lookup
- `transactions.userId` — all user queries
- `transactions.userId + date` — date range filters
- `transactions.userId + type` — income/expense split
- `refresh_tokens.token` — O(1) token lookup
- `ai_chats.userId + createdAt` — chat history

---

## Security Features

- Helmet.js — secure HTTP headers
- CORS — origin whitelist
- Rate limiting — 100 req/15min global, 10/15min for auth
- JWT rotation — refresh tokens are single-use
- bcrypt — passwords hashed with 12 rounds
- Zod — all inputs validated before DB
- No sensitive data in error responses (production)
- Cascade deletes — user data cleaned up properly
