-- Cleanup job scheduled in migration 016_plaid_staging_cleanup.sql
-- Rows older than 1 hour are automatically deleted by pg_cron

-- Temporary staging table for Plaid access tokens.
-- A token is written here by exchange-token/route.ts immediately after the
-- public_token exchange and is deleted by save-account-mappings/route.ts
-- once the token has been moved to its permanent bank_accounts row.
-- This ensures the access_token never travels through the browser.

create table if not exists plaid_token_staging (
  id           uuid        default gen_random_uuid() primary key,
  item_id      text        not null unique,
  access_token text        not null,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now()
);

alter table plaid_token_staging enable row level security;

-- Authenticated users can only see and manage their own staging rows.
create policy "Users can manage own staging tokens"
  on plaid_token_staging
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Safety net: auto-delete rows older than 1 hour so orphaned tokens
-- from abandoned connections don't accumulate.
-- (Requires pg_cron or a scheduled Supabase function — flagged as follow-up.)
-- create index plaid_token_staging_created_at_idx on plaid_token_staging(created_at);
