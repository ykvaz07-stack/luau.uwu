import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;
let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
    console.warn(
      "Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local"
    );
    return null as unknown as SupabaseClient;
  }

  client = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export function getSiteUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function isAdminUser(): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  const { isAdminEmail } = await import("@/lib/admin-check");
  return isAdminEmail(data.user?.email);
}
