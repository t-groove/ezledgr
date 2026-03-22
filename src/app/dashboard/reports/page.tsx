import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import ReportsClient from "./ReportsClient";
import { getReportData, getBalanceSheetData } from "./actions";
import { getBankAccounts } from "../accounts/actions";
import { getCurrentBusinessId } from "@/lib/business/actions";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const businessId = await getCurrentBusinessId(supabase);

  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();

  const [data, bankAccounts, balanceData, businessResult] = await Promise.all([
    getReportData(currentYear),
    getBankAccounts(),
    getBalanceSheetData(today),
    businessId
      ? supabase.from("businesses").select("name").eq("id", businessId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const businessName = businessResult.data?.name ?? "Your Business";

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <ReportsClient
          initialData={data}
          initialYear={currentYear}
          initialAccounts={bankAccounts}
          initialBalanceData={balanceData}
          businessName={businessName}
        />
      </div>
    </main>
  );
}
