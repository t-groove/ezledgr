"use client";

import { Link2, Landmark, Clock } from 'lucide-react';
import type { BusinessCreationData, BankChoice } from './types';

interface Props {
  data: BusinessCreationData;
  onChange: (updates: Partial<BusinessCreationData>) => void;
}

const BANK_OPTIONS: Array<{
  value: BankChoice;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  label: string;
  tag: string | null;
  description: string;
}> = [
  {
    value: 'plaid',
    Icon: Link2,
    label: 'Connect via Plaid',
    tag: 'Recommended',
    description: 'Securely link your bank — transactions sync automatically',
  },
  {
    value: 'manual_account',
    Icon: Landmark,
    label: 'Create a Bank Account',
    tag: null,
    description: 'Set up an account manually, then import transactions via CSV',
  },
  {
    value: 'skip',
    Icon: Clock,
    label: 'Skip bank connection for now',
    tag: null,
    description: 'You can connect or import transactions any time from the Accounts page',
  },
];

const HOW_IT_WORKS = [
  {
    num: 1,
    title: 'Tell us about your business',
    subtitle: 'Done — your books are set up.',
    done: true,
  },
  {
    num: 2,
    title: 'Connect your bank accounts',
    subtitle: 'We pull in your transactions automatically.',
    done: false,
  },
  {
    num: 3,
    title: 'Categorize your transactions',
    subtitle: 'Tell us what each expense is for. Takes minutes, not hours.',
    done: false,
  },
];

export default function StepBankConnection({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* How it works */}
      <div className="flex flex-col gap-3">
        {HOW_IT_WORKS.map(step => (
          <div key={step.num} className="flex items-start gap-3">
            <div
              className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold mt-0.5 ${
                step.done
                  ? 'bg-[#e6f7ee] text-[#1a7a40] border border-[#b3e2c5]'
                  : 'bg-[#193764] text-white'
              }`}
            >
              {step.done ? '✓' : step.num}
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#193764]">{step.title}</p>
              <p className="text-[12px] text-[#6B7280] mt-0.5">{step.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-[#dde4ef]" />

      {/* Bank options */}
      <div className="flex flex-col gap-2">
        {BANK_OPTIONS.map(({ value, Icon, label, tag, description }) => {
          const isSelected = data.bankChoice === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ bankChoice: value })}
              className={`flex items-start gap-3 p-4 rounded-[10px] border-[1.5px] text-left transition-all ${
                isSelected
                  ? 'border-[#2F7FC8] bg-[#daeaf8]'
                  : 'border-[#dde4ef] bg-white hover:border-[#2F7FC8]/50'
              }`}
            >
              <div
                className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center mt-0.5 ${
                  isSelected ? 'bg-[#2F7FC8]/15' : 'bg-[#e8eef6]'
                }`}
              >
                <Icon size={16} className={isSelected ? 'text-[#2F7FC8]' : 'text-[#193764]'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-medium text-[#193764]">{label}</span>
                  {tag && (
                    <span className="text-[10px] font-medium bg-[#e6f7ee] text-[#1a7a40] border border-[#b3e2c5] rounded px-1.5 py-0.5">
                      {tag}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6B7280] mt-0.5">{description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function bankButtonLabel(bankChoice: BankChoice): string {
  switch (bankChoice) {
    case 'plaid':
      return 'Connect with Plaid →';
    case 'manual_account':
      return 'Create Bank Account →';
    case 'skip':
      return 'Go to Dashboard →';
  }
}
