// ============================================================
// Settings/index.jsx — App preferences & data management v2
// Sections: Stats, Display Preferences, Data & Backup,
//           Budget Management, Connected Accounts (placeholder),
//           Danger Zone, Help & About
// ============================================================

import { useState, useRef } from 'react';
import { Download, Upload, Trash2, AlertCircle, CheckCircle, Database, Globe, Key, Eye, EyeOff } from 'lucide-react';

import { STORAGE_KEYS, saveAllData, clearAllData, getStorageSize } from '../../utils/storage';
import { formatCurrency } from '../../utils/formatters';
import { loadFinnhubKey, saveFinnhubKey, loadTwelveDataKey, saveTwelveDataKey } from '../../utils/priceFetcher';

// ── Constants ──────────────────────────────────────────────
const CURRENCIES = [
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'USD', label: 'USD — US Dollar'          },
  { code: 'EUR', label: 'EUR — Euro'               },
  { code: 'GBP', label: 'GBP — British Pound'      },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'CAD', label: 'CAD — Canadian Dollar'    },
  { code: 'SGD', label: 'SGD — Singapore Dollar'   },
  { code: 'JPY', label: 'JPY — Japanese Yen'       },
  { code: 'INR', label: 'INR — Indian Rupee'       },
];
const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Australian)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)'         },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)'        },
];

// ── Design tokens ──────────────────────────────────────────
const CARD  = { backgroundColor: '#1E2139', border: '1px solid #334155', borderRadius: '10px' };
const HDR   = { backgroundColor: '#1A2332', borderBottom: '1px solid #334155' };
const INPUT = { width: '100%', backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#F1F5F9', fontSize: '14px', outline: 'none' };
const LABEL = { fontSize: '11px', fontWeight: 700, color: '#CBD5E1', letterSpacing: '0.08em', display: 'block', marginBottom: '6px', textTransform: 'uppercase' };

// ── Toast ──────────────────────────────────────────────────
function Toast({ message, type }) {
  if (!message) return null;
  const colour = type === 'success' ? '#10B981' : '#EF4444';
  const Icon   = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, backgroundColor: '#1A2332', border: `1px solid ${colour}`, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <Icon size={16} color={colour} />
      <span style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>{message}</span>
    </div>
  );
}

// ── Credit Card / Account manager ──────────────────────────
// Simple list of user-named cards stored in settings.cards[].
// Rendered inside the Credit Cards section in Settings.
function CardManager({ cards, onSave }) {
  const [input, setInput]   = useState('');
  const [editing, setEditing] = useState(null); // index of card being renamed
  const [editVal, setEditVal] = useState('');

  function addCard() {
    const name = input.trim();
    if (!name || cards.includes(name)) return;
    onSave([...cards, name]);
    setInput('');
  }

  function deleteCard(i) {
    onSave(cards.filter((_, idx) => idx !== i));
  }

  function startEdit(i) { setEditing(i); setEditVal(cards[i]); }

  function saveEdit(i) {
    const name = editVal.trim();
    if (!name) return;
    const updated = [...cards];
    updated[i] = name;
    onSave(updated);
    setEditing(null);
  }

  return (
    <div>
      {/* Existing cards */}
      {cards.length === 0 ? (
        <p style={{ color: '#475569', fontSize: 13, marginBottom: 14 }}>
          No cards added yet. Add your credit cards and bank accounts below — they'll appear as options in the Import Statement dialog.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {cards.map((card, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, backgroundColor: '#0F172A', border: '1px solid #334155' }}>
              <span style={{ fontSize: 16 }}>💳</span>
              {editing === i ? (
                <>
                  <input value={editVal} onChange={e => setEditVal(e.target.value)}
                         onKeyDown={e => { if (e.key === 'Enter') saveEdit(i); if (e.key === 'Escape') setEditing(null); }}
                         autoFocus
                         style={{ ...INPUT, flex: 1, padding: '5px 10px', fontSize: 13 }} />
                  <button onClick={() => saveEdit(i)}
                          style={{ padding: '5px 12px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Save
                  </button>
                  <button onClick={() => setEditing(null)}
                          style={{ padding: '5px 10px', backgroundColor: 'transparent', color: '#64748B', border: '1px solid #334155', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, flex: 1 }}>{card}</span>
                  <button onClick={() => startEdit(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '3px 8px', borderRadius: 5, fontSize: 12 }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => deleteCard(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '3px 8px', borderRadius: 5, fontSize: 12 }}>
                    ✕ Remove
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new card input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && addCard()}
               placeholder="e.g. ANZ Amex, Woolies Everyday Card, CommBank Savings…"
               style={{ ...INPUT, flex: 1 }} />
        <button onClick={addCard} disabled={!input.trim()}
                style={{ padding: '0 18px', height: 42, backgroundColor: input.trim() ? '#06B6D4' : '#334155', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
          + Add Card
        </button>
      </div>
      <p style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>
        These names appear in the Import Statement dropdown and are saved on each transaction so you can filter by card later.
      </p>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────
function Section({ emoji, title, subtitle, children }) {
  return (
    <div style={CARD}>
      <div style={{ ...HDR, padding: '14px 20px', borderRadius: '10px 10px 0 0' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>
          {emoji} {title}
        </h3>
        {subtitle && <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

// ── Main Settings component ────────────────────────────────
export default function SettingsTab({ data, setSettings, setData }) {
  const { income, investments, expenses, budgets, settings } = data;
  const currency   = settings?.currency   || 'AUD';
  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';

  const [toast,       setToast]       = useState({ message: '', type: 'success' });
  const [clearModal,  setClearModal]  = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  // ── Finnhub API key state ───────────────────────────────
  const [finnhubInput,   setFinnhubInput]   = useState(loadFinnhubKey);
  const [showFinnhubKey, setShowFinnhubKey] = useState(false);
  const [finnhubSaved,   setFinnhubSaved]   = useState(!!loadFinnhubKey());

  // ── Twelve Data API key state ───────────────────────────
  const [twelveInput,   setTwelveInput]   = useState(loadTwelveDataKey);
  const [showTwelveKey, setShowTwelveKey] = useState(false);
  const [twelveSaved,   setTwelveSaved]   = useState(!!loadTwelveDataKey());

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  function updateSetting(key, value) {
    const updated = { ...(settings || {}), [key]: value };
    setSettings(updated);
  }

  function handleSaveFinnhubKey() {
    saveFinnhubKey(finnhubInput);
    setFinnhubSaved(!!finnhubInput.trim());
    showToast(finnhubInput.trim() ? 'Finnhub API key saved ✓' : 'Finnhub API key cleared');
  }

  function handleClearFinnhubKey() {
    setFinnhubInput('');
    saveFinnhubKey('');
    setFinnhubSaved(false);
    showToast('Finnhub API key cleared');
  }

  function handleSaveTwelveKey() {
    saveTwelveDataKey(twelveInput);
    setTwelveSaved(!!twelveInput.trim());
    showToast(twelveInput.trim() ? 'Twelve Data API key saved ✓' : 'Twelve Data API key cleared');
  }

  function handleClearTwelveKey() {
    setTwelveInput('');
    saveTwelveDataKey('');
    setTwelveSaved(false);
    showToast('Twelve Data API key cleared');
  }

  // ── Storage stats ──────────────────────────────────────
  const storageKB    = getStorageSize();
  const totalRecords = income.length + investments.length + expenses.length;
  const budgetsSet   = Object.values(budgets || {}).filter(v => Number(v) > 0).length;

  // ── Export ─────────────────────────────────────────────
  function handleExportJSON() {
    const payload = JSON.stringify({ income, investments, expenses, budgets, settings }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported as JSON ✓');
  }

  function handleExportCSV() {
    const rows = [['Date', 'Type', 'Category/Source', 'Description', 'Amount', 'Notes']];
    income.forEach(i => rows.push([i.date, 'Income', i.source, i.incomeFrom || '', i.amount, i.notes || '']));
    expenses.forEach(e => rows.push([e.date, 'Expense', e.category, e.description || '', `-${e.amount}`, e.notes || '']));
    investments.forEach(i => rows.push([i.date, 'Investment', i.type, i.symbol, i.purchasePrice, `Qty: ${i.quantity}`]));
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported as CSV ✓');
  }

  // ── Import (ADD to existing) ────────────────────────────
  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.income && !parsed.expenses && !parsed.investments) {
          setImportError('Invalid backup — no recognisable data found.');
          return;
        }
        // MERGE (add) to existing data
        const merged = {
          income:      [...income,      ...(Array.isArray(parsed.income)      ? parsed.income      : [])],
          investments: [...investments, ...(Array.isArray(parsed.investments) ? parsed.investments : [])],
          expenses:    [...expenses,    ...(Array.isArray(parsed.expenses)    ? parsed.expenses    : [])],
          budgets:     { ...(budgets || {}), ...(typeof parsed.budgets === 'object' ? parsed.budgets : {}) },
          settings:    settings, // keep current settings
        };
        saveAllData(merged);
        setData(merged);
        const added = (parsed.income?.length || 0) + (parsed.expenses?.length || 0) + (parsed.investments?.length || 0);
        showToast(`Import successful — ${added} records added ✓`);
      } catch {
        setImportError('Could not parse file. Make sure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Clear all data ─────────────────────────────────────
  function handleClearAll() {
    clearAllData();
    setData({ income: [], investments: [], expenses: [], budgets: {}, settings });
    setClearModal(false);
    showToast('All data cleared', 'error');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', margin: 0 }}>SETTINGS</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>Manage preferences, export data, and customise your experience</p>
      </div>

      {/* ── Quick Stats (4 cards) ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
        {[
          { label: 'Income Records',      value: income.length,      icon: '💵' },
          { label: 'Investment Records',  value: investments.length, icon: '📈' },
          { label: 'Expense Records',     value: expenses.length,    icon: '💳' },
          { label: 'Storage Used',        value: `${storageKB} KB`,  icon: '💾' },
        ].map(s => (
          <div key={s.label} style={{ ...CARD, padding: '20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#CBD5E1', textTransform: 'uppercase', marginBottom: 8 }}>
              {s.icon} {s.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: '#F1F5F9' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Display Preferences ───────────────────────────── */}
      <Section emoji="🎨" title="DISPLAY PREFERENCES" subtitle="Currency, date format, and theme settings">
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
          <div>
            <label style={LABEL}>Currency</label>
            <select value={currency} style={INPUT}
                    onChange={e => updateSetting('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              Preview: {formatCurrency(1234.56, currency)}
            </p>
          </div>
          <div>
            <label style={LABEL}>Date Format</label>
            <select value={dateFormat} style={INPUT}
                    onChange={e => updateSetting('dateFormat', e.target.value)}>
              {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              Today: {new Date().toLocaleDateString(dateFormat === 'MM/DD/YYYY' ? 'en-US' : 'en-AU', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 8, backgroundColor: '#0F172A', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600, margin: 0 }}>🌙 Dark Theme</p>
            <p style={{ color: '#475569', fontSize: 12, margin: '2px 0 0' }}>Always active — optimised for low-light</p>
          </div>
          <div style={{ width: 40, height: 22, borderRadius: 12, backgroundColor: '#06B6D4', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 3px' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff' }} />
          </div>
        </div>
      </Section>

      {/* ── Live Prices / API Keys ────────────────────────── */}
      <Section emoji="📡" title="LIVE PRICES" subtitle="Configure market data source for real-time investment prices">

        {/* How it works — 3 source cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>

          {/* CoinGecko */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, backgroundColor: '#0F172A', border: '1px solid #334155' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🪙</span>
            <div>
              <p style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>Crypto — CoinGecko</p>
              <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>
                Free, no key needed. Works out of the box for BTC, ETH, SOL, ADA, and 40+ coins.
                Just enter the ticker (e.g. <code style={{ color: '#06B6D4' }}>BTC</code>, <code style={{ color: '#06B6D4' }}>ETH</code>).
              </p>
            </div>
            <span style={{ marginLeft: 'auto', color: '#10B981', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓ Active</span>
          </div>

          {/* Twelve Data — ASX stocks */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, backgroundColor: '#0F172A', border: `1px solid ${twelveSaved ? '#10B98140' : '#334155'}` }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🦘</span>
            <div>
              <p style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>ASX Stocks & ETFs — Twelve Data</p>
              <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>
                Free API key required (800 calls/day). Covers Australian stocks with the{' '}
                <code style={{ color: '#06B6D4' }}>.AX</code> suffix:{' '}
                <code style={{ color: '#06B6D4' }}>BHP.AX</code>, <code style={{ color: '#06B6D4' }}>ANZ.AX</code>,{' '}
                <code style={{ color: '#06B6D4' }}>WOW.AX</code>, <code style={{ color: '#06B6D4' }}>VGS.AX</code>.{' '}
                <em style={{ color: '#475569' }}>Finnhub's free tier does not cover the ASX — add this key for AUD prices.</em>
              </p>
            </div>
            <span style={{ marginLeft: 'auto', color: twelveSaved ? '#10B981' : '#F59E0B', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {twelveSaved ? '✓ Active' : '⚠ Key needed'}
            </span>
          </div>

          {/* Finnhub — US stocks */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, backgroundColor: '#0F172A', border: `1px solid ${finnhubSaved ? '#10B98140' : '#334155'}` }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🇺🇸</span>
            <div>
              <p style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>US Stocks & ETFs — Finnhub</p>
              <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>
                Free API key required (60 calls/min, no daily limit). Covers NASDAQ & NYSE:{' '}
                <code style={{ color: '#06B6D4' }}>AAPL</code>, <code style={{ color: '#06B6D4' }}>TSLA</code>,{' '}
                <code style={{ color: '#06B6D4' }}>MSFT</code>, <code style={{ color: '#06B6D4' }}>SPY</code>.{' '}
                <em style={{ color: '#475569' }}>US stock prices are returned in USD — the app shows a USD badge.</em>
              </p>
            </div>
            <span style={{ marginLeft: 'auto', color: finnhubSaved ? '#10B981' : '#F59E0B', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {finnhubSaved ? '✓ Active' : '⚠ Key needed'}
            </span>
          </div>
        </div>

        {/* Twelve Data API key input — ASX stocks */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <label style={LABEL}>Twelve Data API Key <span style={{ color: '#06B6D4', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(ASX stocks · 800 calls/day)</span></label>
            <a href="https://twelvedata.com/register" target="_blank" rel="noreferrer"
               style={{ color: '#06B6D4', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Key size={11} /> Get free key at twelvedata.com →
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showTwelveKey ? 'text' : 'password'}
                value={twelveInput}
                onChange={e => setTwelveInput(e.target.value)}
                placeholder="Paste your Twelve Data API key here…"
                style={{ ...INPUT, paddingRight: 40 }}
                onKeyDown={e => e.key === 'Enter' && handleSaveTwelveKey()}
              />
              <button
                onClick={() => setShowTwelveKey(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748B' }}
                title={showTwelveKey ? 'Hide key' : 'Show key'}>
                {showTwelveKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button onClick={handleSaveTwelveKey}
                    style={{ height: 42, padding: '0 18px', backgroundColor: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Save Key
            </button>
            {twelveSaved && (
              <button onClick={handleClearTwelveKey}
                      style={{ height: 42, padding: '0 14px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF444440', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
          {twelveSaved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }} />
              <p style={{ color: '#10B981', fontSize: 12, margin: 0, fontWeight: 600 }}>
                API key saved — ASX stock prices now enabled (BHP.AX, ANZ.AX, WOW.AX…)
              </p>
            </div>
          )}
          {!twelveSaved && (
            <p style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>
              💡 Visit <a href="https://twelvedata.com/register" target="_blank" rel="noreferrer" style={{ color: '#06B6D4' }}>twelvedata.com/register</a>,
              sign up free (no credit card), copy your API key from the dashboard, and paste it above.
            </p>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #1E293B', marginBottom: 20 }} />

        {/* Finnhub API key input — US stocks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <label style={LABEL}>Finnhub API Key <span style={{ color: '#06B6D4', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(US stocks · 60 calls/min)</span></label>
            <a href="https://finnhub.io/register" target="_blank" rel="noreferrer"
               style={{ color: '#06B6D4', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Key size={11} /> Get free key at finnhub.io →
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showFinnhubKey ? 'text' : 'password'}
                value={finnhubInput}
                onChange={e => setFinnhubInput(e.target.value)}
                placeholder="Paste your Finnhub API key here…"
                style={{ ...INPUT, paddingRight: 40 }}
                onKeyDown={e => e.key === 'Enter' && handleSaveFinnhubKey()}
              />
              <button
                onClick={() => setShowFinnhubKey(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748B' }}
                title={showFinnhubKey ? 'Hide key' : 'Show key'}>
                {showFinnhubKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button onClick={handleSaveFinnhubKey}
                    style={{ height: 42, padding: '0 18px', backgroundColor: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Save Key
            </button>
            {finnhubSaved && (
              <button onClick={handleClearFinnhubKey}
                      style={{ height: 42, padding: '0 14px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF444440', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>

          {/* Status indicator */}
          {finnhubSaved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }} />
              <p style={{ color: '#10B981', fontSize: 12, margin: 0, fontWeight: 600 }}>
                API key saved — US stock & ETF prices now enabled
              </p>
            </div>
          )}
          {!finnhubSaved && (
            <p style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>
              💡 Visit <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" style={{ color: '#06B6D4' }}>finnhub.io/register</a>,
              sign up (no credit card), copy your API key from the dashboard, and paste it above.
            </p>
          )}
        </div>

        {/* Symbol format guide */}
        <div style={{ marginTop: 16, borderTop: '1px solid #334155', paddingTop: 16 }}>
          <p style={{ color: '#CBD5E1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Symbol Format Guide</p>
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
            {[
              { label: 'ASX Stocks', examples: ['ANZ.AX', 'WOW.AX', 'WTC.AX', 'CBA.AX'], colour: '#06B6D4' },
              { label: 'US Stocks',  examples: ['AAPL', 'TSLA', 'MSFT', 'NVDA'],          colour: '#10B981' },
              { label: 'ETFs',       examples: ['VGS.AX', 'A200.AX', 'NDQ.AX', 'SPY'],   colour: '#F59E0B' },
              { label: 'Crypto',     examples: ['BTC', 'ETH', 'SOL', 'ADA'],              colour: '#8B5CF6' },
            ].map(({ label, examples, colour }) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: '#0F172A', border: `1px solid ${colour}20` }}>
                <p style={{ color: colour, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.06em' }}>{label}</p>
                {examples.map(ex => (
                  <p key={ex} style={{ color: '#94A3B8', fontSize: 12, margin: '2px 0', fontFamily: 'monospace' }}>{ex}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Data & Backup ─────────────────────────────────── */}
      <Section emoji="💾" title="DATA & BACKUP" subtitle="Export, import, and manage your data">
        {/* Export */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Export Your Data</p>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 12 }}>
            Download a copy. All data is stored locally in your browser — nothing goes to any server.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
            <button onClick={handleExportJSON}
                    style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <Download size={16} /> Export as JSON (Full Backup)
            </button>
            <button onClick={handleExportCSV}
                    style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'transparent', color: '#CBD5E1', border: '1px solid #334155', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <Download size={16} /> Export as CSV (Spreadsheet)
            </button>
          </div>
          <p style={{ color: '#475569', fontSize: 12, marginTop: 10 }}>
            💡 <strong style={{ color: '#94A3B8' }}>JSON</strong> preserves everything (investments, budgets, settings) — use for restore.
            &nbsp;<strong style={{ color: '#94A3B8' }}>CSV</strong> is great for Excel or Google Sheets.
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #334155', marginBottom: 20 }} />

        {/* Import */}
        <div>
          <p style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Import Your Data</p>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 12 }}>
            Restore from backup. This will <strong style={{ color: '#F59E0B' }}>ADD</strong> to your existing data (not replace it).
          </p>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
                  style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', backgroundColor: 'transparent', color: '#CBD5E1', border: '1px solid #334155', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={16} /> Choose JSON Backup File
          </button>
          {importError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '10px 14px', borderRadius: 8, backgroundColor: '#EF444420', border: '1px solid #EF444440' }}>
              <AlertCircle size={14} color="#EF4444" />
              <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{importError}</p>
            </div>
          )}
          <p style={{ color: '#475569', fontSize: 12, marginTop: 10 }}>
            ⚠️ Export first if you want to preserve your current data before importing.
          </p>
        </div>
      </Section>

      {/* ── Credit Cards & Accounts ────────────────────────── */}
      <Section emoji="💳" title="CREDIT CARDS & ACCOUNTS"
               subtitle="Add your cards and bank accounts — shown as options when importing bank statements">
        <CardManager cards={settings?.cards || []} onSave={cards => setSettings(s => ({ ...s, cards }))} />
      </Section>

      {/* ── Budget Management ─────────────────────────────── */}
      <Section emoji="📊" title="BUDGET MANAGEMENT" subtitle="Monthly spending limits per category">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ color: '#F1F5F9', fontSize: 14, margin: 0 }}>
              {budgetsSet > 0 ? `${budgetsSet} budget categories configured` : 'No budgets set yet'}
            </p>
            <p style={{ color: '#64748B', fontSize: 12, margin: '2px 0 0' }}>
              Set monthly limits — they reset automatically each month.
            </p>
          </div>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
            💡 Manage budgets directly from the <strong style={{ color: '#06B6D4' }}>Expenses</strong> tab → Budget Overview section.
          </p>
        </div>
        {budgetsSet > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(budgets || {}).filter(([, v]) => Number(v) > 0).map(([cat, val]) => (
              <span key={cat} style={{ padding: '4px 10px', borderRadius: 20, backgroundColor: '#06B6D420', color: '#06B6D4', fontSize: 12, fontWeight: 600 }}>
                {cat}: {formatCurrency(Number(val), currency)}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* ── Connected Accounts (Coming Soon) ─────────────── */}
      <Section emoji="🔗" title="BANK CONNECTIONS" subtitle="Coming soon — automatic transaction import">
        <div style={{ opacity: 0.5 }}>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 14 }}>
            Connect your bank accounts for automatic weekly transaction import. Powered by bank-level encryption.
          </p>
          <button disabled
                  style={{ height: 44, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'transparent', color: '#475569', border: '1px dashed #334155', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'not-allowed' }}>
            🔌 Connect Bank Account (Coming Soon)
          </button>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            {['12,000+ institutions supported', 'Bank-level encryption', 'Read-only access', 'Weekly sync'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#334155' }} />
                <span style={{ color: '#475569', fontSize: 12 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Danger Zone ───────────────────────────────────── */}
      <Section emoji="⚠️" title="DANGER ZONE" subtitle="Irreversible data operations">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: 8, border: '1px solid #EF444440', backgroundColor: '#EF444410', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600, margin: 0 }}>🗑️ Clear All Data</p>
            <p style={{ color: '#94A3B8', fontSize: 13, margin: '2px 0 0' }}>
              {totalRecords} records will be permanently deleted
            </p>
          </div>
          <button onClick={() => setClearModal(true)}
                  style={{ height: 44, padding: '0 20px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Clear All Data
          </button>
        </div>
      </Section>

      {/* ── Help & About ──────────────────────────────────── */}
      <Section emoji="ℹ️" title="HELP & ABOUT">
        {/* App info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', borderRadius: 8, backgroundColor: '#0F172A', border: '1px solid #334155' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#06B6D4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>₿</span>
          </div>
          <div>
            <p style={{ color: '#F1F5F9', fontWeight: 700, margin: 0, fontSize: 15 }}>FinanceTracker v1.0.0</p>
            <p style={{ color: '#64748B', fontSize: 12, margin: '2px 0 0' }}>Built with React 19 · Tailwind CSS v4 · Recharts · Vite</p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10, marginBottom: 20 }}>
          {[
            { icon: '🔒', title: 'Privacy First',     desc: 'All data stored in your browser. Nothing sent to any server, ever.' },
            { icon: '🤖', title: 'AI-Augmented',      desc: 'Built with Claude Code (Anthropic) — a portfolio AI-assisted dev project.' },
            { icon: '💾', title: 'localStorage',      desc: 'Data persists between sessions. Export regularly to back up.' },
            { icon: '📱', title: 'Fully Responsive',   desc: 'Works on desktop, tablet, and mobile browsers.' },
          ].map(f => (
            <div key={f.title} style={{ padding: '12px 14px', borderRadius: 8, backgroundColor: '#0F172A' }}>
              <p style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>{f.icon} {f.title}</p>
              <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* GitHub link */}
        <div style={{ padding: '12px 14px', borderRadius: 8, backgroundColor: '#0F172A', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Globe size={14} color="#06B6D4" />
          <a href="https://github.com/pradeepn556/personal-finance-tracker" target="_blank" rel="noreferrer"
             style={{ color: '#06B6D4', fontSize: 13, textDecoration: 'none' }}>
            github.com/pradeepn556/personal-finance-tracker
          </a>
        </div>

        {/* FAQ */}
        <div>
          <p style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FAQ</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { q: 'How do I back up my data?', a: 'Use Export → JSON (full backup) above. Save the file somewhere safe and import later to restore.' },
              { q: 'Will data be lost if I clear browser cache?', a: 'Yes — localStorage is cleared with browser data. Export to JSON regularly as a backup.' },
              { q: 'What is the Investment Tranches feature?', a: 'Each buy is tracked as a separate lot (tranche). Click any holding to view/edit individual buys and record partial sells.' },
              { q: 'How does a partial close work?', a: 'In the Tranches popup, click "Close Units" on a lot, enter units sold + sell price. The original lot is reduced and a closed record is created.' },
              { q: 'How is Net Worth calculated?', a: 'Net Worth = Total Income − Total Expenses + Active Investment Portfolio Value.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ padding: '12px 14px', borderRadius: 8, backgroundColor: '#0F172A' }}>
                <p style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>❓ {q}</p>
                <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Clear All Modal ───────────────────────────────── */}
      {clearModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...CARD, width: 400, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#EF444420', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={18} color="#EF4444" />
              </div>
              <h3 style={{ color: '#F1F5F9', margin: 0, fontSize: 17, fontWeight: 800 }}>Clear All Data?</h3>
            </div>
            <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 10 }}>This will permanently delete:</p>
            <ul style={{ color: '#64748B', fontSize: 13, marginBottom: 16, paddingLeft: 20 }}>
              <li>{income.length} income record{income.length !== 1 ? 's' : ''}</li>
              <li>{expenses.length} expense record{expenses.length !== 1 ? 's' : ''}</li>
              <li>{investments.length} investment record{investments.length !== 1 ? 's' : ''}</li>
              <li>All budget settings</li>
            </ul>
            <p style={{ color: '#EF4444', fontSize: 14, fontWeight: 700, marginBottom: 20 }}>
              ⚠️ This cannot be undone. Export your data first.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleClearAll}
                      style={{ flex: 1, height: 44, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                Yes, Delete Everything
              </button>
              <button onClick={() => setClearModal(false)}
                      style={{ flex: 1, height: 44, backgroundColor: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}
