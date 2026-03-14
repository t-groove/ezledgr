"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Printer, FileDown } from "lucide-react";
import { getReportData } from "./actions";
import type { ReportData, CategoryData } from "./actions";
import type { BankAccount } from "../accounts/actions";

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCurrency(v: number) {
  return fmtCurrency.format(v);
}

function formatPct(v: number) {
  if (isNaN(v) || !isFinite(v)) return "—";
  return v.toFixed(1) + "%";
}

function formatAxisY(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

// ── Color palettes ────────────────────────────────────────────────────────────

const EXPENSE_COLORS = [
  "#EF4444","#F59E0B","#8B5CF6","#EC4899",
  "#6B7A99","#14B8A6","#F97316","#84CC16",
];

const INCOME_COLORS = [
  "#22C55E","#4F7FFF","#A855F7","#F59E0B","#14B8A6",
];

// ── Custom tooltips ───────────────────────────────────────────────────────────

function MonthlyTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const income   = payload.find((p) => p.dataKey === "income")?.value   ?? 0;
  const expenses = payload.find((p) => p.dataKey === "expenses")?.value ?? 0;
  const profit   = payload.find((p) => p.dataKey === "profit")?.value   ?? 0;
  return (
    <div className="bg-[#111827] border border-[#1E2A45] rounded-lg p-3 text-sm shadow-xl">
      <p className="font-syne font-semibold text-[#E8ECF4] mb-2">{label}</p>
      <p className="text-[#22C55E]">Income: {formatCurrency(income)}</p>
      <p className="text-[#EF4444]">Expenses: {formatCurrency(expenses)}</p>
      <p style={{ color: profit >= 0 ? "#4F7FFF" : "#EF4444" }}>
        Profit: {formatCurrency(profit)}
      </p>
    </div>
  );
}

function ProfitTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const profit = payload[0]?.value ?? 0;
  return (
    <div className="bg-[#111827] border border-[#1E2A45] rounded-lg p-3 text-sm shadow-xl">
      <p className="font-syne font-semibold text-[#E8ECF4] mb-1">{label}</p>
      <p style={{ color: profit >= 0 ? "#4F7FFF" : "#EF4444" }}>
        Net Profit: {formatCurrency(profit)}
      </p>
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean | null;
}) {
  const color =
    positive === null ? "#6B7A99" : positive ? "#22C55E" : "#EF4444";
  const Icon =
    positive === false ? TrendingDown : TrendingUp;
  return (
    <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-5">
      <p className="text-sm text-[#6B7A99] mb-3">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold leading-none" style={{ color }}>
          {value}
        </p>
        <Icon className="h-5 w-5 flex-shrink-0" style={{ color }} />
      </div>
    </div>
  );
}

// ── Category donut + table ────────────────────────────────────────────────────

function CategoryBreakdown({
  title,
  data,
  colors,
}: {
  title: string;
  data: CategoryData[];
  colors: string[];
}) {
  return (
    <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
      <h2 className="font-syne text-lg font-semibold text-[#E8ECF4] mb-4">
        {title}
      </h2>
      {data.length === 0 ? (
        <p className="text-[#6B7A99] text-sm text-center py-12">No data</p>
      ) : (
        <>
          {/* Donut chart */}
          <div className="flex justify-center mb-5">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {data.map((_, index) => (
                    <Cell
                      key={index}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as CategoryData;
                    return (
                      <div className="bg-[#111827] border border-[#1E2A45] rounded-lg p-2 text-xs shadow-xl">
                        <p className="text-[#E8ECF4] font-medium">{d.category}</p>
                        <p className="text-[#6B7A99]">
                          {formatCurrency(d.amount)} ({d.percentage.toFixed(1)}%)
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E2A45]">
                <th className="text-left py-2 text-[#6B7A99] font-medium">
                  Category
                </th>
                <th className="text-right py-2 text-[#6B7A99] font-medium">
                  Amount
                </th>
                <th className="text-right py-2 text-[#6B7A99] font-medium">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.category} className="border-b border-[#1E2A45]">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      />
                      <span className="text-[#E8ECF4]">{row.category}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-[#E8ECF4]">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="py-2 text-right text-[#6B7A99]">
                    {row.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

interface Props {
  initialData: ReportData;
  initialYear: number;
  initialAccounts: BankAccount[];
}

export default function ReportsClient({ initialData, initialYear, initialAccounts }: Props) {
  const [data, setData] = useState<ReportData>(initialData);
  const [year, setYear] = useState(initialYear);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const { monthly, expensesByCategory, incomeByCategory, totals, availableYears } = data;
  const hasData = totals.income > 0 || totals.expenses > 0;

  function refetch(newYear: number, newAccountId: string) {
    startTransition(async () => {
      const newData = await getReportData(newYear, newAccountId || undefined);
      setData(newData);
    });
  }

  function handleYearChange(newYear: number) {
    setYear(newYear);
    refetch(newYear, selectedAccountId);
  }

  function handleAccountChange(newAccountId: string) {
    setSelectedAccountId(newAccountId);
    refetch(year, newAccountId);
  }

  function handleExportPDF() {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  }

  const monthlyWithMargin = monthly.map((m) => ({
    ...m,
    margin: m.income > 0 ? (m.profit / m.income) * 100 : NaN,
  }));

  const yearsToShow = availableYears.length > 0 ? availableYears : [year];

  return (
    <div
      className="transition-opacity duration-200"
      style={{ opacity: isPending ? 0.5 : 1 }}
    >
      {/* Coming soon toast */}
      {showComingSoon && (
        <div className="fixed top-4 right-4 z-50 bg-[#111827] border border-[#1E2A45] rounded-lg px-4 py-3 text-sm text-[#E8ECF4] shadow-xl">
          PDF export coming soon!
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-syne text-3xl font-bold text-[#E8ECF4]">
            Profit & Loss Report
          </h1>
          <p className="text-sm text-[#6B7A99] mt-1">Cash basis accounting</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Account filter */}
          {initialAccounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="bg-[#111827] border border-[#1E2A45] text-[#E8ECF4] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF] cursor-pointer"
            >
              <option value="">All Accounts</option>
              {initialAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} — {acc.name}
                </option>
              ))}
            </select>
          )}
          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="bg-[#111827] border border-[#1E2A45] text-[#E8ECF4] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF] cursor-pointer"
          >
            {yearsToShow.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7A99] border border-[#1E2A45] rounded-lg hover:text-[#E8ECF4] hover:border-[#4F7FFF] transition-colors"
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7A99] border border-[#1E2A45] rounded-lg hover:text-[#E8ECF4] hover:border-[#4F7FFF] transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!hasData ? (
        <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-12 text-center">
          <p className="text-[#E8ECF4] text-lg mb-2">
            No transactions found for {year}.
          </p>
          <p className="text-[#6B7A99] text-sm mb-6">
            Import your bank transactions to see your P&L report.
          </p>
          <Link
            href="/dashboard/bookkeeping"
            className="inline-flex items-center px-5 py-2.5 bg-[#4F7FFF] text-white text-sm font-medium rounded-lg hover:bg-[#3D6AE0] transition-colors"
          >
            Import Transactions
          </Link>
        </div>
      ) : (
        <>
          {/* ── Summary cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              label="Total Revenue"
              value={formatCurrency(totals.income)}
              positive={true}
            />
            <SummaryCard
              label="Total Expenses"
              value={formatCurrency(totals.expenses)}
              positive={false}
            />
            <SummaryCard
              label="Net Profit"
              value={formatCurrency(totals.profit)}
              positive={totals.profit >= 0}
            />
            <SummaryCard
              label="Profit Margin"
              value={formatPct(totals.profitMargin)}
              positive={
                isNaN(totals.profitMargin)
                  ? null
                  : totals.profitMargin >= 0
              }
            />
          </div>

          {/* ── Monthly Overview (ComposedChart) ───────────────────────────── */}
          <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6 mb-6">
            <h2 className="font-syne text-lg font-semibold text-[#E8ECF4] mb-4">
              Monthly Overview
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={monthly}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2A45" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#6B7A99", fontSize: 12 }}
                  axisLine={{ stroke: "#1E2A45" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisY}
                  tick={{ fill: "#6B7A99", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<MonthlyTooltip />} />
                <Legend
                  wrapperStyle={{ color: "#6B7A99", paddingTop: "16px", fontSize: "13px" }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#22C55E"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#EF4444"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  stroke="#4F7FFF"
                  strokeWidth={2.5}
                  dot={{ fill: "#4F7FFF", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ── Profit Trend (AreaChart) ───────────────────────────────────── */}
          <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6 mb-6">
            <h2 className="font-syne text-lg font-semibold text-[#E8ECF4] mb-4">
              Profit Trend
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={monthly}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F7FFF" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4F7FFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2A45" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#6B7A99", fontSize: 12 }}
                  axisLine={{ stroke: "#1E2A45" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisY}
                  tick={{ fill: "#6B7A99", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ProfitTooltip />} />
                <ReferenceLine y={0} stroke="#6B7A99" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  stroke="#4F7FFF"
                  strokeWidth={2.5}
                  fill="url(#profitGradient)"
                  dot={{ fill: "#4F7FFF", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Category breakdowns ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CategoryBreakdown
              title="Expenses by Category"
              data={expensesByCategory}
              colors={EXPENSE_COLORS}
            />
            <CategoryBreakdown
              title="Income by Category"
              data={incomeByCategory}
              colors={INCOME_COLORS}
            />
          </div>

          {/* ── Monthly Detail Table ───────────────────────────────────────── */}
          <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
            <h2 className="font-syne text-lg font-semibold text-[#E8ECF4] mb-4">
              Monthly Detail
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E2A45]">
                    <th className="text-left py-3 px-4 text-[#6B7A99] font-medium">
                      Month
                    </th>
                    <th className="text-right py-3 px-4 text-[#6B7A99] font-medium">
                      Income
                    </th>
                    <th className="text-right py-3 px-4 text-[#6B7A99] font-medium">
                      Expenses
                    </th>
                    <th className="text-right py-3 px-4 text-[#6B7A99] font-medium">
                      Net Profit
                    </th>
                    <th className="text-right py-3 px-4 text-[#6B7A99] font-medium">
                      Margin %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyWithMargin.map((row, i) => (
                    <tr
                      key={row.month}
                      className="border-b border-[#1E2A45]"
                      style={{ backgroundColor: i % 2 === 1 ? "#0D1526" : undefined }}
                    >
                      <td className="py-3 px-4 text-[#E8ECF4]">{row.month}</td>
                      <td className="py-3 px-4 text-right text-[#22C55E]">
                        {formatCurrency(row.income)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#EF4444]">
                        {formatCurrency(row.expenses)}
                      </td>
                      <td
                        className="py-3 px-4 text-right font-medium"
                        style={{ color: row.profit >= 0 ? "#22C55E" : "#EF4444" }}
                      >
                        {formatCurrency(row.profit)}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        style={{
                          color:
                            isNaN(row.margin) || row.margin >= 0
                              ? "#22C55E"
                              : "#EF4444",
                        }}
                      >
                        {formatPct(row.margin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#4F7FFF]">
                    <td className="py-3 px-4 font-bold text-[#E8ECF4]">Total</td>
                    <td className="py-3 px-4 text-right font-bold text-[#22C55E]">
                      {formatCurrency(totals.income)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#EF4444]">
                      {formatCurrency(totals.expenses)}
                    </td>
                    <td
                      className="py-3 px-4 text-right font-bold"
                      style={{ color: totals.profit >= 0 ? "#22C55E" : "#EF4444" }}
                    >
                      {formatCurrency(totals.profit)}
                    </td>
                    <td
                      className="py-3 px-4 text-right font-bold"
                      style={{
                        color:
                          isNaN(totals.profitMargin) || totals.profitMargin >= 0
                            ? "#22C55E"
                            : "#EF4444",
                      }}
                    >
                      {formatPct(totals.profitMargin)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
