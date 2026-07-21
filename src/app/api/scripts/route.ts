import { NextResponse } from "next/server";
import { getAuthUser, getAdminClient, checkScriptLimit } from "@/lib/supabase/admin";


export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = body.name?.trim();
    const content = body.content?.trim();
    const projectId = body.project_id;
    const requiresKey = body.requires_key === true;
    const obfuscate = body.obfuscate === true;

    if (!name) return NextResponse.json({ error: "Script name required" }, { status: 400 });
    if (!content) return NextResponse.json({ error: "Script content required" }, { status: 400 });
    if (!projectId) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

    const check = await checkScriptLimit(user.id);
    if (!check.allowed) {
      return NextResponse.json({
        error: `Script limit reached (${check.current}/${check.limit}). Upgrade your plan to create more scripts.`
      }, { status: 403 });
    }

    const supabase = getAdminClient();
    const insertData: Record<string, unknown> = {
      name,
      content,
      project_id: projectId,
      requires_key: requiresKey,
    };
    if (obfuscate) {
      insertData.obfuscation_level = "pending";
    }

    const { data, error } = await supabase
      .from("scripts")
      .insert(insertData)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ script: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
