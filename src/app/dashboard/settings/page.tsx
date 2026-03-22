import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import SettingsClient from "./SettingsClient";
import { getCurrentBusinessId, getTeamMembers, getInvitations } from "@/lib/business/actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const businessId = await getCurrentBusinessId(supabase);
  if (!businessId) redirect("/dashboard");

  const [businessResult, members, invitations] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).single(),
    getTeamMembers(businessId),
    getInvitations(businessId),
  ]);

  if (!businessResult.data) redirect("/dashboard");

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <SettingsClient
          business={businessResult.data}
          members={members}
          invitations={invitations}
          currentUserId={user.id}
        />
      </div>
    </main>
  );
}
