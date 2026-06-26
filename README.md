# TradeTracker

A full-stack portfolio tracking and notification platform that tracks millionaire traders, hedge fund managers, and congressional stock trades, and notifies you when they make moves.

## Features

- **Trader Tracking** - Follow 50+ curated traders across 6 tiers: Hedge Fund Legends, Active Traders, eToro Investors, Congressional Traders, Corporate Insiders, and Manual-Entry
- **Real-Time Notifications** - In-app notification bell with 60s polling, optional email alerts per trader
- **Leaderboard** - Sortable/filterable rankings by ROI, win rate, holding period, and follower count
- **Trader Profiles** - Full trade history, current holdings, performance metrics, and bio
- **Stock Detail Pages** - Interactive price charts (TradingView Lightweight Charts), fundamentals from Yahoo Finance, and which tracked traders hold the stock
- **Smart News Feed** - Personalized "For You" section plus general market news with AI-generated summaries (GPT-4o-mini) and trader connection badges
- **Dashboard** - Latest trades from followed traders, top performers, quick stats
- **Admin Panel** - Add/edit traders, enter manual trades, trigger scraping jobs and news refresh
- **Beginner Friendly** - Tooltips on every metric, educational links, clean UI, dark mode by default

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TailwindCSS, shadcn/ui, Recharts, Lightweight Charts |
| Backend | Python FastAPI |
| Database | SQLite + SQLAlchemy ORM |
| Auth | NextAuth.js (Credentials Provider) + JWT |
| Task Queue | APScheduler (cron-style scheduled scraping) |
| AI | OpenAI GPT-4o-mini for news summaries |
| Infra | Docker Compose |

## Data Sources

| Source | Data | Frequency |
|--------|------|-----------|
| SEC EDGAR API | 13F filings (hedge fund holdings) | Every 6 hours |
| SEC EDGAR | Form 4 (insider trades > $500K) | Every 6 hours |
| Capitol Trades | Congressional stock trades | Every 6 hours |
| ARK Invest CSV | Cathie Wood daily trades | Every 6 hours |
| Yahoo Finance (yfinance) | Stock prices + fundamentals | On demand |
| NewsAPI + RSS feeds | Financial news | Every 30 minutes |
| OpenAI API | AI article summaries | Every 30 minutes |

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- (Optional) API keys for OpenAI and NewsAPI

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd tradetracker
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys (optional)
   ```

3. **Start everything**
   ```bash
   docker compose up --build
   ```

4. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Default Admin Account

- Email: `admin@tradetracker.local`
- Password: `admin123`

The seed script automatically creates the admin account and populates 36 traders with sample trade data on first run.

## Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/traders | List all traders |
| GET | /api/traders/:slug | Trader profile |
| GET | /api/traders/:slug/trades | Trader trade history |
| GET | /api/traders/:slug/holdings | Trader current holdings |
| GET | /api/trades | Recent trades |
| GET | /api/trades/by-stock/:ticker | Trades for a stock |
| GET | /api/follows | User's followed traders |
| POST | /api/follows | Follow a trader |
| DELETE | /api/follows/:id | Unfollow a trader |
| GET | /api/notifications | User notifications |
| GET | /api/notifications/unread-count | Unread count |
| POST | /api/notifications/read-all | Mark all read |
| GET | /api/news/feed | News feed |
| GET | /api/news/personalized | Personalized news |
| GET | /api/news/trending | Trending tickers |
| GET | /api/stocks/:ticker | Stock detail |
| GET | /api/dashboard | User dashboard |
| GET | /api/admin/stats | Admin stats |
| POST | /api/admin/scrape/trigger | Trigger all scrapers |
| POST | /api/admin/news/refresh | Refresh news |

## Tracked Traders

### Tier 1: Hedge Fund Legends (20 traders)
Warren Buffett, Ray Dalio, Bill Ackman, Carl Icahn, George Soros, Stanley Druckenmiller, David Tepper, Seth Klarman, Howard Marks, Ken Griffin, Steve Cohen, Dan Loeb, David Einhorn, Michael Burry, Philippe Laffont, Brad Gerstner, Joel Greenblatt, Li Lu, Chase Coleman, Terry Smith

### Tier 2: Active Public Traders (5 traders)
Cathie Wood, Mark Minervini, Ross Cameron, David Ryan, Tim Sykes

### Tier 3: eToro Popular Investors (5 traders)
Jay Edward Smith, Heloise Greeff, Jeppe Kirk Bonde, Olivier Danvel, Alvin De Cruz

### Tier 4: Congressional Traders (5 traders)
Nancy Pelosi, Tommy Tuberville, Dan Crenshaw, Marjorie Taylor Greene, Josh Gottheimer

### Tier 6: Manual-Entry Traders (1 trader)
Leopold Aschenbrenner (trades from public statements, confidence levels shown)

## Architecture

```
tradetracker/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── scrapers/     # SEC EDGAR, ARK, Congress scrapers
│   │   ├── services/     # Auth, notifications
│   │   └── tasks/        # APScheduler jobs, seed script
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # UI components (shadcn/ui style)
│   │   ├── lib/          # API client, auth, utilities
│   │   └── types/        # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```
