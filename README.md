# 💰 Personal Finance Tracker

A professional-grade personal finance management app built with React — track income, investments, and expenses with live market prices, portfolio analytics, and beautiful dark-mode visualisations.

> **Built as a portfolio project demonstrating AI-augmented product development.**
> Requirements & product design by Pradeep N · Implementation via [Claude Code](https://claude.ai/code)

---

## 🌐 Live Demo

> Deployment to GitHub Pages coming soon

---

## ✨ Feature Overview

### 📊 Dashboard
- **Net Worth** summary card with real-time total
- **Monthly Cash Flow** — income vs expenses bar chart
- **Financial Health** — savings rate, expense ratio, investment rate gauges
- **Net Worth Trend** — line chart over time
- **Recent Transactions** — unified feed across all categories

### 💵 Income
- Log income entries with source, recipient, and category
- Income sources: Main Job · Side Hustle · Partner · Other
- Recipient tagging: Me · Partner · Shared
- Monthly trend charts, income breakdown pie chart
- Filter + searchable professional table with inline edit/delete

### 📈 Investments *(most feature-rich tab)*
- **Live price fetching** — automatic on load, manual refresh button
  - 🟢 Crypto → CoinGecko (free, no key, always works)
  - 📡 Stocks / ETFs → Finnhub (free API key, CORS-enabled, 60 calls/min)
- **ASX + US stock support** — add both in the same portfolio:
  - ASX stocks: `BHP.AX`, `ANZ.AX`, `WOW.AX` → price in AUD
  - NASDAQ/NYSE stocks: `IREN`, `AAPL`, `TSLA` → price in USD (flagged with amber **USD** badge)
- **Holdings table** — grouped by symbol, shows live/manual price status indicator
- **Tranches modal** — click any holding to see individual buy lots with full P&L breakdown
  - Edit, Delete, or **Close Units** per tranche
  - Partial close: sell X of N units — creates a closed record and reduces original qty
- **Closed Positions** — toggle section showing realised P&L for sold positions
- **Portfolio Heatmap** — tiles sized by portfolio weight, coloured by P&L %
- **Asset Allocation** pie chart + **Performance P&L %** bar chart
- Collapsible add-investment form with auto-fetch or manual price entry

### 💳 Expenses
- Log expenses with category, amount, and date
- **Budget Management** — set monthly budgets per category
- Budget progress bars with overspend alerts
- Spending by category, monthly trend, weekday pattern charts
- Filter, sort, and search expense table

### ⚙️ Settings
- **Live Prices** — enter your free Finnhub API key to enable stock price fetching
  - Shows connection status for CoinGecko (auto) and Finnhub (key required)
  - Symbol format guide built in
- **Display Preferences** — currency, date format
- **Data & Backup** — export as JSON or CSV, import from JSON
- **Clear All Data** — full reset with confirmation

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Vite) |
| Styling | Tailwind CSS v4 + inline styles |
| Charts | Recharts |
| Icons | Lucide React |
| Storage | Browser localStorage (no backend) |
| Live Prices | [CoinGecko API](https://coingecko.com) · [Finnhub API](https://finnhub.io) |
| Build | Vite 7 |
| Hosting | GitHub Pages *(coming soon)* |

---

## 📡 Live Price Setup

Crypto prices work **automatically** — no setup needed.

For **stocks and ETFs**, get a free Finnhub API key:

1. Go to [finnhub.io/register](https://finnhub.io/register) (30 seconds, no credit card)
2. Copy your API key
3. Open the app → **Settings** → **📡 Live Prices** → paste key → **Save**

> Free tier: 60 API calls/minute · No daily limit

### Supported Symbol Formats

| Asset type | Format | Examples |
|---|---|---|
| ASX Stocks | `TICKER.AX` | `BHP.AX`, `ANZ.AX`, `WOW.AX`, `CBA.AX` |
| NASDAQ / NYSE | Plain ticker | `IREN`, `AAPL`, `TSLA`, `MSFT` |
| ASX ETFs | `TICKER.AX` | `VGS.AX`, `A200.AX`, `NDQ.AX` |
| US ETFs | Plain ticker | `SPY`, `QQQ` |
| Crypto | Plain ticker | `BTC`, `ETH`, `SOL`, `ADA`, `DOGE` |

> ⚠️ US stock prices are fetched in **USD**. The app shows an amber `USD` badge on those rows in the Holdings table so you always know which currency the price is in.

---

## 🗂 Project Structure

```
src/
├── components/
│   ├── Dashboard/       # Net worth, cash flow, financial health, transactions
│   ├── Income/          # Income log, charts, filter table
│   ├── Investments/     # Portfolio, tranches modal, heatmap, live prices
│   ├── Expenses/        # Budget tracking, spending analysis, filter table
│   └── Settings/        # Finnhub key, export/import, display prefs
├── utils/
│   ├── storage.js       # localStorage read/write, ID generation
│   ├── calculations.js  # Net worth, P&L, budget, realised P&L formulas
│   ├── priceFetcher.js  # Live price fetching (CoinGecko, Finnhub, Yahoo)
│   ├── formatters.js    # Currency (AUD/USD), percentage formatting
│   └── dateHelpers.js   # Date formatting, ISO helpers
└── App.jsx              # Tab navigation, global state, localStorage sync
```

---

## 🚀 Run Locally

```bash
git clone https://github.com/pradeepn556/personal-finance-tracker.git
cd personal-finance-tracker
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Build for production:**
```bash
npm run build
```

---

## 🏗 Architecture Notes

- **No backend** — all data lives in the browser's `localStorage`. Nothing leaves your device.
- **Functional updater pattern** — state updates use `prev => newValue` to support both direct values and updater functions safely.
- **CORS-safe fetching** — Yahoo Finance is CORS-blocked in browsers. The app uses CoinGecko (always works) and Finnhub (CORS-enabled with proper headers) instead.
- **isASX flag** — Finnhub tries `SYMBOL.AX` first (ASX, AUD), then plain `SYMBOL` (NASDAQ/NYSE, USD). The `isASX` boolean flows through to the UI to display currency warnings.
- **Investment tranches** — each buy event is a separate record. Partial sells create a new closed record and reduce the original lot's quantity.

---

## 🤖 About This Project

This project was built as part of developing AI-augmented product skills — where the human defines the product, and AI handles the implementation.

| Role | Person / Tool |
|---|---|
| Product requirements & design | Pradeep N (BA / Product Specialist) |
| Implementation | [Claude Code](https://claude.ai/code) by Anthropic |
| Purpose | Portfolio project demonstrating AI-assisted development |

> *"The future of product management is directing AI tools to build — not just writing specs for human developers."*

---

## 📅 Development Log

| Date | Milestone |
|---|---|
| Mar 2026 | Project setup — Vite + React scaffold, GitHub repo |
| Mar 2026 | All 5 tabs built: Dashboard, Income, Investments, Expenses, Settings |
| Mar 2026 | Full UI redesign — dark professional theme, collapsible forms, professional tables |
| Mar 2026 | Investment tranches — per-lot tracking, partial close, closed positions |
| Mar 2026 | Live price fetching — CoinGecko (crypto) + Finnhub (stocks/ETFs) |
| Mar 2026 | ASX + US/NASDAQ stock support — automatic exchange detection with USD badge |
| Coming | GitHub Pages deployment |

---

## 📄 Licence

MIT — feel free to use this for your own learning.
