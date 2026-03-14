import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import DashboardNavbar from "@/components/dashboard-navbar";
import BookkeepingClient from "./BookkeepingClient";
import { getTransactions } from "./actions";
import { getBankAccounts } from "../accounts/actions";

export default async function BookkeepingPage({
  searchParams,
}: {
  searchParams: { account?: string; category?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [transactions, bankAccounts] = await Promise.all([
    getTransactions(),
    getBankAccounts(),
  ]);

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-[#0A0F1E] min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-6">
            <h1 className="font-syne text-3xl font-bold text-[#E8ECF4]">
              Bookkeeping
            </h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Cash basis accounting — track your income and expenses
            </p>
          </header>
          <BookkeepingClient
            initialTransactions={transactions}
            initialBankAccounts={bankAccounts}
            initialAccountFilter={searchParams.account}
            initialCategoryFilter={searchParams.category}
          />
        </div>
      </main>
    </>
  );
}
