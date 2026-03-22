import Link from "next/link";
import { Square } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Pricing", "Changelog"],
  Company: ["About", "Blog", "Careers"],
  Legal: ["Privacy", "Terms", "Security"],
  Support: ["Help center", "Contact", "Status"],
};

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0A0F1E] border-t border-[#1E2A45]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo + Tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-[#4F7FFF] flex items-center justify-center">
                <Square className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="text-[#E8ECF4] font-syne font-bold text-lg tracking-tight">
                EZ Ledgr
              </span>
            </Link>
            <p className="text-[#6B7A99] text-sm leading-relaxed max-w-[200px]">
              The back office for modern small businesses.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-[#E8ECF4] font-semibold text-sm mb-4">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-[#6B7A99] hover:text-[#E8ECF4] text-sm transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#1E2A45] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#6B7A99] text-xs">
            © {currentYear} EZ Ledgr. All rights reserved.
          </p>
          <p className="text-[#6B7A99] text-xs">
            Made for small business owners, by small business owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
