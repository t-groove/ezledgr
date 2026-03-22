import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import DashboardNavbar from "@/components/dashboard-navbar";
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

  const businessId = await getCurrentBusinessId(supabase);

  // Fetch pending invitations for this user (inactive memberships)
  const { data: pendingRows } = await supabase
    .from("business_members")
    .select("id, business_id, role, businesses(id, name)")
    .eq("user_id", user.id)
    .eq("is_active", false);

  const pendingInvitations = (pendingRows ?? []).map((m) => {
    const biz = m.businesses as unknown as { name: string } | null;
    return {
      id: m.id as string,
      business_id: m.business_id as string,
      business_name: biz?.name ?? "Unknown Business",
      role: m.role as string,
    };
  });

  // No business yet — render onboarding via DashboardClient
  if (!businessId) {
    const userName = (user.email ?? "").split("@")[0];
    return (
      <>
        <DashboardNavbar />
        <main className="w-full bg-[#0A0F1E] min-h-screen">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
            <DashboardClient
              ytdIncome={0}
              ytdExpenses={0}
              ytdProfit={0}
              profitMargin={0}
              bankAccounts={[]}
              uncategorizedCount={0}
              userName={userName}
              currentYear={new Date().getFullYear()}
              hasBusiness={false}
              pendingInvitations={pendingInvitations}
            />
          </div>
        </main>
      </>
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
  const profitMargin = ytdIncome > 0 ? (ytdProfit / ytdIncome) * 100 : 0;

  const bankAccounts = accountSummaries as AccountSummary[];
  const uncategorizedCount = uncategorizedResult.count ?? 0;
  const userName = (user.email ?? "").split("@")[0];

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-[#0A0F1E] min-h-screen">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
          <DashboardClient
            ytdIncome={ytdIncome}
            ytdExpenses={ytdExpenses}
            ytdProfit={ytdProfit}
            profitMargin={profitMargin}
            bankAccounts={bankAccounts}
            uncategorizedCount={uncategorizedCount}
            userName={userName}
            currentYear={currentYear}
            hasBusiness={true}
            pendingInvitations={pendingInvitations}
          />
        </div>
      </main>
    </>
  );
}
