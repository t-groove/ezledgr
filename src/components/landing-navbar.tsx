"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Square } from "lucide-react";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "How it works", href: "#how-it-works" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0F1E]/95 backdrop-blur-md border-b border-[#1E2A45]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-[#4F7FFF] flex items-center justify-center">
              <Square className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-[#E8ECF4] font-syne font-bold text-lg tracking-tight">
              ezledgr
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[#6B7A99] hover:text-[#E8ECF4] text-sm font-medium transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-[#6B7A99] hover:text-[#E8ECF4] text-sm font-medium px-4 py-2 transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-all duration-150 active:scale-[0.97]"
            >
              Get started free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[#E8ECF4] p-2"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0A0F1E]/98 backdrop-blur-md border-t border-[#1E2A45]">
          <div className="px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-[#6B7A99] hover:text-[#E8ECF4] text-base font-medium py-2 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-[#1E2A45] flex flex-col gap-3">
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="text-[#6B7A99] hover:text-[#E8ECF4] text-base font-medium py-2 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setMobileOpen(false)}
                className="bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white text-base font-semibold px-5 py-3 rounded-md text-center transition-all duration-150 active:scale-[0.97]"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
