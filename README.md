# INE Product Price & Stock Tracker

A production-ready full-stack web application that tracks product prices and stock levels over time by scraping INE's hosted mock store (`https://demo.inelabteamdev.com/`) on a reliable, unattended 2-hour schedule.

Built for the **INE Software Engineer Intern Assignment**.

---



---

## Key Features

1. **Product Selection & Lightweight Discovery**:
   - Fast, instant search against INE's mock storefront by partial or full title, brand, category, or SKU.
   - Utilizes lightweight HTTP fetching (`/api/catalog` & `/api/product/:id`) for sub-second search and metadata retrieval without browser overhead.
   - One-click product tracking with configurable scrape intervals (1h, 2h, 4h, 12h).

2. **Resilient Scheduled Web Scraping (The Core Challenge)**:
   - **Anti-Bot Mouse Telemetry Bypass**: Simulates realistic human mouse trajectories with smooth pauses across the price box to satisfy the mock store's 8+ movements and 600ms dwell time criteria before enabling the "Reveal price" button.
   - **Decoy Honeypot Evasion**: Strictly filters out intentional trap elements (`.price-value` and `.amount[data-price="true"]` with `display: none` / `aria-hidden="true"`). Naive scrapers capture these decoy numbers; our scraper extracts the genuine selling price.
   - **Invisible Character Sanitizer**: Cleans zero-width spaces (`\u200b`), non-breaking spaces (`\u00a0`), fullwidth unicode digits, and trailing tax notations.
   - **Dynamic Cookie Overlay Dismissal**: Intercepts and dismisses the random focus-trapping cookie consent modal (`.cookie-banner`) whenever it spawns.
   - **Exponential Backoff & Jitter**: Recovers from store-injected 429 rate limits, slow responses, and transient 500 errors with randomized exponential backoff.

3. **Honest History & Audit Logging**:
   - Interactive Price & Stock History chart built with Recharts, showing price trends and stock fluctuations over time.
   - Historical tabular log of every price recorded.
   - **Scrape Attempt Audit Trail**: Every single scrape attempt is recorded honestly with its outcome (`SUCCESS`, `RETRYING`, `FAILED`), duration in ms, attempt count, and exact error message.

4. **Observable (Headed) Mode**:
   - Run the scraper locally in a visible Chrome browser window to watch it dwell over the price container, dismiss cookie banners, click the reveal button, and extract the real price.

5. **Bonus Features**:
   - **Store Health & Structure Change Detection**: Continuously monitors the mock store API and DOM structure to flag schema shifts or downtime.
   - **Configurable Scrape Schedule**: Allows per-product scrape frequencies.
   - **Dual-Database Mode**: Connects to Supabase PostgreSQL in production, with an automatic local persistent storage fallback for instant, zero-friction local development.
   - **CI/CD**: GitHub Actions workflow verifying TypeScript compilation and production builds on every commit.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, TypeScript, Playwright (Chromium / Google Chrome).
- **Database**: Supabase (PostgreSQL) with local fallback.
- **Scheduling**: External Cron endpoint (`POST /api/scrape/trigger`) authenticated via `CRON_SECRET`, designed for Render free-tier instances that sleep when idle.

---

## Architecture Diagram

```
                       ┌─────────────────────────────────────┐
                       │          INE Mock Store             │
                       │   (demo.inelabteamdev.com)          │
                       └───────────▲─────────────▲───────────┘
                                   │             │
                    Lightweight    │             │ Headless / Headed
                    HTTP Catalog   │             │ Playwright (Anti-Bot
                    Discovery      │             │  Dwell & Honeypot Filter)
                                   │             │
┌─────────────────────────┐    ┌───┴─────────────┴───────────────────┐
│       cron-job.org      │───►│       Backend (Render / Node.js)    │
│  (Trigger every 2 hrs)  │    │ - /api/products/search (Catalog)    │
└─────────────────────────┘    │ - /api/products/track (Track DB)    │
                               │ - /api/scrape/product/:id (Manual)  │
                               │ - /api/scrape/trigger (Cron)        │
                               └───────────▲─────────────▲───────────┘
                                           │             │
                                  REST API │             │ SQL Queries
                                           │             │
                               ┌───────────┴─┐         ┌─┴──────────────┐
                               │  Frontend   │         │    Supabase    │
                               │  (Vercel)   │         │  (PostgreSQL)  │
                               └─────────────┘         └────────────────┘
```

---

## Setup & Running Locally

### Prerequisites
- Node.js v18+ (Node.js v22 recommended)
- npm v9+
- Google Chrome or Chromium

### 1. Clone the repository
```bash
git clone https://github.com/rishabkoul/ine-price-tracker.git
cd ine-price-tracker
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
cd ..
```

### 3. Environment Variables

Create `.env` in `server/`:
```env
PORT=4000
MOCK_STORE_URL=https://demo.inelabteamdev.com
CRON_SECRET=ine-scrape-cron-secret-2026
PLAYWRIGHT_CHANNEL=chrome


Create `.env` in `client/`:
```env
# In development, Vite proxies /api to http://localhost:4000 automatically
VITE_API_URL=
```


### 5. Running in Development Mode

**Start Backend Server**:
```bash
cd server
npm run dev
# Server starts on http://localhost:4000
```

**Start Frontend Dashboard**:
```bash
cd client
npm run dev
# Dashboard opens on http://localhost:5173
```

---

## Observable (Headed) Scraper Run

To run the scraper in headed mode with a visible browser window and step-by-step console logging:

```bash
cd server
npm run scrape:headed -- --product=451
```

You will see:
1. Chrome launch visibly on your desktop.
2. The page load and check for cookie modals.
3. Realistic mouse movement across the price container satisfying `minMoves >= 8` and `minDwellMs >= 600`.
4. The "Reveal price" button enable and click.
5. In-page retry and challenge resolution.
6. The genuine price extracted and honeypot decoys filtered.

---

## Scheduling & Free-Tier Deployment Guide

### Why External Cron?
Free-tier hosting instances (such as Render) automatically hibernate or go to sleep after 15 minutes of inactivity. An in-process `setInterval` will stop running when the instance sleeps.

### Triggering with cron-job.org:
1. Create a free account on [cron-job.org](https://cron-job.org).
2. Create a new Cronjob:
   - **URL**: `https://your-backend.onrender.com/api/scrape/trigger`
   - **Method**: `POST`
   - **Headers**: `x-cron-secret: your-cron-secret`
   - **Schedule**: Every 2 hours (`0 */2 * * *`)
3. When the scheduled time arrives, the HTTP request wakes up the Render instance and triggers the scrape across all tracked products!

---

