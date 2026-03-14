-- Bank accounts table
create table if not exists public.bank_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  bank_name text not null,
  account_type text not null check (account_type in ('checking', 'savings', 'credit_card', 'other')),
  last_four text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.bank_accounts enable row level security;

create policy "Users can only access their own bank accounts"
  on public.bank_accounts
  for all
  using (auth.uid() = user_id);

-- Add account_id column to transactions table
alter table public.transactions
  add column if not exists account_id uuid references public.bank_accounts(id) on delete set null;

create index bank_accounts_user_id_idx on public.bank_accounts(user_id);
create index transactions_account_id_idx on public.transactions(account_id);
