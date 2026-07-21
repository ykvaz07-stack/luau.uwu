import { NextResponse } from "next/server";
import { getAuthUser, getAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { isRateLimitExempt } from "@/lib/admin-check";


export const runtime = "edge";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (sub && sub.plan !== "free" && sub.expires_at && sub.expires_at < now) {
      const { data: updated } = await supabase
        .from("subscriptions")
        .update({ plan: "free", status: "expired" })
        .eq("id", sub.id)
        .select("*")
        .single();

      return NextResponse.json({ subscription: updated ?? sub });
    }

    return NextResponse.json({ subscription: sub ?? null });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exempt = isRateLimitExempt(user.email);

    const supabase = getAdminClient();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const body = await request.json().catch(() => ({}));
    const fingerprint = body.fingerprint || null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Anti-exploit check 1: Rate limit - max 1 trial attempt per 24h per IP (exempt hubqoo)
    if (!exempt) {
      const { count: recentTrialAttempts } = await supabase
        .from("ip_logs")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", ip)
        .eq("action", "start_trial")
        .gte("created_at", oneDayAgo.toISOString());

      if (recentTrialAttempts && recentTrialAttempts > 0) {
        return NextResponse.json({
          error: "Trial already attempted from this IP recently. Please wait 24 hours."
        }, { status: 429 });
      }
    }

    // Anti-exploit check 2: Check if this user already used their trial
    const existing = await supabase
      .from("subscriptions")
      .select("id, plan, trial_used")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing.data) {
      if (existing.data.trial_used && !exempt) {
        return NextResponse.json({
          error: "Trial already used on this account."
        }, { status: 403 });
      }
      if (existing.data.plan !== "free" && !exempt) {
        return NextResponse.json({
          error: "You already have an active subscription."
        }, { status: 403 });
      }
    }

    // Anti-exploit check 3: Browser fingerprint duplicate check (exempt hubqoo)
    if (fingerprint && !exempt) {
      const { data: fpMatch } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("trial_fingerprint", fingerprint)
        .maybeSingle();

      if (fpMatch) {
        return NextResponse.json({
          error: "Trial already started from this device."
        }, { status: 403 });
      }
    }

    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (existing.data) {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: "pro",
          status: "active",
          trial_used: true,
          trial_fingerprint: fingerprint,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", existing.data.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan: "pro",
          status: "active",
          trial_used: true,
          trial_fingerprint: fingerprint,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Audit log
    await supabase.from("ip_logs").insert({
      user_id: user.id,
      ip_address: ip,
      action: "start_trial",
      user_agent: headersList.get("user-agent")?.slice(0, 500) || null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
