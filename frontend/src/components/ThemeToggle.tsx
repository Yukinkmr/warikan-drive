"use client";

import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { dark, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 text-xs font-medium text-label transition-colors hover:border-label hover:text-text hover:bg-card"
    >
      <span className="text-sm leading-none">{dark ? "☀️" : "🌙"}</span>
      <span>{dark ? "ライト" : "ダーク"}</span>
    </button>
  );
}
