import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all auth users
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const userMap = new Map((authUsers?.users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email || "unknown"]));

    // Get IP logs
    const { data: ipLogs } = await adminSupabase
      .from("ip_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    const enrichedLogs = (ipLogs ?? []).map((log: { user_id?: string; ip_address: string; user_agent?: string; action: string; metadata?: Record<string, unknown>; created_at: string }) => ({
      ...log,
      user_email: log.user_id ? userMap.get(log.user_id) || "unknown" : null,
    }));

    // Summary stats
    const uniqueIps = new Set(ipLogs?.map((l: { ip_address: string }) => l.ip_address) ?? []);
    const signups = ipLogs?.filter((l: { action: string }) => l.action === "signup").length ?? 0;
    const scriptLoads = ipLogs?.filter((l: { action: string }) => l.action === "script_load").length ?? 0;

    return NextResponse.json({
      logs: enrichedLogs,
      stats: {
        totalUsers: authUsers?.users?.length ?? 0,
        uniqueIps: uniqueIps.size,
        totalSignups: signups,
        totalScriptLoads: scriptLoads,
        totalLogEntries: ipLogs?.length ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
