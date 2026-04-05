import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '../../../../../supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { account_id } = await req.json()

    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('plaid_access_token, plaid_account_id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    if (!bankAccount?.plaid_access_token) {
      return NextResponse.json({ error: 'Not connected' }, { status: 400 })
    }

    const response = await plaidClient.accountsBalanceGet({
      access_token: bankAccount.plaid_access_token,
      options: {
        account_ids: [bankAccount.plaid_account_id],
      },
    })

    const account = response.data.accounts[0]
    return NextResponse.json({
      balance: account.balances.current,
      available: account.balances.available,
      currency: account.balances.iso_currency_code,
    })
  } catch (error) {
    console.error('[plaid][get-balance] error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
