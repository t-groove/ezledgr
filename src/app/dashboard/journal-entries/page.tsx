import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import JournalEntriesClient from "./JournalEntriesClient";
import { getJournalEntries } from "./actions";

export default async function JournalEntriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const entries = await getJournalEntries();

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <JournalEntriesClient initialEntries={entries} />
      </div>
    </main>
  );
}
