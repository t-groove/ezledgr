import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import DashboardClient from "./DashboardClient";
import { getAccountSummary } from "./accounts/actions";
import { getCurrentBusinessId } from "@/lib/business/actions";
import type { AccountSummary } from "./accounts/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // ── Diagnostic: log membership state for debugging invite issues ──────────
  const { data: memberships } = await supabase
    .from("business_members")
    .select("*")
    .eq("user_id", user.id);
  console.log("Current user:", user.id, user.email);
  console.log("All memberships:", JSON.stringify(memberships));
  // ─────────────────────────────────────────────────────────────────────────

  const businessId = await getCurrentBusinessId(supabase);

  // No active business — check whether user has any membership at all before
  // showing onboarding (invited users may have a pending row not yet active)
  if (!businessId) {
    const { data: anyMembership } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const showOnboarding = !anyMembership;
    const userName = (user.email ?? "").split("@")[0];
    return (
      <main className="w-full min-h-screen">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
          <DashboardClient
            ytdIncome={0}
            ytdExpenses={0}
            ytdProfit={0}
            bankAccounts={[]}
            uncategorizedCount={0}
            userName={userName}
            currentYear={new Date().getFullYear()}
            hasBusiness={false}
            showOnboarding={showOnboarding}
          />
        </div>
      </main>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const today = new Date().toISOString().split("T")[0];

  const [ytdTransactions, accountSummaries, uncategorizedResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type, account_type")
      .eq("business_id", businessId)
      .gte("date", yearStart)
      .lte("date", today),

    getAccountSummary(),

    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("category", "Uncategorized"),
  ]);

  // Only P&L transactions (Income and Expense GL accounts)
  const plTransactions = (ytdTransactions.data ?? []).filter(
    (t) => t.account_type === "Income" || t.account_type === "Expense"
  );

  const ytdIncome = plTransactions
    .filter((t) => t.account_type === "Income")
    .reduce((sum, t) => sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);

  const ytdExpenses = plTransactions
    .filter((t) => t.account_type === "Expense")
    .reduce((sum, t) => sum + (t.type === "expense" ? Number(t.amount) : -Number(t.amount)), 0);

  const ytdProfit = ytdIncome - ytdExpenses;

  const bankAccounts = accountSummaries as AccountSummary[];
  const uncategorizedCount = uncategorizedResult.count ?? 0;
  const userName = (user.email ?? "").split("@")[0];

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <DashboardClient
          ytdIncome={ytdIncome}
          ytdExpenses={ytdExpenses}
          ytdProfit={ytdProfit}
          openInvoices={0}
          bankAccounts={bankAccounts}
          uncategorizedCount={uncategorizedCount}
          userName={userName}
          currentYear={currentYear}
          hasBusiness={true}
        />
      </div>
    </main>
  );
}
