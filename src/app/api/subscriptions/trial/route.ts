import { NextResponse } from "next/server";
import { getAuthUser, getAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const existing = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing.data) {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: "pro",
          status: "active",
          trial_used: true,
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
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
