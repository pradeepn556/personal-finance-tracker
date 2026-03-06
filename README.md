# Personal Finance Tracker

---

## The Story Behind This

My partner and I had a system that worked — technically. Two separate spreadsheets. One for investments, one for monthly expenses. A third for tracking how our closed positions performed — which stocks we sold, what we paid, what we got back, whether the returns were actually worth it against our personal savings goals.

Every number in those spreadsheets was entered by hand. Every month, we'd sit down, go through bank statements transaction by transaction, type figures in, build our own formulas to calculate portfolio P&L, and try to piece together a picture of where we actually stood financially. It wasn't broken. But it was slow, error-prone, and — honestly — the kind of friction that makes you put it off until you're two months behind.

The investment side was the worst of it. We hold both ASX stocks and some US positions, plus a small crypto allocation. Tracking live prices meant manually looking them up and updating cells. Tracking a partial sell — where you close half a position but hold the rest — required careful formula gymnastics to keep the cost basis right. One mistake and the P&L numbers were silently wrong until you noticed something didn't add up.

At some point the conversation shifted from "let's fix the spreadsheets" to "why are we doing this manually at all?"

---

## What This Became

The idea was simple: build something personalised to exactly how we track our finances — not a generic app that almost fits, but something designed around our actual workflows.

The requirements that came out of that conversation:
- **Bank statements should feed directly in** — download the CSV from ANZ, drop it in, transactions appear categorised. Done.
- **Investment prices should update automatically** — ASX stocks, US stocks, crypto, all from live APIs, no manual lookups.
- **Closed positions should tell the real story** — when we sell, the app should immediately show what we made or lost on that specific lot, separate from what's still open.
- **Everything stays private** — no linking bank accounts to a third-party service, no cloud sync, no subscription. Our data, on our device.

What started as "let's solve the spreadsheet problem" became a properly built application — five modules, a data model designed around investment tranches, bank statement import that handles the quirks of how ANZ actually exports data, and a dashboard that gives us the net worth and cash flow picture at a glance.

The fact that it also became a useful exercise in applying AI-directed development and product thinking end-to-end — that's a secondary outcome. The primary one is that we don't do the spreadsheet routine anymore.

---

## How It Was Built

I have a background in frontend web development, and over time moved into a product specialist role. So I brought both sides to this: I knew what to build and why, and I knew enough about how things get built to specify it precisely.

I used **Claude Code** as the implementation engine — directing it with a detailed 35-page specification rather than writing the code myself. Not because I couldn't, but because I wanted to apply the same model I use professionally: clear requirements, structured direction, and rigorous validation. The interesting thing about that workflow is that the quality of what gets built is almost entirely determined by the quality of how you specify and test it. This project is the proof of that.

Testing happened with real data — my actual ANZ Amex statement, my real ASX holdings, real pay cycles. That's how I caught things like the ANZ Amex sign-convention issue (their credit card statements export purchases as positive amounts — the opposite of every standard bank account), which only surfaced when 2 of 57 real transactions came through instead of all 57. Synthetic test data would never have caught it.

---

## Product Overview

A full-featured finance dashboard covering five core domains — each with its own data model, analytics, and UX flow.

| Module | What it does |
|---|---|
| **Dashboard** | Unified net worth view, 12-month cash flow trend, financial health metrics, recent transaction feed |
| **Income** | Multi-source income tracking (salary, side hustle, partner) with recipient tagging, pay cycle support, and monthly analytics |
| **Investments** | Live-price portfolio tracking across ASX and US markets — holdings, tranches, P&L, heatmap, closed positions, partial sells |
| **Expenses** | Category-based expense logging with budget management, bank statement CSV import, auto-categorisation, and overspend alerts |
| **Settings** | API key management, credit card/account names, budget configuration, JSON backup/restore |

---

## Investment Module — The Thinking Behind the Design

The investments tab required the most complex product thinking. Here's how I approached it:

**Tranche-based portfolio model**

Business requirement: users need to understand performance accurately — including which specific purchases are winning or losing, not just a blended average.

Edge case I identified: if you only track "quantity of CBA", you can't answer "what's my P&L on the shares I bought in January versus the ones I bought in March at a different price?" You lose cost-basis precision the moment you have multiple buy-ins.

Design decision: every purchase event is stored as a separate lot ("tranche") with its own date, quantity, and price. A dedicated Tranches Modal lets users view, edit, or close individual lots.

This is the kind of thinking I bring to product decisions — understanding the data model implications of a requirement before the implementation begins.

**Partial position closing**

Rather than a binary open/closed state, I designed a flow for selling a portion of any lot. The system splits the record: a new closed entry is created for the sold quantity, the original lot's quantity is reduced. Realised P&L is tracked separately from unrealised.

**Dual-exchange live pricing**

The app supports both ASX-listed stocks (`.AX` suffix, AUD pricing) and US-listed stocks (plain ticker, USD pricing) in the same portfolio. I identified that different APIs handle ASX differently — Finnhub's free tier doesn't fully cover ASX, Alpha Vantage has no CORS headers (browser-blocked), Twelve Data does. I verified this with curl before writing any code. The UI surfaces a clear USD currency badge when a non-ASX price is returned so users always know which currency they're looking at.

**CORS-safe architecture**

I identified early that several financial APIs are blocked by browsers due to missing CORS headers — including Yahoo Finance and Alpha Vantage. The CORS issue is invisible: the API key saves successfully, the request appears to fire, but the browser silently blocks the response. I diagnosed this by inspecting HTTP headers directly with curl rather than assuming it was an API key problem. The final architecture uses CoinGecko (crypto, no key required), Twelve Data (ASX stocks, CORS-verified), and Finnhub (US stocks, CORS-enabled) as primary sources.

---

## Bank Statement Import — Australian Context

Manually entering every transaction is the reason people stop using finance apps. So I built a CSV import feature that works with how Australian banks actually export data.

**Why CSV and not screenshots?**
OCR misreads financial data in ways that are hard to catch — `$1,234` becomes `$1.234`. CSVs are machine-generated and exact. Every major Australian bank supports CSV export (ANZ, CommBank, Westpac, NAB).

**The sign-convention problem I found and fixed:**
ANZ Amex credit card statements export purchases as *positive* amounts and payments as *negative* amounts — the opposite of every standard bank account. My initial import code assumed the standard convention and only extracted 2 of 57 transactions from my real statement. I diagnosed it by running the parser against the actual file, identified the pattern, and built automatic sign-convention detection: the parser counts positive vs negative amounts in the file and determines the convention before extracting anything. No user configuration needed.

**Auto-categorisation:**
17 Australian merchant rule sets covering Woolworths/Coles/Aldi, KFC/McDonald's/Domino's, Chemist Warehouse, Bunnings, Telstra/Optus, Netflix/Spotify, and more. 80%+ auto-categorisation rate on real ANZ data. Categories are editable in the preview table before import.

**Credit card tagging:**
Save your card/account names in Settings, select which one you're importing during upload. Every transaction is tagged so you can filter by card in the Expenses view.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Vite) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Storage | Browser localStorage — zero backend, fully private |
| Live Prices (Crypto) | CoinGecko API — no key required |
| Live Prices (ASX) | Twelve Data API — free key, CORS-verified |
| Live Prices (US) | Finnhub API — free key, CORS-enabled |

**No backend. By design.**
This is a single-user personal app. There's no data that needs to live on a server, no authentication problem to solve, and no hosting cost that needs to exist. Everything runs in the browser and stays on the device.

---

## Project Structure

```
src/
├── components/
│   ├── Dashboard/       # Net worth, cash flow, financial health, recent transactions
│   ├── Income/          # Income log, source/recipient tracking, pay cycle, analytics
│   ├── Investments/     # Portfolio, tranches modal, live prices, heatmap, closed positions
│   ├── Expenses/        # Budget management, CSV import, category analytics
│   └── Settings/        # API keys, card names, budget config, export/import
├── utils/
│   ├── storage.js       # localStorage abstraction, ID generation, default settings
│   ├── calculations.js  # Net worth, unrealised/realised P&L, savings rate, budget formulas
│   ├── priceFetcher.js  # Live price routing — CoinGecko · Twelve Data · Finnhub · Yahoo
│   ├── formatters.js    # AUD currency, percentage, number formatting
│   └── dateHelpers.js   # Date parsing, month arithmetic, ISO helpers
└── App.jsx              # Tab navigation, global state, localStorage sync
```

---

## Development Approach

**PRD-first** — 35-page product specification written before any code. Covered data models, UI layout per tab, edge cases, API integration approach, and acceptance criteria per feature. Written with enough specificity that it could be handed to a development team — or to Claude Code — without guesswork.

**Iterative UAT with real data** — Every tab tested with actual transactions, real CSV files, and real ASX/US symbols. Bugs were identified with precise reproduction steps and fixed with root cause analysis. Notable issues caught:

- **Data loss on live price refresh** — React functional updater passed to a state manager that called `JSON.stringify` on it. `JSON.stringify(function)` returns `undefined`. Investments array overwritten with undefined. Fixed by detecting function vs value before serialising.
- **Wrong exchange pricing** — Finnhub falling back to NYSE price in USD for ASX-listed stocks. Fixed by adding exchange detection and surfacing a USD currency warning badge.
- **Sign-convention failure** — ANZ Amex CSV imports positive-as-expense. Fixed with 2-pass auto-detection.
- **Alpha Vantage CORS block** — API appeared configured but silently failed. Diagnosed with curl header inspection. Replaced with Twelve Data.

**Design direction** — Dark professional theme, consistent design tokens, collapsible forms (hidden until needed), professional tables with alternating rows and hover states, animated transitions. Specified in the PRD down to colour hex values, spacing units, and animation durations.

---

## Run Locally

```bash
git clone https://github.com/pradeepn556/personal-finance-tracker.git
cd personal-finance-tracker
npm install
npm run dev
```

For live stock/ETF prices, free API keys are needed:
- **Twelve Data** (ASX stocks) → [twelvedata.com/register](https://twelvedata.com/register) — 800 calls/day
- **Finnhub** (US stocks) → [finnhub.io/register](https://finnhub.io/register) — 60 calls/min

Crypto prices via CoinGecko work without any key.

---

## Development Log

| Commit | What changed |
|---|---|
| Project scaffold | Vite + React + Tailwind setup, folder structure, ESLint |
| Utility layer + Dashboard | storage.js, calculations.js, formatters.js, dateHelpers.js — then Dashboard tab |
| All 5 tabs | Income, Investments, Expenses, Settings — all functional in first pass |
| Full UI redesign | Professional dark theme, collapsible forms, design token system applied across all components |
| Expenses fixes | Budget bar percentages, pay-cycle filter scoping, quick filter date range |
| Live prices v1 | CoinGecko (crypto) + Yahoo Finance (stocks) — auto-fetch on symbol entry |
| Investments polish | Tranches modal fixes, heatmap positioning, edit/delete flow |
| CORS fix #1 | Yahoo Finance → Finnhub (US stocks) — CORS-verified replacement |
| Critical bug fixes | Data loss, wrong exchange, app crash — all from live price UAT |
| ASX + US dual support | Exchange detection, USD badge, error guidance |
| Alpha Vantage attempt | Added for ASX — failed CORS inspection, superseded next commit |
| CORS fix #2 | Alpha Vantage → Twelve Data (ASX) — curl-verified before implementation |
| CSV import | Bank statement import, 17-category auto-categoriser, duplicate detection |
| Sign-convention fix | ANZ Amex positive-as-expense detection, credit card tagging |
| Keyword fix | `'KFC '` → `'KFC'` — ANZ uses underscores not spaces as separators |

---

## About

**Pradeep Narsupalli** — Product Specialist

Frontend development background, now on the product side. I work at the intersection of what needs to be built and how it gets built — which is exactly what this project is.

This is part of my portfolio demonstrating AI-augmented product development: detailed requirements, structured implementation direction, and rigorous testing — applied end-to-end on a real problem I actually needed solved.

> *The value isn't in knowing how to write React. It's in knowing what to build, why it matters, and how to validate it works.*

---

## Licence

MIT
