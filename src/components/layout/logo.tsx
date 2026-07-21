import { cn } from "@/lib/utils";

interface LuaCryptLogoProps {
  variant?: "full" | "icon" | "mono";
  className?: string;
}

export function LuaCryptLogo({ variant = "full", className }: LuaCryptLogoProps) {
  if (variant === "icon") {
    return (
      <div className={cn("relative flex h-9 w-9 items-center justify-center", className)}>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 opacity-90 blur-sm" />
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3V6a3 3 0 0 0-3-3z" />
            <circle cx="12" cy="13" r="2" />
            <path d="M12 15v3" />
          </svg>
        </div>
      </div>
    );
  }

  if (variant === "mono") {
    return (
      <span className={cn("font-mono font-bold tracking-tight", className)}>
        <span className="text-emerald-400">&gt;_</span>lc
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 group", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/25">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 opacity-80 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3V6a3 3 0 0 0-3-3z" />
            <circle cx="12" cy="13" r="2" />
            <path d="M12 15v3" />
          </svg>
        </div>
      </div>
      <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-lime-400 bg-clip-text text-transparent">
        LuaCrypt
      </span>
    </div>
  );
}
