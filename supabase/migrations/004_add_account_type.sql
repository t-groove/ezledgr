-- Add account_type column to transactions
alter table public.transactions
  add column if not exists account_type text
  default 'Expense'
  check (account_type in (
    'Income', 'Expense', 'Asset', 'Equity', 'Liability'
  ));

-- Auto-populate account_type for existing transactions
-- based on their current category
update public.transactions set account_type = case
  when category in (
    'Sales Revenue', 'Service Revenue', 'Interest Income',
    'Refunds Received', 'Other Income'
  ) then 'Income'
  when category in (
    'Equipment', 'Real Estate', 'Vehicles'
  ) then 'Asset'
  when category in (
    'Owner Contributions', 'Owner Draw', 'Retained Earnings',
    'Transfer', 'Owner Contribution', 'Transfer Between Accounts'
  ) then 'Equity'
  when category in (
    'Line of Credit', 'Loans'
  ) then 'Liability'
  else 'Expense'
end;

create index if not exists transactions_account_type_idx
  on public.transactions(account_type);
