import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const [scripts, keys, purchases, subs, announcements, usersRes] = await Promise.all([
      admin.from("scripts").select("id, name, project_id, version, obfuscation_level, projects(name)", { count: "exact" }),
      admin.from("keys").select("id, user_key, banned, project_id, script_id, projects(name), scripts(name)"),
      admin.from("purchases").select("*").order("created_at", { ascending: false }),
      admin.from("subscriptions").select("plan, status"),
      admin.from("announcements").select("*").order("created_at", { ascending: false }),
      admin.auth.admin.listUsers(),
    ]);

    const purchaseEmailMap = new Map<string, string>();
    if (usersRes?.users) {
      usersRes.users.forEach((u: { id: string; email?: string }) => {
        if (u.email) purchaseEmailMap.set(u.id, u.email);
      });
    }

    const totalKeys = keys.count ?? 0;
    const activeKeys = keys.data?.filter((k: { banned: boolean }) => !k.banned).length ?? 0;
    const pendingPurchases = purchases.data?.filter((p: { status: string }) => p.status === "pending") ?? [];
    const totalRevenue = purchases.data?.filter((p: { status: string }) => p.status === "approved").reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) ?? 0;
    const activeSubs = subs.data?.filter((s: { status: string }) => s.status === "active").length ?? 0;

    const purchasesWithEmail = (purchases.data ?? []).map((p: { user_id: string }) => ({
      ...p,
      user_email: purchaseEmailMap.get(p.user_id) || "Unknown",
    }));

    const scriptsRes = scripts;
    const keysRes = keys;
    const purchasesRes = purchases;
    const subsRes = subs;
    const announcementsRes = announcements;
    const authUsers = usersRes?.users ?? [];

    return NextResponse.json({
      authUsers: authUsers.map((u: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }) => ({
        id: u.id,
        email: u.email ?? "unknown",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
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
      keys: keysRes.data ?? [],
      purchasesWithEmail,
      announcements: announcementsRes.data ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
