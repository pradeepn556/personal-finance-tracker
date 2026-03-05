// ============================================================
// calculations.js — All financial formulas used in the app
// Pure functions: input data in, calculated number out.
// No side effects, no storage calls.
// ============================================================

import { startOfMonth, endOfMonth, subMonths } from '../utils/dateHelpers';

// --- NET WORTH ---
// Net Worth = Total Income - Total Expenses + Total Investment Value
export const calculateNetWorth = (income, expenses, investments) => {
  const totalIncome      = income.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses    = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const investmentValue  = investments.reduce((sum, inv) => sum + (Number(inv.quantity) * Number(inv.currentPrice)), 0);
  return totalIncome - totalExpenses + investmentValue;
};

// --- INVESTMENT P&L ---
// P&L $ = (Current Price - Purchase Price) x Quantity
export const calculatePnL = (investment) => {
  const cost    = Number(investment.quantity) * Number(investment.purchasePrice);
  const current = Number(investment.quantity) * Number(investment.currentPrice);
  return current - cost;
};

// P&L % = (Current Price - Purchase Price) / Purchase Price * 100
export const calculatePnLPercent = (investment) => {
  if (!investment.purchasePrice || Number(investment.purchasePrice) === 0) return 0;
  return ((Number(investment.currentPrice) - Number(investment.purchasePrice)) / Number(investment.purchasePrice)) * 100;
};

// Total portfolio current value
export const calculatePortfolioValue = (investments) =>
  investments.reduce((sum, inv) => sum + (Number(inv.quantity) * Number(inv.currentPrice)), 0);

// Total portfolio cost basis
export const calculateCostBasis = (investments) =>
  investments.reduce((sum, inv) => sum + (Number(inv.quantity) * Number(inv.purchasePrice)), 0);

// Total unrealized P&L across all investments
export const calculateTotalPnL = (investments) =>
  calculatePortfolioValue(investments) - calculateCostBasis(investments);

// --- MONTHLY CALCULATIONS ---
// Filter entries to current calendar month
export const filterCurrentMonth = (entries) => {
  const now   = new Date();
  const start = startOfMonth(now);
  const end   = endOfMonth(now);
  return entries.filter(e => {
    const date = new Date(e.date);
    return date >= start && date <= end;
  });
};

// Filter entries to a specific month offset (0 = current, -1 = last month, etc.)
export const filterByMonth = (entries, monthOffset = 0) => {
  const target = subMonths(new Date(), Math.abs(monthOffset));
  const start  = startOfMonth(target);
  const end    = endOfMonth(target);
  return entries.filter(e => {
    const date = new Date(e.date);
    return date >= start && date <= end;
  });
};

// --- BUDGET STATUS ---
// Returns budget status for a category in current month
export const getBudgetStatus = (category, expenses, budgets) => {
  const budget  = Number(budgets[category] ?? 0);
  const spent   = filterCurrentMonth(expenses)
    .filter(e => e.category === category)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining  = budget - spent;
  const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
  return { budget, spent, remaining, percentUsed, isOver: spent > budget };
};

// --- INCOME STATS ---
export const getIncomeStats = (income) => {
  if (!income.length) return { thisMonth: 0, thisYear: 0, average: 0, highest: 0, highestSource: '' };

  const now        = new Date();
  const thisMonth  = filterCurrentMonth(income).reduce((sum, i) => sum + Number(i.amount), 0);
  const thisYear   = income
    .filter(i => new Date(i.date).getFullYear() === now.getFullYear())
    .reduce((sum, i) => sum + Number(i.amount), 0);

  // Group by month to calculate average monthly income
  const monthlyTotals = {};
  income.forEach(i => {
    const key = i.date.slice(0, 7); // "YYYY-MM"
    monthlyTotals[key] = (monthlyTotals[key] || 0) + Number(i.amount);
  });
  const months  = Object.values(monthlyTotals);
  const average = months.length ? months.reduce((a, b) => a + b, 0) / months.length : 0;

  // Find highest single entry
  const highest = income.reduce((max, i) => Number(i.amount) > Number(max.amount) ? i : max, income[0]);

  return { thisMonth, thisYear, average, highest: Number(highest.amount), highestSource: highest.source };
};

// --- MONTHLY TREND DATA (last 12 months) ---
// Returns array of { month, income, expenses, savings } for charts
export const getMonthlyTrend = (income, expenses, monthCount = 12) => {
  const result = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const target    = subMonths(new Date(), i);
    const start     = startOfMonth(target);
    const end       = endOfMonth(target);
    const label     = target.toLocaleString('default', { month: 'short', year: '2-digit' });

    const monthIncome   = income.filter(e => {
      const d = new Date(e.date); return d >= start && d <= end;
    }).reduce((sum, e) => sum + Number(e.amount), 0);

    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date); return d >= start && d <= end;
    }).reduce((sum, e) => sum + Number(e.amount), 0);

    result.push({
      month:    label,
      income:   Math.round(monthIncome),
      expenses: Math.round(monthExpenses),
      savings:  Math.round(monthIncome - monthExpenses),
    });
  }
  return result;
};

// --- SAVINGS RATE ---
// (Income - Expenses) / Income * 100
export const calculateSavingsRate = (income, expenses) => {
  const totalIncome   = income.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  if (totalIncome === 0) return 0;
  return ((totalIncome - totalExpenses) / totalIncome) * 100;
};

// --- EXPENSE RATIO ---
// Expenses / Income * 100
export const calculateExpenseRatio = (income, expenses) => {
  const totalIncome   = income.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  if (totalIncome === 0) return 0;
  return (totalExpenses / totalIncome) * 100;
};

// --- INVESTMENT ALLOCATION % ---
// Total Investment Value / Net Worth * 100
export const calculateInvestmentAllocation = (income, expenses, investments) => {
  const netWorth = calculateNetWorth(income, expenses, investments);
  if (netWorth <= 0) return 0;
  const portfolioValue = calculatePortfolioValue(investments);
  return (portfolioValue / netWorth) * 100;
};

// --- EXPENSES BY CATEGORY ---
// Returns array of { category, amount, percentage } for pie charts
export const getExpensesByCategory = (expenses) => {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const grouped = {};
  expenses.forEach(e => {
    grouped[e.category] = (grouped[e.category] || 0) + Number(e.amount);
  });
  return Object.entries(grouped)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: total > 0 ? Math.round((amount / total) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

// --- ASSET ALLOCATION ---
// Groups investments by type for pie chart
export const getAssetAllocation = (investments) => {
  const total = calculatePortfolioValue(investments);
  const grouped = {};
  investments.forEach(inv => {
    const value = Number(inv.quantity) * Number(inv.currentPrice);
    grouped[inv.type] = (grouped[inv.type] || 0) + value;
  });
  return Object.entries(grouped)
    .map(([type, amount]) => ({
      type,
      amount: Math.round(amount * 100) / 100,
      percentage: total > 0 ? Math.round((amount / total) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

// --- RECENT TRANSACTIONS ---
// Combines income, investments, expenses into one list sorted by date
export const getRecentTransactions = (income, investments, expenses, limit = 5) => {
  const all = [
    ...income.map(i => ({ ...i, transactionType: 'Income' })),
    ...investments.map(i => ({ ...i, transactionType: 'Investment', amount: Number(i.quantity) * Number(i.purchasePrice) })),
    ...expenses.map(e => ({ ...e, transactionType: 'Expense' })),
  ];
  return all
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};
