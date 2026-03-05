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
        "rounded-full border px-4 py-1.5 text-[13px] font-semibold transition",
        active
          ? "border-accent bg-accentDim text-accent"
          : "border-border bg-transparent text-muted",
        className
      )}
    >
      {children}
    </button>
  );
}
