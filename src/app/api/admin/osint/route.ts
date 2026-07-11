import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/admin-check";

const COUNTRY_CACHE = new Map<string, { country: string; flag: string }>();
const CACHE_TTL = 86400000;

async function geoResolve(ip: string): Promise<{ country: string; flag: string }> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
    return { country: "Unknown", flag: "🏳️" };
  }
  const cached = COUNTRY_CACHE.get(ip);
  if (cached) return cached;

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status === "success") {
      const result = { country: data.country, flag: getFlagEmoji(data.countryCode) };
      COUNTRY_CACHE.set(ip, result);
      return result;
    }
  } catch {}

  return { country: "Unknown", flag: "🏳️" };
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode.toUpperCase().split("").map((c) => 0x1F1E6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

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
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const userMap = new Map((authUsers?.users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email || "unknown"]));

    const { data: ipLogs } = await adminSupabase
      .from("ip_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    const uniqueIps = [...new Set((ipLogs ?? []).map((l: { ip_address: string }) => l.ip_address))];

    const geoResults = await Promise.all(uniqueIps.map(async (ip: string) => [ip, await geoResolve(ip)]));
    const geoMap = new Map<string, { country: string; flag: string }>(geoResults as [string, { country: string; flag: string }][]);

    const enrichedLogs = (ipLogs ?? []).map((log: { user_id?: string; ip_address: string; user_agent?: string; action: string; metadata?: Record<string, unknown>; created_at: string }) => {
      const geo = geoMap.get(log.ip_address);
      return {
        ...log,
        user_email: log.user_id ? userMap.get(log.user_id) || "unknown" : null,
        country: geo?.country || "Unknown",
        country_flag: geo?.flag || "🏳️",
      };
    });

    const signups = ipLogs?.filter((l: { action: string }) => l.action === "signup").length ?? 0;
    const scriptLoads = ipLogs?.filter((l: { action: string }) => l.action === "script_load").length ?? 0;

    return NextResponse.json({
      logs: enrichedLogs,
      stats: {
        totalUsers: authUsers?.users?.length ?? 0,
        uniqueIps: uniqueIps.length,
        totalSignups: signups,
        totalScriptLoads: scriptLoads,
        totalLogEntries: ipLogs?.length ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
