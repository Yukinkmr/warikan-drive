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
        "rounded-[10px] border px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150",
        disabled && "cursor-not-allowed border-border bg-surface text-muted opacity-70",
        !disabled && variant === "primary" && "border-transparent bg-accent text-white shadow-glow hover:opacity-95 active:scale-[0.98]",
        !disabled && variant === "ghost" && "border-border bg-surface text-label hover:bg-border/50 hover:border-border",
        !disabled && variant === "green" && "border-transparent bg-green text-white hover:opacity-95 active:scale-[0.98]",
        !disabled && variant === "danger" && "border-red bg-red/10 text-red hover:bg-red/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
