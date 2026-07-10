import { NextResponse, type NextRequest } from "next/server";

export async function logIp(
  request: NextRequest,
  userId: string | null,
  action: string
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) return;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("ip_logs").insert({
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      action,
    });
  } catch {
    // IP logging should never break the app
  }
}

export async function checkIpTrialLimit(
  ip: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) return { allowed: true };

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const ninetyDaysAgo = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("trial_used", true)
      .gte("created_at", ninetyDaysAgo)
      .limit(1);

    if (data && data.length > 0) {
      return {
        allowed: false,
        message: "A trial has already been used from this network recently.",
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export async function checkFingerprintTrial(
  fingerprint: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey || !fingerprint) {
      return { allowed: true };
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("trial_fingerprint", fingerprint)
      .eq("trial_used", true)
      .limit(1);

    if (data && data.length > 0) {
      return {
        allowed: false,
        message: "A trial has already been used on this device.",
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
