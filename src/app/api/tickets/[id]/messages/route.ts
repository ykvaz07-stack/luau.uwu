import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/admin-check";


export const runtime = "edge";

async function getAuthUser() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { cookie: cookieHeader } },
    }
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ticket } = await supabase
      .from("tickets")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isAdmin = isAdminEmail(user.email);

    if (ticket.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: msgError } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: id,
        user_id: user.id,
        message: message.trim(),
        is_admin: isAdmin,
      });

    if (msgError) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    await supabase
      .from("tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
