// ============================================================
// Settings/index.jsx — App preferences & data management
// Shows: Display preferences, Data stats, Export/Import,
//        Clear data, About section
// ============================================================

import { useState, useRef } from 'react';
import {
  Download, Upload, Trash2, AlertCircle, CheckCircle,
  Info, Database, Globe, Calendar, Moon,
} from 'lucide-react';

import { STORAGE_KEYS, saveAllData, clearAllData, getStorageSize } from '../../utils/storage';
import { formatCurrency } from '../../utils/formatters';

// ── Constants ─────────────────────────────────────────────
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

const cardStyle  = { backgroundColor: '#1E2139', border: '1px solid #334155' };
const inputStyle = {
  width: '100%', backgroundColor: '#0F172A', border: '1px solid #334155',
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
  color: '#F1F5F9', fontSize: '0.875rem', outline: 'none',
};
const labelStyle = { fontSize: '0.75rem', color: '#94A3B8', display: 'block', marginBottom: '0.375rem' };

// ── Toast ──────────────────────────────────────────────────
function Toast({ message, type }) {
  if (!message) return null;
  const colour = type === 'success' ? '#10B981' : '#EF4444';
  const Icon   = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl"
         style={{ backgroundColor: '#1E2139', border: `1px solid ${colour}` }}>
      <Icon size={16} color={colour} />
      <span className="text-sm font-medium" style={{ color: '#F1F5F9' }}>{message}</span>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────
function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={cardStyle}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: '#0F172A' }}>
        <Icon size={18} color="#06B6D4" />
      </div>
      <div>
        <p className="text-xs" style={{ color: '#64748B' }}>{label}</p>
        <p className="text-lg font-bold font-mono" style={{ color: '#F1F5F9' }}>{value}</p>
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl p-5" style={cardStyle}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} color="#06B6D4" />
        <h3 className="font-semibold" style={{ color: '#F1F5F9' }}>{title}</h3>
      </div>
      {children}
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  // ── Update a single settings field ────────────────────
  const updateSetting = (key, value) => {
    const updated = { ...(settings || {}), [key]: value };
    setSettings(updated);
  };

  // ── Storage stats ──────────────────────────────────────
  const storageKB    = (getStorageSize() / 1024).toFixed(1);
  const totalRecords = income.length + investments.length + expenses.length;

  // ── Export to JSON ──────────────────────────────────────
  function handleExportJSON() {
    const payload = JSON.stringify({ income, investments, expenses, budgets, settings }, null, 2);
    const blob    = new Blob([payload], { type: 'application/json' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported as JSON');
  }

  // ── Export to CSV (expenses) ──────────────────────────
  function handleExportCSV() {
    const rows  = [['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Notes']];
    expenses.forEach(e =>
      rows.push([e.date, e.category, e.description, e.amount, e.paymentMethod || '', e.notes || ''])
    );
    income.forEach(i =>
      rows.push([i.date, 'Income', i.source, i.amount, '', i.notes || ''])
    );
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported as CSV');
  }

  // ── Import from JSON ──────────────────────────────────
  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.income && !parsed.expenses && !parsed.investments) {
          setImportError('Invalid backup file — no recognisable data found.');
          return;
        }
        const imported = {
          income:      Array.isArray(parsed.income)      ? parsed.income      : [],
          investments: Array.isArray(parsed.investments) ? parsed.investments : [],
          expenses:    Array.isArray(parsed.expenses)    ? parsed.expenses    : [],
          budgets:     typeof parsed.budgets === 'object' ? parsed.budgets    : {},
          settings:    typeof parsed.settings === 'object' ? parsed.settings  : settings,
        };
        saveAllData(imported);
        setData(imported);
        showToast(`Import successful — ${imported.income.length + imported.expenses.length + imported.investments.length} records loaded`);
      } catch {
        setImportError('Could not parse file. Make sure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Clear all data ────────────────────────────────────
  function handleClearAll() {
    clearAllData();
    setData({
      income: [], investments: [], expenses: [], budgets: {}, settings: settings,
    });
    setClearModal(false);
    showToast('All data cleared', 'error');
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Manage preferences, export data, and customise your experience
        </p>
      </div>

      {/* ── Data Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Income Records"     value={income.length}      icon={Database} />
        <StatCard label="Expense Records"    value={expenses.length}    icon={Database} />
        <StatCard label="Investment Records" value={investments.length} icon={Database} />
        <StatCard label="Storage Used"       value={`${storageKB} KB`}  icon={Database} />
      </div>

      {/* ── Display Preferences ──────────────────────────── */}
      <Section title="Display Preferences" icon={Globe}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label style={labelStyle}>Currency</label>
            <select
              value={currency}
              style={inputStyle}
              onChange={e => updateSetting('currency', e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>
              Preview: {formatCurrency(1234.56, currency)}
            </p>
          </div>

          <div>
            <label style={labelStyle}>Date Format</label>
            <select
              value={dateFormat}
              style={inputStyle}
              onChange={e => updateSetting('dateFormat', e.target.value)}
            >
              {DATE_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>
              Today: {new Date().toLocaleDateString(
                dateFormat === 'MM/DD/YYYY' ? 'en-US' : 'en-AU',
                { year: 'numeric', month: '2-digit', day: '2-digit' }
              )}
            </p>
          </div>

        </div>

        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
          <Moon size={16} color="#06B6D4" />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#F1F5F9' }}>Dark Theme</p>
            <p className="text-xs" style={{ color: '#475569' }}>Always active — optimised for low-light use</p>
          </div>
          <div className="w-10 h-5 rounded-full flex items-center justify-end px-0.5"
               style={{ backgroundColor: '#06B6D4' }}>
            <div className="w-4 h-4 rounded-full bg-white" />
          </div>
        </div>
      </Section>

      {/* ── Export Data ──────────────────────────────────── */}
      <Section title="Export Data" icon={Download}>
        <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>
          Download a copy of your financial data. No data is sent anywhere — everything is stored locally in your browser.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={handleExportJSON}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                  style={{ backgroundColor: '#06B6D4', color: '#ffffff' }}>
            <Download size={16} />
            Export as JSON (full backup)
          </button>
          <button onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                  style={{ backgroundColor: '#334155', color: '#F1F5F9' }}>
            <Download size={16} />
            Export as CSV (spreadsheet)
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: '#475569' }}>
          💡 <strong>JSON</strong> preserves everything (investments, budgets, settings). Use JSON to back up and restore.
          <br />
          📊 <strong>CSV</strong> exports income + expenses — open in Excel or Google Sheets.
        </p>
      </Section>

      {/* ── Import Data ──────────────────────────────────── */}
      <Section title="Import Data" icon={Upload}>
        <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>
          Restore from a previous JSON backup. This will <strong style={{ color: '#F59E0B' }}>replace</strong> all current data.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: '#334155', color: '#F1F5F9' }}>
          <Upload size={16} />
          Choose JSON Backup File
        </button>
        {importError && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-lg"
               style={{ backgroundColor: '#EF444420', border: '1px solid #EF444440' }}>
            <AlertCircle size={14} color="#EF4444" />
            <p className="text-xs" style={{ color: '#EF4444' }}>{importError}</p>
          </div>
        )}
        <p className="text-xs mt-3" style={{ color: '#475569' }}>
          ⚠️ Importing a backup will overwrite all existing data. Export first if you want to keep your current data.
        </p>
      </Section>

      {/* ── Danger Zone ──────────────────────────────────── */}
      <Section title="Danger Zone" icon={Trash2}>
        <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>
          Permanently delete all financial data from this browser. This cannot be undone.
        </p>
        <div className="flex items-center justify-between p-4 rounded-xl"
             style={{ border: '1px solid #EF444440', backgroundColor: '#EF444410' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#F1F5F9' }}>Clear All Data</p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>
              {totalRecords} records will be permanently deleted
            </p>
          </div>
          <button onClick={() => setClearModal(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: '#EF4444', color: '#ffffff' }}>
            Clear All
          </button>
        </div>
      </Section>

      {/* ── About ─────────────────────────────────────────── */}
      <Section title="About" icon={Info}>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: '#06B6D4' }}>
              <span className="text-white font-bold text-sm">₿</span>
            </div>
            <div>
              <p className="font-semibold" style={{ color: '#F1F5F9' }}>FinanceTracker</p>
              <p className="text-xs" style={{ color: '#64748B' }}>Version 1.0.0 — Built with React + Recharts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="font-medium mb-1" style={{ color: '#94A3B8' }}>🔒 Privacy First</p>
              <p className="text-xs" style={{ color: '#475569' }}>
                All data is stored locally in your browser. Nothing is sent to any server. Ever.
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="font-medium mb-1" style={{ color: '#94A3B8' }}>🤖 AI-Augmented</p>
              <p className="text-xs" style={{ color: '#475569' }}>
                Built with Claude Code (Anthropic) as a portfolio demonstration of AI-assisted development.
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="font-medium mb-1" style={{ color: '#94A3B8' }}>💾 localStorage</p>
              <p className="text-xs" style={{ color: '#475569' }}>
                Data persists between sessions via browser localStorage. Export regularly to back up.
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="font-medium mb-1" style={{ color: '#94A3B8' }}>📦 Tech Stack</p>
              <p className="text-xs" style={{ color: '#475569' }}>
                React 19 · Tailwind CSS v4 · Recharts · Lucide React · Vite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg mt-1"
               style={{ backgroundColor: '#0F172A', border: '1px solid #334155' }}>
            <Globe size={14} color="#06B6D4" />
            <a href="https://github.com/pradeepn556/personal-finance-tracker"
               target="_blank" rel="noreferrer"
               className="text-sm hover:underline"
               style={{ color: '#06B6D4' }}>
              github.com/pradeepn556/personal-finance-tracker
            </a>
          </div>
        </div>
      </Section>

      {/* ── Help / FAQ ───────────────────────────────────── */}
      <Section title="Help & FAQ" icon={Info}>
        <div className="space-y-3">
          {[
            {
              q: 'How do I back up my data?',
              a: 'Use Export → JSON (full backup) above. Save the file somewhere safe. You can restore it later using Import Data.',
            },
            {
              q: 'Will my data be lost if I clear browser cookies?',
              a: 'Yes — localStorage is cleared when you clear site data/cookies. Export to JSON regularly as a backup.',
            },
            {
              q: 'Can I use this on mobile?',
              a: 'Yes! The app is fully responsive. Open it in your mobile browser — data syncs per device (not cross-device).',
            },
            {
              q: 'What currency is supported?',
              a: 'AUD by default (Australian Dollar). You can switch to USD, EUR, GBP, NZD and more in Display Preferences above.',
            },
            {
              q: 'How is Net Worth calculated?',
              a: 'Net Worth = Total Income − Total Expenses + Investment Portfolio Value.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="text-sm font-medium mb-1" style={{ color: '#F1F5F9' }}>{q}</p>
              <p className="text-xs" style={{ color: '#64748B' }}>{a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Clear All Modal ───────────────────────────────── */}
      {clearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="rounded-xl p-6 w-96 shadow-2xl" style={cardStyle}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: '#EF444420' }}>
                <Trash2 size={18} color="#EF4444" />
              </div>
              <h3 className="font-semibold text-lg" style={{ color: '#F1F5F9' }}>Clear All Data?</h3>
            </div>
            <p className="text-sm mb-2" style={{ color: '#94A3B8' }}>
              This will permanently delete:
            </p>
            <ul className="text-sm mb-5 space-y-1" style={{ color: '#64748B' }}>
              <li>• {income.length} income record{income.length !== 1 ? 's' : ''}</li>
              <li>• {expenses.length} expense record{expenses.length !== 1 ? 's' : ''}</li>
              <li>• {investments.length} investment record{investments.length !== 1 ? 's' : ''}</li>
              <li>• All budget settings</li>
            </ul>
            <p className="text-sm font-medium mb-5" style={{ color: '#EF4444' }}>
              ⚠️ This cannot be undone. Export your data first.
            </p>
            <div className="flex gap-3">
              <button onClick={handleClearAll}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#EF4444', color: '#ffffff' }}>
                Yes, Delete Everything
              </button>
              <button onClick={() => setClearModal(false)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#334155', color: '#94A3B8' }}>
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
