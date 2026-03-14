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
  "Equipment",
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

export const TRANSFER_CATEGORIES = [
  "Owner Contributions",
  "Owner Draw",
  "Transfer",
] as const;

export const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
  ...TRANSFER_CATEGORIES,
] as const;
