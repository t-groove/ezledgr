"use client";

import { useState, useTransition } from "react";
import { Briefcase, Building2, Check, Plus, X, Loader2 } from "lucide-react";
import { useBusinessContext } from "@/lib/business/context";
import { createBusiness } from "@/lib/business/actions";
import type { BusinessMember } from "@/lib/business/actions";

// TODO: gate business creation behind an active subscription check

const ENTITY_TYPES = [
  "LLC",
  "S-Corp",
  "C-Corp",
  "Sole Proprietor",
  "Partnership",
  "Non-Profit",
  "Other",
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  accountant: "Accountant",
  bookkeeper: "Bookkeeper",
  readonly: "Read Only",
};

interface Props {
  initialBusinesses: BusinessMember[];
  activeBusinessId: string | null;
}

export default function BusinessesClient({ initialBusinesses, activeBusinessId }: Props) {
  const { switchBusiness, currentBusiness, businesses: ctxBusinesses } = useBusinessContext();

  // Local list — seeded from context (if already loaded) or SSR prop.
  // We append to this immediately on create so the card shows without a reload.
  const [businesses, setBusinesses] = useState<BusinessMember[]>(
    () => ctxBusinesses.length > 0 ? ctxBusinesses : initialBusinesses
  );

  // The "active" id is the one in context (most up-to-date) or the cookie value from SSR
  const activeId = currentBusiness?.id ?? activeBusinessId;

  // ── Add Business modal state ────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("LLC");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openModal() {
    setName("");
    setEntityType("LLC");
    setError(null);
    setModalOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createBusiness({ name: name.trim(), entity_type: entityType });
      if (result.success) {
        // Append the new business to local state immediately so the card
        // appears without waiting for a page reload or context re-fetch.
        const newMember: BusinessMember = {
          id: result.business.id,         // placeholder — membership id not returned by createBusiness
          business_id: result.business.id,
          user_id: "",                     // not needed for card display
          role: "owner",
          invited_email: null,
          accepted_at: new Date().toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
          business: result.business,
        };
        setBusinesses(prev => [...prev, newMember]);
        setModalOpen(false);
        // Switch to the newly created business automatically
        await switchBusiness(result.business.id, result.business.name);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-syne text-3xl font-bold text-[#193764]">Businesses</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage your business accounts</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#2F7FC8] hover:bg-[#2568a8]
            text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Business
        </button>
      </div>

      {/* ── Business cards ────────────────────────────────────────────────── */}
      {businesses.length === 0 ? (
        <div className="bg-white border border-[#dde4ef] rounded-xl p-12 flex flex-col items-center text-center max-w-lg">
          <div className="w-14 h-14 rounded-full bg-[#4F7FFF]/10 flex items-center justify-center mb-5">
            <Briefcase size={26} className="text-[#193764]" />
          </div>
          <h2 className="font-syne text-xl font-bold text-[#193764] mb-2">No businesses yet</h2>
          <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
            Create your first business to get started.
          </p>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F7FC8] hover:bg-[#2568a8]
              text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Business
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((bm) => {
            const isActive = bm.business_id === activeId;
            return (
              <div
                key={bm.business_id}
                className={`bg-white border rounded-xl p-6 flex flex-col gap-4 transition-colors ${
                  isActive ? "border-[#2F7FC8]/50" : "border-[#dde4ef]"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#e8eef6] flex items-center
                    justify-center flex-shrink-0">
                    <Building2 size={18} className="text-[#193764]" />
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                      text-xs font-semibold bg-[#e6f7ee] text-[#1a7a40] border
                      border-[#b3e2c5]">
                      <Check size={11} />
                      Active
                    </span>
                  )}
                </div>

                {/* Business details */}
                <div className="flex-1">
                  <p className="font-syne font-semibold text-[#193764] text-base mb-1">
                    {bm.business.name}
                  </p>
                  {bm.business.entity_type && (
                    <p className="text-xs text-[#6B7280] mb-2">{bm.business.entity_type}</p>
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                    font-medium bg-[#e8eef6] text-[#193764] border border-[#dde4ef]">
                    {ROLE_LABELS[bm.role] ?? bm.role}
                  </span>
                </div>

                {/* Switch button */}
                {!isActive && (
                  <button
                    onClick={() => switchBusiness(bm.business_id, bm.business.name)}
                    className="w-full py-2 px-3 bg-[#f0f4fa] border-t border-[#dde4ef] hover:bg-[#e8eef6] text-[#193764] text-sm rounded-b-xl transition-colors -mx-6 -mb-6 px-6 mt-0 rounded-none"
                  >
                    Switch to this business
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Business Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-white border border-[#dde4ef]
            rounded-2xl p-6 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6B7280]
                hover:text-[#193764] hover:bg-[#f0f4fa] transition-colors"
            >
              <X size={16} />
            </button>

            {/* Modal header */}
            <div className="mb-6">
              <h2 className="font-syne text-xl font-bold text-[#193764]">Add Business</h2>
              <p className="text-sm text-[#6B7280] mt-1">Create a new business account</p>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Business name */}
              <div>
                <label className="block text-sm text-[#6B7280] mb-1.5">
                  Business name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme LLC"
                  required
                  className="w-full bg-[#f5f4f2] border border-[#dde4ef] text-[#193764] text-sm
                    rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#4F7FFF]
                    placeholder:text-[#6B7280]"
                />
              </div>

              {/* Entity type */}
              <div>
                <label className="block text-sm text-[#6B7280] mb-1.5">Entity type</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#dde4ef] text-[#193764] text-sm
                    rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#4F7FFF] cursor-pointer"
                >
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30
                  rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4
                  bg-[#2F7FC8] hover:bg-[#2568a8] disabled:opacity-50 disabled:cursor-not-allowed
                  text-white text-sm font-medium rounded-lg transition-colors mt-2"
              >
                {isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Business"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
