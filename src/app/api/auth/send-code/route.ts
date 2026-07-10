import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email?.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "EMAIL_SERVICE_NOT_CONFIGURED" }, { status: 400 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { data: existing } = await supabase
      .from("verification_codes")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      await supabase.from("verification_codes").update({ code, expires_at: new Date(Date.now() + 600000).toISOString() }).eq("email", email);
    } else {
      await supabase.from("verification_codes").insert({ email, code, expires_at: new Date(Date.now() + 600000).toISOString() });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "luau.uwu <noreply@luau.uwu>",
        to: email,
        subject: "Your verification code",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0610;color:#e0d0e0;border-radius:12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:28px;">/\\_/\\</span><br>
            <span style="font-size:20px;">( ^.^ )</span><br>
            <span style="font-size:24px;">> ^ <</span>
          </div>
          <h1 style="color:#ff6b9d;font-size:20px;text-align:center;">Your verification code</h1>
          <p style="color:rgba(224,208,224,0.7);text-align:center;">Enter this code to verify your account:</p>
          <div style="text-align:center;font-size:36px;font-weight:800;letter-spacing:8px;padding:16px;margin:16px 0;background:rgba(255,107,157,0.1);border-radius:8px;color:#ff6b9d;">${code}</div>
          <p style="color:rgba(224,208,224,0.5);font-size:12px;text-align:center;">This code expires in 10 minutes.</p>
          <p style="color:rgba(224,208,224,0.4);font-size:11px;text-align:center;margin-top:16px;">luau.uwu — protected</p>
        </div>`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Failed to send email: " + errText }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Code sent to your email" });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
