# Personal Finance Tracker

**A production-quality personal finance management application** — designed, specified, and product-managed by me (Pradeep N), built through structured PRD-driven development using Claude Code.

This project demonstrates my ability to translate complex personal finance requirements into a fully functional, professionally designed web application — including detailed product specifications, iterative UAT cycles, edge case identification, and pixel-perfect design direction.

---

## Product Overview

A full-featured finance dashboard covering five core domains — each with its own data model, analytics, and UX flow designed from scratch.

| Module | What it does |
|---|---|
| **Dashboard** | Unified net worth view, cash flow trend, financial health metrics, recent transaction feed |
| **Income** | Multi-source income tracking (salary, side hustle, partner) with recipient tagging and monthly analytics |
| **Investments** | Live-price portfolio tracking across ASX and US markets — holdings, tranches, P&L, heatmap, closed positions |
| **Expenses** | Category-based expense logging with budget management, overspend alerts, and trend analysis |
| **Settings** | Finnhub API key management, display preferences, JSON/CSV export-import |

---

## Investment Module — Product Design Highlights

The investments tab required the most complex product thinking. Key design decisions I specified:

**Tranche-based portfolio model** — Every buy event is stored as a separate lot, enabling accurate cost basis calculation per purchase date and price. Users can view all lots for a symbol in a dedicated modal.

**Partial position closing** — Rather than a binary open/closed state, I designed a flow where users can sell a portion of any lot. The system splits the record: a new closed entry is created for the sold quantity, and the original lot's quantity is reduced. Realised P&L is tracked separately from unrealised.

**Dual-exchange live pricing** — The app supports both ASX-listed stocks (`.AX` suffix, AUD pricing) and US-listed stocks (plain ticker, USD pricing) in the same portfolio. I identified that Finnhub tries the ASX exchange first and falls back to NASDAQ/NYSE — and specified that the UI must surface a clear `USD` currency badge when a non-ASX price is returned, so users always know which currency they're looking at.

**CORS-safe architecture** — I identified early that Yahoo Finance's unofficial API is blocked by browsers due to missing CORS headers. The final architecture uses CoinGecko (crypto, no key required) and Finnhub (stocks/ETFs, free API key, CORS-enabled) as primary sources — with Yahoo Finance retained as a non-CORS fallback for local/dev environments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Vite) |
| Styling | Tailwind CSS v4 + design token system |
| Charts | Recharts |
| Icons | Lucide React |
| Storage | Browser localStorage — zero backend, fully private |
| Live Prices | CoinGecko API (crypto) · Finnhub API (stocks/ETFs) |

---

## Project Structure

```
src/
├── components/
│   ├── Dashboard/       # Net worth, cash flow, financial health, transactions
│   ├── Income/          # Income log, source/recipient tracking, analytics
│   ├── Investments/     # Portfolio, tranches modal, live prices, heatmap
│   ├── Expenses/        # Budget management, category analytics
│   └── Settings/        # API key management, export/import, preferences
├── utils/
│   ├── storage.js       # localStorage abstraction, ID generation
│   ├── calculations.js  # Net worth, unrealised/realised P&L, budget formulas
│   ├── priceFetcher.js  # Live price routing (CoinGecko → Finnhub → Yahoo)
│   ├── formatters.js    # Currency, percentage, number formatting
│   └── dateHelpers.js   # Date parsing, formatting, ISO helpers
└── App.jsx              # Tab navigation, global state, localStorage sync
```

---

## Development Approach

**PRD-first** — Requirements were written as a detailed 35-page product specification before any code was written. The spec covered data models, UI layout per tab, edge cases, and acceptance criteria.

**Iterative UAT** — Each tab went through structured user acceptance testing. Bugs were identified with screenshots and precise reproduction steps, then fixed with root cause analysis documented in commit messages. Notable bugs caught and resolved through UAT:
- Data loss on live price refresh (React functional updater passed to non-functional state manager → `JSON.stringify(function)` = `undefined` stored in localStorage)
- Wrong exchange pricing (Finnhub falling back to NYSE price in USD for ASX-listed stocks)
- Screen blank on price fetch (same root cause as above — state set to a function reference)

**Design direction** — Dark professional theme, consistent design tokens, collapsible forms, professional tables with alternating rows and hover states, animated transitions, responsive layout across mobile and desktop.

---

## Run Locally

```bash
git clone https://github.com/pradeepn556/personal-finance-tracker.git
cd personal-finance-tracker
npm install
npm run dev
```

---

## Development Log

| Date | Milestone |
|---|---|
| Mar 2026 | Project setup — 35-page PRD written, Vite + React scaffold, GitHub repo |
| Mar 2026 | All 5 tabs built to spec: Dashboard, Income, Investments, Expenses, Settings |
| Mar 2026 | Full UI redesign — dark professional theme, collapsible forms, professional tables |
| Mar 2026 | Investment tranches — per-lot tracking, partial close flow, closed positions with realised P&L |
| Mar 2026 | Live price integration — CoinGecko (crypto) + Finnhub (stocks/ETFs), CORS architecture decision |
| Mar 2026 | ASX + US/NASDAQ dual-market support — exchange detection, USD currency badge, error messaging |
| Coming | GitHub Pages deployment |

---

## About

**Pradeep Narsupalli** — Product Specialist

This project is part of my portfolio demonstrating AI-augmented product development — where I own the product vision, requirements, design direction, and UAT, while using Claude Code as my implementation engine.

> *Directing AI to build is the next evolution of product management. This project is proof of concept.*

---

## Licence

MIT
