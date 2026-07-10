"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cat,
  LayoutDashboard,
  FolderKanban,
  FileCode,
  Key,
  Wrench,
  Shield,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Scripts", href: "/dashboard/scripts", icon: FileCode },
  { label: "Keys", href: "/dashboard/keys", icon: Key },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Support", href: "/dashboard/support", icon: MessageSquare },
  { label: "Tools", href: "/dashboard/tools", icon: Wrench },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

let cachedPlan: string | null = null;
let planPromise: Promise<string> | null = null;

function getPlan(): Promise<string> {
  if (cachedPlan) return Promise.resolve(cachedPlan);
  if (planPromise) return planPromise;
  planPromise = (async () => {
    const supabase = createClient();
    if (!supabase) return "free";
    const { data } = await supabase
      .from("subscriptions")
      .select("plan")
      .limit(1)
      .maybeSingle();
    const plan = (data?.plan as string) || "free";
    cachedPlan = plan;
    return plan;
  })();
  return planPromise;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userPlan, setUserPlan] = useState("free");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getPlan().then(setUserPlan);
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        if (adminEmail && data.user.email === adminEmail) setIsAdmin(true);
      }
    });
  }, []);

  const planColors: Record<string, string> = {
    free: "text-muted-foreground",
    pro: "text-primary",
    premium: "text-yellow-500",
  };

  return (
    <aside
      className={`hidden md:flex flex-col glass-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-accent">
              <Cat className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold gradient-text-animated">luau.uwu</span>
          </Link>
        )}
        {collapsed && (
          <Link
            href="/dashboard"
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg gradient-accent"
          >
            <Cat className="h-5 w-5 text-white" />
          </Link>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary/15 text-primary glow-pink-sm"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              pathname.startsWith("/dashboard/admin")
                ? "bg-primary/15 text-primary glow-pink-sm"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            } ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Admin" : undefined}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>

      {!collapsed && (
        <div className="mx-3 mb-3 rounded-lg bg-white/3 border border-white/5 p-3">
          <div className="text-xs text-muted-foreground mb-1">Current Plan</div>
          <div className={`text-sm font-semibold capitalize ${planColors[userPlan] || "text-muted-foreground"}`}>
            {userPlan}
          </div>
          {userPlan === "free" && (
            <Link
              href="/dashboard/billing"
              className="mt-2 block text-xs text-primary hover:underline"
            >
              Upgrade &rarr;
            </Link>
          )}
        </div>
      )}

      <div className="border-t border-white/5 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
