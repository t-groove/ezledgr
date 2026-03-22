import { redirect } from "next/navigation";
import { createClient } from "../../../../../supabase/server";
import { getCurrentBusinessId } from "@/lib/business/actions";
import BusinessProfileClient from "./BusinessProfileClient";

export default async function BusinessProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const businessId = await getCurrentBusinessId(supabase);
  if (!businessId) redirect("/dashboard");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();
  if (!business) redirect("/dashboard");

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <header className="mb-8">
          <h1 className="font-syne text-3xl font-bold text-[#E8ECF4]">Business Profile</h1>
          <p className="text-sm text-[#6B7A99] mt-1">{business.name}</p>
        </header>
        <BusinessProfileClient business={business} />
      </div>
    </main>
  );
}
