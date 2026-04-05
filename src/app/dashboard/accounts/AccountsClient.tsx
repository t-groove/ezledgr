"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Pencil,
  Plus,
  Building2,
  X,
  Link2,
  PencilLine,
  RefreshCw,
  Info,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getAccountSummary,
} from "./actions";
import type { AccountSummary } from "./actions";
import { createClient as createBrowserClient } from "../../../../supabase/client";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import type { PlaidAccountInfo } from "@/components/PlaidLinkButton";

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDefaultSyncStartDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return toDateStr(d);
}

function getMinSyncDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return toDateStr(d);
}

function getMaxSyncDate(): string {
  const d = new Date(Date.now() - 86400000);
  return toDateStr(d);
}

// ── Plaid subtype → EZ Ledgr account type ────────────────────────────────────

const SUBTYPE_MAP: Record<string, string> = {
  checking: "checking",
  savings: "savings",
  cd: "savings",
  "money market": "savings",
  "credit card": "credit_card",
  paypal: "other",
  prepaid: "other",
};

function mapSubtype(subtype: string | null): string {
  if (!subtype) return "checking";
  return SUBTYPE_MAP[subtype.toLowerCase()] ?? "checking";
}

function getCompatibleTypes(plaidSubtype: string | null): string[] {
  const subtype = (plaidSubtype ?? "").toLowerCase();
  if (["checking", "savings", "money market", "prepaid"].includes(subtype)) {
    return ["checking", "savings"];
  }
  if (["credit card", "paypal"].includes(subtype)) {
    return ["credit_card"];
  }
  if (["loan", "mortgage", "student", "auto", "home equity"].includes(subtype)) {
    return ["other"];
  }
  return ["checking", "savings", "credit_card", "cash", "other"];
}

// ── Display constants ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  checking: "bg-[#4F7FFF]/10 text-[#4F7FFF]",
  savings: "bg-[#22C55E]/10 text-[#22C55E]",
  credit_card: "bg-purple-500/10 text-purple-400",
  cash: "bg-[#F59E0B]/10 text-[#F59E0B]",
  other: "bg-[#6B7A99]/20 text-[#6B7A99]",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatSyncDate(dateStr: string | null): string {
  if (!dateStr) return "Never synced";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  bank_name: string;
  account_type: "checking" | "savings" | "credit_card" | "cash" | "other";
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

type MappingAction = "map_existing" | "create_new" | "skip";

interface AccountMapping {
  action: MappingAction;
  existingAccountId?: string;
  newAccount: {
    name: string;
    account_type: string;
    last_four: string;
  };
}

interface PlaidConnectionData {
  accessToken: string;
  itemId: string;
  institutionName: string;
  institutionId: string;
  plaidAccounts: PlaidAccountInfo[];
  existingAccountId?: string;
}

interface Props {
  initialAccounts: AccountSummary[];
  businessId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AccountsClient({ initialAccounts, businessId }: Props) {
  const [accounts, setAccounts] = useState<AccountSummary[]>(initialAccounts);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountSummary | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sync start date — shared across all connect / sync operations
  const [syncStartDate, setSyncStartDate] = useState(getDefaultSyncStartDate());

  // Plaid account mapping modal state
  const [plaidConnectionData, setPlaidConnectionData] = useState<PlaidConnectionData | null>(null);
  const [accountMappings, setAccountMappings] = useState<Record<string, AccountMapping>>({});
  const [isSavingMappings, setIsSavingMappings] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Manual account form ────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowAddModal(true);
  };

  const openEdit = (acc: AccountSummary) => {
    setEditingId(acc.id);
    setEditingAccount(acc);
    setForm({
      name: acc.name,
      bank_name: acc.bank_name,
      account_type: acc.account_type,
      last_four: acc.last_four ?? "",
    });
    setFormError(null);
  };

  const closeForm = () => {
    setEditingAccount(null);
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
        result = await createBankAccount({ ...payload, last_four: lastFour ?? undefined });
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
    const result = await deleteBankAccount(id);
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      closeForm();
      showToast("Account deleted", "success");
    } else {
      showToast("Failed to delete account", "error");
    }
  };

  const handleDisconnectPlaid = async () => {
    if (!editingAccount) return;
    setIsDisconnecting(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("bank_accounts")
      .update({
        plaid_access_token: null,
        plaid_item_id: null,
        plaid_account_id: null,
        plaid_cursor: null,
        is_plaid_connected: false,
      })
      .eq("id", editingAccount.id);
    setIsDisconnecting(false);
    if (!error) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editingAccount.id ? { ...a, is_plaid_connected: false } : a
        )
      );
      setEditingAccount((prev) =>
        prev ? { ...prev, is_plaid_connected: false } : null
      );
      showToast("Plaid disconnected successfully.", "success");
    } else {
      showToast("Failed to disconnect. Please try again.", "error");
    }
  };

  // ── Plaid connection flow ──────────────────────────────────────────────────

  const handlePlaidConnected = (data: PlaidConnectionData) => {
    setShowAddModal(false);

    // Build initial mapping state for each Plaid account
    const mappings: Record<string, AccountMapping> = {};
    const unconnectedAccounts = accounts.filter((a) => !a.is_plaid_connected);

    data.plaidAccounts.forEach((plaidAcc, idx) => {
      const compatibleTypes = getCompatibleTypes(plaidAcc.subtype);
      const compatibleUnconnected = unconnectedAccounts.filter((a) =>
        compatibleTypes.includes(a.account_type)
      );

      // If opened from an existing account card, only pre-select it if it's a compatible type
      const preselectedAccount =
        idx === 0 && data.existingAccountId
          ? unconnectedAccounts.find(
              (a) => a.id === data.existingAccountId && compatibleTypes.includes(a.account_type)
            )
          : undefined;

      const defaultExistingId =
        preselectedAccount?.id ?? (idx === 0 && compatibleUnconnected[0]?.id);

      mappings[plaidAcc.plaid_account_id] = {
        action: defaultExistingId ? "map_existing" : "create_new",
        existingAccountId: defaultExistingId || undefined,
        newAccount: {
          name: plaidAcc.official_name ?? plaidAcc.name ?? "",
          account_type: mapSubtype(plaidAcc.subtype),
          last_four: plaidAcc.mask ?? "",
        },
      };
    });

    setAccountMappings(mappings);
    setPlaidConnectionData(data);
  };

  const closeMappingModal = () => {
    setPlaidConnectionData(null);
    setAccountMappings({});
  };

  const updateMapping = (plaidAccountId: string, patch: Partial<AccountMapping>) => {
    setAccountMappings((prev) => ({
      ...prev,
      [plaidAccountId]: { ...prev[plaidAccountId], ...patch },
    }));
  };

  const updateNewAccount = (
    plaidAccountId: string,
    patch: Partial<AccountMapping["newAccount"]>
  ) => {
    setAccountMappings((prev) => ({
      ...prev,
      [plaidAccountId]: {
        ...prev[plaidAccountId],
        newAccount: { ...prev[plaidAccountId].newAccount, ...patch },
      },
    }));
  };

  const handleConnectAccounts = async () => {
    if (!plaidConnectionData) return;

    const missingNames = plaidConnectionData.plaidAccounts.filter((acc) => {
      const mapping = accountMappings[acc.plaid_account_id];
      return mapping?.action === "create_new" && !mapping.newAccount?.name?.trim();
    });

    if (missingNames.length > 0) {
      showToast("Please enter a nickname for all new accounts.", "error");
      return;
    }

    setIsSavingMappings(true);

    // Serialize to snake_case for the API — the local state uses camelCase keys
    // but the route expects existing_account_id and new_account.
    const mappingsList = plaidConnectionData.plaidAccounts.map((plaidAcc) => {
      const m = accountMappings[plaidAcc.plaid_account_id];
      return {
        plaid_account: plaidAcc,
        action: m.action,
        existing_account_id: m.existingAccountId,
        new_account: m.newAccount,
      };
    });

    console.log('Saving mappings with business_id:', businessId, 'mappings:', mappingsList);

    const saveRes = await fetch("/api/plaid/save-account-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: plaidConnectionData.accessToken,
        item_id: plaidConnectionData.itemId,
        institution_name: plaidConnectionData.institutionName,
        institution_id: plaidConnectionData.institutionId,
        business_id: businessId,
        mappings: mappingsList,
      }),
    });

    const saveData = await saveRes.json();
    console.log('save-account-mappings response:', saveData);

    if (!saveData.success) {
      showToast("Failed to save account connections.", "error");
      setIsSavingMappings(false);
      return;
    }

    const effectiveSyncStartDate =
      syncStartDate ||
      new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        .toISOString()
        .split("T")[0];

    // Trigger initial historical sync for each newly connected account
    const connectedIds: string[] = saveData.connected_account_ids ?? [];
    await Promise.all(
      connectedIds.map((id) =>
        fetch("/api/plaid/sync-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: id, syncStartDate: effectiveSyncStartDate }),
        })
      )
    );

    const fresh = await getAccountSummary();
    setAccounts(fresh);
    setIsSavingMappings(false);
    closeMappingModal();
    showToast(
      `${connectedIds.length} account${connectedIds.length !== 1 ? "s" : ""} connected and synced!`,
      "success"
    );
  };

  // ── Shared input style ─────────────────────────────────────────────────────

  const inputCls =
    "w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99]";

  const unconnectedAccounts = accounts.filter((a) => !a.is_plaid_connected);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne text-3xl font-bold text-[#E8ECF4]">Bank Accounts</h1>
          <p className="text-sm text-[#6B7A99] mt-1">
            Organize your transactions by bank account
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white font-medium text-sm rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Account
        </button>
      </div>

      {/* Add Account choice modal */}
      {showAddModal && (
        <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6 mb-6">
          <h3 className="font-syne font-bold text-lg text-[#E8ECF4] mb-2">Add Bank Account</h3>
          <p className="text-sm text-[#6B7A99] mb-6">
            Connect your bank automatically or add manually.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Connect via Plaid */}
            <div className="bg-[#0A0F1E] border border-[#1E2A45] hover:border-[#4F7FFF]/50 rounded-xl p-5 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#4F7FFF]/10 flex items-center justify-center mb-3">
                <Link2 size={20} className="text-[#4F7FFF]" />
              </div>
              <h4 className="font-syne font-semibold text-[#E8ECF4] mb-1">Connect Bank</h4>
              <p className="text-xs text-[#6B7A99] mb-4">
                Sync transactions automatically via Plaid. Supports 12,000+ US banks.
              </p>

              {/* Historical sync date picker */}
              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-xs text-[#6B7A99] mb-1.5">
                  Pull transactions from:
                  <span
                    title="Choose how far back to import transactions on first connect"
                    className="cursor-help text-[#6B7A99] hover:text-[#E8ECF4] transition-colors"
                  >
                    <Info size={12} />
                  </span>
                </label>
                <input
                  type="date"
                  value={syncStartDate}
                  min={getMinSyncDate()}
                  max={getMaxSyncDate()}
                  onChange={(e) => setSyncStartDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <PlaidLinkButton
                businessId={businessId}
                onConnected={handlePlaidConnected}
                onExit={() => setShowAddModal(false)}
                buttonLabel="Connect via Plaid"
                buttonClassName="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white font-medium rounded-lg text-sm transition-colors"
              />
              <p className="mt-2 text-[11px] text-[#64748b]">
                🔒 2FA verification required to connect your bank
              </p>
            </div>

            {/* Add manually */}
            <div className="bg-[#0A0F1E] border border-[#1E2A45] hover:border-[#4F7FFF]/50 rounded-xl p-5 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[#6B7A99]/10 flex items-center justify-center mb-3">
                <PencilLine size={20} className="text-[#6B7A99]" />
              </div>
              <h4 className="font-syne font-semibold text-[#E8ECF4] mb-1">Add Manually</h4>
              <p className="text-xs text-[#6B7A99] mb-4">
                Add account details manually and import transactions via CSV.
              </p>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  setFormError(null);
                  setEditingAccount({ id: "" } as AccountSummary);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1E2A45] hover:border-[#4F7FFF]/50 text-[#E8ECF4] font-medium rounded-lg text-sm transition-colors"
              >
                Add manually
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(false)}
            className="mt-4 text-sm text-[#6B7A99] hover:text-[#E8ECF4] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Edit Account Modal ────────────────────────────────────────────── */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1E2A45] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1E2A45]">
              <h2 className="font-syne text-lg font-semibold text-[#E8ECF4]">Edit Account</h2>
              <button
                onClick={closeForm}
                className="p-1 text-[#6B7A99] hover:text-[#E8ECF4] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#6B7A99] mb-1.5">
                    Account nickname *
                  </label>
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
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#6B7A99] mb-1.5">
                    Last 4 digits (optional)
                  </label>
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

              {formError && <p className="text-sm text-[#EF4444]">{formError}</p>}

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

              {/* Plaid disconnect */}
              {editingAccount.is_plaid_connected && (
                <div className="border-t border-[#1E2A45] pt-4 mt-2">
                  <p className="text-sm font-medium text-white mb-1">Plaid Connection</p>
                  <p className="text-xs text-[#6B7A99] mb-3">
                    Disconnecting will stop automatic syncing. Your existing transactions will not
                    be deleted.
                  </p>
                  <button
                    onClick={handleDisconnectPlaid}
                    disabled={isDisconnecting}
                    className="text-sm text-amber-400 hover:text-amber-300 border border-amber-400/30 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {isDisconnecting ? "Disconnecting…" : "Disconnect from Plaid"}
                  </button>
                </div>
              )}

              {/* Danger zone */}
              <div className="border-t border-[#1E2A45] pt-4 mt-2">
                <p className="text-sm font-medium text-red-400 mb-1">Danger Zone</p>
                <p className="text-xs text-[#6B7A99] mb-3">
                  Deleting this account will remove it from EZ Ledgr. Transactions associated with
                  this account will remain but will be unlinked.
                </p>
                <button
                  onClick={() => handleDelete(editingAccount.id)}
                  className="text-sm text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1E2A45] flex items-center justify-center mb-4">
            <Building2 size={28} className="text-[#6B7A99]" />
          </div>
          <p className="font-syne font-semibold text-[#E8ECF4] text-lg mb-1">
            No bank accounts yet
          </p>
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
                if ((e.target as HTMLElement).closest("[data-action]")) {
                  e.preventDefault();
                }
              }}
            >
              {/* ── Card header ── */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Logo or type-colored fallback */}
                  {acc.plaid_logo_url ? (
                    <img
                      src={acc.plaid_logo_url}
                      alt={acc.bank_name}
                      className="w-8 h-8 rounded-full object-contain flex-shrink-0 bg-white p-0.5"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        TYPE_COLORS[acc.account_type] ?? TYPE_COLORS.other
                      }`}
                    >
                      <Building2 size={14} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-[#E8ECF4] text-sm truncate leading-tight">
                      {acc.plaid_official_name ?? acc.name}
                    </p>
                    {acc.last_four && (
                      <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                        ••••{acc.last_four}
                      </p>
                    )}
                  </div>
                </div>
                {acc.is_plaid_connected && (
                  <span className="flex items-center gap-1 text-xs text-[#22C55E] flex-shrink-0 ml-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    Connected
                  </span>
                )}
              </div>

              {/* ── Balance section ── */}
              <div className="flex items-stretch bg-[#0A0F1E] rounded-lg overflow-hidden mb-4">
                {/* Bank Balance (Plaid) */}
                <div className="flex-1 p-3">
                  <p className="text-[11px] text-[#6B7A99] mb-1 font-medium uppercase tracking-wide">
                    Bank Balance
                  </p>
                  <p className="text-2xl font-semibold text-[#E8ECF4]">
                    {acc.is_plaid_connected ? "—" : "—"}
                  </p>
                  <p className="text-[11px] text-[#6B7A99] mt-1">
                    {acc.is_plaid_connected
                      ? formatSyncDate(acc.plaid_last_synced_at)
                      : "Not connected"}
                  </p>
                </div>
                {/* Divider */}
                <div className="w-px bg-[#1E2A45]" />
                {/* EZ Ledgr Balance */}
                <div className="flex-1 p-3">
                  <p className="text-[11px] text-[#6B7A99] mb-1 font-medium uppercase tracking-wide">
                    EZ Ledgr Balance
                  </p>
                  <p
                    className={`text-2xl font-semibold ${
                      acc.net > 0
                        ? "text-[#22C55E]"
                        : acc.net < 0
                        ? "text-[#EF4444]"
                        : "text-[#E8ECF4]"
                    }`}
                  >
                    {formatCurrency(acc.net)}
                  </p>
                  <p className="text-[11px] text-[#6B7A99] mt-1">
                    From {acc.transaction_count} transaction
                    {acc.transaction_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* ── Card footer ── */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1E2A45]">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    TYPE_COLORS[acc.account_type] ?? TYPE_COLORS.other
                  }`}
                >
                  {TYPE_LABELS[acc.account_type] ?? "Other"}
                </span>
                <button
                  data-action
                  onClick={() => openEdit(acc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6B7A99] hover:text-[#E8ECF4] hover:bg-[#1E2A45] rounded-lg transition-colors"
                  title="Edit account"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              </div>

              {/* Connect to bank (unconnected only) */}
              {!acc.is_plaid_connected && (
                <div data-action className="mt-3 pt-3 border-t border-[#1E2A45]">
                  <PlaidLinkButton
                    businessId={businessId}
                    existingAccountId={acc.id}
                    onConnected={handlePlaidConnected}
                    buttonLabel="Connect to bank"
                    buttonClassName="flex items-center gap-1.5 text-sm text-[#6B7A99] hover:text-[#4F7FFF] transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-[#64748b]">🔒 2FA verification required</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* ── Account Mapping Modal ─────────────────────────────────────────── */}
      {plaidConnectionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1E2A45] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1E2A45]">
              <div>
                <h2 className="font-syne font-bold text-xl text-[#E8ECF4]">Map Your Accounts</h2>
                <p className="text-sm text-[#6B7A99] mt-0.5">
                  {plaidConnectionData.institutionName} · Choose what to do with each account
                </p>
              </div>
              <button
                onClick={closeMappingModal}
                className="p-1.5 text-[#6B7A99] hover:text-[#E8ECF4] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {plaidConnectionData.plaidAccounts.map((plaidAcc) => {
                const mapping = accountMappings[plaidAcc.plaid_account_id];
                if (!mapping) return null;

                const compatibleAccounts = unconnectedAccounts;
                const subtypeLabel =
                  TYPE_LABELS[mapSubtype(plaidAcc.subtype)] ??
                  (plaidAcc.subtype ? plaidAcc.subtype.charAt(0).toUpperCase() + plaidAcc.subtype.slice(1) : "Account");

                return (
                  <div
                    key={plaidAcc.plaid_account_id}
                    className="bg-[#0A0F1E] border border-[#1E2A45] rounded-xl p-4"
                  >
                    {/* Plaid account info */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#E8ECF4] text-sm">{plaidAcc.name}</p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              TYPE_COLORS[mapSubtype(plaidAcc.subtype)] ?? TYPE_COLORS.other
                            }`}
                          >
                            {subtypeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {plaidAcc.mask && (
                            <span className="text-xs text-[#6B7A99] font-mono">
                              ••••{plaidAcc.mask}
                            </span>
                          )}
                          {plaidAcc.balance_current != null && (
                            <span className="text-xs text-[#6B7A99]">
                              {formatCurrency(plaidAcc.balance_current)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action dropdown */}
                    <div className="mb-3">
                      <label className="block text-xs text-[#6B7A99] mb-1.5">Action</label>
                      <div className="relative">
                        <select
                          value={mapping.action}
                          onChange={(e) =>
                            updateMapping(plaidAcc.plaid_account_id, {
                              action: e.target.value as MappingAction,
                            })
                          }
                          className={inputCls + " pr-8 appearance-none"}
                        >
                          <option value="create_new">Create new account</option>
                          {unconnectedAccounts.length > 0 && (
                            <option value="map_existing">Map to existing account</option>
                          )}
                          <option value="skip">Skip this account</option>
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A99] pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* Map to existing: account selector + mismatch warning */}
                    {mapping.action === "map_existing" && (
                      <div>
                        <label className="block text-xs text-[#6B7A99] mb-1.5">
                          Select existing account
                        </label>
                        <div className="relative">
                          <select
                            value={mapping.existingAccountId ?? ""}
                            onChange={(e) =>
                              updateMapping(plaidAcc.plaid_account_id, {
                                existingAccountId: e.target.value,
                              })
                            }
                            className={inputCls + " pr-8 appearance-none"}
                          >
                            <option value="">— Choose an account —</option>
                            {compatibleAccounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.bank_name} · {acc.name}
                                {acc.last_four ? ` (••••${acc.last_four})` : ""}
                                {!getCompatibleTypes(plaidAcc.subtype).includes(acc.account_type)
                                  ? ` [${TYPE_LABELS[acc.account_type] ?? acc.account_type} → ${subtypeLabel}]`
                                  : ""}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A99] pointer-events-none"
                          />
                        </div>
                        {(() => {
                          const selectedAcc = unconnectedAccounts.find(
                            (a) => a.id === mapping.existingAccountId
                          );
                          const plaidType = mapSubtype(plaidAcc.subtype);
                          if (
                            selectedAcc &&
                            !getCompatibleTypes(plaidAcc.subtype).includes(selectedAcc.account_type)
                          ) {
                            return (
                              <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                                <AlertCircle size={12} className="shrink-0" />
                                &ldquo;{selectedAcc.name}&rdquo; is set to{" "}
                                <strong>{TYPE_LABELS[selectedAcc.account_type]}</strong>. It will
                                be updated to{" "}
                                <strong>{TYPE_LABELS[plaidType] ?? plaidType}</strong> to match
                                Plaid.
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Create new: inline fields */}
                    {mapping.action === "create_new" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[#6B7A99] mb-1.5">
                            Account nickname *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Business Checking"
                            value={mapping.newAccount.name}
                            onChange={(e) =>
                              updateNewAccount(plaidAcc.plaid_account_id, {
                                name: e.target.value,
                              })
                            }
                            className={inputCls}
                          />
                          <p className="text-xs text-[#6B7A99] mt-1">
                            Pre-filled from your bank — feel free to customize
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B7A99] mb-1.5">
                            Account type
                          </label>
                          <div className="relative">
                            <select
                              value={mapping.newAccount.account_type}
                              onChange={(e) =>
                                updateNewAccount(plaidAcc.plaid_account_id, {
                                  account_type: e.target.value,
                                })
                              }
                              className={inputCls + " pr-8 appearance-none"}
                            >
                              <option value="checking">Checking</option>
                              <option value="savings">Savings</option>
                              <option value="credit_card">Credit Card</option>
                              <option value="cash">Cash</option>
                              <option value="other">Other</option>
                            </select>
                            <ChevronDown
                              size={14}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A99] pointer-events-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B7A99] mb-1.5">
                            Last 4 digits
                          </label>
                          <input
                            type="text"
                            value={mapping.newAccount.last_four}
                            maxLength={4}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              updateNewAccount(plaidAcc.plaid_account_id, { last_four: val });
                            }}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#1E2A45] flex items-center justify-between gap-3">
              <p className="text-xs text-[#6B7A99]">
                Transactions will be pulled from{" "}
                <span className="text-[#E8ECF4]">{syncStartDate}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeMappingModal}
                  disabled={isSavingMappings}
                  className="px-4 py-2 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] hover:border-[#4F7FFF]/50 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnectAccounts}
                  disabled={isSavingMappings}
                  className="px-5 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSavingMappings && (
                    <RefreshCw size={14} className="animate-spin" />
                  )}
                  {isSavingMappings ? "Connecting…" : "Connect Accounts"}
                </button>
              </div>
            </div>
          </div>
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
