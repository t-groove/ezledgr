"use server";

import { createClient } from "../../../../supabase/server";

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    email: user.email ?? "",
    name: data?.name ?? data?.full_name ?? user.user_metadata?.full_name ?? "",
    phone: data?.phone ?? "",
    job_title: data?.job_title ?? "",
    timezone: data?.timezone ?? "America/New_York",
    avatar_url: data?.avatar_url ?? data?.image ?? null,
  };
}

export async function updateProfile(profileData: {
  name: string;
  phone?: string;
  job_title?: string;
  timezone?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  await supabase.auth.updateUser({
    data: { full_name: profileData.name },
  });

  const { error } = await supabase.from("users").upsert(
    {
      user_id: user.id,
      token_identifier: user.id,
      email: user.email,
      name: profileData.name,
      full_name: profileData.name,
      phone: profileData.phone ?? "",
      job_title: profileData.job_title ?? "",
      timezone: profileData.timezone ?? "America/New_York",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function uploadAvatar(base64: string, contentType: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const fileExt = contentType.split("/")[1] ?? "jpg";
  // Path must be {userId}/... so that the RLS policy
  // auth.uid()::text = (storage.foldername(name))[1] matches correctly.
  // Timestamp suffix busts browser/CDN cache on re-upload.
  const filePath = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, Buffer.from(base64, "base64"), {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  await supabase.from("users").upsert(
    {
      user_id: user.id,
      token_identifier: user.id,
      email: user.email,
      avatar_url: publicUrl,
      image: publicUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return { success: true, url: publicUrl };
}
