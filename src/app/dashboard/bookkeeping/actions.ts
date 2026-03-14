"use server";

import { createClient } from "../../../../supabase/server";
import type { ParsedTransaction } from "@/lib/bookkeeping/parse-csv";

export async function uploadTransactions(
  transactions: ParsedTransaction[],
  accountId: string
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const rows = transactions.map((t) => ({
      user_id: user.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: "Uncategorized",
      account_id: accountId,
      raw_csv_row: t.raw_csv_row,
    }));

    const { error } = await supabase.from("transactions").insert(rows);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: rows.length };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  accountId?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  account_id: string | null;
  account_name: string | null;
  raw_csv_row: string | null;
  created_at: string;
}

export async function getTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (filters?.startDate) {
    query = query.gte("date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("date", filters.endDate);
  }
  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }
  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters?.accountId && filters.accountId !== "all") {
    query = query.eq("account_id", filters.accountId);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data as Transaction[]) ?? [];
}

export async function updateTransactionCategory(
  id: string,
  category: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("transactions")
      .update({ category })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteTransaction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
