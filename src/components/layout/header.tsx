"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cat, Menu, LogOut } from "lucide-react";
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
    <header className="flex h-16 items-center justify-between glass-header px-4 md:px-6">
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-accent">
          <Cat className="h-5 w-5 text-white" />
        </div>
        <span className="font-semibold gradient-text-animated">luau.uwu</span>
      </Link>

      <div className="md:hidden" />

      <div className="flex items-center gap-4">
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 glass-modal p-4 md:hidden z-50">
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
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
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
