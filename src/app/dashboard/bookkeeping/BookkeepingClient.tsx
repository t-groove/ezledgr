"use client";

import { useState, useRef, useCallback, useMemo, useTransition, useEffect, Fragment } from "react";
import { parseCSV } from "@/lib/bookkeeping/parse-csv";
import type { ParsedTransaction } from "@/lib/bookkeeping/parse-csv";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  ASSET_CATEGORIES,
  EQUITY_CATEGORIES,
  LIABILITY_CATEGORIES,
  TRANSFER_CATEGORIES,
  CATEGORY_ACCOUNT_TYPE,
} from "@/lib/bookkeeping/categories";
import {
  uploadTransactions,
  getTransactions,
  updateTransactionCategory,
  deleteTransaction,
  createTransaction,
  updateTransactionDescription,
  updateTransaction,
  splitTransaction,
  unsplitTransaction,
} from "./actions";
import type { Transaction } from "./actions";
import {
  createBankAccount,
  assignTransactionsToAccount,
} from "../accounts/actions";
import type { BankAccount } from "../accounts/actions";
import { searchContacts } from "../contacts/actions";
import type { Contact } from "../contacts/actions";
import ContactFormModal from "../contacts/ContactFormModal";
import {
  Upload,
  CloudUpload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  X,
  BookOpen,
  Plus,
  Pencil,
  Scissors,
  UserPlus,
} from "lucide-react";

const PAGE_SIZE = 50;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function accountLabel(acc: BankAccount): string {
  return `${acc.bank_name} — ${acc.name}${acc.last_four ? ` (••••${acc.last_four})` : ""}`;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
        toast.type === "success"
          ? "bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]"
          : "bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]"
      }`}
    >
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Mini account creation form ─────────────────────────────────────────────

interface MiniAccountFormProps {
  onSave: (account: BankAccount) => void;
  onCancel: () => void;
}

function MiniAccountForm({ onSave, onCancel }: MiniAccountFormProps) {
  const [form, setForm] = useState({
    name: "",
    bank_name: "",
    account_type: "checking",
    last_four: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const inputCls =
    "w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99]";

  const handleSave = () => {
    if (!form.name.trim()) { setError("Nickname is required."); return; }
    if (!form.bank_name.trim()) { setError("Bank name is required."); return; }
    setError(null);
    startSaving(async () => {
      const result = await createBankAccount({
        name: form.name.trim(),
        bank_name: form.bank_name.trim(),
        account_type: form.account_type,
        last_four: form.last_four.trim() || undefined,
      });
      if (!result.success) { setError(result.error); return; }
      onSave(result.account);
    });
  };

  return (
    <div className="mt-3 p-4 bg-[#0A0F1E] border border-[#1E2A45] rounded-lg">
      <p className="text-xs font-medium text-[#6B7A99] mb-3">New account details</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          placeholder="Account nickname *"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={inputCls}
        />
        <input
          type="text"
          placeholder="Bank name *"
          value={form.bank_name}
          onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
          className={inputCls}
        />
        <select
          value={form.account_type}
          onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
          className={inputCls}
        >
          <option value="checking">Checking</option>
          <option value="savings">Savings</option>
          <option value="credit_card">Credit Card</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
        <input
          type="text"
          placeholder="Last 4 digits (optional)"
          maxLength={4}
          value={form.last_four}
          onChange={(e) => setForm((f) => ({ ...f, last_four: e.target.value.replace(/\D/g, "") }))}
          className={inputCls}
        />
      </div>
      {error && <p className="text-xs text-[#EF4444] mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {isSaving ? "Saving…" : "Save account"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] text-xs rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Upload panel ───────────────────────────────────────────────────────────

interface UploadPanelProps {
  bankAccounts: BankAccount[];
  onImportSuccess: (transactions: Transaction[]) => void;
  onAccountCreated: (account: BankAccount) => void;
}

function UploadPanel({ bankAccounts, onImportSuccess, onAccountCreated }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<ParsedTransaction[] | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [showMiniAccountForm, setShowMiniAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountBank, setNewAccountBank] = useState("");
  const [newAccountType, setNewAccountType] = useState("checking");
  const [newAccountLastFour, setNewAccountLastFour] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseError("Please upload a .csv file.");
      return;
    }
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      if (result.transactions.length === 0) {
        setParseError(
          result.errors.length > 0
            ? `Parse error: ${result.errors[0].reason}`
            : "Could not parse this CSV. Please check the format."
        );
        setPreview(null);
      } else {
        setParsedTransactions(result.transactions);
        setShowAccountPopup(true);
        setPreview(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleAccountSelected = () => {
    if (!selectedAccountId) return;
    setShowAccountPopup(false);
    setPreview(parsedTransactions);
  };

  const handleCancelUpload = () => {
    setShowAccountPopup(false);
    setParsedTransactions([]);
    setSelectedAccountId("");
    setShowMiniAccountForm(false);
    setNewAccountName("");
    setNewAccountBank("");
    setNewAccountType("checking");
    setNewAccountLastFour("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateAccountInline = async () => {
    const result = await createBankAccount({
      name: newAccountName,
      bank_name: newAccountBank,
      account_type: newAccountType,
      last_four: newAccountLastFour || undefined,
    });
    if (result.success && result.account) {
      onAccountCreated(result.account);
      setSelectedAccountId(result.account.id);
      setShowMiniAccountForm(false);
      setNewAccountName("");
      setNewAccountBank("");
      setNewAccountType("checking");
      setNewAccountLastFour("");
    } else if (!result.success) {
      setParseError(result.error ?? "Failed to create account");
    }
  };

  const handleImport = () => {
    if (!preview || !selectedAccountId) return;
    startTransition(async () => {
      const result = await uploadTransactions(preview, selectedAccountId);
      if (result.success) {
        setToast({
          message: `${result.count} transactions imported successfully`,
          type: "success",
        });
        const fresh = await getTransactions();
        onImportSuccess(fresh);
        setPreview(null);
        setSelectedAccountId("");
      } else {
        setToast({ message: result.error, type: "error" });
      }
    });
  };

  const inputCls =
    "bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99]";

  return (
    <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6 mb-6 relative">
      {!preview ? (
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Left: text content */}
          <div className="flex-1">
            <h2 className="font-syne text-xl font-bold text-[#E8ECF4] mb-1">
              Import Bank Transactions
            </h2>
            <p className="text-sm text-[#6B7A99]">
              Upload a CSV export from your bank. Works with Chase, Bank of America,
              Wells Fargo, and most US banks.
            </p>
            {parseError && (
              <p className="mt-3 text-sm text-[#EF4444]">{parseError}</p>
            )}
          </div>

          {/* Right: compact upload zone */}
          <div className="w-full sm:w-64 shrink-0">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors max-h-40 ${
                isDragging
                  ? "border-[#4F7FFF] bg-[#4F7FFF]/5"
                  : "border-[#1E2A45] bg-[#0A0F1E] hover:border-[#4F7FFF]/50"
              }`}
            >
              <CloudUpload
                size={24}
                className={`mb-2 ${isDragging ? "text-[#4F7FFF]" : "text-[#6B7A99]"}`}
              />
              <p className="text-[#E8ECF4] font-medium text-sm mb-0.5">Drag CSV here</p>
              <p className="text-xs text-[#6B7A99]">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="font-syne text-xl font-bold text-[#E8ECF4] mb-1">
            Import Bank Transactions
          </h2>
          <p className="text-sm text-[#6B7A99] mb-3">
            Found{" "}
            <span className="text-[#E8ECF4] font-semibold">{preview.length}</span>{" "}
            transactions — showing first 5
          </p>
          <div className="overflow-x-auto rounded-lg border border-[#1E2A45] mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E2A45] bg-[#0A0F1E]">
                  {["Date", "Description", "Amount", "Type", "Category"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[#6B7A99] font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((t, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#1E2A45] last:border-0 hover:bg-[#1E2A45]/30"
                  >
                    <td className="px-4 py-3 text-[#E8ECF4] whitespace-nowrap">
                      {formatDate(t.date)}
                    </td>
                    <td
                      className="px-4 py-3 text-[#E8ECF4] max-w-xs truncate"
                      title={t.description}
                    >
                      {t.description}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium whitespace-nowrap ${
                        t.type === "income" ? "text-[#22C55E]" : "text-[#EF4444]"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.type === "income"
                            ? "bg-[#22C55E]/10 text-[#22C55E]"
                            : "bg-[#EF4444]/10 text-[#EF4444]"
                        }`}
                      >
                        {t.type === "income" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.category ? (
                        <span className="text-sm text-[#6B7A99]">{t.category}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1E2A45] text-[#6B7A99]">
                          Uncategorized
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected account confirmation */}
          <div className="flex items-center gap-2 mb-4 text-sm text-[#6B7A99]">
            <span>Importing to:</span>
            <span className="text-[#E8ECF4] font-medium">
              {bankAccounts.find((a) => a.id === selectedAccountId)?.name ?? "Unknown"}
            </span>
            <button
              onClick={() => setShowAccountPopup(true)}
              className="text-[#4F7FFF] hover:underline text-xs"
            >
              Change
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
            >
              <Upload size={16} />
              {isPending
                ? "Importing..."
                : `Import ${preview.length} transactions`}
            </button>
            <button
              onClick={() => { setPreview(null); setParsedTransactions([]); setSelectedAccountId(""); }}
              disabled={isPending}
              className="px-5 py-2.5 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] hover:border-[#4F7FFF]/50 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account selection popup */}
      {showAccountPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0A0F1E]/80 backdrop-blur-sm rounded-xl">
          <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="font-syne font-bold text-lg text-[#E8ECF4] mb-1">
              Which account is this?
            </h3>
            <p className="text-sm text-[#6B7A99] mb-5">
              Select the bank account these transactions belong to before importing.
            </p>

            <div className="bg-[#0A0F1E] border border-[#1E2A45] rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
              <span className="text-sm text-[#6B7A99]">Transactions found</span>
              <span className="text-[#E8ECF4] font-semibold">{parsedTransactions.length}</span>
            </div>

            <label className="block text-sm text-[#6B7A99] mb-2">Select account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowMiniAccountForm(true);
                } else {
                  setSelectedAccountId(e.target.value);
                  setShowMiniAccountForm(false);
                }
              }}
              className="w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] mb-4"
            >
              <option value="">Choose an account...</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bank_name && account.bank_name !== "None"
                    ? `${account.bank_name} — `
                    : ""}
                  {account.name}
                  {account.last_four ? ` (••••${account.last_four})` : ""}
                </option>
              ))}
              <option value="__new__">+ Create new account</option>
            </select>

            {showMiniAccountForm && (
              <div className="bg-[#0A0F1E] border border-[#1E2A45] rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-[#E8ECF4] mb-3">New account</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Account nickname *"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full bg-[#111827] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4F7FFF]"
                  />
                  <input
                    type="text"
                    placeholder="Bank name *"
                    value={newAccountBank}
                    onChange={(e) => setNewAccountBank(e.target.value)}
                    className="w-full bg-[#111827] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4F7FFF]"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      className="flex-1 bg-[#111827] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4F7FFF]"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="cash">Cash</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Last 4"
                      maxLength={4}
                      value={newAccountLastFour}
                      onChange={(e) => setNewAccountLastFour(e.target.value)}
                      className="w-20 bg-[#111827] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4F7FFF]"
                    />
                  </div>
                  <button
                    onClick={handleCreateAccountInline}
                    disabled={!newAccountName || !newAccountBank}
                    className="w-full bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
                  >
                    Create account
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAccountSelected}
                disabled={!selectedAccountId}
                className="flex-1 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                Continue →
              </button>
              <button
                onClick={handleCancelUpload}
                className="px-4 py-2.5 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

// ── Split Panel ────────────────────────────────────────────────────────────

interface SplitLine {
  description: string;
  category: string;
  amount: string;
  type: "income" | "expense";
}

interface SplitPanelProps {
  transaction: Transaction;
  onSave: (
    splits: Array<{
      description: string;
      amount: number;
      category: string;
      account_type: string;
      type: "income" | "expense";
    }>
  ) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function SplitPanel({ transaction, onSave, onCancel, isSaving }: SplitPanelProps) {
  const total = Number(transaction.amount);

  const makeDefaultLines = (): SplitLine[] => {
    if (transaction.is_split && (transaction.children ?? []).length >= 2) {
      return (transaction.children ?? []).map((c) => ({
        description: c.description,
        category: c.category,
        amount: String(Number(c.amount).toFixed(2)),
        type: c.type,
      }));
    }
    return [
      { description: transaction.description, category: transaction.category, amount: String(total.toFixed(2)), type: transaction.type },
      { description: transaction.description, category: transaction.category, amount: "0.00", type: transaction.type },
    ];
  };

  const [lines, setLines] = useState<SplitLine[]>(makeDefaultLines);

  const allocated = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const remaining = total - allocated;
  const isBalanced = Math.abs(remaining) < 0.005;

  const inputCls =
    "bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99]";

  const updateLine = (idx: number, field: keyof SplitLine, value: string) => {
    setLines((prev) => {
      const next = prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l));
      // Auto-update last line amount when a non-last line's amount changes
      if (field === "amount" && idx !== prev.length - 1) {
        const othersSum = next.slice(0, -1).reduce((s, l) => s + (Number(l.amount) || 0), 0);
        const lastAmt = Math.max(0, total - othersSum);
        next[next.length - 1] = { ...next[next.length - 1], amount: lastAmt.toFixed(2) };
      }
      return next;
    });
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Recalculate last line
      const othersSum = next.slice(0, -1).reduce((s, l) => s + (Number(l.amount) || 0), 0);
      const lastAmt = Math.max(0, total - othersSum);
      next[next.length - 1] = { ...next[next.length - 1], amount: lastAmt.toFixed(2) };
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => {
      const next = [
        ...prev,
        { description: transaction.description, category: transaction.category, amount: "0.00", type: transaction.type },
      ];
      // Recalculate last line
      const othersSum = next.slice(0, -1).reduce((s, l) => s + (Number(l.amount) || 0), 0);
      const lastAmt = Math.max(0, total - othersSum);
      next[next.length - 1] = { ...next[next.length - 1], amount: lastAmt.toFixed(2) };
      return next;
    });
  };

  const handleSave = async () => {
    if (!isBalanced) return;
    const splits = lines.map((l) => ({
      description: l.description.trim() || transaction.description,
      amount: Number(l.amount),
      category: l.category,
      account_type: CATEGORY_ACCOUNT_TYPE[l.category] ?? "Expense",
      type: l.type,
    }));
    await onSave(splits);
  };

  return (
    <div className="bg-[#0A0F1E] border border-[#A855F7]/30 rounded-lg mx-4 mb-2 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-[#E8ECF4]">Split Transaction</p>
          <p className="text-xs text-[#6B7A99]">
            {transaction.description} — {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Split lines */}
      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-[1.5rem_1fr_10rem_6rem_1.5rem] gap-2 items-center">
          <span className="text-xs text-[#6B7A99] text-center">#</span>
          <span className="text-xs text-[#6B7A99]">Description</span>
          <span className="text-xs text-[#6B7A99]">Category</span>
          <span className="text-xs text-[#6B7A99] text-right">Amount</span>
          <span />
        </div>

        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-[1.5rem_1fr_10rem_6rem_1.5rem] gap-2 items-center">
            <span className="text-xs text-[#6B7A99] text-center">{idx + 1}</span>
            <input
              type="text"
              value={line.description}
              onChange={(e) => updateLine(idx, "description", e.target.value)}
              placeholder="Description"
              className={`${inputCls} w-full`}
            />
            <select
              value={line.category}
              onChange={(e) => updateLine(idx, "category", e.target.value)}
              className={`${inputCls} w-full`}
            >
              <option value="Uncategorized">Uncategorized</option>
              <optgroup label="── Income ──">
                {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="── Expenses ──">
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="── Equity ──">
                {EQUITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="── Liabilities ──">
                {LIABILITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="── Transfers ──">
                {TRANSFER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="── Fixed Assets (Advanced) ──">
                {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={line.amount}
              onChange={(e) => updateLine(idx, "amount", e.target.value)}
              className={`${inputCls} w-full text-right`}
            />
            <button
              onClick={() => removeLine(idx)}
              disabled={lines.length <= 2}
              className="p-0.5 text-[#6B7A99] hover:text-[#EF4444] disabled:opacity-30 transition-colors"
              title="Remove line"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add line */}
      <button
        onClick={addLine}
        className="text-xs text-[#4F7FFF] hover:underline mb-4"
      >
        + Add split line
      </button>

      {/* Balance summary */}
      <div className={`flex items-center gap-4 text-xs mb-4 px-2 py-1.5 rounded ${isBalanced ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]"}`}>
        <span>Allocated: {formatCurrency(allocated)}</span>
        <span>Remaining: {formatCurrency(Math.abs(remaining))}{remaining < 0 ? " over" : ""}</span>
        <span className="font-medium">{isBalanced ? "✓ Balanced" : "✗ Not balanced"}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!isBalanced || isSaving}
          className="px-4 py-1.5 bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {isSaving ? "Saving…" : "Save Split"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] text-xs rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Payee Combobox ─────────────────────────────────────────────────────────

interface PayeeComboboxProps {
  payeeName: string;
  onChange: (payee_id: string | null, payee_name: string) => void;
  onAddNew: (currentName: string) => void;
  inputCls: string;
}

function PayeeCombobox({ payeeName, onChange, onAddNew, inputCls }: PayeeComboboxProps) {
  const [inputValue, setInputValue] = useState(
    payeeName === "Unknown" ? "" : payeeName
  );
  const [results, setResults] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    onChange(null, v || "Unknown");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        const found = await searchContacts(v);
        setResults(found);
        setOpen(found.length > 0);
      }, 300);
    } else {
      setResults([]);
      setOpen(false);
    }
  };

  const handleSelect = (contact: Contact) => {
    setInputValue(contact.display_name);
    onChange(contact.id, contact.display_name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative flex gap-1">
      <div className="relative flex-1">
        <input
          type="text"
          value={inputValue}
          onChange={handleInput}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search or type payee name"
          className={inputCls + " w-full"}
        />
        {open && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#111827] border border-[#1E2A45] rounded-lg shadow-xl max-h-48 overflow-y-auto">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => handleSelect(c)}
                className="w-full text-left px-3 py-2 hover:bg-[#1E2A45] text-sm flex items-center justify-between gap-3"
              >
                <span className="text-[#E8ECF4] truncate">{c.display_name}</span>
                {c.company_name && (
                  <span className="text-xs text-[#6B7A99] flex-shrink-0">{c.company_name}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onAddNew(inputValue)}
        className="px-2.5 border border-[#1E2A45] rounded-lg text-[#6B7A99] hover:text-[#4F7FFF] hover:border-[#4F7FFF]/50 transition-colors flex-shrink-0"
        title="Create new contact"
      >
        <UserPlus size={14} />
      </button>
    </div>
  );
}

// ── Main client component ──────────────────────────────────────────────────

interface BookkeepingClientProps {
  initialTransactions: Transaction[];
  initialBankAccounts: BankAccount[];
  initialAccountFilter?: string;
  initialCategoryFilter?: string;
}

export default function BookkeepingClient({
  initialTransactions,
  initialBankAccounts,
  initialAccountFilter,
  initialCategoryFilter,
}: BookkeepingClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialBankAccounts);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState(initialCategoryFilter ?? "all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [filterAccount, setFilterAccount] = useState(initialAccountFilter ?? "all");

  useEffect(() => {
    if (initialAccountFilter || initialCategoryFilter) {
      setTimeout(() => {
        document
          .getElementById("transaction-table")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, []);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assigningTxId, setAssigningTxId] = useState<string | null>(null);
  const [bulkAccountId, setBulkAccountId] = useState("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Create transaction form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTxForm, setNewTxForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "Uncategorized",
    account_id: "",
    payee_id: null as string | null,
    payee_name: "",
  });
  const [newTxError, setNewTxError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showAddContactInTx, setShowAddContactInTx] = useState(false);
  const [newContactInitialName, setNewContactInitialName] = useState("");

  // Inline description editing
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState("");
  const descEditCancelledRef = useRef(false);

  // Inline cell editing (amount / date)
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: "amount" | "date";
    value: string;
  } | null>(null);
  const cellEditCancelledRef = useRef(false);

  // Success flash cell id
  const [successCellId, setSuccessCellId] = useState<string | null>(null);

  // Split panel
  const [splitPanelTxId, setSplitPanelTxId] = useState<string | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [expandedSplitIds, setExpandedSplitIds] = useState<Set<string>>(new Set());

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const accountMap = useMemo(() => {
    const m = new Map<string, BankAccount>();
    for (const a of bankAccounts) m.set(a.id, a);
    return m;
  }, [bankAccounts]);

  const handleImportSuccess = (fresh: Transaction[]) => {
    setTransactions(fresh);
    setPage(1);
    showToast("Transactions imported successfully", "success");
  };

  const handleAccountCreated = (account: BankAccount) => {
    setBankAccounts((prev) => [...prev, account]);
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterStart && t.date < filterStart) return false;
      if (filterEnd && t.date > filterEnd) return false;
      if (filterAccount !== "all" && t.account_id !== filterAccount) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, filterType, filterCategory, filterStart, filterEnd, filterAccount, search]);

  // For summary, replace split parents with their children to avoid double-counting
  const summaryTxns = useMemo(
    () => filtered.flatMap((t) => (t.is_split ? (t.children ?? []) : [t])),
    [filtered]
  );
  const totalIncome = useMemo(
    () => summaryTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
    [summaryTxns]
  );
  const totalExpenses = useMemo(
    () => summaryTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    [summaryTxns]
  );
  const netProfit = totalIncome - totalExpenses;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allPageSelected =
    paginated.length > 0 && paginated.every((t) => selectedIds.has(t.id));

  const togglePageSelect = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((t) => next.add(t.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCategoryChange = async (id: string, category: string) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, category } : t)));
    const result = await updateTransactionCategory(id, category);
    if (!result.success) {
      showToast("Failed to update category", "error");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteTransaction(id);
    if (result.success) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showToast("Transaction deleted", "success");
    } else {
      showToast("Failed to delete transaction", "error");
    }
    setDeletingId(null);
  };

  const handleAssignSingle = async (txId: string, accId: string) => {
    const result = await assignTransactionsToAccount(accId, [txId]);
    if (result.success) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, account_id: accId } : t))
      );
      setAssigningTxId(null);
    } else {
      showToast("Failed to assign account", "error");
    }
  };

  const handleBulkAssign = async (accountId: string) => {
    if (!accountId || selectedIds.size === 0) return;
    setIsBulkAssigning(true);
    const ids = Array.from(selectedIds);
    const result = await assignTransactionsToAccount(accountId, ids);
    if (result.success) {
      setTransactions((prev) =>
        prev.map((t) => (selectedIds.has(t.id) ? { ...t, account_id: accountId } : t))
      );
      setBulkAccountId("");
      setSelectedIds(new Set());
      showToast(`${ids.length} transaction${ids.length !== 1 ? "s" : ""} assigned`, "success");
    } else {
      showToast("Failed to assign accounts", "error");
    }
    setIsBulkAssigning(false);
  };

  const handleBulkCategoryChange = async (category: string) => {
    if (!category || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    // Optimistic update
    setTransactions((prev) =>
      prev.map((t) => (selectedIds.has(t.id) ? { ...t, category } : t))
    );
    setBulkCategoryId("");
    setSelectedIds(new Set());
    await Promise.all(ids.map((id) => updateTransactionCategory(id, category)));
    showToast(
      `Updated category for ${ids.length} transaction${ids.length !== 1 ? "s" : ""}`,
      "success"
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.all(ids.map((id) => deleteTransaction(id)));
    const successIds = ids.filter((_, i) => results[i].success);
    setTransactions((prev) => prev.filter((t) => !successIds.includes(t.id)));
    setSelectedIds(new Set());
    if (successIds.length > 0) {
      showToast(
        `Deleted ${successIds.length} transaction${successIds.length !== 1 ? "s" : ""}`,
        "success"
      );
    }
    if (successIds.length < ids.length) {
      showToast("Some transactions could not be deleted", "error");
    }
    setIsBulkDeleting(false);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Payee", "Description", "Account", "Category", "Type", "Amount"];
    const rows = filtered.map((t) => [
      t.date,
      `"${(t.payee_name ?? "Unknown").replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.account_id ? (accountMap.get(t.account_id)?.name ?? "") : "",
      t.category,
      t.type,
      t.amount,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateTransaction = async () => {
    if (!newTxForm.description.trim()) {
      setNewTxError("Description is required.");
      return;
    }
    const amt = Number(newTxForm.amount);
    if (!newTxForm.amount || isNaN(amt) || amt <= 0) {
      setNewTxError("Amount must be greater than 0.");
      return;
    }
    setNewTxError(null);
    setIsCreating(true);
    const result = await createTransaction({
      date: newTxForm.date,
      description: newTxForm.description.trim(),
      amount: amt,
      type: newTxForm.type,
      category: newTxForm.category,
      account_id: newTxForm.account_id || undefined,
      payee_id: newTxForm.payee_id,
      payee_name: newTxForm.payee_name || "Unknown",
    });
    if (result.success) {
      setTransactions((prev) => {
        const next = [...prev, result.transaction];
        next.sort((a, b) => b.date.localeCompare(a.date));
        return next;
      });
      showToast("Transaction added", "success");
      setShowAddForm(false);
      setNewTxForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        type: "expense",
        category: "Uncategorized",
        account_id: "",
        payee_id: null,
        payee_name: "",
      });
    } else {
      setNewTxError(result.error ?? "Failed to create transaction.");
    }
    setIsCreating(false);
  };

  const handleUpdateDescription = async (id: string, value: string) => {
    const trimmed = value.trim();
    setEditingDescriptionId(null);
    if (!trimmed) return;
    const original = transactions.find((t) => t.id === id)?.description ?? "";
    if (trimmed === original) return;
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, description: trimmed } : t))
    );
    const result = await updateTransactionDescription(id, trimmed);
    if (result.success) {
      setSuccessCellId(`${id}-description`);
      setTimeout(() => setSuccessCellId(null), 1000);
    } else {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, description: original } : t))
      );
      showToast("Failed to update description", "error");
    }
  };

  const handleUpdateField = async (
    id: string,
    field: "amount" | "date",
    value: string
  ) => {
    setEditingCell(null);
    if (!value.trim()) return;
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    const updateData: Partial<{ amount: number; date: string }> = {};
    if (field === "amount") {
      const num = Number(value);
      if (isNaN(num) || num <= 0) return;
      if (num === tx.amount) return;
      updateData.amount = num;
    } else {
      if (value === tx.date) return;
      updateData.date = value;
    }
    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updateData } : t));
      if (field === "date") next.sort((a, b) => b.date.localeCompare(a.date));
      return next;
    });
    const result = await updateTransaction(id, updateData);
    if (result.success) {
      setSuccessCellId(`${id}-${field}`);
      setTimeout(() => setSuccessCellId(null), 1000);
    } else {
      setTransactions((prev) => prev.map((t) => (t.id === id ? tx : t)));
      showToast("Failed to update transaction", "error");
    }
  };

  const handleSaveSplit = async (
    parentId: string,
    splits: Array<{ description: string; amount: number; category: string; account_type: string; type: "income" | "expense" }>
  ) => {
    setIsSplitting(true);
    const result = await splitTransaction(parentId, splits);
    if (result.success) {
      const fresh = await getTransactions();
      setTransactions(fresh);
      setSplitPanelTxId(null);
      setExpandedSplitIds((prev) => { const s = new Set(prev); s.add(parentId); return s; });
      showToast("Transaction split successfully", "success");
    } else {
      showToast(result.error ?? "Failed to split transaction", "error");
    }
    setIsSplitting(false);
  };

  const handleUnsplit = async (parentId: string) => {
    const result = await unsplitTransaction(parentId);
    if (result.success) {
      const fresh = await getTransactions();
      setTransactions(fresh);
      setExpandedSplitIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
      showToast("Transaction unsplit", "success");
    } else {
      showToast("Failed to unsplit transaction", "error");
    }
  };

  const toggleSplitExpanded = (id: string) => {
    setExpandedSplitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const inputCls =
    "bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99]";

  return (
    <div>
      <UploadPanel
        bankAccounts={bankAccounts}
        onImportSuccess={handleImportSuccess}
        onAccountCreated={handleAccountCreated}
      />

      {/* Transaction List Card */}
      <div id="transaction-table" className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <h2 className="font-syne text-xl font-bold text-[#E8ECF4]">Transactions</h2>
            <span className="bg-[#1E2A45] text-[#6B7A99] text-xs font-medium px-2.5 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 border border-[#4F7FFF] text-[#4F7FFF] hover:bg-[#4F7FFF]/10 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              Add Transaction
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] hover:border-[#4F7FFF]/50 rounded-lg text-sm transition-colors disabled:opacity-40"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2 mb-5">
          {/* 1. Date range — aligns with Date column (w-32) */}
          <input
            type="date"
            value={filterStart}
            placeholder="From"
            onChange={(e) => { setFilterStart(e.target.value); setPage(1); setSelectedIds(new Set()); }}
            className={`${inputCls} w-32`}
          />
          <input
            type="date"
            value={filterEnd}
            placeholder="To"
            onChange={(e) => { setFilterEnd(e.target.value); setPage(1); setSelectedIds(new Set()); }}
            className={`${inputCls} w-32`}
          />
          {/* 2. Account — aligns with Account column (w-36) */}
          {bankAccounts.length > 0 && (
            <select
              value={filterAccount}
              onChange={(e) => { setFilterAccount(e.target.value); setPage(1); }}
              className={`${inputCls} w-36`}
            >
              <option value="all">All Accounts</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} — {acc.name}
                </option>
              ))}
            </select>
          )}
          {/* 3. Description search — aligns with Description column (flex-1) */}
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectedIds(new Set()); }}
            placeholder="Search description..."
            className={`${inputCls} flex-1 min-w-[160px]`}
          />
          {/* 4. Category — aligns with Category column (w-44) */}
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); setSelectedIds(new Set()); }}
            className={`${inputCls} w-44`}
          >
            <option value="all">All Categories</option>
            <option value="Uncategorized">Uncategorized</option>
            <optgroup label="── Income ──">
              {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="── Expenses ──">
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="── Equity ──">
              {EQUITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="── Liabilities ──">
              {LIABILITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="── Transfers ──">
              {TRANSFER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="── Fixed Assets (Advanced) ──">
              {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          </select>
          {/* 5. Type — aligns with Type+Amount columns (w-28) */}
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); setSelectedIds(new Set()); }}
            className={`${inputCls} w-28`}
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* Summary Bar */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#0A0F1E] border border-[#1E2A45] rounded-lg p-4">
              <p className="text-xs text-[#6B7A99] mb-1">Total In</p>
              <p className="text-lg font-bold text-[#22C55E]">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-[#0A0F1E] border border-[#1E2A45] rounded-lg p-4">
              <p className="text-xs text-[#6B7A99] mb-1">Total Out</p>
              <p className="text-lg font-bold text-[#EF4444]">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="bg-[#0A0F1E] border border-[#1E2A45] rounded-lg p-4">
              <p className="text-xs text-[#6B7A99] mb-1">Net</p>
              <p className={`text-lg font-bold ${netProfit >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                {netProfit >= 0 ? "+" : ""}
                {formatCurrency(netProfit)}
              </p>
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        <div
          className={`mb-5 overflow-hidden transition-all duration-200 ease-in-out ${
            selectedIds.size > 0
              ? "max-h-40 opacity-100"
              : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#4F7FFF]/10 border border-[#4F7FFF]/30 rounded-lg px-4 py-3 w-full">
            {/* Count */}
            <span className="text-sm font-medium text-[#E8ECF4] flex-shrink-0">
              {selectedIds.size} transaction{selectedIds.size !== 1 ? "s" : ""} selected
            </span>

            {/* Right-side actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:ml-auto">
              {/* Assign account */}
              {bankAccounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7A99] flex-shrink-0">Assign account:</span>
                  <select
                    value={bulkAccountId}
                    disabled={isBulkAssigning}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBulkAccountId(val);
                      if (val) handleBulkAssign(val);
                    }}
                    className="w-full sm:w-auto bg-[#0A0F1E] border border-[#4F7FFF]/30 text-[#E8ECF4] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#4F7FFF] disabled:opacity-60"
                  >
                    <option value="">{isBulkAssigning ? "Assigning…" : "Change account…"}</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bank_name} — {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assign category */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7A99] flex-shrink-0">Assign category:</span>
                <select
                  value={bulkCategoryId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkCategoryId(val);
                    if (val) handleBulkCategoryChange(val);
                  }}
                  className="w-full sm:w-auto bg-[#0A0F1E] border border-[#4F7FFF]/30 text-[#E8ECF4] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#4F7FFF]"
                >
                  <option value="">Change category…</option>
                  <option value="Uncategorized">Uncategorized</option>
                  <optgroup label="── Income ──">
                    {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Expenses ──">
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Equity ──">
                    {EQUITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Liabilities ──">
                    {LIABILITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Transfers ──">
                    {TRANSFER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Fixed Assets (Advanced) ──">
                    {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Deselect all */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] transition-colors flex-shrink-0"
              >
                Deselect all
              </button>

              {/* Bulk delete */}
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="p-1.5 rounded text-[#6B7A99] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors disabled:opacity-40 flex-shrink-0"
                title="Delete selected transactions"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Create Transaction Form */}
        {showAddForm && (
          <div className="mb-5 bg-[#0A0F1E] border border-[#1E2A45] rounded-xl p-5">
            <h3 className="font-syne text-sm font-semibold text-[#E8ECF4] mb-4">New Transaction</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs text-[#6B7A99] mb-1 block">Date</label>
                <input
                  type="date"
                  value={newTxForm.date}
                  onChange={(e) => setNewTxForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls + " w-full"}
                />
              </div>
              <div>
                <label className="text-xs text-[#6B7A99] mb-1 block">Payee</label>
                <PayeeCombobox
                  payeeName={newTxForm.payee_name}
                  onChange={(payee_id, payee_name) =>
                    setNewTxForm((f) => ({ ...f, payee_id, payee_name }))
                  }
                  onAddNew={(name) => {
                    setNewContactInitialName(name);
                    setShowAddContactInTx(true);
                  }}
                  inputCls={inputCls}
                />
              </div>
              <div className="lg:col-span-3 sm:col-span-2">
                <label className="text-xs text-[#6B7A99] mb-1 block">Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Office supplies from Staples"
                  value={newTxForm.description}
                  onChange={(e) => setNewTxForm((f) => ({ ...f, description: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateTransaction(); }}
                  className={inputCls + " w-full"}
                />
              </div>
              <div>
                <label className="text-xs text-[#6B7A99] mb-1 block">Amount *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={newTxForm.amount}
                  onChange={(e) => setNewTxForm((f) => ({ ...f, amount: e.target.value }))}
                  className={inputCls + " w-full"}
                />
              </div>
              <div>
                <label className="text-xs text-[#6B7A99] mb-1 block">Type</label>
                <select
                  value={newTxForm.type}
                  onChange={(e) =>
                    setNewTxForm((f) => ({ ...f, type: e.target.value as "income" | "expense" }))
                  }
                  className={inputCls + " w-full"}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6B7A99] mb-1 block">Category</label>
                <select
                  value={newTxForm.category}
                  onChange={(e) => setNewTxForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputCls + " w-full"}
                >
                  <option value="Uncategorized">Uncategorized</option>
                  <optgroup label="── Income ──">
                    {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Expenses ──">
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Equity ──">
                    {EQUITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Liabilities ──">
                    {LIABILITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Transfers ──">
                    {TRANSFER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Fixed Assets (Advanced) ──">
                    {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>
              </div>
              {bankAccounts.length > 0 && (
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Account</label>
                  <select
                    value={newTxForm.account_id}
                    onChange={(e) => setNewTxForm((f) => ({ ...f, account_id: e.target.value }))}
                    className={inputCls + " w-full"}
                  >
                    <option value="">No account</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{accountLabel(acc)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {newTxError && <p className="text-sm text-[#EF4444] mb-3">{newTxError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreateTransaction}
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={14} />
                {isCreating ? "Saving…" : "Save Transaction"}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewTxError(null); }}
                className="px-4 py-2 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1E2A45] flex items-center justify-center mb-4">
              <BookOpen size={28} className="text-[#6B7A99]" />
            </div>
            <p className="font-syne font-semibold text-[#E8ECF4] text-lg mb-1">
              No transactions yet
            </p>
            <p className="text-sm text-[#6B7A99]">
              Upload a CSV from your bank to get started
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[#6B7A99]">No transactions match your filters</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-[#1E2A45]">
              <table className="w-full text-sm table-fixed min-w-[1000px]">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-32" />
                  <col className="w-36" />
                  <col className="w-36" />
                  <col />
                  <col className="w-44" />
                  <col className="w-12" />
                  <col className="w-24" />
                  <col className="w-28" />
                  <col className="w-10" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#1E2A45] bg-[#0A0F1E]">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={togglePageSelect}
                        className="rounded border-[#1E2A45] accent-[#4F7FFF] cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-[#6B7A99] font-medium text-left">Date</th>
                    <th className="px-4 py-3 text-[#6B7A99] font-medium text-left">Payee</th>
                    <th className="px-4 py-3 text-[#6B7A99] font-medium text-left">Account</th>
                    <th className="px-4 py-3 text-[#6B7A99] font-medium text-left">Description</th>
                    <th className="px-4 py-3 text-[#6B7A99] font-medium text-left">Category</th>
                    <th className="px-2 py-3" />
                    <th className="px-4 py-3 text-[#6B7A99] font-medium text-left">Type</th>
                    <th className="px-4 py-3 text-[#6B7A99] font-medium text-right">Amount</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t) => {
                    const linkedAccount = t.account_id ? accountMap.get(t.account_id) : null;
                    const isAssigning = assigningTxId === t.id;
                    const isSplitParent = !!t.is_split;
                    const isExpanded = expandedSplitIds.has(t.id);
                    const splitChildren = t.children ?? [];

                    return (
                      <Fragment key={t.id}>
                        {/* ── Main row ──────────────────────────────────── */}
                        <tr
                          className={`group border-b border-[#1E2A45] transition-colors ${
                            selectedIds.has(t.id)
                              ? "bg-[#4F7FFF]/5"
                              : isSplitParent
                              ? "bg-[#A855F7]/5 hover:bg-[#A855F7]/10"
                              : "hover:bg-[#1E2A45]/20"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(t.id)}
                              onChange={() => toggleSelect(t.id)}
                              className="rounded border-[#1E2A45] accent-[#4F7FFF] cursor-pointer"
                            />
                          </td>

                          {/* Date */}
                          <td className={`px-4 py-3 whitespace-nowrap ${successCellId === `${t.id}-date` ? "ring-1 ring-[#22C55E] rounded" : ""}`}>
                            {editingCell?.id === t.id && editingCell?.field === "date" ? (
                              <input
                                autoFocus
                                type="date"
                                value={editingCell.value}
                                onChange={(e) =>
                                  setEditingCell((c) => c ? { ...c, value: e.target.value } : null)
                                }
                                onBlur={(e) => {
                                  if (cellEditCancelledRef.current) {
                                    cellEditCancelledRef.current = false;
                                    return;
                                  }
                                  handleUpdateField(t.id, "date", e.currentTarget.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") {
                                    cellEditCancelledRef.current = true;
                                    setEditingCell(null);
                                  }
                                }}
                                className="bg-[#0A0F1E] border border-[#4F7FFF] rounded px-2 py-1 text-sm text-[#E8ECF4] focus:outline-none"
                              />
                            ) : (
                              <span
                                className="text-[#E8ECF4] cursor-pointer hover:underline"
                                onClick={() => setEditingCell({ id: t.id, field: "date", value: t.date })}
                                title="Click to edit date"
                              >
                                {formatDate(t.date)}
                              </span>
                            )}
                          </td>

                          {/* Payee */}
                          <td className="px-4 py-3 min-w-0">
                            {t.payee_name && t.payee_name !== "Unknown" ? (
                              <span className="text-sm text-[#E8ECF4] truncate block" title={t.payee_name}>
                                {t.payee_name}
                              </span>
                            ) : (
                              <span className="text-sm text-[#6B7A99] italic">Unknown</span>
                            )}
                          </td>

                          {/* Account */}
                          <td className="px-4 py-3">
                            {linkedAccount ? (
                              <span className="text-sm text-[#6B7A99] whitespace-nowrap">
                                {linkedAccount.name}
                              </span>
                            ) : isAssigning ? (
                              <div className="flex items-center gap-1">
                                <select
                                  autoFocus
                                  className="bg-[#0A0F1E] border border-[#4F7FFF] text-[#E8ECF4] rounded px-2 py-1 text-xs focus:outline-none max-w-[140px]"
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) handleAssignSingle(t.id, e.target.value);
                                  }}
                                >
                                  <option value="">Pick account…</option>
                                  {bankAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setAssigningTxId(null)}
                                  className="text-[#6B7A99] hover:text-[#E8ECF4]"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 whitespace-nowrap">
                                  Unknown Account
                                </span>
                                {bankAccounts.length > 0 && (
                                  <button
                                    onClick={() => setAssigningTxId(t.id)}
                                    className="text-xs text-[#4F7FFF] hover:underline whitespace-nowrap"
                                  >
                                    Assign
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Description */}
                          <td className={`px-4 py-3 min-w-0 ${successCellId === `${t.id}-description` ? "ring-1 ring-[#22C55E] rounded" : ""}`}>
                            {editingDescriptionId === t.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={editingDescriptionValue}
                                onChange={(e) => setEditingDescriptionValue(e.target.value)}
                                onBlur={(e) => {
                                  if (descEditCancelledRef.current) {
                                    descEditCancelledRef.current = false;
                                    return;
                                  }
                                  handleUpdateDescription(t.id, e.currentTarget.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") {
                                    descEditCancelledRef.current = true;
                                    setEditingDescriptionId(null);
                                  }
                                }}
                                className="bg-[#0A0F1E] border border-[#4F7FFF] rounded px-2 py-1 text-sm text-[#E8ECF4] w-full focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div
                                  className="truncate text-[#E8ECF4] cursor-default"
                                  title={t.description}
                                  onDoubleClick={() => {
                                    setEditingDescriptionId(t.id);
                                    setEditingDescriptionValue(t.description);
                                  }}
                                >
                                  {t.description}
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingDescriptionId(t.id);
                                    setEditingDescriptionValue(t.description);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-[#6B7A99] hover:text-[#4F7FFF] transition-opacity flex-shrink-0"
                                  title="Edit description"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            {isSplitParent ? (
                              <span className="text-xs text-[#6B7A99] italic">Split transaction</span>
                            ) : (
                              <select
                                value={t.category}
                                onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                                className="bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4F7FFF] max-w-[150px]"
                              >
                                <option value="Uncategorized">Uncategorized</option>
                                <optgroup label="── Income ──">
                                  {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                                <optgroup label="── Expenses ──">
                                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                                <optgroup label="── Equity ──">
                                  {EQUITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                                <optgroup label="── Liabilities ──">
                                  {LIABILITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                                <optgroup label="── Transfers ──">
                                  {TRANSFER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                                <optgroup label="── Fixed Assets (Advanced) ──">
                                  {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                              </select>
                            )}
                          </td>

                          {/* Split / expand column */}
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-0.5">
                              {isSplitParent && (
                                <button
                                  onClick={() => toggleSplitExpanded(t.id)}
                                  className="p-1 rounded text-[#A855F7] hover:bg-[#A855F7]/10 transition-colors"
                                  title={isExpanded ? "Collapse splits" : "Expand splits"}
                                >
                                  <ChevronDown
                                    size={13}
                                    className={`transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                                  />
                                </button>
                              )}
                              <button
                                onClick={() => setSplitPanelTxId(splitPanelTxId === t.id ? null : t.id)}
                                className={`p-1 rounded transition-colors ${
                                  splitPanelTxId === t.id
                                    ? "text-[#A855F7] bg-[#A855F7]/10"
                                    : "text-[#6B7A99] hover:text-[#A855F7] hover:bg-[#A855F7]/10"
                                }`}
                                title="Split transaction"
                              >
                                <Scissors size={13} />
                              </button>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3">
                            {isSplitParent ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#A855F7]/10 text-[#A855F7]">
                                Split
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  t.type === "income"
                                    ? "bg-[#22C55E]/10 text-[#22C55E]"
                                    : "bg-[#EF4444]/10 text-[#EF4444]"
                                }`}
                              >
                                {t.type === "income" ? "Income" : "Expense"}
                              </span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${isSplitParent ? "opacity-50" : ""} ${successCellId === `${t.id}-amount` ? "ring-1 ring-[#22C55E] rounded" : ""}`}>
                            {!isSplitParent && editingCell?.id === t.id && editingCell?.field === "amount" ? (
                              <input
                                autoFocus
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editingCell.value}
                                onChange={(e) =>
                                  setEditingCell((c) => c ? { ...c, value: e.target.value } : null)
                                }
                                onBlur={(e) => {
                                  if (cellEditCancelledRef.current) {
                                    cellEditCancelledRef.current = false;
                                    return;
                                  }
                                  handleUpdateField(t.id, "amount", e.currentTarget.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") {
                                    cellEditCancelledRef.current = true;
                                    setEditingCell(null);
                                  }
                                }}
                                className="bg-[#0A0F1E] border border-[#4F7FFF] rounded px-2 py-1 text-sm text-[#E8ECF4] w-24 text-right focus:outline-none"
                              />
                            ) : (
                              <span
                                className={`${isSplitParent ? "cursor-default" : "cursor-pointer hover:underline"} ${
                                  t.type === "income" ? "text-[#22C55E]" : "text-[#EF4444]"
                                }`}
                                onClick={() => {
                                  if (!isSplitParent)
                                    setEditingCell({ id: t.id, field: "amount", value: String(t.amount) });
                                }}
                                title={isSplitParent ? undefined : "Click to edit amount"}
                              >
                                {t.type === "income" ? "+" : "-"}
                                {formatCurrency(Number(t.amount))}
                              </span>
                            )}
                          </td>

                          {/* Delete */}
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={deletingId === t.id}
                              className="p-1.5 rounded text-[#6B7A99] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors disabled:opacity-40"
                              title={isSplitParent ? "Delete transaction and all splits" : "Delete transaction"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>

                        {/* ── Split panel row ────────────────────────── */}
                        {splitPanelTxId === t.id && (
                          <tr className="border-b border-[#1E2A45]">
                            <td colSpan={10} className="py-0">
                              <SplitPanel
                                transaction={t}
                                onSave={(splits) => handleSaveSplit(t.id, splits)}
                                onCancel={() => setSplitPanelTxId(null)}
                                isSaving={isSplitting}
                              />
                            </td>
                          </tr>
                        )}

                        {/* ── Child rows (expanded split) ────────────── */}
                        {isSplitParent && isExpanded && splitChildren.map((child, idx) => {
                          const isLastChild = idx === splitChildren.length - 1;
                          return (
                            <tr
                              key={child.id}
                              className="border-b border-[#1E2A45] bg-[#A855F7]/5"
                            >
                              {/* Checkbox: empty */}
                              <td className="px-3 py-2" />

                              {/* Date: empty */}
                              <td className="px-4 py-2" />

                              {/* Payee: empty */}
                              <td className="px-4 py-2" />

                              {/* Account: split indicator */}
                              <td className="px-4 py-2">
                                <span className="text-xs text-[#A855F7]/70 whitespace-nowrap">
                                  split {idx + 1}/{splitChildren.length}
                                </span>
                              </td>

                              {/* Description: indented */}
                              <td className="px-4 py-2 min-w-0">
                                <div className="flex items-center gap-2 pl-4 border-l-2 border-[#A855F7]/40">
                                  <span className="truncate text-sm text-[#6B7A99]" title={child.description}>
                                    {child.description}
                                  </span>
                                </div>
                              </td>

                              {/* Category: editable */}
                              <td className="px-4 py-2">
                                <select
                                  value={child.category}
                                  onChange={(e) => handleCategoryChange(child.id, e.target.value)}
                                  className="bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4F7FFF] max-w-[150px]"
                                >
                                  <option value="Uncategorized">Uncategorized</option>
                                  <optgroup label="── Income ──">
                                    {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </optgroup>
                                  <optgroup label="── Expenses ──">
                                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </optgroup>
                                  <optgroup label="── Equity ──">
                                    {EQUITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </optgroup>
                                  <optgroup label="── Liabilities ──">
                                    {LIABILITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </optgroup>
                                  <optgroup label="── Transfers ──">
                                    {TRANSFER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </optgroup>
                                  <optgroup label="── Fixed Assets (Advanced) ──">
                                    {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </optgroup>
                                </select>
                              </td>

                              {/* Split column: empty for children */}
                              <td className="px-2 py-2" />

                              {/* Type */}
                              <td className="px-4 py-2">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    child.type === "income"
                                      ? "bg-[#22C55E]/10 text-[#22C55E]"
                                      : "bg-[#EF4444]/10 text-[#EF4444]"
                                  }`}
                                >
                                  {child.type === "income" ? "Income" : "Expense"}
                                </span>
                              </td>

                              {/* Amount */}
                              <td className="px-4 py-2 text-right font-medium whitespace-nowrap">
                                <span className={child.type === "income" ? "text-[#22C55E]" : "text-[#EF4444]"}>
                                  {child.type === "income" ? "+" : "-"}
                                  {formatCurrency(Number(child.amount))}
                                </span>
                              </td>

                              {/* Unsplit button on last child */}
                              <td className="px-4 py-2 text-right">
                                {isLastChild && (
                                  <button
                                    onClick={() => handleUnsplit(t.id)}
                                    className="text-xs text-[#6B7A99] hover:text-[#EF4444] transition-colors whitespace-nowrap"
                                    title="Remove split and restore original transaction"
                                  >
                                    × Unsplit
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E2A45]">
                <p className="text-sm text-[#6B7A99]">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] hover:border-[#4F7FFF]/50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-[#E8ECF4] px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] hover:border-[#4F7FFF]/50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {showAddContactInTx && (
        <ContactFormModal
          initialName={newContactInitialName}
          onClose={() => setShowAddContactInTx(false)}
          onSaved={(contact) => {
            setNewTxForm((f) => ({
              ...f,
              payee_id: contact.id,
              payee_name: contact.display_name,
            }));
            setShowAddContactInTx(false);
          }}
        />
      )}
    </div>
  );
}
