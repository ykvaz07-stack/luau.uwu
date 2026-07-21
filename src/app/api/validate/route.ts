import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface ValidateRequest {
  api_key: string;
  user_key: string;
  script_id: string;
  hwid?: string;
}


export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body: ValidateRequest = await request.json();

    if (!body.api_key || !body.user_key || !body.script_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: api_key, user_key, script_id",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Server configuration error",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("api_key", body.api_key)
      .eq("enabled", true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid API key",
        },
        { status: 403 }
      );
    }

    // Verify the script exists and get the project
    const { data: scriptData, error: scriptError } = await supabase
      .from("scripts")
      .select("*, projects(id)")
      .eq("id", body.script_id)
      .single();

    if (scriptError || !scriptData) {
      return NextResponse.json(
        {
          success: false,
          message: "Script not found",
        },
        { status: 404 }
      );
    }

    // Look up the user key
    const { data: keyData, error: keyError } = await supabase
      .from("keys")
      .select("*")
      .eq("user_key", body.user_key)
      .eq("project_id", scriptData.projects.id)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid key",
        },
        { status: 403 }
      );
    }

    // Check if key is banned
    if (keyData.banned) {
      return NextResponse.json(
        {
          success: false,
          message: "Key is banned",
          ban_reason: keyData.ban_reason,
        },
        { status: 403 }
      );
    }

    // Check expiry
    if (
      keyData.auth_expire !== -1 &&
      keyData.auth_expire < Math.floor(Date.now() / 1000)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Key has expired",
        },
        { status: 403 }
      );
    }

    // Handle HWID
    if (!body.hwid) {
      return NextResponse.json(
        {
          success: false,
          message: "HWID is required. Provide your hardware ID.",
        },
        { status: 403 }
      );
    }

    if (keyData.identifier && keyData.identifier !== body.hwid) {
      return NextResponse.json(
        {
          success: false,
          message: "HWID mismatch. Key is locked to a different machine.",
        },
        { status: 403 }
      );
    }

    // Auto-assign HWID on first use
    if (!keyData.identifier) {
      await supabase
        .from("keys")
        .update({ identifier: body.hwid })
        .eq("id", keyData.id);
    }

    // Increment execution count
    await supabase
      .from("keys")
      .update({
        total_executions: keyData.total_executions + 1,
        last_execution: new Date().toISOString(),
      })
      .eq("id", keyData.id);

    return NextResponse.json({
      success: true,
      message: "Key is valid",
      key_info: {
        user_key: body.user_key,
        status: "active",
        expires_at:
          keyData.auth_expire === -1 ? null : keyData.auth_expire,
        hwid_locked: !!keyData.identifier,
        ffa: scriptData.ffa,
        silent: scriptData.silent,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body",
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    version: "v1",
    status: "operational",
    message: "luau.uwu Validation API",
  });
}
