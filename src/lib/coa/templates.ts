import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'

interface TemplateAccount {
  parent_number: string | null
  account_number: string
  name: string
  description: string
  account_type: AccountType
  sub_type: string
  irs_form_line: string
  is_system: boolean
  is_postable?: boolean
  sort_order: number
}

interface TemplateSet {
  entity_type: string
  display_name: string
  tax_form: string
  accounts: TemplateAccount[]
}

// ---------------------------------------------------------------------------
// Shared asset block — sole_prop version (1300 irs = 'Sch C, Line 42')
// ---------------------------------------------------------------------------
const SOLE_PROP_ASSETS: TemplateAccount[] = [
  { parent_number: null, account_number: '1000', name: 'Cash & Checking', description: 'Primary business checking account', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '', is_system: false, sort_order: 0 },
  { parent_number: null, account_number: '1010', name: 'Savings & Money Market', description: 'Business savings accounts', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '', is_system: false, sort_order: 0 },
  { parent_number: null, account_number: '1200', name: 'Accounts Receivable', description: 'Money owed by customers', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '', is_system: false, sort_order: 0 },
  { parent_number: null, account_number: '1300', name: 'Inventory', description: 'Goods held for sale', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: 'Sch C, Line 42', is_system: false, sort_order: 0 },
  { parent_number: null, account_number: '1400', name: 'Prepaid Expenses', description: 'Expenses paid in advance', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '', is_system: false, sort_order: 0 },
  { parent_number: null, account_number: '1500', name: 'Equipment', description: 'Tools, machinery, computers', account_type: 'Asset', sub_type: 'Fixed Asset', irs_form_line: '', is_system: false, sort_order: 0 },
  { parent_number: null, account_number: '1510', name: 'Vehicles', description: 'Vehicles used for business', account_type: 'Asset', sub_type: 'Fixed Asset', irs_form_line: '', is_system: false, sort_order: 0 },
  { parent_number: null, account_number: '1520', name: 'Real Estate', description: 'Business property owned', account_type: 'Asset', sub_type: 'Fixed Asset', irs_form_line: '', is_system: false, sort_order: 0 },
  { parent_number: null, account_number: '1590', name: 'Accumulated Depreciation', description: 'Contra-asset — reduces fixed asset values', account_type: 'Asset', sub_type: 'Fixed Asset', irs_form_line: '', is_system: true, sort_order: 0 },
  { parent_number: null, account_number: '1900', name: 'Other Assets', description: 'Deposits, long-term receivables', account_type: 'Asset', sub_type: 'Other Asset', irs_form_line: '', is_system: false, sort_order: 0 },
]

// Partnership / corp share the same asset block but 1300 irs differs
const PARTNERSHIP_ASSETS: TemplateAccount[] = SOLE_PROP_ASSETS.map(a =>
  a.account_number === '1300' ? { ...a, irs_form_line: '1065 Sch L' } : { ...a }
)

const CORP_ASSETS: TemplateAccount[] = [
  ...PARTNERSHIP_ASSETS.map(a =>
    a.account_number === '1300' ? { ...a, irs_form_line: '1120-S Sch L' } : { ...a }
  ),
  { parent_number: null, account_number: '1600', name: 'Goodwill', description: 'Intangible assets from acquisitions', account_type: 'Asset', sub_type: 'Other Asset', irs_form_line: '1120-S Sch L', is_system: false, sort_order: 0 },
]

// ---------------------------------------------------------------------------
// Template 1: Sole Proprietor / Single-Member LLC
// ---------------------------------------------------------------------------
const SOLE_PROP: TemplateSet = {
  entity_type: 'sole_prop',
  display_name: 'Sole Proprietor / Single-Member LLC',
  tax_form: 'Schedule C (Form 1040)',
  accounts: [
    // Assets
    ...SOLE_PROP_ASSETS,

    // Liabilities
    { parent_number: null, account_number: '2000', name: 'Accounts Payable', description: 'Bills owed to vendors', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2100', name: 'Credit Cards Payable', description: 'Business credit card balances', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2200', name: 'Line of Credit', description: 'Revolving business line of credit', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2300', name: 'Loans Payable', description: 'SBA loans, bank loans, notes payable', account_type: 'Liability', sub_type: 'Long-term Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2400', name: 'Sales Tax Payable', description: 'Collected sales tax owed to state', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2900', name: 'Other Liabilities', description: 'Deferred revenue, customer deposits', account_type: 'Liability', sub_type: 'Other Liability', irs_form_line: '', is_system: false, sort_order: 0 },

    // Equity
    { parent_number: null, account_number: '3000', name: "Owner's Contributions", description: 'Cash or assets put into the business', account_type: 'Equity', sub_type: "Owner's Equity", irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3100', name: "Owner's Draw", description: 'Cash taken out for personal use — not a salary', account_type: 'Equity', sub_type: "Owner's Equity", irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3200', name: 'Retained Earnings', description: 'Prior year cumulative net income', account_type: 'Equity', sub_type: "Owner's Equity", irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3900', name: 'Opening Balance Equity', description: 'System account for starting balances', account_type: 'Equity', sub_type: "Owner's Equity", irs_form_line: '', is_system: true, sort_order: 0 },

    // Income
    { parent_number: null, account_number: '4000', name: 'Gross Receipts / Sales', description: 'All revenue from goods or services', account_type: 'Income', sub_type: 'Operating Revenue', irs_form_line: 'Sch C, Line 1', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4100', name: 'Returns & Allowances', description: 'Refunds given to customers', account_type: 'Income', sub_type: 'Operating Revenue', irs_form_line: 'Sch C, Line 2', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4500', name: 'Other Business Income', description: 'Rental income, royalties, misc', account_type: 'Income', sub_type: 'Other Income', irs_form_line: 'Sch C, Line 6', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4600', name: 'Interest Income', description: 'Bank interest on business accounts', account_type: 'Income', sub_type: 'Other Income', irs_form_line: '', is_system: false, sort_order: 0 },

    // Expenses
    { parent_number: null, account_number: '6000', name: 'Advertising', description: 'Online ads, print, signage, promotional', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 8', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6010', name: 'Car & Truck Expenses', description: 'Gas, maintenance, insurance for business vehicles', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, is_postable: false, sort_order: 0 },
    { parent_number: '6010', account_number: '6011', name: 'Mileage', description: 'Standard mileage rate deduction', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, sort_order: 0 },
    { parent_number: '6010', account_number: '6012', name: 'Actual Vehicle Expenses', description: 'Gas, oil, repairs, insurance — actual method', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6020', name: 'Commissions & Fees', description: 'Sales commissions, broker fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 10', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6030', name: 'Contract Labor', description: '1099 contractors and freelancers', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 11', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6040', name: 'Depletion', description: 'Natural resource extraction deduction', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 12', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6050', name: 'Depreciation', description: 'Section 179 and bonus depreciation', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 13', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6060', name: 'Employee Benefits', description: 'Health insurance, retirement for employees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 14', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6070', name: 'Insurance', description: 'Business liability, property, professional', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 15', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6080', name: 'Interest — Mortgage', description: 'Interest on business mortgage', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 16a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6090', name: 'Interest — Other', description: 'Loans, lines of credit, credit cards', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 16b', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6100', name: 'Legal & Professional Services', description: 'Attorney, CPA, consulting fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 17', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6110', name: 'Office Expenses', description: 'Supplies, postage, printer ink', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 18', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6120', name: 'Pension & Profit-Sharing Plans', description: 'SEP-IRA, SIMPLE IRA for employees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 19', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6130', name: 'Rent — Equipment', description: 'Equipment leases, machinery rentals', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 20a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6140', name: 'Rent — Property', description: 'Office, warehouse, or retail space', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 20b', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6150', name: 'Repairs & Maintenance', description: 'Building repairs, equipment maintenance', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 21', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6160', name: 'Supplies', description: 'Materials used in the business', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 22', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6170', name: 'Taxes & Licenses', description: 'Business licenses, payroll taxes, property taxes', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 23', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6180', name: 'Travel', description: 'Airfare, hotels, car rental — business travel', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 24a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6190', name: 'Meals', description: '50% deductible business meals', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 24b', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6200', name: 'Utilities', description: 'Electric, gas, water, internet, phone', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 25', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6210', name: 'Wages', description: 'Salaries paid to W-2 employees — not owner', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 26', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6220', name: 'Software & Subscriptions', description: 'SaaS tools, apps, cloud services', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6230', name: 'Bank Fees', description: 'Monthly, wire, merchant processing fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6240', name: 'Meals & Entertainment', description: 'Client entertainment — verify deductibility', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6900', name: 'Other Expenses', description: 'Business expenses not listed above', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '9000', name: 'Uncategorized', description: 'System — transactions not yet categorized', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '', is_system: true, sort_order: 0 },
  ],
}

// ---------------------------------------------------------------------------
// Template 2: Partnership / Multi-Member LLC
// ---------------------------------------------------------------------------
const PARTNERSHIP: TemplateSet = {
  entity_type: 'partnership',
  display_name: 'Partnership / Multi-Member LLC',
  tax_form: 'Form 1065',
  accounts: [
    // Assets (same as sole_prop with 1300 irs overridden)
    ...PARTNERSHIP_ASSETS,

    // Liabilities
    { parent_number: null, account_number: '2000', name: 'Accounts Payable', description: 'Bills owed to vendors', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2100', name: 'Credit Cards Payable', description: 'Business credit card balances', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2200', name: 'Line of Credit', description: 'Revolving business line of credit', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2300', name: 'Loans Payable', description: 'SBA loans, bank loans, notes payable', account_type: 'Liability', sub_type: 'Long-term Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2310', name: 'Partner Loans Payable', description: 'Amounts owed to partners who loaned money', account_type: 'Liability', sub_type: 'Long-term Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2400', name: 'Sales Tax Payable', description: 'Collected sales tax owed to state', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2900', name: 'Other Liabilities', description: 'Deferred revenue, customer deposits', account_type: 'Liability', sub_type: 'Other Liability', irs_form_line: '', is_system: false, sort_order: 0 },

    // Equity — per-partner structure
    { parent_number: null, account_number: '3000', name: 'Partner Capital', description: 'Entity-level container — do not post directly', account_type: 'Equity', sub_type: "Partner's Equity", irs_form_line: '1065 Sch L, Line 21', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '3000', account_number: '3001', name: 'Capital — [Add Partner Name]', description: 'Contributions + share of annual profit/loss', account_type: 'Equity', sub_type: "Partner's Equity", irs_form_line: 'K-1, Item L', is_system: false, sort_order: 0 },
    { parent_number: '3000', account_number: '3002', name: 'Capital — [Add Partner Name]', description: 'Contributions + share of annual profit/loss', account_type: 'Equity', sub_type: "Partner's Equity", irs_form_line: 'K-1, Item L', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3100', name: 'Partner Distributions', description: 'Entity-level container — do not post directly', account_type: 'Equity', sub_type: "Partner's Equity", irs_form_line: '1065 Sch M-2', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '3100', account_number: '3101', name: 'Distributions — [Add Partner Name]', description: 'Cash or property taken out — reduces capital', account_type: 'Equity', sub_type: "Partner's Equity", irs_form_line: 'K-1, Box 19', is_system: false, sort_order: 0 },
    { parent_number: '3100', account_number: '3102', name: 'Distributions — [Add Partner Name]', description: 'Cash or property taken out — reduces capital', account_type: 'Equity', sub_type: "Partner's Equity", irs_form_line: 'K-1, Box 19', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3200', name: 'Retained Earnings', description: 'Entity-level — prior year balances', account_type: 'Equity', sub_type: "Partner's Equity", irs_form_line: '1065 Sch L', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3900', name: 'Opening Balance Equity', description: 'System account for starting balances', account_type: 'Equity', sub_type: "Partner's Equity", irs_form_line: '', is_system: true, sort_order: 0 },

    // Income
    { parent_number: null, account_number: '4000', name: 'Gross Receipts / Sales', description: 'All revenue from goods or services', account_type: 'Income', sub_type: 'Operating Revenue', irs_form_line: '1065, Line 1a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4100', name: 'Returns & Allowances', description: 'Refunds given to customers', account_type: 'Income', sub_type: 'Operating Revenue', irs_form_line: '1065, Line 2', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4500', name: 'Other Income', description: 'Rental income, royalties, misc', account_type: 'Income', sub_type: 'Other Income', irs_form_line: '1065, Line 7', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4600', name: 'Interest Income', description: 'Bank interest on business accounts', account_type: 'Income', sub_type: 'Other Income', irs_form_line: '1065 Sch K, Line 5', is_system: false, sort_order: 0 },

    // Expenses
    { parent_number: null, account_number: '6000', name: 'Advertising', description: 'Online ads, print, signage, promotional', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 8', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6010', name: 'Car & Truck Expenses', description: 'Gas, maintenance, insurance for business vehicles', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, is_postable: false, sort_order: 0 },
    { parent_number: '6010', account_number: '6011', name: 'Mileage', description: 'Standard mileage rate deduction', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, sort_order: 0 },
    { parent_number: '6010', account_number: '6012', name: 'Actual Vehicle Expenses', description: 'Gas, oil, repairs, insurance — actual method', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6020', name: 'Commissions & Fees', description: 'Sales commissions, broker fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 10', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6030', name: 'Contract Labor', description: '1099 contractors and freelancers', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 11', is_system: false, sort_order: 0 },
    // 6040 Depletion removed; replaced by Guaranteed Payments below
    { parent_number: null, account_number: '6040', name: 'Guaranteed Payments to Partners', description: 'Entity-level container — do not post directly', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 10', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '6040', account_number: '6041', name: 'GP — [Add Partner Name]', description: 'Fixed payment to partner for services or capital', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'K-1, Box 4', is_system: false, sort_order: 0 },
    { parent_number: '6040', account_number: '6042', name: 'GP — [Add Partner Name]', description: 'Fixed payment to partner for services or capital', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'K-1, Box 4', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6050', name: 'Depreciation', description: 'Section 179 and bonus depreciation', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 13', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6060', name: 'Employee Benefits', description: 'Health insurance, retirement for employees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 14', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6070', name: 'Insurance', description: 'Business liability, property, professional', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 20', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6080', name: 'Interest — Mortgage', description: 'Interest on business mortgage', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 13', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6090', name: 'Interest — Other', description: 'Loans, lines of credit, credit cards', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 14', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6100', name: 'Legal & Professional Services', description: 'Attorney, CPA, consulting fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 20', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6110', name: 'Office Expenses', description: 'Supplies, postage, printer ink', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 18', is_system: false, sort_order: 0 },
    // 6120 Pension & Profit-Sharing Plans removed for partnership
    { parent_number: null, account_number: '6130', name: 'Rent — Equipment', description: 'Equipment leases, machinery rentals', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 19', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6140', name: 'Rent — Property', description: 'Office, warehouse, or retail space', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 19', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6150', name: 'Repairs & Maintenance', description: 'Building repairs, equipment maintenance', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 20', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6160', name: 'Supplies', description: 'Materials used in the business', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 22', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6170', name: 'Taxes & Licenses', description: 'Business licenses, payroll taxes, property taxes', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 12', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6180', name: 'Travel', description: 'Airfare, hotels, car rental — business travel', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 24a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6190', name: 'Meals', description: '50% deductible business meals', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 24b', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6200', name: 'Utilities', description: 'Electric, gas, water, internet, phone', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 25', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6210', name: 'Salaries & Wages', description: 'W-2 wages paid to employees — partners not included', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 9', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6220', name: 'Software & Subscriptions', description: 'SaaS tools, apps, cloud services', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6230', name: 'Bank Fees', description: 'Monthly, wire, merchant processing fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6240', name: 'Meals & Entertainment', description: 'Client entertainment — verify deductibility', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6900', name: 'Other Deductions', description: 'Business expenses not listed above', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1065, Line 20', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '9000', name: 'Uncategorized', description: 'System — transactions not yet categorized', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '', is_system: true, sort_order: 0 },
  ],
}

// ---------------------------------------------------------------------------
// Template 3: S-Corp / C-Corp
// ---------------------------------------------------------------------------
const CORPORATION: TemplateSet = {
  entity_type: 'corporation',
  display_name: 'S-Corp / C-Corp',
  tax_form: 'Form 1120-S / Form 1120',
  accounts: [
    // Assets (sole_prop base + 1600 Goodwill, 1300 irs overridden)
    ...CORP_ASSETS,

    // Liabilities
    { parent_number: null, account_number: '2000', name: 'Accounts Payable', description: 'Bills owed to vendors', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2100', name: 'Credit Cards Payable', description: 'Business credit card balances', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2200', name: 'Line of Credit', description: 'Revolving business line of credit', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2300', name: 'Loans Payable', description: 'SBA loans, bank loans, notes payable', account_type: 'Liability', sub_type: 'Long-term Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2310', name: 'Shareholder Loans Payable', description: 'Amounts owed to shareholders who loaned to corp', account_type: 'Liability', sub_type: 'Long-term Liability', irs_form_line: '1120-S Sch L', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2400', name: 'Payroll Taxes Payable', description: 'Federal and state payroll taxes owed', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2500', name: 'Sales Tax Payable', description: 'Collected sales tax owed to state', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2900', name: 'Other Liabilities', description: 'Deferred revenue, customer deposits', account_type: 'Liability', sub_type: 'Other Liability', irs_form_line: '', is_system: false, sort_order: 0 },

    // Equity — per-shareholder structure
    { parent_number: null, account_number: '3000', name: 'Common Stock', description: 'Par value of shares issued', account_type: 'Equity', sub_type: "Shareholders' Equity", irs_form_line: '1120-S Sch L', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3100', name: 'Additional Paid-In Capital', description: 'Capital contributed above par value', account_type: 'Equity', sub_type: "Shareholders' Equity", irs_form_line: '1120-S Sch L', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3200', name: 'Shareholder Distributions', description: 'Entity-level container — do not post directly', account_type: 'Equity', sub_type: "Shareholders' Equity", irs_form_line: '1120-S Sch M-2', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '3200', account_number: '3201', name: 'Distributions — [Add Shareholder Name]', description: 'S-Corp distributions — not salary', account_type: 'Equity', sub_type: "Shareholders' Equity", irs_form_line: 'K-1, Box 16D', is_system: false, sort_order: 0 },
    { parent_number: '3200', account_number: '3202', name: 'Distributions — [Add Shareholder Name]', description: 'S-Corp distributions — not salary', account_type: 'Equity', sub_type: "Shareholders' Equity", irs_form_line: 'K-1, Box 16D', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3300', name: 'Retained Earnings', description: 'Cumulative net income kept in the business', account_type: 'Equity', sub_type: "Shareholders' Equity", irs_form_line: '1120-S Sch L', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3400', name: 'Treasury Stock', description: 'Shares repurchased by the corporation', account_type: 'Equity', sub_type: "Shareholders' Equity", irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3900', name: 'Opening Balance Equity', description: 'System account for starting balances', account_type: 'Equity', sub_type: "Shareholders' Equity", irs_form_line: '', is_system: true, sort_order: 0 },

    // Income
    { parent_number: null, account_number: '4000', name: 'Gross Receipts / Sales', description: 'All revenue from goods or services', account_type: 'Income', sub_type: 'Operating Revenue', irs_form_line: '1120-S, Line 1a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4100', name: 'Returns & Allowances', description: 'Refunds given to customers', account_type: 'Income', sub_type: 'Operating Revenue', irs_form_line: '1120-S, Line 2', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4500', name: 'Other Income', description: 'Rental income, royalties, misc', account_type: 'Income', sub_type: 'Other Income', irs_form_line: '1120-S, Line 5', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4600', name: 'Interest Income', description: 'Bank interest on business accounts', account_type: 'Income', sub_type: 'Other Income', irs_form_line: '1120-S Sch K, Line 4', is_system: false, sort_order: 0 },

    // Expenses
    { parent_number: null, account_number: '6000', name: 'Advertising', description: 'Online ads, print, signage, promotional', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 8', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6010', name: 'Car & Truck Expenses', description: 'Gas, maintenance, insurance for business vehicles', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, is_postable: false, sort_order: 0 },
    { parent_number: '6010', account_number: '6011', name: 'Mileage', description: 'Standard mileage rate deduction', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, sort_order: 0 },
    { parent_number: '6010', account_number: '6012', name: 'Actual Vehicle Expenses', description: 'Gas, oil, repairs, insurance — actual method', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 9', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6020', name: 'Commissions & Fees', description: 'Sales commissions, broker fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 10', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6030', name: 'Contract Labor', description: '1099 contractors and freelancers', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 11', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6040', name: 'Depletion', description: 'Natural resource extraction deduction', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 12', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6050', name: 'Depreciation', description: 'Section 179 and bonus depreciation', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 13', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6060', name: 'Employee Benefits', description: 'Health insurance, retirement for employees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 18', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6070', name: 'Insurance', description: 'Business liability, property, professional', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 15', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6080', name: 'Interest — Mortgage', description: 'Interest on business mortgage', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 10', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6090', name: 'Interest — Other', description: 'Loans, lines of credit, credit cards', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 11', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6100', name: 'Legal & Professional Services', description: 'Attorney, CPA, consulting fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 17', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6110', name: 'Office Expenses', description: 'Supplies, postage, printer ink', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 18', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6120', name: 'Pension & Profit-Sharing Plans', description: 'SEP-IRA, SIMPLE IRA for employees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 17', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6130', name: 'Rent — Equipment', description: 'Equipment leases, machinery rentals', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 13', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6140', name: 'Rent — Property', description: 'Office, warehouse, or retail space', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 13', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6150', name: 'Repairs & Maintenance', description: 'Building repairs, equipment maintenance', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 21', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6160', name: 'Supplies', description: 'Materials used in the business', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 22', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6170', name: 'Taxes & Licenses', description: 'Business licenses, payroll taxes, property taxes', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 12', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6180', name: 'Travel', description: 'Airfare, hotels, car rental — business travel', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 24a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6190', name: 'Meals', description: '50% deductible business meals', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 24b', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6200', name: 'Utilities', description: 'Electric, gas, water, internet, phone', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 25', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6210', name: 'Salaries & Wages — Employees', description: 'W-2 wages paid to non-owner employees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 7', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6215', name: 'Officer Compensation', description: 'Entity-level container — do not post directly', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 7', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '6215', account_number: '6216', name: 'Officer Salary — [Add Shareholder Name]', description: 'Required W-2 for shareholder-employee — must be reasonable', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 7', is_system: false, sort_order: 0 },
    { parent_number: '6215', account_number: '6217', name: 'Officer Salary — [Add Shareholder Name]', description: 'Required W-2 for shareholder-employee — must be reasonable', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 7', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6220', name: 'Software & Subscriptions', description: 'SaaS tools, apps, cloud services', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6230', name: 'Bank Fees', description: 'Monthly, wire, merchant processing fees', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6240', name: 'Meals & Entertainment', description: 'Client entertainment — verify deductibility', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: 'Sch C, Line 27a', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6900', name: 'Other Deductions', description: 'Business expenses not listed above', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '1120-S, Line 12', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '9000', name: 'Uncategorized', description: 'System — transactions not yet categorized', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '', is_system: true, sort_order: 0 },
  ],
}

// ---------------------------------------------------------------------------
// Template 4: Nonprofit / Tax-Exempt Organization
// ---------------------------------------------------------------------------
const NONPROFIT: TemplateSet = {
  entity_type: 'nonprofit',
  display_name: 'Nonprofit / Tax-Exempt Organization',
  tax_form: 'Form 990 / 990-EZ / 990-N',
  accounts: [
    // Assets
    { parent_number: null, account_number: '1000', name: 'Cash & Checking', description: 'Primary operating checking account', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '1010', name: 'Savings & Money Market', description: 'Operating savings and reserve accounts', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '1020', name: 'Restricted Cash', description: 'Grant funds restricted for specific purposes', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '1200', name: 'Accounts Receivable', description: 'Pledges receivable and amounts owed to org', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '1210', name: 'Grants Receivable', description: 'Awarded grants not yet received', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '1300', name: 'Prepaid Expenses', description: 'Expenses paid in advance', account_type: 'Asset', sub_type: 'Current Asset', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '1500', name: 'Equipment', description: 'Computers, furniture, program equipment', account_type: 'Asset', sub_type: 'Fixed Asset', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '1510', name: 'Vehicles', description: 'Vehicles used for programs or operations', account_type: 'Asset', sub_type: 'Fixed Asset', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '1590', name: 'Accumulated Depreciation', description: 'Contra-asset — reduces fixed asset values', account_type: 'Asset', sub_type: 'Fixed Asset', irs_form_line: '', is_system: true, sort_order: 0 },
    { parent_number: null, account_number: '1900', name: 'Other Assets', description: 'Security deposits, long-term receivables', account_type: 'Asset', sub_type: 'Other Asset', irs_form_line: '', is_system: false, sort_order: 0 },

    // Liabilities
    { parent_number: null, account_number: '2000', name: 'Accounts Payable', description: 'Bills owed to vendors', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2100', name: 'Accrued Expenses', description: 'Incurred but not yet paid', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2200', name: 'Deferred Revenue', description: 'Grants received before work is completed', account_type: 'Liability', sub_type: 'Current Liability', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2300', name: 'Loans Payable', description: 'Bank loans, PPP loans, notes payable', account_type: 'Liability', sub_type: 'Long-term Liability', irs_form_line: '', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '2900', name: 'Other Liabilities', description: 'Refundable advances, custodial funds', account_type: 'Liability', sub_type: 'Other Liability', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },

    // Equity (Net Assets)
    { parent_number: null, account_number: '3000', name: 'Net Assets — Unrestricted', description: 'Funds with no donor restrictions on use', account_type: 'Equity', sub_type: 'Net Assets', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3100', name: 'Net Assets — Temporarily Restricted', description: 'Restricted by time or purpose — released when conditions met', account_type: 'Equity', sub_type: 'Net Assets', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3200', name: 'Net Assets — Permanently Restricted', description: 'Endowment — principal must be maintained permanently', account_type: 'Equity', sub_type: 'Net Assets', irs_form_line: '990, Part X', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '3900', name: 'Opening Balance Equity', description: 'System account for starting balances', account_type: 'Equity', sub_type: 'Net Assets', irs_form_line: '', is_system: true, sort_order: 0 },

    // Income
    { parent_number: null, account_number: '4000', name: 'Contributions & Donations', description: 'Individual donor contributions, online giving', account_type: 'Income', sub_type: 'Contribution Revenue', irs_form_line: '990, Part VIII, Line 1', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '4000', account_number: '4001', name: 'Direct Mail / Annual Fund', description: 'Donations from mail campaigns', account_type: 'Income', sub_type: 'Contribution Revenue', irs_form_line: '990, Part VIII, Line 1', is_system: false, sort_order: 0 },
    { parent_number: '4000', account_number: '4002', name: 'Major Gifts', description: 'Significant individual donor gifts', account_type: 'Income', sub_type: 'Contribution Revenue', irs_form_line: '990, Part VIII, Line 1', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4020', name: 'Grants — Government', description: 'Federal, state, or local government grants', account_type: 'Income', sub_type: 'Grant Revenue', irs_form_line: '990, Part VIII, Line 1e', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4030', name: 'Grants — Foundation / Private', description: 'Foundation and corporate grants', account_type: 'Income', sub_type: 'Grant Revenue', irs_form_line: '990, Part VIII, Line 1f', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4040', name: 'Program Service Revenue', description: 'Fees from mission-related activities', account_type: 'Income', sub_type: 'Program Revenue', irs_form_line: '990, Part VIII, Line 2', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4050', name: 'Special Events Revenue', description: 'Fundraising event tickets and sponsorships', account_type: 'Income', sub_type: 'Contribution Revenue', irs_form_line: '990, Part VIII, Line 1c', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4060', name: 'In-Kind Contributions', description: 'Non-cash goods and services donated', account_type: 'Income', sub_type: 'Contribution Revenue', irs_form_line: '990, Part VIII, Line 1g', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4070', name: 'Investment Income', description: 'Dividends, interest, gains', account_type: 'Income', sub_type: 'Other Income', irs_form_line: '990, Part VIII, Line 3-5', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '4900', name: 'Other Revenue', description: 'Miscellaneous revenue not classified above', account_type: 'Income', sub_type: 'Other Income', irs_form_line: '990, Part VIII, Line 11', is_system: false, sort_order: 0 },

    // Expenses — three functional buckets
    { parent_number: null, account_number: '6000', name: 'Program Services', description: 'Costs directly related to the mission', account_type: 'Expense', sub_type: 'Program Expense', irs_form_line: '990, Part IX, Col B', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '6000', account_number: '6001', name: 'Program Salaries', description: 'Staff wages allocated to program delivery', account_type: 'Expense', sub_type: 'Program Expense', irs_form_line: '990, Part IX, Line 5', is_system: false, sort_order: 0 },
    { parent_number: '6000', account_number: '6002', name: 'Program Supplies', description: 'Materials used directly in programs', account_type: 'Expense', sub_type: 'Program Expense', irs_form_line: '990, Part IX, Line 22', is_system: false, sort_order: 0 },
    { parent_number: '6000', account_number: '6003', name: 'Program Contractors', description: 'Contract workers delivering program services', account_type: 'Expense', sub_type: 'Program Expense', irs_form_line: '990, Part IX, Line 11', is_system: false, sort_order: 0 },
    { parent_number: '6000', account_number: '6004', name: 'Program Travel', description: 'Travel for program delivery', account_type: 'Expense', sub_type: 'Program Expense', irs_form_line: '990, Part IX, Line 17', is_system: false, sort_order: 0 },
    { parent_number: '6000', account_number: '6005', name: 'Program Other', description: 'Other direct program costs', account_type: 'Expense', sub_type: 'Program Expense', irs_form_line: '990, Part IX, Line 24', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6100', name: 'Management & General', description: 'Admin costs not allocable to programs or fundraising', account_type: 'Expense', sub_type: 'Management Expense', irs_form_line: '990, Part IX, Col D', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '6100', account_number: '6101', name: 'Admin Salaries', description: 'Staff wages allocated to general management', account_type: 'Expense', sub_type: 'Management Expense', irs_form_line: '990, Part IX, Line 5', is_system: false, sort_order: 0 },
    { parent_number: '6100', account_number: '6102', name: 'Office & Admin Expenses', description: 'Supplies, postage, equipment for administration', account_type: 'Expense', sub_type: 'Management Expense', irs_form_line: '990, Part IX, Line 18', is_system: false, sort_order: 0 },
    { parent_number: '6100', account_number: '6103', name: 'Legal & Accounting', description: 'Audit, legal, and accounting fees', account_type: 'Expense', sub_type: 'Management Expense', irs_form_line: '990, Part IX, Line 11', is_system: false, sort_order: 0 },
    { parent_number: '6100', account_number: '6104', name: 'Insurance', description: "Directors & Officers, general liability, property", account_type: 'Expense', sub_type: 'Management Expense', irs_form_line: '990, Part IX, Line 22', is_system: false, sort_order: 0 },
    { parent_number: '6100', account_number: '6105', name: 'Technology & Software', description: 'SaaS tools, IT infrastructure', account_type: 'Expense', sub_type: 'Management Expense', irs_form_line: '990, Part IX, Line 22', is_system: false, sort_order: 0 },
    { parent_number: '6100', account_number: '6106', name: 'Occupancy — Admin', description: 'Rent and utilities allocated to admin', account_type: 'Expense', sub_type: 'Management Expense', irs_form_line: '990, Part IX, Line 16', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6200', name: 'Fundraising Expenses', description: 'Costs of raising contributions — tracked separately for 990', account_type: 'Expense', sub_type: 'Fundraising Expense', irs_form_line: '990, Part IX, Col C', is_system: true, is_postable: false, sort_order: 0 },
    { parent_number: '6200', account_number: '6201', name: 'Fundraising Salaries', description: 'Staff wages allocated to fundraising', account_type: 'Expense', sub_type: 'Fundraising Expense', irs_form_line: '990, Part IX, Line 5', is_system: false, sort_order: 0 },
    { parent_number: '6200', account_number: '6202', name: 'Event Costs', description: 'Direct costs of fundraising events', account_type: 'Expense', sub_type: 'Fundraising Expense', irs_form_line: '990, Part IX, Line 10', is_system: false, sort_order: 0 },
    { parent_number: '6200', account_number: '6203', name: 'Donor Communications', description: 'Appeal letters, email campaigns, donor stewardship', account_type: 'Expense', sub_type: 'Fundraising Expense', irs_form_line: '990, Part IX, Line 22', is_system: false, sort_order: 0 },
    { parent_number: '6200', account_number: '6204', name: 'Fundraising Other', description: 'Other fundraising costs', account_type: 'Expense', sub_type: 'Fundraising Expense', irs_form_line: '990, Part IX, Line 24', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6300', name: 'Salaries & Wages', description: 'Total employee compensation', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '990, Part IX, Line 5', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6310', name: 'Employee Benefits', description: 'Health insurance, retirement contributions', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '990, Part IX, Line 8', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6320', name: 'Payroll Taxes', description: 'Employer share of FICA, FUTA, SUTA', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '990, Part IX, Line 9', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6400', name: 'Depreciation', description: 'Depreciation on equipment and vehicles', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '990, Part IX, Line 22', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '6900', name: 'Other Expenses', description: 'Miscellaneous operational expenses', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '990, Part IX, Line 24', is_system: false, sort_order: 0 },
    { parent_number: null, account_number: '9000', name: 'Uncategorized', description: 'System — transactions not yet categorized', account_type: 'Expense', sub_type: 'Operating Expense', irs_form_line: '', is_system: true, sort_order: 0 },
  ],
}

// ---------------------------------------------------------------------------
// Exported constants and seed function
// ---------------------------------------------------------------------------
export const TEMPLATES: TemplateSet[] = [SOLE_PROP, PARTNERSHIP, CORPORATION, NONPROFIT]

export async function seedCoaTemplates(): Promise<number> {
  let totalInserted = 0

  for (const template of TEMPLATES) {
    // 1. Upsert the template set
    const { data: set, error: setError } = await supabase
      .from('coa_template_sets')
      .upsert(
        {
          entity_type: template.entity_type,
          display_name: template.display_name,
          tax_form: template.tax_form,
        },
        { onConflict: 'entity_type' }
      )
      .select('id')
      .single()

    if (setError || !set) {
      console.error('Template set error:', setError)
      continue
    }

    // 2. Upsert all accounts (parent_id null on first pass)
    const rows = template.accounts.map((a, i) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { parent_number, ...rest } = a
      return {
        template_set_id: set.id,
        ...rest,
        parent_id: null as string | null,
        sort_order: i,
      }
    })

    const { error: accError } = await supabase
      .from('coa_template_accounts')
      .upsert(rows, { onConflict: 'template_set_id,account_number' })

    if (accError) {
      console.error('Template accounts error:', accError)
      continue
    }

    totalInserted += rows.length

    // 3. Resolve parent_number -> parent_id for child accounts
    const childAccounts = template.accounts.filter(a => a.parent_number !== null)
    if (childAccounts.length === 0) continue

    const { data: inserted, error: fetchError } = await supabase
      .from('coa_template_accounts')
      .select('id, account_number')
      .eq('template_set_id', set.id)

    if (fetchError || !inserted) {
      console.error('Fetch accounts error:', fetchError)
      continue
    }

    const numberToId = new Map<string, string>(
      inserted.map((a: { id: string; account_number: string }) => [a.account_number, a.id])
    )

    for (const child of childAccounts) {
      const parentId = numberToId.get(child.parent_number!)
      if (!parentId) {
        console.warn(`Parent ${child.parent_number} not found for ${child.account_number} in ${template.entity_type}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('coa_template_accounts')
        .update({ parent_id: parentId })
        .eq('template_set_id', set.id)
        .eq('account_number', child.account_number)

      if (updateError) {
        console.error(`Update parent error for ${child.account_number}:`, updateError)
      }
    }
  }

  return totalInserted
}
