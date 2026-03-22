"use server";

import { createClient } from "../../../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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

    const adminClient = createAdminClient();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ezledgr.com";
    const businessName = business?.name ?? "ezledgr";
    const resend = new Resend(process.env.RESEND_API_KEY);

    // ── Check if user already exists ─────────────────────────────────────────
    const { data: existingUserRow } = await adminClient
      .from("users")
      .select("user_id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingUserRow) {
      const existingUserId = existingUserRow.user_id as string;
      const acceptUrl = `${siteUrl}/auth/accept-invite/existing?business_id=${businessId}&user_id=${existingUserId}`;

      // Pre-create an inactive member row for the existing user
      await supabase
        .from("business_members")
        .upsert(
          {
            business_id: businessId,
            user_id: existingUserId,
            role,
            invited_email: email.toLowerCase(),
            is_active: false,
          },
          { onConflict: "business_id,user_id", ignoreDuplicates: true }
        );

      // Save invitation record
      await supabase.from("business_invitations").insert({
        business_id: businessId,
        invited_email: email.toLowerCase(),
        role,
        invited_by: user.id,
      });

      // Send "existing user" invite email
      const { error: emailError } = await resend.emails.send({
        from: "ezledgr <noreply@mail.ezledgr.com>",
        to: email,
        subject: `You've been invited to join ${businessName} on ezledgr`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to join ${businessName} on ezledgr</title>
</head>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F1E;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111827;border-radius:12px;border:1px solid #1E2A45;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1E2A45;">
              <span style="font-size:22px;font-weight:700;color:#E8ECF4;letter-spacing:-0.5px;">ezledgr</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#E8ECF4;">You've been invited!</h1>
              <p style="margin:0 0 16px;font-size:15px;color:#6B7A99;line-height:1.6;">
                You already have an ezledgr account. Click below to accept your invitation to join
                <strong style="color:#E8ECF4;">${businessName}</strong> as a
                <strong style="color:#E8ECF4;">${role}</strong>.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#6B7A99;line-height:1.6;">
                Sign in to your existing account and you'll be added automatically.
              </p>
              <a href="${acceptUrl}" style="display:inline-block;background:#4F7FFF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
                Accept Invitation →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1E2A45;">
              <p style="margin:0;font-size:12px;color:#3D4E6B;line-height:1.6;">
                This invitation was sent by ezledgr. If you weren't expecting this, you can safely ignore it.<br />
                &copy; ${new Date().getFullYear()} ezledgr. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      });

      if (emailError) {
        console.error("Resend email error (existing user):", emailError);
        return { success: false, error: "Failed to send invitation email" };
      }

      return { success: true };
    }

    // ── New user flow ─────────────────────────────────────────────────────────

    // Generate the invite link via Supabase Admin (creates the user + token)
    const encodedName = encodeURIComponent(business?.name ?? '');
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: `${siteUrl}/auth/accept-invite?business_id=${businessId}&business_name=${encodedName}&role=${encodeURIComponent(role)}`,
          data: {
            business_id: businessId,
            business_name: businessName,
            role,
            invited_by: user.id,
          },
        },
      });

    if (linkError) {
      console.error('generateLink error:', linkError);
      return { success: false, error: linkError.message };
    }

    const inviteUrl = linkData?.properties?.action_link;
    if (!inviteUrl) {
      return { success: false, error: 'Failed to generate invite link' };
    }

    // Send branded invite email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'ezledgr <noreply@mail.ezledgr.com>',
      to: email,
      subject: `You've been invited to ${businessName} on ezledgr`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to ${businessName} on ezledgr</title>
</head>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F1E;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111827;border-radius:12px;border:1px solid #1E2A45;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1E2A45;">
              <span style="font-size:22px;font-weight:700;color:#E8ECF4;letter-spacing:-0.5px;">ezledgr</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#E8ECF4;">You've been invited!</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6B7A99;line-height:1.6;">
                You've been invited to join <strong style="color:#E8ECF4;">${businessName}</strong> on ezledgr as a <strong style="color:#E8ECF4;">${role}</strong>.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#6B7A99;line-height:1.6;">
                Click the button below to set up your password and get started.
              </p>
              <a href="${inviteUrl}" style="display:inline-block;background:#4F7FFF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
                Accept Invitation &amp; Set Up Account →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1E2A45;">
              <p style="margin:0;font-size:12px;color:#3D4E6B;line-height:1.6;">
                This invitation was sent by ezledgr. If you weren't expecting this, you can safely ignore it.<br />
                &copy; ${new Date().getFullYear()} ezledgr. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

    if (emailError) {
      console.error('Resend email error:', emailError);
      return { success: false, error: 'Failed to send invitation email' };
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
        user_id: linkData.user.id,
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
