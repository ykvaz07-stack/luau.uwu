import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scriptId } = await params;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const hwid = searchParams.get("hwid");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return new NextResponse(
      "-- ScriptShield: Server configuration error",
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("id, content, obfuscated_content, project_id")
    .eq("id", scriptId)
    .single();

  if (scriptError || !script) {
    return new NextResponse(
      "-- ScriptShield: Script not found",
      { status: 404, headers: { "Content-Type": "text/plain" } }
    );
  }

  // Check if requires_key column exists (graceful fallback if migration not run)
  let requiresKey = false;
  try {
    const { data: colCheck } = await supabase
      .from("scripts")
      .select("requires_key")
      .eq("id", scriptId)
      .single();
    requiresKey = colCheck?.requires_key === true;
  } catch {
    // Column doesn't exist yet - treat all scripts as keyless
  }

  if (requiresKey) {
    if (!key) {
      return new NextResponse(
        "-- ScriptShield: This script requires a key\n-- Get your key from the script provider\nerror('ScriptShield: Key required. Contact the script provider for a key.')",
        { status: 403, headers: { "Content-Type": "text/plain" } }
      );
    }

    const { data: keyData, error: keyError } = await supabase
      .from("keys")
      .select("id, user_key, identifier, banned, ban_reason, auth_expire, project_id, total_executions")
      .eq("user_key", key)
      .eq("project_id", script.project_id)
      .single();

    if (keyError || !keyData) {
      return new NextResponse(
        "-- ScriptShield: Invalid key\nerror('ScriptShield: The key you provided is invalid.')",
        { status: 403, headers: { "Content-Type": "text/plain" } }
      );
    }

    if (keyData.banned) {
      return new NextResponse(
        `-- ScriptShield: Key banned\n-- Reason: ${keyData.ban_reason || "No reason provided"}\nerror('ScriptShield: This key has been banned.')`,
        { status: 403, headers: { "Content-Type": "text/plain" } }
      );
    }

    if (keyData.auth_expire !== -1 && keyData.auth_expire < Math.floor(Date.now() / 1000)) {
      return new NextResponse(
        "-- ScriptShield: Key expired\nerror('ScriptShield: This key has expired. Please renew.')",
        { status: 403, headers: { "Content-Type": "text/plain" } }
      );
    }

    if (hwid && keyData.identifier && keyData.identifier !== hwid) {
      return new NextResponse(
        "-- ScriptShield: HWID mismatch\nerror('ScriptShield: This key is locked to a different machine.')",
        { status: 403, headers: { "Content-Type": "text/plain" } }
      );
    }

    if (hwid && !keyData.identifier) {
      await supabase
        .from("keys")
        .update({ identifier: hwid })
        .eq("id", keyData.id);
    }

    await supabase
      .from("keys")
      .update({
        total_executions: (keyData.total_executions || 0) + 1,
        last_execution: new Date().toISOString(),
      })
      .eq("id", keyData.id);
  }

  const scriptContent = script.obfuscated_content || script.content;

  return new NextResponse(scriptContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
