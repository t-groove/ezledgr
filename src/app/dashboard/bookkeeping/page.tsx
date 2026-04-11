import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import BookkeepingClient from "./BookkeepingClient";
import { getTransactions } from "./actions";
import { getBankAccounts } from "../accounts/actions";

export default async function BookkeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; category?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const params = await searchParams;

  const [transactions, bankAccounts] = await Promise.all([
    getTransactions(),
    getBankAccounts(),
  ]);

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <header className="mb-6">
          <h1 className="font-sans text-3xl font-bold text-[#E8ECF4]">Transactions</h1>
          <p className="text-sm text-[#6B7A99] mt-1">
            Track and categorize your transactions
          </p>
        </header>
        <BookkeepingClient
          initialTransactions={transactions}
          initialBankAccounts={bankAccounts}
          initialAccountFilter={params.account}
          initialCategoryFilter={params.category}
        />
      </div>
    </main>
  );
}
