// ============================================================
// Investments/index.jsx — Portfolio tracking with P&L
// Sections: Entry form, Portfolio summary cards,
//           Asset allocation pie, Holdings heatmap,
//           Holdings table, Performance bar chart
// ============================================================

import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  Plus, ChevronUp, ChevronDown, Pencil, Trash2,
  X, RotateCcw,
} from 'lucide-react';

import { generateId } from '../../utils/storage';
import {
  calculatePortfolioValue, calculateCostBasis,
  calculateTotalPnL, calculatePnL, calculatePnLPercent,
  getAssetAllocation,
} from '../../utils/calculations';
import {
  formatCurrency, formatPercent, formatCurrencySigned,
  formatPercentSigned, getAmountColour, getPnLBgColour,
} from '../../utils/formatters';
import { formatDate, todayISO, isFutureDate } from '../../utils/dateHelpers';

// ── Constants ─────────────────────────────────────────────────
const INV_TYPES   = ['Stock', 'Crypto', 'ETF', 'Bond', 'Mutual Fund', 'Other'];
const PIE_COLOURS = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#64748B'];
const EMPTY_FORM  = {
  date: todayISO(), type: '', symbol: '',
  quantity: '', purchasePrice: '', currentPrice: '', notes: '',
};

// ── Reusable components (same pattern as Income) ──────────────
function Toast({ message, type = 'success', onClose }) {
  const bg = type === 'success' ? '#10B981' : '#EF4444';
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium"
         style={{ backgroundColor: bg, minWidth: 260 }}>
      {message}
      <button onClick={onClose} className="ml-auto opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

function StatCard({ label, value, sub, subColour }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
      <p className="text-xs mb-1" style={{ color: '#64748B' }}>{label}</p>
      <p className="text-xl font-bold font-mono" style={{ color: '#F1F5F9' }}>{value}</p>
      {sub && <p className="text-xs mt-1 font-medium" style={{ color: subColour || '#94A3B8' }}>{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-sm shadow-xl"
         style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
      <p className="font-semibold mb-1" style={{ color: '#F1F5F9' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#06B6D4' }}>
          {p.name}: {typeof p.value === 'number' && Math.abs(p.value) > 1
            ? formatCurrency(p.value, currency)
            : `${p.value?.toFixed?.(2)}%`}
        </p>
      ))}
    </div>
  );
}

// ── Holdings heatmap — each holding as coloured box ───────────
function HoldingsHeatmap({ investments, currency }) {
  const total = calculatePortfolioValue(investments);
  if (!total || investments.length === 0) return null;

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
      <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Holdings Heatmap</h3>
      <div className="flex flex-wrap gap-2">
        {investments
          .map(inv => ({
            ...inv,
            currentValue: Number(inv.quantity) * Number(inv.currentPrice),
            pnlPct: calculatePnLPercent(inv),
          }))
          .sort((a, b) => b.currentValue - a.currentValue)
          .map(inv => {
            const pct      = (inv.currentValue / total) * 100;
            const pnl      = inv.pnlPct;
            const bgColour = pnl > 5  ? '#10B981' :
                             pnl > 0  ? '#059669' :
                             pnl < -5 ? '#DC2626' :
                             pnl < 0  ? '#EF4444' : '#475569';
            // Size proportional to portfolio weight, min 60px
            const size = Math.max(60, Math.round(pct * 8));
            return (
              <div
                key={inv.id}
                title={`${inv.symbol}: ${formatCurrency(inv.currentValue, currency)} | P&L: ${formatPercentSigned(pnl)}`}
                className="rounded-lg flex flex-col items-center justify-center text-white cursor-default transition-transform hover:scale-105"
                style={{
                  backgroundColor: bgColour,
                  width: size, height: size,
                  opacity: 0.85 + (pct / 100) * 0.15,
                }}
              >
                <span className="font-bold text-xs">{inv.symbol}</span>
                <span className="text-xs opacity-90">{formatPercentSigned(pnl)}</span>
              </div>
            );
          })}
      </div>
      <p className="text-xs mt-3" style={{ color: '#475569' }}>
        Box size = portfolio weight · Colour = P&L (green = gain, red = loss)
      </p>
    </div>
  );
}

// ── Main Investments component ────────────────────────────────
export default function Investments({ data, setInvestments }) {
  const { investments, settings } = data;
  const currency   = settings?.currency   || 'AUD';
  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';

  // Form state
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editId,   setEditId]   = useState(null);
  const [formOpen, setFormOpen] = useState(true);
  const [errors,   setErrors]   = useState({});
  const [toast,    setToast]    = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Filter/sort state
  const [filterType,  setFilterType]  = useState('All');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [sortCol,     setSortCol]     = useState('currentValue');
  const [sortDir,     setSortDir]     = useState('desc');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Validation ──────────────────────────────────────────────
  const validate = (f = form) => {
    const e = {};
    if (!f.date)                                    e.date          = 'Date is required';
    if (isFutureDate(f.date))                       e.date          = 'Date cannot be in the future';
    if (!f.type)                                    e.type          = 'Type is required';
    if (!f.symbol || f.symbol.trim().length === 0)  e.symbol        = 'Symbol is required';
    if (f.symbol && /\s/.test(f.symbol))            e.symbol        = 'No spaces allowed';
    if (!f.quantity || Number(f.quantity) <= 0)     e.quantity      = 'Quantity must be > 0';
    if (!f.purchasePrice || Number(f.purchasePrice) <= 0) e.purchasePrice = 'Purchase price must be > 0';
    if (!f.currentPrice  || Number(f.currentPrice)  <= 0) e.currentPrice  = 'Current price must be > 0';
    return e;
  };

  const isValid = Object.keys(validate()).length === 0;

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: field === 'symbol' ? value.toUpperCase() : value };
    setForm(updated);
    const e = validate(updated);
    setErrors(prev => ({ ...prev, [field]: e[field] }));
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const now = new Date().toISOString();
    if (editId) {
      setInvestments(investments.map(i =>
        i.id === editId
          ? { ...i, ...form, quantity: Number(form.quantity), purchasePrice: Number(form.purchasePrice), currentPrice: Number(form.currentPrice), updatedAt: now }
          : i
      ));
      showToast('✓ Investment updated successfully');
      setEditId(null);
    } else {
      setInvestments([...investments, {
        id: generateId('inv'), ...form,
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        currentPrice:  Number(form.currentPrice),
        createdAt: now, updatedAt: now,
      }]);
      showToast('✓ Investment added successfully');
    }
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleEdit = (inv) => {
    setForm({
      date: inv.date, type: inv.type, symbol: inv.symbol,
      quantity: String(inv.quantity), purchasePrice: String(inv.purchasePrice),
      currentPrice: String(inv.currentPrice), notes: inv.notes || '',
    });
    setEditId(inv.id);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setInvestments(investments.filter(i => i.id !== id));
    setDeleteId(null);
    showToast('Investment removed', 'error');
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  // ── Computed values ─────────────────────────────────────────
  const portfolioValue = calculatePortfolioValue(investments);
  const costBasis      = calculateCostBasis(investments);
  const totalPnL       = calculateTotalPnL(investments);
  const totalPnLPct    = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0;

  const allocation = useMemo(() => getAssetAllocation(investments), [investments]);

  const filteredAndSorted = useMemo(() => {
    return investments
      .filter(inv => {
        if (filterType !== 'All' && inv.type !== filterType) return false;
        if (filterSymbol && !inv.symbol.toLowerCase().includes(filterSymbol.toLowerCase())) return false;
        return true;
      })
      .map(inv => ({
        ...inv,
        currentValue: Number(inv.quantity) * Number(inv.currentPrice),
        pnlDollar:    calculatePnL(inv),
        pnlPercent:   calculatePnLPercent(inv),
      }))
      .sort((a, b) => {
        const va = a[sortCol] ?? 0, vb = b[sortCol] ?? 0;
        if (va < vb) return sortDir === 'asc' ? -1 :  1;
        if (va > vb) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });
  }, [investments, filterType, filterSymbol, sortCol, sortDir]);

  const perfData = useMemo(() =>
    [...filteredAndSorted]
      .sort((a, b) => b.pnlPercent - a.pnlPercent)
      .map(inv => ({ symbol: inv.symbol, pnl: Math.round(inv.pnlPercent * 10) / 10 })),
  [filteredAndSorted]);

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronUp size={12} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={12} color="#06B6D4" /> : <ChevronDown size={12} color="#06B6D4" />;
  };

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>Investments</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>Track your portfolio P&L and allocation</p>
      </div>

      {/* ── Entry form ───────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
        <button onClick={() => setFormOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                style={{ borderBottom: formOpen ? '1px solid #334155' : 'none' }}>
          <span className="font-semibold" style={{ color: '#F1F5F9' }}>
            {editId ? '✏️ Edit Investment' : '+ Add Investment'}
          </span>
          {formOpen ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
        </button>

        {formOpen && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date */}
              <Field label="Date" required error={errors.date}>
                <input type="date" value={form.date} max={todayISO()}
                  onChange={e => handleChange('date', e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.date ? '#EF4444' : '#334155' }} />
              </Field>

              {/* Type */}
              <Field label="Type" required error={errors.type}>
                <select value={form.type} onChange={e => handleChange('type', e.target.value)}
                        style={{ ...inputStyle, borderColor: errors.type ? '#EF4444' : '#334155', color: form.type ? '#F1F5F9' : '#64748B' }}>
                  <option value="">Select type…</option>
                  {INV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              {/* Symbol */}
              <Field label="Symbol (e.g. AAPL, BTC)" required error={errors.symbol}>
                <input type="text" placeholder="AAPL" maxLength={10}
                  value={form.symbol} onChange={e => handleChange('symbol', e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.symbol ? '#EF4444' : '#334155' }} />
              </Field>

              {/* Quantity */}
              <Field label="Quantity" required error={errors.quantity}>
                <input type="number" min="0.000001" step="any" placeholder="0"
                  value={form.quantity} onChange={e => handleChange('quantity', e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.quantity ? '#EF4444' : '#334155' }} />
              </Field>

              {/* Purchase Price */}
              <Field label={`Purchase Price (${currency})`} required error={errors.purchasePrice}>
                <input type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={form.purchasePrice} onChange={e => handleChange('purchasePrice', e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.purchasePrice ? '#EF4444' : '#334155' }} />
              </Field>

              {/* Current Price */}
              <Field label={`Current Price (${currency})`} required error={errors.currentPrice}>
                <input type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={form.currentPrice} onChange={e => handleChange('currentPrice', e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.currentPrice ? '#EF4444' : '#334155' }} />
              </Field>

              {/* Notes — full width */}
              <div className="md:col-span-3">
                <Field label="Notes (optional)" error={errors.notes}>
                  <input type="text" placeholder="e.g. Long-term hold, part of dividend portfolio"
                    maxLength={255} value={form.notes} onChange={e => handleChange('notes', e.target.value)}
                    style={{ ...inputStyle, borderColor: '#334155' }} />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <button onClick={handleSubmit} disabled={!isValid}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: isValid ? '#06B6D4' : '#334155', color: isValid ? '#fff' : '#64748B', cursor: isValid ? 'pointer' : 'not-allowed' }}>
                <Plus size={16} />{editId ? 'Update Investment' : 'Add Investment'}
              </button>
              {editId && (
                <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setErrors({}); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm"
                        style={{ border: '1px solid #334155', color: '#94A3B8' }}>
                  <X size={16} /> Cancel Edit
                </button>
              )}
              <button onClick={() => { setForm(EMPTY_FORM); setErrors({}); }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm"
                      style={{ border: '1px solid #334155', color: '#94A3B8' }}>
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Portfolio summary cards ───────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Portfolio Value"  value={formatCurrency(portfolioValue, currency)} />
        <StatCard
          label="Unrealised P&L"
          value={formatCurrencySigned(totalPnL, currency)}
          sub={formatPercentSigned(totalPnLPct)}
          subColour={totalPnL >= 0 ? '#10B981' : '#EF4444'}
        />
        <StatCard label="Cost Basis"       value={formatCurrency(costBasis, currency)} sub="Total invested" />
        <StatCard label="Holdings"         value={`${investments.length}`} sub="unique positions" />
      </div>

      {/* ── Charts ───────────────────────────────────────── */}
      {investments.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Asset Allocation Pie */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
              <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Asset Allocation</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={allocation} cx="50%" cy="50%" outerRadius={80}
                       dataKey="amount" nameKey="type"
                       label={({ type, percentage }) => `${type} ${percentage}%`}
                       labelLine={false}>
                    {allocation.map((_, i) => <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v, currency)}
                           contentStyle={{ backgroundColor: '#1E2139', border: '1px solid #334155', borderRadius: 8 }}
                           labelStyle={{ color: '#F1F5F9' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Bar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
              <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Performance (P&L %)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={perfData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="symbol" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false}
                         tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={v => `${v}%`}
                           contentStyle={{ backgroundColor: '#1E2139', border: '1px solid #334155', borderRadius: 8 }} />
                  <Bar dataKey="pnl" name="P&L %" radius={[4, 4, 0, 0]}
                       fill="#10B981"
                       label={false}>
                    {perfData.map((d, i) => (
                      <Cell key={i} fill={d.pnl >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Holdings Heatmap */}
          <HoldingsHeatmap investments={investments} currency={currency} />
        </>
      )}

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-36">
            <label className="block text-xs mb-1" style={{ color: '#64748B' }}>Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ ...inputStyle, borderColor: '#334155' }}>
              <option value="All">All Types</option>
              {INV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs mb-1" style={{ color: '#64748B' }}>Search Symbol</label>
            <input type="text" placeholder="AAPL…" value={filterSymbol}
              onChange={e => setFilterSymbol(e.target.value)}
              style={{ ...inputStyle, borderColor: '#334155' }} />
          </div>
          <button onClick={() => { setFilterType('All'); setFilterSymbol(''); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid #334155', color: '#94A3B8' }}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* ── Holdings table ───────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #334155' }}>
          <h3 className="font-semibold" style={{ color: '#F1F5F9' }}>Holdings</h3>
          <span className="text-sm" style={{ color: '#64748B' }}>{filteredAndSorted.length} positions</span>
        </div>

        {investments.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#64748B' }}>
            No investments yet. Add your first position above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#334155' }}>
                  {[
                    { key: 'symbol',        label: 'Symbol'       },
                    { key: 'type',          label: 'Type'         },
                    { key: 'quantity',      label: 'Qty'          },
                    { key: 'purchasePrice', label: 'Buy Price'    },
                    { key: 'currentPrice',  label: 'Now'          },
                    { key: 'currentValue',  label: 'Value'        },
                    { key: 'pnlDollar',     label: 'P&L $'        },
                    { key: 'pnlPercent',    label: 'P&L %'        },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        style={{ color: '#94A3B8' }}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: '#94A3B8' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Totals row */}
                <tr style={{ backgroundColor: '#0F172A', borderTop: '1px solid #334155' }}>
                  <td colSpan={5} className="px-4 py-2 text-xs font-semibold" style={{ color: '#64748B' }}>TOTAL</td>
                  <td className="px-4 py-2 font-mono font-bold text-sm" style={{ color: '#F1F5F9' }}>{formatCurrency(portfolioValue, currency)}</td>
                  <td className="px-4 py-2 font-mono font-bold text-sm" style={{ color: totalPnL >= 0 ? '#10B981' : '#EF4444' }}>{formatCurrencySigned(totalPnL, currency)}</td>
                  <td className="px-4 py-2 font-mono font-bold text-sm" style={{ color: totalPnLPct >= 0 ? '#10B981' : '#EF4444' }}>{formatPercentSigned(totalPnLPct)}</td>
                  <td />
                </tr>
                {filteredAndSorted.map((inv, i) => (
                  <tr key={inv.id}
                      style={{ borderTop: '1px solid #334155', backgroundColor: i % 2 === 0 ? 'transparent' : '#1a1f36' }}>
                    <td className="px-4 py-3 font-bold font-mono" style={{ color: '#06B6D4' }}>{inv.symbol}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: '#06B6D420', color: '#06B6D4' }}>
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#CBD5E1' }}>{Number(inv.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#CBD5E1' }}>{formatCurrency(inv.purchasePrice, currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#F1F5F9' }}>{formatCurrency(inv.currentPrice, currency)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-sm" style={{ color: '#F1F5F9' }}>{formatCurrency(inv.currentValue, currency)}</td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: inv.pnlDollar >= 0 ? '#10B981' : '#EF4444' }}>
                      {formatCurrencySigned(inv.pnlDollar, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPnLBgColour(inv.pnlPercent)}`}>
                        {formatPercentSigned(inv.pnlPercent)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(inv)}
                                className="p-1.5 rounded-lg hover:bg-cyan-500/20" title="Edit">
                          <Pencil size={14} color="#06B6D4" />
                        </button>
                        <button onClick={() => setDeleteId(inv.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20" title="Delete">
                          <Trash2 size={14} color="#EF4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Delete modal ─────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
               style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
            <h3 className="font-semibold text-lg mb-2" style={{ color: '#F1F5F9' }}>Remove holding?</h3>
            <p className="text-sm mb-5" style={{ color: '#94A3B8' }}>This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm"
                      style={{ border: '1px solid #334155', color: '#94A3B8' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: '#EF4444' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared form field wrapper ─────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: '#94A3B8' }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  );
}

// ── Shared input style object ─────────────────────────────────
const inputStyle = {
  width: '100%', display: 'block',
  backgroundColor: '#0F172A',
  border: '1px solid #334155',
  color: '#F1F5F9',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
};
