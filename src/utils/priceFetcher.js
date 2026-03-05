// ============================================================
// utils/priceFetcher.js
// Live market price fetching:
//   • Stocks / ETFs / Bonds → Yahoo Finance (tries SYMBOL.AX first
//     for Australian context, then plain SYMBOL, then SYMBOL-USD)
//   • Crypto               → CoinGecko (free, no key needed) with
//                            Yahoo Finance as fallback
// Prices are persisted in localStorage so the last-fetched values
// survive a page refresh, and the Holdings header shows when they
// were last updated.
// ============================================================

const STATUS_KEY   = 'priceStatus';      // per-symbol { status, source, updatedAt }
const REFRESH_KEY  = 'lastPriceRefresh'; // ISO timestamp of last batch refresh
const CACHE_TTL_MS = 15 * 60 * 1000;    // 15 min — stale threshold for manual refresh badge
const AUTO_TTL_MS  = 60 * 60 * 1000;    // 1 hour  — threshold for auto-refresh on page load

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

// ── localStorage helpers ────────────────────────────────────
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

// ── Yahoo Finance ───────────────────────────────────────────
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

// ── CoinGecko ───────────────────────────────────────────────
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

// ── Main entry ──────────────────────────────────────────────
// Returns { price: number, source: string } | null
// • Crypto → CoinGecko first, Yahoo fallback
// • Others → Yahoo Finance (ASX .AX tried first)
export async function fetchLivePrice(symbol, type, currency = 'AUD') {
  const sym = symbol.trim().toUpperCase();

  if (type === 'Crypto') {
    const cg = await fetchCoinGeckoPrice(sym, currency);
    if (cg) return { price: cg.price, source: 'CoinGecko' };
    // Fallback: Yahoo handles BTC-USD, ETH-USD etc.
    const yf = await fetchYahooPrice(sym);
    if (yf) return { price: yf.price, source: 'Yahoo Finance' };
    return null;
  }

  // Stocks, ETFs, Bonds, Mutual Funds, Other
  const yf = await fetchYahooPrice(sym);
  if (yf) return { price: yf.price, source: 'Yahoo Finance', fetchedAs: yf.fetchedAs };
  return null;
}
