import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import AccountsClient from "./AccountsClient";
import { getAccountSummary } from "./actions";
import { getCurrentBusinessId } from "@/lib/business/actions";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [accounts, businessId] = await Promise.all([
    getAccountSummary(),
    getCurrentBusinessId(supabase),
  ]);

  return (
    <main className="w-full min-h-screen">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccountsClient initialAccounts={accounts} businessId={businessId ?? ""} />
      </div>
    </main>
  );
}
