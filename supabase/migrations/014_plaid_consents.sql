create table if not exists plaid_consents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  consented_at timestamptz not null,
  consent_version text not null default '1.0',
  ip_address text,
  created_at timestamptz default now()
);
alter table plaid_consents enable row level security;
create policy "Users can insert own consent" on plaid_consents
  for insert with check (auth.uid() = user_id);
create policy "Users can view own consent" on plaid_consents
  for select using (auth.uid() = user_id);
