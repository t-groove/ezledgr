import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '../../../../../supabase/server'

// Accepts item_id from the client — looks up the access token server-side.
// Never accepts or returns an access_token in request or response.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { item_id } = await req.json()

    // Look up token from staging table (set by exchange-token) scoped to this user
    const { data: staging } = await supabase
      .from('plaid_token_staging')
      .select('access_token')
      .eq('item_id', item_id)
      .eq('user_id', user.id)
      .single()

    // Fall back to bank_accounts for already-saved connections (e.g. re-fetch after save)
    let accessToken = staging?.access_token ?? null
    if (!accessToken) {
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('plaid_access_token')
        .eq('plaid_item_id', item_id)
        .eq('user_id', user.id)
        .not('plaid_access_token', 'is', null)
        .single()
      accessToken = account?.plaid_access_token ?? null
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const response = await plaidClient.accountsGet({ access_token: accessToken })

    return NextResponse.json({
      accounts: response.data.accounts.map(a => ({
        plaid_account_id: a.account_id,
        name: a.name,
        official_name: a.official_name ?? null,
        logo_url: null as string | null,
        type: a.type,
        subtype: a.subtype ?? null,
        mask: a.mask ?? null,
        balance_current: a.balances.current ?? null,
        balance_available: a.balances.available ?? null,
      }))
    })
  } catch (error) {
    console.error('[plaid][get-accounts] error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
