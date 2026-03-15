// The five accounting buckets
export type AccountType =
  'Income' | 'Expense' | 'Asset' | 'Equity' | 'Liability'

export const INCOME_CATEGORIES = [
  "Sales Revenue",
  "Service Revenue",
  "Interest Income",
  "Refunds Received",
  "Other Income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Advertising & Marketing",
  "Bank Fees",
  "Contract Labor",
  "Insurance",
  "Interest",
  "Meals and Entertainment",
  "Office Supplies",
  "Professional Services",
  "Rent - Equipment",
  "Rent - Property",
  "Repairs & Maintenance",
  "Software & Subscriptions",
  "Supplies",
  "Taxes and licenses",
  "Travel",
  "Utilities",
  "Vehicle & Mileage",
  "Employee benefit programs",
  "Wages & Salaries",
  "Other Expense",
] as const;

export const ASSET_CATEGORIES = [
  "Equipment",
  "Real Estate",
  "Vehicles",
] as const;

export const EQUITY_CATEGORIES = [
  "Owner Contributions",
  "Owner Draw",
  "Retained Earnings",
] as const;

export const LIABILITY_CATEGORIES = [
  "Line of Credit",
  "Loans",
] as const;

export const TRANSFER_CATEGORIES = [
  "Transfer",
] as const;

// All P&L categories (Income + Expense only)
export const PL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
] as const;

// All categories for dropdowns
export const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
  ...ASSET_CATEGORIES,
  ...EQUITY_CATEGORIES,
  ...LIABILITY_CATEGORIES,
  ...TRANSFER_CATEGORIES,
] as const;

// Map every category to its accounting bucket
export const CATEGORY_ACCOUNT_TYPE: Record<string, AccountType> = {
  // Income
  "Sales Revenue": "Income",
  "Service Revenue": "Income",
  "Interest Income": "Income",
  "Refunds Received": "Income",
  "Other Income": "Income",
  // Expenses
  "Advertising & Marketing": "Expense",
  "Bank Fees": "Expense",
  "Contract Labor": "Expense",
  "Insurance": "Expense",
  "Interest": "Expense",
  "Meals and Entertainment": "Expense",
  "Office Supplies": "Expense",
  "Professional Services": "Expense",
  "Rent - Equipment": "Expense",
  "Rent - Property": "Expense",
  "Repairs & Maintenance": "Expense",
  "Software & Subscriptions": "Expense",
  "Supplies": "Expense",
  "Taxes and licenses": "Expense",
  "Travel": "Expense",
  "Utilities": "Expense",
  "Vehicle & Mileage": "Expense",
  "Employee benefit programs": "Expense",
  "Wages & Salaries": "Expense",
  "Other Expense": "Expense",
  // Assets
  "Equipment": "Asset",
  "Real Estate": "Asset",
  "Vehicles": "Asset",
  // Equity
  "Owner Contributions": "Equity",
  "Owner Draw": "Equity",
  "Retained Earnings": "Equity",
  // Liabilities
  "Line of Credit": "Liability",
  "Loans": "Liability",
  // Transfers (excluded from everything)
  "Transfer": "Equity",
};

// Helper to get account type for any category
export function getAccountType(category: string): AccountType {
  return CATEGORY_ACCOUNT_TYPE[category] ?? "Expense";
}

// Categories excluded from P&L entirely
export const NON_PL_CATEGORIES = [
  ...ASSET_CATEGORIES,
  ...EQUITY_CATEGORIES,
  ...LIABILITY_CATEGORIES,
  ...TRANSFER_CATEGORIES,
] as const;
