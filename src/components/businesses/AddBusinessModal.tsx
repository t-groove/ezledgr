"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Loader2 } from "lucide-react";
import StepBasics from "./creation/StepBasics";
import StepSetup from "./creation/StepSetup";
import StepOwnership from "./creation/StepOwnership";
import StepBankConnection, { bankButtonLabel } from "./creation/StepBankConnection";
import { createBusinessFull } from "@/lib/business/actions";
import type { BusinessCreationData } from "./creation/types";
import { genId, isSoleProp } from "./creation/types";

const STEP_TABS = ["1 · Basics", "2 · Setup", "3 · Ownership & Bank"];
const TOTAL_STEPS = 3;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (businessId: string) => void;
}

function makeInitialData(): BusinessCreationData {
  return {
    name: "",
    entityType: "",
    address: "",
    accountingMethod: "cash",
    fiscalYearEnd: "December",
    industry: "",
    owners: [{ localId: genId(), name: "", percentage: "100" }],
    bankChoice: "plaid",
  };
}

export default function AddBusinessModal({ isOpen, onClose, onSuccess }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BusinessCreationData>(makeInitialData);
  const [showOwnershipError, setShowOwnershipError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  function update(updates: Partial<BusinessCreationData>) {
    setData(prev => ({ ...prev, ...updates }));
  }

  function reset() {
    setStep(1);
    setData(makeInitialData());
    setShowOwnershipError(false);
    setSubmitError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function canAdvance(): boolean {
    if (step === 1) return data.name.trim().length >= 2 && data.entityType !== "";
    if (step === TOTAL_STEPS) {
      const sp = isSoleProp(data.entityType);
      if (sp) return data.owners[0]?.name.trim().length > 0;
      const total = data.owners.reduce((s, o) => s + (parseFloat(o.percentage) || 0), 0);
      return Math.abs(total - 100) < 0.01 && data.owners.every(o => o.name.trim().length > 0);
    }
    return true;
  }

  async function doSubmit() {
    setSubmitError(null);
    startTransition(async () => {
      const sp = isSoleProp(data.entityType);
      const owners = data.owners.map(o => ({
        name: o.name,
        ownership_percentage: sp ? 100 : parseFloat(o.percentage) || 0,
      }));

      const result = await createBusinessFull({
        name: data.name.trim(),
        entity_type: data.entityType,
        address: data.address || undefined,
        accounting_method: data.accountingMethod,
        tax_year_end: data.fiscalYearEnd,
        industry: data.industry || undefined,
        owners,
      });

      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      onSuccess(result.businessId);
      handleClose();
      router.push("/dashboard");
    });
  }

  function handleContinue() {
    if (step === TOTAL_STEPS) {
      // Validate ownership before submitting
      const sp = isSoleProp(data.entityType);
      if (!sp) {
        const total = data.owners.reduce((s, o) => s + (parseFloat(o.percentage) || 0), 0);
        if (Math.abs(total - 100) >= 0.01) {
          setShowOwnershipError(true);
          return;
        }
      }
      setShowOwnershipError(false);
      doSubmit();
      return;
    }
    setStep(s => s + 1);
  }

  const primaryLabel =
    step === TOTAL_STEPS
      ? bankButtonLabel(data.bankChoice)
      : "Continue →";

  // Segment color for progress bar
  function segmentColor(segIndex: number): string {
    const seg = segIndex + 1;
    if (seg < step) return "#2F7FC8";
    if (seg === step) return "rgba(47,127,200,0.45)";
    return "#dde4ef";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(25,55,100,0.15)] backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[520px] bg-white border border-[#dde4ef] rounded-[14px] shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#dde4ef] flex-shrink-0">
          <h2 className="text-[18px] font-semibold text-[#193764] tracking-[-0.01em]">
            Add a new business
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#193764] hover:bg-[#f0f4fa] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-4 pb-0 flex-shrink-0">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: segmentColor(i) }}
            />
          ))}
        </div>

        {/* Step tabs */}
        <div className="flex gap-0 px-6 pt-3 pb-0 flex-shrink-0">
          {STEP_TABS.map((label, i) => {
            const tabStep = i + 1;
            const isComplete = tabStep < step;
            const isActive = tabStep === step;
            return (
              <div
                key={i}
                className="flex items-center gap-1 mr-4 pb-2"
                style={{
                  borderBottom: isActive ? "2px solid #2F7FC8" : "2px solid transparent",
                }}
              >
                {isComplete && (
                  <div className="w-4 h-4 rounded-full bg-[#e6f7ee] border border-[#b3e2c5] flex items-center justify-center">
                    <Check size={9} className="text-[#1a7a40]" />
                  </div>
                )}
                <span
                  className="text-[12px] font-medium"
                  style={{ color: isActive ? "#193764" : "#6B7280" }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && <StepBasics data={data} onChange={update} />}
          {step === 2 && <StepSetup data={data} onChange={update} />}
          {step === TOTAL_STEPS && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-[15px] font-medium text-[#193764] mb-3">
                  Who owns this business?
                </h3>
                <StepOwnership
                  data={data}
                  onChange={update}
                  showValidationError={showOwnershipError}
                />
              </div>
              <hr className="border-[#dde4ef]" />
              <div>
                <h3 className="text-[15px] font-medium text-[#193764] mb-3">
                  Connect your bank
                </h3>
                <StepBankConnection data={data} onChange={update} />
              </div>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="mt-4 bg-[#fdecea] border border-[#f1b0aa] text-[#922b21] text-[13px] rounded-lg px-4 py-3">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#dde4ef] flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setShowOwnershipError(false); setStep(s => s - 1); }}
                disabled={isPending}
                className="py-2 px-4 bg-transparent border border-[#dde4ef] text-[#193764] text-[13px] font-medium rounded-lg hover:bg-[#f0f4fa] transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canAdvance() || isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 bg-[#2F7FC8] hover:bg-[#1a6aaf] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-lg transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Setting up…
                </>
              ) : (
                primaryLabel
              )}
            </button>
          </div>

          {step === TOTAL_STEPS && (
            <button
              type="button"
              onClick={() => doSubmit()}
              disabled={isPending}
              className="text-[13px] text-[#6B7280] hover:text-[#193764] transition-colors text-center disabled:opacity-50"
            >
              Skip bank connection — go to dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
