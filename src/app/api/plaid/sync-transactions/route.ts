import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '../../../../../supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { account_id, syncStartDate, resetCursor } = await req.json()

  const { data: bankAccount, error: accountError } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .single()

  if (accountError || !bankAccount) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Resolve access token: may be on this row or on another row with the same plaid_item_id
  let accessToken = bankAccount.plaid_access_token
  if (!accessToken && bankAccount.plaid_item_id) {
    const { data: tokenAccount } = await supabase
      .from('bank_accounts')
      .select('plaid_access_token')
      .eq('plaid_item_id', bankAccount.plaid_item_id)
      .not('plaid_access_token', 'is', null)
      .limit(1)
      .single()
    accessToken = tokenAccount?.plaid_access_token ?? null
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Account not connected to Plaid' }, { status: 400 })
  }

  // Handle cursor reset (Shift+Click "sync all historical transactions")
  if (resetCursor) {
    await supabase
      .from('bank_accounts')
      .update({ plaid_cursor: null })
      .eq('id', account_id)
    bankAccount.plaid_cursor = null
  }

  let added: Array<{ account_id: string; date: string; merchant_name?: string; name?: string; amount: number }> = []
  let modified: Array<{ account_id: string }> = []
  let removed: Array<{ account_id: string }> = []
  let balanceCurrent: number | null = null
  let balanceAvailable: number | null = null

  if (!bankAccount.plaid_cursor) {
    // ── FIRST SYNC: use transactionsGet to pull the chosen historical range ──
    const startDate = syncStartDate ?? new Date(
      new Date().setFullYear(new Date().getFullYear() - 1)
    ).toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]

    let offset = 0
    let totalTransactions = Infinity

    while (offset < totalTransactions) {
      const response = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          account_ids: [bankAccount.plaid_account_id],
          count: 500,
          offset,
        },
      })
      const data = response.data
      totalTransactions = data.total_transactions
      added = added.concat(data.transactions as typeof added)
      offset += data.transactions.length

      // Extract balance from the last page
      const plaidAccountData = data.accounts?.find(
        (a: { account_id: string }) => a.account_id === bankAccount.plaid_account_id
      )
      if (plaidAccountData) {
        balanceCurrent = plaidAccountData.balances?.current ?? null
        balanceAvailable = plaidAccountData.balances?.available ?? null
      }

      if (data.transactions.length === 0) break
    }
  } else {
    // ── SUBSEQUENT SYNCS: use transactionsSync with saved cursor ──
    let cursor: string | undefined = bankAccount.plaid_cursor
    let hasMore = true

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor,
      })
      const data = response.data
      added = added.concat(data.added as typeof added)
      modified = modified.concat(data.modified as typeof modified)
      removed = removed.concat(data.removed as typeof removed)
      hasMore = data.has_more
      cursor = data.next_cursor

      // Extract balance from each page (last page wins)
      const matchingAccount = data.accounts?.find(
        (a: { account_id: string }) => a.account_id === bankAccount.plaid_account_id
      )
      if (matchingAccount) {
        balanceCurrent = matchingAccount.balances?.current ?? null
        balanceAvailable = matchingAccount.balances?.available ?? null
      }
    }

    // Save the new cursor
    await supabase
      .from('bank_accounts')
      .update({
        plaid_cursor: cursor,
        plaid_last_synced_at: new Date().toISOString(),
      })
      .eq('id', account_id)
  }

  // Insert new transactions, deduplicating against existing rows
  const accountTransactions = added.filter(
    (t) => t.account_id === bankAccount.plaid_account_id
  )

  const toInsert: Array<{
    user_id: string
    business_id: string
    account_id: string
    date: string
    description: string
    payee_name: string
    payee_id: null
    amount: number
    type: string
    category: string
    account_type: string
    raw_csv_row: string
  }> = []

  for (const t of accountTransactions) {
    const payeeName = t.merchant_name ?? t.name ?? 'Unknown'
    const description = t.name ?? t.merchant_name ?? 'Unknown'
    const amount = Math.abs(t.amount)

    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('account_id', bankAccount.id)
      .eq('date', t.date)
      .eq('amount', amount)
      .eq('description', description)
      .limit(1)

    if (!existing || existing.length === 0) {
      toInsert.push({
        user_id: user.id,
        business_id: bankAccount.business_id,
        account_id: bankAccount.id,
        date: t.date,
        description,
        payee_name: payeeName,
        payee_id: null,
        amount,
        type: t.amount > 0 ? 'expense' : 'income',
        category: 'Uncategorized',
        account_type: 'Expense',
        raw_csv_row: JSON.stringify(t),
      })
    }
  }

  if (toInsert.length > 0) {
    await supabase.from('transactions').insert(toInsert)
  }

  // Save balance + last-synced timestamp
  await supabase
    .from('bank_accounts')
    .update({
      plaid_last_synced_at: new Date().toISOString(),
      ...(balanceCurrent !== null || balanceAvailable !== null
        ? { plaid_balance_current: balanceCurrent, plaid_balance_available: balanceAvailable }
        : {}),
    })
    .eq('id', account_id)

  return NextResponse.json({
    success: true,
    added: toInsert.length,
    modified: modified.length,
    removed: removed.length,
  })
}
