"use server";

import { createClient } from "../../../../supabase/server";
import { getCurrentBusinessId } from "@/lib/business/actions";

export interface Contact {
  id: string;
  business_id: string;
  type: "customer" | "vendor" | "both";
  title: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  company_name: string | null;
  display_name: string;
  print_on_checks_name: string | null;
  email: string | null;
  cc_email: string | null;
  bcc_email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  other_phone: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactFormData {
  type: "customer" | "vendor" | "both";
  title?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  company_name?: string;
  display_name: string;
  print_on_checks_name?: string;
  email?: string;
  cc_email?: string;
  bcc_email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  other_phone?: string;
  website?: string;
  notes?: string;
}

export async function getContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const businessId = await getCurrentBusinessId(supabase);
  if (!businessId) return [];

  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  return (data as Contact[]) ?? [];
}

export async function createContact(
  data: ContactFormData
): Promise<{ success: boolean; contact?: Contact; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const { data: row, error } = await supabase
      .from("contacts")
      .insert({
        business_id: businessId,
        type: data.type,
        title: data.title || null,
        first_name: data.first_name || null,
        middle_name: data.middle_name || null,
        last_name: data.last_name || null,
        suffix: data.suffix || null,
        company_name: data.company_name || null,
        display_name: data.display_name,
        print_on_checks_name: data.print_on_checks_name || null,
        email: data.email || null,
        cc_email: data.cc_email || null,
        bcc_email: data.bcc_email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        fax: data.fax || null,
        other_phone: data.other_phone || null,
        website: data.website || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, contact: row as Contact };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateContact(
  id: string,
  data: Partial<ContactFormData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const businessId = await getCurrentBusinessId(supabase);
    if (!businessId) return { success: false, error: "No business found" };

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const optionalFields = [
      "title", "first_name", "middle_name", "last_name", "suffix",
      "company_name", "print_on_checks_name", "email", "cc_email",
      "bcc_email", "phone", "mobile", "fax", "other_phone", "website", "notes",
    ] as const;

    for (const f of optionalFields) {
      if (f in data) updates[f] = (data[f] as string) || null;
    }
    if ("display_name" in data) updates.display_name = data.display_name;
    if ("type" in data) updates.type = data.type;

    const { error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteContact(
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
      .from("contacts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function searchContacts(query: string): Promise<Contact[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const businessId = await getCurrentBusinessId(supabase);
  if (!businessId) return [];

  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .or(`display_name.ilike.%${query}%,company_name.ilike.%${query}%`)
    .order("display_name", { ascending: true })
    .limit(10);

  return (data as Contact[]) ?? [];
}
