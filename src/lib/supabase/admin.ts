import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { PLAN_FEATURES, type PlanType } from "@/types";

export async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getUserPlan(userId: string): Promise<PlanType> {
  const supabase = getAdminClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  return (sub?.plan as PlanType) || "free";
}

export async function checkProjectLimit(userId: string): Promise<{ allowed: boolean; limit: number | "unlimited"; current: number }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_FEATURES[plan];
  const supabase = getAdminClient();
  const { count } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  const current = count ?? 0;
  return { allowed: limits.projects === "unlimited" || current < limits.projects, limit: limits.projects, current };
}

export async function checkScriptLimit(userId: string): Promise<{ allowed: boolean; limit: number | "unlimited"; current: number }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_FEATURES[plan];
  const supabase = getAdminClient();
  const { data: projects } = await supabase.from("projects").select("id").eq("user_id", userId);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  let current = 0;
  if (projectIds.length > 0) {
    const { count } = await supabase
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .in("project_id", projectIds);
    current = count ?? 0;
  }
  return { allowed: limits.scripts === "unlimited" || current < limits.scripts, limit: limits.scripts, current };
}

export async function checkKeyLimit(userId: string): Promise<{ allowed: boolean; limit: number | "unlimited"; current: number }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_FEATURES[plan];
  const supabase = getAdminClient();
  const { data: projects } = await supabase.from("projects").select("id").eq("user_id", userId);
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  let current = 0;
  if (projectIds.length > 0) {
    const { count } = await supabase
      .from("keys")
      .select("*", { count: "exact", head: true })
      .in("project_id", projectIds);
    current = count ?? 0;
  }
  return { allowed: limits.keys === "unlimited" || current < limits.keys, limit: limits.keys, current };
}
