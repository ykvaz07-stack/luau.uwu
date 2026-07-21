import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes("placeholder")) {
    const { data: { user } } = await createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          cookie: request.cookies.getAll().map(({ name, value }) => `${name}=${value}`).join("; "),
        },
      },
    }).auth.getUser();

    if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
      logIpBackground(supabaseUrl, supabaseKey, user.id, request);
    }
  }

  return supabaseResponse;
}

function logIpBackground(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  request: NextRequest
) {
  try {
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";
    const path = request.nextUrl.pathname;

    let action = "page_view";
    if (path.includes("/login")) action = "login";
    else if (path.includes("/signup")) action = "signup";
    else if (path.includes("/scripts")) action = "script_view";
    else if (path.includes("/keys")) action = "key_view";

    supabase.from("ip_logs").insert({
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      action,
    });
  } catch {
    // IP logging should never break the app
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
