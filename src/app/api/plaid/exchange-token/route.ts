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
    const { public_token } = await req.json()

    // Exchange public token for access token — server-side only, never returned to client
    const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token })
    const accessToken = tokenResponse.data.access_token
    const itemId = tokenResponse.data.item_id

    // Store the token immediately in the staging table so it never needs to
    // travel through the browser. save-account-mappings will read it by item_id.
    const { error: stagingError } = await supabase
      .from('plaid_token_staging')
      .upsert({ item_id: itemId, access_token: accessToken, user_id: user.id })

    if (stagingError) {
      console.error('[plaid][exchange-token] staging insert error:', stagingError)
      return NextResponse.json(
        { error: 'Failed to connect bank account. Please try again.' },
        { status: 500 }
      )
    }

    // Fetch account details server-side so the client never sees the access token
    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken })

    return NextResponse.json({
      success: true,
      item_id: itemId,
      accounts: accountsResponse.data.accounts.map(a => ({
        plaid_account_id: a.account_id,
        name: a.name,
        official_name: a.official_name ?? null,
        logo_url: null as string | null,
        type: a.type,
        subtype: a.subtype ?? null,
        mask: a.mask ?? null,
        balance_current: a.balances.current ?? null,
        balance_available: a.balances.available ?? null,
      })),
    })
  } catch (error) {
    console.error('[plaid][exchange-token] error:', error)
    return NextResponse.json(
      { error: 'Failed to connect bank account. Please try again.' },
      { status: 500 }
    )
  }
}
