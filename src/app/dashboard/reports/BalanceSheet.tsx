"use client";

import type { BalanceSheetData, BalanceSheetItem, CashAccount } from "./actions";

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

function amtColor(v: number, isContra = false): string {
  if (v === 0) return "text-[#6B7A99]";
  if (isContra || v < 0) return "text-[#EF4444]";
  return "text-[#E8ECF4]";
}

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCSV(data: BalanceSheetData) {
  const rows: string[][] = [];

  rows.push(["Balance Sheet"]);
  rows.push([`As of ${data.asOfDate}`]);
  rows.push([]);

  rows.push(["ASSETS"]);
  rows.push(["Current Assets"]);
  if (data.cashByAccount.length === 0) {
    rows.push(["  (no bank accounts connected)", ""]);
  } else {
    for (const acc of data.cashByAccount) {
      const suffix = acc.lastFour ? ` ••••${acc.lastFour}` : "";
      const bank = acc.bankName && acc.bankName !== "None" ? `${acc.bankName}${suffix}` : acc.name;
      rows.push([`  ${acc.name}`, acc.balance.toFixed(2)]);
      if (bank !== acc.name) rows.push([`    ${bank}`, ""]);
    }
  }
  rows.push(["Total Assets", data.totalAssets.toFixed(2)]);
  rows.push([]);
  if (data.hasFixedAssets) {
    rows.push(["Fixed Assets"]);
    for (const item of data.fixedAssets) {
      rows.push([`  ${item.label}`, item.amount.toFixed(2)]);
    }
    rows.push(["Total Fixed Assets", data.totalFixedAssets.toFixed(2)]);
    rows.push([]);
  }
  rows.push(["TOTAL ASSETS", data.totalAssets.toFixed(2)]);
  rows.push([]);

  rows.push(["LIABILITIES"]);
  rows.push(["Current Liabilities"]);
  if (data.currentLiabilities.length === 0) {
    rows.push(["  (none)", ""]);
  } else {
    for (const item of data.currentLiabilities) {
      rows.push([`  ${item.label}`, item.amount.toFixed(2)]);
    }
  }
  rows.push(["Total Current Liabilities", data.totalCurrentLiabilities.toFixed(2)]);
  rows.push(["Total Liabilities", data.totalLiabilities.toFixed(2)]);
  rows.push([]);

  rows.push(["EQUITY"]);
  for (const item of data.equityItems) {
    rows.push([`  ${item.label}`, item.amount.toFixed(2)]);
  }
  rows.push(["  Retained Earnings (prior years)", data.retainedEarnings.toFixed(2)]);
  rows.push(["  Current Year Net Income", data.currentYearNetIncome.toFixed(2)]);
  rows.push(["Total Equity", data.totalEquity.toFixed(2)]);
  rows.push([]);
  rows.push(["TOTAL LIABILITIES + EQUITY", data.totalLiabilitiesAndEquity.toFixed(2)]);

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Balance_Sheet_${data.asOfDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Row sub-components ────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="bg-[#0A0F1E] px-4 py-2 text-[#6B7A99] text-xs font-semibold uppercase tracking-wider">
      {label}
    </div>
  );
}

function SubSectionHeader({ label }: { label: string }) {
  return (
    <div className="pl-4 px-4 py-2 text-[#E8ECF4] text-sm font-medium">
      {label}
    </div>
  );
}

function LineItem({ label, amount, isContra = false }: BalanceSheetItem) {
  const color = amtColor(amount, isContra);
  return (
    <div className="flex justify-between items-center pl-8 px-4 py-2 text-sm hover:bg-[#1E2A45]/20 transition-colors">
      <span className="text-[#E8ECF4]">{label}</span>
      <span className={`tabular-nums ${color}`}>{fmt(amount)}</span>
    </div>
  );
}

function EmptyItem({ label }: { label: string }) {
  return (
    <div className="flex justify-between items-center pl-8 px-4 py-2 text-sm text-[#6B7A99] italic">
      <span>{label}</span>
      <span>—</span>
    </div>
  );
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  const color = amtColor(amount);
  return (
    <div className="flex justify-between items-center border-t border-[#1E2A45] px-4 py-2 font-semibold">
      <span className="text-[#E8ECF4] text-sm">{label}</span>
      <span className={`tabular-nums text-sm ${color}`}>{fmt(amount)}</span>
    </div>
  );
}

function GrandTotalRow({ label, amount }: { label: string; amount: number }) {
  const color = amtColor(amount);
  return (
    <div className="flex justify-between items-center border-t-2 border-[#E8ECF4]/20 bg-[#0A0F1E] px-4 py-3 font-bold font-syne text-base">
      <span className="text-[#E8ECF4]">{label}</span>
      <span className={`tabular-nums ${color}`}>{fmt(amount)}</span>
    </div>
  );
}

function CashAccountRow({ acc }: { acc: CashAccount }) {
  const color =
    acc.balance > 0 ? "text-[#E8ECF4]" : acc.balance < 0 ? "text-[#EF4444]" : "text-[#6B7A99]";
  const bankLine = [
    acc.bankName && acc.bankName !== "None" ? acc.bankName : "",
    acc.lastFour ? `••••${acc.lastFour}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex justify-between items-center pl-8 px-4 py-2 hover:bg-[#1E2A45]/20 transition-colors">
      <div>
        <div className="text-sm text-[#E8ECF4]">{acc.name}</div>
        {bankLine && <div className="text-xs text-[#6B7A99]">{bankLine}</div>}
      </div>
      <span className={`tabular-nums text-sm ${color}`}>
        {acc.balance === 0 ? "—" : fmtCurrency.format(acc.balance)}
      </span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  data: BalanceSheetData;
  asOfDate: string;
  onDateChange: (date: string) => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BalanceSheet({ data, asOfDate, onDateChange }: Props) {
  const displayDate = (() => {
    const [year, month, day] = asOfDate.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  })();

  const diff = Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity);
  const inBalance = diff < 0.01;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
        }
      `}</style>

      <div className="w-full bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
        {/* Statement header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="font-syne text-xl font-bold text-[#E8ECF4]">Your Business</h2>
            <p className="text-sm text-[#6B7A99]">Balance Sheet</p>
            <p className="text-sm text-[#6B7A99] mt-0.5">As of {displayDate}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap no-print">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF]"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7A99] border border-[#1E2A45] rounded-lg hover:text-[#E8ECF4] hover:border-[#4F7FFF] transition-colors"
            >
              Print
            </button>
            <button
              onClick={() => downloadCSV(data)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7A99] border border-[#1E2A45] rounded-lg hover:text-[#E8ECF4] hover:border-[#4F7FFF] transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Stacked single-column layout ────────────────────────────────── */}
        <div className="w-full space-y-0 border border-[#1E2A45] rounded-lg overflow-hidden">

          {/* 1. ASSETS ────────────────────────────────────────────────────── */}
          <SectionHeader label="Assets" />

          <SubSectionHeader label="Current Assets" />
          {data.cashByAccount.length === 0 ? (
            <EmptyItem label="No bank accounts connected" />
          ) : (
            data.cashByAccount.map((acc) => (
              <CashAccountRow key={acc.id} acc={acc} />
            ))
          )}

          {/* Fixed Assets — only shown when journal entries use asset accounts */}
          {data.hasFixedAssets && (
            <>
              <SubSectionHeader label="Fixed Assets" />
              {data.fixedAssets.map((item) => (
                <LineItem key={item.label} {...item} />
              ))}
              <TotalRow label="Total Fixed Assets" amount={data.totalFixedAssets} />
            </>
          )}

          <GrandTotalRow label="Total Assets" amount={data.totalAssets} />

          {/* Divider */}
          <div className="border-t-2 border-[#1E2A45]" />

          {/* 2. LIABILITIES ───────────────────────────────────────────────── */}
          <SectionHeader label="Liabilities" />

          <SubSectionHeader label="Current Liabilities" />
          {data.currentLiabilities.length === 0 ? (
            <EmptyItem label="No liability transactions" />
          ) : (
            data.currentLiabilities.map((item) => (
              <LineItem key={item.label} {...item} />
            ))
          )}
          <TotalRow label="Total Current Liabilities" amount={data.totalCurrentLiabilities} />
          <TotalRow label="Total Liabilities" amount={data.totalLiabilities} />

          {/* 3. EQUITY ────────────────────────────────────────────────────── */}
          <SectionHeader label="Equity" />

          {data.equityItems.map((item) => (
            <LineItem key={item.label} {...item} />
          ))}
          {/* Retained Earnings = prior years' cumulative net income */}
          <div className="flex justify-between items-center pl-8 px-4 py-2 text-sm hover:bg-[#1E2A45]/20 transition-colors">
            <div>
              <div className="text-[#E8ECF4]">Retained Earnings</div>
              <div className="text-xs text-[#6B7A99]">Prior years&apos; cumulative net income</div>
            </div>
            <span className={`tabular-nums ${amtColor(data.retainedEarnings)}`}>{fmt(data.retainedEarnings)}</span>
          </div>
          <LineItem label="Current Year Net Income" amount={data.currentYearNetIncome} isContra={false} />
          <TotalRow label="Total Equity" amount={data.totalEquity} />

          {/* 4. TOTAL LIABILITIES + EQUITY ───────────────────────────────── */}
          <GrandTotalRow label="Total Liabilities + Equity" amount={data.totalLiabilitiesAndEquity} />
        </div>

        {/* 5. Balance check banner ──────────────────────────────────────── */}
        <div
          className={`mt-4 px-4 py-3 rounded-lg text-sm ${
            inBalance
              ? "bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]"
              : "bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{inBalance ? "✓" : "⚠"}</span>
            {inBalance ? (
              <span>
                Assets ({fmt(data.totalAssets)}) = Liabilities + Equity ({fmt(data.totalLiabilitiesAndEquity)}) — Balance sheet is in balance
              </span>
            ) : (
              <span>Out of balance by {fmt(diff)}</span>
            )}
          </div>
          {!inBalance && (
            <p className="mt-1 text-xs opacity-80 pl-6">
              This may be due to transactions categorized as Assets or Equity that aren&apos;t fully reflected.
              Check your Owner Contributions and Owner Draw categories.
            </p>
          )}
        </div>

        {/* 6. Optional depreciation note ───────────────────────────────── */}
        <p className="text-xs text-[#6B7A99] italic text-center mt-4">
          Want to track fixed assets and depreciation?{" "}
          <a href="/dashboard/journal-entries" className="underline hover:text-[#4F7FFF] transition-colors">
            Use Journal Entries →
          </a>
        </p>
      </div>
    </>
  );
}
