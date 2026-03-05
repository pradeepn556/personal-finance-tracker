// ============================================================
// dateHelpers.js — Simple date utility functions
// Avoids needing moment.js or date-fns as a dependency.
// All functions work with native JS Date objects.
// ============================================================

// First moment of a given month: 2026-03-01 00:00:00
export const startOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
};

// Last moment of a given month: 2026-03-31 23:59:59
export const endOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
};

// Subtract N months from a date (e.g. subMonths(now, 3) = 3 months ago)
export const subMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - n);
  return d;
};

// Format a date string/object per user's preferred format
// Supports: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  switch (format) {
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    default:           return `${dd}/${mm}/${yyyy}`;  // DD/MM/YYYY
  }
};

// Get today's date as an ISO string for form default values (YYYY-MM-DD)
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Get short month label e.g. "Mar '26"
export const shortMonthLabel = (date) => {
  const d = new Date(date);
  return d.toLocaleString('default', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2);
};

// Check if a date string is in the future
export const isFutureDate = (dateStr) => {
  const date  = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date > today;
};
