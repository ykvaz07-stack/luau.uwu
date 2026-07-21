import { NextResponse } from "next/server";
import { getAuthUser, getAdminClient, checkKeyLimit } from "@/lib/supabase/admin";


export const runtime = "edge";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getAdminClient();

    // Get user's project IDs
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id);

    const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

    // Get keys linked to user's projects or scripts
    const { data: userScripts } = await supabase
      .from("scripts")
      .select("id")
      .in("project_id", projectIds);

    const scriptIds = (userScripts ?? []).map((s: { id: string }) => s.id);

    const { data: keys } = await supabase
      .from("keys")
      .select("*")
      .or(projectIds.length ? `project_id.in.(${projectIds.join(",")})` : `project_id.eq.null`)
      .order("created_at", { ascending: false });

    // Also get keys by script_id for user's scripts
    let scriptKeys: Record<string, unknown>[] = [];
    if (scriptIds.length > 0) {
      const { data: sk } = await supabase
        .from("keys")
        .select("*")
        .in("script_id", scriptIds)
        .is("project_id", null)
        .order("created_at", { ascending: false });
      scriptKeys = sk ?? [];
    }

    // Merge and deduplicate
    const seen = new Set<string>();
    const allKeys = [...(keys ?? []), ...scriptKeys].filter((k: { id: string }) => {
      if (seen.has(k.id)) return false;
      seen.add(k.id);
      return true;
    });

    return NextResponse.json({ keys: allKeys });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

function generateRandomKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    let projectId = body.project_id;
    const scriptId = body.script_id;
    const count = Math.min(Math.max(parseInt(body.count) || 1, 1), 100);
    const authExpire = body.auth_expire ?? -1;
    const keyDays = body.key_days ?? null;

    if (!scriptId) {
      return NextResponse.json({ error: "Script ID required" }, { status: 400 });
    }

    if (!projectId) {
      const supabase = getAdminClient();
      const { data: script } = await supabase
        .from("scripts")
        .select("project_id")
        .eq("id", scriptId)
        .maybeSingle();
      if (!script) return NextResponse.json({ error: "Script not found" }, { status: 404 });
      projectId = script.project_id;
    }

    const check = await checkKeyLimit(user.id);
    if (!check.allowed) {
      return NextResponse.json({
        error: `Key limit reached (${check.current}/${check.limit}). Upgrade your plan to create more keys.`
      }, { status: 403 });
    }

    // Check if adding these keys would exceed the limit
    if (check.limit !== "unlimited" && check.current + count > check.limit) {
      return NextResponse.json({
        error: `Cannot create ${count} keys — only ${check.limit - check.current} slots remaining.`
      }, { status: 403 });
    }

    const supabase = getAdminClient();
    const keysToInsert = Array.from({ length: count }, () => ({
      project_id: projectId,
      script_id: scriptId,
      user_key: generateRandomKey(),
      auth_expire: authExpire,
      key_days: keyDays,
    }));

    const { data, error } = await supabase
      .from("keys")
      .insert(keysToInsert)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ keys: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
