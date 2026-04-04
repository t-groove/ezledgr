import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '../../../../../supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { public_token } = await req.json()

  const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token })
  const accessToken = tokenResponse.data.access_token
  const itemId = tokenResponse.data.item_id

  return NextResponse.json({ success: true, access_token: accessToken, item_id: itemId })
}
