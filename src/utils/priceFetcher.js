// ============================================================
// utils/priceFetcher.js
// Live market price fetching:
//   • Crypto               → CoinGecko (free, no key, CORS-friendly)
//                            with Yahoo Finance as fallback
//   • ASX Stocks / ETFs   → Alpha Vantage (free API key, CORS-friendly,
//                            25 calls/day) — supports .AX suffix natively
//   • US Stocks / ETFs    → Finnhub (free API key, CORS-friendly,
//                            60 calls/min, no daily limit)
//   All sources            → Yahoo Finance fallback (CORS-blocked in most browsers)
//
// WHY two stock APIs?
//   Finnhub's FREE tier covers US exchanges (NASDAQ, NYSE) but NOT the ASX.
//   Alpha Vantage supports ASX stocks (BHP.AX, ANZ.AX, WOW.AX) on its free tier.
//   Both are CORS-enabled and work from any browser.
//
// SETUP:
//   1. Get a free Finnhub API key at https://finnhub.io/register
//      (US stocks/ETFs — 60 calls/min, no daily limit)
//   2. Get a free Alpha Vantage key at https://www.alphavantage.co/support/#api-key
//      (ASX stocks/ETFs — 25 calls/day, free tier)
//   3. Paste both keys in Settings → Live Prices
//   4. Crypto works automatically via CoinGecko (no key needed)
//
// SYMBOL FORMAT:
//   ASX stocks  → ANZ.AX, WOW.AX, WTC.AX, CBA.AX  (always use .AX suffix)
//   US stocks   → AAPL, TSLA, MSFT, NVDA
//   ETFs        → VGS.AX, A200.AX, NDQ.AX, SPY
//   Crypto      → BTC, ETH, SOL, ADA, DOGE (any from COINGECKO_IDS list)
// ============================================================

const STATUS_KEY      = 'priceStatus';        // per-symbol { status, source, updatedAt }
const REFRESH_KEY     = 'lastPriceRefresh';   // ISO timestamp of last batch refresh
const FINNHUB_KEY_KEY = 'finnhubApiKey';      // Finnhub key  — US stocks / ETFs (60 calls/min, no daily limit)
const ALPHA_KEY_KEY   = 'alphaVantageApiKey'; // Alpha Vantage key — ASX stocks (25 calls/day free)
const CACHE_TTL_MS    = 15 * 60 * 1000;      // 15 min — stale threshold for manual refresh badge
const AUTO_TTL_MS     = 60 * 60 * 1000;      // 1 hour  — threshold for auto-refresh on page load

// ── CoinGecko coin ID mapping ───────────────────────────────
// Maps common uppercase ticker → CoinGecko coin ID.
// Add more as needed.
export const COINGECKO_IDS = {
  BTC:   'bitcoin',              ETH:   'ethereum',
  SOL:   'solana',               ADA:   'cardano',
  DOT:   'polkadot',             DOGE:  'dogecoin',
  SHIB:  'shiba-inu',            AVAX:  'avalanche-2',
  MATIC: 'matic-network',        LINK:  'chainlink',
  UNI:   'uniswap',              LTC:   'litecoin',
  XRP:   'ripple',               BNB:   'binancecoin',
  ATOM:  'cosmos',               NEAR:  'near',
  APT:   'aptos',                ARB:   'arbitrum',
  INJ:   'injective-protocol',   OP:    'optimism',
  SUI:   'sui',                  TON:   'the-open-network',
  FTM:   'fantom',               SAND:  'the-sandbox',
  MANA:  'decentraland',         CRO:   'crypto-com-chain',
  TRX:   'tron',                 HBAR:  'hedera-hashgraph',
  ICP:   'internet-computer',    FIL:   'filecoin',
  ETC:   'ethereum-classic',     AAVE:  'aave',
  MKR:   'maker',                GRT:   'the-graph',
  SNX:   'synthetix-network-token', LDO: 'lido-dao',
  PEPE:  'pepe',                 WIF:   'dogwifcoin',
  RENDER:'render-token',         FET:   'fetch-ai',
};

// ── Finnhub API key helpers (US stocks / ETFs) ──────────────
export function loadFinnhubKey() {
  return localStorage.getItem(FINNHUB_KEY_KEY) || '';
}

export function saveFinnhubKey(key) {
  try { localStorage.setItem(FINNHUB_KEY_KEY, (key || '').trim()); } catch { /* quota */ }
}

// ── Alpha Vantage API key helpers (ASX stocks) ───────────────
// Why Alpha Vantage for ASX?
//   Finnhub's FREE tier does NOT include ASX (Australian Securities Exchange) data.
//   Alpha Vantage supports ASX stocks with the .AX suffix on its free tier.
//   Free tier: 25 API calls/day — sufficient for a personal portfolio check once or twice daily.
export function loadAlphaVantageKey() {
  return localStorage.getItem(ALPHA_KEY_KEY) || '';
}

export function saveAlphaVantageKey(key) {
  try { localStorage.setItem(ALPHA_KEY_KEY, (key || '').trim()); } catch { /* quota */ }
}

// ── Price status helpers ─────────────────────────────────────
export function loadPriceStatus() {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}'); }
  catch { return {}; }
}

export function savePriceStatus(status) {
  try { localStorage.setItem(STATUS_KEY, JSON.stringify(status)); } catch { /* quota */ }
}

export function loadLastRefresh() {
  return localStorage.getItem(REFRESH_KEY) || null;
}

export function saveLastRefresh(iso) {
  try { localStorage.setItem(REFRESH_KEY, iso); } catch { /* quota */ }
}

/** Returns true if the given ISO timestamp is older than ttlMs (default 15 min). */
export function isPriceStale(lastRefreshISO, ttlMs = CACHE_TTL_MS) {
  if (!lastRefreshISO) return true;
  return Date.now() - new Date(lastRefreshISO).getTime() > ttlMs;
}

export { AUTO_TTL_MS };

// ── Finnhub ──────────────────────────────────────────────────
// CORS-enabled, free tier: 60 calls/min, no daily limit.
// Returns { price, fetchedAs, isASX } or null.
//
// Symbol format:
//   ASX stocks      → ANZ.AX, WOW.AX, WTC.AX, BHP.AX  (always use .AX)
//   NASDAQ/NYSE     → IREN, AAPL, TSLA, MSFT           (no suffix, price in USD)
//   ASX ETFs        → VGS.AX, A200.AX, NDQ.AX
//   US ETFs         → SPY, QQQ
//
// Candidate order: tries SYMBOL.AX first (ASX preference, price in AUD),
// then falls back to plain SYMBOL (NASDAQ/NYSE, price typically in USD).
//
// The caller receives `isASX` to detect when a non-ASX exchange was used,
// so the UI can show a "price may be in USD" warning to the user.
export async function fetchFinnhubPrice(rawSymbol, apiKey) {
  if (!apiKey) return null;
  const sym = rawSymbol.trim().toUpperCase();
  const isAXSymbol = sym.endsWith('.AX');

  // ASX preference: try SYMBOL.AX first, then plain SYMBOL for NASDAQ/NYSE stocks
  const candidates = isAXSymbol ? [sym] : [`${sym}.AX`, sym];

  for (const candidate of candidates) {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(candidate)}&token=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const json  = await res.json();
      const price = json?.c;   // 'c' = current price in Finnhub quote response
      if (price && price > 0) {
        const isASX = candidate.endsWith('.AX');
        return { price, fetchedAs: candidate, isASX };
      }
    } catch { /* try next candidate */ }
  }
  return null;
}

// ── Yahoo Finance ─────────────────────────────────────────────
// NOTE: Yahoo Finance does NOT send CORS headers (Access-Control-Allow-Origin).
// Browser fetch calls are blocked by CORS policy on most deployments.
// This function is kept as a fallback for environments that work around CORS
// (e.g., some native browser contexts, dev environments with proxy).
// For reliable stock prices, use Finnhub (above) with an API key.
//
// Tries candidates in order: SYMBOL.AX → SYMBOL → SYMBOL-USD
// Returns { price, fetchedAs } or null.
export async function fetchYahooPrice(rawSymbol) {
  const sym        = rawSymbol.trim().toUpperCase();
  const isAXSymbol = sym.endsWith('.AX');
  const candidates = isAXSymbol
    ? [sym]
    : [`${sym}.AX`, sym, `${sym}-USD`];

  for (const candidate of candidates) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?interval=1d&range=1d`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const json = await res.json();
      const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 0) return { price, fetchedAs: candidate };
    } catch { /* try next candidate */ }
  }
  return null;
}

// ── CoinGecko ────────────────────────────────────────────────
// Free public API — no key required, CORS-friendly.
// Returns { price } or null.
export async function fetchCoinGeckoPrice(rawSymbol, currency = 'AUD') {
  const sym    = rawSymbol.trim().toUpperCase();
  const coinId = COINGECKO_IDS[sym];
  if (!coinId) return null;                 // unmapped symbol — skip

  try {
    const cur = currency.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${cur}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json  = await res.json();
    const price = json?.[coinId]?.[cur];
    return price > 0 ? { price } : null;
  } catch { return null; }
}

// ── Alpha Vantage ─────────────────────────────────────────────
// CORS-enabled, free tier: 25 calls/day, 5 calls/min.
// Primary source for ASX stocks (.AX suffix) — Finnhub free tier does not cover ASX.
// Returns { price, fetchedAs } or null.
//
// Symbol format: any symbol Alpha Vantage supports, e.g. BHP.AX, ANZ.AX, WOW.AX
// Prices are returned in the exchange's local currency (AUD for ASX).
export async function fetchAlphaVantagePrice(rawSymbol, apiKey) {
  if (!apiKey) return null;
  const sym = rawSymbol.trim().toUpperCase();
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json  = await res.json();
    // Alpha Vantage returns an empty "Global Quote" object when the symbol is not found
    // or when the daily rate limit (25 calls) is exceeded (it returns a note instead).
    if (json?.Note || json?.Information) return null;  // rate limit hit
    const price = parseFloat(json?.['Global Quote']?.['05. price']);
    if (price && price > 0) return { price, fetchedAs: sym };
  } catch { /* network error */ }
  return null;
}

// ── Main entry ───────────────────────────────────────────────
// Returns { price: number, source: string, fetchedAs?: string, isASX?: boolean } | null
//
// `isASX` is true  → price fetched from ASX (AUD)
// `isASX` is false → price fetched from NASDAQ/NYSE (USD) — UI should warn the user
// `isASX` is undefined → source doesn't distinguish (CoinGecko, Yahoo Finance)
//
// Routing priority:
//   Crypto        → CoinGecko → Yahoo Finance → Finnhub
//   ASX (.AX)     → Alpha Vantage → Finnhub fallback → Yahoo Finance
//   US stocks     → Finnhub → Yahoo Finance
//
// Add your free API keys in Settings → Live Prices.
// Alpha Vantage: https://www.alphavantage.co/support/#api-key  (ASX, 25 calls/day)
// Finnhub:       https://finnhub.io/register                   (US,  60 calls/min)
export async function fetchLivePrice(symbol, type, currency = 'AUD') {
  const sym        = symbol.trim().toUpperCase();
  const finnhubKey = loadFinnhubKey();
  const alphaKey   = loadAlphaVantageKey();
  const isAXSymbol = sym.endsWith('.AX');

  if (type === 'Crypto') {
    // CoinGecko: CORS-friendly, no key needed — primary source for crypto
    const cg = await fetchCoinGeckoPrice(sym, currency);
    if (cg) return { price: cg.price, source: 'CoinGecko' };

    // Yahoo Finance fallback for crypto (BTC-USD, ETH-USD etc.)
    const yf = await fetchYahooPrice(sym);
    if (yf) return { price: yf.price, source: 'Yahoo Finance', fetchedAs: yf.fetchedAs };

    // Finnhub last-resort fallback for crypto
    if (finnhubKey) {
      const fh = await fetchFinnhubPrice(sym, finnhubKey);
      if (fh) return { price: fh.price, source: 'Finnhub', fetchedAs: fh.fetchedAs, isASX: fh.isASX };
    }
    return null;
  }

  // ── Stocks, ETFs, Bonds, Mutual Funds, Other ──────────────
  // ASX symbols (.AX suffix) → Alpha Vantage first (Finnhub free tier does not cover ASX)
  if (isAXSymbol && alphaKey) {
    const av = await fetchAlphaVantagePrice(sym, alphaKey);
    if (av) return { price: av.price, source: 'Alpha Vantage', fetchedAs: av.fetchedAs, isASX: true };
  }

  // US stocks / ETFs (or ASX fallback if Alpha Vantage key not set) → Finnhub
  // fetchFinnhubPrice tries SYMBOL.AX first, then plain SYMBOL for NASDAQ/NYSE.
  // isASX flag tells the UI whether the price came from ASX (AUD) or another exchange (USD).
  if (finnhubKey) {
    const fh = await fetchFinnhubPrice(sym, finnhubKey);
    if (fh) return { price: fh.price, source: 'Finnhub', fetchedAs: fh.fetchedAs, isASX: fh.isASX };
  }

  // Yahoo Finance fallback (CORS-blocked on most browser deployments,
  // but may work in some local/dev environments)
  const yf = await fetchYahooPrice(sym);
  if (yf) return { price: yf.price, source: 'Yahoo Finance', fetchedAs: yf.fetchedAs };

  return null;
}
