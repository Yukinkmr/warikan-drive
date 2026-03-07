"use client";

import { useId } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const id = useId();
  const { dark, toggle } = useTheme();

  return (
    <div className="theme-switch">
      <input
        type="checkbox"
        id={id}
        name="theme-switch"
        className="theme-switch__input"
        checked={dark}
        onChange={toggle}
        aria-label="テーマを切り替え"
      />
      <label htmlFor={id} className="theme-switch__label">
        <span>テーマ</span>
      </label>
    </div>
  );
}
