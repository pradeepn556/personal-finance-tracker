// ============================================================
// Settings/index.jsx — App preferences & data management v2
// Sections: Stats, Display Preferences, Data & Backup,
//           Budget Management, Connected Accounts (placeholder),
//           Danger Zone, Help & About
// ============================================================

import { useState, useRef } from 'react';
import { Download, Upload, Trash2, AlertCircle, CheckCircle, Database, Globe } from 'lucide-react';

import { STORAGE_KEYS, saveAllData, clearAllData, getStorageSize } from '../../utils/storage';
import { formatCurrency } from '../../utils/formatters';

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

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  function updateSetting(key, value) {
    const updated = { ...(settings || {}), [key]: value };
    setSettings(updated);
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
