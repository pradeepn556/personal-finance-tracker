// ============================================================
// Dashboard/index.jsx — Complete financial overview
// Layout: 3-col metrics → Charts side-by-side → Health → Recent Transactions
// ============================================================

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, Minus } from 'lucide-react';

import {
  calculateNetWorth, calculatePortfolioValue, calculateTotalPnL,
  filterCurrentMonth, filterByMonth, getMonthlyTrend, calculateSavingsRate,
  calculateExpenseRatio, calculateInvestmentAllocation, getRecentTransactions,
  calculatePnLPercent,
} from '../../utils/calculations';
import { formatCurrency, formatPercent, formatCurrencySigned } from '../../utils/formatters';
import { formatDate } from '../../utils/dateHelpers';

// ── Design tokens ──────────────────────────────────────────
const C = {
  card:    { backgroundColor: '#1E2139', border: '1px solid #334155', borderRadius: '10px' },
  header:  { backgroundColor: '#1A2332', borderBottom: '1px solid #334155' },
};

// ── Custom Recharts tooltip ────────────────────────────────
function ChartTooltip({ active, payload, label, currency = 'AUD' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: '#1A2332', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ color: '#CBD5E1', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12 }}>
          {p.name}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

// ── Type badge for recent transactions ────────────────────
function TypeBadge({ type }) {
  const map = {
    Income:     { bg: '#10B98120', color: '#10B981', label: '💵 Income'     },
    Expense:    { bg: '#EF444420', color: '#EF4444', label: '💳 Expense'    },
    Investment: { bg: '#06B6D420', color: '#06B6D4', label: '📈 Investment' },
  };
  const s = map[type] || map.Expense;
  return (
    <span style={{
      backgroundColor: s.bg, color: s.color,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

// ── Equal metric card (3-column) ──────────────────────────
function MetricCard({ label, value, sub, subColour, icon: Icon, extraContent }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      style={{
        ...C.card,
        padding: '16px',
        overflow: 'hidden',
        minWidth: 0,
        transition: 'box-shadow 200ms ease',
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between mb-2">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#CBD5E1', textTransform: 'uppercase', minWidth: 0 }}>
          {label}
        </div>
        {Icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            backgroundColor: '#06B6D420', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} color="#06B6D4" />
          </div>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', color: '#F1F5F9', wordBreak: 'break-all', minWidth: 0 }}>
        {value}
      </div>
      {sub && (
        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: subColour || '#64748B' }}>
          {sub}
        </div>
      )}
      {extraContent}
    </div>
  );
}

// ── Health metric row with progress bar ────────────────────
function HealthMetric({ label, value, description, pct, good }) {
  const colour = good ? '#10B981' : '#EF4444';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#94A3B8', fontSize: 13 }}>{label}</span>
        <span style={{ color: colour, fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
      </div>
      <p style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>{description}</p>
      <div style={{ height: 4, borderRadius: 4, backgroundColor: '#334155' }}>
        <div style={{
          height: 4, borderRadius: 4,
          width: `${Math.min(100, Math.max(0, pct))}%`,
          backgroundColor: colour,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

// ── Main Dashboard component ───────────────────────────────
export default function Dashboard({ data }) {
  const { income, investments, expenses, settings } = data;
  const currency   = settings?.currency   || 'AUD';
  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';

  // Core metrics
  const netWorth        = calculateNetWorth(income, expenses, investments);
  const portfolioValue  = calculatePortfolioValue(investments);
  const totalPnL        = calculateTotalPnL(investments);
  const monthExpenses   = filterCurrentMonth(expenses).reduce((s, e) => s + Number(e.amount), 0);
  const monthIncome     = filterCurrentMonth(income).reduce((s, i) => s + Number(i.amount), 0);
  const expensePct      = monthIncome > 0 ? ((monthExpenses / monthIncome) * 100).toFixed(1) : '0.0';
  const savingsRate     = calculateSavingsRate(income, expenses);
  const expenseRatio    = calculateExpenseRatio(income, expenses);
  const investAlloc     = calculateInvestmentAllocation(income, expenses, investments);

  // 30-day change: current month income - expenses vs last month
  const lastMonthIncome   = filterByMonth(income,   -1).reduce((s, i) => s + Number(i.amount), 0);
  const lastMonthExpenses = filterByMonth(expenses, -1).reduce((s, e) => s + Number(e.amount), 0);
  const change30d = (monthIncome - monthExpenses) - (lastMonthIncome - lastMonthExpenses);

  // Portfolio P&L %
  const pnlPct = investments.length > 0
    ? (totalPnL / Math.max(1, portfolioValue - totalPnL)) * 100
    : 0;

  // Chart data
  const monthlyTrend = getMonthlyTrend(income, expenses, 12);
  const recentTx     = getRecentTransactions(income, investments, expenses, 5);

  // Cumulative net worth trend
  let running = 0;
  const netWorthTrend = monthlyTrend.map(m => {
    running += (m.income - m.expenses);
    return { month: m.month, 'Net Worth': Math.max(0, running) };
  });

  const hasData = income.length > 0 || expenses.length > 0 || investments.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>

      {/* ── Section header ────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', margin: 0 }}>
          DASHBOARD
        </h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>
          Your complete financial overview
        </p>
      </div>

      {/* ── Empty state ───────────────────────────────────── */}
      {!hasData && (
        <div style={{ ...C.card, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <h3 style={{ color: '#F1F5F9', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Welcome to FinanceTracker
          </h3>
          <p style={{ color: '#64748B', fontSize: 14 }}>
            No entries yet. Add your first income, investment, or expense using the tabs above.
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* ── 3-column equal metric cards ───────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
            <MetricCard
              label="Net Worth"
              value={formatCurrency(netWorth, currency)}
              sub={
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {change30d >= 0
                    ? <TrendingUp size={12} color="#10B981" />
                    : <TrendingDown size={12} color="#EF4444" />}
                  <span style={{ color: change30d >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                    {formatCurrencySigned(change30d, currency)}
                  </span>
                  <span style={{ color: '#475569' }}>30d</span>
                </span>
              }
              icon={DollarSign}
            />
            <MetricCard
              label="Monthly Expenses"
              value={formatCurrency(monthExpenses, currency)}
              sub={`${expensePct}% of this month's income`}
              subColour={Number(expensePct) > 80 ? '#EF4444' : '#10B981'}
              icon={Activity}
            />
            <MetricCard
              label="Portfolio Value"
              value={formatCurrency(portfolioValue, currency)}
              sub={`${formatCurrencySigned(totalPnL, currency)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%) P&L`}
              subColour={totalPnL >= 0 ? '#10B981' : '#EF4444'}
              icon={PieChart}
            />
          </div>

          {/* ── Charts: Net Worth Trend + Cash Flow side-by-side ── */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>

            {/* Net Worth Trend */}
            <div style={{ ...C.card, padding: '16px' }}>
              <div style={{ ...C.header, padding: '12px 16px', margin: '-16px -16px 16px', borderRadius: '10px 10px 0 0' }}>
                <h3 style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700, margin: 0 }}>NET WORTH TREND</h3>
                <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>12-month view</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={netWorthTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="10%"  stopColor="#06B6D4" stopOpacity={0.35} />
                      <stop offset="90%" stopColor="#06B6D4" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false}
                         tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Area type="monotone" dataKey="Net Worth" stroke="#06B6D4" strokeWidth={2} fill="url(#nwGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cash Flow */}
            <div style={{ ...C.card, padding: '16px' }}>
              <div style={{ ...C.header, padding: '12px 16px', margin: '-16px -16px 16px', borderRadius: '10px 10px 0 0' }}>
                <h3 style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700, margin: 0 }}>CASH FLOW</h3>
                <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>Income vs Expenses</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false}
                         tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 8 }} />
                  <Bar dataKey="income"   name="Income"   fill="#10B981" radius={[3,3,0,0]} maxBarSize={24} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[3,3,0,0]} maxBarSize={24} />
                  <Bar dataKey="savings"  name="Savings"  fill="#06B6D4" radius={[3,3,0,0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Financial Health (compact) ────────────────── */}
          <div style={{ ...C.card, padding: '16px' }}>
            <div style={{ ...C.header, padding: '12px 16px', margin: '-16px -16px 16px', borderRadius: '10px 10px 0 0' }}>
              <h3 style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700, margin: 0 }}>FINANCIAL HEALTH</h3>
              <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>Key ratios</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
              <HealthMetric
                label="Savings Rate"
                value={formatPercent(savingsRate)}
                description="(Income − Expenses) ÷ Income"
                pct={savingsRate}
                good={savingsRate >= 20}
              />
              <HealthMetric
                label="Expense Ratio"
                value={formatPercent(expenseRatio)}
                description="Expenses ÷ Income"
                pct={expenseRatio}
                good={expenseRatio <= 70}
              />
              <HealthMetric
                label="Investment Allocation"
                value={formatPercent(investAlloc)}
                description="Portfolio Value ÷ Net Worth"
                pct={investAlloc}
                good={investAlloc >= 20}
              />
            </div>
          </div>

          {/* ── Recent Transactions (full width) ─────────── */}
          <div style={{ ...C.card, padding: '16px' }}>
            <div style={{ ...C.header, padding: '12px 16px', margin: '-16px -16px 0', borderRadius: '10px 10px 0 0' }}>
              <h3 style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700, margin: 0 }}>RECENT TRANSACTIONS</h3>
              <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>Last 5 entries across all categories</p>
            </div>

            {recentTx.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748B', fontSize: 14 }}>
                No transactions yet. Add your first using the tabs above.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#334155' }}>
                      {['Date', 'Type', 'Description', 'Amount'].map(h => (
                        <th key={h} style={{
                          padding: '8px 10px', textAlign: h === 'Amount' ? 'right' : 'left',
                          color: '#F1F5F9', fontSize: 12, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentTx.map((tx, i) => {
                      const isIncome = tx.transactionType === 'Income';
                      const isInvest = tx.transactionType === 'Investment';
                      const amtColour = isIncome ? '#10B981' : isInvest ? '#06B6D4' : '#EF4444';
                      const prefix    = isIncome || isInvest ? '+' : '-';
                      return (
                        <tr key={tx.id || i}
                            style={{
                              backgroundColor: i % 2 === 0 ? '#1E2139' : '#1A2336',
                              borderBottom: '1px solid #1E293B',
                            }}>
                          <td style={{ padding: '10px', color: '#94A3B8', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {formatDate(tx.date, dateFormat)}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <TypeBadge type={tx.transactionType} />
                          </td>
                          <td style={{ padding: '10px', color: '#F1F5F9', fontSize: 13 }}>
                            {tx.source || tx.symbol || tx.description || tx.category || '—'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', color: amtColour, fontFamily: 'monospace', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                            {prefix}{formatCurrency(tx.amount, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
