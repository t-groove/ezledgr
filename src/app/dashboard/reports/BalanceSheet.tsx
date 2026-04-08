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

// All balance sheet figures are ledger rows — use navy universally.
function amtColor(_v: number, _isContra = false): string {
  return "text-[#193764]";
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
    <div className="bg-[#e8eef6] px-4 py-2 text-[#193764] text-xs font-semibold uppercase font-sans" style={{ letterSpacing: '0.06em' }}>
      {label}
    </div>
  );
}

function SubSectionHeader({ label }: { label: string }) {
  return (
    <div className="pl-4 px-4 py-2 text-[#193764] text-sm font-medium font-sans">
      {label}
    </div>
  );
}

function LineItem({ label, amount, isContra = false }: BalanceSheetItem) {
  const color = amtColor(amount, isContra);
  return (
    <div className="flex justify-between items-center pl-8 px-4 py-2 text-sm hover:bg-[#f0f4fa] transition-colors">
      <span className="text-[#193764] font-sans">{label}</span>
      <span className={`font-accounting tabular-nums ${color}`}>{fmt(amount)}</span>
    </div>
  );
}

function EmptyItem({ label }: { label: string }) {
  return (
    <div className="flex justify-between items-center pl-8 px-4 py-2 text-sm text-[#6B7280] font-sans italic">
      <span>{label}</span>
      <span>—</span>
    </div>
  );
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  const color = amtColor(amount);
  return (
    <div className="flex justify-between items-center border-t border-[#dde4ef] bg-[#f0f4fa] px-4 py-2 font-semibold">
      <span className="text-[#193764] text-sm font-sans">{label}</span>
      <span className={`font-accounting tabular-nums text-sm ${color}`}>{fmt(amount)}</span>
    </div>
  );
}

function GrandTotalRow({ label, amount }: { label: string; amount: number }) {
  const color = amtColor(amount);
  return (
    <div className="flex justify-between items-center border-t-2 border-[#193764] bg-[#e8eef6] px-4 py-3 font-bold font-sans text-base">
      <span className="text-[#193764]">{label}</span>
      <span className={`font-accounting tabular-nums ${color}`}>{fmt(amount)}</span>
    </div>
  );
}

function CashAccountRow({ acc }: { acc: CashAccount }) {
  const color = "text-[#193764]";
  const bankLine = [
    acc.bankName && acc.bankName !== "None" ? acc.bankName : "",
    acc.lastFour ? `••••${acc.lastFour}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex justify-between items-center pl-8 px-4 py-2 hover:bg-[#f0f4fa] transition-colors">
      <div>
        <div className="text-sm text-[#193764] font-sans">{acc.name}</div>
        {bankLine && <div className="text-xs text-[#6B7280] font-sans">{bankLine}</div>}
      </div>
      <span className={`font-accounting tabular-nums text-sm ${color}`}>
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
  businessName?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BalanceSheet({ data, asOfDate, onDateChange, businessName = "Your Business" }: Props) {
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

      <div className="w-full bg-white border border-[#dde4ef] rounded-xl overflow-hidden">
        {/* ── Navy header band ─────────────────────────────────────────────── */}
        <div className="bg-[#193764] px-6 py-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="font-sans text-xl font-semibold text-white">{businessName}</h2>
            <p className="text-sm text-[#b8ccdf]">Balance Sheet</p>
            <p className="text-sm text-[#b8ccdf] mt-0.5">As of {displayDate}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap no-print">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-white/15 border border-white/30 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/60"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-white/15 border border-white/30 rounded-lg hover:bg-white/25 transition-colors"
            >
              Print
            </button>
            <button
              onClick={() => downloadCSV(data)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-white/15 border border-white/30 rounded-lg hover:bg-white/25 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Report body ───────────────────────────────────────────────────── */}
        <div>
          {/* Stacked single-column layout */}
          <div className="w-full space-y-0 border-b border-[#dde4ef] overflow-hidden">

            {/* 1. ASSETS */}
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
            <div className="border-t-2 border-[#dde4ef]" />

            {/* 2. LIABILITIES */}
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

            {/* 3. EQUITY */}
            <SectionHeader label="Equity" />

            {data.equityItems.map((item) => (
              <LineItem key={item.label} {...item} />
            ))}
            {/* Retained Earnings = prior years' cumulative net income */}
            <div className="flex justify-between items-center pl-8 px-4 py-2 text-sm hover:bg-[#f0f4fa] transition-colors">
              <div>
                <div className="text-[#193764] font-sans">Retained Earnings</div>
                <div className="text-xs text-[#6B7280] font-sans">Prior years&apos; cumulative net income</div>
              </div>
              <span className={`font-accounting tabular-nums ${amtColor(data.retainedEarnings)}`}>{fmt(data.retainedEarnings)}</span>
            </div>
            <LineItem label="Current Year Net Income" amount={data.currentYearNetIncome} isContra={false} />
            <TotalRow label="Total Equity" amount={data.totalEquity} />

            {/* 4. TOTAL LIABILITIES + EQUITY */}
            <GrandTotalRow label="Total Liabilities + Equity" amount={data.totalLiabilitiesAndEquity} />
          </div>

          {/* 5. Balance check banner */}
          <div className="px-6 pt-4 pb-2">
            <div
              className={`px-4 py-3 rounded-lg text-sm font-sans ${
                inBalance
                  ? "bg-[#e6f7ee] border border-[#b3e2c5] text-[#1a7a40]"
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
          </div>

          {/* 6. Optional depreciation note */}
          <p className="text-xs text-[#6B7280] font-sans italic text-center px-6 pb-4">
            Want to track fixed assets and depreciation?{" "}
            <a href="/dashboard/journal-entries" className="text-[#2F7FC8] underline hover:text-[#193764] transition-colors">
              Use Journal Entries →
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
