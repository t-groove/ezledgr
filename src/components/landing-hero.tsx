import Link from "next/link";

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow effect behind card */}
      <div className="absolute inset-0 bg-[#4F7FFF]/10 blur-3xl rounded-full scale-110" />

      <div className="relative bg-[#111827] border border-[#1E2A45] rounded-lg shadow-2xl shadow-black/40 overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1E2A45]">
          <span className="text-[#E8ECF4] text-sm font-semibold font-syne">
            Dashboard
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
            <span className="text-[#6B7A99] text-xs">Live</span>
          </div>
        </div>

        {/* Mini chart area */}
        <div className="px-5 py-4">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[#6B7A99] text-xs mb-0.5">Monthly Revenue</p>
              <p className="text-[#E8ECF4] text-xl font-bold font-syne">
                $12,847
              </p>
            </div>
            <span className="text-[#22C55E] text-xs font-medium bg-[#22C55E]/10 px-2 py-0.5 rounded">
              +23.5%
            </span>
          </div>
          {/* Fake bar chart */}
          <div className="flex items-end gap-1.5 h-16">
            {[40, 55, 35, 70, 50, 85, 65, 90, 75, 95, 80, 100].map(
              (h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: `${h}%`,
                    backgroundColor:
                      i === 11 ? "#4F7FFF" : i >= 9 ? "#4F7FFF80" : "#1E2A45",
                  }}
                />
              )
            )}
          </div>
        </div>

        {/* Invoice row */}
        <div className="px-5 py-3 border-t border-[#1E2A45]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#4F7FFF]/15 flex items-center justify-center">
                <span className="text-[#4F7FFF] text-xs font-bold">INV</span>
              </div>
              <div>
                <p className="text-[#E8ECF4] text-sm font-medium">
                  Invoice #1042
                </p>
                <p className="text-[#6B7A99] text-xs">Acme Corp</p>
              </div>
            </div>
            <span className="text-[#22C55E] text-sm font-semibold">
              $2,400
            </span>
          </div>
        </div>

        {/* Bank transaction row */}
        <div className="px-5 py-3 border-t border-[#1E2A45]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#6B7A99]/15 flex items-center justify-center">
                <span className="text-[#6B7A99] text-xs font-bold">BNK</span>
              </div>
              <div>
                <p className="text-[#E8ECF4] text-sm font-medium">
                  Chase ••4829
                </p>
                <p className="text-[#6B7A99] text-xs">Office Supplies</p>
              </div>
            </div>
            <span className="text-[#E8ECF4] text-sm font-semibold">
              -$189
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialProofAvatars() {
  const colors = ["#4F7FFF", "#22C55E", "#F59E0B", "#EF4444", "#A855F7"];
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {colors.map((color, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border-2 border-[#0A0F1E] flex items-center justify-center text-white text-xs font-semibold"
            style={{ backgroundColor: color }}
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>
      <p className="text-[#6B7A99] text-sm">
        Trusted by{" "}
        <span className="text-[#E8ECF4] font-medium">2,400+</span> small
        business owners
      </p>
    </div>
  );
}

export default function LandingHero() {
  return (
    <section className="relative min-h-screen pt-28 pb-20 overflow-hidden bg-[#0A0F1E]">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #6B7A99 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Radial glow behind hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[800px] h-[600px] bg-[#4F7FFF]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            <h1
              className="font-syne font-extrabold text-[#E8ECF4] text-4xl sm:text-5xl md:text-6xl lg:text-[68px] leading-[1.05] tracking-tight mb-6 opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0ms" }}
            >
              Every tool your business needs.{" "}
              <span className="text-[#4F7FFF]">One subscription.</span>
            </h1>
            <p
              className="text-[#6B7A99] text-lg sm:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 opacity-0 animate-fadeInUp"
              style={{ animationDelay: "120ms" }}
            >
              Stop paying for QuickBooks, a registered agent, an invoicing tool,
              a mileage tracker, and a website separately. ezledgr replaces
              them all.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8 opacity-0 animate-fadeInUp"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white text-base font-semibold px-7 py-3.5 rounded-md transition-all duration-150 active:scale-[0.97]"
              >
                Start for free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center border border-[#1E2A45] hover:border-[#4F7FFF]/50 text-[#E8ECF4] text-base font-medium px-7 py-3.5 rounded-md transition-all duration-200 hover:bg-[#4F7FFF]/5"
              >
                See how it works
              </a>
            </div>
            <div
              className="flex justify-center lg:justify-start opacity-0 animate-fadeInUp"
              style={{ animationDelay: "360ms" }}
            >
              <SocialProofAvatars />
            </div>
          </div>

          {/* Right dashboard mockup */}
          <div
            className="opacity-0 animate-fadeInUp"
            style={{ animationDelay: "300ms" }}
          >
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
