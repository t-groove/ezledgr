import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { Products, CountryCode } from 'plaid'
import { createClient } from '../../../../../supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { institution_id } = body as { institution_id?: string }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'ezledgr',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      transactions: {
        days_requested: 730,
      },
      ...(process.env.NEXT_PUBLIC_SITE_URL && {
        redirect_uri: process.env.NEXT_PUBLIC_SITE_URL + '/dashboard/accounts',
      }),
      ...(institution_id && {
        institution_id,
      }),
    })

    console.log('Link token created successfully')
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (error: unknown) {
    const err = error as { response?: { data: unknown }; message?: string }
    console.error('Plaid link token error:', err.response?.data ?? error)
    return NextResponse.json(
      { error: err.response?.data ?? err.message },
      { status: 500 }
    )
  }
}
