"use client";

import type { BusinessCreationData, EntityType } from './types';
import { ENTITY_TYPE_CONFIGS, isSoleProp, genId } from './types';

interface Props {
  data: BusinessCreationData;
  onChange: (updates: Partial<BusinessCreationData>) => void;
}

export default function StepBasics({ data, onChange }: Props) {
  function handleEntityChange(value: EntityType) {
    const updates: Partial<BusinessCreationData> = { entityType: value };
    // Reset owners when switching entity type so percentage logic stays consistent
    if (isSoleProp(value) && !isSoleProp(data.entityType)) {
      updates.owners = [{ localId: genId(), name: '', percentage: '100' }];
    } else if (!isSoleProp(value) && isSoleProp(data.entityType)) {
      updates.owners = [{ localId: genId(), name: '', percentage: '100' }];
    }
    onChange(updates);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Business Name */}
      <div>
        <label className="block text-[13px] text-[#6B7280] mb-1">
          Business name <span className="text-[#C0392B]">*</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Acme LLC"
          className="w-full bg-[#f5f4f2] border border-[#dde4ef] rounded-lg px-3 py-2.5 text-[14px] text-[#193764] placeholder:text-[#6B7280] focus:outline-none focus:border-[#2F7FC8] focus:ring-[3px] focus:ring-[rgba(47,127,200,0.15)] transition-all"
        />
      </div>

      {/* Entity Type */}
      <div>
        <label className="block text-[13px] text-[#6B7280] mb-2">
          Entity type <span className="text-[#C0392B]">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ENTITY_TYPE_CONFIGS.map(cfg => {
            const isSelected = data.entityType === cfg.value;
            return (
              <button
                key={cfg.value}
                type="button"
                onClick={() => handleEntityChange(cfg.value)}
                className={`flex flex-col items-center text-center gap-1 px-2 py-3 rounded-[10px] border-[1.5px] transition-all ${
                  isSelected
                    ? 'border-[#2F7FC8] bg-[#daeaf8]'
                    : 'border-[#dde4ef] bg-white hover:border-[#2F7FC8]/50 hover:bg-[#f0f7fd]'
                }`}
              >
                <span className="text-xl leading-none">{cfg.emoji}</span>
                <span className="text-[13px] font-medium text-[#193764] mt-0.5">{cfg.label}</span>
                <span className="text-[11px] text-[#6B7280] leading-tight">{cfg.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Business Address */}
      <div>
        <label className="block text-[13px] text-[#6B7280] mb-1">
          Business address <span className="text-[#6B7280]">(optional)</span>
        </label>
        <input
          type="text"
          value={data.address}
          onChange={e => onChange({ address: e.target.value })}
          placeholder="123 Main St, City, State 12345"
          className="w-full bg-[#f5f4f2] border border-[#dde4ef] rounded-lg px-3 py-2.5 text-[14px] text-[#193764] placeholder:text-[#6B7280] focus:outline-none focus:border-[#2F7FC8] focus:ring-[3px] focus:ring-[rgba(47,127,200,0.15)] transition-all"
        />
      </div>

      {/* Tip Box */}
      <div className="bg-[#e8eef6] rounded-lg px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#6B7280] mb-1">
          Not sure what entity type you are?
        </p>
        <p className="text-[13px] text-[#193764] leading-snug">
          If you haven&apos;t filed any paperwork with the state, choose{' '}
          <strong>Sole Proprietor</strong>. If you&apos;ve formed an LLC or corporation, pick that.
        </p>
      </div>
    </div>
  );
}
