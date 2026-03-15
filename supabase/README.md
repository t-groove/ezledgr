# Supabase Setup

Run each migration in order in your Supabase project's SQL Editor.

## Step 1 — Transactions table

1. Go to supabase.com → your project → SQL Editor
2. Click "New query"
3. Copy and paste the contents of `migrations/001_transactions.sql`
4. Click "Run"

## Step 2 — Bank accounts table

1. Click "New query"
2. Copy and paste the contents of `migrations/002_bank_accounts.sql`
3. Click "Run"

This creates the `bank_accounts` table and adds an `account_id` foreign key column to the `transactions` table so transactions can be linked to a specific bank account.

Row Level Security is enabled automatically on all tables so each user can only access their own data.

## Step 3 — Add account_type column (migration 004)

**⚠️ Breaking change — run this before deploying the new code.**

1. Click "New query"
2. Copy and paste the contents of `migrations/004_add_account_type.sql`
3. Click "Run"

This adds an `account_type` column (`Income`, `Expense`, `Asset`, `Equity`, or `Liability`) to the `transactions` table and back-fills it for all existing rows based on their current category. New transactions will have `account_type` set automatically by the application code.
