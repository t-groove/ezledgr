"use client";

import { useState } from "react";
import { Briefcase, Building2, Check, Plus } from "lucide-react";
import { useBusinessContext } from "@/lib/business/context";
import { getUserBusinesses } from "@/lib/business/actions";
import type { BusinessMember } from "@/lib/business/actions";
import AddBusinessModal from "@/components/businesses/AddBusinessModal";

// TODO: gate business creation behind an active subscription check

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
  const [businesses, setBusinesses] = useState<BusinessMember[]>(
    () => ctxBusinesses.length > 0 ? ctxBusinesses : initialBusinesses
  );

  // The "active" id is the one in context (most up-to-date) or the cookie value from SSR
  const activeId = currentBusiness?.id ?? activeBusinessId;

  // ── Add Business modal state ────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);

  function handleSuccess(businessId: string) {
    // Re-fetch businesses list and switch the active business cookie/context.
    // Navigation is handled by the modal itself.
    getUserBusinesses().then(members => {
      setBusinesses(members);
      const newBiz = members.find(m => m.business_id === businessId);
      switchBusiness(businessId, newBiz?.business.name ?? "");
    });
  }

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sans text-3xl font-bold text-[#193764]">Businesses</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage your business accounts</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
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
          <h2 className="font-sans text-xl font-bold text-[#193764] mb-2">No businesses yet</h2>
          <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
            Create your first business to get started.
          </p>
          <button
            onClick={() => setModalOpen(true)}
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
                  <p className="font-sans font-semibold text-[#193764] text-base mb-1">
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

      <AddBusinessModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
