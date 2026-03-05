// ============================================================
// Expenses/index.jsx — Expense tracking v3
// Fixed: category spend lookup (array→map), pay-cycle month
//        (16th–15th), quick filters, filter defaults
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Trash2, Edit2, X, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Plus, ChevronLeft, ChevronRight,
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
  const [formOpen,  setFormOpen]  = useState(false);
  const [toast,     setToast]     = useState({ message: '', type: 'success' });
  const [deleteId,  setDeleteId]  = useState(null);

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
    </div>
  );
}
