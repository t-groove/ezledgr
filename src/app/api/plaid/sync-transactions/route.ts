import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '../../../../../supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { account_id } = await req.json()

  const { data: bankAccount, error: accountError } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .single()

  if (accountError || !bankAccount) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  if (!bankAccount.plaid_access_token) {
    return NextResponse.json({ error: 'Account not connected to Plaid' }, { status: 400 })
  }

  let cursor: string | undefined = bankAccount.plaid_cursor ?? undefined
  let added: Array<{ account_id: string; date: string; merchant_name?: string; name?: string; amount: number }> = []
  let modified: Array<{ account_id: string }> = []
  let removed: Array<{ account_id: string }> = []
  let hasMore = true

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: bankAccount.plaid_access_token,
      cursor,
    })
    const data = response.data
    added = added.concat(data.added as typeof added)
    modified = modified.concat(data.modified as typeof modified)
    removed = removed.concat(data.removed as typeof removed)
    hasMore = data.has_more
    cursor = data.next_cursor
  }

  if (added.length > 0) {
    const accountTransactions = added.filter(
      (t) => t.account_id === bankAccount.plaid_account_id
    )

    // Bulk check for existing transactions to prevent duplicates
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
        .eq('description', t.name ?? t.merchant_name ?? 'Unknown')
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
  }

  await supabase
    .from('bank_accounts')
    .update({
      plaid_cursor: cursor,
      plaid_last_synced_at: new Date().toISOString(),
    })
    .eq('id', account_id)

  return NextResponse.json({
    success: true,
    added: added.length,
    modified: modified.length,
    removed: removed.length,
  })
}
