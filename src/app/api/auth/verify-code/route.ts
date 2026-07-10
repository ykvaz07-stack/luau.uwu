import { NextResponse } from "next/server";
import { isDisposableEmail, isPlusAddressedEmail } from "@/lib/anti-abuse";

export async function POST(request: Request) {
  try {
    const { email, code, password } = await request.json();
    if (!email?.includes("@") || !code || !password) {
      return NextResponse.json({ error: "Email, code, and password required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json({ error: "Disposable email addresses are not allowed" }, { status: 400 });
    }

    if (isPlusAddressedEmail(email)) {
      return NextResponse.json({ error: "Plus-addressed emails are not allowed" }, { status: 400 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // IP rate limiting — max 3 signups per 24h from same IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count, error: countError } = await supabase
      .from("ip_logs")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .eq("action", "signup")
      .gte("created_at", oneDayAgo);

    if (!countError && count && count >= 3) {
      return NextResponse.json({ error: "Too many accounts created from this IP. Try again later." }, { status: 429 });
    }

    // Verify code
    const { data: record, error: fetchError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    // Create Supabase user
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Log IP on signup
    const userAgent = request.headers.get("user-agent") || "unknown";

    await supabase.from("ip_logs").insert({
      user_id: authData.user.id,
      ip_address: ip,
      user_agent: userAgent,
      action: "signup",
    });

    // Clean up code
    await supabase.from("verification_codes").delete().eq("email", email);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request: " + String(err) }, { status: 400 });
  }
}
