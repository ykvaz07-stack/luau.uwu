"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Menu, X, ChevronRight, ArrowLeft } from "lucide-react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

const sidebarLinks = [
  { label: "Getting Started", href: "/docs/getting-started", icon: "→" },
  { label: "Obfuscation Guide", href: "/docs/obfuscation", icon: "→" },
  { label: "API Reference", href: "/docs/api", icon: "→" },
  { label: "Discord Bot", href: "/docs/discord-bot", icon: "→" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex gap-8">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <aside className={`fixed lg:sticky top-20 left-0 z-40 w-72 h-[calc(100vh-5rem)] overflow-y-auto transition-transform duration-300 lg:translate-x-0 lg:block ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}>
            <div className="p-4 space-y-1 bg-[#060512]/95 lg:bg-transparent h-full border-r border-white/[0.06] lg:border-0">
              <div className="flex items-center gap-2 px-3 py-3 mb-4">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                <span className="font-semibold text-sm">Documentation</span>
              </div>
              {sidebarLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-xs opacity-50">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 py-8 px-4 lg:px-8 max-w-4xl">
            {children}
          </main>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
