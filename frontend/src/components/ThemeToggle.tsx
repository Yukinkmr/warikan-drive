"use client";

import { useId } from "react";
import { Moon, Sun } from "lucide-react";
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
        <span className="theme-switch__thumb" aria-hidden />
        <span className="theme-switch__slot theme-switch__slot--sun" aria-hidden>
          <Sun className="theme-switch__icon theme-switch__icon--sun" strokeWidth={1.9} />
        </span>
        <span className="theme-switch__slot theme-switch__slot--moon" aria-hidden>
          <Moon className="theme-switch__icon theme-switch__icon--moon" strokeWidth={1.9} />
        </span>
        <span className="theme-switch__text">テーマ</span>
      </label>
    </div>
  );
}
