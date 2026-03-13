import DashboardNavbar from "@/components/dashboard-navbar";
import { signOutAction } from "@/app/actions";
import { InfoIcon, UserCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import { Button } from "@/components/ui/button";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <>
      <DashboardNavbar />
      <main className="w-full bg-background min-h-screen">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <h1 className="font-syne text-3xl font-bold text-foreground">Dashboard</h1>
            <div className="bg-secondary/50 text-sm p-3 px-4 rounded-lg text-muted-foreground flex gap-2 items-center border border-border">
              <InfoIcon size={14} />
              <span>This is a protected page — only visible to authenticated users.</span>
            </div>
          </header>

          {/* User Profile Section */}
          <section className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <UserCircle size={48} className="text-primary" />
                <div>
                  <h2 className="font-syne font-semibold text-xl text-foreground">Signed in as</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" className="border-border text-foreground hover:bg-secondary">
                  Sign out
                </Button>
              </form>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 overflow-hidden border border-border">
              <pre className="text-xs font-mono max-h-48 overflow-auto text-muted-foreground">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
