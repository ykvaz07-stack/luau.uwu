"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { LuaCryptLogo } from "@/components/layout/logo";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin-check";

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

const PLAN_CACHE_KEY = "luacrypt_plan";
const PLAN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface PlanCache {
  plan: string;
  timestamp: number;
}

function getCachedPlan(): string | null {
  try {
    const raw = localStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    const cached: PlanCache = JSON.parse(raw);
    if (Date.now() - cached.timestamp > PLAN_CACHE_DURATION) {
      localStorage.removeItem(PLAN_CACHE_KEY);
      return null;
    }
    return cached.plan;
  } catch {
    return null;
  }
}

function setCachedPlan(plan: string) {
  try {
    const data: PlanCache = { plan, timestamp: Date.now() };
    localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function getPlan(): Promise<string> {
  // Check local storage first for instant load
  const cached = getCachedPlan();
  if (cached) return Promise.resolve(cached);
  
  const supabase = createClient();
  if (!supabase) return Promise.resolve("free");
  return (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "free";
    const { data } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();
    const plan = (data?.plan as string) || "free";
    setCachedPlan(plan);
    return plan;
  })();
}

// Preload plan from localStorage immediately
let initialPlan = "free";
try {
  const cached = getCachedPlan();
  if (cached) initialPlan = cached;
} catch {}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userPlan, setUserPlan] = useState(initialPlan);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Fetch latest plan in background, update cache
    getPlan().then((plan) => {
      setUserPlan(plan);
      setCachedPlan(plan);
    });
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then((result: { data: { user: { email?: string } | null } }) => {
      if (result.data.user && isAdminEmail(result.data.user.email)) setIsAdmin(true);
    });
  }, []);

  const planColors: Record<string, string> = {
    free: "text-muted-foreground",
    pro: "text-emerald-400",
    premium: "text-lime-400",
  };

  return (
    <aside
      className={`hidden md:flex flex-col glass-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-emerald-500/10 px-4">
        {!collapsed && (
          <Link href="/dashboard">
            <LuaCryptLogo />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <LuaCryptLogo variant="icon" />
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
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400"
                  : "text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-300"
              } ${collapsed ? "justify-center border-l-0" : "ml-0"}`}
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
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400"
                  : "text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-300"
              } ${collapsed ? "justify-center border-l-0" : "ml-0"}`}
            title={collapsed ? "Admin" : undefined}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>

      {!collapsed && (
        <div className="mx-3 mb-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
          <div className="text-xs text-emerald-400/60 mb-1 font-mono uppercase tracking-wider">Plan</div>
          <div className={`text-sm font-semibold capitalize ${planColors[userPlan] || "text-muted-foreground"}`}>
            {userPlan}
          </div>
          {userPlan === "free" && (
            <Link
              href="/dashboard/billing"
              className="mt-2 block text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Upgrade &rarr;
            </Link>
          )}
        </div>
      )}

      <div className="border-t border-emerald-500/10 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-400/50 hover:bg-emerald-500/8 hover:text-emerald-300 transition-colors"
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
