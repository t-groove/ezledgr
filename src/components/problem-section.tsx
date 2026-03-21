import {
  Calculator,
  FileText,
  Car,
  Building,
  FileCheck,
  Globe,
  Receipt,
} from "lucide-react";

const tools = [
  { icon: Calculator, name: "Accounting", price: "$30/mo" },
  { icon: FileText, name: "Invoicing", price: "$15/mo" },
  { icon: Car, name: "Mileage", price: "$12/mo" },
  { icon: Building, name: "Registered Agent", price: "$25/mo" },
  { icon: FileCheck, name: "Annual Reports", price: "$20/mo" },
  { icon: Globe, name: "Website", price: "$20/mo" },
  { icon: Receipt, name: "Tax Filing", price: "$25/mo" },
];

export default function ProblemSection() {
  const total = 147;

  return (
    <section className="relative bg-[#0A0F1E] py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="text-center mb-14">
          <h2 className="font-syne font-bold text-[#E8ECF4] text-3xl sm:text-4xl md:text-[44px] leading-tight tracking-tight">
            The average small business owner
            <br className="hidden sm:block" /> pays for{" "}
            <span className="text-[#4F7FFF]">7 separate tools.</span>
          </h2>
        </div>

        {/* Tool cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-10">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.name}
                className="bg-[#111827] border border-[#1E2A45] rounded-lg p-4 sm:p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20"
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-md bg-[#1E2A45] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#6B7A99]" />
                </div>
                <p className="text-[#E8ECF4] text-sm font-medium mb-1">
                  {tool.name}
                </p>
                <p className="text-[#6B7A99] text-xs">{tool.price}</p>
              </div>
            );
          })}
        </div>

        {/* Total price row */}
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between bg-[#111827] border border-[#1E2A45] rounded-lg px-6 py-4 mb-4">
            <span className="text-[#6B7A99] text-base font-medium">
              Total cost with separate tools
            </span>
            <span className="text-[#E8ECF4] text-lg font-bold line-through decoration-[#EF4444]/60 decoration-2">
              ${total}/mo
            </span>
          </div>

          {/* ezledgr price row */}
          <div className="flex items-center justify-between bg-[#4F7FFF]/10 border border-[#4F7FFF]/30 rounded-lg px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-[#4F7FFF] flex items-center justify-center">
                <span className="text-white text-xs font-bold">C</span>
              </div>
              <span className="text-[#E8ECF4] text-base font-semibold">
                ezledgr
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#4F7FFF] text-xl font-bold font-syne">
                $49/mo
              </span>
              <p className="text-[#6B7A99] text-xs mt-0.5">
                Everything included
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
