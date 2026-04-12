export type EntityType =
  | 'LLC'
  | 'Sole Proprietor'
  | 'S-Corp'
  | 'C-Corp'
  | 'Partnership'
  | 'Non-Profit';

export type AccountingMethod = 'cash' | 'accrual';

export type BankChoice = 'plaid' | 'manual_account' | 'skip';

export interface OwnerRow {
  localId: string;
  name: string;
  percentage: string; // string while typing; parse on submit
}

export interface BusinessCreationData {
  name: string;
  entityType: EntityType | '';
  address: string;
  accountingMethod: AccountingMethod;
  fiscalYearEnd: string;
  industry: string;
  owners: OwnerRow[];
  bankChoice: BankChoice;
}

export function isSoleProp(entityType: EntityType | ''): boolean {
  return entityType === 'Sole Proprietor';
}

export const ENTITY_TYPE_CONFIGS: Array<{
  value: EntityType;
  emoji: string;
  label: string;
  description: string;
}> = [
  {
    value: 'LLC',
    emoji: '🏢',
    label: 'LLC',
    description: 'Flexible structure with liability protection for all members',
  },
  {
    value: 'Sole Proprietor',
    emoji: '👤',
    label: 'Sole Proprietor',
    description: 'Simplest structure — just you, no formal paperwork required',
  },
  {
    value: 'S-Corp',
    emoji: '🏛️',
    label: 'S-Corp',
    description: 'Pass-through taxation with up to 100 shareholders',
  },
  {
    value: 'C-Corp',
    emoji: '🏭',
    label: 'C-Corp',
    description: 'Separate tax entity, ideal for raising investment capital',
  },
  {
    value: 'Partnership',
    emoji: '🤝',
    label: 'Partnership',
    description: 'Two or more owners sharing profits and responsibilities',
  },
  {
    value: 'Non-Profit',
    emoji: '❤️',
    label: 'Non-Profit',
    description: 'Tax-exempt organization serving a public or charitable purpose',
  },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const INDUSTRIES = [
  'Retail',
  'Food & Beverage',
  'Construction',
  'Healthcare',
  'Real Estate',
  'Professional Services',
  'Technology',
  'Transportation',
  'Hospitality',
  'Manufacturing',
  'Non-Profit',
  'Other',
];

export function genId(): string {
  return Math.random().toString(36).slice(2);
}
