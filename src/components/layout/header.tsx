"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, Search, Bell } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Scripts", href: "/dashboard/scripts" },
  { label: "Keys", href: "/dashboard/keys" },
  { label: "Billing", href: "/dashboard/billing" },
  { label: "Tools", href: "/dashboard/tools" },
  { label: "Admin", href: "/dashboard/admin" },
  { label: "Settings", href: "/dashboard/settings" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Supabase not configured
    }
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between glass-header px-4 md:px-6 gap-4">
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 text-emerald-400/60 hover:text-emerald-300"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search bar */}
      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/40" />
        <input
          type="text"
          placeholder="Search dashboard..."
          className="w-full h-9 rounded-lg bg-emerald-500/5 border border-emerald-500/10 pl-10 pr-4 text-sm text-white/70 placeholder:text-emerald-400/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/20 transition-all"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 text-emerald-400/50 hover:text-emerald-300 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#050a05]" />
        </button>

        {/* User avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 text-xs font-bold text-white">
          U
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-400/50 hover:text-emerald-300 hover:bg-emerald-500/8 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 glass-modal p-4 md:hidden z-50 border-emerald-500/10">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400"
                      : "text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
