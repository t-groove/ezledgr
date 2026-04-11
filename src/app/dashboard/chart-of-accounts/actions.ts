"use server";

import { createClient } from "../../../../supabase/server";

export interface CoAAccount {
  id: string;
  business_id: string;
  parent_id: string | null;
  account_number: string;
  name: string;
  description: string | null;
  account_type: string;
  sub_type: string | null;
  irs_form_line: string | null;
  is_system: boolean;
  is_postable: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

export interface UpsertCoAAccountData {
  id?: string;
  account_number: string;
  name: string;
  account_type: string;
  sub_type?: string | null;
  description?: string | null;
  irs_form_line?: string | null;
  parent_id?: string | null;
  is_active: boolean;
  is_postable?: boolean;
}

const TYPE_ORDER: Record<string, number> = {
  Asset: 0,
  Liability: 1,
  Equity: 2,
  Income: 3,
  Expense: 4,
};

export async function getCoAAccounts(businessId: string): Promise<CoAAccount[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("business_id", businessId);

  if (error || !data) return [];

  return (data as CoAAccount[]).sort((a, b) => {
    const typeA = TYPE_ORDER[a.account_type] ?? 99;
    const typeB = TYPE_ORDER[b.account_type] ?? 99;
    if (typeA !== typeB) return typeA - typeB;
    return a.account_number.localeCompare(b.account_number, undefined, { numeric: true });
  });
}

export async function upsertCoAAccount(
  businessId: string,
  data: UpsertCoAAccountData
): Promise<{ success: boolean; account?: CoAAccount; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const payload: Record<string, unknown> = {
      business_id: businessId,
      account_number: data.account_number.trim(),
      name: data.name.trim(),
      account_type: data.account_type,
      sub_type: data.sub_type?.trim() || null,
      description: data.description?.trim() || null,
      irs_form_line: data.irs_form_line?.trim() || null,
      parent_id: data.parent_id || null,
      is_active: data.is_active,
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("chart_of_accounts")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("business_id", businessId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, account: updated as CoAAccount };
    } else {
      const { data: inserted, error } = await supabase
        .from("chart_of_accounts")
        .insert({
          ...payload,
          is_postable: data.is_postable ?? true,
          sort_order: 9999,
        })
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, account: inserted as CoAAccount };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteCoAAccount(
  businessId: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Block deletion of system accounts
    const { data: acct } = await supabase
      .from("chart_of_accounts")
      .select("is_system")
      .eq("id", accountId)
      .eq("business_id", businessId)
      .single();
    if (acct?.is_system) {
      return { success: false, error: "System accounts cannot be deleted." };
    }

    // Block deletion if transactions reference this account
    const { data: txns } = await supabase
      .from("transactions")
      .select("id")
      .eq("coa_account_id", accountId)
      .eq("business_id", businessId)
      .limit(1);

    if (txns && txns.length > 0) {
      return {
        success: false,
        error:
          "This account has transactions and cannot be deleted. Deactivate it instead.",
      };
    }

    const { error } = await supabase
      .from("chart_of_accounts")
      .delete()
      .eq("id", accountId)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deactivateCoAAccount(
  businessId: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("chart_of_accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
