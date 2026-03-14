"use server";

import { createClient } from "../../../../supabase/server";

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  account_type: "checking" | "savings" | "credit_card" | "other";
  last_four: string | null;
  is_active: boolean;
  created_at: string;
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

  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("user_id", user.id)
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
}): Promise<{ success: true; account: BankAccount } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: account, error } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: user.id,
        name: data.name,
        bank_name: data.bank_name,
        account_type: data.account_type,
        last_four: data.last_four || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, account: account as BankAccount };
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

    const { error } = await supabase
      .from("bank_accounts")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id);

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

    const { error } = await supabase
      .from("bank_accounts")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id);

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

    const { error } = await supabase
      .from("transactions")
      .update({ account_id: accountId })
      .in("id", transactionIds)
      .eq("user_id", user.id);

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

  const accounts = await getBankAccounts();
  if (accounts.length === 0) return [];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("account_id, type, amount")
    .eq("user_id", user.id);

  const summaryMap = new Map<string, { count: number; income: number; expenses: number }>();
  for (const acc of accounts) {
    summaryMap.set(acc.id, { count: 0, income: 0, expenses: 0 });
  }

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
