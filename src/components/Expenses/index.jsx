// ============================================================
// Expenses/index.jsx — Expense tracking & budget management
// Shows: Entry form, Budget overview, Category charts,
//        Spending calendar, Monthly trend, Expense table
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { Trash2, Edit2, X, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

import { generateId } from '../../utils/storage';
import {
  filterCurrentMonth, getMonthlyTrend, getExpensesByCategory,
} from '../../utils/calculations';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { formatDate, todayISO, shortMonthLabel } from '../../utils/dateHelpers';

// ── Constants ─────────────────────────────────────────────
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

const PAYMENT_METHODS = [
  'Bank Transfer', 'Credit Card', 'Debit Card',
  'Cash', 'Buy Now Pay Later', 'Other',
];

const CHART_COLOURS = [
  '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#0EA5E9', '#A78BFA', '#FB7185', '#34D399', '#FCD34D',
];

const PAGE_SIZE = 20;

const cardStyle  = { backgroundColor: '#1E2139', border: '1px solid #334155' };
const inputStyle = {
  width: '100%', backgroundColor: '#0F172A', border: '1px solid #334155',
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
  color: '#F1F5F9', fontSize: '0.875rem', outline: 'none',
};
const labelStyle = { fontSize: '0.75rem', color: '#94A3B8', display: 'block', marginBottom: '0.25rem' };
const errorStyle = { fontSize: '0.75rem', color: '#EF4444', marginTop: '0.25rem' };

// ── Reusable field wrapper ─────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

// ── Toast notification ─────────────────────────────────────
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

// ── Budget progress bar ────────────────────────────────────
function BudgetBar({ label, spent, budget, currency }) {
  const pct     = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over    = spent > budget && budget > 0;
  const barCol  = over ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm truncate pr-2" style={{ color: '#94A3B8' }}>{label}</span>
        <span className="text-xs whitespace-nowrap font-mono"
              style={{ color: over ? '#EF4444' : '#F1F5F9' }}>
          {formatCurrency(spent, currency)} / {formatCurrency(budget, currency)}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ backgroundColor: '#334155' }}>
        <div className="h-1.5 rounded-full transition-all"
             style={{ width: `${pct}%`, backgroundColor: barCol }} />
      </div>
    </div>
  );
}

// ── Spending Calendar (GitHub-style heatmap) ───────────────
function SpendingCalendar({ expenses }) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // 0-indexed
  });

  const prevMonth = () => setViewDate(d => {
    if (d.month === 0) return { year: d.year - 1, month: 11 };
    return { year: d.year, month: d.month - 1 };
  });
  const nextMonth = () => setViewDate(d => {
    if (d.month === 11) return { year: d.year + 1, month: 0 };
    return { year: d.year, month: d.month + 1 };
  });

  // Build a map: 'YYYY-MM-DD' → total amount
  const dailyMap = useMemo(() => {
    const m = {};
    expenses.forEach(e => {
      const d = e.date?.slice(0, 10);
      if (d) m[d] = (m[d] || 0) + Number(e.amount || 0);
    });
    return m;
  }, [expenses]);

  // Filter to selected month
  const { year, month } = viewDate;
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthEntries = Object.entries(dailyMap)
    .filter(([k]) => k.startsWith(monthKey))
    .map(([, v]) => v);
  const maxDaily = monthEntries.length ? Math.max(...monthEntries) : 0;

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = new Date(year, month).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  function cellColour(amount) {
    if (!amount || maxDaily === 0) return '#1E2139';
    const ratio = amount / maxDaily;
    if (ratio > 0.75) return '#EF4444';
    if (ratio > 0.5)  return '#F97316';
    if (ratio > 0.25) return '#F59E0B';
    return '#FEF08A30';
  }

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-700 transition-colors">
          <ChevronLeft size={16} color="#94A3B8" />
        </button>
        <span className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>{monthName}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-700 transition-colors">
          <ChevronRight size={16} color="#94A3B8" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs" style={{ color: '#475569' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const key    = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const amount = dailyMap[key] || 0;
          return (
            <div key={key}
                 title={amount ? `${formatCurrency(amount, 'AUD')}` : ''}
                 className="aspect-square rounded flex items-center justify-center text-xs cursor-default"
                 style={{
                   backgroundColor: cellColour(amount),
                   border: '1px solid #334155',
                   color: amount ? '#F1F5F9' : '#475569',
                   fontSize: '0.65rem',
                 }}>
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-xs" style={{ color: '#475569' }}>Less</span>
        {['#1E2139', '#FEF08A30', '#F59E0B', '#F97316', '#EF4444'].map(c => (
          <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c, border: '1px solid #334155' }} />
        ))}
        <span className="text-xs" style={{ color: '#475569' }}>More</span>
      </div>
    </div>
  );
}

// ── Custom chart tooltip ───────────────────────────────────
function ChartTooltip({ active, payload, label, currency = 'AUD' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-sm shadow-xl"
         style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
      <p className="font-semibold mb-1" style={{ color: '#F1F5F9' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#06B6D4' }}>
          {p.name}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

// ── Main Expenses component ────────────────────────────────
export default function Expenses({ data, setExpenses, setBudgets }) {
  const { expenses, budgets, settings } = data;
  const currency    = settings?.currency    || 'AUD';
  const dateFormat  = settings?.dateFormat  || 'DD/MM/YYYY';

  // ── Form state ─────────────────────────────────────────
  const blankForm = {
    date: todayISO(), category: '', amount: '', description: '',
    paymentMethod: '', notes: '',
  };
  const [form,      setForm]      = useState(blankForm);
  const [errors,    setErrors]    = useState({});
  const [editId,    setEditId]    = useState(null);
  const [toast,     setToast]     = useState({ message: '', type: 'success' });
  const [deleteId,  setDeleteId]  = useState(null);

  // ── Filter state ────────────────────────────────────────
  const [fCategory,    setFCategory]    = useState('');
  const [fDateFrom,    setFDateFrom]    = useState('');
  const [fDateTo,      setFDateTo]      = useState('');
  const [fDescription, setFDescription] = useState('');
  const [sortKey,      setSortKey]      = useState('date');
  const [sortDir,      setSortDir]      = useState('desc');
  const [page,         setPage]         = useState(1);

  // ── Budget editing state ────────────────────────────────
  const [budgetDraft, setBudgetDraft] = useState({});
  const [budgetEdit,  setBudgetEdit]  = useState(false);

  // ── Toast helper ────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }, []);

  // ── Validate ────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.date)                              errs.date        = 'Date is required';
    if (!form.category)                          errs.category    = 'Category is required';
    if (!form.amount || Number(form.amount) <= 0) errs.amount    = 'Enter a valid amount';
    if (!form.description?.trim())               errs.description = 'Description is required';
    return errs;
  }

  // ── Add / Update ────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (editId) {
      setExpenses(expenses.map(exp =>
        exp.id === editId
          ? { ...exp, ...form, amount: Number(form.amount) }
          : exp
      ));
      setEditId(null);
      showToast('Expense updated');
    } else {
      setExpenses([
        ...expenses,
        { ...form, amount: Number(form.amount), id: generateId('exp') },
      ]);
      showToast('Expense added');
    }
    setForm(blankForm);
    setErrors({});
  }

  function handleEdit(exp) {
    setForm({
      date: exp.date, category: exp.category,
      amount: String(exp.amount), description: exp.description || '',
      paymentMethod: exp.paymentMethod || '', notes: exp.notes || '',
    });
    setEditId(exp.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    setExpenses(expenses.filter(e => e.id !== id));
    setDeleteId(null);
    showToast('Expense deleted');
  }

  function cancelEdit() {
    setForm(blankForm);
    setEditId(null);
    setErrors({});
  }

  // ── Budget save ─────────────────────────────────────────
  function saveBudgets() {
    const merged = { ...(budgets || {}), ...budgetDraft };
    setBudgets(merged);
    setBudgetEdit(false);
    setBudgetDraft({});
    showToast('Budgets saved');
  }

  // ── Computed data ───────────────────────────────────────
  const monthExpenses    = filterCurrentMonth(expenses);
  const monthTotal       = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget      = Object.values(budgets || {}).reduce((s, v) => s + Number(v || 0), 0);
  const budgetRemaining  = totalBudget - monthTotal;
  const budgetPct        = totalBudget > 0 ? Math.min(100, (monthTotal / totalBudget) * 100) : 0;

  const categorySpend    = getExpensesByCategory(monthExpenses);
  const allCategorySpend = getExpensesByCategory(expenses);
  const monthlyTrend     = getMonthlyTrend([], expenses, 12);

  // ── Top-10 categories for horizontal bar ───────────────
  const topCategories = useMemo(() =>
    Object.entries(categorySpend)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([cat, amount]) => ({ category: cat, amount })),
  [categorySpend]);

  // ── Pie chart data ──────────────────────────────────────
  const pieData = useMemo(() =>
    Object.entries(allCategorySpend)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value })),
  [allCategorySpend]);

  // ── Monthly trend for line chart ────────────────────────
  const trendData = useMemo(() =>
    monthlyTrend.map(m => ({ month: m.month, expenses: m.expenses })),
  [monthlyTrend]);

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
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [expenses, fCategory, fDateFrom, fDateTo, fDescription, sortKey, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount), 0);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }
  function resetFilters() {
    setFCategory(''); setFDateFrom(''); setFDateTo(''); setFDescription(''); setPage(1);
  }

  const sortIndicator = (key) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── Category budget list (only cats with budget or spend) ─
  const budgetCategories = useMemo(() => {
    const cats = new Set([
      ...CATEGORIES,
      ...Object.keys(budgets || {}),
    ]);
    return [...cats];
  }, [budgets]);

  const budgetToDisplay = useMemo(() =>
    CATEGORIES.filter(cat => (budgets || {})[cat] > 0 || categorySpend[cat] > 0),
  [budgets, categorySpend]);

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>Expenses</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Track spending, set budgets, and analyse your cash outflows
        </p>
      </div>

      {/* ── Entry Form + Budget Overview ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Entry Form */}
        <div className="lg:col-span-2 rounded-xl p-5" style={cardStyle}>
          <h2 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>
            {editId ? '✏️ Edit Expense' : '+ Add Expense'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <Field label="Date *" error={errors.date}>
              <input type="date" value={form.date} style={inputStyle}
                     onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>

            <Field label="Category *" error={errors.category}>
              <select value={form.category} style={inputStyle}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Amount (AUD) *" error={errors.amount}>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                     value={form.amount} style={inputStyle}
                     onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>

            <Field label="Payment Method" error={errors.paymentMethod}>
              <select value={form.paymentMethod} style={inputStyle}
                      onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="">Select method…</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>

            <Field label="Description *" error={errors.description}>
              <input type="text" placeholder="e.g. Woolworths weekly shop"
                     value={form.description} style={inputStyle}
                     onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>

            <Field label="Notes (optional)" error={errors.notes}>
              <input type="text" placeholder="Any extra notes…"
                     value={form.notes} style={inputStyle}
                     onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>

            <div className="sm:col-span-2 flex gap-3">
              <button type="submit"
                      className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ backgroundColor: '#06B6D4', color: '#ffffff' }}>
                {editId ? 'Update Expense' : 'Add Expense'}
              </button>
              {editId && (
                <button type="button" onClick={cancelEdit}
                        className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{ backgroundColor: '#334155', color: '#94A3B8' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Budget Overview */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h2 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>This Month</h2>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: '#94A3B8' }}>Total Spent</span>
              <span className="font-mono font-semibold text-sm" style={{ color: '#EF4444' }}>
                {formatCurrency(monthTotal, currency)}
              </span>
            </div>
            {totalBudget > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#94A3B8' }}>Total Budget</span>
                  <span className="font-mono text-sm" style={{ color: '#F1F5F9' }}>
                    {formatCurrency(totalBudget, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#94A3B8' }}>Remaining</span>
                  <span className="font-mono text-sm"
                        style={{ color: budgetRemaining >= 0 ? '#10B981' : '#EF4444' }}>
                    {formatCurrency(Math.abs(budgetRemaining), currency)}
                    {budgetRemaining < 0 ? ' over' : ' left'}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: '#475569' }}>Budget Used</span>
                    <span className="text-xs font-mono" style={{ color: '#94A3B8' }}>
                      {formatPercent(budgetPct)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#334155' }}>
                    <div className="h-2 rounded-full transition-all"
                         style={{
                           width: `${budgetPct}%`,
                           backgroundColor: budgetPct > 90 ? '#EF4444' : budgetPct > 75 ? '#F59E0B' : '#10B981',
                         }} />
                  </div>
                </div>
              </>
            )}
          </div>

          {totalBudget === 0 && (
            <p className="text-xs mb-3" style={{ color: '#475569' }}>
              Set budgets per category below to track your limits.
            </p>
          )}

          <button onClick={() => { setBudgetEdit(b => !b); setBudgetDraft({}); }}
                  className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: '#334155', color: '#94A3B8' }}>
            {budgetEdit ? 'Cancel Budget Edit' : '⚙️ Set Budgets'}
          </button>

          {/* Category budgets list */}
          {!budgetEdit && budgetToDisplay.length > 0 && (
            <div className="mt-4 space-y-3">
              {budgetToDisplay.map(cat => (
                <BudgetBar
                  key={cat}
                  label={cat}
                  spent={categorySpend[cat] || 0}
                  budget={Number((budgets || {})[cat] || 0)}
                  currency={currency}
                />
              ))}
            </div>
          )}

          {/* Budget edit grid */}
          {budgetEdit && (
            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
              {CATEGORIES.map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs truncate flex-1" style={{ color: '#94A3B8' }}>{cat}</span>
                  <input
                    type="number" min="0" step="50" placeholder="0"
                    value={budgetDraft[cat] ?? ((budgets || {})[cat] || '')}
                    onChange={e => setBudgetDraft(d => ({ ...d, [cat]: e.target.value }))}
                    style={{ ...inputStyle, width: '90px', padding: '0.3rem 0.5rem' }}
                  />
                </div>
              ))}
              <button onClick={saveBudgets}
                      className="w-full mt-2 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ backgroundColor: '#06B6D4', color: '#ffffff' }}>
                Save Budgets
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts row ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Spending by Category (horizontal bar) */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>
            This Month — Top Categories
          </h3>
          {topCategories.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#64748B' }}>
              No expenses this month yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topCategories} layout="vertical"
                        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false}
                       tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" width={120}
                       tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Bar dataKey="amount" name="Spent" fill="#EF4444" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Distribution Pie */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>
            All-Time Distribution
          </h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#64748B' }}>
              No expense data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                     dataKey="value" nameKey="name"
                     label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                     labelLine={false}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Monthly Trend + Spending Calendar ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Monthly Trend */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>
            Monthly Expenses (12 months)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false}
                     tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Line type="monotone" dataKey="expenses" name="Expenses"
                    stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Spending Calendar */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>
            Spending Calendar
          </h3>
          <SpendingCalendar expenses={expenses} />
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="rounded-xl p-5" style={cardStyle}>
        <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Filter Expenses</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label style={labelStyle}>Category</label>
            <select value={fCategory} style={inputStyle}
                    onChange={e => { setFCategory(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date From</label>
            <input type="date" value={fDateFrom} style={inputStyle}
                   onChange={e => { setFDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label style={labelStyle}>Date To</label>
            <input type="date" value={fDateTo} style={inputStyle}
                   onChange={e => { setFDateTo(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label style={labelStyle}>Search Description</label>
            <input type="text" placeholder="Search…" value={fDescription} style={inputStyle}
                   onChange={e => { setFDescription(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs" style={{ color: '#64748B' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} —
            total {formatCurrency(filteredTotal, currency)}
          </span>
          <button onClick={resetFilters}
                  className="text-xs px-3 py-1 rounded-lg transition-all"
                  style={{ backgroundColor: '#334155', color: '#94A3B8' }}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* ── Expense Table ─────────────────────────────────── */}
      <div className="rounded-xl p-5" style={cardStyle}>
        <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>All Expenses</h3>

        {expenses.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#64748B' }}>
            No expenses yet. Add your first expense above.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {[
                      { key: 'date',        label: 'Date'        },
                      { key: 'category',    label: 'Category'    },
                      { key: 'description', label: 'Description' },
                      { key: 'paymentMethod', label: 'Payment'   },
                      { key: 'amount',      label: 'Amount'      },
                    ].map(col => (
                      <th key={col.key}
                          className="pb-2 text-left cursor-pointer select-none"
                          style={{ color: '#64748B' }}
                          onClick={() => toggleSort(col.key)}>
                        {col.label}{sortIndicator(col.key)}
                      </th>
                    ))}
                    <th className="pb-2 text-right" style={{ color: '#64748B' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((exp, i) => (
                    <tr key={exp.id || i}
                        style={{ borderBottom: '1px solid #1E293B' }}
                        className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 pr-3 font-mono text-xs" style={{ color: '#94A3B8' }}>
                        {formatDate(exp.date, dateFormat)}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-2 pr-3 max-w-xs truncate" style={{ color: '#F1F5F9' }}>
                        {exp.description || '—'}
                        {exp.notes && (
                          <span className="ml-2 text-xs" style={{ color: '#475569' }}>
                            ({exp.notes})
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs" style={{ color: '#64748B' }}>
                        {exp.paymentMethod || '—'}
                      </td>
                      <td className="py-2 pr-3 font-mono font-semibold" style={{ color: '#EF4444' }}>
                        -{formatCurrency(exp.amount, currency)}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(exp)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-slate-700">
                            <Edit2 size={13} color="#94A3B8" />
                          </button>
                          <button onClick={() => setDeleteId(exp.id)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-red-900/30">
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
            <div className="md:hidden space-y-2">
              {paginated.map((exp, i) => (
                <div key={exp.id || i} className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="px-2 py-0.5 rounded text-xs mr-2"
                            style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
                        {exp.category}
                      </span>
                      <span className="text-xs" style={{ color: '#64748B' }}>
                        {formatDate(exp.date, dateFormat)}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-sm" style={{ color: '#EF4444' }}>
                      -{formatCurrency(exp.amount, currency)}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: '#F1F5F9' }}>
                    {exp.description || '—'}
                  </p>
                  {exp.paymentMethod && (
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>{exp.paymentMethod}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEdit(exp)}
                            className="text-xs px-3 py-1 rounded-lg"
                            style={{ backgroundColor: '#334155', color: '#94A3B8' }}>
                      Edit
                    </button>
                    <button onClick={() => setDeleteId(exp.id)}
                            className="text-xs px-3 py-1 rounded-lg"
                            style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3"
                   style={{ borderTop: '1px solid #334155' }}>
                <span className="text-xs" style={{ color: '#64748B' }}>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1 rounded-lg text-xs disabled:opacity-40 transition-all"
                          style={{ backgroundColor: '#334155', color: '#94A3B8' }}>
                    Previous
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-1 rounded-lg text-xs disabled:opacity-40 transition-all"
                          style={{ backgroundColor: '#334155', color: '#94A3B8' }}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete Confirmation Modal ─────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-xl p-6 w-80 shadow-2xl" style={cardStyle}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold" style={{ color: '#F1F5F9' }}>Delete Expense</h3>
              <button onClick={() => setDeleteId(null)}>
                <X size={18} color="#64748B" />
              </button>
            </div>
            <p className="text-sm mb-5" style={{ color: '#94A3B8' }}>
              Are you sure you want to delete this expense? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#EF4444', color: '#ffffff' }}>
                Delete
              </button>
              <button onClick={() => setDeleteId(null)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium"
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
