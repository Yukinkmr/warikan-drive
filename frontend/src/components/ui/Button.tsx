"use client";

import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "green" | "danger";

export function Button({
  onClick,
  children,
  disabled,
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-semibold tracking-tight transition-all duration-200 ease-out",
        disabled && "cursor-not-allowed border-border bg-surface text-muted opacity-70",
        !disabled && variant === "primary" && "border-transparent bg-accent text-white shadow-glow hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]",
        !disabled && variant === "ghost" && "border-border bg-surface text-label hover:scale-[1.02] hover:bg-border/50 hover:border-border active:scale-[0.98]",
        !disabled && variant === "green" && "border-transparent bg-green text-white hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]",
        !disabled && variant === "danger" && "border-red bg-red/10 text-red hover:scale-[1.02] hover:bg-red/20 active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
