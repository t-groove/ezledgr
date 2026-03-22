import { Briefcase } from "lucide-react";

export default function BusinessesPage() {
  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">

        <header className="mb-8">
          <h1 className="font-syne text-3xl font-bold text-[#E8ECF4]">Businesses</h1>
          <p className="text-sm text-[#6B7A99] mt-1">
            Manage and switch between your business accounts
          </p>
        </header>

        <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-12 flex flex-col items-center text-center max-w-lg">
          <div className="w-14 h-14 rounded-full bg-[#4F7FFF]/10 flex items-center justify-center mb-5">
            <Briefcase size={26} className="text-[#4F7FFF]" />
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
            bg-[#4F7FFF]/10 text-[#4F7FFF] border border-[#4F7FFF]/20 mb-4">
            Coming Soon
          </span>

          <h2 className="font-syne text-xl font-bold text-[#E8ECF4] mb-2">
            Multi-Business Management
          </h2>
          <p className="text-sm text-[#6B7A99] leading-relaxed">
            You&apos;ll soon be able to manage multiple business accounts from one place —
            switch contexts, compare performance, and keep your books organized across
            all your ventures.
          </p>
        </div>

      </div>
    </main>
  );
}
