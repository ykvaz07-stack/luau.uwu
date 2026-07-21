import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    // Forward code to dashboard — client-side Supabase will detect it and exchange
    const redirectUrl = new URL(`${origin}${next}`);
    redirectUrl.searchParams.set("code", code);

    // Log IP in the background (fire-and-forget, never block)
    const clientIp = searchParams.get("clientIp")
      || request.headers.get("x-forwarded-for")
      || request.headers.get("x-real-ip")
      || "unknown";

    try {
      const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      admin.from("ip_logs").insert({
        ip_address: clientIp,
        user_agent: request.headers.get("user-agent") || "unknown",
        action: "signup",
      }).then(() => {}).catch(() => {});
    } catch {}

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
