"use client";

import { cn } from "@/lib/utils";

export function Pill({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-150",
        active
          ? "border-accent bg-accentDim text-accent"
          : "border-border bg-transparent text-muted hover:border-label hover:text-label",
        className
      )}
    >
      {children}
    </button>
  );
}
