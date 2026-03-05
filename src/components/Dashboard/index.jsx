// ============================================================
// Dashboard/index.jsx — Financial overview at a glance
// Shows: Net Worth, Monthly Expenses, Portfolio Value cards
//        Net Worth trend chart, Cash Flow chart,
//        Recent transactions, Financial health metrics
// ============================================================

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, PieChart, Activity } from 'lucide-react';

import {
  calculateNetWorth, calculatePortfolioValue, calculateTotalPnL,
  filterCurrentMonth, getMonthlyTrend, calculateSavingsRate,
  calculateExpenseRatio, calculateInvestmentAllocation, getRecentTransactions,
} from '../../utils/calculations';
import { formatCurrency, formatPercent, formatCurrencySigned, getAmountColour } from '../../utils/formatters';
import { formatDate } from '../../utils/dateHelpers';

// ── Reusable summary card ─────────────────────────────────────
function SummaryCard({ title, value, subValue, subLabel, icon: Icon, trend, positive }) {
  const trendColour = positive === true ? '#10B981' : positive === false ? '#EF4444' : '#64748B';
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3"
         style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>{title}</span>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
             style={{ backgroundColor: '#0F172A' }}>
          <Icon size={18} color="#06B6D4" />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold font-mono" style={{ color: '#F1F5F9' }}>{value}</div>
        {subValue && (
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up'   && <TrendingUp  size={14} color={trendColour} />}
            {trend === 'down' && <TrendingDown size={14} color={trendColour} />}
            {trend === 'flat' && <Minus        size={14} color={trendColour} />}
            <span className="text-sm font-medium" style={{ color: trendColour }}>{subValue}</span>
            {subLabel && <span className="text-xs" style={{ color: '#64748B' }}>{subLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Custom tooltip for Recharts ───────────────────────────────
function ChartTooltip({ active, payload, label, currency = 'AUD' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-sm shadow-xl"
         style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
      <p className="font-semibold mb-2" style={{ color: '#F1F5F9' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

// ── Transaction type badge ────────────────────────────────────
function TypeBadge({ type }) {
  const styles = {
    Income:     { bg: '#10B981/20', text: '#10B981' },
    Expense:    { bg: '#EF4444/20', text: '#EF4444' },
    Investment: { bg: '#06B6D4/20', text: '#06B6D4' },
  };
  const s = styles[type] || styles.Expense;
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: `${s.text}20`, color: s.text }}>
      {type}
    </span>
  );
}

// ── Main Dashboard component ──────────────────────────────────
export default function Dashboard({ data }) {
  const { income, investments, expenses, settings } = data;
  const currency = settings?.currency || 'AUD';

  // Calculations
  const netWorth        = calculateNetWorth(income, expenses, investments);
  const portfolioValue  = calculatePortfolioValue(investments);
  const totalPnL        = calculateTotalPnL(investments);
  const monthExpenses   = filterCurrentMonth(expenses).reduce((s, e) => s + Number(e.amount), 0);
  const monthIncome     = filterCurrentMonth(income).reduce((s, i) => s + Number(i.amount), 0);
  const expensePct      = monthIncome > 0 ? ((monthExpenses / monthIncome) * 100).toFixed(0) : 0;
  const savingsRate     = calculateSavingsRate(income, expenses);
  const expenseRatio    = calculateExpenseRatio(income, expenses);
  const investAlloc     = calculateInvestmentAllocation(income, expenses, investments);
  const monthlyTrend    = getMonthlyTrend(income, expenses, 12);
  const recentTx        = getRecentTransactions(income, investments, expenses, 5);

  // Net worth trend data (cumulative)
  let runningNetWorth = 0;
  const netWorthTrend = monthlyTrend.map(m => {
    runningNetWorth += (m.income - m.expenses);
    return { month: m.month, netWorth: Math.max(0, runningNetWorth) };
  });

  const hasData = income.length > 0 || expenses.length > 0 || investments.length > 0;

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F1F5F9' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Your complete financial overview
        </p>
      </div>

      {/* ── Empty state ──────────────────────────────────── */}
      {!hasData && (
        <div className="rounded-xl p-10 text-center"
             style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
          <div className="text-4xl mb-3">💰</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#F1F5F9' }}>
            Welcome to FinanceTracker
          </h3>
          <p style={{ color: '#64748B' }}>
            Start by adding income, investments or expenses using the tabs above.
            Your dashboard will update automatically.
          </p>
        </div>
      )}

      {/* ── Summary cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Net Worth"
          value={formatCurrency(netWorth, currency)}
          subValue={netWorth >= 0 ? 'Positive' : 'Negative'}
          subLabel="overall"
          icon={DollarSign}
          trend={netWorth >= 0 ? 'up' : 'down'}
          positive={netWorth >= 0}
        />
        <SummaryCard
          title="Monthly Expenses"
          value={formatCurrency(monthExpenses, currency)}
          subValue={`${expensePct}% of income`}
          subLabel="this month"
          icon={Activity}
          trend={Number(expensePct) > 80 ? 'up' : 'flat'}
          positive={Number(expensePct) <= 80}
        />
        <SummaryCard
          title="Investment Portfolio"
          value={formatCurrency(portfolioValue, currency)}
          subValue={formatCurrencySigned(totalPnL, currency)}
          subLabel="unrealised P&L"
          icon={PieChart}
          trend={totalPnL >= 0 ? 'up' : 'down'}
          positive={totalPnL >= 0}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Net Worth Trend */}
        <div className="rounded-xl p-5"
             style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Net Worth Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={netWorthTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false}
                     tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Area type="monotone" dataKey="netWorth" name="Net Worth"
                    stroke="#06B6D4" strokeWidth={2}
                    fill="url(#netWorthGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cash Flow Breakdown */}
        <div className="rounded-xl p-5"
             style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Cash Flow</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false}
                     tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }} />
              <Bar dataKey="income"   name="Income"   fill="#10B981" radius={[3,3,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[3,3,0,0]} />
              <Bar dataKey="savings"  name="Savings"  fill="#06B6D4" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Recent transactions + Health metrics ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Transactions */}
        <div className="lg:col-span-2 rounded-xl p-5"
             style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Recent Transactions</h3>
          {recentTx.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#64748B' }}>
              No transactions yet. Add income, investments or expenses to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx, i) => (
                <div key={tx.id || i}
                     className="flex items-center justify-between py-2 px-3 rounded-lg"
                     style={{ backgroundColor: '#0F172A' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <TypeBadge type={tx.transactionType} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>
                        {tx.source || tx.symbol || tx.description || tx.category || '—'}
                      </p>
                      <p className="text-xs" style={{ color: '#64748B' }}>
                        {formatDate(tx.date, settings?.dateFormat)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-mono font-semibold ml-3 ${
                    tx.transactionType === 'Income' ? 'text-emerald-400' :
                    tx.transactionType === 'Expense' ? 'text-red-400' : 'text-cyan-400'
                  }`}>
                    {tx.transactionType === 'Expense' ? '-' : '+'}
                    {formatCurrency(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Health Metrics */}
        <div className="rounded-xl p-5"
             style={{ backgroundColor: '#1E2139', border: '1px solid #334155' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#F1F5F9' }}>Financial Health</h3>
          <div className="space-y-4">
            <HealthMetric
              label="Savings Rate"
              value={formatPercent(savingsRate)}
              description="of income saved"
              good={savingsRate >= 20}
            />
            <HealthMetric
              label="Expense Ratio"
              value={formatPercent(expenseRatio)}
              description="of income spent"
              good={expenseRatio <= 70}
            />
            <HealthMetric
              label="Investment Allocation"
              value={formatPercent(investAlloc)}
              description="of net worth invested"
              good={investAlloc >= 20}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Small health metric row ───────────────────────────────────
function HealthMetric({ label, value, description, good }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm" style={{ color: '#94A3B8' }}>{label}</span>
        <span className="text-sm font-semibold font-mono"
              style={{ color: good ? '#10B981' : '#EF4444' }}>
          {value}
        </span>
      </div>
      <p className="text-xs" style={{ color: '#475569' }}>{description}</p>
      <div className="mt-1 h-1 rounded-full" style={{ backgroundColor: '#334155' }}>
        <div className="h-1 rounded-full transition-all"
             style={{
               width: `${Math.min(100, Math.max(0, parseFloat(value)))}%`,
               backgroundColor: good ? '#10B981' : '#EF4444',
             }} />
      </div>
    </div>
  );
}
