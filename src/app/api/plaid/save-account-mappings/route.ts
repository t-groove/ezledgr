import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../supabase/server'

function mapPlaidSubtype(subtype: string | null): string {
  const s = (subtype ?? '').toLowerCase()
  if (['checking'].includes(s)) return 'checking'
  if (['savings', 'money market', 'cd'].includes(s)) return 'savings'
  if (['credit card', 'credit'].includes(s)) return 'credit_card'
  if (['cash management', 'prepaid'].includes(s)) return 'cash'
  return 'other'
}

interface PlaidAccountInfo {
  plaid_account_id: string
  name: string
  official_name: string | null
  logo_url: string | null
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
  opening_balance: number
  opening_balance_date: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const {
      item_id,
      institution_name,
      institution_id,
      business_id,
      mappings,
    }: {
      item_id: string
      institution_name: string
      institution_id: string
      business_id: string
      mappings: AccountMapping[]
    } = await req.json()

    if (!business_id) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    // Look up the access token server-side from the staging table.
    // The token was stored there by exchange-token/route.ts and has never
    // been sent to the browser.
    const { data: staging } = await supabase
      .from('plaid_token_staging')
      .select('access_token')
      .eq('item_id', item_id)
      .eq('user_id', user.id)
      .single()

    if (!staging?.access_token) {
      return NextResponse.json(
        { error: 'Session expired. Please reconnect your bank account.' },
        { status: 400 }
      )
    }

    const access_token = staging.access_token

    const connectedAccountIds: string[] = []
    let isPrimaryTokenSaved = false
    const nonSkipped = mappings.filter(m => m.action !== 'skip')

    for (const mapping of mappings) {
      if (mapping.action === 'skip') continue

      // Only the first connected account per item stores the access_token.
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
            account_type: mapPlaidSubtype(mapping.plaid_account.subtype),
            plaid_official_name: mapping.plaid_account.official_name ?? null,
            plaid_logo_url: mapping.plaid_account.logo_url ?? null,
            plaid_balance_current: mapping.plaid_account.balance_current ?? null,
            plaid_balance_available: mapping.plaid_account.balance_available ?? null,
            opening_balance: mapping.opening_balance ?? 0,
            opening_balance_date: mapping.opening_balance_date ?? null,
          })
          .eq('id', mapping.existing_account_id)
          .eq('business_id', business_id)
          .select('id')
          .single()

        if (error) {
          console.error('[plaid][save-account-mappings] map_existing error:', error)
          continue
        }
        if (data) {
          connectedAccountIds.push(data.id)

          if (mapping.opening_balance !== 0) {
            const openingDate = mapping.opening_balance_date ?? new Date().toISOString().split('T')[0]
            const amount = Math.abs(mapping.opening_balance)
            const type = mapping.opening_balance >= 0 ? 'income' : 'expense'
            await supabase.from('transactions').insert({
              user_id: user.id,
              business_id,
              account_id: data.id,
              date: openingDate,
              description: 'Beginning Balance',
              payee_name: 'Beginning Balance',
              payee_id: null,
              amount,
              type,
              category: 'Opening Balance',
              account_type: type === 'income' ? 'Income' : 'Expense',
              is_opening_balance: true,
              raw_csv_row: null,
            })
          }
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
            plaid_official_name: mapping.plaid_account.official_name ?? null,
            plaid_logo_url: mapping.plaid_account.logo_url ?? null,
            plaid_balance_current: mapping.plaid_account.balance_current ?? null,
            plaid_balance_available: mapping.plaid_account.balance_available ?? null,
            opening_balance: mapping.opening_balance ?? 0,
            opening_balance_date: mapping.opening_balance_date ?? null,
          })
          .select('id')
          .single()

        if (error) {
          console.error('[plaid][save-account-mappings] create_new error:', error)
          continue
        }
        if (data) {
          connectedAccountIds.push(data.id)

          if (mapping.opening_balance !== 0) {
            const openingDate = mapping.opening_balance_date ?? new Date().toISOString().split('T')[0]
            const amount = Math.abs(mapping.opening_balance)
            const type = mapping.opening_balance >= 0 ? 'income' : 'expense'
            await supabase.from('transactions').insert({
              user_id: user.id,
              business_id,
              account_id: data.id,
              date: openingDate,
              description: 'Beginning Balance',
              payee_name: 'Beginning Balance',
              payee_id: null,
              amount,
              type,
              category: 'Opening Balance',
              account_type: type === 'income' ? 'Income' : 'Expense',
              is_opening_balance: true,
              raw_csv_row: null,
            })
          }
        }
      }
    }

    // Delete the staging token — it has been moved to bank_accounts and must
    // not linger. Scoped to user_id for safety.
    await supabase
      .from('plaid_token_staging')
      .delete()
      .eq('item_id', item_id)
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      connected_account_ids: connectedAccountIds,
      total_attempted: nonSkipped.length,
    })
  } catch (error) {
    console.error('[plaid][save-account-mappings] error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
