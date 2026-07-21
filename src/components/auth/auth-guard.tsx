"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase.auth.getUser();
        if (!data.user) router.replace("/login");
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return <>{children}</>;
}
