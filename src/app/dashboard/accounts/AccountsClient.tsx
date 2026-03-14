"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Plus, Building2, X } from "lucide-react";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getAccountSummary,
} from "./actions";
import type { AccountSummary } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  checking: "bg-[#4F7FFF]/10 text-[#4F7FFF]",
  savings: "bg-[#22C55E]/10 text-[#22C55E]",
  credit_card: "bg-purple-500/10 text-purple-400",
  other: "bg-[#6B7A99]/20 text-[#6B7A99]",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface FormState {
  name: string;
  bank_name: string;
  account_type: "checking" | "savings" | "credit_card" | "other";
  last_four: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  bank_name: "",
  account_type: "checking",
  last_four: "",
};

interface ToastState {
  message: string;
  type: "success" | "error";
}

interface Props {
  initialAccounts: AccountSummary[];
}

export default function AccountsClient({ initialAccounts }: Props) {
  const [accounts, setAccounts] = useState<AccountSummary[]>(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (acc: AccountSummary) => {
    setEditingId(acc.id);
    setForm({
      name: acc.name,
      bank_name: acc.bank_name,
      account_type: acc.account_type,
      last_four: acc.last_four ?? "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      setFormError("Account nickname is required.");
      return;
    }
    if (!form.bank_name.trim()) {
      setFormError("Bank name is required.");
      return;
    }
    setFormError(null);

    startSaving(async () => {
      const lastFour = form.last_four.trim() || null;
      const payload = {
        name: form.name.trim(),
        bank_name: form.bank_name.trim(),
        account_type: form.account_type,
        last_four: lastFour,
      };

      let result;
      if (editingId) {
        result = await updateBankAccount(editingId, payload);
      } else {
        result = await createBankAccount({
          ...payload,
          last_four: lastFour ?? undefined,
        });
      }

      if (!result.success) {
        setFormError(result.error ?? "Something went wrong.");
        return;
      }

      const fresh = await getAccountSummary();
      setAccounts(fresh);
      closeForm();
      showToast(editingId ? "Account updated" : "Account created", "success");
    });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteBankAccount(id);
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      showToast("Account deleted", "success");
    } else {
      showToast("Failed to delete account", "error");
    }
    setDeletingId(null);
  };

  const inputCls =
    "w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99]";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne text-3xl font-bold text-[#E8ECF4]">Bank Accounts</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Organize your transactions by bank account</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white font-medium text-sm rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Account
        </button>
      </div>

      {/* Inline form panel */}
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          showForm ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne text-lg font-semibold text-[#E8ECF4]">
              {editingId ? "Edit Account" : "Add Account"}
            </h2>
            <button
              onClick={closeForm}
              className="p-1 text-[#6B7A99] hover:text-[#E8ECF4] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#6B7A99] mb-1.5">Account nickname *</label>
              <input
                type="text"
                placeholder="e.g. Business Checking"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7A99] mb-1.5">Bank name *</label>
              <input
                type="text"
                placeholder="e.g. Wells Fargo"
                value={form.bank_name}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7A99] mb-1.5">Account type</label>
              <select
                value={form.account_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    account_type: e.target.value as FormState["account_type"],
                  }))
                }
                className={inputCls}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit_card">Credit Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B7A99] mb-1.5">Last 4 digits (optional)</label>
              <input
                type="text"
                placeholder="e.g. 1234"
                value={form.last_four}
                maxLength={4}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setForm((f) => ({ ...f, last_four: val }));
                }}
                className={inputCls}
              />
            </div>
          </div>

          {formError && <p className="text-sm text-[#EF4444] mb-3">{formError}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={closeForm}
              disabled={isSaving}
              className="px-5 py-2 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] hover:border-[#4F7FFF]/50 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1E2A45] flex items-center justify-center mb-4">
            <Building2 size={28} className="text-[#6B7A99]" />
          </div>
          <p className="font-syne font-semibold text-[#E8ECF4] text-lg mb-1">No bank accounts yet</p>
          <p className="text-sm text-[#6B7A99] mb-6">
            Add your first account to start organizing your transactions
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white font-medium text-sm rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>
      ) : (
        /* Account cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <Link
              key={acc.id}
              href={`/dashboard/bookkeeping?account=${acc.id}`}
              className="block bg-[#111827] border border-[#1E2A45] rounded-xl p-5 hover:border-[#4F7FFF]/50 transition-colors group"
              onClick={(e) => {
                // Prevent navigation if clicking action buttons
                if ((e.target as HTMLElement).closest("[data-action]")) {
                  e.preventDefault();
                }
              }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-syne font-semibold text-[#E8ECF4] text-base leading-tight">
                    {acc.bank_name}
                  </p>
                  <p className="text-sm text-[#6B7A99] mt-0.5">{acc.name}</p>
                </div>
                <div className="flex items-center gap-1" data-action>
                  <button
                    data-action
                    onClick={() => openEdit(acc)}
                    className="p-1.5 rounded text-[#6B7A99] hover:text-[#4F7FFF] hover:bg-[#4F7FFF]/10 transition-colors"
                    title="Edit account"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    data-action
                    onClick={() => handleDelete(acc.id)}
                    disabled={deletingId === acc.id}
                    className="p-1.5 rounded text-[#6B7A99] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors disabled:opacity-40"
                    title="Delete account"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    TYPE_COLORS[acc.account_type] ?? TYPE_COLORS.other
                  }`}
                >
                  {TYPE_LABELS[acc.account_type] ?? "Other"}
                </span>
                {acc.last_four && (
                  <span className="text-sm text-[#6B7A99] font-mono">••••{acc.last_four}</span>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-[#0A0F1E] rounded-lg p-2.5 text-center">
                  <p className="text-xs text-[#6B7A99] mb-0.5">Transactions</p>
                  <p className="text-sm font-semibold text-[#E8ECF4]">{acc.transaction_count}</p>
                </div>
                <div className="bg-[#0A0F1E] rounded-lg p-2.5 text-center">
                  <p className="text-xs text-[#6B7A99] mb-0.5">Income</p>
                  <p className="text-sm font-semibold text-[#22C55E]">
                    {formatCurrency(acc.total_income)}
                  </p>
                </div>
                <div className="bg-[#0A0F1E] rounded-lg p-2.5 text-center">
                  <p className="text-xs text-[#6B7A99] mb-0.5">Expenses</p>
                  <p className="text-sm font-semibold text-[#EF4444]">
                    {formatCurrency(acc.total_expenses)}
                  </p>
                </div>
              </div>

              {/* Net balance */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1E2A45]">
                <p className="text-xs text-[#6B7A99]">Net</p>
                <p
                  className={`text-sm font-bold ${
                    acc.net >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                  }`}
                >
                  {acc.net >= 0 ? "+" : ""}
                  {formatCurrency(acc.net)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]"
              : "bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]"
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
