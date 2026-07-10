import { NextResponse } from "next/server";
import { getAuthUser, getAdminClient, checkProjectLimit } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "Project name required" }, { status: 400 });

    const check = await checkProjectLimit(user.id);
    if (!check.allowed) {
      return NextResponse.json({
        error: `Project limit reached (${check.current}/${check.limit}). Upgrade your plan to create more projects.`
      }, { status: 403 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, platform: "roblox", user_id: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
