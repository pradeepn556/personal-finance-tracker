// ============================================================
// storage.js — All localStorage read/write operations
// Every piece of data in this app is stored in the browser.
// Nothing goes to a server. Data is private to this device.
// ============================================================

export const STORAGE_KEYS = {
  INCOME:      'finance_app_income',
  INVESTMENTS: 'finance_app_investments',
  EXPENSES:    'finance_app_expenses',
  BUDGETS:     'finance_app_budgets',
  SETTINGS:    'finance_app_settings',
  LAST_BACKUP: 'finance_app_lastBackup',
};

// Default settings — AUD currency, dark theme, DD/MM/YYYY dates
export const DEFAULT_SETTINGS = {
  currency:    'AUD',
  dateFormat:  'DD/MM/YYYY',
  theme:       'dark',
  chartsStyle: 'Professional',
  notifications: {
    enabled:      true,
    budgetAlerts: true,
    overspend:    true,
    investment:   true,
  },
};

// Read data from localStorage — returns defaultValue if nothing stored
export const loadData = (key, defaultValue = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.error(`Failed to load "${key}" from localStorage:`, err);
    return defaultValue;
  }
};

// Write data to localStorage
export const saveData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`Failed to save "${key}" to localStorage:`, err);
    return false;
  }
};

// Load all app data at once — used on app startup
export const loadAllData = () => ({
  income:      loadData(STORAGE_KEYS.INCOME,      []),
  investments: loadData(STORAGE_KEYS.INVESTMENTS, []),
  expenses:    loadData(STORAGE_KEYS.EXPENSES,    []),
  budgets:     loadData(STORAGE_KEYS.BUDGETS,     {}),
  settings:    { ...DEFAULT_SETTINGS, ...loadData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS) },
  lastBackup:  loadData(STORAGE_KEYS.LAST_BACKUP, null),
});

// Save all app data at once — used for import
export const saveAllData = (data) => {
  saveData(STORAGE_KEYS.INCOME,      data.income      ?? []);
  saveData(STORAGE_KEYS.INVESTMENTS, data.investments ?? []);
  saveData(STORAGE_KEYS.EXPENSES,    data.expenses    ?? []);
  saveData(STORAGE_KEYS.BUDGETS,     data.budgets     ?? {});
  saveData(STORAGE_KEYS.SETTINGS,    data.settings    ?? DEFAULT_SETTINGS);
};

// Wipe everything — used by "Clear All Data" in Settings
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};

// Generate a unique ID for each entry e.g. "inc_1741234567890_ab3f"
export const generateId = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Estimate total localStorage usage in KB
export const getStorageSize = () => {
  let total = 0;
  Object.values(STORAGE_KEYS).forEach(key => {
    const item = localStorage.getItem(key);
    if (item) total += item.length * 2; // UTF-16 = 2 bytes per char
  });
  return (total / 1024).toFixed(1);
};
