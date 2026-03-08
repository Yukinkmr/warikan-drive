"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type LoadingMessageProps = {
  label?: string;
  className?: string;
};

export function LoadingMessage({
  label,
  className,
}: LoadingMessageProps) {
  return (
    <div
      className={cn("inline-flex flex-col items-center justify-center gap-2 text-sm text-muted", className)}
      role="status"
      aria-live="polite"
      aria-label={label ?? "読み込み中"}
    >
      {label ? <span>{label}</span> : null}
      <span className="inline-flex items-end gap-1.5" aria-hidden>
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-2 w-2 rounded-full bg-current"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.55,
              ease: "easeInOut",
              repeat: Infinity,
              delay: index * 0.12,
            }}
          />
        ))}
      </span>
    </div>
  );
}
