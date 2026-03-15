-- Cash basis cleanup: equipment purchases are expensed immediately.
-- Migrate old asset category transactions to the new "Equipment & Tools" expense category.

-- Equipment → Equipment & Tools (expense)
update public.transactions
set
  category    = 'Equipment & Tools',
  account_type = 'Expense'
where category    = 'Equipment'
  and account_type = 'Asset';

-- Real Estate & Vehicles → Equipment & Tools (expense)
-- These were rare one-off asset categorisations; treat as cash-basis expenses.
update public.transactions
set
  category    = 'Equipment & Tools',
  account_type = 'Expense'
where category in ('Real Estate', 'Vehicles')
  and account_type = 'Asset';

-- Safety net: ensure any remaining "Equipment & Tools" rows have the right account_type.
update public.transactions
set account_type = 'Expense'
where category = 'Equipment & Tools';
