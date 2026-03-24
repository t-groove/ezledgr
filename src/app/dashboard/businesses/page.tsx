import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "../../../../supabase/server";
import { getUserBusinesses } from "@/lib/business/actions";
import BusinessesClient from "./BusinessesClient";

export default async function BusinessesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [businesses, cookieStore] = await Promise.all([
    getUserBusinesses(),
    cookies(),
  ]);

  const activeBusinessId = cookieStore.get("active_business_id")?.value ?? null;

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <BusinessesClient
          initialBusinesses={businesses}
          activeBusinessId={activeBusinessId}
        />
      </div>
    </main>
  );
}
