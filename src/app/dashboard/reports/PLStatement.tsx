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

const stickyLeft  = { boxShadow: '4px 0 8px rgba(25,55,100,0.06)'  } as const;
const stickyRight = { boxShadow: '-4px 0 8px rgba(25,55,100,0.06)' } as const;

// ── Amount color helper ───────────────────────────────────────────────────────
// Returns navy for all standard table/ledger amounts.
// Green/red is reserved for the grand-total callout rows (NetIncomeRow, etc.)
// which use inline styles directly.
function amtClass(v: number, muted = false): string {
  if (muted) return "text-[#6B7280]";
  return "text-[#193764]";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeaderRow({ label, colCount }: { label: string; colCount: number }) {
  return (
    <tr className="section-header bg-[#e8eef6]">
      <td
        className="sticky left-0 bg-[#e8eef6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#193764] font-sans z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="bg-[#e8eef6]" />
      ))}
      <td
        className="sticky right-0 bg-[#e8eef6] border-l border-[#dde4ef] min-w-[110px] z-10"
        style={stickyRight}
      />
    </tr>
  );
}

function SpacerRow({ colCount }: { colCount: number }) {
  return (
    <tr className="section-spacer h-3 bg-transparent">
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
    <tr className="hover:bg-[#f0f4fa] transition-colors">
      <td
        className={`sticky left-0 bg-white px-4 py-1.5 text-sm font-sans min-w-[180px] lg:min-w-[220px] z-10 ${indent ? "pl-8" : "pl-4"} ${muted ? "text-[#6B7280] italic" : "text-[#193764]"}`}
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => (
        <td
          key={i}
          className={`px-3 py-1.5 text-right text-sm min-w-[80px] lg:min-w-[100px] font-accounting tabular-nums ${amtClass(v, muted)}`}
        >
          {muted ? "—" : fmt(v)}
        </td>
      ))}
      <td
        className={`sticky right-0 bg-white px-3 py-1.5 text-right text-sm font-semibold font-accounting min-w-[110px] tabular-nums border-l border-[#dde4ef] z-10 ${amtClass(total, muted)}`}
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
    <tr className="total-row bg-[#f0f4fa] border-t border-[#dde4ef]">
      <td
        className="sticky left-0 bg-[#f0f4fa] px-4 py-2 text-sm font-semibold text-[#193764] font-sans min-w-[180px] lg:min-w-[220px] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => (
        <td
          key={i}
          className={`px-3 py-2 text-right text-sm font-semibold font-accounting min-w-[80px] lg:min-w-[100px] tabular-nums ${amtClass(v)}`}
        >
          {fmt(v)}
        </td>
      ))}
      <td
        className={`sticky right-0 bg-[#f0f4fa] px-3 py-2 text-right text-sm font-semibold font-accounting min-w-[110px] tabular-nums border-l border-[#dde4ef] z-10 ${amtClass(total)}`}
        style={stickyRight}
      >
        {fmt(total)}
      </td>
    </tr>
  );
}

// Gross Profit row
function GrossProfitRow({ label, monthly, total }: TotalRowProps) {
  const color = total > 0 ? "#1a7a40" : total < 0 ? "#C0392B" : "#193764";
  return (
    <tr className="grand-total-row bg-[#e8eef6] border-t-2 border-[#193764]">
      <td
        className="sticky left-0 bg-[#e8eef6] px-4 py-2.5 text-base font-bold font-sans text-[#193764] min-w-[180px] lg:min-w-[220px] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => {
        const c = v > 0 ? "#1a7a40" : v < 0 ? "#C0392B" : "#193764";
        return (
          <td
            key={i}
            className={`px-3 py-2.5 text-right text-sm font-bold font-accounting min-w-[80px] lg:min-w-[100px] tabular-nums ${v > 0 ? "print-positive" : v < 0 ? "print-negative" : ""}`}
            style={{ color: c }}
          >
            {fmt(v)}
          </td>
        );
      })}
      <td
        className={`sticky right-0 bg-[#e8eef6] px-3 py-2.5 text-right text-base font-bold font-accounting min-w-[110px] tabular-nums border-l border-[#dde4ef] z-10 ${total > 0 ? "print-positive" : total < 0 ? "print-negative" : ""}`}
        style={{ color, ...stickyRight }}
      >
        {fmt(total)}
      </td>
    </tr>
  );
}

// Net Operating Income row
function NetOperatingIncomeRow({ label, monthly, total }: TotalRowProps) {
  const color = total > 0 ? "#1a7a40" : total < 0 ? "#C0392B" : "#193764";
  return (
    <tr className="grand-total-row bg-[#e8eef6] border-t-2 border-[#193764]">
      <td
        className="sticky left-0 bg-[#e8eef6] px-4 py-2.5 text-sm font-bold font-sans text-[#193764] min-w-[180px] lg:min-w-[220px] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => {
        const c = v > 0 ? "#1a7a40" : v < 0 ? "#C0392B" : "#193764";
        return (
          <td
            key={i}
            className={`px-3 py-2.5 text-right text-sm font-bold font-accounting min-w-[80px] lg:min-w-[100px] tabular-nums ${v > 0 ? "print-positive" : v < 0 ? "print-negative" : ""}`}
            style={{ color: c }}
          >
            {fmt(v)}
          </td>
        );
      })}
      <td
        className={`sticky right-0 bg-[#e8eef6] px-3 py-2.5 text-right text-sm font-bold font-accounting min-w-[110px] tabular-nums border-l border-[#dde4ef] z-10 ${total > 0 ? "print-positive" : total < 0 ? "print-negative" : ""}`}
        style={{ color, ...stickyRight }}
      >
        {fmt(total)}
      </td>
    </tr>
  );
}

// Net Income row — most prominent
function NetIncomeRow({ label, monthly, total }: TotalRowProps) {
  const color = total > 0 ? "#1a7a40" : total < 0 ? "#C0392B" : "#193764";
  return (
    <tr className="grand-total-row bg-[#e8eef6] border-t-2 border-[#193764]">
      <td
        className="sticky left-0 bg-[#e8eef6] px-4 py-3 text-base font-bold font-sans text-[#193764] min-w-[180px] lg:min-w-[220px] z-10"
        style={stickyLeft}
      >
        {label}
      </td>
      {monthly.map((v, i) => {
        const c = v > 0 ? "#1a7a40" : v < 0 ? "#C0392B" : "#193764";
        return (
          <td
            key={i}
            className={`px-3 py-3 text-right text-sm font-bold font-accounting min-w-[80px] lg:min-w-[100px] tabular-nums ${v > 0 ? "print-positive" : v < 0 ? "print-negative" : ""}`}
            style={{ color: c }}
          >
            {fmt(v)}
          </td>
        );
      })}
      <td
        className={`sticky right-0 bg-[#e8eef6] px-3 py-3 text-right text-base font-bold font-accounting min-w-[110px] tabular-nums border-l border-[#dde4ef] z-10 ${total > 0 ? "print-positive" : total < 0 ? "print-negative" : ""}`}
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
  businessName?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PLStatement({ statement, year, businessName = "Your Business" }: PLStatementProps) {
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
      {/* Comprehensive print stylesheet */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pl-statement-print,
          #pl-statement-print * { visibility: visible; }
          #pl-statement-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          #pl-statement-print button,
          #pl-statement-print .no-print { display: none !important; }
          #pl-statement-print {
            background: white !important;
            color: black !important;
          }
          #pl-statement-print * {
            color: black !important;
            background: white !important;
            border-color: #ddd !important;
          }
          #pl-statement-print .print-positive { color: #166534 !important; }
          #pl-statement-print .print-negative { color: #991b1b !important; }
          #pl-statement-print td.sticky,
          #pl-statement-print th.sticky {
            background: white !important;
            box-shadow: none !important;
          }
          #pl-statement-print table {
            width: 100% !important;
            font-size: 10px !important;
            border-collapse: collapse !important;
          }
          #pl-statement-print th,
          #pl-statement-print td {
            padding: 3px 6px !important;
            border-bottom: 1px solid #eee !important;
            white-space: nowrap !important;
          }
          #pl-statement-print .section-header td {
            background: #f5f5f5 !important;
            font-weight: bold !important;
            font-size: 9px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }
          #pl-statement-print .total-row td {
            font-weight: bold !important;
            border-top: 1px solid #999 !important;
          }
          #pl-statement-print .grand-total-row td {
            font-weight: bold !important;
            font-size: 11px !important;
            border-top: 2px solid #333 !important;
          }
          @page { size: landscape; margin: 0.5in; }
          #pl-statement-print tr { page-break-inside: avoid; }
          #pl-statement-print .section-spacer { page-break-after: auto; }
          #pl-statement-print .overflow-x-auto { overflow: visible !important; }
        }
      `}</style>

      <div id="pl-statement-print" className="w-full bg-white border border-[#dde4ef] rounded-xl overflow-hidden">
        {/* ── Navy header band ─────────────────────────────────────────────── */}
        <div className="bg-[#193764] px-6 py-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="font-sans font-semibold text-2xl text-white print:text-black print:text-xl">
              {businessName}
            </h2>
            <p className="text-[#b8ccdf] print:text-gray-600">Profit and Loss Statement</p>
            <p className="text-[#b8ccdf] text-sm print:text-gray-600">
              {dateRange} · Cash Basis
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-white/15 border border-white/30 rounded-lg hover:bg-white/25 transition-colors"
            >
              Print
            </button>
            <button
              onClick={() => downloadStatementCSV(statement, year)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-white/15 border border-white/30 rounded-lg hover:bg-white/25 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto relative">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-[#dde4ef]">
                <th
                  className="sticky left-0 bg-[#f0f4fa] px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-[0.06em] font-sans min-w-[180px] lg:min-w-[220px] z-10"
                  style={stickyLeft}
                />
                {months.map((m) => (
                  <th
                    key={m}
                    className="px-3 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-[0.06em] font-sans min-w-[80px] lg:min-w-[100px] bg-[#f0f4fa]"
                  >
                    {m}
                  </th>
                ))}
                <th
                  className="sticky right-0 bg-[#f0f4fa] border-l border-[#dde4ef] min-w-[110px] text-right px-4 py-3 text-[#6B7280] font-semibold text-xs font-sans tracking-[0.06em] z-10"
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
