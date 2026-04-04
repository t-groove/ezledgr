import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../supabase/server'

interface PlaidAccountInfo {
  plaid_account_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  mask: string | null
  balance_current: number | null
  balance_available: number | null
}

interface AccountMapping {
  plaid_account: PlaidAccountInfo
  action: 'map_existing' | 'create_new' | 'skip'
  existing_account_id?: string
  new_account?: {
    name: string
    account_type: string
    last_four: string
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    access_token,
    item_id,
    institution_name,
    institution_id,
    business_id,
    mappings,
  }: {
    access_token: string
    item_id: string
    institution_name: string
    institution_id: string
    business_id: string
    mappings: AccountMapping[]
  } = await req.json()

  if (!business_id) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }

  const connectedAccountIds: string[] = []
  let isPrimaryTokenSaved = false
  const nonSkipped = mappings.filter(m => m.action !== 'skip')

  for (const mapping of mappings) {
    if (mapping.action === 'skip') continue

    // Only the first connected account stores the access_token.
    // All others share plaid_item_id and look up the token at sync time.
    const tokenForThisAccount = isPrimaryTokenSaved ? null : access_token
    if (!isPrimaryTokenSaved) isPrimaryTokenSaved = true

    if (mapping.action === 'map_existing' && mapping.existing_account_id) {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update({
          plaid_access_token: tokenForThisAccount,
          plaid_item_id: item_id,
          plaid_account_id: mapping.plaid_account.plaid_account_id,
          plaid_institution_name: institution_name,
          plaid_institution_id: institution_id,
          is_plaid_connected: true,
          last_four: mapping.plaid_account.mask,
          bank_name: institution_name,
        })
        .eq('id', mapping.existing_account_id)
        .eq('business_id', business_id)
        .select('id')
        .single()

      if (error) {
        console.error('save-account-mappings map_existing error:', error)
        continue
      }
      if (data) {
        connectedAccountIds.push(data.id)
      }
    } else if (mapping.action === 'create_new' && mapping.new_account) {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          business_id,
          name: mapping.new_account.name,
          bank_name: institution_name,
          account_type: mapping.new_account.account_type,
          last_four: mapping.new_account.last_four || null,
          plaid_access_token: tokenForThisAccount,
          plaid_item_id: item_id,
          plaid_account_id: mapping.plaid_account.plaid_account_id,
          plaid_institution_name: institution_name,
          plaid_institution_id: institution_id,
          is_plaid_connected: true,
        })
        .select('id')
        .single()

      if (error) {
        console.error('save-account-mappings create_new error:', error)
        continue
      }
      if (data) {
        connectedAccountIds.push(data.id)
      }
    }
  }

  return NextResponse.json({
    success: true,
    connected_account_ids: connectedAccountIds,
    total_attempted: nonSkipped.length,
  })
}
