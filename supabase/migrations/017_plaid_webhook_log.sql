create table if not exists plaid_webhook_log (
  id              uuid        default gen_random_uuid() primary key,
  item_id         text        not null,
  webhook_type    text        not null,
  webhook_code    text        not null,
  bank_account_id uuid        references bank_accounts(id) on delete set null,
  received_at     timestamptz not null,
  created_at      timestamptz default now()
);

alter table plaid_webhook_log enable row level security;

-- Service role only — webhook logs are internal, not user-facing
create policy "Service role full access to webhook log"
  on plaid_webhook_log
  for all
  using (true)
  with check (true);
