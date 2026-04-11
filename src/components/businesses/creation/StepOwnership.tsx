"use client";

import { Plus, X } from 'lucide-react';
import type { BusinessCreationData, OwnerRow } from './types';
import { isSoleProp, genId } from './types';

interface Props {
  data: BusinessCreationData;
  onChange: (updates: Partial<BusinessCreationData>) => void;
  showValidationError?: boolean;
}

export default function StepOwnership({ data, onChange, showValidationError }: Props) {
  const soleProp = isSoleProp(data.entityType);
  const { owners } = data;

  const total = owners.reduce((sum, o) => sum + (parseFloat(o.percentage) || 0), 0);
  const totalIsHundred = Math.abs(total - 100) < 0.01;
  const displayTotal = total % 1 === 0 ? total.toString() : total.toFixed(2);

  const isMultiOwnerType = ['LLC', 'S-Corp', 'C-Corp', 'Partnership', 'Non-Profit'].includes(
    data.entityType
  );

  const subtext = isMultiOwnerType
    ? 'These names will label your equity accounts (capital accounts, draws, and distributions). Add one row per owner.'
    : 'Your name will appear on reports and tax documents for this business.';

  function updateOwner(localId: string, field: keyof OwnerRow, value: string) {
    onChange({
      owners: owners.map(o => (o.localId === localId ? { ...o, [field]: value } : o)),
    });
  }

  function addOwner() {
    onChange({ owners: [...owners, { localId: genId(), name: '', percentage: '' }] });
  }

  function removeOwner(localId: string) {
    onChange({ owners: owners.filter(o => o.localId !== localId) });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#6B7280] leading-snug -mt-1">{subtext}</p>

      {/* Owner rows */}
      <div className="flex flex-col gap-2">
        {owners.map((owner, idx) => (
          <div key={owner.localId} className="flex items-center gap-2">
            {/* Name */}
            <input
              type="text"
              value={owner.name}
              onChange={e => updateOwner(owner.localId, 'name', e.target.value)}
              placeholder={soleProp ? 'Your full name' : `Owner ${idx + 1} name`}
              className="flex-1 bg-[#f5f4f2] border border-[#dde4ef] rounded-lg px-3 py-2.5 text-[14px] text-[#193764] placeholder:text-[#6B7280] focus:outline-none focus:border-[#2F7FC8] focus:ring-[3px] focus:ring-[rgba(47,127,200,0.15)] transition-all"
            />

            {/* Percentage */}
            {soleProp ? (
              <div className="w-[72px] flex-shrink-0 bg-[#e6f7ee] border border-[#b3e2c5] rounded-lg px-3 py-2.5 text-[14px] text-[#1a7a40] font-medium text-center select-none">
                100%
              </div>
            ) : (
              <div className="relative w-[72px] flex-shrink-0">
                <input
                  type="text"
                  inputMode="decimal"
                  value={owner.percentage}
                  onChange={e => updateOwner(owner.localId, 'percentage', e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#f5f4f2] border border-[#dde4ef] rounded-lg pl-3 pr-6 py-2.5 text-[14px] text-[#193764] placeholder:text-[#6B7280] focus:outline-none focus:border-[#2F7FC8] focus:ring-[3px] focus:ring-[rgba(47,127,200,0.15)] transition-all"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-[#6B7280] pointer-events-none">
                  %
                </span>
              </div>
            )}

            {/* Remove */}
            {!soleProp && owners.length > 1 && (
              <button
                type="button"
                onClick={() => removeOwner(owner.localId)}
                className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[#fdecea] text-[#C0392B] hover:bg-[#C0392B] hover:text-white transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add owner */}
      {!soleProp && (
        <button
          type="button"
          onClick={addOwner}
          className="flex items-center gap-1.5 text-[13px] text-[#2F7FC8] hover:text-[#1a6aaf] font-medium self-start"
        >
          <Plus size={14} />
          Add another owner
        </button>
      )}

      {/* Running total badge */}
      {!soleProp && (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium border ${
              totalIsHundred
                ? 'bg-[#e6f7ee] text-[#1a7a40] border-[#b3e2c5]'
                : 'bg-[#fef3c7] text-[#78350f] border-[#fde68a]'
            }`}
          >
            Total: {displayTotal}%{totalIsHundred ? ' ✓' : ''}
          </span>
        </div>
      )}

      {/* Validation error */}
      {showValidationError && !soleProp && !totalIsHundred && (
        <div className="bg-[#fdecea] border border-[#f1b0aa] text-[#922b21] text-[13px] rounded-lg px-4 py-3">
          Ownership percentages must add up to 100% before continuing.
        </div>
      )}
    </div>
  );
}
