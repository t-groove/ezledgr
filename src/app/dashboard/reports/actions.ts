"use server";

import { createClient } from "../../../../supabase/server";
import { TRANSFER_CATEGORIES } from "@/lib/bookkeeping/categories";

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

export interface ReportData {
  monthly: MonthlyData[];
  expensesByCategory: CategoryData[];
  incomeByCategory: CategoryData[];
  totals: ReportTotals;
  availableYears: number[];
}

export async function getReportData(year: number, accountId?: string): Promise<ReportData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: ReportData = {
    monthly: MONTH_NAMES.map((month) => ({ month, income: 0, expenses: 0, profit: 0 })),
    expensesByCategory: [],
    incomeByCategory: [],
    totals: { income: 0, expenses: 0, profit: 0, profitMargin: NaN },
    availableYears: [],
  };

  if (!user) return empty;

  // Fetch transactions for the given year
  let query = supabase
    .from("transactions")
    .select("date, amount, type, category")
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

  // Exclude transfer categories from P&L calculations
  const plTransactions = transactions.filter(
    (t) => !TRANSFER_CATEGORIES.includes(t.category as (typeof TRANSFER_CATEGORIES)[number])
  );

  const monthlyIncome = new Array(12).fill(0);
  const monthlyExpenses = new Array(12).fill(0);
  const expenseCategoryMap = new Map<string, number>();
  const incomeCategoryMap = new Map<string, number>();

  for (const t of plTransactions) {
    const monthIndex = parseInt(t.date.substring(5, 7), 10) - 1;
    if (t.type === "income") {
      monthlyIncome[monthIndex] += t.amount;
      incomeCategoryMap.set(t.category, (incomeCategoryMap.get(t.category) ?? 0) + t.amount);
    } else {
      monthlyExpenses[monthIndex] += t.amount;
      expenseCategoryMap.set(t.category, (expenseCategoryMap.get(t.category) ?? 0) + t.amount);
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
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const incomeByCategory: CategoryData[] = Array.from(incomeCategoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    monthly,
    expensesByCategory,
    incomeByCategory,
    totals: { income: totalIncome, expenses: totalExpenses, profit, profitMargin },
    availableYears,
  };
}
