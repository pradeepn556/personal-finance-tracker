// ============================================================
// formatters.js — Display formatting for currency, numbers, dates
// All currency defaults to AUD (Australian Dollar)
// ============================================================

// Format a number as currency — e.g. 5000 → "A$5,000.00"
export const formatCurrency = (amount, currency = 'AUD', compact = false) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'A$0.00';
  const num = Number(amount);

  if (compact && Math.abs(num) >= 1_000_000) {
    return `A$${(num / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(num) >= 1_000) {
    return `A$${(num / 1_000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat('en-AU', {
    style:                 'currency',
    currency:              currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Format with sign for P&L — e.g. 250 → "+A$250.00", -50 → "-A$50.00"
export const formatCurrencySigned = (amount, currency = 'AUD') => {
  const num = Number(amount);
  const formatted = formatCurrency(Math.abs(num), currency);
  return num >= 0 ? `+${formatted}` : `-${formatted}`;
};

// Format a percentage — e.g. 12.5 → "12.5%"
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return `${Number(value).toFixed(decimals)}%`;
};

// Format percentage with sign — e.g. 12.5 → "+12.5%", -5 → "-5.0%"
export const formatPercentSigned = (value, decimals = 1) => {
  const num = Number(value);
  const abs = Math.abs(num).toFixed(decimals);
  return num >= 0 ? `+${abs}%` : `-${abs}%`;
};

// Format a plain number with commas — e.g. 5000 → "5,000"
export const formatNumber = (value, decimals = 0) => {
  if (isNaN(value)) return '0';
  return Number(value).toLocaleString('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Colour helper — returns Tailwind class based on positive/negative value
export const getAmountColour = (value) => {
  if (Number(value) > 0) return 'text-emerald-400';
  if (Number(value) < 0) return 'text-red-400';
  return 'text-slate-400';
};

// Colour helper for P&L badge backgrounds
export const getPnLBgColour = (value) => {
  if (Number(value) > 0) return 'bg-emerald-500/20 text-emerald-400';
  if (Number(value) < 0) return 'bg-red-500/20 text-red-400';
  return 'bg-slate-500/20 text-slate-400';
};

// Budget progress bar colour — green / yellow / red
export const getBudgetColour = (percentUsed) => {
  if (percentUsed >= 100) return 'bg-red-500';
  if (percentUsed >= 75)  return 'bg-yellow-500';
  return 'bg-emerald-500';
};

export const getBudgetTextColour = (percentUsed) => {
  if (percentUsed >= 100) return 'text-red-400';
  if (percentUsed >= 75)  return 'text-yellow-400';
  return 'text-emerald-400';
};

// Truncate long text with ellipsis — e.g. "Weekly groceries from..." → "Weekly groceries fr..."
export const truncate = (text, maxLength = 30) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};
