// ============================================================
// Income/index.jsx — Track all income sources
// Sections: Entry form, Summary cards, Pie chart,
//           Monthly bar chart, Filterable table with edit/delete
// ============================================================

import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  Plus, ChevronUp, ChevronDown, Pencil, Trash2,
  X, Check, ChevronLeft, ChevronRight, RotateCcw,
} from 'lucide-react';

import { generateId } from '../../utils/storage';
import { getIncomeStats, getMonthlyTrend, filterCurrentMonth } from '../../utils/calculations';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { formatDate, todayISO, isFutureDate } from '../../utils/dateHelpers';

// ── Constants ─────────────────────────────────────────────────
const SOURCES = ['Salary', 'Bonus', 'Freelance', 'Investment Returns', 'Rental Income', 'Other'];
const PIE_COLOURS = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#64748B'];
const ROWS_PER_PAGE = 20;

const EMPTY_FORM = { date: todayISO(), source: '', amount: '', notes: '' };

// ── Toast notification ────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  const bg = type === 'success' ? '#10B981' : '#EF4444';
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium"
         style={{ backgroundColor: bg, minWidth: 260 }}>
      {type === 'success' ? <Check size={16} /> : <X size={16} />}
      {message}
      <button onClick={onClose} className="ml-auto opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ── Summary stat card ─────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
      <p className="text-xs mb-1" style={{ color: '#64748B' }}>{label}</p>
      <p className="text-xl font-bold font-mono" style={{ color: '#F1F5F9' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{sub}</p>}
    </div>
  );
}

// ── Custom chart tooltip ──────────────────────────────────────
function ChartTooltip({ active, payload, label, currency }) {
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

// ── Main Income component ─────────────────────────────────────
export default function Income({ data, setIncome }) {
  const { income, settings } = data;
  const currency = settings?.currency || 'AUD';
  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';

  // Form state
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [editId,      setEditId]      = useState(null);
  const [formOpen,    setFormOpen]    = useState(true);
  const [errors,      setErrors]      = useState({});
  const [toast,       setToast]       = useState(null);

  // Filter state
  const [filterSource, setFilterSource] = useState('All');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [searchText,   setSearchText]   = useState('');

  // Table state
  const [sortCol,  setSortCol]  = useState('date');
  const [sortDir,  setSortDir]  = useState('desc');
  const [page,     setPage]     = useState(1);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);

  // ── Show toast for 3s ───────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Form validation ─────────────────────────────────────────
  const validate = (f = form) => {
    const e = {};
    if (!f.date)               e.date   = 'Date is required';
    if (isFutureDate(f.date))  e.date   = 'Date cannot be in the future';
    if (!f.source)             e.source = 'Source is required';
    if (!f.amount || Number(f.amount) <= 0)
                               e.amount = 'Amount must be greater than 0';
    if (f.notes.length > 255)  e.notes  = 'Max 255 characters';
    return e;
  };

  const isValid = Object.keys(validate()).length === 0;

  // ── Handle form field changes ───────────────────────────────
  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    const e = validate(updated);
    setErrors(prev => ({ ...prev, [field]: e[field] }));
  };

  // ── Submit — add or update ──────────────────────────────────
  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const now = new Date().toISOString();
    if (editId) {
      // Update existing entry
      setIncome(income.map(i =>
        i.id === editId
          ? { ...i, ...form, amount: Number(form.amount), updatedAt: now }
          : i
      ));
      showToast('✓ Income entry updated successfully');
      setEditId(null);
    } else {
      // Add new entry
      const entry = {
        id:        generateId('inc'),
        ...form,
        amount:    Number(form.amount),
        createdAt: now,
        updatedAt: now,
      };
      setIncome([...income, entry]);
      showToast('✓ Income entry added successfully');
    }
    setForm(EMPTY_FORM);
    setErrors({});
  };

  // ── Edit — populate form ────────────────────────────────────
  const handleEdit = (entry) => {
    setForm({ date: entry.date, source: entry.source, amount: String(entry.amount), notes: entry.notes || '' });
    setEditId(entry.id);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Delete — confirmed ──────────────────────────────────────
  const handleDelete = (id) => {
    setIncome(income.filter(i => i.id !== id));
    setDeleteId(null);
    showToast('Income entry deleted', 'error');
  };

  // ── Cancel edit ─────────────────────────────────────────────
  const handleCancelEdit = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setErrors({});
  };

  // ── Sorting ─────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
    setPage(1);
  };

  // ── Filtered + sorted income ─────────────────────────────────
  const filtered = useMemo(() => {
    return income
      .filter(i => {
        if (filterSource !== 'All' && i.source !== filterSource) return false;
        if (filterFrom && i.date < filterFrom) return false;
        if (filterTo   && i.date > filterTo)   return false;
        if (searchText && !i.notes?.toLowerCase().includes(searchText.toLowerCase()) &&
            !i.source.toLowerCase().includes(searchText.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        let va = a[sortCol], vb = b[sortCol];
        if (sortCol === 'amount') { va = Number(va); vb = Number(vb); }
        if (va < vb) return sortDir === 'asc' ? -1 :  1;
        if (va > vb) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });
  }, [income, filterSource, filterFrom, filterTo, searchText, sortCol, sortDir]);

  // ── Pagination ───────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  // ── Chart data ───────────────────────────────────────────────
  const pieData = useMemo(() => {
    const grouped = {};
    income.forEach(i => { grouped[i.source] = (grouped[i.source] || 0) + Number(i.amount); });
    return Object.entries(grouped).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [income]);

  const barData = useMemo(() => getMonthlyTrend(income, [], 12).map(m => ({
    month: m.month, income: m.income,
  })), [income]);

  // ── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => getIncomeStats(income), [income]);

  // ── Sort header helper ───────────────────────────────────────
  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronUp size={12} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={12} color="#06B6D4" /> : <ChevronDown size={12} color="#06B6D4" />;
  };

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>Income</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>Track all your income sources</p>
      </div>

      {/* ── Entry form ───────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
        {/* Form header / toggle */}
        <button
          onClick={() => setFormOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
          style={{ borderBottom: formOpen ? '1px solid #334155' : 'none' }}
        >
          <span className="font-semibold" style={{ color: '#F1F5F9' }}>
            {editId ? '✏️ Edit Income Entry' : '+ Add Income Entry'}
          </span>
          {formOpen ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
        </button>

        {formOpen && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94A3B8' }}>
                  Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  max={todayISO()}
                  onChange={e => handleChange('date', e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: '#0F172A',
                    border: `1px solid ${errors.date ? '#EF4444' : '#334155'}`,
                    color: '#F1F5F9',
                  }}
                />
                {errors.date && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.date}</p>}
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94A3B8' }}>
                  Source <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={form.source}
                  onChange={e => handleChange('source', e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: '#0F172A',
                    border: `1px solid ${errors.source ? '#EF4444' : '#334155'}`,
                    color: form.source ? '#F1F5F9' : '#64748B',
                  }}
                >
                  <option value="">Select source…</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.source && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.source}</p>}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94A3B8' }}>
                  Amount ({currency}) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => handleChange('amount', e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: '#0F172A',
                    border: `1px solid ${errors.amount ? '#EF4444' : '#334155'}`,
                    color: '#F1F5F9',
                  }}
                />
                {errors.amount && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.amount}</p>}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94A3B8' }}>
                  Notes <span style={{ color: '#64748B' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. January salary, Q4 bonus"
                  maxLength={255}
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: '#0F172A',
                    border: `1px solid ${errors.notes ? '#EF4444' : '#334155'}`,
                    color: '#F1F5F9',
                  }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: '#475569' }}>
                  {form.notes.length}/255
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: isValid ? '#06B6D4' : '#334155',
                  color: isValid ? '#fff' : '#64748B',
                  cursor: isValid ? 'pointer' : 'not-allowed',
                }}
              >
                <Plus size={16} />
                {editId ? 'Update Income' : 'Add Income'}
              </button>
              {editId && (
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ border: '1px solid #334155', color: '#94A3B8', backgroundColor: 'transparent' }}
                >
                  <X size={16} /> Cancel Edit
                </button>
              )}
              <button
                onClick={() => { setForm(EMPTY_FORM); setErrors({}); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
                style={{ border: '1px solid #334155', color: '#94A3B8', backgroundColor: 'transparent' }}
              >
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="This Month"  value={formatCurrency(stats.thisMonth, currency)} />
        <StatCard label="This Year"   value={formatCurrency(stats.thisYear, currency)} />
        <StatCard label="Monthly Avg" value={formatCurrency(stats.average, currency)} />
        <StatCard
          label="Highest Entry"
          value={formatCurrency(stats.highest, currency)}
          sub={stats.highestSource || '—'}
        />
      </div>

      {/* ── Charts ───────────────────────────────────────── */}
      {income.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Income by Source — Pie */}
          <div className="rounded-xl p-5" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Income by Source</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v, currency)}
                  contentStyle={{ backgroundColor: '#1E2139', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Income Trend — Bar */}
          <div className="rounded-xl p-5" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Monthly Income (12 months)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false}
                       tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Bar dataKey="income" name="Income" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Source filter */}
          <div className="flex-1 min-w-36">
            <label className="block text-xs mb-1" style={{ color: '#64748B' }}>Source</label>
            <select
              value={filterSource}
              onChange={e => { setFilterSource(e.target.value); setPage(1); }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F1F5F9' }}
            >
              <option value="All">All Sources</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Date from */}
          <div className="flex-1 min-w-36">
            <label className="block text-xs mb-1" style={{ color: '#64748B' }}>From</label>
            <input type="date" value={filterFrom}
              onChange={e => { setFilterFrom(e.target.value); setPage(1); }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F1F5F9' }} />
          </div>

          {/* Date to */}
          <div className="flex-1 min-w-36">
            <label className="block text-xs mb-1" style={{ color: '#64748B' }}>To</label>
            <input type="date" value={filterTo}
              onChange={e => { setFilterTo(e.target.value); setPage(1); }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F1F5F9' }} />
          </div>

          {/* Reset filters */}
          <button
            onClick={() => { setFilterSource('All'); setFilterFrom(''); setFilterTo(''); setSearchText(''); setPage(1); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ border: '1px solid #334155', color: '#94A3B8', backgroundColor: 'transparent' }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3"
             style={{ borderBottom: '1px solid #334155' }}>
          <h3 className="font-semibold" style={{ color: '#F1F5F9' }}>Income Entries</h3>
          <span className="text-sm" style={{ color: '#64748B' }}>
            Showing {Math.min(filtered.length, (page - 1) * ROWS_PER_PAGE + paginated.length)} of {filtered.length}
          </span>
        </div>

        {income.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#64748B' }}>
            No income entries yet. Add your first entry above.
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#64748B' }}>
            No entries match your filters.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#334155' }}>
                    {[
                      { key: 'date',   label: 'Date'   },
                      { key: 'source', label: 'Source' },
                      { key: 'amount', label: 'Amount' },
                      { key: 'notes',  label: 'Notes', sortable: false },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                        className="px-4 py-3 text-left font-semibold select-none"
                        style={{
                          color: '#94A3B8',
                          cursor: col.sortable !== false ? 'pointer' : 'default',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.sortable !== false && <SortIcon col={col.key} />}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#94A3B8' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((entry, i) => (
                    <tr key={entry.id}
                        style={{ borderTop: '1px solid #334155', backgroundColor: i % 2 === 0 ? 'transparent' : '#1a1f36' }}>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: '#CBD5E1' }}>
                        {formatDate(entry.date, dateFormat)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: '#06B6D420', color: '#06B6D4' }}>
                          {entry.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#10B981' }}>
                        {formatCurrency(entry.amount, currency)}
                      </td>
                      <td className="px-4 py-3 max-w-xs" style={{ color: '#94A3B8' }}>
                        <span title={entry.notes}>
                          {entry.notes ? (entry.notes.length > 40 ? entry.notes.slice(0, 40) + '…' : entry.notes) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(entry)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-cyan-500/20"
                                  title="Edit">
                            <Pencil size={14} color="#06B6D4" />
                          </button>
                          <button onClick={() => setDeleteId(entry.id)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
                                  title="Delete">
                            <Trash2 size={14} color="#EF4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: '#334155' }}>
              {paginated.map(entry => (
                <div key={entry.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: '#06B6D420', color: '#06B6D4' }}>
                        {entry.source}
                      </span>
                      <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                        {formatDate(entry.date, dateFormat)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm" style={{ color: '#10B981' }}>
                      {formatCurrency(entry.amount, currency)}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{entry.notes}</p>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(entry)}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: '#06B6D420', color: '#06B6D4' }}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => setDeleteId(entry.id)}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3"
                   style={{ borderTop: '1px solid #334155' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
                        style={{ border: '1px solid #334155', color: '#94A3B8' }}>
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-sm" style={{ color: '#64748B' }}>
                  Page {page} of {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
                        style={{ border: '1px solid #334155', color: '#94A3B8' }}>
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete confirmation modal ─────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
               style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
            <h3 className="font-semibold text-lg mb-2" style={{ color: '#F1F5F9' }}>Delete Entry?</h3>
            <p className="text-sm mb-5" style={{ color: '#94A3B8' }}>
              This cannot be undone. Are you sure?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ border: '1px solid #334155', color: '#94A3B8' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: '#EF4444' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
