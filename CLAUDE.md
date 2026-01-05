# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **A-Share AI Trading Simulation Platform** (A股AI交易模拟平台) - a Next.js application that integrates multiple AI models (DeepSeek, Gemini, Claude, etc.) via OpenRouter to simulate stock trading on the Chinese A-share market. Each AI model is given ¥100,000 initial capital to trade independently.

## Tech Stack

- **Framework**: Next.js 16.1 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: ECharts for K-line charts
- **Data Source**: Sina Finance API
- **AI Service**: Vercel AI SDK + OpenRouter API
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Deployment**: Vercel

## Development Commands

Once the project is initialized:

```bash
# Development
npm run dev          # Start development server

# Build and Deploy
npm run build        # Production build
npm run start        # Start production server

# Database
npx drizzle-kit generate      # Generate migrations
npx drizzle-kit migrate       # Run migrations
npx drizzle-kit push          # Push schema changes
npx drizzle-kit studio        # Open Drizzle Studio

# Testing
npm run test          # Run tests (when implemented)
npm run lint          # Lint code
```

## Environment Variables

Required in `.env.local`:

```env
OPENROUTER_API_KEY=your_api_key
NEXT_PUBLIC_SINA_API_BASE=https://hq.sinajs.cn
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

## Architecture Overview

The application consists of seven core layers:

```
Frontend (Next.js App Router)
    ↓
API Routes
    ↓
┌─────────────┬─────────────┬──────────────┐
Data Service  AI Service    Trading Engine
(Sina API)    (OpenRouter)  (T+1 Rules)
    ↓             ↓              ↓
└─────────────┴─────────────┴──────────────┘
                    ↓
            Storage Layer
         (Drizzle ORM + Supabase)
```

### Key Modules

1. **Data Acquisition** (`lib/data/sina-api.ts`)
   - Fetches historical K-line data from Sina Finance API
   - Supports batch retrieval and caching

2. **AI Model Service** (`lib/ai/openrouter.ts`)
   - Uses Vercel AI SDK with OpenRouter provider
   - Supports multiple models (DeepSeek, Gemini, Claude)
   - Uses Zod for structured output validation
   - Each model has an independent trading account

3. **Trading Engine** (`lib/trading/engine.ts`)
   - Implements T+1 trading rules (A-share specific: stocks bought today can only be sold tomorrow)
   - Manages positions and trading records
   - Calculates profit/loss in real-time

4. **Backtesting System** (`lib/backtest/runner.ts`)
   - Simulates trading day-by-day for a specified time period
   - Calls AI decisions during trading hours (9:15-15:00)

5. **Live Trading System** (`lib/live-trading/manager.ts`)
   - Real-time data fetching and trading
   - Automatic execution of AI decisions

6. **Database Layer** (`lib/db/` + `db/schema.ts`)
   - Tables: `trades`, `positions`, `ai_decisions`, `account_snapshots`, `live_trading_status`

## Important Constraints

### T+1 Trading Rules
- Stocks bought on day T can only be sold on day T+1 or later
- "Intraday trading" (做T) is only allowed for positions held from previous days
- The engine must track `buyDate` for each position

### AI Integration Pattern
```typescript
import { generateText } from 'ai';
import { openrouter } from '@ai-sdk/openrouter';
import { z } from 'zod';

const decisionSchema = z.object({
  action: z.enum(['buy', 'sell', 'hold']),
  stock: z.string().optional(),
  quantity: z.number().optional(),
  reason: z.string(),
});

const { object } = await generateText({
  model: openrouter('deepseek/deepseek-chat'),
  prompt: tradingPrompt,
  schema: decisionSchema,
});
```

## Project Status

**This project is in planning phase** - only the plan document exists in `.cursor/plans/`. The actual Next.js application has not been initialized yet.

Reference the detailed implementation plan in `.cursor/plans/a股ai交易模拟平台_97ba23f0.plan.md` for full specifications including:
- Complete file structure
- API route definitions
- Database schema details
- Frontend page specifications
- Step-by-step development workflow
