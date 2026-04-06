import { BusinessProvider } from "@/lib/business/context";
import DashboardSidebar from "@/components/dashboard-sidebar";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <BusinessProvider>
      {/* Sidebar is fixed; main area is offset by the sidebar width */}
      <DashboardSidebar />
      <div className="ml-[240px] min-h-screen bg-[#e8eef6]">
        {children}
      </div>
    </BusinessProvider>
  );
}
