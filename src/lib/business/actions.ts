"use server";

import { createClient } from "../../../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  name: string;
  entity_type: string;
  owner_id: string;
  industry: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: "owner" | "accountant" | "bookkeeper" | "readonly";
  invited_email: string | null;
  accepted_at: string | null;
  is_active: boolean;
  created_at: string;
  business: Business;
}

export interface TeamMember {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  invited_email: string | null;
  accepted_at: string | null;
  is_active: boolean;
  created_at: string;
  email: string | null;
  full_name: string | null;
}

export interface BusinessInvitation {
  id: string;
  business_id: string;
  invited_email: string;
  role: string;
  invited_by: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

// ── getCurrentBusinessId ───────────────────────────────────────────────────────
// Reads from cookie first (set when switching businesses), then falls back
// to the user's first active business membership.

export async function getCurrentBusinessId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Try cookie first
  const cookieStore = await cookies();
  const cookieBusinessId = cookieStore.get("centerbase_business_id")?.value;

  if (cookieBusinessId) {
    // Verify user is still an active member of this business
    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", user.id)
      .eq("business_id", cookieBusinessId)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) return cookieBusinessId;
  }

  // Fall back to first active business
  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return membership?.business_id ?? null;
}

// Sets the active business via a cookie (readable server-side)
export async function setActiveBusiness(businessId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("centerbase_business_id", businessId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

// ── getUserBusinesses ──────────────────────────────────────────────────────────

export async function getUserBusinesses(): Promise<BusinessMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("business_members")
    .select("*, business:businesses(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as BusinessMember[];
}

// ── getUserRole ────────────────────────────────────────────────────────────────

export async function getUserRole(businessId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return data?.role ?? null;
}

// ── createBusiness ─────────────────────────────────────────────────────────────

export async function createBusiness(data: {
  name: string;
  entity_type?: string;
}): Promise<{ success: true; business: Business } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Step 1: Create the business record.
    // The "owner full access" RLS policy allows this because owner_id = auth.uid().
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({
        name: data.name,
        owner_id: user.id,
        entity_type: data.entity_type ?? "LLC",
      })
      .select()
      .single();

    if (bizError || !business) {
      return { success: false, error: bizError?.message ?? "Failed to create business" };
    }

    // Step 2: Add creator as owner member.
    // Done separately so the business row exists before the membership
    // check runs, avoiding any RLS timing issues.
    const { error: memberError } = await supabase.from("business_members").insert({
      business_id: business.id,
      user_id: user.id,
      role: "owner",
      accepted_at: new Date().toISOString(),
    });

    if (memberError) return { success: false, error: memberError.message };

    return { success: true, business: business as Business };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── updateBusiness ─────────────────────────────────────────────────────────────

export async function updateBusiness(
  businessId: string,
  data: Partial<Omit<Business, "id" | "owner_id" | "created_at" | "updated_at">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("businesses")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", businessId)
      .eq("owner_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── inviteTeamMember ───────────────────────────────────────────────────────────

export async function inviteTeamMember(
  businessId: string,
  email: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Verify caller is an owner
    const { data: membership } = await supabase
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership || membership.role !== "owner") {
      return { success: false, error: "Only owners can invite members" };
    }

    // Check if email already has a pending unexpired invitation
    const { data: existing } = await supabase
      .from("business_invitations")
      .select("id")
      .eq("business_id", businessId)
      .eq("invited_email", email.toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return { success: false, error: "An active invitation already exists for this email" };
    }

    // Get business name for the invite email
    const { data: business } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .single();

    // Use admin client to send the invite email via Supabase Auth built-in sender.
    // NOTE: Ensure custom SMTP is disabled in Supabase Dashboard → Project Settings →
    // Auth → SMTP Settings, so Supabase uses its own built-in email sender.
    console.log('Admin client creating, has service key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    const adminClient = createAdminClient();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ezledgr.com";

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/dashboard&business_id=${businessId}`,
        data: {
          business_id: businessId,
          business_name: business?.name ?? "ezledgr",
          role,
          invited_by: user.id,
        },
      });

    if (inviteError) {
      console.error('inviteUserByEmail error:', inviteError)
      return { success: false, error: inviteError.message };
    }

    // Save invitation record
    await supabase.from("business_invitations").insert({
      business_id: businessId,
      invited_email: email.toLowerCase(),
      role,
      invited_by: user.id,
    });

    // Pre-create a pending member row (activated on callback after accept)
    await supabase
      .from("business_members")
      .insert({
        business_id: businessId,
        user_id: inviteData.user.id,
        role,
        invited_email: email.toLowerCase(),
        is_active: false,
      })
      .select();

    return { success: true };
  } catch (err) {
    console.error('inviteTeamMember unexpected error:', err)
    return { success: false, error: String(err) };
  }
}

// ── removeTeamMember ───────────────────────────────────────────────────────────

export async function removeTeamMember(
  businessId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Fetch all active members to check the last-owner constraint
    const { data: allMembers } = await supabase
      .from("business_members")
      .select("user_id, role")
      .eq("business_id", businessId)
      .eq("is_active", true);

    const memberToRemove = allMembers?.find((m) => m.user_id === userId);
    const ownerCount = allMembers?.filter((m) => m.role === "owner").length ?? 0;

    if (memberToRemove?.role === "owner" && ownerCount <= 1) {
      return {
        success: false,
        error: "Cannot remove the last owner of a business.",
      };
    }

    const { error } = await supabase
      .from("business_members")
      .update({ is_active: false })
      .eq("business_id", businessId)
      .eq("user_id", userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── updateMemberRole ───────────────────────────────────────────────────────────

export async function updateMemberRole(
  businessId: string,
  userId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Verify caller is owner
    const { data: callerMembership } = await supabase
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (callerMembership?.role !== "owner") {
      return { success: false, error: "Only owners can change roles" };
    }

    // Guard: can't downgrade last owner
    if (role !== "owner") {
      const { data: allMembers } = await supabase
        .from("business_members")
        .select("user_id, role")
        .eq("business_id", businessId)
        .eq("is_active", true);

      const owners = allMembers?.filter((m) => m.role === "owner") ?? [];
      const thisMember = allMembers?.find((m) => m.user_id === userId);

      if (thisMember?.role === "owner" && owners.length <= 1) {
        return { success: false, error: "Cannot change role — at least one owner required." };
      }
    }

    const { error } = await supabase
      .from("business_members")
      .update({ role })
      .eq("business_id", businessId)
      .eq("user_id", userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── getTeamMembers ─────────────────────────────────────────────────────────────

export async function getTeamMembers(businessId: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: members, error } = await supabase
    .from("business_members")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !members) return [];

  // Enrich with emails from the public users table
  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("user_id, email, full_name")
    .in("user_id", userIds);

  const userMap = new Map(
    (users ?? []).map((u: { user_id: string; email: string; full_name: string | null }) => [
      u.user_id,
      u,
    ])
  );

  return members.map((m) => ({
    ...m,
    email: userMap.get(m.user_id)?.email ?? m.invited_email ?? null,
    full_name: userMap.get(m.user_id)?.full_name ?? null,
  })) as TeamMember[];
}

// ── getInvitations ─────────────────────────────────────────────────────────────

export async function getInvitations(businessId: string): Promise<BusinessInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("business_invitations")
    .select("*")
    .eq("business_id", businessId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as BusinessInvitation[];
}

// ── cancelInvitation ───────────────────────────────────────────────────────────

export async function cancelInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("business_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── acceptInvitation ───────────────────────────────────────────────────────────

export async function acceptInvitation(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: invitation, error: invError } = await supabase
      .from("business_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    if (invError || !invitation) {
      return { success: false, error: "Invitation not found or already used" };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: "Invitation has expired" };
    }

    // Add member (upsert in case they already exist)
    const { error: memberError } = await supabase.from("business_members").upsert({
      business_id: invitation.business_id,
      user_id: user.id,
      role: invitation.role,
      invited_email: invitation.invited_email,
      accepted_at: new Date().toISOString(),
      is_active: true,
    });

    if (memberError) return { success: false, error: memberError.message };

    await supabase
      .from("business_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── deleteBusiness ─────────────────────────────────────────────────────────────

export async function deleteBusiness(
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("businesses")
      .delete()
      .eq("id", businessId)
      .eq("owner_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
