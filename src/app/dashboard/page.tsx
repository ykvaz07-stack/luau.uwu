"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FolderKanban,
  FileCode,
  Key,
  Activity,
  ArrowUpRight,
  Plus,
  CreditCard,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalProjects: number;
  totalScripts: number;
  totalKeys: number;
  activeKeys: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    totalScripts: 0,
    totalKeys: 0,
    activeKeys: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: userProjects } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id);
        const projectIds = (userProjects ?? []).map((p: { id: string }) => p.id);

        let projectsRes = { count: userProjects?.length ?? 0 };
        let scriptsRes = { count: 0 };
        let keysRes = { data: [] };

        if (projectIds.length > 0) {
          const [sRes, kRes] = await Promise.all([
            supabase.from("scripts").select("id", { count: "exact", head: true }).in("project_id", projectIds),
            supabase.from("keys").select("id, banned, auth_expire").in("project_id", projectIds),
          ]);
          scriptsRes = sRes;
          keysRes = kRes;
        }

        const totalKeys = keysRes.data?.length ?? 0;
        const activeKeys =
          keysRes.data?.filter(
            (k: { banned: boolean; auth_expire: number }) =>
              !k.banned &&
              (k.auth_expire === -1 || k.auth_expire > Date.now() / 1000)
          ).length ?? 0;

        setStats({
          totalProjects: projectsRes.count ?? 0,
          totalScripts: scriptsRes.count ?? 0,
          totalKeys,
          activeKeys,
        });
      } catch {
        // Supabase not configured or error
      }
      setLoading(false);
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Projects",
      value: loading ? "..." : stats.totalProjects.toString(),
      icon: FolderKanban,
      href: "/dashboard/projects",
    },
    {
      label: "Total Scripts",
      value: loading ? "..." : stats.totalScripts.toString(),
      icon: FileCode,
      href: "/dashboard/scripts",
    },
    {
      label: "Active Keys",
      value: loading ? "..." : stats.activeKeys.toString(),
      icon: Key,
      href: "/dashboard/keys",
    },
    {
      label: "Billing",
      value: "Plan",
      icon: CreditCard,
      href: "/dashboard/billing",
    },
  ];

  const quickActions = [
    { label: "Create Project", description: "Start a new script project", href: "/dashboard/projects", icon: Plus },
    { label: "Upload Script", description: "Add a script to an existing project", href: "/dashboard/scripts", icon: FileCode },
    { label: "Generate Keys", description: "Create keys for your users", href: "/dashboard/keys", icon: Key },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to LuaCrypt. Here&apos;s an overview of your account.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <stat.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group rounded-xl glass-card p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <action.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">{action.label}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl glass p-6">
        <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
        <div className="space-y-4">
          {[
            { step: 1, title: "Create a project", desc: "Organize your scripts into projects" },
            { step: 2, title: "Upload a script", desc: "Add your Luau script to the project" },
            { step: 3, title: "Generate keys", desc: "Create keys for your users to access the script" },
            { step: 4, title: "Integrate validation", desc: "Add key validation to your Roblox game" },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-4 p-3 rounded-lg bg-white/3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm font-medium text-muted-foreground">
                {item.step}
              </div>
              <div>
                <div className="font-medium text-sm">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
