import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../supabase/server'

export async function POST(request: NextRequest) {
  // Always return 200 immediately — Plaid will retry if we don't respond fast
  // Do the actual work after acknowledging receipt

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Log the webhook type for debugging — never log sensitive data
  const webhookType = body.webhook_type as string
  const webhookCode = body.webhook_code as string
  const itemId = body.item_id as string

  console.log(`[plaid][webhook] received: ${webhookType}/${webhookCode} for item: ${itemId}`)

  // Acknowledge receipt immediately.
  // Then process asynchronously (fire and forget for now — Phase 2 can add a queue)
  handleWebhook(webhookType, webhookCode, itemId).catch(err => {
    console.error('[plaid][webhook] handler error:', err)
  })

  return NextResponse.json({ received: true }, { status: 200 })
}

async function handleWebhook(
  webhookType: string,
  webhookCode: string,
  itemId: string
) {
  const supabase = await createClient()

  // Find all bank accounts associated with this item_id.
  // Multiple accounts can share one item_id (multi-account connection), so we
  // use the first row to get user/business context and log once per item.
  const { data: account, error } = await supabase
    .from('bank_accounts')
    .select('id, user_id, business_id, plaid_access_token')
    .eq('plaid_item_id', itemId)
    .not('plaid_access_token', 'is', null)
    .limit(1)
    .single()

  if (error || !account) {
    console.error('[plaid][webhook] account not found for item_id:', itemId)
    return
  }

  if (webhookType === 'TRANSACTIONS') {
    if (
      webhookCode === 'SYNC_UPDATES_AVAILABLE' ||
      webhookCode === 'INITIAL_UPDATE' ||
      webhookCode === 'HISTORICAL_UPDATE' ||
      webhookCode === 'NEW_ACCOUNTS_AVAILABLE'
    ) {
      console.log(`[plaid][webhook] triggering sync for account: ${account.id}`)

      // Log the sync trigger to Supabase for audit trail
      await supabase
        .from('plaid_webhook_log')
        .insert({
          item_id: itemId,
          webhook_type: webhookType,
          webhook_code: webhookCode,
          bank_account_id: account.id,
          received_at: new Date().toISOString(),
        })
        .then(({ error: logError }) => {
          if (logError) console.error('[plaid][webhook] log error:', logError)
        })

      // Note: actual sync logic will be wired in Phase 2.
      // For now we log and acknowledge — manual sync still works via the button.
    }
  }

  if (webhookType === 'ITEM') {
    if (webhookCode === 'ERROR') {
      console.error('[plaid][webhook] item error for:', itemId, 'user should re-authenticate')
      // Future: notify user via email that their bank connection needs attention
    }
    if (webhookCode === 'PENDING_EXPIRATION') {
      console.warn('[plaid][webhook] item pending expiration:', itemId)
      // Future: notify user their connection will expire soon
    }
  }
}
