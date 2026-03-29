"use server";

import { createClient } from "../../../../supabase/server";
import { getCurrentBusinessId } from "@/lib/business/actions";
import type { ParsedTransaction } from "@/lib/bookkeeping/parse-csv";
import { getAccountType } from "@/lib/bookkeeping/categories";

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

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) {
      return { success: false, error: "No business found. Please set up your business first." };
    }

    const rows = transactions.map((t) => ({
      user_id: user.id,
      business_id: businessId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category ?? "Uncategorized",
      account_id: accountId,
      raw_csv_row: t.raw_csv_row,
      account_type: getAccountType(t.category ?? "Uncategorized"),
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
  business_id: string | null;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  account_type: string;
  account_id: string | null;
  account_name: string | null;
  raw_csv_row: string | null;
  created_at: string;
  // Payee
  payee_id: string | null;
  payee_name: string;
  // Split tracking
  is_split?: boolean;
  parent_id?: string | null;
  split_index?: number | null;
  children?: Transaction[];
}

export async function getTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const businessId = await getCurrentBusinessId(supabase);
  if (!businessId) return [];

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .is("parent_id", null) // top-level only; children are fetched separately
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

  let transactions = (data as Transaction[]) ?? [];

  // Hydrate split parents with their child transactions
  const splitParentIds = transactions.filter((t) => t.is_split).map((t) => t.id);
  if (splitParentIds.length > 0) {
    const { data: children } = await supabase
      .from("transactions")
      .select("*")
      .in("parent_id", splitParentIds)
      .order("split_index", { ascending: true });

    const childrenByParent = new Map<string, Transaction[]>();
    for (const child of (children as Transaction[]) ?? []) {
      const parentId = child.parent_id!;
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId)!.push(child);
    }
    transactions = transactions.map((t) => ({
      ...t,
      children: childrenByParent.get(t.id) ?? [],
    }));
  }

  return transactions;
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

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const newAccountType = getAccountType(category);
    const { error } = await supabase
      .from("transactions")
      .update({ category, account_type: newAccountType })
      .eq("id", id)
      .eq("business_id", businessId);

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

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function createTransaction(data: {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  account_id?: string;
  payee_id?: string | null;
  payee_name?: string;
}): Promise<{ success: true; transaction: Transaction } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const { data: row, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        business_id: businessId,
        date: data.date,
        description: data.description,
        amount: data.amount,
        type: data.type,
        category: data.category,
        account_id: data.account_id ?? null,
        raw_csv_row: null,
        account_type: getAccountType(data.category),
        payee_id: data.payee_id ?? null,
        payee_name: data.payee_name || "Unknown",
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, transaction: row as Transaction };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateTransactionDescription(
  id: string,
  description: string
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
      .update({ description })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    description: string;
    amount: number;
    date: string;
    type: "income" | "expense";
    payee_id: string | null;
    payee_name: string;
  }>
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
      .update(data)
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function splitTransaction(
  parentId: string,
  splits: Array<{
    description: string;
    amount: number;
    category: string;
    account_type: string;
    type: "income" | "expense";
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    // Fetch the parent transaction
    const { data: parent, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", parentId)
      .eq("business_id", businessId)
      .single();
    if (fetchError || !parent) return { success: false, error: "Transaction not found" };

    // Parent must be a top-level transaction
    if (parent.parent_id) return { success: false, error: "Cannot split a child transaction" };

    // Verify amounts balance within $0.01
    const total = splits.reduce((s, sp) => s + sp.amount, 0);
    if (Math.abs(total - Number(parent.amount)) > 0.01) {
      return {
        success: false,
        error: `Split amounts ($${total.toFixed(2)}) must equal transaction amount ($${Number(parent.amount).toFixed(2)})`,
      };
    }

    // If already split, delete existing children first
    if (parent.is_split) {
      const { error: delError } = await supabase
        .from("transactions")
        .delete()
        .eq("parent_id", parentId);
      if (delError) return { success: false, error: delError.message };
    }

    // Mark parent as split
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ is_split: true })
      .eq("id", parentId);
    if (updateError) return { success: false, error: updateError.message };

    // Insert child rows
    const childRows = splits.map((sp, idx) => ({
      user_id: user.id,
      business_id: businessId,
      date: parent.date,
      description: sp.description,
      amount: sp.amount,
      type: sp.type,
      category: sp.category,
      account_type: sp.account_type,
      account_id: parent.account_id,
      raw_csv_row: null,
      parent_id: parentId,
      split_index: idx,
      is_split: false,
    }));
    const { error: insertError } = await supabase.from("transactions").insert(childRows);
    if (insertError) return { success: false, error: insertError.message };

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function bulkUpdatePayee(
  transactionIds: string[],
  payeeId: string | null,
  payeeName: string
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
      .update({ payee_id: payeeId, payee_name: payeeName })
      .in("id", transactionIds)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function unsplitTransaction(
  parentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    // Verify ownership via business_id
    const { data: parent, error: fetchError } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", parentId)
      .eq("business_id", businessId)
      .single();
    if (fetchError || !parent) return { success: false, error: "Transaction not found" };

    // Delete all children
    const { error: delError } = await supabase
      .from("transactions")
      .delete()
      .eq("parent_id", parentId);
    if (delError) return { success: false, error: delError.message };

    // Clear split flag
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ is_split: false })
      .eq("id", parentId);
    if (updateError) return { success: false, error: updateError.message };

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
