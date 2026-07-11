import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdminEmail, isRateLimitExempt } from "@/lib/admin-check";

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function getAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, message, priority } = await request.json();
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
    }

    const supabase = await getAdminClient();

    // Rate limit: 1 ticket per 24h (exempt hubqoo)
    if (!isRateLimitExempt(user.email)) {
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const { count: recentTickets } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneDayAgo);

      if (recentTickets && recentTickets >= 1) {
        return NextResponse.json({ error: "You can only create 1 ticket per 24 hours" }, { status: 429 });
      }
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({ user_id: user.id, subject: subject.trim(), priority: priority || "normal" })
      .select("id")
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }

    const { error: msgError } = await supabase
      .from("ticket_messages")
      .insert({ ticket_id: ticket.id, user_id: user.id, message: message.trim(), is_admin: false });

    if (msgError) {
      await supabase.from("tickets").delete().eq("id", ticket.id);
      return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket_id: ticket.id });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getAdminClient();
    const isAdmin = isAdminEmail(user.email);

    const url = new URL(request.url);
    const ticketId = url.searchParams.get("id");

    if (ticketId) {
      const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      if (ticket.user_id !== user.id && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: messages } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      return NextResponse.json({ ticket, messages: messages ?? [] });
    }

    let query = supabase
      .from("tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data: tickets } = await query;

    // Hydrate user emails for admin view
    let ticketsWithEmail: Record<string, unknown>[] = tickets ?? [];
    if (isAdmin && tickets?.length) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const userEmailMap = new Map((usersData?.users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email || "unknown"]));
      ticketsWithEmail = tickets.map((t: { user_id: string }) => ({ ...t, users: { email: userEmailMap.get(t.user_id) || "Unknown" } }));
    }

    return NextResponse.json({ tickets: ticketsWithEmail });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
