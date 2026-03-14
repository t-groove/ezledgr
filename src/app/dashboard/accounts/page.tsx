import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import DashboardNavbar from "@/components/dashboard-navbar";
import AccountsClient from "./AccountsClient";
import { getAccountSummary } from "./actions";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const accounts = await getAccountSummary();

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-[#0A0F1E] min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <AccountsClient initialAccounts={accounts} />
        </div>
      </main>
    </>
  );
}
