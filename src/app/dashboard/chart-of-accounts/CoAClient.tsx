"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Shield,
  AlertCircle,
} from "lucide-react";
import {
  getCoAAccounts,
  upsertCoAAccount,
  deleteCoAAccount,
  deactivateCoAAccount,
} from "./actions";
import type { CoAAccount, UpsertCoAAccountData } from "./actions";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_ORDER = [
  "Asset",
  "Liability",
  "Equity",
  "Income",
  "Expense",
] as const;

type AccountType = (typeof ACCOUNT_TYPE_ORDER)[number];

const TYPE_FILTER_LABELS: { label: string; value: string }[] = [
  { label: "All", value: "All" },
  { label: "Assets", value: "Asset" },
  { label: "Liabilities", value: "Liability" },
  { label: "Equity", value: "Equity" },
  { label: "Income", value: "Income" },
  { label: "Expenses", value: "Expense" },
];

const TYPE_HEADER_LABEL: Record<string, string> = {
  Asset: "Assets",
  Liability: "Liabilities",
  Equity: "Equity",
  Income: "Income",
  Expense: "Expenses",
};

const TYPE_BADGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Asset:     { bg: "#E6F0FF", text: "#1a4faa", border: "#b3cfff" },
  Liability: { bg: "#FFF4E6", text: "#7a4400", border: "#ffd599" },
  Equity:    { bg: "#F3E8FF", text: "#5b1fa1", border: "#d4a6ff" },
  Income:    { bg: "#E6F7EE", text: "#1A7A40", border: "#b3e2c5" },
  Expense:   { bg: "#FDECEA", text: "#922b21", border: "#f5a9a1" },
};

// Column grid shared across header row, section headers, and data rows.
const ROW_GRID =
  "grid grid-cols-[5rem_minmax(0,1fr)_7rem_9rem_7rem_5.5rem_3rem] items-center gap-x-3";

// ── Mini-components ───────────────────────────────────────────────────────────

function StatusBadge({ is_active }: { is_active: boolean }) {
  return is_active ? (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border"
      style={{
        background: "#E6F7EE",
        color: "#1A7A40",
        borderColor: "#b3e2c5",
      }}
    >
      Active
    </span>
  ) : (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border"
      style={{
        background: "#FDECEA",
        color: "#922b21",
        borderColor: "#f5a9a1",
      }}
    >
      Inactive
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_BADGE_STYLE[type] ?? { bg: "#F3F4F6", text: "#374151", border: "#D1D5DB" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {type}
    </span>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  id: string;
  account_number: string;
  name: string;
  account_type: string;
  sub_type: string;
  description: string;
  irs_form_line: string;
  parent_id: string;
  is_active: boolean;
  is_system: boolean;
  is_postable: boolean;
}

function emptyForm(): FormState {
  return {
    id: "",
    account_number: "",
    name: "",
    account_type: "Asset",
    sub_type: "",
    description: "",
    irs_form_line: "",
    parent_id: "",
    is_active: true,
    is_system: false,
    is_postable: true,
  };
}

function accountToForm(a: CoAAccount): FormState {
  return {
    id: a.id,
    account_number: a.account_number,
    name: a.name,
    account_type: a.account_type,
    sub_type: a.sub_type ?? "",
    description: a.description ?? "",
    irs_form_line: a.irs_form_line ?? "",
    parent_id: a.parent_id ?? "",
    is_active: a.is_active,
    is_system: a.is_system,
    is_postable: a.is_postable,
  };
}

// ── Input / label shared styles ───────────────────────────────────────────────

const inputCls =
  "w-full bg-[#F5F4F2] border border-[#DDE4EF] text-[#193764] rounded-lg px-3 py-2 text-sm " +
  "placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2F7FC8] focus:border-[#2F7FC8] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-[#6B7A99] mb-1.5";

// ── Main component ────────────────────────────────────────────────────────────

interface CoAClientProps {
  initialAccounts: CoAAccount[];
  businessId: string;
  businessName: string;
}

export default function CoAClient({
  initialAccounts,
  businessId,
  businessName,
}: CoAClientProps) {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<CoAAccount[]>(initialAccounts);
  const [, startTransition] = useTransition();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // ── Panel state ─────────────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Delete state ────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<CoAAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Derived data ────────────────────────────────────────────────────────────
  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  // Available parents for the form's current account_type
  const availableParents = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.account_type === form.account_type &&
          a.parent_id === null &&
          a.id !== form.id
      ),
    [accounts, form.account_type, form.id]
  );

  // Filtered + grouped display data
  const displayGroups = useMemo(() => {
    // Direct matches: pass all active filters
    const directMatches = new Set<string>();
    for (const acc of accounts) {
      if (typeFilter !== "All" && acc.account_type !== typeFilter) continue;
      if (!showInactive && !acc.is_active) continue;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          acc.account_number.toLowerCase().includes(q) ||
          acc.name.toLowerCase().includes(q) ||
          (acc.description ?? "").toLowerCase().includes(q);
        if (!matches) continue;
      }
      directMatches.add(acc.id);
    }

    // Also show parents of any direct-match child (so children have context)
    const visibleIds = new Set(directMatches);
    for (const acc of accounts) {
      if (acc.parent_id && directMatches.has(acc.id)) {
        const parent = accountById.get(acc.parent_id);
        if (parent) visibleIds.add(parent.id);
      }
    }

    // Build per-type groups
    return ACCOUNT_TYPE_ORDER.map((type) => {
      const parents = accounts
        .filter((a) => a.account_type === type && !a.parent_id && visibleIds.has(a.id))
        .sort((a, b) =>
          a.account_number.localeCompare(b.account_number, undefined, { numeric: true })
        );

      const childrenByParent = new Map<string, CoAAccount[]>();
      for (const acc of accounts) {
        if (!acc.parent_id || !visibleIds.has(acc.id)) continue;
        const parent = accountById.get(acc.parent_id);
        if (!parent || parent.account_type !== type) continue;
        const list = childrenByParent.get(acc.parent_id) ?? [];
        list.push(acc);
        childrenByParent.set(acc.parent_id, list);
      }
      for (const [k, arr] of childrenByParent) {
        childrenByParent.set(
          k,
          arr.sort((a, b) =>
            a.account_number.localeCompare(b.account_number, undefined, { numeric: true })
          )
        );
      }

      const totalCount =
        parents.length +
        [...childrenByParent.values()].reduce((s, c) => s + c.length, 0);

      return { type, parents, childrenByParent, totalCount };
    }).filter((g) => g.totalCount > 0);
  }, [accounts, accountById, typeFilter, showInactive, searchTerm]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const refreshAccounts = () => {
    startTransition(async () => {
      const fresh = await getCoAAccounts(businessId);
      setAccounts(fresh);
    });
  };

  const openNew = () => {
    setForm(emptyForm());
    setFormError(null);
    setPanelOpen(true);
  };

  const openEdit = (account: CoAAccount) => {
    setForm(accountToForm(account));
    setFormError(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setFormError(null);
  };

  const setField =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      // Reset parent when account_type changes
      if (key === "account_type") setForm((f) => ({ ...f, account_type: e.target.value, parent_id: "" }));
    };

  const handleSave = async () => {
    setFormError(null);

    if (!form.account_number.trim()) {
      setFormError("Account number is required.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("Account name is required.");
      return;
    }

    // Uniqueness checks (client-side, against current list)
    const numConflict = accounts.find(
      (a) => a.account_number.trim() === form.account_number.trim() && a.id !== form.id
    );
    if (numConflict) {
      setFormError(`Account number "${form.account_number}" is already in use.`);
      return;
    }
    const nameConflict = accounts.find(
      (a) => a.name.toLowerCase() === form.name.trim().toLowerCase() && a.id !== form.id
    );
    if (nameConflict) {
      setFormError(`Account name "${form.name}" is already in use.`);
      return;
    }

    setIsSaving(true);
    const payload: UpsertCoAAccountData = {
      id: form.id || undefined,
      account_number: form.account_number,
      name: form.name,
      account_type: form.account_type,
      sub_type: form.sub_type || null,
      description: form.description || null,
      irs_form_line: form.irs_form_line || null,
      parent_id: form.parent_id || null,
      is_active: form.is_active,
      is_postable: form.is_postable,
    };

    const result = await upsertCoAAccount(businessId, payload);
    setIsSaving(false);

    if (result.success) {
      closePanel();
      refreshAccounts();
    } else {
      setFormError(result.error ?? "Failed to save account.");
    }
  };

  const confirmDelete = (account: CoAAccount) => {
    setDeleteError(null);
    setDeleteTarget(account);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteCoAAccount(businessId, deleteTarget.id);
    setIsDeleting(false);

    if (result.success) {
      setDeleteTarget(null);
      refreshAccounts();
    } else {
      setDeleteError(result.error ?? "Failed to delete account.");
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const totalVisible = displayGroups.reduce((s, g) => s + g.totalCount, 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-[30px] font-normal text-[#193764] leading-tight"
            style={{ fontFamily: "var(--font-ui, 'Plus Jakarta Sans', sans-serif)" }}
          >
            Chart of Accounts
          </h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">{businessName}</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2F7FC8] text-white text-sm font-medium rounded-lg hover:bg-[#2268A8] transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Account
        </button>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Type pills */}
        <div className="flex items-center gap-1 bg-white border border-[#DDE4EF] rounded-lg p-1">
          {TYPE_FILTER_LABELS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                typeFilter === value
                  ? "bg-[#193764] text-white"
                  : "text-[#193764] hover:bg-[#E8EEF6]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-[#DDE4EF] text-[#193764] placeholder:text-[#9CA3AF] rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[#2F7FC8] focus:border-[#2F7FC8]"
          />
        </div>

        {/* Show inactive toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={showInactive}
            onClick={() => setShowInactive((v) => !v)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2F7FC8] focus:ring-offset-1 ${
              showInactive ? "bg-[#2F7FC8]" : "bg-[#DDE4EF]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                showInactive ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-[#6B7A99]">Show inactive</span>
        </label>

        {/* Result count */}
        {(searchTerm || typeFilter !== "All" || showInactive) && (
          <span className="text-sm text-[#6B7A99] ml-auto">
            {totalVisible} account{totalVisible !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Account table ────────────────────────────────────────────────── */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: "1px solid #DDE4EF" }}
      >
        {/* Column header */}
        <div
          className={`${ROW_GRID} px-4 py-2.5 border-b border-[#DDE4EF] bg-white`}
        >
          {(["#", "Account Name", "Type", "Sub-type", "IRS Line", "Status", ""] as const).map(
            (col) => (
              <span
                key={col}
                className="text-[11px] font-semibold text-[#6B7A99] uppercase tracking-wide"
              >
                {col}
              </span>
            )
          )}
        </div>

        {/* Empty state */}
        {displayGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#E8EEF6] flex items-center justify-center mb-3">
              <Search size={20} className="text-[#6B7A99]" />
            </div>
            <p className="text-sm font-medium text-[#193764]">No accounts found</p>
            <p className="text-xs text-[#6B7A99] mt-1">
              {searchTerm
                ? "Try a different search term"
                : "Add your first account to get started"}
            </p>
          </div>
        )}

        {/* Type groups */}
        {displayGroups.map(({ type, parents, childrenByParent, totalCount }) => (
          <div key={type}>
            {/* Section header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#DDE4EF] bg-[#E8EEF6]">
              <span className="text-[11px] font-semibold text-[#193764] uppercase tracking-[0.06em]">
                {TYPE_HEADER_LABEL[type] ?? type}
              </span>
              <span className="text-[11px] text-[#6B7A99]">
                {totalCount} account{totalCount !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Rows */}
            {parents.map((parent) => (
              <div key={parent.id}>
                {/* Parent row */}
                <div
                  className={`group ${ROW_GRID} px-4 py-2.5 border-b border-[#DDE4EF] hover:bg-[#F9FAFB] transition-colors`}
                >
                  {/* # */}
                  <span className="font-mono text-sm text-[#193764] tabular-nums">
                    {parent.account_number}
                  </span>
                  {/* Name */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm text-[#193764] font-medium truncate">
                      {parent.name}
                    </span>
                    {parent.is_system && (
                      <span title="System account">
                        <Shield size={11} className="text-[#6B7A99] flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  {/* Type */}
                  <TypeBadge type={parent.account_type} />
                  {/* Sub-type */}
                  <span className="text-xs text-[#6B7A99] truncate">
                    {parent.sub_type ?? "—"}
                  </span>
                  {/* IRS Line */}
                  {parent.irs_form_line ? (
                    <span className="text-xs text-[#2F7FC8] italic truncate">
                      {parent.irs_form_line}
                    </span>
                  ) : (
                    <span />
                  )}
                  {/* Status */}
                  <StatusBadge is_active={parent.is_active} />
                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(parent)}
                      className="p-1.5 rounded text-[#6B7A99] hover:text-[#193764] hover:bg-[#E8EEF6] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    {!parent.is_system && (
                      <button
                        onClick={() => confirmDelete(parent)}
                        className="p-1.5 rounded text-[#6B7A99] hover:text-[#922b21] hover:bg-[#FDECEA] transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Child rows */}
                {(childrenByParent.get(parent.id) ?? []).map((child) => (
                  <div
                    key={child.id}
                    className={`group ${ROW_GRID} px-4 py-2.5 border-b border-[#DDE4EF] bg-[#F5F4F2] hover:bg-[#EDECE9] transition-colors`}
                  >
                    {/* # */}
                    <span className="font-mono text-sm text-[#193764] tabular-nums">
                      {child.account_number}
                    </span>
                    {/* Name — indented with blue left border */}
                    <div className="flex items-center min-w-0">
                      <span
                        className="inline-block w-[3px] h-[18px] rounded-full mr-2 ml-6 flex-shrink-0"
                        style={{ background: "#2F7FC8" }}
                      />
                      <span className="text-sm text-[#193764] truncate">{child.name}</span>
                      {child.is_system && (
                        <span title="System account">
                          <Shield size={11} className="text-[#6B7A99] ml-1.5 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    {/* Type */}
                    <TypeBadge type={child.account_type} />
                    {/* Sub-type */}
                    <span className="text-xs text-[#6B7A99] truncate">
                      {child.sub_type ?? "—"}
                    </span>
                    {/* IRS Line */}
                    {child.irs_form_line ? (
                      <span className="text-xs text-[#2F7FC8] italic truncate">
                        {child.irs_form_line}
                      </span>
                    ) : (
                      <span />
                    )}
                    {/* Status */}
                    <StatusBadge is_active={child.is_active} />
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(child)}
                        className="p-1.5 rounded text-[#6B7A99] hover:text-[#193764] hover:bg-white/60 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      {!child.is_system && (
                        <button
                          onClick={() => confirmDelete(child)}
                          className="p-1.5 rounded text-[#6B7A99] hover:text-[#922b21] hover:bg-[#FDECEA] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Slide-in panel overlay (content area only) ───────────────────── */}
      {panelOpen && (
        <div
          className="fixed top-0 bottom-0 right-0 z-30 bg-black/20 transition-opacity"
          style={{ left: "240px" }}
          onClick={closePanel}
        />
      )}

      {/* ── Slide-in panel ───────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 h-full bg-white z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "420px", borderLeft: "1px solid #DDE4EF" }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDE4EF] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#193764]">
            {form.id ? "Edit Account" : "Add Account"}
          </h2>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-lg text-[#6B7A99] hover:text-[#193764] hover:bg-[#E8EEF6] transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* System account notice */}
          {form.is_system && (
            <div className="flex items-start gap-2 px-3 py-3 bg-[#FFF4E6] border border-[#ffd599] rounded-lg">
              <Shield size={15} className="text-[#7a4400] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#7a4400] leading-relaxed">
                This is a system account. Some fields cannot be edited.
              </p>
            </div>
          )}

          {/* Account Number */}
          <div>
            <label className={labelCls}>
              Account Number <span className="text-[#922b21] normal-case tracking-normal">*</span>
            </label>
            <input
              type="text"
              value={form.account_number}
              onChange={setField("account_number")}
              placeholder="e.g. 1000"
              className={`${inputCls} font-mono`}
            />
          </div>

          {/* Account Name */}
          <div>
            <label className={labelCls}>
              Account Name <span className="text-[#922b21] normal-case tracking-normal">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={setField("name")}
              placeholder="e.g. Cash & Checking"
              className={inputCls}
            />
          </div>

          {/* Account Type */}
          <div>
            <label className={labelCls}>Account Type</label>
            <select
              value={form.account_type}
              onChange={(e) => {
                setForm((f) => ({ ...f, account_type: e.target.value, parent_id: "" }));
              }}
              disabled={form.is_system}
              className={inputCls}
            >
              {ACCOUNT_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-type */}
          <div>
            <label className={labelCls}>Sub-type</label>
            <input
              type="text"
              value={form.sub_type}
              onChange={setField("sub_type")}
              placeholder="e.g. Current Asset"
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={form.description}
              onChange={setField("description")}
              rows={3}
              placeholder="Optional description of this account"
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* IRS Form Line */}
          <div>
            <label className={labelCls}>IRS Form Line</label>
            <input
              type="text"
              value={form.irs_form_line}
              onChange={setField("irs_form_line")}
              placeholder="e.g. Sch C, Line 8"
              className={inputCls}
            />
          </div>

          {/* Parent Account */}
          <div>
            <label className={labelCls}>Parent Account</label>
            <select
              value={form.parent_id}
              onChange={setField("parent_id")}
              disabled={form.is_system}
              className={inputCls}
            >
              <option value="">None — top-level account</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.account_number} · {p.name}
                </option>
              ))}
            </select>
            {availableParents.length === 0 && !form.is_system && (
              <p className="mt-1 text-[11px] text-[#6B7A99]">
                No top-level {form.account_type} accounts available as parents.
              </p>
            )}
          </div>

          {/* Is Active toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className={`${labelCls} mb-0`}>Active</p>
              <p className="text-[11px] text-[#6B7A99] mt-0.5">
                Inactive accounts are hidden from transaction dropdowns
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2F7FC8] focus:ring-offset-1 ${
                form.is_active ? "bg-[#2F7FC8]" : "bg-[#DDE4EF]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  form.is_active ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

        </div>

        {/* Panel footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-[#DDE4EF]">
          {formError && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-[#FDECEA] border border-[#f5a9a1] rounded-lg">
              <AlertCircle size={13} className="text-[#922b21] flex-shrink-0" />
              <p className="text-xs text-[#922b21]">{formError}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={closePanel}
              className="px-4 py-2 text-sm text-[#6B7A99] hover:text-[#193764] border border-[#DDE4EF] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-[#2F7FC8] text-white text-sm font-medium rounded-lg hover:bg-[#2268A8] disabled:opacity-60 transition-colors"
            >
              {isSaving ? "Saving…" : "Save Account"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-[50] bg-black/30"
            onClick={() => {
              setDeleteTarget(null);
              setDeleteError(null);
            }}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 pointer-events-auto"
              style={{ border: "1px solid #DDE4EF" }}
            >
              <h3 className="font-semibold text-[#193764] text-base mb-1">
                Delete Account
              </h3>
              <p className="text-sm text-[#6B7A99] mb-1">
                Are you sure you want to delete{" "}
                <strong className="text-[#193764]">{deleteTarget.name}</strong>?
              </p>
              <p className="text-xs text-[#6B7A99] mb-4">This cannot be undone.</p>

              {deleteError && (
                <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-[#FDECEA] border border-[#f5a9a1] rounded-lg">
                  <AlertCircle size={13} className="text-[#922b21] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#922b21]">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 text-sm text-[#6B7A99] hover:text-[#193764] border border-[#DDE4EF] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium bg-[#922b21] text-white rounded-lg hover:bg-[#7a1a11] disabled:opacity-60 transition-colors"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
