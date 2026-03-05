// ============================================================
// Income/index.jsx — Income tracking, v2 (redesigned)
// New: incomeFrom + recipient fields, collapsible form,
//      professional table, improved charts
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Trash2, Edit2, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Plus } from 'lucide-react';

import { generateId } from '../../utils/storage';
import { getIncomeStats, getMonthlyTrend, filterCurrentMonth } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import { formatDate, todayISO, isFutureDate } from '../../utils/dateHelpers';

// ── Constants ──────────────────────────────────────────────
const SOURCES     = ['Salary', 'Bonus', 'Freelance', 'Investment Returns', 'Rental Income', 'Other'];
const INCOME_FROM = ['Main Job', 'Side Hustle', 'Partner', 'Other'];
const RECIPIENTS  = ['Me', 'Partner', 'Shared'];
const PAGE_SIZE   = 20;

const CHART_COLOURS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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

// ── Field wrapper ──────────────────────────────────────────
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

// ── Toast ──────────────────────────────────────────────────
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

// ── Recharts tooltip ───────────────────────────────────────
function ChartTip({ active, payload, label, currency = 'AUD' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: '#1A2332', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#CBD5E1', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12 }}>{p.name}: {formatCurrency(p.value, currency)}</p>
      ))}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div style={{ ...CARD, padding: '20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#CBD5E1', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: '#F1F5F9' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Icon button ────────────────────────────────────────────
function IconBtn({ onClick, title, icon: Icon, colour = '#94A3B8', hoverBg = '#334155' }) {
  return (
    <button onClick={onClick} title={title}
            style={{ width: 30, height: 30, borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = hoverBg}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
      <Icon size={13} color={colour} />
    </button>
  );
}

// ── Main Income component ──────────────────────────────────
export default function Income({ data, setIncome }) {
  const { income, settings } = data;
  const currency   = settings?.currency   || 'AUD';
  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';

  // ── Form state ──────────────────────────────────────────
  const blank = { date: todayISO(), source: '', incomeFrom: '', recipient: '', amount: '', notes: '' };
  const [form,     setForm]     = useState(blank);
  const [errors,   setErrors]   = useState({});
  const [editId,   setEditId]   = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toast,    setToast]    = useState({ message: '', type: 'success' });
  const [deleteId, setDeleteId] = useState(null);

  // ── Filter / sort / paginate ────────────────────────────
  const [fSource,   setFSource]   = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo,   setFDateTo]   = useState('');
  const [sortKey,   setSortKey]   = useState('date');
  const [sortDir,   setSortDir]   = useState('desc');
  const [page,      setPage]      = useState(1);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }, []);

  function validate() {
    const e = {};
    if (!form.date)                              e.date   = 'Date is required';
    if (isFutureDate(form.date))                 e.date   = 'Date cannot be in the future';
    if (!form.source)                            e.source = 'Source is required';
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
    return e;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (editId) {
      setIncome(income.map(i => i.id === editId ? { ...i, ...form, amount: Number(form.amount) } : i));
      showToast('Income updated ✓');
    } else {
      setIncome([...income, { ...form, amount: Number(form.amount), id: generateId('inc') }]);
      showToast('Income added ✓');
    }
    setForm(blank); setErrors({}); setEditId(null); setFormOpen(false);
  }

  function handleEdit(entry) {
    setForm({
      date: entry.date, source: entry.source, incomeFrom: entry.incomeFrom || '',
      recipient: entry.recipient || '', amount: String(entry.amount), notes: entry.notes || '',
    });
    setEditId(entry.id); setErrors({}); setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    setIncome(income.filter(i => i.id !== id));
    setDeleteId(null); showToast('Entry deleted', 'error');
  }

  function cancelForm() {
    setForm(blank); setEditId(null); setErrors({}); setFormOpen(false);
  }

  // ── Computed ────────────────────────────────────────────
  const stats     = getIncomeStats(income);
  const trend     = getMonthlyTrend(income, [], 12);
  const thisMonth = filterCurrentMonth(income).reduce((s, i) => s + Number(i.amount), 0);
  const thisYear  = income.filter(i => new Date(i.date).getFullYear() === new Date().getFullYear())
    .reduce((s, i) => s + Number(i.amount), 0);

  const pieData = useMemo(() => {
    const g = {};
    income.forEach(i => { g[i.source] = (g[i.source] || 0) + Number(i.amount); });
    return Object.entries(g).map(([name, value]) => ({ name, value }));
  }, [income]);

  const filtered = useMemo(() => {
    let rows = [...income];
    if (fSource)   rows = rows.filter(i => i.source === fSource);
    if (fDateFrom) rows = rows.filter(i => i.date >= fDateFrom);
    if (fDateTo)   rows = rows.filter(i => i.date <= fDateTo);
    rows.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'amount') { va = Number(va); vb = Number(vb); }
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return rows;
  }, [income, fSource, fDateFrom, fDateTo, sortKey, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredSum = filtered.reduce((s, i) => s + Number(i.amount), 0);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }
  const si = k => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', margin: 0 }}>INCOME</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>
          This Month: <strong style={{ color: '#10B981' }}>{formatCurrency(thisMonth, currency)}</strong>
          {' | '}
          This Year: <strong style={{ color: '#10B981' }}>{formatCurrency(thisYear, currency)}</strong>
        </p>
      </div>

      {/* ── Collapsible form ────────────────────────────── */}
      <div style={CARD}>
        <button
          onClick={() => { if (editId) { cancelForm(); } else { setFormOpen(o => !o); } }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          }}
          aria-expanded={formOpen}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#06B6D420', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={14} color="#06B6D4" />
            </div>
            <span style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700 }}>
              {editId ? '✏️ EDIT INCOME ENTRY' : '+ ADD INCOME ENTRY'}
            </span>
          </div>
          {formOpen ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
        </button>

        <div style={{
          maxHeight: formOpen ? '700px' : '0',
          overflow: 'hidden',
          opacity: formOpen ? 1 : 0,
          transition: 'max-height 0.3s ease, opacity 0.25s ease',
        }}>
          <div style={{ borderTop: '1px solid #334155', padding: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
                <Field label="Date" required error={errors.date}>
                  <input type="date" value={form.date} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </Field>
                <Field label="Source" required error={errors.source}>
                  <select value={form.source} style={INPUT}
                          onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    <option value="">Select source…</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Amount (AUD)" required error={errors.amount}>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                         value={form.amount} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </Field>
                <Field label="Income From">
                  <select value={form.incomeFrom} style={INPUT}
                          onChange={e => setForm(f => ({ ...f, incomeFrom: e.target.value }))}>
                    <option value="">Select…</option>
                    {INCOME_FROM.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Recipient">
                  <select value={form.recipient} style={INPUT}
                          onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}>
                    <option value="">Select…</option>
                    {RECIPIENTS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Notes (optional)">
                  <input type="text" placeholder="Any notes…" value={form.notes} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit"
                        style={{ height: 44, padding: '0 24px', backgroundColor: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {editId ? 'Update Entry' : '+ Add Income'}
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

      {/* ── Stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
        <StatCard label="This Month"    value={formatCurrency(stats.thisMonth, currency)} />
        <StatCard label="This Year"     value={formatCurrency(stats.thisYear,  currency)} />
        <StatCard label="Monthly Avg"   value={formatCurrency(stats.average,   currency)} />
        <StatCard label="Highest Entry" value={formatCurrency(stats.highest,   currency)} sub={stats.highestSource} />
      </div>

      {/* ── Charts ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>
        {/* Pie */}
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>INCOME BY SOURCE</h3>
          </div>
          {pieData.length === 0 ? (
            <p style={{ color: '#64748B', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>📭 No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                     dataKey="value" nameKey="name"
                     label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                     labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v, currency)} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Bar */}
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>MONTHLY INCOME (12 months)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false}
                     tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTip currency={currency} />} />
              <Bar dataKey="income" name="Income" fill="#10B981" radius={[3,3,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div style={{ ...CARD, padding: '20px' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Entries</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 12 }}>
          <div>
            <label style={LABEL}>Source</label>
            <select value={fSource} style={INPUT}
                    onChange={e => { setFSource(e.target.value); setPage(1); }}>
              <option value="">All Sources</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ color: '#64748B', fontSize: 12 }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} — {formatCurrency(filteredSum, currency)}
          </span>
          <button onClick={() => { setFSource(''); setFDateFrom(''); setFDateTo(''); setPage(1); }}
                  style={{ height: 32, padding: '0 14px', border: '1px solid #334155', borderRadius: 6, backgroundColor: 'transparent', color: '#94A3B8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Reset
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div style={{ ...CARD, padding: '20px' }}>
        <h3 style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          All Income Entries
        </h3>

        {income.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: 14 }}>
            📭 No income entries yet. Add your first using the form above.
          </div>
        ) : (
          <>
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#334155' }}>
                    {[
                      { key: 'date', label: 'Date' }, { key: 'source', label: 'Source' },
                      { key: 'incomeFrom', label: 'From' }, { key: 'recipient', label: 'Recipient' },
                      { key: 'amount', label: 'Amount' },
                    ].map(col => (
                      <th key={col.key} onClick={() => toggleSort(col.key)}
                          style={{
                            padding: '10px 12px', textAlign: col.key === 'amount' ? 'right' : 'left',
                            color: '#F1F5F9', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
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
                  {paginated.map((entry, i) => (
                    <tr key={entry.id || i}
                        style={{ backgroundColor: i % 2 === 0 ? '#1E2139' : '#1A2336', borderBottom: '1px solid #1E293B' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1F2437'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#1E2139' : '#1A2336'}>
                      <td style={{ padding: '12px', color: '#94A3B8', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {formatDate(entry.date, dateFormat)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ backgroundColor: '#10B98120', color: '#10B981', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                          {entry.source}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#94A3B8', fontSize: 13 }}>{entry.incomeFrom || '—'}</td>
                      <td style={{ padding: '12px', color: '#94A3B8', fontSize: 13 }}>{entry.recipient || '—'}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#10B981', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
                        +{formatCurrency(entry.amount, currency)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <IconBtn onClick={() => handleEdit(entry)} title="Edit" icon={Edit2} />
                          <IconBtn onClick={() => setDeleteId(entry.id)} title="Delete" icon={Trash2} colour="#EF4444" hoverBg="#EF444420" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {paginated.map((entry, i) => (
                <div key={entry.id || i} style={{ backgroundColor: '#0F172A', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ backgroundColor: '#10B98120', color: '#10B981', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                      {entry.source}
                    </span>
                    <span style={{ color: '#10B981', fontFamily: 'monospace', fontWeight: 700 }}>
                      +{formatCurrency(entry.amount, currency)}
                    </span>
                  </div>
                  <p style={{ color: '#64748B', fontSize: 12, margin: '4px 0' }}>{formatDate(entry.date, dateFormat)}</p>
                  {entry.incomeFrom && <p style={{ color: '#94A3B8', fontSize: 12 }}>{entry.incomeFrom} → {entry.recipient || '—'}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => handleEdit(entry)}
                            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#334155', color: '#94A3B8', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => setDeleteId(entry.id)}
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
                    { l: 'Next', f: () => setPage(p => Math.min(totalPages, p + 1)), d: page === totalPages }].map(b => (
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

      {/* ── Delete modal ─────────────────────────────────── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...CARD, width: 360, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#F1F5F9', margin: 0, fontSize: 16, fontWeight: 700 }}>Delete Entry?</h3>
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
