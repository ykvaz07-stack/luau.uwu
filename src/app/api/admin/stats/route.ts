import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/admin-check";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const [scripts, keys, purchases, subs, announcements, usersRes, scriptsAll, keysAll] = await Promise.all([
      admin.from("scripts").select("id, name, project_id, version, obfuscation_level, projects(name)", { count: "exact" }),
      admin.from("keys").select("id, user_key, banned, project_id, script_id, projects(name), scripts(name)"),
      admin.from("purchases").select("*").order("created_at", { ascending: false }),
      admin.from("subscriptions").select("plan, status, user_id"),
      admin.from("announcements").select("*").order("created_at", { ascending: false }),
      admin.auth.admin.listUsers(),
      admin.from("scripts").select("id, project_id, projects(user_id)"),
      admin.from("keys").select("id, project_id, projects(user_id)"),
    ]);

    const purchaseEmailMap = new Map<string, string>();
    const subMap = new Map<string, string>();
    const allUsers = (usersRes as { data?: { users: { id: string; email?: string }[] } })?.data?.users ?? [];
    allUsers.forEach((u: { id: string; email?: string }) => {
      if (u.email) purchaseEmailMap.set(u.id, u.email);
    });
    (subs.data ?? []).forEach((s: { user_id: string; plan: string }) => {
      if (s.user_id) subMap.set(s.user_id, s.plan);
    });

    const scriptCountMap = new Map<string, number>();
    const keyCountMap = new Map<string, number>();
    (scriptsAll.data ?? []).forEach((s: { projects: { user_id: string }[] | { user_id: string } }) => {
      const projects = Array.isArray(s.projects) ? s.projects : s.projects ? [s.projects] : [];
      projects.forEach((p: { user_id: string }) => {
        if (p?.user_id) scriptCountMap.set(p.user_id, (scriptCountMap.get(p.user_id) || 0) + 1);
      });
    });
    (keysAll.data ?? []).forEach((k: { projects: { user_id: string }[] | { user_id: string } }) => {
      const projects = Array.isArray(k.projects) ? k.projects : k.projects ? [k.projects] : [];
      projects.forEach((p: { user_id: string }) => {
        if (p?.user_id) keyCountMap.set(p.user_id, (keyCountMap.get(p.user_id) || 0) + 1);
      });
    });

    const totalKeys = keys.count ?? 0;
    const activeKeys = keys.data?.filter((k: { banned: boolean }) => !k.banned).length ?? 0;
    const pendingPurchases = purchases.data?.filter((p: { status: string }) => p.status === "pending") ?? [];
    const totalRevenue = purchases.data?.filter((p: { status: string }) => p.status === "approved").reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) ?? 0;
    const activeSubs = subs.data?.filter((s: { status: string }) => s.status === "active").length ?? 0;

    const purchasesWithEmail = (purchases.data ?? []).map((p: { user_id: string }) => ({
      ...p,
      user_email: purchaseEmailMap.get(p.user_id) || "Unknown",
    }));

    const authUsers = allUsers;

    return NextResponse.json({
      authUsers: authUsers.map((u: Record<string, unknown>) => ({
        id: String(u.id ?? ""),
        email: String(u.email ?? "unknown"),
        created_at: String(u.created_at ?? ""),
        last_sign_in_at: u.last_sign_in_at ? String(u.last_sign_in_at) : null,
        plan: subMap.get(String(u.id)) || "free",
        scriptCount: scriptCountMap.get(String(u.id)) || 0,
        keyCount: keyCountMap.get(String(u.id)) || 0,
      })),
      stats: {
        totalUsers: authUsers.length,
        totalScripts: scripts.count ?? 0,
        totalKeys,
        activeKeys,
        totalRevenue,
        pendingPayments: pendingPurchases.length,
        activeSubscriptions: activeSubs,
      },
      keys: keys.data ?? [],
      purchasesWithEmail,
      announcements: announcements.data ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
