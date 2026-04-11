"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import StepBasics from "@/components/businesses/creation/StepBasics";
import StepSetup from "@/components/businesses/creation/StepSetup";
import StepOwnership from "@/components/businesses/creation/StepOwnership";
import StepBankConnection, {
  bankButtonLabel,
} from "@/components/businesses/creation/StepBankConnection";
import { createBusinessFull } from "@/lib/business/actions";
import type { BusinessCreationData } from "@/components/businesses/creation/types";
import { genId, isSoleProp } from "@/components/businesses/creation/types";

const STEPS = ["Basics", "Setup", "Ownership", "Bank Connection"];
const TOTAL_STEPS = 4;

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

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BusinessCreationData>(makeInitialData);
  const [showOwnershipError, setShowOwnershipError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(updates: Partial<BusinessCreationData>) {
    setData(prev => ({ ...prev, ...updates }));
  }

  function canAdvance(): boolean {
    if (step === 1) {
      return data.name.trim().length >= 2 && data.entityType !== "";
    }
    if (step === 3) {
      const sp = isSoleProp(data.entityType);
      if (sp) return data.owners[0]?.name.trim().length > 0;
      const total = data.owners.reduce((s, o) => s + (parseFloat(o.percentage) || 0), 0);
      return (
        Math.abs(total - 100) < 0.01 && data.owners.every(o => o.name.trim().length > 0)
      );
    }
    return true;
  }

  function handleContinue() {
    if (step === 3) {
      const sp = isSoleProp(data.entityType);
      if (!sp) {
        const total = data.owners.reduce((s, o) => s + (parseFloat(o.percentage) || 0), 0);
        if (Math.abs(total - 100) >= 0.01) {
          setShowOwnershipError(true);
          return;
        }
      }
      setShowOwnershipError(false);
    }

    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
      return;
    }

    // Final step — submit
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

      if (data.bankChoice === "plaid") {
        router.push("/dashboard/accounts?connect=true");
      } else if (data.bankChoice === "csv") {
        router.push("/dashboard/transactions?import=true");
      } else {
        router.push("/dashboard");
      }
    });
  }

  // Progress bar segment color
  function segmentColor(segIndex: number): string {
    const seg = segIndex + 1; // 1-based
    if (seg < step) return "#2F7FC8"; // completed
    if (seg === step) return "rgba(47,127,200,0.45)"; // current
    return "#dde4ef"; // future
  }

  const finalStepLabel = step === TOTAL_STEPS ? bankButtonLabel(data.bankChoice) : "Continue →";

  return (
    <div className="min-h-screen bg-[#e8eef6] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-[600px] bg-white border border-[#dde4ef] rounded-2xl shadow-sm overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1 p-4 pb-0 px-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: segmentColor(i) }}
            />
          ))}
        </div>

        <div className="px-8 pt-6 pb-8">
          {/* Step counter + heading */}
          <p className="text-[12px] text-[#6B7280] mb-1 font-medium">
            Step {step} of {TOTAL_STEPS}
          </p>
          <h1 className="text-[24px] font-semibold text-[#193764] mb-5 tracking-[-0.01em]">
            {step === 1 && "Tell us about your business"}
            {step === 2 && "Set up your books"}
            {step === 3 && "Who owns this business?"}
            {step === 4 && "Connect your bank"}
          </h1>

          {/* Step content */}
          {step === 1 && <StepBasics data={data} onChange={update} />}
          {step === 2 && <StepSetup data={data} onChange={update} />}
          {step === 3 && (
            <StepOwnership
              data={data}
              onChange={update}
              showValidationError={showOwnershipError}
            />
          )}
          {step === 4 && <StepBankConnection data={data} onChange={update} />}

          {/* Submit error */}
          {submitError && (
            <div className="mt-4 bg-[#fdecea] border border-[#f1b0aa] text-[#922b21] text-[13px] rounded-lg px-4 py-3">
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-col gap-2 mt-6">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canAdvance() || isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-5 bg-[#2F7FC8] hover:bg-[#1a6aaf] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-lg transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Setting up your business…
                </>
              ) : (
                finalStepLabel
              )}
            </button>

            {step === TOTAL_STEPS && (
              <button
                type="button"
                onClick={() => {
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
                    if (!result.success) { setSubmitError(result.error); return; }
                    router.push("/dashboard");
                  });
                }}
                disabled={isPending}
                className="w-full py-2 text-[13px] text-[#6B7280] hover:text-[#193764] bg-transparent border border-[#dde4ef] rounded-lg transition-colors disabled:opacity-50"
              >
                Skip for now — I&apos;ll connect later
              </button>
            )}

            {step > 1 && (
              <button
                type="button"
                onClick={() => { setShowOwnershipError(false); setStep(s => s - 1); }}
                disabled={isPending}
                className="w-full py-2 text-[13px] text-[#193764] hover:text-[#2F7FC8] transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
