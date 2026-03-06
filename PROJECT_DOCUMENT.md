# Personal Finance Tracker
### A Browser-Based Financial Management Application
#### Project Documentation — Pradeep Narsupalli | March 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Why I Built This](#2-why-i-built-this)
3. [Technology Stack & Infrastructure](#3-technology-stack--infrastructure)
4. [System Architecture](#4-system-architecture)
5. [Feature Requirements — What I Wanted to Build](#5-feature-requirements--what-i-wanted-to-build)
6. [Development Timeline — How It All Came Together](#6-development-timeline--how-it-all-came-together)
7. [Feature Deep-Dive — All Five Tabs Explained](#7-feature-deep-dive--all-five-tabs-explained)
8. [Technical Challenges & How I Solved Them](#8-technical-challenges--how-i-solved-them)
9. [Data Architecture — How the App Stores Everything](#9-data-architecture--how-the-app-stores-everything)
10. [Design System](#10-design-system)
11. [What I Would Do Differently](#11-what-i-would-do-differently)
12. [Future Roadmap](#12-future-roadmap)
13. [Reflections](#13-reflections)

---

## 1. Project Overview

The **Personal Finance Tracker** is a fully functional, browser-based financial management application I built to track my income, expenses, investments, and overall net worth — all from one place, without giving any of my data to a third-party service.

The app runs entirely in the browser. There is no backend, no database server, no login screen, and no cloud storage. Everything lives in the browser's local storage, which means my financial data never leaves my device. I built it specifically for the Australian context — AUD currency, ASX stocks, local merchant names in bank statements, and the way Australian banks export their CSV files.

The project is part of my GitHub portfolio and demonstrates my ability to work at the intersection of **product thinking and technical execution** — defining detailed requirements, validating features through hands-on UAT, and iterating based on real-world testing with my own data.

**Live Repository:** https://github.com/pradeepn556/personal-finance-tracker

---

## 2. Why I Built This

I'm a BA and Product Specialist by background, not a developer. But I wanted to demonstrate that someone with strong product skills can ship real software when equipped with the right tools and approach.

I also genuinely needed this app. The alternatives I looked at all had one or more of the following problems:

- **Too generic** — not designed for Australia. They don't understand ASX stocks, AUD, or the way local banks name merchants.
- **Too expensive** — personal finance apps in Australia typically charge $10–$20/month.
- **Privacy concerns** — most tools require linking your bank accounts through open banking, which I wasn't comfortable with.
- **Too simple** — they track spending but don't connect it to investments, savings rate, and net worth in one view.

So the requirement was clear: build something that's exactly what I need, works offline, and keeps all my data on my own machine.

---

## 3. Technology Stack & Infrastructure

I deliberately chose a stack that is modern, widely used in industry, and capable of producing a professional-grade application without a backend.

### Frontend Framework
| Technology | Version | Why I Chose It |
|---|---|---|
| **React** | 19.2 | Industry-standard component model. Declarative, fast, and well-documented. |
| **Vite** | 7.3 | Lightning-fast build tool. Hot-reload during development is near-instant. |
| **Tailwind CSS** | 4.2 | Utility-first CSS — faster than writing custom stylesheets, easy to maintain. |
| **Recharts** | 3.7 | React-native charting library. Integrates cleanly without needing D3 knowledge. |
| **Lucide React** | 0.577 | Consistent, professional icon set with a clean API. |

### Data Storage
| Technology | Why I Chose It |
|---|---|
| **Browser localStorage** | No server needed. Data stays on the user's device. Completely private. |

### External APIs (Free Tier)
| API | Purpose | Coverage |
|---|---|---|
| **CoinGecko** | Cryptocurrency live prices | No API key needed. CORS-friendly. 50+ coins supported. |
| **Finnhub** | US stocks & ETFs live prices | Free API key. 60 calls/minute. NASDAQ, NYSE coverage. |
| **Twelve Data** | ASX stocks & ETFs live prices | Free API key. 800 calls/day. CORS-enabled. `.AX` suffix support. |

### Development & Deployment
| Tool | Purpose |
|---|---|
| **Git + GitHub** | Version control and portfolio hosting |
| **npm** | Package management |
| **ESLint** | Code quality linting |
| **Claude Code (AI)** | AI-augmented development — requirements translated to code |

### No Backend. By Design.
This was a deliberate architectural choice. I didn't need:
- A database (localStorage handles the data volume fine)
- User authentication (single-user personal app)
- An API server (all external calls are made directly from the browser)
- Hosting costs (the app can run from a local file or any static host)

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client Only)                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                      React App                       │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │App.jsx   │  │Shared    │  │  5 Tab Components │  │   │
│  │  │State Hub │  │Components│  │  Dashboard        │  │   │
│  │  │          │  │          │  │  Income           │  │   │
│  │  │income[]  │  │StatCard  │  │  Investments      │  │   │
│  │  │expenses[]│  │Section   │  │  Expenses         │  │   │
│  │  │investm[] │  │          │  │  Settings         │  │   │
│  │  │budgets{} │  │          │  │                   │  │   │
│  │  │settings{}│  │          │  │                   │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │               Utility Layer                   │   │   │
│  │  │  storage.js   calculations.js  formatters.js  │   │   │
│  │  │  priceFetcher.js               dateHelpers.js │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────┐                                     │
│  │   localStorage     │                                     │
│  │  finance_app_*     │                                     │
│  └────────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
           │                │                │
           ▼                ▼                ▼
     CoinGecko API     Finnhub API    Twelve Data API
     (Crypto prices)  (US Stocks)    (ASX Stocks)
```

### State Management
I didn't use Redux or any external state library. All application state lives in `App.jsx` as React `useState` hooks and flows down to child components via props. This keeps things simple and easy to reason about at the cost of some prop-drilling — acceptable for an app of this size.

### Data Flow
1. On startup, `App.jsx` reads all data from `localStorage` via `loadAllData()`
2. User interactions call `updateData(key, value)` on `App.jsx`
3. `updateData` writes to `localStorage` and updates React state simultaneously
4. Components re-render with the new data

---

## 5. Feature Requirements — What I Wanted to Build

Before writing a single line of code, I documented a 35-page requirements specification covering every feature in detail. Below is a summary of the key requirements I brought to this project.

### Core Principles
- **Privacy first** — no data leaves the device
- **Australian context** — AUD currency, ASX market, local merchants, DD/MM/YYYY date format
- **One-screen visibility** — all key financial metrics visible without hunting
- **No friction** — adding a transaction should take under 30 seconds

### Dashboard Requirements
- Show net worth prominently at the top — the most important single number
- Display monthly income vs expenses vs savings at a glance
- Show investment portfolio value with unrealized P&L
- Recent transactions feed combining all categories
- 12-month trend chart for income, expenses, and savings
- Financial health indicators (savings rate, expense ratio, investment allocation %)

### Income Requirements
- Track multiple income streams: salary, side hustle, partner income, rental
- Tag income by source and recipient (Me / Partner / Shared)
- Monthly summary with year-to-date totals
- Charts showing income breakdown by source and month-over-month trend
- Support for different pay cycles (weekly, fortnightly, monthly)

### Investment Requirements
- Track stocks (ASX + US), ETFs, crypto, bonds, and other assets
- Live price fetching — auto-refresh current prices from market APIs
- Support for multiple purchase lots ("tranches") of the same asset
- Full P&L calculation: unrealized (open positions) and realized (closed positions)
- Holdings heatmap sized by portfolio weight, coloured by P&L
- Partial position close — sell X of N units without closing the entire holding
- Asset allocation pie chart breaking down by asset type
- Support ANZ, WiseTech, CBA, and other ASX holdings

### Expense Requirements
- Track expenses against monthly budgets by category
- Quick-add from a list of preset Australian merchant categories
- Progress bars showing budget consumed per category
- Day/week/month/year filter views
- Bank statement import — upload CSV and auto-categorise transactions
- Credit card tagging — mark which card each statement belongs to
- Duplicate detection when importing

### Settings Requirements
- Customisable currency, date format, and theme
- API key management for live price providers (Finnhub, Twelve Data)
- Credit card / bank account names (used in import dropdown)
- Budget management — set monthly limits per category
- Data export (JSON backup) and import (restore from backup)
- Clear all data option

---

## 6. Development Timeline — How It All Came Together

The entire application was built in a single focused session across **5–6 March 2026** — approximately 26 hours of active development. Here is a chronological breakdown of every commit and what changed.

---

### Phase 1 — Project Scaffold
**5 March 2026, ~4:45pm**
`feat: scaffold React + Vite project with full structure`

Everything starts here. The initial scaffold set up:
- Vite + React project structure
- Tailwind CSS configured
- Folder structure: `src/components/{tab}/`, `src/utils/`
- ESLint configured for React hooks

This was the "empty shell" — no features yet, just the bones.

---

### Phase 2 — Utility Layer + Navigation Shell + Dashboard
**5 March 2026, ~5:27pm**
`feat: add utility layer, navigation shell and Dashboard tab`

The utility layer was built first because everything else depends on it:

**`storage.js`** — All localStorage read/write operations. Defines storage keys, default settings, load/save/clear functions, and a `generateId()` function for unique entry IDs.

**`calculations.js`** — Pure financial calculation functions: net worth, P&L, savings rate, expense ratio, monthly trends, budget status. No side effects — input data in, number out.

**`formatters.js`** — Number and date formatting helpers (AUD currency formatting, DD/MM/YYYY dates).

**`dateHelpers.js`** — Date arithmetic functions: start/end of month, subtract months.

Then the navigation shell was built — the top nav bar with 5 tabs, responsive layout, and the routing logic that shows/hides each tab panel.

The **Dashboard** tab was the first complete feature:
- Net worth hero card
- Income, expenses, and portfolio summary cards
- Monthly trend line chart (12 months)
- Savings rate and expense ratio gauges
- Recent transactions feed

---

### Phase 3 — All Five Tabs (First Version)
**5 March 2026, ~8:46pm**
`feat: complete all 5 tabs — Income, Investments, Expenses, Settings`

This was the biggest single commit. All remaining tabs were built in one pass:

**Income Tab** — Add/edit/delete income entries, source tagging, monthly chart, year-to-date summary.

**Investments Tab** — Add investments, manual price entry, P&L calculation, holdings table, asset allocation chart.

**Expenses Tab** — Add expenses, select category, budget tracking, spending by category pie chart.

**Settings Tab** — Currency/date/theme settings, data export/import, clear data.

At this point, all five tabs were functional — data persisted, charts rendered, calculations were correct.

---

### Phase 4 — Complete UI/UX Redesign
**5 March 2026, ~10:41pm**
`feat: complete UI/UX redesign — professional LedgerZero-style`

The first version looked functional but basic. The redesign transformed the entire UI to a professional dark-theme design inspired by modern fintech dashboards:

- **Colour palette**: Dark navy backgrounds (`#0F172A`, `#1E2139`), cyan accent (`#06B6D4`), professional greys for text
- **Typography**: Monospace metric values, uppercase card labels, consistent heading hierarchy
- **Cards**: Uniform padding, consistent border colours, hover states
- **Tables**: Alternating row colours, hover highlights, action icon buttons
- **Buttons**: 44px minimum height, consistent primary/secondary/danger variants
- **Forms**: Collapsible by default — hidden until the user needs them, smooth CSS transitions
- **Charts**: Unified tooltip styles, consistent colour mapping across all charts

Every single component was restyled in this commit — Dashboard, Income, Investments, Expenses, Settings, and all shared components.

---

### Phase 5 — Expenses Bug Fixes (Budget Bars, Filters)
**5 March 2026, ~11:12pm**
`fix(expenses): correct category budget bars, pay-cycle filter, quick filters`

After the redesign, UAT exposed a few issues in the Expenses tab:
- Budget progress bars were showing wrong percentages
- The pay-cycle date filter wasn't correctly scoping the date range
- Quick filter buttons (Today / This Week / This Month) had an off-by-one issue

All three were fixed in this commit.

---

### Phase 6 — Live Price Fetching (Investments)
**6 March 2026, ~2:09am**
`feat(investments): live price fetching via Yahoo Finance + CoinGecko`

The Investments tab previously required manual price entry every time. This commit added live market price fetching:
- **CoinGecko** for cryptocurrency (no API key, free, CORS-friendly)
- **Yahoo Finance** as initial stock price source

When adding a new investment, the app now auto-fetches the current price and pre-fills the field. A "Refresh Prices" button was added to update all holdings at once.

---

### Phase 7 — Investments Polish (Auto-fetch, Tranches Modal, Heatmap)
**6 March 2026, ~2:29am**
`feat(investments): auto-fetch price on add, fix tranches modal, move heatmap`

Several Investments tab improvements in one commit:
- Auto-fetch current price the moment a symbol is entered (on blur)
- Fix the Tranches Modal — clicking a symbol shows all purchase lots for that holding
- Holdings Heatmap repositioned to a more logical position on the page
- Improved the "Edit" and "Delete" flow within the modal

---

### Phase 8 — Yahoo Finance CORS Fix (Finnhub)
**6 March 2026, ~12:15pm**
`fix: replace Yahoo Finance with Finnhub for live stock prices (CORS fix)`

**This was the first major technical problem I hit.**

Yahoo Finance's API does not send CORS headers. This means browser-based fetch calls are silently blocked — the browser's security policy prevents cross-origin requests when the server hasn't explicitly allowed them. The app appeared to hang, and the price never populated.

**Fix**: Replaced Yahoo Finance with **Finnhub** — a dedicated financial data API with proper CORS support, 60 calls/minute on the free tier, and reliable US stock data.

CoinGecko remained for crypto (it was already working fine).

---

### Phase 9 — Critical Bug Fixes (Crash + Data Loss + Wrong Prices)
**6 March 2026, ~2:13pm**
`fix: critical crash + data loss + wrong price bugs in Live Prices`

UAT after the Finnhub integration revealed three critical bugs:
1. **App crash** — a missing null check caused the app to throw a JavaScript error when the API returned no data
2. **Data loss** — the "Refresh Prices" button was overwriting the `investments` array incorrectly
3. **Wrong price displayed** — the price shown in the table wasn't being saved back to the correct field

All three were fixed and verified before the next commit.

---

### Phase 10 — ASX Stock Support (Both Markets)
**6 March 2026, ~2:28pm**
`feat: support both ASX and US (NASDAQ/NYSE) stocks with USD warning`

Up until this point, live prices only worked for US stocks. I have ASX holdings (ANZ, WiseTech, etc.) and needed Australian market data too.

Finnhub's free tier does not cover the ASX (Australian Securities Exchange). The approach taken was:
- If a symbol ends in `.AX` → try to fetch from ASX via Finnhub (which sometimes works on free tier as a fallback) → fallback to Yahoo Finance
- If a US symbol → Finnhub primary
- If Finnhub returns a non-ASX price → show a "⚠️ Price may be in USD" warning to the user

This was the first working version of dual-market support.

---

### Phase 11 — Alpha Vantage for ASX (Attempted)
**6 March 2026, ~3:02pm**
`feat: add Alpha Vantage for ASX stock pricing (fixes BHP.AX, ANZ.AX etc.)`

ASX prices still weren't reliable. I added Alpha Vantage as a dedicated ASX data source.

**However — this didn't work either.** Alpha Vantage also has no CORS headers on their API responses. The browser blocks the request silently. The Settings page showed the API key as saved and green, but ASX prices continued to fail.

*This commit was superseded by the next one.*

---

### Phase 12 — Twelve Data (The Actual ASX Fix)
**6 March 2026, ~4:44pm**
`fix: replace Alpha Vantage with Twelve Data — actual CORS fix for ASX stocks`

Before shipping this fix, I verified CORS headers on candidate APIs using `curl -I` (a command-line HTTP header inspector):

```
Alpha Vantage → No Access-Control-Allow-Origin header ✗ BLOCKED
Twelve Data   → Access-Control-Allow-Origin: *        ✓ ALLOWED
```

**Twelve Data** was the correct solution:
- Verified CORS headers with command-line testing before writing any code
- Free tier: 800 API calls/day
- Supports `.AX` suffix natively (e.g., `BHP.AX`, `ANZ.AX`, `WOW.AX`)
- Returns clean JSON with a `price` field

The Settings page was updated with a Twelve Data API key section, and the routing logic in `priceFetcher.js` was updated:
- Crypto → CoinGecko (no key needed)
- ASX stocks (`.AX`) → Twelve Data → Finnhub fallback
- US stocks → Finnhub → Yahoo Finance fallback

---

### Phase 13 — README Updates
**6 March 2026, ~2:39pm – 4:46pm**
Multiple README commits: professional portfolio-style documentation for the GitHub repository.

---

### Phase 14 — Bank Statement CSV Import (Expenses Tab)
**6 March 2026, ~4:59pm**
`feat: add bank statement CSV import with auto-categorization (Expenses tab)`

This was a requirement I'd been thinking about since the start — the ability to upload a bank statement and have transactions automatically imported and categorised.

**Design decision: CSV only (not screenshot/OCR)**
OCR (reading text from images) is unreliable for financial data. A single misread character on an amount — `$1,234` read as `$1.234` — creates silently wrong data. CSVs are machine-generated and 100% accurate.

**How every Australian bank exports CSV:**
- ANZ → Downloads → Export transactions → CSV
- CommBank → NetBank → Statements → Export → CSV
- Westpac → Online Banking → Transactions → Export → CSV
- NAB → Internet Banking → Accounts → Export transactions → CSV

**What the import feature does:**
1. User drops a CSV file into the import modal
2. The parser auto-detects column positions (Date, Amount, Description) by matching against common header names
3. Sign-convention auto-detection runs (see [Technical Challenges](#8-technical-challenges--how-i-solved-them))
4. Each description is run through 17 Australian merchant rule sets and assigned a category
5. A preview table shows all detected transactions with their auto-assigned categories (editable before import)
6. Duplicate detection marks transactions that appear to already exist (same date + amount + description prefix)
7. User selects/deselects rows and clicks Import

**Merchant categories supported:**
| Category | Example Merchants |
|---|---|
| Groceries | Woolworths, Coles, Aldi, IGA, Harris Farm, Costco |
| Dining & Takeaway | McDonald's, KFC, Hungry Jack's, Domino's, GYG, Nando's |
| Coffee & Drinks | Starbucks, Gloria Jean's, any CAFE/COFFEE/BAKERY |
| Subscriptions & Streaming | Netflix, Spotify, Apple, Google One, Stan, Binge, Disney+ |
| Fuel | BP, Shell, Ampol, 7-Eleven, Caltex |
| Transport | Uber, Opal, Myki, Translink, Linkt, EastLink |
| Health & Medical | Chemist Warehouse, Priceline, any PHARMACY/CLINIC/DOCTOR |
| Gym & Fitness | Anytime Fitness, Goodlife, F45, CrossFit |
| Clothing & Apparel | Kmart, Target, Big W, Myer, David Jones, H&M, Zara |
| Home & Garden | Bunnings, IKEA, Spotlight |
| Travel & Holidays | Qantas, Virgin, Jetstar, Airbnb, Booking.com |
| Entertainment | JB Hi-Fi, Harvey Norman, Officeworks |
| Utilities | AGL, Origin Energy, Sydney Water |
| Internet & Phone | Telstra, Optus, Vodafone, Amaysim |
| Rent / Mortgage | RENT, LEASE, Ray White, LJ Hooker |
| Insurance | NRMA, AAMI, Allianz, Medibank, BUPA |
| Credit Card Payment | Afterpay, Klarna, ZIP Pay, any CARD PAYMENT |

---

### Phase 15 — CSV Sign-Convention Bug Fix + Credit Card Tagging
**6 March 2026, ~5:20pm**
`fix: CSV sign-convention bug + add credit card tagging to import`

**The bug:** After the import feature went live, I tested it with my actual ANZ Amex statement. Only 2 of 57 transactions were imported.

**Root cause investigation:** The ANZ Amex CSV exports purchases as **positive amounts** and payments/refunds as **negative amounts**. This is the opposite of standard bank accounts (CommBank, Westpac, NAB), which export purchases as negative and credits as positive.

My original import code had a hard-coded rule: `if (rawAmt > 0) skip` — which skipped every single purchase on my Amex statement.

**Fix — 2-pass sign-convention auto-detection:**
```
Pass 1: Count how many amounts are positive vs. negative in the file
        If positives > negatives → this is an ANZ Amex-style file
        If negatives > positives → this is a standard bank-style file

Pass 2: Apply the correct filter based on what was detected
```

This works automatically with no user configuration needed.

**Credit card tagging** was added in the same commit:
- Settings → Credit Cards & Accounts → add card names (e.g., "ANZ Amex", "CommBank Everyday")
- When importing a CSV, a dropdown appears: "Which account is this statement for?"
- Every imported transaction is tagged with the selected card name as its `paymentMethod`
- This allows filtering by card in the Expenses tab later

---

### Phase 16 — KFC Keyword Fix
**6 March 2026, ~6:47pm**
`Fix KFC keyword matching for underscore-separated bank descriptions`

A small but important fix found during verification testing against real ANZ data.

The keyword `'KFC '` (with trailing space) doesn't match `'KFC_AU_ROSEHILL'` — ANZ uses underscores as separators between merchant name and location, not spaces.

Fix: `'KFC '` → `'KFC'` (no trailing space). Now correctly categorised as Dining & Takeaway.

---

## 7. Feature Deep-Dive — All Five Tabs Explained

### Tab 1: Dashboard

The Dashboard is a read-only overview — no forms, pure information.

**Net Worth Card** (top, full width)
The single most important number: total income received minus total expenses plus current investment portfolio value. Updated live as data changes. Designed to be visible the moment you open the app.

**Secondary Metric Cards**
- Monthly spending as a percentage of income
- Portfolio value with unrealized P&L (green/red)
- Savings rate (%)

**Net Worth Trend Chart** (full width)
A 12-month area chart showing how net worth has changed over time. Pulls data from all three categories.

**Cash Flow Chart** (50% width)
Side-by-side bars for income vs expenses per month. Immediately shows whether you're saving or overspending each month.

**Financial Health Indicators** (50% width)
- Savings Rate: (Income - Expenses) / Income × 100
- Expense Ratio: Expenses / Income × 100
- Investment Allocation: Portfolio Value / Net Worth × 100

**Recent Transactions** (full width table)
Last 10 transactions across all categories — income, expenses, and investments combined. Shows date, type badge (colour-coded), description, and amount.

---

### Tab 2: Income

**Summary Cards (4 across)**
- This month's income
- Year-to-date total
- Average monthly income (rolling)
- Highest single income entry with source name

**Income by Source Chart**
Pie chart breaking down total income by source label (Salary, Side Hustle, Partner, Rental, etc.).

**Monthly Trend Chart**
Bar chart showing income per month for the last 12 months.

**Income Table**
Full list of income entries with columns: Date, Source, Amount, Pay Cycle, Notes. Sortable. Actions: edit / delete.

**Add Income Form** (collapsible)
Fields: Date, Source (free text), Amount, Pay Cycle (weekly/fortnightly/monthly/annual/one-off), Income From (Main Job / Side Hustle / Partner / Other), Recipient (Me / Partner / Shared), Notes.

---

### Tab 3: Investments

The most complex tab. Designed around the concept of **investment tranches** — each purchase of an asset is stored as a separate lot, allowing accurate cost-basis tracking across multiple buy-ins.

**Portfolio Summary Cards (4 across)**
- Total portfolio value (sum of all active holdings at current price)
- Unrealized P&L ($) — current value minus cost basis
- Total cost basis — what was paid for all active holdings
- Number of active holdings

**Holdings Table**
Grouped view by symbol. Each row: Symbol, Type, Total Qty, Avg Buy Price, Current Price, Total Cost Basis, Current Value, P&L ($), P&L (%). Colour-coded P&L (green positive, red negative).

**Tranches Modal**
Clicking any row opens a modal showing all individual purchase lots for that symbol:
- Date, Quantity, Purchase Price, Current Value, P&L ($)
- Per-tranche actions: Edit, Delete, Close Units

**Close Units Flow** (partial position close)
From the Tranches Modal, "Close Units" opens an inline form:
- Units to sell (max = remaining quantity)
- Sold price per unit
- Sold date
- On submit: if closing all → marks lot as `isClosed=true`. If partial → creates a new closed record for the sold portion, reduces original lot quantity.

**Asset Allocation Pie Chart**
Breaks down portfolio value by asset type (ASX Stocks, US Stocks, ETFs, Crypto, Bonds, Other).

**P&L Bar Chart**
Shows each holding's P&L percentage as a horizontal bar. Green for positive, red for negative.

**Holdings Heatmap**
Visual grid where each tile represents a holding. Tile size = portfolio weight (bigger = larger position). Tile colour = P&L% (deep green = strong gain, deep red = loss). Hover shows details.

**Closed Positions** (collapsible section)
Table of all sold/closed lots: Symbol, Type, Qty Sold, Buy Price, Sold Price, Realized P&L ($), Realized P&L (%), Sold Date. Option to reopen a closed position.

**Live Price Fetching**
- On adding a new investment: auto-fetches current price after symbol is entered
- Manual "Refresh All Prices" button
- Per-symbol status indicator: data source, last updated time, stale/fresh badge

**Add Investment Form** (collapsible)
Fields: Date, Symbol (e.g., `BHP.AX`, `AAPL`, `BTC`), Asset Type, Quantity, Purchase Price (auto-fetched), Notes.

---

### Tab 4: Expenses

**Budget Overview Card** (full width, top)
Shows the current month's total spending vs total budget across all categories. Large numbers, progress bar, clear over/under status.

**Import CSV Card**
Prominent entry point for the bank statement import feature. Opens the Import Modal.

**4-Chart Grid**
- Spending by Category (pie chart)
- Daily spending trend (line chart, current month)
- Budget vs Actual by category (grouped bar chart)
- Top merchants by spend (horizontal bar chart)

**Budget by Category**
Inline progress bars for each category with a budget set. Shows: Category name, spent/budget, percentage bar, status pill (On Track / Warning / Over Budget).

**Filter Section**
- Date range: Today, This Week, This Month, This Year, Custom Range
- Category filter dropdown
- Payment method (credit card) filter dropdown

**Transactions Table**
Full list of expenses: Date, Description, Category badge, Amount, Payment Method, Notes. Sortable. Actions: edit / delete.

**Add Expense Form** (collapsible)
Fields: Date, Description, Amount, Category (dropdown), Payment Method (dropdown from saved cards), Notes.

**Import Modal** (full-screen overlay)
Steps: 1. Drop CSV file → 2. Select which card/account → 3. Preview & edit categories → 4. Import selected rows.

---

### Tab 5: Settings

**General Settings**
- Currency (AUD, USD, EUR, GBP, SGD)
- Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- Theme (Dark / Light)
- Charts style (Professional / Colorful)

**Live Price API Keys**
- CoinGecko: No key needed. Status shown.
- Twelve Data: Enter key, show/hide toggle, save/clear. Instructions with registration link. (ASX stocks)
- Finnhub: Enter key, show/hide toggle, save/clear. Instructions with registration link. (US stocks)

**Credit Cards & Accounts**
- Add/edit/delete card and account names
- These names appear in the Import dropdown and as `paymentMethod` tags on transactions

**Budget Management**
- Set monthly budget limits per expense category
- Real-time saving (no submit button needed)

**Data Management**
- Export: Downloads all app data as a `.json` file (timestamped backup)
- Import: Upload a previously exported `.json` to restore data
- Import behaviour: merges with existing data (adds to arrays, doesn't replace)
- Clear All Data: Wipes all localStorage — with confirmation prompt

**About**
App version, tech stack summary, GitHub link.

---

## 8. Technical Challenges & How I Solved Them

### Challenge 1: CORS — The Invisible Wall

**What is CORS?** Cross-Origin Resource Sharing is a browser security policy that prevents JavaScript running on one domain from reading responses from another domain — unless the second domain explicitly permits it.

When my app (running on `localhost`) tries to fetch data from `api.alphavantage.co`, the browser first checks whether Alpha Vantage's response includes a header saying `Access-Control-Allow-Origin: *`. If that header is absent, the browser silently blocks the response. The JavaScript code sees a network error as if the request never happened.

**The problem I faced:**
- **Yahoo Finance**: No CORS headers. Every stock price fetch silently failed.
- **Alpha Vantage**: No CORS headers. Every ASX price fetch silently failed. The API key showed as "saved and valid" in the UI because saving a string to localStorage always works — but the actual API calls were being blocked by the browser.

**How I diagnosed it:**
Instead of guessing, I used `curl -I` (a command-line tool that shows HTTP response headers) to inspect each API directly:
```bash
curl -I "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=BHP.AX&apikey=demo"
# Result: No Access-Control-Allow-Origin header → BLOCKED ✗

curl -I "https://api.twelvedata.com/price?symbol=BHP.AX&apikey=demo"
# Result: Access-Control-Allow-Origin: * → ALLOWED ✓
```

**The lesson:** Before integrating any external API in a browser-based app, verify its CORS headers first. Don't assume — check.

**Final working API stack:**
| Asset Type | Primary | Fallback |
|---|---|---|
| Crypto | CoinGecko ✓ | Yahoo Finance (may fail in browser) |
| ASX Stocks (.AX) | Twelve Data ✓ | Finnhub → Yahoo Finance |
| US Stocks | Finnhub ✓ | Yahoo Finance (may fail in browser) |

---

### Challenge 2: CSV Sign-Convention — Why Only 2 of 57 Transactions Imported

**The problem:** I uploaded my ANZ Amex credit card statement. The import showed only 2 transactions. I expected 57.

**Investigation:**
I wrote a test script and ran it against the actual CSV file using Node.js:
```
Processing: activity.csv
Positives found: 57
Negatives found: 2
Sign convention: positiveIsExpense = true (ANZ Amex style)
Transactions extracted: 57
```

**Root cause:** The ANZ Amex credit card statement uses **positive numbers for purchases** and **negative numbers for payments and refunds**. This is the opposite of how most transaction accounts work (where withdrawals/purchases are negative).

My original code had `if (rawAmt > 0) continue` — which literally skipped every purchase in the Amex file.

**Fix — 2-pass auto-detection:**
```
Pass 1 (Scan): Count how many amounts are positive vs negative
               ANZ Amex: 57 positives, 2 negatives → positives dominate
               CommBank:  2 positives, 57 negatives → negatives dominate

Pass 2 (Filter): If positives dominate → treat positive amounts as expenses
                 If negatives dominate → treat negative amounts as expenses
```

This runs automatically. The user never has to know which format their bank uses — the app detects it.

**Lesson:** Never assume sign convention when parsing financial data. Different institutions have different conventions, and even different account types at the same bank may differ.

---

### Challenge 3: Keyword Matching — `'KFC '` vs `'KFC_AU_ROSEHILL'`

**The problem:** KFC transactions on ANZ statements appear as `KFC_AU_ROSEHILL FRENCHS FOREST`. My categorisation keyword was `'KFC '` (with a trailing space). A space never appears before an underscore, so the match always failed.

**Why trailing spaces exist in the first place:**
Short keywords like `'KFC'`, `'BP'`, `'GYG'` risk false-positive matches on unrelated descriptions. For example, `'BP'` would match `'AUTOPAY'` or `'BYPASS'`. The trailing space forces a word-boundary match.

**The fix:**
`'KFC'` is distinctive enough to not cause false positives — there is no common expense category description that contains "KFC" without it being the fast food chain. The trailing space was removed.

---

### Challenge 4: Partial Position Close (Investment Tranches)

**The problem:** If I bought 100 shares of CBA at $85, then later bought another 50 at $91, and now want to sell 30 shares — which lot do I sell from? How do I record this without corrupting my cost-basis data?

**The solution I implemented:**
Each purchase is stored as an independent record ("tranche"). Selling follows this logic:
- If selling ALL units of a tranche → mark that tranche `isClosed: true`, record `soldDate` and `soldPrice`
- If selling PARTIAL units → create a **new closed record** for the sold portion, reduce the original tranche's quantity by the sold amount

This way:
- Cost basis history is never lost
- Every lot's purchase price is preserved separately
- Realized P&L is calculated exactly: `(soldPrice - purchasePrice) × qtySold`
- Active portfolio value only includes open (non-closed) positions

---

## 9. Data Architecture — How the App Stores Everything

All data is stored in the browser's `localStorage` under five keys:

| Key | Data Type | Description |
|---|---|---|
| `finance_app_income` | Array of objects | All income entries |
| `finance_app_investments` | Array of objects | All investment lots (tranches) |
| `finance_app_expenses` | Array of objects | All expense transactions |
| `finance_app_budgets` | Object (key-value) | Monthly budget limits per category |
| `finance_app_settings` | Object | User preferences, API keys not included |

> **Note:** API keys (Finnhub, Twelve Data) are stored separately in localStorage under their own keys and are deliberately excluded from the data export/import flow. This prevents accidentally sharing API keys when sending a data backup to someone else.

### Income Entry Schema
```json
{
  "id": "inc_1741234567890_ab3f",
  "date": "2026-03-01",
  "source": "Salary",
  "amount": 5800.00,
  "payCycle": "fortnightly",
  "incomeFrom": "Main Job",
  "recipient": "Me",
  "notes": "March pay"
}
```

### Investment Entry Schema
```json
{
  "id": "inv_1741234567890_cd9e",
  "date": "2025-11-15",
  "symbol": "WTC.AX",
  "type": "ASX Stock",
  "quantity": 25,
  "purchasePrice": 112.50,
  "currentPrice": 139.80,
  "isClosed": false,
  "soldDate": null,
  "soldPrice": null,
  "notes": "Added after earnings"
}
```

### Expense Entry Schema
```json
{
  "id": "exp_1741234567890_ef7a",
  "date": "2026-03-05",
  "description": "WOOLWORTHS 1106 PARRAMATTA",
  "amount": 124.65,
  "category": "Groceries",
  "paymentMethod": "ANZ Amex",
  "notes": ""
}
```

### Settings Schema
```json
{
  "currency": "AUD",
  "dateFormat": "DD/MM/YYYY",
  "theme": "dark",
  "chartsStyle": "Professional",
  "cards": ["ANZ Amex", "CommBank Everyday"],
  "notifications": {
    "enabled": true,
    "budgetAlerts": true,
    "overspend": true,
    "investment": true
  }
}
```

### Unique ID Generation
Every entry gets a unique ID generated at creation time:
```javascript
generateId('inc') → "inc_1741234567890_ab3f"
//                    prefix  timestamp    random 5-char suffix
```

This avoids collisions even if two entries are created within the same millisecond, and the prefix makes it easy to tell what type of record an ID belongs to.

---

## 10. Design System

A consistent visual language was defined and applied across every component.

### Colour Palette
| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#0F172A` | Main page background |
| `bg-card` | `#1E2139` | Card/panel backgrounds |
| `bg-header` | `#1A2332` | Table headers, section headers |
| `bg-alt-row` | `#1A2336` | Alternating table rows |
| `border` | `#334155` | All borders and dividers |
| `text-primary` | `#F1F5F9` | Main text |
| `text-muted` | `#CBD5E1` | Secondary text, labels |
| `text-dim` | `#64748B` | Placeholder, hints |
| `accent-cyan` | `#06B6D4` | Active states, primary CTAs |
| `green` | `#10B981` | Positive P&L, on-track budgets |
| `red` | `#EF4444` | Negative P&L, over-budget |
| `amber` | `#F59E0B` | Warnings, near-budget |

### Spacing
- Page padding: 24px
- Section gap: 32px
- Card gap: 16px
- Card internal padding: 20px
- Table cell padding: 12px

### Typography
- Metric values: 32px, bold, monospace
- Card titles: 12px, uppercase, `text-muted`
- Section headings: 18–20px, bold, white
- Table headers: 13px, bold, white

### Animations
- Form collapse: `max-height 300ms ease` + `opacity 300ms ease`
- Button hover: `background 150ms ease`
- Input focus: `border + box-shadow 200ms ease` (cyan glow)

### Component Conventions
- All forms are **collapsible by default** — the screen starts clean, forms appear on demand
- All tables have **alternating row colours** and **hover highlight**
- Action buttons in tables are **icon-only** (edit pencil, trash, etc.) to save space
- Positive amounts are always **green**, negative always **red**, zero is **muted**
- P&L percentages always include a `+` sign for positive values

---

## 11. What I Would Do Differently

Looking back at the build process, there are a few things I'd approach differently if I were starting fresh:

**1. Test CORS before picking any API**
The Alpha Vantage detour cost time. Next time, the first thing I'd do when evaluating an API is run `curl -I [url]` and check for `Access-Control-Allow-Origin` in the response headers. No CORS header = won't work in a browser app. Full stop.

**2. Test with real data from day one**
The CSV sign-convention bug was only caught because I uploaded my actual ANZ Amex statement during UAT. If I'd tested with a fake/manually created CSV, I would have only used standard-format data and never hit the positive-amount issue. Real data surfaces real edge cases.

**3. Write the categorisation rules against real bank descriptions earlier**
The merchant keyword matching was written in the abstract (e.g., `'KFC '`). Running it against actual ANZ descriptions earlier would have caught the underscore-separator issue (`KFC_AU_ROSEHILL`) before it made it to production.

**4. Start with a shared design system file**
The colour palette and spacing values were consistent across components, but they lived as inline Tailwind classes rather than a centralised `theme.js` or CSS variables file. For a larger project, centralising these would make redesigns much faster.

---

## 12. Future Roadmap

The following features are planned but not yet built:

### Near Term
- **ASX live prices** — Twelve Data integration is built and deployed, but UAT is still ongoing. Investigating why some ASX symbols still return stale data.
- **Export to CSV** — Currently exports as JSON backup. Adding a CSV export for sharing with accountants.
- **Recurring transactions** — Mark an expense as recurring (e.g., Netflix monthly) and auto-populate it.

### Medium Term
- **Partner view** — The data model already supports tagging income/expenses to "Me / Partner / Shared". A partner-filtered view needs to be built.
- **Tax year reporting** — Australian financial year is July–June. A tax-year summary report would be useful at EOFY.
- **Mobile responsive layout** — The app is usable on mobile but not optimised. A proper mobile layout with bottom navigation is planned.
- **Open Banking integration** — Automated transaction import using Australia's Consumer Data Right (CDR) rather than manual CSV upload.

### Long Term
- **PWA (Progressive Web App)** — Installable on iOS and Android as a home screen app, with offline support.
- **Multi-currency support** — Show USD-denominated US stocks in both USD (purchase) and AUD (current, via live FX rate).
- **Notifications** — Browser push notifications for: budget threshold reached, investment price milestone, monthly summary.

---

## 13. Reflections

This project is the clearest example I have of what I do professionally — bridge the gap between what people need and what gets built.

I came into this with no code written, a 35-page requirements document, a spreadsheet of my real portfolio, and a clear idea of what the end product should feel like. What I don't have is years of React development experience. What I do have is the ability to articulate requirements precisely, validate features methodically, escalate issues clearly, and iterate until something actually works.

The escalation on the ASX stock pricing issue is a good example. After two failed attempts that I accepted on faith, I said clearly: *"Too many iterations and this doesn't seem to be working. Why don't you perform internal testing before saying this is fixed? If this were my developer, I would have escalated."*

That's a product mindset. The fix that came after — testing CORS headers directly before writing any code — was a better approach because someone was held accountable for testing their work before shipping it.

The bank statement import feature is the one I'm most proud of. It solves a real problem (manually entering every transaction is painful), handles a real edge case I discovered with my own data (ANZ Amex's reverse sign convention), and adds a thoughtful UX detail (card tagging) that I thought of during testing rather than during planning.

**This is what AI-augmented product development looks like:** a person who knows what they want, can define it clearly, can test it against real data, and can drive iteration when something doesn't work — paired with tools that can translate those requirements into working software.

---

*Document prepared by Pradeep Narsupalli — March 2026*
*Personal Finance Tracker — https://github.com/pradeepn556/personal-finance-tracker*
