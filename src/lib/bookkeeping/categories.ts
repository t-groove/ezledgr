export const INCOME_CATEGORIES = [
  "Sales Revenue",
  "Service Revenue",
  "Consulting",
  "Interest Income",
  "Refunds Received",
  "Other Income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Advertising & Marketing",
  "Bank Fees",
  "Contract Labor",
  "Equipment",
  "Insurance",
  "Meals & Entertainment",
  "Office Supplies",
  "Professional Services",
  "Rent & Utilities",
  "Software & Subscriptions",
  "Travel",
  "Vehicle & Mileage",
  "Wages & Salaries",
  "Other Expense",
] as const;

export const TRANSFER_CATEGORIES = [
  "Owner Contribution",
  "Owner Draw",
  "Transfer Between Accounts",
] as const;

export const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
  ...TRANSFER_CATEGORIES,
] as const;
