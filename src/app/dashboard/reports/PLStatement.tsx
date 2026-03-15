"use client";

import type { StatementData } from "./actions";
import type { BankAccount } from "../accounts/actions";

// ── Formatting ────────────────────────────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmt(v: number): string {
  if (v === 0) return "—";
  return fmtCurrency.format(v);
}

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadStatementCSV(statement: StatementData, year: number) {
  const {
    months, incomeRows, totalIncome, totalIncomeAnnual,
    cogsRows, totalCogs, totalCogsAnnual,
    grossProfit, grossProfitAnnual,
    expenseRows, totalExpenses, totalExpensesAnnual,
    netOperatingIncome, netOperatingIncomeAnnual,
    netIncome, netIncomeAnnual, dateRange,
  } = statement;

  const rows: string[][] = [];
  const header = ["", ...months, "Total"];
  const csvVal = (v: number) => v === 0 ? "" : v.toFixed(2);

  rows.push(["Profit and Loss"]);
  rows.push([dateRange]);
  rows.push([]);
  rows.push(header);

  rows.push(["INCOME"]);
  for (const r of incomeRows) {
    rows.push([r.category, ...r.monthly.map(csvVal), csvVal(r.total)]);
  }
  rows.push(["Total Income", ...totalIncome.map(csvVal), csvVal(totalIncomeAnnual)]);
  rows.push([]);

  rows.push(["COST OF GOODS SOLD"]);
  for (const r of cogsRows) {
    rows.push([r.category, ...r.monthly.map(csvVal), csvVal(r.total)]);
  }
  rows.push(["Total COGS", ...totalCogs.map(csvVal), csvVal(totalCogsAnnual)]);
  rows.push([]);

  rows.push(["Gross Profit", ...grossProfit.map(csvVal), csvVal(grossProfitAnnual)]);
  rows.push([]);

  rows.push(["OPERATING EXPENSES"]);
  for (const r of expenseRows) {
    rows.push([r.category, ...r.monthly.map(csvVal), csvVal(r.total)]);
  }
  rows.push(["Total Expenses", ...totalExpenses.map(csvVal), csvVal(totalExpensesAnnual)]);
  rows.push([]);

  rows.push(["Net Operating Income", ...netOperatingIncome.map(csvVal), csvVal(netOperatingIncomeAnnual)]);
  rows.push([]);

  rows.push(["Net Income", ...netIncome.map(csvVal), csvVal(netIncomeAnnual)]);

  const csv = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PL_Statement_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sticky shadow constants ────────────────────────────────────────────────────

const stickyLeft = { boxShadow: '4px 0 8px rgba(0,0,0,0.3)' } as const;
const stickyRight = { boxShadow: '-4px 0 8px rgba(0,0,0,0.3)' } as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeaderRow({ label, colCount }: { label: string; colCount: number }) {
  return (
    <tr className="bg-[#0A0F1E]">
      <td
        className="sticky left-0 bg-[#0A0F1E] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#6B7A99] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="bg-[#0A0F1E]" />
      ))}
      <td
        className="sticky right-0 bg-[#0A0F1E] border-l border-[#1E2A45] min-w-[110px] z-10"
        style={stickyRight}
      />
    </tr>
  );
}

function SpacerRow({ colCount }: { colCount: number }) {
  return (
    <tr className="h-3 bg-transparent">
      <td colSpan={colCount + 2} />
    </tr>
  );
}

interface CategoryRowProps {
  label: string;
  monthly: number[];
  total: number;
  indent?: boolean;
  muted?: boolean;
}

function CategoryRow({ label, monthly, total, indent = true, muted = false }: CategoryRowProps) {
  return (
    <tr className="hover:bg-[#1E2A45]/20 transition-colors">
      <td
        className={`sticky left-0 bg-[#111827] px-4 py-1.5 text-sm min-w-[180px] lg:min-w-[220px] z-10 ${indent ? "pl-8" : "pl-4"} ${muted ? "text-[#6B7A99] italic" : "text-[#E8ECF4]"}`}
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => (
        <td
          key={i}
          className={`px-3 py-1.5 text-right text-sm min-w-[80px] lg:min-w-[100px] tabular-nums ${
            muted ? "text-[#6B7A99]" : v === 0 ? "text-[#6B7A99]" : v < 0 ? "text-[#EF4444]" : "text-[#E8ECF4]"
          }`}
        >
          {muted ? "—" : fmt(v)}
        </td>
      ))}
      <td
        className={`sticky right-0 bg-[#111827] px-3 py-1.5 text-right text-sm font-semibold min-w-[110px] tabular-nums border-l border-[#1E2A45] z-10 ${
          muted ? "text-[#6B7A99]" : total === 0 ? "text-[#6B7A99]" : total < 0 ? "text-[#EF4444]" : "text-[#E8ECF4]"
        }`}
        style={stickyRight}
      >
        {muted ? "—" : fmt(total)}
      </td>
    </tr>
  );
}

interface TotalRowProps {
  label: string;
  monthly: number[];
  total: number;
}

function TotalRow({ label, monthly, total }: TotalRowProps) {
  return (
    <tr className="bg-[#111827] border-t border-[#1E2A45]">
      <td
        className="sticky left-0 bg-[#111827] px-4 py-2 text-sm font-semibold text-[#E8ECF4] min-w-[180px] lg:min-w-[220px] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => (
        <td
          key={i}
          className={`px-3 py-2 text-right text-sm font-semibold min-w-[80px] lg:min-w-[100px] tabular-nums ${
            v === 0 ? "text-[#6B7A99]" : v < 0 ? "text-[#EF4444]" : "text-[#E8ECF4]"
          }`}
        >
          {fmt(v)}
        </td>
      ))}
      <td
        className={`sticky right-0 bg-[#111827] px-3 py-2 text-right text-sm font-semibold min-w-[110px] tabular-nums border-l border-[#1E2A45] z-10 ${
          total === 0 ? "text-[#6B7A99]" : total < 0 ? "text-[#EF4444]" : "text-[#E8ECF4]"
        }`}
        style={stickyRight}
      >
        {fmt(total)}
      </td>
    </tr>
  );
}

// Gross Profit row — blue when positive (distinguishes from Net Income)
function GrossProfitRow({ label, monthly, total }: TotalRowProps) {
  const color = total > 0 ? "#4F7FFF" : total < 0 ? "#EF4444" : "#6B7A99";
  return (
    <tr className="bg-[#0A0F1E] border-t-2 border-[#4F7FFF]">
      <td
        className="sticky left-0 bg-[#0A0F1E] px-4 py-2.5 text-base font-bold font-syne text-[#E8ECF4] min-w-[180px] lg:min-w-[220px] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => {
        const c = v > 0 ? "#4F7FFF" : v < 0 ? "#EF4444" : "#6B7A99";
        return (
          <td
            key={i}
            className="px-3 py-2.5 text-right text-sm font-bold min-w-[80px] lg:min-w-[100px] tabular-nums"
            style={{ color: c }}
          >
            {fmt(v)}
          </td>
        );
      })}
      <td
        className="sticky right-0 bg-[#0A0F1E] px-3 py-2.5 text-right text-base font-bold min-w-[110px] tabular-nums border-l border-[#1E2A45] z-10"
        style={{ color, ...stickyRight }}
      >
        {fmt(total)}
      </td>
    </tr>
  );
}

// Net Operating Income row — green/red, medium emphasis
function NetOperatingIncomeRow({ label, monthly, total }: TotalRowProps) {
  const color = total > 0 ? "#22C55E" : total < 0 ? "#EF4444" : "#6B7A99";
  return (
    <tr className="bg-[#0A0F1E] border-t-2 border-[#1E2A45]">
      <td
        className="sticky left-0 bg-[#0A0F1E] px-4 py-2.5 text-sm font-bold font-syne text-[#E8ECF4] min-w-[180px] lg:min-w-[220px] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => {
        const c = v > 0 ? "#22C55E" : v < 0 ? "#EF4444" : "#6B7A99";
        return (
          <td
            key={i}
            className="px-3 py-2.5 text-right text-sm font-bold min-w-[80px] lg:min-w-[100px] tabular-nums"
            style={{ color: c }}
          >
            {fmt(v)}
          </td>
        );
      })}
      <td
        className="sticky right-0 bg-[#0A0F1E] px-3 py-2.5 text-right text-sm font-bold min-w-[110px] tabular-nums border-l border-[#1E2A45] z-10"
        style={{ color, ...stickyRight }}
      >
        {fmt(total)}
      </td>
    </tr>
  );
}

// Net Income row — most prominent row on the statement
function NetIncomeRow({ label, monthly, total }: TotalRowProps) {
  const color = total > 0 ? "#22C55E" : total < 0 ? "#EF4444" : "#6B7A99";
  return (
    <tr className="bg-[#0A0F1E] border-t-4 border-[#E8ECF4]">
      <td
        className="sticky left-0 bg-[#0A0F1E] px-4 py-3 text-base font-bold font-syne text-[#E8ECF4] min-w-[180px] lg:min-w-[220px] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => {
        const c = v > 0 ? "#22C55E" : v < 0 ? "#EF4444" : "#6B7A99";
        return (
          <td
            key={i}
            className="px-3 py-3 text-right text-sm font-bold min-w-[80px] lg:min-w-[100px] tabular-nums"
            style={{ color: c }}
          >
            {fmt(v)}
          </td>
        );
      })}
      <td
        className="sticky right-0 bg-[#0A0F1E] px-3 py-3 text-right text-base font-bold min-w-[110px] tabular-nums border-l border-[#1E2A45] z-10"
        style={{ color, ...stickyRight }}
      >
        {fmt(total)}
      </td>
    </tr>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PLStatementProps {
  statement: StatementData;
  year: number;
  accounts: BankAccount[];
  selectedAccountId: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PLStatement({ statement, year }: PLStatementProps) {
  const {
    months,
    incomeRows,
    totalIncome,
    totalIncomeAnnual,
    cogsRows,
    totalCogs,
    totalCogsAnnual,
    grossProfit,
    grossProfitAnnual,
    expenseRows,
    totalExpenses,
    totalExpensesAnnual,
    netOperatingIncome,
    netOperatingIncomeAnnual,
    netIncome,
    netIncomeAnnual,
    dateRange,
  } = statement;

  const colCount = months.length;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-white { background: white !important; color: black !important; }
          body { background: white; color: black; }
          table { font-size: 10px; }
          .overflow-x-auto { overflow: visible !important; }
        }
      `}</style>

      <div className="w-full bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
        {/* Statement header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="font-syne text-xl font-bold text-[#E8ECF4]">Your Business</h2>
            <p className="text-sm text-[#6B7A99]">Profit and Loss</p>
            <p className="text-sm text-[#6B7A99] mt-0.5">{dateRange}</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7A99] border border-[#1E2A45] rounded-lg hover:text-[#E8ECF4] hover:border-[#4F7FFF] transition-colors"
            >
              Print
            </button>
            <button
              onClick={() => downloadStatementCSV(statement, year)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7A99] border border-[#1E2A45] rounded-lg hover:text-[#E8ECF4] hover:border-[#4F7FFF] transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-[#1E2A45]">
                <th
                  className="sticky left-0 bg-[#111827] px-4 py-3 text-left text-xs font-medium text-[#6B7A99] uppercase tracking-wider min-w-[180px] lg:min-w-[220px] z-10"
                  style={stickyLeft}
                />
                {months.map((m) => (
                  <th
                    key={m}
                    className="px-3 py-3 text-right text-xs font-medium text-[#6B7A99] uppercase tracking-wider min-w-[80px] lg:min-w-[100px]"
                  >
                    {m}
                  </th>
                ))}
                <th
                  className="sticky right-0 bg-[#111827] border-l border-[#1E2A45] min-w-[110px] text-right px-4 py-3 text-[#6B7A99] font-medium text-xs z-10"
                  style={stickyRight}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 1. INCOME */}
              <SectionHeaderRow label="Income" colCount={colCount} />
              {incomeRows.length === 0 ? (
                <CategoryRow
                  label="No income recorded"
                  monthly={new Array(colCount).fill(0)}
                  total={0}
                  muted
                />
              ) : (
                incomeRows.map((row) => (
                  <CategoryRow
                    key={row.category}
                    label={row.category}
                    monthly={row.monthly}
                    total={row.total}
                  />
                ))
              )}
              <TotalRow label="Total Income" monthly={totalIncome} total={totalIncomeAnnual} />

              <SpacerRow colCount={colCount} />

              {/* 2. COST OF GOODS SOLD */}
              <SectionHeaderRow label="Cost of Goods Sold" colCount={colCount} />
              {cogsRows.length === 0 ? (
                <CategoryRow
                  label="No cost of goods sold"
                  monthly={new Array(colCount).fill(0)}
                  total={0}
                  muted
                />
              ) : (
                cogsRows.map((row) => (
                  <CategoryRow
                    key={row.category}
                    label={row.category}
                    monthly={row.monthly}
                    total={row.total}
                  />
                ))
              )}
              <TotalRow label="Total COGS" monthly={totalCogs} total={totalCogsAnnual} />

              <SpacerRow colCount={colCount} />

              {/* 3. GROSS PROFIT */}
              <GrossProfitRow label="Gross Profit" monthly={grossProfit} total={grossProfitAnnual} />

              <SpacerRow colCount={colCount} />

              {/* 4. OPERATING EXPENSES */}
              <SectionHeaderRow label="Operating Expenses" colCount={colCount} />
              {expenseRows.length === 0 ? (
                <CategoryRow
                  label="No expenses recorded"
                  monthly={new Array(colCount).fill(0)}
                  total={0}
                  muted
                />
              ) : (
                expenseRows.map((row) => (
                  <CategoryRow
                    key={row.category}
                    label={row.category}
                    monthly={row.monthly}
                    total={row.total}
                  />
                ))
              )}
              <TotalRow label="Total Expenses" monthly={totalExpenses} total={totalExpensesAnnual} />

              <SpacerRow colCount={colCount} />

              {/* 5. NET OPERATING INCOME */}
              <NetOperatingIncomeRow
                label="Net Operating Income"
                monthly={netOperatingIncome}
                total={netOperatingIncomeAnnual}
              />

              <SpacerRow colCount={colCount} />

              {/* 6. NET INCOME */}
              <NetIncomeRow label="Net Income" monthly={netIncome} total={netIncomeAnnual} />
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
