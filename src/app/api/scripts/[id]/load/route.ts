import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ACCESS_DENIED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Access Denied</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0610;
    color: #e0d0e0;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; overflow: hidden;
    background-image:
      radial-gradient(ellipse at 20% 50%, rgba(255,107,157,0.06) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 50%, rgba(196,77,255,0.06) 0%, transparent 60%);
  }
  .container { text-align: center; padding: 2rem; max-width: 480px; }
  .icon {
    width: 80px; height: 80px; margin: 0 auto 1.5rem;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(255,107,157,0.15), rgba(196,77,255,0.15));
    display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(255,107,157,0.12);
  }
  .icon svg { width: 36px; height: 36px; fill: none; stroke: #ff6b9d; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  h1 {
    font-size: 2rem; font-weight: 800; margin-bottom: 0.75rem;
    background: linear-gradient(135deg, #ff6b9d, #c44dff, #ff6b9d);
    background-size: 200% 200%;
    animation: shift 3s ease infinite;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  p { color: rgba(224,208,224,0.6); line-height: 1.6; font-size: 0.95rem; margin-bottom: 0.5rem; }
  .badge {
    display: inline-block; margin-top: 1.5rem; padding: 0.4rem 1rem;
    border-radius: 8px; font-size: 0.75rem; font-weight: 600;
    background: rgba(255,107,157,0.08); border: 1px solid rgba(255,107,157,0.1);
    color: rgba(255,107,157,0.7);
    font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px;
  }
  @keyframes shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
  .scanlines::after {
    content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,107,157,0.015) 2px, rgba(255,107,157,0.015) 4px);
  }
</style>
</head>
<body class="scanlines">
<div class="container">
  <div class="icon">
    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>
  </div>
  <h1>Access Denied</h1>
  <p>This script is protected and cannot be viewed directly.</p>
  <p>It can only be executed through an authorized loader.</p>
  <div class="badge">luau.uwu &bull; protected</div>
</div>
</body>
</html>`;

function isBrowserRequest(request: Request): boolean {
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/html");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isBrowserRequest(request)) {
    return new NextResponse(ACCESS_DENIED_HTML, {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const { id: scriptId } = await params;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") || searchParams.get("script_key");
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

  let requiresKey = false;
  try {
    const { data: colCheck } = await supabase
      .from("scripts")
      .select("requires_key")
      .eq("id", scriptId)
      .single();
    requiresKey = colCheck?.requires_key === true;
  } catch {
    // Column doesn't exist yet
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
      .select("id, user_key, identifier, banned, ban_reason, auth_expire, project_id, script_id, total_executions")
      .eq("user_key", key)
      .or(`script_id.eq.${scriptId},project_id.eq.${script.project_id}`)
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

  // Log IP + execution
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const executorFp = request.headers.get("syn-fingerprint") || request.headers.get("sw-fingerprint") || request.headers.get("krnl-hwid") || "";
    const { data: project } = await supabase.from("projects").select("user_id").eq("id", script.project_id).single();
    await supabase.from("ip_logs").insert({
      user_id: project?.user_id || null,
      ip_address: ip,
      user_agent: userAgent,
      action: "script_load",
      metadata: { script_id: scriptId, key_id: keyData?.id || null, executor_fp: executorFp },
    });
  } catch {}

  return new NextResponse(scriptContent, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
