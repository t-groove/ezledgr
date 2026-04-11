import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { getCurrentBusinessId } from "@/lib/business/actions";
import { getCoAAccounts } from "./actions";
import CoAClient from "./CoAClient";

export default async function ChartOfAccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const businessId = await getCurrentBusinessId(supabase);
  if (!businessId) redirect("/dashboard");

  const [accounts, bizResult] = await Promise.all([
    getCoAAccounts(businessId),
    supabase.from("businesses").select("name").eq("id", businessId).maybeSingle(),
  ]);

  const businessName = bizResult.data?.name ?? "Your Business";

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <CoAClient
          initialAccounts={accounts}
          businessId={businessId}
          businessName={businessName}
        />
      </div>
    </main>
  );
}
