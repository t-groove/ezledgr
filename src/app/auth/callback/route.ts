import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect_to = requestUrl.searchParams.get("redirect_to");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const businessId = requestUrl.searchParams.get("business_id");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && businessId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Activate the pending membership created during invite
        await supabase
          .from("business_members")
          .update({
            is_active: true,
            accepted_at: new Date().toISOString(),
          })
          .eq("business_id", businessId)
          .eq("user_id", user.id);

        // Mark invitation as accepted
        await supabase
          .from("business_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("business_id", businessId)
          .eq("invited_email", user.email);
      }
    }
  }

  // URL to redirect to after sign in process completes
  const redirectTo = redirect_to || next;
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
