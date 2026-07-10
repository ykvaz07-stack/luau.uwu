import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getAuthUser() {
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
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function getAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
