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
import { getReportData, getBalanceSheetData } from "./actions";
import type { ReportData, CategoryData, BalanceSheetData } from "./actions";
import type { BankAccount } from "../accounts/actions";
import PLStatement from "./PLStatement";
import BalanceSheet from "./BalanceSheet";

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
    <div className="bg-white border border-[#dde4ef] rounded-lg p-3 text-sm shadow-xl">
      <p className="font-syne font-semibold text-[#193764] mb-2">{label}</p>
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
    <div className="bg-white border border-[#dde4ef] rounded-lg p-3 text-sm shadow-xl">
      <p className="font-syne font-semibold text-[#193764] mb-1">{label}</p>
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
    <div className="bg-white border border-[#dde4ef] rounded-xl p-5">
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
    <div className="bg-white border border-[#dde4ef] rounded-xl p-6">
      <h2 className="font-syne text-lg font-semibold text-[#193764] mb-4">
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
                      <div className="bg-white border border-[#dde4ef] rounded-lg p-2 text-xs shadow-xl">
                        <p className="text-[#193764] font-medium">{d.category}</p>
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
              <tr className="border-b border-[#dde4ef]">
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
                <tr key={row.category} className="border-b border-[#dde4ef]">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      />
                      <span className="text-[#193764]">{row.category}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-[#193764]">
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
  initialBalanceData: BalanceSheetData;
  businessName?: string;
}

export default function ReportsClient({ initialData, initialYear, initialAccounts, initialBalanceData, businessName = "Your Business" }: Props) {
  const [data, setData] = useState<ReportData>(initialData);
  const [year, setYear] = useState(initialYear);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"overview" | "statement" | "balance">("overview");
  const [balanceAsOfDate, setBalanceAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [balanceData, setBalanceData] = useState<BalanceSheetData>(initialBalanceData);

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
    document.body.classList.add("printing-pdf");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-pdf");
    }, 100);
  }

  function handleBalanceDateChange(newDate: string) {
    setBalanceAsOfDate(newDate);
    startTransition(async () => {
      const fresh = await getBalanceSheetData(newDate);
      setBalanceData(fresh);
    });
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
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-syne text-3xl font-bold text-[#193764]">
            Reports
          </h1>
          <p className="text-sm text-[#6B7A99] mt-1">
            {activeTab === "overview" && "Profit & Loss Overview"}
            {activeTab === "statement" && "Profit & Loss Statement"}
            {activeTab === "balance" && "Balance Sheet"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Account filter — hidden on balance sheet tab */}
          {activeTab !== "balance" && initialAccounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="bg-white border border-[#dde4ef] text-[#193764] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF] cursor-pointer"
            >
              <option value="">All Accounts</option>
              {initialAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} — {acc.name}
                </option>
              ))}
            </select>
          )}
          {/* Year selector — hidden on balance sheet tab */}
          {activeTab !== "balance" && (
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-white border border-[#dde4ef] text-[#193764] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF] cursor-pointer"
            >
              {yearsToShow.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {activeTab === "statement" && (
            <>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7A99] border border-[#dde4ef] rounded-lg hover:text-[#193764] hover:border-[#4F7FFF] transition-colors"
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7A99] border border-[#dde4ef] rounded-lg hover:text-[#193764] hover:border-[#4F7FFF] transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab switcher ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 no-print">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "overview"
              ? "bg-white border border-[#dde4ef] text-[#193764] font-medium"
              : "text-[#6B7A99] hover:text-[#193764]"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("statement")}
          className={`px-5 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "statement"
              ? "bg-white border border-[#dde4ef] text-[#193764] font-medium"
              : "text-[#6B7A99] hover:text-[#193764]"
          }`}
        >
          P&amp;L Statement
        </button>
        <button
          onClick={() => setActiveTab("balance")}
          className={`px-5 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "balance"
              ? "bg-white border border-[#dde4ef] text-[#193764] font-medium"
              : "text-[#6B7A99] hover:text-[#193764]"
          }`}
        >
          Balance Sheet
        </button>
      </div>

      {/* ── P&L Statement tab ─────────────────────────────────────────────── */}
      {activeTab === "statement" && (
        <PLStatement
          statement={data.statement}
          year={year}
          accounts={initialAccounts}
          selectedAccountId={selectedAccountId}
          businessName={businessName}
        />
      )}

      {/* ── Balance Sheet tab ──────────────────────────────────────────────── */}
      {activeTab === "balance" && (
        <BalanceSheet
          data={balanceData}
          asOfDate={balanceAsOfDate}
          onDateChange={handleBalanceDateChange}
          businessName={businessName}
        />
      )}

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === "overview" && (!hasData ? (
        <div className="bg-white border border-[#dde4ef] rounded-xl p-12 text-center">
          <p className="text-[#193764] text-lg mb-2">
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
          <div className="bg-white border border-[#dde4ef] rounded-xl p-6 mb-6">
            <h2 className="font-syne text-lg font-semibold text-[#193764] mb-4">
              Monthly Overview
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={monthly}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dde4ef" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#6B7A99", fontSize: 12 }}
                  axisLine={{ stroke: "#dde4ef" }}
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
          <div className="bg-white border border-[#dde4ef] rounded-xl p-6 mb-6">
            <h2 className="font-syne text-lg font-semibold text-[#193764] mb-4">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#dde4ef" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#6B7A99", fontSize: 12 }}
                  axisLine={{ stroke: "#dde4ef" }}
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
          <div className="bg-white border border-[#dde4ef] rounded-xl p-6">
            <h2 className="font-syne text-lg font-semibold text-[#193764] mb-4">
              Monthly Detail
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dde4ef]">
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
                      className="border-b border-[#dde4ef]"
                      style={{ backgroundColor: i % 2 === 1 ? "#f5f4f2" : undefined }}
                    >
                      <td className="py-3 px-4 text-[#193764]">{row.month}</td>
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
                    <td className="py-3 px-4 font-bold text-[#193764]">Total</td>
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
      ))}
    </div>
  );
}
