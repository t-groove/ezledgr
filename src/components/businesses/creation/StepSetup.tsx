"use client";

import type { BusinessCreationData, AccountingMethod } from './types';
import { MONTHS, INDUSTRIES } from './types';

interface Props {
  data: BusinessCreationData;
  onChange: (updates: Partial<BusinessCreationData>) => void;
}

const METHOD_OPTIONS: Array<{
  value: AccountingMethod;
  label: string;
  tag: string | null;
  description: string;
}> = [
  {
    value: 'cash',
    label: 'Cash basis',
    tag: 'Recommended',
    description: 'Record income when received, expenses when paid',
  },
  {
    value: 'accrual',
    label: 'Accrual',
    tag: null,
    description: 'Record income when earned, expenses when incurred',
  },
];

export default function StepSetup({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Accounting Method */}
      <div>
        <label className="block text-[13px] text-[#6B7280] mb-2">
          Accounting method <span className="text-[#C0392B]">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {METHOD_OPTIONS.map(opt => {
            const isSelected = data.accountingMethod === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ accountingMethod: opt.value })}
                className={`flex flex-col items-start gap-1 p-3.5 rounded-[10px] border-[1.5px] text-left transition-all ${
                  isSelected
                    ? 'border-[#2F7FC8] bg-[#daeaf8]'
                    : 'border-[#dde4ef] bg-white hover:border-[#2F7FC8]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[#193764]">{opt.label}</span>
                  {opt.tag && (
                    <span className="text-[10px] font-medium bg-[#e6f7ee] text-[#1a7a40] border border-[#b3e2c5] rounded px-1.5 py-0.5">
                      {opt.tag}
                    </span>
                  )}
                </div>
                <span className="text-[12px] text-[#6B7280] leading-snug">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fiscal Year End */}
      <div>
        <label className="block text-[13px] text-[#6B7280] mb-1">Fiscal year end</label>
        <select
          value={data.fiscalYearEnd}
          onChange={e => onChange({ fiscalYearEnd: e.target.value })}
          className="w-full bg-[#f5f4f2] border border-[#dde4ef] rounded-lg px-3 py-2.5 text-[14px] text-[#193764] focus:outline-none focus:border-[#2F7FC8] focus:ring-[3px] focus:ring-[rgba(47,127,200,0.15)] transition-all cursor-pointer"
        >
          {MONTHS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Industry */}
      <div>
        <label className="block text-[13px] text-[#6B7280] mb-1">
          Industry <span className="text-[#6B7280]">(optional)</span>
        </label>
        <select
          value={data.industry}
          onChange={e => onChange({ industry: e.target.value })}
          className="w-full bg-[#f5f4f2] border border-[#dde4ef] rounded-lg px-3 py-2.5 text-[14px] text-[#193764] focus:outline-none focus:border-[#2F7FC8] focus:ring-[3px] focus:ring-[rgba(47,127,200,0.15)] transition-all cursor-pointer"
        >
          <option value="">Select industry…</option>
          {INDUSTRIES.map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      {/* Tip Box */}
      <div className="bg-[#e8eef6] rounded-lg px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#6B7280] mb-1">
          Which should I choose?
        </p>
        <p className="text-[13px] text-[#193764] leading-snug">
          Cash basis is simpler and the right choice for most small businesses. Your accountant can
          help you switch to accrual later if needed.
        </p>
      </div>
    </div>
  );
}
