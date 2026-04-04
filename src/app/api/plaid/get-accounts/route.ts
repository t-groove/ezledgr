import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '../../../../../supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { access_token } = await req.json()

  const response = await plaidClient.accountsGet({ access_token })

  return NextResponse.json({
    accounts: response.data.accounts.map(a => ({
      plaid_account_id: a.account_id,
      name: a.name,
      official_name: a.official_name ?? null,
      type: a.type,
      subtype: a.subtype ?? null,
      mask: a.mask ?? null,
      balance_current: a.balances.current ?? null,
      balance_available: a.balances.available ?? null,
    }))
  })
}
