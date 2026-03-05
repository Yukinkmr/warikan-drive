"use client";

import type { RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { formatYen } from "@/lib/utils";

export function SegmentSelector({
  segments,
  selectedId,
  payment,
  onSelect,
}: {
  segments: RouteSegment[];
  selectedId: string | null;
  payment: PaymentMethod;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {segments.map((s) => {
        const sel = s.id === selectedId;
        const toll = payment === "ETC" ? s.toll_etc_yen : s.toll_cash_yen;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`w-full rounded-[10px] border p-3 text-left transition ${
              sel
                ? "border-accent bg-accentDim shadow-[var(--glow)]"
                : "border-border bg-surface"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[13px] font-bold ${sel ? "text-accent" : "text-text"}`}
              >
                {s.summary || "経路"}
              </span>
              {sel && (
                <span className="text-[11px] text-accent">✓ 選択中</span>
              )}
            </div>
            <div className="mt-1 flex gap-3 text-xs text-label">
              <span>📍 {s.distance_km} km</span>
              <span>⏱ {s.duration_min}分</span>
              <span>
                🛣 {toll === 0 ? "無料" : formatYen(toll)} ({payment})
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
