"use server";

import { createClient } from "../../../../supabase/server";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export interface ReportTotals {
  income: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

export interface StatementRow {
  category: string;
  monthly: number[];
  total: number;
}

export interface StatementData {
  months: string[];
  // Income
  incomeRows: StatementRow[];
  totalIncome: number[];
  totalIncomeAnnual: number;
  // COGS (empty for service business)
  cogsRows: StatementRow[];
  totalCogs: number[];
  totalCogsAnnual: number;
  // Gross Profit = Total Income - Total COGS
  grossProfit: number[];
  grossProfitAnnual: number;
  // Operating Expenses
  expenseRows: StatementRow[];
  totalExpenses: number[];
  totalExpensesAnnual: number;
  // Net Operating Income = Gross Profit - Total Expenses
  netOperatingIncome: number[];
  netOperatingIncomeAnnual: number;
  // Net Income = Net Operating Income
  netIncome: number[];
  netIncomeAnnual: number;
  dateRange: string;
  companyLabel: string;
}

export interface ReportData {
  monthly: MonthlyData[];
  expensesByCategory: CategoryData[];
  incomeByCategory: CategoryData[];
  totals: ReportTotals;
  availableYears: number[];
  statement: StatementData;
}

function getPlAmount(
  transaction: { amount: number; type: string; account_type: string }
): { incomeEffect: number; expenseEffect: number } {
  const amt = Number(transaction.amount);

  if (transaction.account_type === "Income") {
    return {
      incomeEffect: transaction.type === "income" ? amt : -amt,
      expenseEffect: 0,
    };
  }

  if (transaction.account_type === "Expense") {
    return {
      incomeEffect: 0,
      expenseEffect: transaction.type === "expense" ? amt : -amt,
    };
  }

  // Asset, Equity, Liability — excluded from P&L
  return { incomeEffect: 0, expenseEffect: 0 };
}

export async function getReportData(year: number, accountId?: string): Promise<ReportData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  function emptyStatement(year: number): StatementData {
    const zeros = new Array(12).fill(0);
    return {
      months: MONTH_NAMES,
      incomeRows: [],
      totalIncome: zeros,
      totalIncomeAnnual: 0,
      cogsRows: [],
      totalCogs: zeros,
      totalCogsAnnual: 0,
      grossProfit: zeros,
      grossProfitAnnual: 0,
      expenseRows: [],
      totalExpenses: zeros,
      totalExpensesAnnual: 0,
      netOperatingIncome: zeros,
      netOperatingIncomeAnnual: 0,
      netIncome: zeros,
      netIncomeAnnual: 0,
      dateRange: `January – December ${year}`,
      companyLabel: "Profit and Loss",
    };
  }

  const empty: ReportData = {
    monthly: MONTH_NAMES.map((month) => ({ month, income: 0, expenses: 0, profit: 0 })),
    expensesByCategory: [],
    incomeByCategory: [],
    totals: { income: 0, expenses: 0, profit: 0, profitMargin: NaN },
    availableYears: [],
    statement: emptyStatement(year),
  };

  if (!user) return empty;

  // Fetch transactions for the given year
  let query = supabase
    .from("transactions")
    .select("date, amount, type, category, account_type")
    .eq("user_id", user.id)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`);

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data: transactions } = await query;

  // Fetch all transaction dates to derive available years
  const { data: allDates } = await supabase
    .from("transactions")
    .select("date")
    .eq("user_id", user.id);

  const yearSet = new Set<number>();
  for (const t of allDates ?? []) {
    yearSet.add(parseInt(t.date.substring(0, 4), 10));
  }
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  if (!transactions || transactions.length === 0) {
    return { ...empty, availableYears };
  }

  // Only include Income and Expense account_type transactions on P&L
  const plTransactions = transactions.filter(
    (t) => t.account_type === "Income" || t.account_type === "Expense"
  );

  const monthlyIncome = new Array(12).fill(0);
  const monthlyExpenses = new Array(12).fill(0);
  const expenseCategoryMap = new Map<string, number>();
  const incomeCategoryMap = new Map<string, number>();
  // Monthly-per-category maps for statement
  const incomeCategoryMonthly = new Map<string, number[]>();
  const expenseCategoryMonthly = new Map<string, number[]>();

  for (const t of plTransactions) {
    const monthIndex = parseInt(t.date.substring(5, 7), 10) - 1;
    const { incomeEffect, expenseEffect } = getPlAmount(t);

    if (incomeEffect !== 0) {
      monthlyIncome[monthIndex] += incomeEffect;
      incomeCategoryMap.set(t.category, (incomeCategoryMap.get(t.category) ?? 0) + incomeEffect);
      if (!incomeCategoryMonthly.has(t.category)) incomeCategoryMonthly.set(t.category, new Array(12).fill(0));
      incomeCategoryMonthly.get(t.category)![monthIndex] += incomeEffect;
    }

    if (expenseEffect !== 0) {
      monthlyExpenses[monthIndex] += expenseEffect;
      expenseCategoryMap.set(t.category, (expenseCategoryMap.get(t.category) ?? 0) + expenseEffect);
      if (!expenseCategoryMonthly.has(t.category)) expenseCategoryMonthly.set(t.category, new Array(12).fill(0));
      expenseCategoryMonthly.get(t.category)![monthIndex] += expenseEffect;
    }
  }

  const monthly: MonthlyData[] = MONTH_NAMES.map((month, i) => ({
    month,
    income: monthlyIncome[i],
    expenses: monthlyExpenses[i],
    profit: monthlyIncome[i] - monthlyExpenses[i],
  }));

  const totalIncome = monthlyIncome.reduce((s, v) => s + v, 0);
  const totalExpenses = monthlyExpenses.reduce((s, v) => s + v, 0);
  const profit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : NaN;

  const expensesByCategory: CategoryData[] = Array.from(expenseCategoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const incomeByCategory: CategoryData[] = Array.from(incomeCategoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Build statement rows — net amounts (negative = contra)
  const incomeRows: StatementRow[] = Array.from(incomeCategoryMonthly.entries())
    .map(([category, monthly]) => ({ category, monthly, total: monthly.reduce((s, v) => s + v, 0) }))
    .filter((r) => r.monthly.some((val) => val !== 0))
    .sort((a, b) => b.total - a.total);

  const expenseRows: StatementRow[] = Array.from(expenseCategoryMonthly.entries())
    .map(([category, monthly]) => ({ category, monthly, total: monthly.reduce((s, v) => s + v, 0) }))
    .filter((r) => r.monthly.some((val) => val !== 0))
    .sort((a, b) => b.total - a.total);

  // COGS = 0 for service business
  const totalCogs = new Array(12).fill(0);
  const totalCogsAnnual = 0;

  // Gross Profit = Total Income - Total COGS (= Total Income for service biz)
  const grossProfit = monthlyIncome.map((inc, i) => inc - totalCogs[i]);
  const grossProfitAnnual = grossProfit.reduce((s, v) => s + v, 0);

  // Net Operating Income = Gross Profit - Total Expenses
  const netOperatingIncome = grossProfit.map((gp, i) => gp - monthlyExpenses[i]);
  const netOperatingIncomeAnnual = netOperatingIncome.reduce((s, v) => s + v, 0);

  const statement: StatementData = {
    months: MONTH_NAMES,
    incomeRows,
    totalIncome: monthlyIncome,
    totalIncomeAnnual: totalIncome,
    cogsRows: [],
    totalCogs,
    totalCogsAnnual,
    grossProfit,
    grossProfitAnnual,
    expenseRows,
    totalExpenses: monthlyExpenses,
    totalExpensesAnnual: totalExpenses,
    netOperatingIncome,
    netOperatingIncomeAnnual,
    netIncome: netOperatingIncome,
    netIncomeAnnual: netOperatingIncomeAnnual,
    dateRange: `January – December ${year}`,
    companyLabel: "Profit and Loss",
  };

  return {
    monthly,
    expensesByCategory,
    incomeByCategory,
    totals: { income: totalIncome, expenses: totalExpenses, profit, profitMargin },
    availableYears,
    statement,
  };
}
