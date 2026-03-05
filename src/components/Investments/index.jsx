// ============================================================
// Investments/index.jsx — Portfolio tracking v2
// Features: Holdings table (grouped by symbol) → Tranches modal
//           (edit/delete/close units per tranche),
//           Closed positions toggle, Asset allocation pie,
//           P&L bar chart, Holdings heatmap, Collapsible form
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Trash2, Edit2, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Plus, TrendingUp, TrendingDown } from 'lucide-react';

import { generateId } from '../../utils/storage';
import {
  calculatePortfolioValue, calculateCostBasis, calculateTotalPnL,
  calculateRealizedPnL, getAssetAllocation, activeInvestments,
} from '../../utils/calculations';
import { formatCurrency, formatCurrencySigned, formatPercent } from '../../utils/formatters';
import { formatDate, todayISO } from '../../utils/dateHelpers';

// ── Constants ──────────────────────────────────────────────
const TYPES = ['Stock', 'Crypto', 'ETF', 'Bond', 'Mutual Fund', 'Other'];
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

// ── Reusable field ─────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label style={LABEL}>{label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}</label>
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
function ChartTip({ active, payload, label, currency = 'AUD', isPct = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: '#1A2332', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#CBD5E1', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#06B6D4', fontSize: 12 }}>
          {p.name}: {isPct ? `${p.value.toFixed(2)}%` : formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({ label, value, sub, subColour }) {
  return (
    <div style={{ ...CARD, padding: '20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#CBD5E1', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: '#F1F5F9' }}>
        {value}
      </div>
      {sub !== undefined && (
        <div style={{ fontSize: 12, color: subColour || '#64748B', marginTop: 4, fontWeight: 600 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Tranches modal ─────────────────────────────────────────
// Shows all tranches for a single symbol.
// Each tranche: View → Edit → Delete → Close Units (opens mini-form)
function TranchesModal({ symbol, tranches, currency, dateFormat, onClose, onEdit, onDelete, onPartialClose }) {
  const [closeForm, setCloseForm] = useState(null); // { trancheId, maxQty }
  const [closeData, setCloseData] = useState({ qty: '', soldPrice: '', soldDate: todayISO() });
  const [closeErr,  setCloseErr]  = useState({});

  function openCloseForm(tranche) {
    setCloseForm({ trancheId: tranche.id, maxQty: Number(tranche.quantity) });
    setCloseData({ qty: '', soldPrice: '', soldDate: todayISO() });
    setCloseErr({});
  }

  function submitClose() {
    const errs = {};
    const qty = Number(closeData.qty);
    const sp  = Number(closeData.soldPrice);
    if (!qty || qty <= 0)                      errs.qty = 'Enter units > 0';
    if (qty > closeForm.maxQty)                errs.qty = `Max ${closeForm.maxQty} units`;
    if (!sp || sp <= 0)                        errs.soldPrice = 'Enter sold price > 0';
    if (!closeData.soldDate)                   errs.soldDate = 'Required';
    if (Object.keys(errs).length) { setCloseErr(errs); return; }
    onPartialClose(closeForm.trancheId, qty, sp, closeData.soldDate);
    setCloseForm(null);
  }

  const totalValue = tranches.reduce((s, t) => s + Number(t.quantity) * Number(t.currentPrice), 0);
  const totalCost  = tranches.reduce((s, t) => s + Number(t.quantity) * Number(t.purchasePrice), 0);
  const totalPnL   = totalValue - totalCost;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ ...CARD, width: '100%', maxWidth: 760, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Modal header */}
        <div style={{ ...HDR, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: '#F1F5F9', margin: 0, fontSize: 17, fontWeight: 800 }}>
              📈 {symbol} — Tranches
            </h2>
            <p style={{ color: '#475569', fontSize: 12, margin: '2px 0 0' }}>
              {tranches.length} open lot{tranches.length !== 1 ? 's' : ''} &bull;
              Value {formatCurrency(totalValue, currency)} &bull;
              <span style={{ color: totalPnL >= 0 ? '#10B981' : '#EF4444' }}>
                {' '}{formatCurrencySigned(totalPnL, currency)} unrealised
              </span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {/* Tranches list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr style={{ backgroundColor: '#334155' }}>
                {['Date', 'Qty', 'Buy Price', 'Current Price', 'Cost Basis', 'Current Value', 'P&L', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: '#F1F5F9', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'P&L' || h === 'Current Value' || h === 'Cost Basis' ? 'right' : 'left', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tranches.map((t, i) => {
                const pnl    = (Number(t.currentPrice) - Number(t.purchasePrice)) * Number(t.quantity);
                const pnlPct = Number(t.purchasePrice) > 0
                  ? ((Number(t.currentPrice) - Number(t.purchasePrice)) / Number(t.purchasePrice)) * 100
                  : 0;
                const pnlCol = pnl >= 0 ? '#10B981' : '#EF4444';
                return (
                  <tr key={t.id || i}
                      style={{ backgroundColor: i % 2 === 0 ? '#1E2139' : '#1A2336', borderBottom: '1px solid #1E293B' }}>
                    <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: 12, fontFamily: 'monospace' }}>
                      {formatDate(t.date, dateFormat)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>
                      {Number(t.quantity).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#CBD5E1', fontSize: 13, fontFamily: 'monospace' }}>
                      {formatCurrency(t.purchasePrice, currency)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#CBD5E1', fontSize: 13, fontFamily: 'monospace' }}>
                      {formatCurrency(t.currentPrice, currency)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: 12, fontFamily: 'monospace', textAlign: 'right' }}>
                      {formatCurrency(Number(t.quantity) * Number(t.purchasePrice), currency)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#F1F5F9', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, textAlign: 'right' }}>
                      {formatCurrency(Number(t.quantity) * Number(t.currentPrice), currency)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ color: pnlCol, fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                        {formatCurrencySigned(pnl, currency)}
                      </span>
                      <br />
                      <span style={{ color: pnlCol, fontSize: 11 }}>
                        {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button onClick={() => { onEdit(t); onClose(); }} title="Edit"
                                style={{ padding: '4px 8px', borderRadius: 5, border: 'none', backgroundColor: '#334155', color: '#94A3B8', fontSize: 11, cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => onDelete(t.id)} title="Delete"
                                style={{ padding: '4px 8px', borderRadius: 5, border: 'none', backgroundColor: '#EF444420', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>
                          Del
                        </button>
                        <button onClick={() => openCloseForm(t)} title="Close some or all units"
                                style={{ padding: '4px 8px', borderRadius: 5, border: 'none', backgroundColor: '#F59E0B20', color: '#F59E0B', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Close Units
                        </button>
                      </div>

                      {/* Inline Close Units mini-form */}
                      {closeForm?.trancheId === t.id && (
                        <div style={{ marginTop: 8, padding: '10px', backgroundColor: '#0F172A', borderRadius: 8, border: '1px solid #F59E0B40', minWidth: 220 }}>
                          <p style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                            Close up to {closeForm.maxQty} units
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div>
                              <label style={{ ...LABEL, fontSize: 10 }}>Units to sell *</label>
                              <input type="number" min="0.0001" max={closeForm.maxQty} step="0.0001"
                                     placeholder={`Max ${closeForm.maxQty}`}
                                     value={closeData.qty}
                                     style={{ ...INPUT, padding: '6px 8px', fontSize: 12 }}
                                     onChange={e => setCloseData(d => ({ ...d, qty: e.target.value }))} />
                              {closeErr.qty && <p style={{ color: '#EF4444', fontSize: 10, marginTop: 2 }}>{closeErr.qty}</p>}
                            </div>
                            <div>
                              <label style={{ ...LABEL, fontSize: 10 }}>Sold price/unit *</label>
                              <input type="number" min="0" step="0.0001" placeholder="0.00"
                                     value={closeData.soldPrice}
                                     style={{ ...INPUT, padding: '6px 8px', fontSize: 12 }}
                                     onChange={e => setCloseData(d => ({ ...d, soldPrice: e.target.value }))} />
                              {closeErr.soldPrice && <p style={{ color: '#EF4444', fontSize: 10, marginTop: 2 }}>{closeErr.soldPrice}</p>}
                            </div>
                            <div>
                              <label style={{ ...LABEL, fontSize: 10 }}>Sold date *</label>
                              <input type="date" value={closeData.soldDate}
                                     style={{ ...INPUT, padding: '6px 8px', fontSize: 12 }}
                                     onChange={e => setCloseData(d => ({ ...d, soldDate: e.target.value }))} />
                              {closeErr.soldDate && <p style={{ color: '#EF4444', fontSize: 10, marginTop: 2 }}>{closeErr.soldDate}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={submitClose}
                                      style={{ flex: 1, height: 32, backgroundColor: '#F59E0B', color: '#000', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                Confirm Close
                              </button>
                              <button onClick={() => setCloseForm(null)}
                                      style={{ height: 32, padding: '0 10px', backgroundColor: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals footer */}
            <tfoot>
              <tr style={{ backgroundColor: '#0F172A', borderTop: '2px solid #334155' }}>
                <td colSpan={4} style={{ padding: '10px 12px', color: '#CBD5E1', fontSize: 12, fontWeight: 700 }}>TOTAL</td>
                <td style={{ padding: '10px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700 }}>
                  {formatCurrency(totalCost, currency)}
                </td>
                <td style={{ padding: '10px 12px', color: '#F1F5F9', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 800 }}>
                  {formatCurrency(totalValue, currency)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <span style={{ color: totalPnL >= 0 ? '#10B981' : '#EF4444', fontFamily: 'monospace', fontWeight: 800, fontSize: 13 }}>
                    {formatCurrencySigned(totalPnL, currency)}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Modal footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #334155', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
                  style={{ height: 40, padding: '0 20px', backgroundColor: '#334155', color: '#CBD5E1', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Investments component ─────────────────────────────
export default function Investments({ data, setInvestments }) {
  const { investments, settings } = data;
  const currency   = settings?.currency   || 'AUD';
  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';

  // ── Form state ─────────────────────────────────────────
  const blank = { date: todayISO(), type: '', symbol: '', quantity: '', purchasePrice: '', currentPrice: '', notes: '' };
  const [form,      setForm]      = useState(blank);
  const [errors,    setErrors]    = useState({});
  const [editId,    setEditId]    = useState(null);
  const [formOpen,  setFormOpen]  = useState(false);
  const [toast,     setToast]     = useState({ message: '', type: 'success' });
  const [deleteId,  setDeleteId]  = useState(null);

  // Tranches modal
  const [trancheSymbol, setTrancheSymbol] = useState(null);

  // Closed positions toggle
  const [showClosed, setShowClosed] = useState(false);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }, []);

  // ── Validation ─────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.date)                                  e.date          = 'Required';
    if (!form.type)                                  e.type          = 'Required';
    if (!form.symbol?.trim())                        e.symbol        = 'Required';
    if (/\s/.test(form.symbol))                      e.symbol        = 'No spaces';
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity     = 'Enter qty > 0';
    if (!form.purchasePrice || Number(form.purchasePrice) <= 0) e.purchasePrice = 'Enter price > 0';
    if (!form.currentPrice || Number(form.currentPrice) <= 0)   e.currentPrice  = 'Enter price > 0';
    return e;
  }

  // ── Add / update investment ────────────────────────────
  function handleSubmit(ev) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const entry = {
      ...form,
      symbol:        form.symbol.toUpperCase().trim(),
      quantity:      Number(form.quantity),
      purchasePrice: Number(form.purchasePrice),
      currentPrice:  Number(form.currentPrice),
    };
    if (editId) {
      setInvestments(investments.map(inv => inv.id === editId ? { ...inv, ...entry } : inv));
      showToast('Investment updated ✓');
    } else {
      setInvestments([...investments, { ...entry, id: generateId('inv'), isClosed: false }]);
      showToast('Investment added ✓');
    }
    setForm(blank); setErrors({}); setEditId(null); setFormOpen(false);
  }

  function handleEdit(inv) {
    setForm({
      date: inv.date, type: inv.type, symbol: inv.symbol,
      quantity: String(inv.quantity), purchasePrice: String(inv.purchasePrice),
      currentPrice: String(inv.currentPrice), notes: inv.notes || '',
    });
    setEditId(inv.id); setErrors({}); setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    setInvestments(investments.filter(inv => inv.id !== id));
    setDeleteId(null);
    if (trancheSymbol) {
      // If we just deleted the last tranche of a symbol, close the modal
      const remaining = investments.filter(inv => inv.id !== id && inv.symbol === trancheSymbol && !inv.isClosed);
      if (remaining.length === 0) setTrancheSymbol(null);
    }
    showToast('Investment deleted', 'error');
  }

  // ── Partial close handler ──────────────────────────────
  function handlePartialClose(trancheId, qty, soldPrice, soldDate) {
    const tranche = investments.find(i => i.id === trancheId);
    if (!tranche) return;

    const totalQty = Number(tranche.quantity);

    if (qty >= totalQty) {
      // Close ALL units: mark the tranche as closed
      setInvestments(investments.map(inv =>
        inv.id === trancheId
          ? { ...inv, isClosed: true, soldDate, soldPrice: Number(soldPrice), quantity: totalQty }
          : inv
      ));
      showToast(`Closed ${totalQty} units of ${tranche.symbol} ✓`);
    } else {
      // Partial close: create a new closed record + reduce original qty
      const closedEntry = {
        ...tranche,
        id: generateId('inv'),
        quantity: qty,
        isClosed: true,
        soldDate,
        soldPrice: Number(soldPrice),
      };
      const updatedOriginal = { ...tranche, quantity: totalQty - qty };
      setInvestments(
        investments.map(inv => inv.id === trancheId ? updatedOriginal : inv)
          .concat(closedEntry)
      );
      showToast(`Closed ${qty} of ${totalQty} units of ${tranche.symbol} ✓`);
    }
    setTrancheSymbol(null);
  }

  // Reopen a closed position
  function handleReopen(id) {
    setInvestments(investments.map(inv =>
      inv.id === id ? { ...inv, isClosed: false, soldDate: undefined, soldPrice: undefined } : inv
    ));
    showToast('Position reopened');
  }

  function cancelForm() {
    setForm(blank); setEditId(null); setErrors({}); setFormOpen(false);
  }

  // ── Active / closed split ──────────────────────────────
  const active = useMemo(() => activeInvestments(investments), [investments]);
  const closed = useMemo(() => investments.filter(inv => inv.isClosed), [investments]);

  // ── Portfolio metrics ──────────────────────────────────
  const portfolioValue  = calculatePortfolioValue(investments);
  const costBasis       = calculateCostBasis(investments);
  const totalPnL        = calculateTotalPnL(investments);
  const totalPnLPct     = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0;
  const realizedPnL     = calculateRealizedPnL(investments);

  // ── Holdings: group active by symbol ──────────────────
  const holdings = useMemo(() => {
    const map = {};
    active.forEach(inv => {
      const sym = inv.symbol;
      if (!map[sym]) map[sym] = { symbol: sym, type: inv.type, tranches: [] };
      map[sym].tranches.push(inv);
    });
    return Object.values(map).map(h => {
      const qty     = h.tranches.reduce((s, t) => s + Number(t.quantity), 0);
      const cost    = h.tranches.reduce((s, t) => s + Number(t.quantity) * Number(t.purchasePrice), 0);
      const value   = h.tranches.reduce((s, t) => s + Number(t.quantity) * Number(t.currentPrice), 0);
      const pnl     = value - cost;
      const pnlPct  = cost > 0 ? (pnl / cost) * 100 : 0;
      const avgBuy  = qty > 0 ? cost / qty : 0;
      const curPri  = qty > 0 ? value / qty : 0;
      return { ...h, qty, cost, value, pnl, pnlPct, avgBuy, curPri };
    });
  }, [active]);

  // ── Chart data ─────────────────────────────────────────
  const allocationData = useMemo(() => {
    const alloc = getAssetAllocation(investments);
    return alloc.map(a => ({ name: a.type, value: a.amount }));
  }, [investments]);

  const performanceData = useMemo(() =>
    holdings.map(h => ({ symbol: h.symbol, pnlPct: Math.round(h.pnlPct * 100) / 100 }))
  , [holdings]);

  // ── Heatmap tiles ──────────────────────────────────────
  const heatTiles = useMemo(() =>
    portfolioValue > 0
      ? holdings.map(h => ({
          ...h,
          weight: portfolioValue > 0 ? (h.value / portfolioValue) * 100 : 0,
        })).sort((a, b) => b.weight - a.weight)
      : []
  , [holdings, portfolioValue]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', margin: 0 }}>INVESTMENTS</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>
          Track your portfolio P&L and allocation
        </p>
      </div>

      {/* ── Portfolio summary (4 cards) ───────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
        <StatCard label="💎 Portfolio Value"  value={formatCurrency(portfolioValue, currency)} />
        <StatCard
          label="📈 Unrealised P&L"
          value={formatCurrencySigned(totalPnL, currency)}
          sub={`${totalPnLPct >= 0 ? '+' : ''}${totalPnLPct.toFixed(2)}%`}
          subColour={totalPnL >= 0 ? '#10B981' : '#EF4444'}
        />
        <StatCard label="💰 Cost Basis"  value={formatCurrency(costBasis, currency)} sub="Total invested" />
        <StatCard label="📦 Holdings"    value={holdings.length}  sub={`${active.length} open lots`} />
      </div>

      {/* ── Add Investment form (collapsible) ─────────────── */}
      <div style={CARD}>
        <button
          onClick={() => { if (editId) cancelForm(); else setFormOpen(o => !o); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-expanded={formOpen}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#06B6D420', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={14} color="#06B6D4" />
            </div>
            <span style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700 }}>
              {editId ? '✏️ EDIT INVESTMENT' : '+ ADD INVESTMENT'}
            </span>
          </div>
          {formOpen ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
        </button>

        <div style={{ maxHeight: formOpen ? '800px' : '0', overflow: 'hidden', opacity: formOpen ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.25s ease' }}>
          <div style={{ borderTop: '1px solid #334155', padding: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
                <Field label="Date" required error={errors.date}>
                  <input type="date" value={form.date} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </Field>
                <Field label="Type" required error={errors.type}>
                  <select value={form.type} style={INPUT}
                          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="">Select type…</option>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Symbol / Name" required error={errors.symbol}>
                  <input type="text" placeholder="e.g. AAPL, BTC"
                         value={form.symbol} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Quantity" required error={errors.quantity}>
                  <input type="number" min="0" step="0.0001" placeholder="0"
                         value={form.quantity} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </Field>
                <Field label="Purchase Price (AUD)" required error={errors.purchasePrice}>
                  <input type="number" min="0" step="0.0001" placeholder="0.00"
                         value={form.purchasePrice} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} />
                </Field>
                <Field label="Current Price (AUD)" required error={errors.currentPrice}>
                  <input type="number" min="0" step="0.0001" placeholder="0.00"
                         value={form.currentPrice} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} />
                </Field>
                <Field label="Notes (optional)">
                  <input type="text" placeholder="Optional notes…" value={form.notes} style={INPUT}
                         onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit"
                        style={{ height: 44, padding: '0 24px', backgroundColor: '#06B6D4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {editId ? 'Update Investment' : '+ Add Investment'}
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

      {/* ── Holdings table (grouped by symbol) ───────────── */}
      <div style={{ ...CARD, padding: '20px' }}>
        <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
          <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>HOLDINGS</h3>
          <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>Click a row to view individual tranches</p>
        </div>

        {holdings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: 14 }}>
            📭 No active holdings. Add your first investment below.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#334155' }}>
                  {['Symbol', 'Type', 'Qty', 'Avg Buy', 'Current Price', 'Cost Basis', 'Value', 'P&L $', 'P&L %'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', color: '#F1F5F9', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      textAlign: ['Qty', 'Avg Buy', 'Current Price', 'Cost Basis', 'Value', 'P&L $', 'P&L %'].includes(h) ? 'right' : 'left',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, i) => {
                  const pnlCol = h.pnl >= 0 ? '#10B981' : '#EF4444';
                  return (
                    <tr key={h.symbol}
                        onClick={() => setTrancheSymbol(h.symbol)}
                        style={{
                          backgroundColor: i % 2 === 0 ? '#1E2139' : '#1A2336',
                          borderBottom: '1px solid #1E293B',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1F2437'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#1E2139' : '#1A2336'}
                        title="Click to view individual tranches">
                      <td style={{ padding: '12px', fontWeight: 700, color: '#F1F5F9', fontFamily: 'monospace' }}>
                        {h.symbol}
                        <span style={{ marginLeft: 6, fontSize: 10, color: '#475569' }}>({h.tranches.length} lots)</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ backgroundColor: '#06B6D420', color: '#06B6D4', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                          {h.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#CBD5E1', fontFamily: 'monospace' }}>{h.qty.toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#94A3B8', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(h.avgBuy, currency)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#94A3B8', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(h.curPri, currency)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#94A3B8', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(h.cost, currency)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#F1F5F9', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(h.value, currency)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: pnlCol, fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrencySigned(h.pnl, currency)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: pnlCol, fontFamily: 'monospace', fontWeight: 700 }}>
                        {h.pnl >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr style={{ backgroundColor: '#0F172A', borderTop: '2px solid #334155' }}>
                  <td colSpan={5} style={{ padding: '12px', color: '#CBD5E1', fontWeight: 700, fontSize: 13 }}>TOTAL</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#CBD5E1', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(costBasis, currency)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#F1F5F9', fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>{formatCurrency(portfolioValue, currency)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: totalPnL >= 0 ? '#10B981' : '#EF4444', fontFamily: 'monospace', fontWeight: 800 }}>{formatCurrencySigned(totalPnL, currency)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: totalPnL >= 0 ? '#10B981' : '#EF4444', fontFamily: 'monospace', fontWeight: 800 }}>{totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Charts (2 column) ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>

        {/* Asset Allocation Pie */}
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>ASSET ALLOCATION</h3>
          </div>
          {allocationData.length === 0 ? (
            <p style={{ color: '#64748B', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>📭 No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                     dataKey="value" nameKey="name"
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                     labelLine={false}>
                  {allocationData.map((_, i) => <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Performance P&L % Bar */}
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>PERFORMANCE P&L %</h3>
          </div>
          {performanceData.length === 0 ? (
            <p style={{ color: '#64748B', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>📭 No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={performanceData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="symbol" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false}
                       tickFormatter={v => `${v}%`} />
                <Tooltip content={<ChartTip isPct />} />
                <Bar dataKey="pnlPct" name="P&L %" radius={[3,3,0,0]} maxBarSize={40}
                     fill="#10B981"
                     label={false}>
                  {performanceData.map((d, i) => (
                    <Cell key={i} fill={d.pnlPct >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Holdings Heatmap ──────────────────────────────── */}
      {heatTiles.length > 0 && (
        <div style={{ ...CARD, padding: '20px' }}>
          <div style={{ ...HDR, padding: '14px 20px', margin: '-20px -20px 16px', borderRadius: '10px 10px 0 0' }}>
            <h3 style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0 }}>PORTFOLIO HEATMAP</h3>
            <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>Size = portfolio weight · Color = P&L</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 80 }}>
            {heatTiles.map(tile => {
              const isGain  = tile.pnl >= 0;
              const bgCol   = isGain ? `rgba(16,185,129,${0.15 + Math.min(0.6, Math.abs(tile.pnlPct) / 30)})`
                                     : `rgba(239,68,68,${0.15 + Math.min(0.6, Math.abs(tile.pnlPct) / 30)})`;
              const bdrCol  = isGain ? '#10B981' : '#EF4444';
              const minWidth = Math.max(80, tile.weight * 3);
              return (
                <div key={tile.symbol}
                     onClick={() => setTrancheSymbol(tile.symbol)}
                     title={`${tile.symbol}: ${formatCurrency(tile.value, currency)} | ${tile.pnlPct >= 0 ? '+' : ''}${tile.pnlPct.toFixed(2)}%`}
                     style={{
                       minWidth, flex: `${tile.weight} 0 ${minWidth}px`, height: 72,
                       borderRadius: 8, border: `1px solid ${bdrCol}40`,
                       backgroundColor: bgCol, padding: '8px 10px',
                       display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                       cursor: 'pointer', transition: 'filter 0.15s',
                     }}
                     onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                     onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 13 }}>{tile.symbol}</span>
                    {isGain ? <TrendingUp size={12} color="#10B981" /> : <TrendingDown size={12} color="#EF4444" />}
                  </div>
                  <div>
                    <div style={{ color: isGain ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: 700 }}>
                      {tile.pnl >= 0 ? '+' : ''}{tile.pnlPct.toFixed(2)}%
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: 10 }}>
                      {formatCurrency(tile.pnl, currency)} · {tile.weight.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Closed Positions toggle ───────────────────────── */}
      <div style={CARD}>
        <button
          onClick={() => setShowClosed(o => !o)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#F59E0B20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14 }}>⊘</span>
            </div>
            <span style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700 }}>
              CLOSED POSITIONS ({closed.length})
            </span>
            {realizedPnL !== 0 && (
              <span style={{ color: realizedPnL >= 0 ? '#10B981' : '#EF4444', fontSize: 13, fontWeight: 700 }}>
                — Realised P&L: {formatCurrencySigned(realizedPnL, currency)}
              </span>
            )}
          </div>
          {showClosed ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
        </button>

        <div style={{ maxHeight: showClosed ? '2000px' : '0', overflow: 'hidden', opacity: showClosed ? 1 : 0, transition: 'max-height 0.4s ease, opacity 0.3s ease' }}>
          <div style={{ borderTop: '1px solid #334155', padding: '16px 20px' }}>
            {closed.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                No closed positions yet. Use "Close Units" on a tranche to record a sell.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#334155' }}>
                      {['Symbol', 'Type', 'Qty Sold', 'Buy Price', 'Sold Price', 'Realised P&L', 'Realised %', 'Sold Date', 'Actions'].map(h => (
                        <th key={h} style={{
                          padding: '10px 12px', color: '#F1F5F9', fontSize: 11, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                          textAlign: ['Qty Sold', 'Buy Price', 'Sold Price', 'Realised P&L', 'Realised %'].includes(h) ? 'right' : 'left',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closed.map((inv, i) => {
                      const realPnl    = (Number(inv.soldPrice) - Number(inv.purchasePrice)) * Number(inv.quantity);
                      const realPnlPct = Number(inv.purchasePrice) > 0
                        ? ((Number(inv.soldPrice) - Number(inv.purchasePrice)) / Number(inv.purchasePrice)) * 100
                        : 0;
                      const pnlCol = realPnl >= 0 ? '#10B981' : '#EF4444';
                      return (
                        <tr key={inv.id || i}
                            style={{ backgroundColor: i % 2 === 0 ? '#1E2139' : '#1A2336', borderBottom: '1px solid #1E293B' }}>
                          <td style={{ padding: '12px', color: '#F1F5F9', fontWeight: 700, fontFamily: 'monospace' }}>{inv.symbol}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ backgroundColor: '#F59E0B20', color: '#F59E0B', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                              {inv.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#CBD5E1', fontFamily: 'monospace' }}>{Number(inv.quantity).toLocaleString()}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#94A3B8', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(inv.purchasePrice, currency)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#CBD5E1', fontFamily: 'monospace' }}>{inv.soldPrice ? formatCurrency(inv.soldPrice, currency) : '—'}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: pnlCol, fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrencySigned(realPnl, currency)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: pnlCol, fontFamily: 'monospace' }}>{realPnl >= 0 ? '+' : ''}{realPnlPct.toFixed(2)}%</td>
                          <td style={{ padding: '12px', color: '#64748B', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {inv.soldDate ? formatDate(inv.soldDate, dateFormat) : '—'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => handleReopen(inv.id)}
                                      style={{ padding: '4px 10px', borderRadius: 5, border: 'none', backgroundColor: '#10B98120', color: '#10B981', fontSize: 11, cursor: 'pointer' }}>
                                Reopen
                              </button>
                              <button onClick={() => setDeleteId(inv.id)}
                                      style={{ padding: '4px 8px', borderRadius: 5, border: 'none', backgroundColor: '#EF444420', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>
                                Del
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tranches modal ───────────────────────────────── */}
      {trancheSymbol && (() => {
        const tranches = active.filter(inv => inv.symbol === trancheSymbol);
        if (tranches.length === 0) { setTrancheSymbol(null); return null; }
        return (
          <TranchesModal
            symbol={trancheSymbol}
            tranches={tranches}
            currency={currency}
            dateFormat={dateFormat}
            onClose={() => setTrancheSymbol(null)}
            onEdit={handleEdit}
            onDelete={(id) => { handleDelete(id); }}
            onPartialClose={handlePartialClose}
          />
        );
      })()}

      {/* ── Delete confirmation ───────────────────────────── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...CARD, width: 360, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#F1F5F9', margin: 0, fontWeight: 700 }}>Delete Investment?</h3>
              <button onClick={() => setDeleteId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748B" />
              </button>
            </div>
            <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleDelete(deleteId)}
                      style={{ flex: 1, height: 44, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setDeleteId(null)}
                      style={{ flex: 1, height: 44, backgroundColor: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}
