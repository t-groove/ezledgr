import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";
  const businessId = searchParams.get("business_id");

  const supabase = await createClient();

  // Handle invite token — redirect to accept-invite so the user can set their password.
  // Do NOT consume the token here; the client-side accept-invite page will call verifyOtp.
  if (token_hash && type === "invite") {
    const params = new URLSearchParams({ token_hash, type: "invite" });
    if (businessId) params.set("business_id", businessId);
    return NextResponse.redirect(
      `${origin}/auth/accept-invite?${params.toString()}`
    );
  }

  // Handle other OTP types (e.g. email confirmation, magic link)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      // token_hash is only issued for email-based OTP types
      type: type as "email" | "recovery" | "email_change" | "signup",
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Handle OAuth / PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (businessId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from("business_members")
            .update({
              is_active: true,
              accepted_at: new Date().toISOString(),
            })
            .eq("business_id", businessId)
            .eq("user_id", user.id);

          await supabase
            .from("business_invitations")
            .update({ accepted_at: new Date().toISOString() })
            .eq("business_id", businessId)
            .eq("invited_email", user.email?.toLowerCase());
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
