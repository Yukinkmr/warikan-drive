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
        "rounded-[10px] border px-4 py-2.5 text-[13px] font-bold transition",
        disabled && "cursor-default border-border bg-surface text-muted",
        !disabled && variant === "primary" && "border-transparent bg-gradient-to-br from-accent to-[#7b5dff] text-white shadow-[var(--glow)]",
        !disabled && variant === "ghost" && "border-border bg-surface text-label",
        !disabled && variant === "green" && "border-transparent bg-green text-white",
        !disabled && variant === "danger" && "border-red bg-[#2d1010] text-red",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
