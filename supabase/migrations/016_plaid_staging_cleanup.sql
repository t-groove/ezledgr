-- Delete plaid_token_staging rows older than 1 hour.
-- These are orphaned rows from users who abandoned the bank connection
-- flow after token exchange but before mapping save.
--
-- PREREQUISITE: pg_cron must be enabled in the Supabase dashboard under
-- Database → Extensions → pg_cron before this migration will take effect.
-- Without it, the cron.schedule() call below will fail.

select cron.schedule(
  'cleanup-plaid-token-staging',
  '0 * * * *',  -- runs every hour at :00
  $$
    delete from plaid_token_staging
    where created_at < now() - interval '1 hour';
  $$
);
