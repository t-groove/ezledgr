import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import DashboardNavbar from "@/components/dashboard-navbar";
import DashboardClient from "./DashboardClient";
import { getAccountSummary } from "./accounts/actions";
import type { AccountSummary } from "./accounts/actions";

const TRANSFER_CATS = [
  "Owner Contributions",
  "Owner Draw",
  "Transfer",
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const today = new Date().toISOString().split("T")[0];

  const [ytdTransactions, accountSummaries, uncategorizedResult] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("amount, type, category, date")
        .eq("user_id", user.id)
        .gte("date", yearStart)
        .lte("date", today),

      getAccountSummary(),

      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("category", "Uncategorized"),
    ]);

  const plTransactions = (ytdTransactions.data ?? []).filter(
    (t) => !TRANSFER_CATS.includes(t.category)
  );

  const ytdIncome = plTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const ytdExpenses = plTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const ytdProfit = ytdIncome - ytdExpenses;
  const profitMargin = ytdIncome > 0 ? (ytdProfit / ytdIncome) * 100 : 0;

  const bankAccounts = accountSummaries as AccountSummary[];
  const uncategorizedCount = uncategorizedResult.count ?? 0;
  const userName = (user.email ?? "").split("@")[0];

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-[#0A0F1E] min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <DashboardClient
            ytdIncome={ytdIncome}
            ytdExpenses={ytdExpenses}
            ytdProfit={ytdProfit}
            profitMargin={profitMargin}
            bankAccounts={bankAccounts}
            uncategorizedCount={uncategorizedCount}
            userName={userName}
            currentYear={currentYear}
          />
        </div>
      </main>
    </>
  );
}
