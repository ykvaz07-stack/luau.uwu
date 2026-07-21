"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LuaCryptLogo } from "@/components/layout/logo";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "FAQ", href: "/faq" },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#050a05]/90 backdrop-blur-xl border-b border-emerald-500/10 shadow-2xl shadow-black/30"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 md:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <LuaCryptLogo />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors rounded-lg hover:bg-emerald-500/5"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="relative inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-lime-400 px-4 text-sm font-medium text-white overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02]"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-lime-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden relative z-50 flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="md:hidden overflow-hidden border-t border-emerald-500/10 bg-[#050a05]/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-white/[0.08] text-white"
                        : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <Link
                  href="/login"
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.04] hover:text-white transition-all"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-center bg-gradient-to-r from-emerald-500 to-lime-400 text-white"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
