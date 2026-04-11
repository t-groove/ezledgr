import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import { getUserBusinesses } from "@/lib/business/actions";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const businesses = await getUserBusinesses();
  if (businesses.length > 0) redirect("/dashboard");

  return <OnboardingClient />;
}
