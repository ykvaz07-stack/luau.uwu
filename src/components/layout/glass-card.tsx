"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = true, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl glass-card",
        hover && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function GlassCardStatic({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl glass", className)}>
      {children}
    </div>
  );
}
