"use server";

import { createClient } from "../../../../supabase/server";
import { getCurrentBusinessId } from "@/lib/business/actions";

export interface BankAccount {
  id: string;
  user_id: string;
  business_id: string | null;
  name: string;
  bank_name: string;
  account_type: "checking" | "savings" | "credit_card" | "cash" | "other";
  last_four: string | null;
  is_active: boolean;
  created_at: string;
  is_plaid_connected: boolean | null;
  plaid_institution_name: string | null;
  plaid_official_name: string | null;
  plaid_logo_url: string | null;
  plaid_last_synced_at: string | null;
  plaid_item_id: string | null;
  plaid_account_id: string | null;
  plaid_balance_current: number | null;
  plaid_balance_available: number | null;
  opening_balance: number;
  opening_balance_date: string | null;
}

export interface AccountSummary extends BankAccount {
  transaction_count: number;
  total_income: number;
  total_expenses: number;
  net: number;
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const businessId = await getCurrentBusinessId(supabase);
  if (!businessId) return [];

  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data as BankAccount[]) ?? [];
}

export async function createBankAccount(data: {
  name: string;
  bank_name: string;
  account_type: string;
  last_four?: string;
  opening_balance?: number;
  opening_balance_date?: string;
}): Promise<{ success: true; account: BankAccount } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const { data: account, error } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: user.id,
        business_id: businessId,
        name: data.name,
        bank_name: data.bank_name,
        account_type: data.account_type,
        last_four: data.last_four || null,
        opening_balance: data.opening_balance ?? 0,
        opening_balance_date: data.opening_balance_date ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, account: account as BankAccount };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function createOpeningBalanceTransaction(
  accountId: string,
  businessId: string,
  amount: number,
  date: string
): Promise<{ success: boolean; error?: string }> {
  if (amount === 0) return { success: true };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const absAmount = Math.abs(amount);
    const type = amount >= 0 ? "income" : "expense";

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      business_id: businessId,
      account_id: accountId,
      date,
      description: "Beginning Balance",
      payee_name: "Beginning Balance",
      payee_id: null,
      amount: absAmount,
      type,
      category: "Opening Balance",
      account_type: type === "income" ? "Income" : "Expense",
      is_opening_balance: true,
      raw_csv_row: null,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateBankAccount(
  id: string,
  data: Partial<{ name: string; bank_name: string; account_type: string; last_four: string | null }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const { error } = await supabase
      .from("bank_accounts")
      .update(data)
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteBankAccount(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const { error } = await supabase
      .from("bank_accounts")
      .update({ is_active: false })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function assignTransactionsToAccount(
  accountId: string,
  transactionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const { error } = await supabase
      .from("transactions")
      .update({ account_id: accountId })
      .in("id", transactionIds)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getAccountSummary(): Promise<AccountSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const businessId = await getCurrentBusinessId(supabase);
  if (!businessId) return [];

  const accounts = await getBankAccounts();
  if (accounts.length === 0) return [];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("account_id, type, amount, is_split, parent_id")
    .eq("business_id", businessId)
    .or("is_split.is.null,is_split.eq.false,parent_id.not.is.null");

  const summaryMap = new Map<string, { count: number; income: number; expenses: number }>();
  for (const acc of accounts) {
    summaryMap.set(acc.id, { count: 0, income: 0, expenses: 0 });
  }

  // Note: Beginning Balance transactions (is_opening_balance=true)
  // are intentionally included in the net calculation to seed
  // the correct starting balance for each account.
  for (const t of transactions ?? []) {
    if (!t.account_id || !summaryMap.has(t.account_id)) continue;
    const s = summaryMap.get(t.account_id)!;
    s.count++;
    if (t.type === "income") s.income += Number(t.amount);
    else s.expenses += Number(t.amount);
  }

  return accounts.map((acc) => {
    const s = summaryMap.get(acc.id) ?? { count: 0, income: 0, expenses: 0 };
    return {
      ...acc,
      transaction_count: s.count,
      total_income: s.income,
      total_expenses: s.expenses,
      net: s.income - s.expenses,
    };
  });
}
