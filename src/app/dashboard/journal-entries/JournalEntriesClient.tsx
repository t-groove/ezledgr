"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { TrendingDown, FileText, Trash2, Plus, ChevronLeft, Info } from "lucide-react";
import { createJournalEntry, deleteJournalEntry } from "./actions";
import type { JournalEntry, CreateJournalEntryLine } from "./actions";
import { calculateStraightLineDepreciation } from "@/lib/bookkeeping/depreciation";

// ── Constants ─────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);
const usefulLifeOptions = [3, 5, 7, 10, 15, 20, 27.5, 39];

const ENTRY_TYPE_COLORS: Record<string, string> = {
  depreciation: "bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20",
  amortization: "bg-[#4F7FFF]/10 text-[#4F7FFF] border border-[#4F7FFF]/20",
  accrual: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20",
  prepaid: "bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20",
  adjustment: "bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20",
  manual: "bg-[#6B7A99]/10 text-[#6B7A99] border border-[#6B7A99]/20",
};

const COMMON_ACCOUNTS = [
  "Depreciation Expense",
  "Accumulated Depreciation",
  "Amortization Expense",
  "Prepaid Expense",
  "Accrued Liabilities",
  "Accrued Revenue",
  "Wages Payable",
  "Interest Payable",
  "Unearned Revenue",
  "Retained Earnings",
  "Owner Equity",
];

// ── Formatting ────────────────────────────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(v: number) {
  return fmtCurrency.format(v);
}

function fmtAmt(v: number) {
  return v === 0 ? "—" : fmtCurrency.format(v);
}

function formatDate(d: string) {
  const [year, month, day] = d.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManualLine {
  id: string;
  accountName: string;
  accountType: string;
  debit: string;
  credit: string;
  lineNotes: string;
}

interface Props {
  initialEntries: JournalEntry[];
}

// ── Shared input class ────────────────────────────────────────────────────────

const inputCls =
  "bg-[#f5f4f2] border border-[#dde4ef] text-[#193764] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99] w-full";

// ── Sub-components ────────────────────────────────────────────────────────────

function EntryTypeBadge({ type }: { type: string }) {
  const cls = ENTRY_TYPE_COLORS[type] ?? ENTRY_TYPE_COLORS.manual;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {type}
    </span>
  );
}

function LinesSummary({ lines }: { lines: JournalEntry["journal_entry_lines"] }) {
  const debits = lines.filter((l) => l.debit > 0);
  const credits = lines.filter((l) => l.credit > 0);
  return (
    <div className="text-xs space-y-0.5">
      {debits.map((l) => (
        <div key={l.id} className="text-[#6B7A99]">
          <span className="text-[#4F7FFF] font-medium">DR</span> {l.account_name}{" "}
          <span className="text-[#193764]">{fmtAmt(Number(l.debit))}</span>
        </div>
      ))}
      {credits.map((l) => (
        <div key={l.id} className="text-[#6B7A99]">
          <span className="text-[#A855F7] font-medium">CR</span> {l.account_name}{" "}
          <span className="text-[#193764]">{fmtAmt(Number(l.credit))}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JournalEntriesClient({ initialEntries }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [entryMode, setEntryMode] = useState<"select" | "depreciation" | "manual">("select");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Depreciation form state ───────────────────────────────────────────────
  const [depDate, setDepDate] = useState(today);
  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState("Equipment");
  const [depMethod, setDepMethod] = useState<"straight_line" | "manual">("straight_line");
  const [originalCost, setOriginalCost] = useState("");
  const [usefulLife, setUsefulLife] = useState("5");
  const [dateInService, setDateInService] = useState("");
  const [depYear, setDepYear] = useState(currentYear);
  const [manualDepAmount, setManualDepAmount] = useState("");
  const [depDescription, setDepDescription] = useState("");
  const [depNotes, setDepNotes] = useState("");

  // ── Manual form state ─────────────────────────────────────────────────────
  const [manDate, setManDate] = useState(today);
  const [manDescription, setManDescription] = useState("");
  const [manEntryType, setManEntryType] = useState("manual");
  const [manNotes, setManNotes] = useState("");
  const [manLines, setManLines] = useState<ManualLine[]>([
    { id: "1", accountName: "", accountType: "Expense", debit: "", credit: "", lineNotes: "" },
    { id: "2", accountName: "", accountType: "Asset", debit: "", credit: "", lineNotes: "" },
  ]);

  // ── Auto-fill description from asset name ─────────────────────────────────
  useEffect(() => {
    if (assetName) {
      setDepDescription(`Depreciation — ${assetName} ${depYear}`);
    }
  }, [assetName, depYear]);

  // ── Straight-line calculation ─────────────────────────────────────────────
  const depCalcResult = useMemo(() => {
    if (depMethod !== "straight_line") return null;
    const cost = parseFloat(originalCost);
    const life = parseFloat(usefulLife);
    if (!dateInService || isNaN(cost) || isNaN(life) || cost <= 0 || life <= 0) return null;
    const serviceDate = new Date(dateInService + "T00:00:00");
    if (isNaN(serviceDate.getTime())) return null;
    return calculateStraightLineDepreciation(cost, life, serviceDate, depYear);
  }, [depMethod, originalCost, usefulLife, dateInService, depYear]);

  const depAmount =
    depMethod === "manual"
      ? parseFloat(manualDepAmount) || 0
      : depCalcResult?.depreciationForYear ?? 0;

  // ── Manual form totals ────────────────────────────────────────────────────
  const totalDebits = manLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredits = manLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  // ── Reset helpers ─────────────────────────────────────────────────────────
  function resetDepForm() {
    setDepDate(today);
    setAssetName("");
    setAssetCategory("Equipment");
    setDepMethod("straight_line");
    setOriginalCost("");
    setUsefulLife("5");
    setDateInService("");
    setDepYear(currentYear);
    setManualDepAmount("");
    setDepDescription("");
    setDepNotes("");
    setFormError(null);
  }

  function resetManForm() {
    setManDate(today);
    setManDescription("");
    setManEntryType("manual");
    setManNotes("");
    setManLines([
      { id: "1", accountName: "", accountType: "Expense", debit: "", credit: "", lineNotes: "" },
      { id: "2", accountName: "", accountType: "Asset", debit: "", credit: "", lineNotes: "" },
    ]);
    setFormError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEntryMode("select");
    resetDepForm();
    resetManForm();
  }

  // ── Submit depreciation ───────────────────────────────────────────────────
  function handleDepreciationSubmit() {
    if (depAmount <= 0) {
      setFormError("Depreciation amount must be greater than 0");
      return;
    }
    setFormError(null);
    const lines: CreateJournalEntryLine[] = [
      {
        account_name: "Depreciation Expense",
        account_type: "Expense",
        debit: depAmount,
        credit: 0,
        asset_name: assetName || undefined,
        depreciation_method: depMethod === "straight_line" ? "straight_line" : "manual",
      },
      {
        account_name: "Accumulated Depreciation",
        account_type: "Asset",
        debit: 0,
        credit: depAmount,
        asset_name: assetName || undefined,
        depreciation_method: depMethod === "straight_line" ? "straight_line" : "manual",
      },
    ];
    startTransition(async () => {
      const result = await createJournalEntry({
        date: depDate,
        description: depDescription || `Depreciation — ${assetName || assetCategory} ${depYear}`,
        entry_type: "depreciation",
        notes: depNotes || undefined,
        lines,
      });
      if (result.success) {
        setEntries((prev) => [result.entry, ...prev]);
        closeForm();
      } else {
        setFormError(result.error);
      }
    });
  }

  // ── Submit manual entry ───────────────────────────────────────────────────
  function handleManualSubmit() {
    const validLines = manLines.filter((l) => l.accountName.trim());
    if (validLines.length < 2) {
      setFormError("At least two account lines are required");
      return;
    }
    if (!isBalanced) {
      setFormError("Debits must equal credits to save this entry");
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await createJournalEntry({
        date: manDate,
        description: manDescription,
        entry_type: manEntryType,
        notes: manNotes || undefined,
        lines: validLines.map((l) => ({
          account_name: l.accountName,
          account_type: l.accountType,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          notes: l.lineNotes || undefined,
        })),
      });
      if (result.success) {
        setEntries((prev) => [result.entry, ...prev]);
        closeForm();
      } else {
        setFormError(result.error);
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteJournalEntry(id);
      if (result.success) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setDeletingId(null);
      }
    });
  }

  // ── Manual line helpers ───────────────────────────────────────────────────
  function updateManLine(id: string, field: keyof ManualLine, value: string) {
    setManLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }

  function addManLine() {
    setManLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        accountName: "",
        accountType: "Expense",
        debit: "",
        credit: "",
        lineNotes: "",
      },
    ]);
  }

  function removeManLine(id: string) {
    setManLines((prev) => prev.filter((l) => l.id !== id));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="transition-opacity duration-200" style={{ opacity: isPending ? 0.6 : 1 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-sans text-3xl font-bold text-[#193764]">Journal Entries</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Non-cash accounting adjustments</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Entry
          </button>
        )}
      </div>

      {/* ── Info banner ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-[#4F7FFF]/10 border border-[#4F7FFF]/20 rounded-lg px-4 py-3 mb-6">
        <Info size={16} className="text-[#4F7FFF] mt-0.5 flex-shrink-0" />
        <p className="text-sm text-[#6B7A99]">
          Journal entries record non-cash transactions like depreciation. They appear on your
          balance sheet and P&L but do not affect bank account balances.
        </p>
      </div>

      {/* ── New Entry Form Panel ─────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white border border-[#dde4ef] rounded-xl p-6 mb-6">

          {/* Entry type selector */}
          {entryMode === "select" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-sans text-xl font-bold text-[#193764]">New Journal Entry</h2>
                <button
                  onClick={closeForm}
                  className="text-sm text-[#6B7A99] hover:text-[#193764] transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-sm text-[#6B7A99] mb-5">Choose the type of entry to record:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setEntryMode("depreciation")}
                  className="flex items-start gap-4 p-5 bg-[#f5f4f2] border border-[#dde4ef] rounded-xl hover:border-[#A855F7]/50 hover:bg-[#A855F7]/5 transition-all text-left"
                >
                  <div className="p-2 bg-[#A855F7]/10 rounded-lg">
                    <TrendingDown size={22} className="text-[#A855F7]" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-[#193764] mb-1">Depreciation Entry</p>
                    <p className="text-xs text-[#6B7A99]">Record asset depreciation</p>
                  </div>
                </button>
                <button
                  onClick={() => setEntryMode("manual")}
                  className="flex items-start gap-4 p-5 bg-[#f5f4f2] border border-[#dde4ef] rounded-xl hover:border-[#4F7FFF]/50 hover:bg-[#4F7FFF]/5 transition-all text-left"
                >
                  <div className="p-2 bg-[#4F7FFF]/10 rounded-lg">
                    <FileText size={22} className="text-[#4F7FFF]" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-[#193764] mb-1">Manual Journal Entry</p>
                    <p className="text-xs text-[#6B7A99]">Custom debit/credit entry</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── Depreciation Entry Form ────────────────────────────────── */}
          {entryMode === "depreciation" && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setEntryMode("select")}
                  className="text-[#6B7A99] hover:text-[#193764] transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <h2 className="font-sans text-xl font-bold text-[#193764]">Depreciation Entry</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Date</label>
                  <input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Asset Name</label>
                  <input
                    type="text"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="e.g. 2022 Ford F-150"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Asset Category</label>
                  <select value={assetCategory} onChange={(e) => setAssetCategory(e.target.value)} className={inputCls}>
                    <option>Equipment</option>
                    <option>Vehicles</option>
                    <option>Real Estate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Depreciation Method</label>
                  <select
                    value={depMethod}
                    onChange={(e) => setDepMethod(e.target.value as "straight_line" | "manual")}
                    className={inputCls}
                  >
                    <option value="straight_line">Straight-line (auto-calculate)</option>
                    <option value="manual">Manual amount</option>
                  </select>
                </div>
              </div>

              {depMethod === "straight_line" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 p-4 bg-[#f5f4f2] border border-[#dde4ef] rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Original Cost ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={originalCost}
                      onChange={(e) => setOriginalCost(e.target.value)}
                      placeholder="75000.00"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Useful Life (years)</label>
                    <select value={usefulLife} onChange={(e) => setUsefulLife(e.target.value)} className={inputCls}>
                      {usefulLifeOptions.map((y) => (
                        <option key={y} value={String(y)}>{y} years</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Date Placed in Service</label>
                    <input type="date" value={dateInService} onChange={(e) => setDateInService(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Year to Depreciate</label>
                    <select value={depYear} onChange={(e) => setDepYear(Number(e.target.value))} className={inputCls}>
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  {depCalcResult && depCalcResult.depreciationForYear > 0 && (
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg text-sm text-[#22C55E]">
                        <span className="font-semibold">Annual depreciation: {formatCurrency(depCalcResult.depreciationForYear)}</span>
                        {depCalcResult.isFirstYear && (
                          <span className="text-xs text-[#6B7A99]">
                            (prorated {depCalcResult.monthsInFirstYear} months)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-5">
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Depreciation Amount ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={manualDepAmount}
                    onChange={(e) => setManualDepAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-[#f5f4f2] border border-[#dde4ef] text-[#193764] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] w-48"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Description</label>
                  <input
                    type="text"
                    value={depDescription}
                    onChange={(e) => setDepDescription(e.target.value)}
                    placeholder="Auto-filled from asset name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Notes (optional)</label>
                  <input
                    type="text"
                    value={depNotes}
                    onChange={(e) => setDepNotes(e.target.value)}
                    placeholder="Additional notes"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mb-5 p-4 border border-[#dde4ef] rounded-lg bg-[#f5f4f2]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7A99] mb-3">
                  Journal Entry Preview
                </p>
                <div className="text-sm text-[#6B7A99] mb-2">
                  <span>Date: </span><span className="text-[#193764]">{depDate || "—"}</span>
                  <span className="ml-4">Description: </span>
                  <span className="text-[#193764]">{depDescription || "—"}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#dde4ef]">
                      <th className="text-left py-2 text-[#6B7A99] font-medium">Account</th>
                      <th className="text-right py-2 text-[#6B7A99] font-medium">Debit</th>
                      <th className="text-right py-2 text-[#6B7A99] font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#dde4ef]/50">
                      <td className="py-2 text-[#193764]">Depreciation Expense</td>
                      <td className="py-2 text-right text-[#4F7FFF]">
                        {depAmount > 0 ? formatCurrency(depAmount) : "—"}
                      </td>
                      <td className="py-2 text-right text-[#6B7A99]">—</td>
                    </tr>
                    <tr className="border-b border-[#dde4ef]/50">
                      <td className="py-2 text-[#193764]">Accumulated Depreciation</td>
                      <td className="py-2 text-right text-[#6B7A99]">—</td>
                      <td className="py-2 text-right text-[#A855F7]">
                        {depAmount > 0 ? formatCurrency(depAmount) : "—"}
                      </td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="pt-2 text-[#193764]">Total</td>
                      <td className="pt-2 text-right text-[#193764]">
                        {depAmount > 0 ? formatCurrency(depAmount) : "—"}
                      </td>
                      <td className="pt-2 text-right text-[#193764]">
                        {depAmount > 0 ? formatCurrency(depAmount) : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {depAmount > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#22C55E]">
                    <span>✓</span><span>Entry is balanced</span>
                  </div>
                )}
              </div>

              {formError && (
                <p className="mb-4 text-sm text-[#EF4444]">{formError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDepreciationSubmit}
                  disabled={isPending || depAmount <= 0}
                  className="px-5 py-2.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isPending ? "Saving…" : "Save Entry"}
                </button>
                <button
                  onClick={closeForm}
                  className="px-5 py-2.5 border border-[#dde4ef] text-[#6B7A99] hover:text-[#193764] hover:border-[#4F7FFF]/50 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Manual Entry Form ──────────────────────────────────────── */}
          {entryMode === "manual" && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setEntryMode("select")}
                  className="text-[#6B7A99] hover:text-[#193764] transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <h2 className="font-sans text-xl font-bold text-[#193764]">Manual Journal Entry</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Date</label>
                  <input type="date" value={manDate} onChange={(e) => setManDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Description</label>
                  <input
                    type="text"
                    value={manDescription}
                    onChange={(e) => setManDescription(e.target.value)}
                    placeholder="Entry description"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Entry Type</label>
                  <select value={manEntryType} onChange={(e) => setManEntryType(e.target.value)} className={inputCls}>
                    <option value="manual">Manual</option>
                    <option value="depreciation">Depreciation</option>
                    <option value="amortization">Amortization</option>
                    <option value="accrual">Accrual</option>
                    <option value="prepaid">Prepaid</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-medium text-[#6B7A99] mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  value={manNotes}
                  onChange={(e) => setManNotes(e.target.value)}
                  placeholder="Optional notes"
                  className={inputCls}
                />
              </div>

              {/* Lines table */}
              <div className="overflow-x-auto rounded-lg border border-[#dde4ef] mb-3">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-[#e8eef6] border-b border-[#dde4ef]">
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7A99]">Account Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7A99] w-36">Account Type</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-[#4F7FFF] w-28">Debit</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-[#A855F7] w-28">Credit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7A99]">Notes</th>
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {manLines.map((line) => (
                      <tr key={line.id} className="border-b border-[#dde4ef] last:border-0">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            list="common-accounts"
                            value={line.accountName}
                            onChange={(e) => updateManLine(line.id, "accountName", e.target.value)}
                            placeholder="Account name"
                            className="bg-transparent border border-[#dde4ef] text-[#193764] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#4F7FFF] w-full placeholder:text-[#6B7A99]"
                          />
                          <datalist id="common-accounts">
                            {COMMON_ACCOUNTS.map((a) => (
                              <option key={a} value={a} />
                            ))}
                          </datalist>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={line.accountType}
                            onChange={(e) => updateManLine(line.id, "accountType", e.target.value)}
                            className="bg-[#f5f4f2] border border-[#dde4ef] text-[#193764] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#4F7FFF] w-full"
                          >
                            <option>Income</option>
                            <option>Expense</option>
                            <option>Asset</option>
                            <option>Equity</option>
                            <option>Liability</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.debit}
                            onChange={(e) => updateManLine(line.id, "debit", e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent border border-[#dde4ef] text-[#4F7FFF] rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-[#4F7FFF] w-full placeholder:text-[#6B7A99]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.credit}
                            onChange={(e) => updateManLine(line.id, "credit", e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent border border-[#dde4ef] text-[#A855F7] rounded px-2 py-1 text-sm text-right focus:outline-none focus:border-[#4F7FFF] w-full placeholder:text-[#6B7A99]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.lineNotes}
                            onChange={(e) => updateManLine(line.id, "lineNotes", e.target.value)}
                            placeholder="Optional"
                            className="bg-transparent border border-[#dde4ef] text-[#6B7A99] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#4F7FFF] w-full placeholder:text-[#6B7A99]/50"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {manLines.length > 2 && (
                            <button
                              onClick={() => removeManLine(line.id)}
                              className="text-[#6B7A99] hover:text-[#EF4444] transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addManLine}
                className="flex items-center gap-1.5 text-sm text-[#4F7FFF] hover:text-[#6B9FFF] transition-colors mb-4"
              >
                <Plus size={14} />
                Add line
              </button>

              {/* Balance check */}
              <div
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm mb-5 ${
                  isBalanced
                    ? "bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]"
                    : "bg-[#e8eef6] border border-[#dde4ef] text-[#6B7A99]"
                }`}
              >
                <span>
                  Total Debits:{" "}
                  <span className="font-semibold text-[#4F7FFF]">{formatCurrency(totalDebits)}</span>
                </span>
                <span className="text-[#1E2A45]">|</span>
                <span>
                  Total Credits:{" "}
                  <span className="font-semibold text-[#A855F7]">{formatCurrency(totalCredits)}</span>
                </span>
                {isBalanced ? (
                  <span className="ml-auto">✓ Balanced</span>
                ) : totalDebits > 0 || totalCredits > 0 ? (
                  <span className="ml-auto text-[#F59E0B]">
                    Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}
                  </span>
                ) : null}
              </div>

              {formError && (
                <p className="mb-4 text-sm text-[#EF4444]">{formError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleManualSubmit}
                  disabled={isPending || !isBalanced || !manDescription.trim()}
                  className="px-5 py-2.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isPending ? "Saving…" : "Save Entry"}
                </button>
                <button
                  onClick={closeForm}
                  className="px-5 py-2.5 border border-[#dde4ef] text-[#6B7A99] hover:text-[#193764] hover:border-[#4F7FFF]/50 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Entries List ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#dde4ef] rounded-xl overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingDown size={36} className="text-[#1E2A45] mx-auto mb-3" />
            <p className="text-[#193764] text-base mb-1">No journal entries yet</p>
            <p className="text-sm text-[#6B7A99]">
              Record your first depreciation entry to track asset values on your balance sheet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-[#dde4ef] bg-[#e8eef6]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7A99] w-32">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7A99]">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7A99] w-32">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7A99]">Lines</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#6B7A99] w-24">Balanced</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[#dde4ef] last:border-0 hover:bg-[#f0f4fa] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#193764] whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#193764] mb-0.5">{entry.description}</p>
                      {entry.notes && (
                        <p className="text-xs text-[#6B7A99]">{entry.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EntryTypeBadge type={entry.entry_type} />
                    </td>
                    <td className="px-4 py-3">
                      <LinesSummary lines={entry.journal_entry_lines} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.is_balanced ? (
                        <span className="text-[#22C55E] text-lg">✓</span>
                      ) : (
                        <span className="text-[#EF4444] text-lg">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deletingId === entry.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={isPending}
                            className="text-xs px-2 py-1 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 rounded hover:bg-[#EF4444]/20 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs px-2 py-1 text-[#6B7A99] hover:text-[#193764] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(entry.id)}
                          className="text-[#6B7A99] hover:text-[#EF4444] transition-colors p-1"
                          title="Delete entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
