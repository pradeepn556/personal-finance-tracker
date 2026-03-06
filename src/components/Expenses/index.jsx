// ============================================================
// Expenses/index.jsx — Expense tracking v3
// Fixed: category spend lookup (array→map), pay-cycle month
//        (16th–15th), quick filters, filter defaults
// ============================================================

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Trash2, Edit2, X, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Plus, ChevronLeft, ChevronRight, Upload,
} from 'lucide-react';

import { generateId } from '../../utils/storage';
import { getMonthlyTrend, getExpensesByCategory } from '../../utils/calculations';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { formatDate, todayISO } from '../../utils/dateHelpers';

// ── Constants ──────────────────────────────────────────────
const CATEGORIES = [
  'Groceries', 'Dining & Takeaway', 'Coffee & Drinks',
  'Rent / Mortgage', 'Utilities', 'Internet & Phone',
  'Transport', 'Fuel', 'Car Maintenance', 'Parking & Tolls',
  'Health & Medical', 'Gym & Fitness',
  'Clothing & Apparel', 'Personal Care',
  'Entertainment', 'Subscriptions & Streaming',
  'Travel & Holidays', 'Education',
  'Insurance', 'Home & Garden',
  'Gifts & Donations', 'Childcare & Education',
  'Loan Repayment / EMI', 'Credit Card Payment',
  'Other',
];
const PAYMENT_METHODS = ['Bank Transfer', 'Credit Card', 'Debit Card', 'Cash', 'Buy Now Pay Later', 'Other'];
const PAGE_SIZE = 20;
const CHART_COLOURS = ['#EF4444', '#06B6D4', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

// ── Design tokens ──────────────────────────────────────────
const CARD  = { backgroundColor: '#1E2139', border: '1px solid #334155', borderRadius: '10px' };
const HDR   = { backgroundColor: '#1A2332', borderBottom: '1px solid #334155' };
const INPUT = {
  width: '100%', backgroundColor: '#0F172A', border: '1px solid #334155',
  borderRadius: '8px', padding: '10px 12px', color: '#F1F5F9',
  fontSize: '14px', outline: 'none',
};
const LABEL = {
  fontSize: '11px', fontWeight: 700, color: '#CBD5E1', letterSpacing: '0.08em',
  display: 'block', marginBottom: '6px', textTransform: 'uppercase',
};

// ── Pay-cycle helpers (16th of prev/current → 15th next month) ──
// The user's "month" runs from the 16th to the 15th.
// e.g. today = 5 Mar 2026 → cycle = 16 Feb 2026 – 15 Mar 2026

function payCycleStart() {
  const now = new Date();
  const d   = now.getDate();
  if (d >= 16) {
    // Cycle started this month on the 16th
    return new Date(now.getFullYear(), now.getMonth(), 16)
      .toISOString().slice(0, 10);
  } else {
    // Cycle started LAST month on the 16th
    return new Date(now.getFullYear(), now.getMonth() - 1, 16)
      .toISOString().slice(0, 10);
  }
}

// Returns ISO date string for today
const TODAY_ISO = todayISO();

// Filter entries to the current pay cycle (16th → today)
function filterPayCycle(entries) {
  const start = payCycleStart();
  return entries.filter(e => e.date >= start && e.date <= TODAY_ISO);
}

// ── Australian merchant auto-categorizer ───────────────────
// Keywords are matched against the UPPERCASE bank description.
// Add more entries as needed — first match wins.
const MERCHANT_RULES = [
  { kws: ['WOOLWORTHS', 'COLES ', 'ALDI ', 'IGA ', 'FOODWORKS', 'HARRIS FARM', 'COSTCO', 'DRAKES SUPER', 'SPUDSHED'],
    cat: 'Groceries' },
  { kws: ['HUNGRY JACK', 'MCDONALD', 'KFC ', 'DOMINOS', 'PIZZA HUT', 'PIZZA ', 'SUBWAY ', 'NANDOS', 'OPORTO',
          'GRILL\'D', 'RESTAURANT', 'THAI ', 'SUSHI', 'RAMEN', 'BURRITO', 'KEBAB', 'TACO ', 'DINER ', 'BISTRO',
          'BRASSERIE', 'FISHERMAN', 'FISH & CHIPS', 'FISH AND CHIPS', 'CHINESE FOOD', 'INDIAN FOOD', 'MEXICAN FOOD'],
    cat: 'Dining & Takeaway' },
  { kws: ['STARBUCKS', 'GLORIA JEAN', 'HUDSONS', 'COFFEE CLUB', 'COFFEE', 'CAFE ', 'BAKERY', 'ESPRESSO', 'BARISTA',
          'DONUT', 'MUFFIN', 'CROISSANT', 'BRUNCH', 'PATISSERIE', 'BOULANGERIE'],
    cat: 'Coffee & Drinks' },
  { kws: ['NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'APPLE.COM', 'GOOGLE ONE', 'MICROSOFT 365', 'ADOBE ', 'DROPBOX',
          'YOUTUBE PREMIUM', 'STAN ', 'BINGE ', 'PARAMOUNT', 'FOXTEL', 'KAYO ', 'DISNEY PLUS', 'DISNEY+',
          'NINTENDO', 'PLAYSTATION', 'XBOX', 'STEAM ', 'AUDIBLE', 'CANVA', 'ZOOM ', 'CLAUDE.AI', 'CHATGPT',
          'OPENAI', 'ANTHROPIC'],
    cat: 'Subscriptions & Streaming' },
  { kws: ['BP ', 'SHELL ', 'AMPOL', '7-ELEVEN', '7ELEVEN', 'CALTEX', 'UNITED PETROLEUM', 'PUMA ENERGY',
          'LIBERTY OIL', 'METRO PETROLEUM', 'PETROL ', 'FUEL '],
    cat: 'Fuel' },
  { kws: ['UBER ', 'OLA CABS', 'DIDI ', '13CABS', 'YELLOW CAB', 'TAXI ', 'OPAL ', 'MYKI ', 'TRANSLINK',
          'CITY RAIL', 'METRO TRAINS', 'LIME SCOOTER', 'NEURON', 'BIRD SCOOTER', 'TOLL ', 'LINKT', 'EASTLINK',
          'CITYLINK', 'PARKING', 'WILSON PARKING', 'SECURE PARKING'],
    cat: 'Transport' },
  { kws: ['CHEMIST WAREHOUSE', 'PRICELINE', 'PHARMACY', 'CHEMIST ', 'MEDICAL', 'DOCTOR ', 'DENTAL ', 'DENTIST',
          'PATHOLOGY', 'RADIOLOGY', 'OPTICAL', 'HOSPITAL', 'CLINIC ', 'SPECIALIST', 'PHYSIOTHERAPY', 'PHYSIO ',
          'BULK BILLING', 'MEDICARE', 'HEALTHSCOPE', 'RAMSAY HEALTH', 'ST JOHN'],
    cat: 'Health & Medical' },
  { kws: ['GYM ', 'FITNESS', 'YOGA ', 'PILATES', 'ANYTIME FITNESS', 'GOODLIFE', 'JETTS ', 'F45 ', 'CROSSFIT',
          'SWIM ', 'TENNIS', 'GOLF ', 'SPORT ', 'RECREATION'],
    cat: 'Gym & Fitness' },
  { kws: ['KMART', 'TARGET ', 'BIG W', 'MYER ', 'DAVID JONES', 'H&M ', 'ZARA ', 'COTTON ON', 'GLASSONS',
          'SUPRE ', 'FOREVER NEW', 'UNIQLO', 'COUNTRY ROAD', 'WITCHERY', 'BONDS ', 'ATHLETES FOOT',
          'REBEL SPORT', 'PLATYPUS', 'JUST JEANS'],
    cat: 'Clothing & Apparel' },
  { kws: ['BUNNINGS', 'IKEA ', 'SPOTLIGHT ', 'HOWARDS STORAGE', 'GARDEN ', 'HARDWARE', 'PLUMBER', 'ELECTRICIAN',
          'PEST CONTROL', 'CARPET', 'CLEANING SERVICE'],
    cat: 'Home & Garden' },
  { kws: ['QANTAS', 'VIRGIN AUSTRALIA', 'JETSTAR', 'TIGERAIR', 'AIRBNB', 'BOOKING.COM', 'HOTELS.COM', 'MOTEL ',
          'RESORT ', 'EXPEDIA', 'WOTIF', 'TRIVAGO', 'AGODA ', 'FLIGHT CENTRE', 'TRAVEL '],
    cat: 'Travel & Holidays' },
  { kws: ['JB HI-FI', 'HARVEY NORMAN', 'OFFICEWORKS', 'AMAZON AU', 'APPLE STORE', 'THE GOOD GUYS', 'BING LEE',
          'DICK SMITH', 'JAYCAR'],
    cat: 'Entertainment' },
  { kws: ['AGL ', 'ORIGIN ENERGY', 'SIMPLY ENERGY', 'POWERSHOP', 'SYDNEY WATER', 'MELBOURNE WATER',
          'WATER CORP', 'ENERGEX', 'AUSGRID', 'JEMENA ', 'CITIPOWER', 'AUSNET', 'MOMENTUM ENERGY',
          'ALINTA ENERGY', 'ENERGY AUSTRALIA'],
    cat: 'Utilities' },
  { kws: ['TELSTRA', 'OPTUS ', 'VODAFONE', 'AMAYSIM', 'AUSSIE BROADBAND', 'LAUNTEL', 'IINET ', 'BELONG ',
          'CATCH CONNECT', 'BOOST MOBILE', 'WOOLWORTHS MOBILE', 'INTERNODE'],
    cat: 'Internet & Phone' },
  { kws: ['RENT ', 'LEASE ', 'REAL ESTATE', 'LANDLORD', 'PROPERTY MANAGEMENT', 'RAY WHITE', 'LJ HOOKER',
          'BARRY PLANT', 'NELSON ALEXANDER', 'RAINE & HORNE'],
    cat: 'Rent / Mortgage' },
  { kws: ['INSURANCE', 'IAG ', 'SUNCORP', 'ALLIANZ', 'NRMA ', 'RAA ', 'AAMI ', 'BUPA ', 'MEDIBANK',
          'NIB ', 'HCF ', 'AHCQ', 'HBFL', 'BUDGET DIRECT', 'COLES INSURANCE'],
    cat: 'Insurance' },
  { kws: ['CREDIT CARD PAYMENT', 'VISA PAYMENT', 'MASTERCARD PAYMENT', 'CARD PAYMENT', 'AUTOPAY', 'BNPL',
          'AFTERPAY', 'KLARNA', 'ZIP PAY', 'HUMM ', 'LATITUDE PAY'],
    cat: 'Credit Card Payment' },
];

function autoCategorize(description) {
  const upper = (description || '').toUpperCase();
  for (const { kws, cat } of MERCHANT_RULES) {
    if (kws.some(kw => upper.includes(kw))) return cat;
  }
  return 'Other';
}

// ── CSV parser ──────────────────────────────────────────────
// Handle quoted CSV fields that may contain commas (e.g. "Woolworths, Bondi")
function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim().replace(/^"|"$/g, ''));
  return result;
}

// Australian banks export dates as DD/MM/YYYY — convert to YYYY-MM-DD for storage
function parseAUDate(str) {
  if (!str) return null;
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return str;
  return null;
}

// Auto-detect which CSV columns are date / amount / description
function detectColumns(headers) {
  const h = headers.map(s => s.toLowerCase().trim());
  const dateIdx = h.findIndex(c => c === 'date' || c.startsWith('date') || c.endsWith('date'));
  const amtIdx  = h.findIndex(c => ['amount', 'debit', 'credit', 'transaction amount'].includes(c) || c.includes('amount'));
  const descIdx = h.findIndex(c =>
    ['description', 'narrative', 'particulars', 'detail', 'details', 'memo', 'text', 'transaction details'].includes(c) ||
    c.includes('description') || c.includes('narrative') || c.includes('detail')
  );
  // Fallback description: first non-date, non-amount column that contains text
  const descFallback = h.findIndex((_, i) => i !== dateIdx && i !== amtIdx && i > 0);
  return { dateIdx, amtIdx, descIdx: descIdx !== -1 ? descIdx : descFallback };
}

// Full pipeline: CSV text → array of importable transactions
function extractTransactionsFromCSV(text) {
  if (!text?.trim()) return { rows: [], error: 'File is empty.' };
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { rows: [], error: 'File has no data rows.' };

  const headers = parseCSVLine(lines[0]);
  const { dateIdx, amtIdx, descIdx } = detectColumns(headers);

  if (dateIdx === -1 || amtIdx === -1) {
    return {
      rows: [],
      error: `Couldn't detect required columns. Found: "${headers.join('", "')}". ` +
             `Expected columns named Date and Amount. Make sure you exported as CSV from your bank.`,
    };
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 2) continue;
    const date   = parseAUDate(parts[dateIdx] || '');
    if (!date) continue;
    const rawAmt = parseFloat((parts[amtIdx] || '').replace(/[$,\s]/g, ''));
    if (isNaN(rawAmt) || rawAmt === 0) continue;
    if (rawAmt > 0) continue;  // skip credits (salary, refunds, transfers in)
    const desc = descIdx !== -1 ? (parts[descIdx] || '').trim() : '';
    rows.push({
      _key:      `${date}-${rawAmt}-${i}`,
      _selected: true,
      _isDup:    false,
      date,
      amount:    Math.abs(rawAmt),
      description: desc,
      category:  autoCategorize(desc),
    });
  }

  if (rows.length === 0) {
    return {
      rows: [],
      error: 'No expense transactions found. This file may only contain income/credits, or the format is unsupported. ' +
             'Make sure your CSV has negative amounts for expenses.',
    };
  }
  return { rows, error: null };
}

// ── Tiny helpers ───────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label style={LABEL}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function Toast({ message, type }) {
  if (!message) return null;
  const colour = type === 'success' ? '#10B981' : '#EF4444';
  const Icon   = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 60,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 18px', borderRadius: 12,
      backgroundColor: '#1A2332', border: `1px solid ${colour}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <Icon size={16} color={colour} />
      <span style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>{message}</span>
    </div>
  );
}

function ChartTip({ active, payload, label, currency = 'AUD' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: '#1A2332', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#CBD5E1', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#06B6D4', fontSize: 12 }}>
          {p.name}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

// ── Spending Calendar ──────────────────────────────────────
function SpendingCalendar({ expenses }) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const dailyMap = useMemo(() => {
    const m = {};
    expenses.forEach(e => {
      const d = e.date?.slice(0, 10);
      if (d) m[d] = (m[d] || 0) + Number(e.amount || 0);
    });
    return m;
  }, [expenses]);

  const { year, month } = viewDate;
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey    = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthValues = Object.entries(dailyMap).filter(([k]) => k.startsWith(monthKey)).map(([, v]) => v);
  const maxDaily    = monthValues.length ? Math.max(...monthValues) : 0;
  const monthName   = new Date(year, month).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function cellColour(amount) {
    if (!amount || maxDaily === 0) return '#1A2336';
    const ratio = amount / maxDaily;
    if (ratio > 0.75) return '#EF4444';
    if (ratio > 0.5)  return '#F97316';
    if (ratio > 0.25) return '#F59E0B';
    return '#F59E0B40';
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setViewDate(d => d.month === 0 ? { year: d.year - 1, month: 11 } : { ...d, month: d.month - 1 })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
          <ChevronLeft size={16} color="#94A3B8" />
        </button>
        <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700 }}>{monthName}</span>
        <button onClick={() => setViewDate(d => d.month === 11 ? { year: d.year + 1, month: 0 } : { ...d, month: d.month + 1 })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
          <ChevronRight size={16} color="#94A3B8" />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#475569' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key    = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const amount = dailyMap[key] || 0;
          return (
            <div key={key}
                 title={amount ? formatCurrency(amount, 'AUD') : ''}
                 style={{
                   aspectRatio: '1', borderRadius: 4,
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   backgroundColor: cellColour(amount), border: '1px solid #334155',
                   color: amount ? '#F1F5F9' : '#334155', fontSize: '0.6rem', cursor: 'default',
                 }}>
              {day}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: '#475569' }}>Less</span>
        {['#1A2336', '#F59E0B40', '#F59E0B', '#F97316', '#EF4444'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c, border: '1px solid #334155' }} />
        ))}
        <span style={{ fontSize: 10, color: '#475569' }}>More</span>
      </div>
    </div>
  );
}

// ── Bank Statement Import Modal ────────────────────────────
// Full-screen modal: drop zone → preview table → import
function ImportModal({ existing, onImport, onClose, currency }) {
  const [rows,     setRows]     = useState([]);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  // Check if this transaction already exists (same date + amount + description prefix)
  function isDuplicate(row) {
    return existing.some(e =>
      e.date === row.date &&
      Math.abs(Number(e.amount) - row.amount) < 0.02 &&
      (e.description || '').toUpperCase().slice(0, 25) === row.description.toUpperCase().slice(0, 25)
    );
  }

  function processFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'txt'].includes(ext)) {
      setError('Please upload a .csv file. Export your transactions from your bank → Download/Export → CSV format.');
      return;
    }
    setLoading(true); setError('');
    const reader = new FileReader();
    reader.onload = ev => {
      setLoading(false);
      const { rows: parsed, error: parseErr } = extractTransactionsFromCSV(ev.target.result);
      if (parseErr) { setError(parseErr); return; }
      setRows(parsed.map(r => ({ ...r, _isDup: isDuplicate(r), _selected: !isDuplicate(r) })));
    };
    reader.onerror = () => { setLoading(false); setError('Could not read the file. Please try again.'); };
    reader.readAsText(file);
  }

  const selectedRows  = rows.filter(r => r._selected);
  const categorized   = rows.filter(r => r.category !== 'Other').length;
  const dupCount      = rows.filter(r => r._isDup).length;
  const nonDupRows    = rows.filter(r => !r._isDup);
  const allNonDupSel  = nonDupRows.length > 0 && nonDupRows.every(r => r._selected);

  function toggleRow(key) { setRows(prev => prev.map(r => r._key === key ? { ...r, _selected: !r._selected } : r)); }
  function toggleAll()    { setRows(prev => prev.map(r => r._isDup ? r : { ...r, _selected: !allNonDupSel })); }
  function updateCat(key, cat) { setRows(prev => prev.map(r => r._key === key ? { ...r, category: cat } : r)); }

  function doImport() {
    const toImport = selectedRows.map(r => ({
      id: generateId('exp'),
      date: r.date, category: r.category, amount: r.amount,
      description: r.description, paymentMethod: 'Bank Import', notes: '',
    }));
    onImport(toImport);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ backgroundColor: '#1A2332', border: '1px solid #334155', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
          <div>
            <h3 style={{ color: '#F1F5F9', fontSize: 16, fontWeight: 700, margin: 0 }}>📥 Import Bank Statement</h3>
            <p style={{ color: '#64748B', fontSize: 12, margin: '2px 0 0' }}>Upload a CSV export from ANZ, CommBank, Westpac, NAB or any Australian bank</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4, borderRadius: 6 }}><X size={18} /></button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ── Drop zone (shown before file is loaded) ── */}
          {rows.length === 0 && (
            <div style={{ padding: 20 }}>
              {/* How-to cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { bank: 'ANZ Internet Banking', steps: 'Accounts → select account → Download Statement → choose date range → CSV' },
                  { bank: 'CommBank NetBank',     steps: 'Accounts → Transaction History → Export (top right) → CSV' },
                  { bank: 'Westpac Online',       steps: 'Accounts → View Transactions → Export → CSV' },
                  { bank: 'NAB Internet Banking', steps: 'Accounts → Transactions → Export → CSV format' },
                ].map(({ bank, steps }) => (
                  <div key={bank} style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: '#0F172A', border: '1px solid #334155' }}>
                    <p style={{ color: '#F1F5F9', fontSize: 12, fontWeight: 700, margin: '0 0 3px' }}>🏦 {bank}</p>
                    <p style={{ color: '#64748B', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{steps}</p>
                  </div>
                ))}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#06B6D4' : '#334155'}`,
                  borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                  backgroundColor: dragging ? '#06B6D410' : '#0F172A',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>{loading ? '⏳' : '📂'}</div>
                <p style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>
                  {loading ? 'Reading file…' : 'Drop your CSV file here'}
                </p>
                <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 16px' }}>or click to browse your files</p>
                <div style={{ display: 'inline-block', padding: '9px 22px', borderRadius: 8, backgroundColor: '#06B6D4', color: '#fff', fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}>
                  Browse CSV file
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
                     onChange={e => processFile(e.target.files[0])} />

              {error && (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, backgroundColor: '#EF444415', border: '1px solid #EF444440' }}>
                  <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>⚠ {error}</p>
                </div>
              )}
              <p style={{ color: '#475569', fontSize: 11, marginTop: 14, textAlign: 'center' }}>
                Only debit transactions (money out) are imported. Credits, salary deposits, and transfers are automatically skipped.
              </p>
            </div>
          )}

          {/* ── Preview table ── */}
          {rows.length > 0 && (
            <div style={{ padding: 16 }}>
              {/* Stats + controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700 }}>{rows.length} transactions found</span>
                <span style={{ color: '#10B981', fontSize: 12 }}>✓ {categorized} auto-categorized</span>
                {rows.length - categorized > 0 && <span style={{ color: '#F59E0B', fontSize: 12 }}>⚠ {rows.length - categorized} marked "Other" — review below</span>}
                {dupCount > 0 && <span style={{ color: '#64748B', fontSize: 12 }}>🔁 {dupCount} possible duplicate{dupCount !== 1 ? 's' : ''} unchecked</span>}
                <button onClick={toggleAll} style={{ marginLeft: 'auto', fontSize: 12, color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  {allNonDupSel ? 'Deselect all' : 'Select all'}
                </button>
                <button onClick={() => { setRows([]); setError(''); }}
                        style={{ fontSize: 12, color: '#64748B', background: 'none', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', padding: '3px 10px' }}>
                  ← Different file
                </button>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #334155' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0F172A' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', width: 36 }}>✓</th>
                      {['Date', 'Description', 'Amount', 'Category'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row._key} style={{ borderTop: '1px solid #1E293B', opacity: row._selected ? 1 : 0.4, backgroundColor: idx % 2 === 0 ? 'transparent' : '#0F172A18' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <input type="checkbox" checked={row._selected} onChange={() => toggleRow(row._key)} style={{ cursor: 'pointer', accentColor: '#06B6D4' }} />
                        </td>
                        <td style={{ padding: '6px 10px', color: '#94A3B8', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{row.date}</td>
                        <td style={{ padding: '6px 10px', color: '#CBD5E1', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row._isDup && <span title="Possible duplicate — already in your expenses" style={{ marginRight: 5, color: '#F59E0B', fontSize: 11 }}>🔁</span>}
                          {row.description || <span style={{ color: '#475569', fontStyle: 'italic' }}>No description</span>}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#EF4444', whiteSpace: 'nowrap', fontFamily: 'monospace', fontWeight: 600 }}>
                          -{formatCurrency(row.amount, currency)}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <select value={row.category} onChange={e => updateCat(row._key, e.target.value)}
                                  style={{ ...INPUT, width: 190, padding: '4px 8px', fontSize: 12, border: row.category === 'Other' ? '1px solid #F59E0B60' : '1px solid #334155' }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {rows.length > 0 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={doImport} disabled={selectedRows.length === 0}
                    style={{ padding: '10px 24px', backgroundColor: selectedRows.length ? '#10B981' : '#334155', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: selectedRows.length ? 'pointer' : 'not-allowed' }}>
              ✓ Import {selectedRows.length} Transaction{selectedRows.length !== 1 ? 's' : ''}
            </button>
            <span style={{ color: '#64748B', fontSize: 12 }}>
              {selectedRows.length > 0 ? `Total: ${formatCurrency(selectedRows.reduce((s, r) => s + r.amount, 0), currency)}` : 'Select transactions to import'}
            </span>
            <button onClick={onClose} style={{ marginLeft: 'auto', padding: '10px 16px', backgroundColor: 'transparent', color: '#64748B', border: '1px solid #334155', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Expenses component ────────────────────────────────
export default function Expenses({ data, setExpenses, setBudgets }) {
  const { expenses, budgets, settings } = data;
  const currency   = settings?.currency   || 'AUD';
  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';

  // ── Form state ──────────────────────────────────────────
  const blank = {
    date: todayISO(), category: '', amount: '',
    description: '', paymentMethod: '', notes: '',
  };
  const [form,      setForm]      = useState(blank);
  const [errors,    setErrors]    = useState({});
  const [editId,    setEditId]    = useState(null);
  const [formOpen,   setFormOpen]   = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toast,      setToast]      = useState({ message: '', type: 'success' });
  const [deleteId,   setDeleteId]   = useState(null);

  // Budget editing
  const [budgetEdit,  setBudgetEdit]  = useState(false);
  const [budgetDraft, setBudgetDraft] = useState({});

  // ── Filters — default to current pay cycle ──────────────
  const [fCategory,    setFCategory]    = useState('');
  const [fDateFrom,    setFDateFrom]    = useState(() => payCycleStart());
  const [fDateTo,      setFDateTo]      = useState(() => todayISO());
  const [fDescription, setFDescription] = useState('');
  const [sortKey,      setSortKey]      = useState('date');
  const [sortDir,      setSortDir]      = useState('desc');
  const [page,         setPage]         = useState(1);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }, []);

  function validate() {
    const e = {};
    if (!form.date)                              e.date        = 'Required';
    if (!form.category)                          e.category    = 'Required';
    if (!form.amount || Number(form.amount) <= 0) e.amount     = 'Enter valid amount';
    if (!form.description?.trim())               e.description = 'Required';
    return e;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (editId) {
      setExpenses(expenses.map(exp =>
        exp.id === editId ? { ...exp, ...form, amount: Number(form.amount) } : exp
      ));
      showToast('Expense updated ✓');
    } else {
      setExpenses([...expenses, { ...form, amount: Number(form.amount), id: generateId('exp') }]);
      showToast('Expense added ✓');
    }
    setForm(blank); setErrors({}); setEditId(null); setFormOpen(false);
  }

  function handleEdit(exp) {
    setForm({
      date: exp.date, category: exp.category, amount: String(exp.amount),
      description: exp.description || '', paymentMethod: exp.paymentMethod || '', notes: exp.notes || '',
    });
    setEditId(exp.id); setErrors({}); setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    setExpenses(expenses.filter(e => e.id !== id));
    setDeleteId(null); showToast('Expense deleted', 'error');
  }

  function cancelForm() { setForm(blank); setEditId(null); setErrors({}); setFormOpen(false); }

  function saveBudgets() {
    setBudgets({ ...(budgets || {}), ...budgetDraft });
    setBudgetEdit(false); setBudgetDraft({});
    showToast('Budgets saved ✓');
  }

  // ── Quick filter presets ────────────────────────────────
  function applyQuickFilter(preset) {
    const today = todayISO();
    const d = new Date();
    switch (preset) {
      case 'today':
        setFDateFrom(today); setFDateTo(today); break;
      case 'yesterday': {
        d.setDate(d.getDate() - 1);
        const y = d.toISOString().slice(0, 10);
        setFDateFrom(y); setFDateTo(y); break;
      }
      case 'week': {
        d.setDate(d.getDate() - 6);
        setFDateFrom(d.toISOString().slice(0, 10)); setFDateTo(today); break;
      }
      case 'paycycle':
        setFDateFrom(payCycleStart()); setFDateTo(today); break;
      default: break;
    }
    setPage(1);
  }

  function resetFilters() {
    setFCategory('');
    setFDateFrom(payCycleStart());
    setFDateTo(todayISO());
    setFDescription('');
    setPage(1);
  }

  // ── Pay-cycle filtered expenses (for budget/charts) ─────
  // getExpensesByCategory returns an ARRAY: [{category, amount, percentage}]
  // We convert to a plain map {category: amount} for O(1) lookup.

  const payCycleExpenses = useMemo(() => filterPayCycle(expenses), [expenses]);

  const payCycleCategoryArray = useMemo(
    () => getExpensesByCategory(payCycleExpenses),
    [payCycleExpenses]
  );

  // {category: amount} map for budget bars and budgetCategories
  const categorySpend = useMemo(
    () => Object.fromEntries(payCycleCategoryArray.map(c => [c.category, c.amount])),
    [payCycleCategoryArray]
  );

  // All-time category array for the pie chart
  const allCategoryArray = useMemo(() => getExpensesByCategory(expenses), [expenses]);

  // Chart data — already sorted desc by amount from getExpensesByCategory
  const topCategories = useMemo(
    () => payCycleCategoryArray.slice(0, 10).map(c => ({ category: c.category, amount: c.amount })),
    [payCycleCategoryArray]
  );

  const pieData = useMemo(
    () => allCategoryArray.slice(0, 10).map(c => ({ name: c.category, value: c.amount })),
    [allCategoryArray]
  );

  // 12-month trend (calendar months, for the line chart)
  const trendData = useMemo(
    () => getMonthlyTrend([], expenses, 12).map(m => ({ month: m.month, expenses: m.expenses })),
    [expenses]
  );

  // Budget summary (pay cycle)
  const monthTotal      = payCycleExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget     = Object.values(budgets || {}).reduce((s, v) => s + Number(v || 0), 0);
  const budgetRemaining = totalBudget - monthTotal;
  const budgetPct       = totalBudget > 0 ? Math.min(100, (monthTotal / totalBudget) * 100) : 0;
  const budgetColour    = budgetPct > 100 ? '#EF4444' : budgetPct > 80 ? '#F59E0B' : '#10B981';
  const budgetStatus    = budgetPct > 100 ? 'Over Budget ⚠️' : budgetPct > 80 ? 'Watch Spending ⚡' : 'On Track ✓';

  // Categories that have a budget OR were spent on this cycle
  const budgetCategories = CATEGORIES.filter(
    cat => Number((budgets || {})[cat] || 0) > 0 || (categorySpend[cat] || 0) > 0
  );

  // Pay-cycle label for UI
  const cycleLabel = (() => {
    const start = payCycleStart();
    const end   = (() => {
      const d = new Date(start);
      return new Date(d.getFullYear(), d.getMonth() + 1, 15)
        .toISOString().slice(0, 10);
    })();
    return `${formatDate(start, dateFormat)} – ${formatDate(end, dateFormat)}`;
  })();

  // ── Filter + sort + paginate ────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...expenses];
    if (fCategory)    rows = rows.filter(e => e.category === fCategory);
    if (fDateFrom)    rows = rows.filter(e => e.date >= fDateFrom);
    if (fDateTo)      rows = rows.filter(e => e.date <= fDateTo);
    if (fDescription) rows = rows.filter(e =>
      (e.description || '').toLowerCase().includes(fDescription.toLowerCase())
    );
    rows.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'amount') { va = Number(va); vb = Number(vb); }
      return sortDir === 'asc'
        ? (va < vb ? -1 : va > vb ? 1 : 0)
        : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return rows;
  }, [expenses, fCategory, fDateFrom, fDateTo, fDescription, sortKey, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredSum = filtered.reduce((s, e) => s + Number(e.amount), 0);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }
  const si = k => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── Quick filter active detection ────────────────────────
  const today = todayISO();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const weekStart  = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
  const cycleStart = payCycleStart();
  const activePreset =
    fDateFrom === today     && fDateTo === today     ? 'today'     :
    fDateFrom === yesterday && fDateTo === yesterday ? 'yesterday' :
    fDateFrom === weekStart && fDateTo === today     ? 'week'      :
    fDateFrom === cycleStart && fDateTo === today    ? 'paycycle'  : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', margin: 0 }}>EXPENSES</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>
          Pay Cycle: <strong style={{ color: '#06B6D4' }}>{cycleLabel}</strong>
          &nbsp;·&nbsp;Total spent this cycle: <strong style={{ color: '#EF4444' }}>{formatCurrency(monthTotal, currency)}</strong>
        </p>
      </div>

      {/* ── Budget Overview ────────────────────────────────── */}
      <div style={{ ...CARD, padding: '24px' }}>
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 24, marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Total Budget
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: '#F1F5F9' }}>
              {formatCurrency(totalBudget, currency)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Total Spent
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: '#EF4444' }}>
              {formatCurrency(monthTotal, currency)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Remaining
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: budgetRemaining >= 0 ? '#10B981' : '#EF4444' }}>
              {formatCurrency(Math.abs(budgetRemaining), currency)}
              {budgetRemaining < 0 ? ' over' : ''}
            </div>
          </div>
        </div>

        {totalBudget > 0 && (
          <>
            <div style={{ height: 12, borderRadius: 8, backgroundColor: '#334155', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', borderRadius: 8, width: `${Math.min(100, budgetPct)}%`, backgroundColor: budgetColour, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: budgetColour, fontSize: 13, fontWeight: 700 }}>{budgetStatus}</span>
              <span style={{ color: '#64748B', fontSize: 12 }}>{budgetPct.toFixed(1)}% used</span>
            </div>
          </>
        )}

        {totalBudget === 0 && (
          <p style={{ color: '#475569', fontSize: 12, marginBottom: 0 }}>
            Set category budgets to track your monthly spending limits.
          </p>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setBudgetEdit(b => !b)}
                  style={{ height: 40, padding: '0 16px', backgroundColor: budgetEdit ? '#334155' : 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {budgetEdit ? 'Cancel' : '⚙️ Set Budgets'}
          </button>
          {budgetEdit && (
            <button onClick={saveBudgets}
                    style={{ height: 40, padding: '0 16px', backgroundColor: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Save Budgets
            </button>
          )}
        </div>

        {/* Budget editing grid */}
        {budgetEdit && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, maxHeight: 260, overflowY: 'auto', padding: 4 }}>
            {CATEGORIES.map(cat => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#94A3B8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat}
                </span>
                <input type="number" min="0" step="50" placeholder="0"
                       value={budgetDraft[cat] ?? ((budgets || {})[cat] || '')}
                       onChange={e => setBudgetDraft(d => ({ ...d, [cat]: e.target.value }))}
                       style={{ ...INPUT, width: '90px', padding: '6px 8px', fontSize: 12 }} />
              </div>
            ))}
          </div>
        )}

        {/* Category budget bars (read mode) */}
        {!budgetEdit && budgetCategories.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {budgetCategories.map(cat => {
              const spent  = categorySpend[cat] || 0;
              const budget = Number((budgets || {})[cat] || 0);
              const pct    = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
              const col    = pct >= 100 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981';
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>{cat}</span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: col }}>
                      {formatCurrency(spent, currency)}
                      {budget > 0 ? ` / ${formatCurrency(budget, currency)}` : ' (no budget)'}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 4, backgroundColor: '#334155' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, backgroundColor: col, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Import Bank Statement card ──────────────────────── */}
      <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#06B6D420', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Upload size={15} color="#06B6D4" />
          </div>
          <div>
            <span style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700, display: 'block' }}>Import Bank Statement</span>
            <span style={{ color: '#64748B', fontSize: 12 }}>Upload a CSV export from ANZ, CommBank, Westpac or NAB — transactions auto-categorized</span>
          </div>
        </div>
        <button onClick={() => setImportOpen(true)}
                style={{ padding: '9px 18px', backgroundColor: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={13} /> Import CSV
        </button>
      </div>

      {/* ── Collapsible Add Expense form ───────────────────── */}
      <div style={CARD}>
        <button
          onClick={() => { if (editId) cancelForm(); else setFormOpen(o => !o); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-expanded={formOpen}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#EF444420', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={14} color="#EF4444" />
            </div>
            <span style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700 }}>
              {editId ? '✏️ EDIT EXPENSE' : '+ ADD EXPENSE'}
            </span>
          </div>
          {formOpen ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
        </button>

        <div style={{ maxHeight: formOpen ? '700px' : '0', overflow: 'hidden', opacity: formOpen ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.25s ease' }}>
          <div style={{ borderTop: '1px solid #334155', padding: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
                <Field label="Date" required error={errors.date}>
                  <input type="date" value={form.date} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </Field>
                <Field label="Category" required error={errors.category}>
                  <select value={form.category} style={INPUT}
                          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Amount (AUD)" required error={errors.amount}>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                         value={form.amount} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </Field>
                <Field label="Payment Method">
                  <select value={form.paymentMethod} style={INPUT}
                          onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    <option value="">Select method…</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Description" required error={errors.description}>
                  <input type="text" placeholder="e.g. Woolworths weekly shop"
                         value={form.description} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </Field>
                <Field label="Notes (optional)">
                  <input type="text" placeholder="Any extra notes…" value={form.notes} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit"
                        style={{ height: 44, padding: '0 24px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {editId ? 'Update Expense' : '+ Add Expense'}
                </button>
                <button type="button" onClick={cancelForm}
                        style={{ height: 44, padding: '0 20px', backgroundColor: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {editId ? 'Cancel' : 'Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── 2×2 Charts ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>

        {/* Top Categories — horizontal bar */}
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>THIS CYCLE — TOP CATEGORIES</h3>
            <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>Current pay cycle ({cycleLabel})</p>
          </div>
          {topCategories.length === 0 ? (
            <p style={{ color: '#64748B', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
              📭 No expenses in this pay cycle.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, topCategories.length * 30)}>
              <BarChart data={topCategories} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false}
                       tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="category" width={135}
                       tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} />
                <Tooltip content={<ChartTip currency={currency} />} />
                <Bar dataKey="amount" name="Spent" fill="#EF4444" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* All-time Distribution — pie */}
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>ALL-TIME DISTRIBUTION</h3>
          </div>
          {pieData.length === 0 ? (
            <p style={{ color: '#64748B', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
              📭 No expense data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                     dataKey="value" nameKey="name"
                     label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                     labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly Expenses Trend — line chart */}
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>MONTHLY EXPENSES (12 months)</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false}
                     tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<ChartTip currency={currency} />} />
              <Line type="monotone" dataKey="expenses" name="Expenses"
                    stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Spending Calendar */}
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>SPENDING CALENDAR</h3>
          </div>
          <SpendingCalendar expenses={expenses} />
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────── */}
      <div style={{ ...CARD, padding: '20px' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Filter Expenses
        </h3>

        {/* Quick filter buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {[
            { key: 'today',     label: 'Today'       },
            { key: 'yesterday', label: 'Yesterday'   },
            { key: 'week',      label: 'Last 7 Days' },
            { key: 'paycycle',  label: '💳 Pay Cycle' },
          ].map(btn => (
            <button key={btn.key}
                    onClick={() => applyQuickFilter(btn.key)}
                    style={{
                      height: 32, padding: '0 14px', borderRadius: 20,
                      border: `1px solid ${activePreset === btn.key ? '#06B6D4' : '#334155'}`,
                      backgroundColor: activePreset === btn.key ? '#06B6D420' : 'transparent',
                      color: activePreset === btn.key ? '#06B6D4' : '#94A3B8',
                      fontSize: 12, fontWeight: activePreset === btn.key ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* Date / category / search inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 12 }}>
          <div>
            <label style={LABEL}>Category</label>
            <select value={fCategory} style={INPUT}
                    onChange={e => { setFCategory(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>From</label>
            <input type="date" value={fDateFrom} style={INPUT}
                   onChange={e => { setFDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label style={LABEL}>To</label>
            <input type="date" value={fDateTo} style={INPUT}
                   onChange={e => { setFDateTo(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label style={LABEL}>Search</label>
            <input type="text" placeholder="Search description…"
                   value={fDescription} style={INPUT}
                   onChange={e => { setFDescription(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ color: '#64748B', fontSize: 12 }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} — {formatCurrency(filteredSum, currency)}
          </span>
          <button onClick={resetFilters}
                  style={{ height: 32, padding: '0 14px', border: '1px solid #334155', borderRadius: 6, backgroundColor: 'transparent', color: '#94A3B8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Reset to Pay Cycle
          </button>
        </div>
      </div>

      {/* ── Expense Table ─────────────────────────────────── */}
      <div style={{ ...CARD, padding: '20px' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          All Expenses
        </h3>

        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: 14 }}>
            📭 No expenses yet. Add your first expense above.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#334155' }}>
                    {[
                      { key: 'date',        label: 'Date'        },
                      { key: 'category',    label: 'Category'    },
                      { key: 'amount',      label: 'Amount'      },
                      { key: 'description', label: 'Description' },
                      { key: 'paymentMethod', label: 'Payment'   },
                    ].map(col => (
                      <th key={col.key} onClick={() => toggleSort(col.key)}
                          style={{
                            padding: '10px 12px',
                            textAlign: col.key === 'amount' ? 'right' : 'left',
                            color: '#F1F5F9', fontSize: 12, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                          }}>
                        {col.label}{si(col.key)}
                      </th>
                    ))}
                    <th style={{ padding: '10px 12px', color: '#F1F5F9', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((exp, i) => (
                    <tr key={exp.id || i}
                        style={{ backgroundColor: i % 2 === 0 ? '#1E2139' : '#1A2336', borderBottom: '1px solid #1E293B' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1F2437'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#1E2139' : '#1A2336'}>
                      <td style={{ padding: '12px', color: '#94A3B8', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {formatDate(exp.date, dateFormat)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ backgroundColor: '#EF444420', color: '#EF4444', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#EF4444', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
                        -{formatCurrency(exp.amount, currency)}
                      </td>
                      <td style={{ padding: '12px', color: '#F1F5F9', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.description || '—'}
                      </td>
                      <td style={{ padding: '12px', color: '#64748B', fontSize: 12 }}>
                        {exp.paymentMethod || '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <button onClick={() => handleEdit(exp)} title="Edit"
                                  style={{ width: 30, height: 30, borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Edit2 size={13} color="#94A3B8" />
                          </button>
                          <button onClick={() => setDeleteId(exp.id)} title="Delete"
                                  style={{ width: 30, height: 30, borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EF444420'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Trash2 size={13} color="#EF4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {paginated.map((exp, i) => (
                <div key={exp.id || i} style={{ backgroundColor: '#0F172A', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ backgroundColor: '#EF444420', color: '#EF4444', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                      {exp.category}
                    </span>
                    <span style={{ color: '#EF4444', fontFamily: 'monospace', fontWeight: 700 }}>
                      -{formatCurrency(exp.amount, currency)}
                    </span>
                  </div>
                  <p style={{ color: '#F1F5F9', fontSize: 13, margin: '4px 0 2px' }}>{exp.description || '—'}</p>
                  <p style={{ color: '#64748B', fontSize: 12 }}>{formatDate(exp.date, dateFormat)}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => handleEdit(exp)}
                            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#334155', color: '#94A3B8', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => setDeleteId(exp.id)}
                            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#EF444420', color: '#EF4444', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #334155' }}>
                <span style={{ color: '#64748B', fontSize: 12 }}>Page {page} of {totalPages}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ l: 'Prev', f: () => setPage(p => Math.max(1, p - 1)), d: page === 1 },
                    { l: 'Next', f: () => setPage(p => Math.min(totalPages, p + 1)), d: page === totalPages }]
                    .map(b => (
                      <button key={b.l} onClick={b.f} disabled={b.d}
                              style={{ height: 32, padding: '0 14px', borderRadius: 6, border: '1px solid #334155', backgroundColor: 'transparent', color: b.d ? '#334155' : '#94A3B8', fontSize: 12, fontWeight: 600, cursor: b.d ? 'not-allowed' : 'pointer', opacity: b.d ? 0.5 : 1 }}>
                        {b.l}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete modal ──────────────────────────────────── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...CARD, width: 360, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#F1F5F9', margin: 0, fontWeight: 700 }}>Delete Expense?</h3>
              <button onClick={() => setDeleteId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748B" />
              </button>
            </div>
            <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleDelete(deleteId)}
                      style={{ flex: 1, height: 44, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                Delete
              </button>
              <button onClick={() => setDeleteId(null)}
                      style={{ flex: 1, height: 44, backgroundColor: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} />

      {/* ── Import Statement modal ────────────────────────── */}
      {importOpen && (
        <ImportModal
          existing={expenses}
          currency={currency}
          onClose={() => setImportOpen(false)}
          onImport={rows => {
            setExpenses(prev => [...(Array.isArray(prev) ? prev : expenses), ...rows]);
            setImportOpen(false);
            showToast(`${rows.length} transaction${rows.length !== 1 ? 's' : ''} imported ✓`);
          }}
        />
      )}
    </div>
  );
}
