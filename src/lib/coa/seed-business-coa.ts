import { createAdminClient } from '@/lib/supabase/admin'

export interface SeedCoAResult {
  success: boolean
  accountsCreated: number
  errors: string[]
}

const ENTITY_TYPE_MAP: Record<string, string> = {
  'Sole Proprietor': 'sole_prop',
  'Sole Proprietorship': 'sole_prop',
  'LLC': 'sole_prop',
  'Single-Member LLC': 'sole_prop',
  'Partnership': 'partnership',
  'Multi-Member LLC': 'partnership',
  'S-Corp': 'corporation',
  'C-Corp': 'corporation',
  'Corporation': 'corporation',
  'Non-Profit': 'nonprofit',
  'Nonprofit': 'nonprofit',
  'Non-profit': 'nonprofit',
  // already-normalized values pass through
  'sole_prop': 'sole_prop',
  'partnership': 'partnership',
  'corporation': 'corporation',
  'nonprofit': 'nonprofit',
}

export async function seedBusinessCoA(
  businessId: string,
  entityType: string
): Promise<SeedCoAResult> {
  const errors: string[] = []
  const supabase = createAdminClient()

  if (!(entityType in ENTITY_TYPE_MAP)) {
    console.warn(`[seedBusinessCoA] Unknown entityType "${entityType}" — falling back to sole_prop`)
  }
  const normalizedType = ENTITY_TYPE_MAP[entityType] ?? 'sole_prop'

  // 1. Find the matching template set
  const { data: templateSet, error: setError } = await supabase
    .from('coa_template_sets')
    .select('id')
    .eq('entity_type', normalizedType)
    .maybeSingle()

  if (setError || !templateSet) {
    const msg = `No CoA template found for entity_type "${normalizedType}" (original: "${entityType}")`
    console.warn('[seedBusinessCoA]', msg, setError ?? '')
    return { success: false, accountsCreated: 0, errors: [msg] }
  }

  // 2. Fetch all template accounts, sorted so parents always precede children
  const { data: templateAccounts, error: accError } = await supabase
    .from('coa_template_accounts')
    .select('id, parent_id, account_number, name, description, account_type, sub_type, irs_form_line, is_system, is_postable, sort_order')
    .eq('template_set_id', templateSet.id)
    .order('sort_order', { ascending: true })

  if (accError || !templateAccounts) {
    const msg = `Failed to fetch template accounts: ${accError?.message ?? 'unknown error'}`
    console.error('[seedBusinessCoA]', msg)
    return { success: false, accountsCreated: 0, errors: [msg] }
  }

  // Maps template account ID → the chart_of_accounts ID just inserted for that account.
  // Built incrementally so Pass 2 can resolve parent_id from Pass 1 results.
  const templateIdToCoaId = new Map<string, string>()
  let accountsCreated = 0

  // 3a. Pass 1 — top-level accounts (parent_id IS NULL in the template)
  const topLevel = templateAccounts.filter(a => a.parent_id === null)

  for (const account of topLevel) {
    const { data: inserted, error: insertError } = await supabase
      .from('chart_of_accounts')
      .insert({
        business_id: businessId,
        parent_id: null,
        account_number: account.account_number,
        name: account.name,
        description: account.description,
        account_type: account.account_type,
        sub_type: account.sub_type,
        irs_form_line: account.irs_form_line,
        is_system: account.is_system,
        is_postable: account.is_postable ?? true,
        is_active: true,
        sort_order: account.sort_order,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      const msg = `Failed to insert account ${account.account_number}: ${insertError?.message ?? 'no data returned'}`
      console.error('[seedBusinessCoA]', msg)
      errors.push(msg)
      continue
    }

    templateIdToCoaId.set(account.id, inserted.id)
    accountsCreated++
  }

  // 3b. Pass 2 — sub-accounts (parent_id IS NOT NULL in the template)
  const subAccounts = templateAccounts.filter(a => a.parent_id !== null)

  for (const account of subAccounts) {
    const coaParentId = templateIdToCoaId.get(account.parent_id)

    if (!coaParentId) {
      const msg = `Skipping sub-account ${account.account_number} — parent template ID "${account.parent_id}" not found in inserted accounts`
      console.warn('[seedBusinessCoA]', msg)
      errors.push(msg)
      continue
    }

    const { data: inserted, error: insertError } = await supabase
      .from('chart_of_accounts')
      .insert({
        business_id: businessId,
        parent_id: coaParentId,
        account_number: account.account_number,
        name: account.name,
        description: account.description,
        account_type: account.account_type,
        sub_type: account.sub_type,
        irs_form_line: account.irs_form_line,
        is_system: account.is_system,
        is_postable: account.is_postable ?? true,
        is_active: true,
        sort_order: account.sort_order,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      const msg = `Failed to insert sub-account ${account.account_number}: ${insertError?.message ?? 'no data returned'}`
      console.error('[seedBusinessCoA]', msg)
      errors.push(msg)
      continue
    }

    // Add to map in case there are grandchild accounts
    templateIdToCoaId.set(account.id, inserted.id)
    accountsCreated++
  }

  return {
    success: errors.length === 0,
    accountsCreated,
    errors,
  }
}
