"use client";

import { useState } from "react";
import type { Route, RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SegmentSelector } from "@/components/SegmentSelector";
import { formatYen } from "@/lib/utils";

export function RouteCard({
  route,
  idx,
  payment,
  segments,
  loading,
  dayDate,
  onUpdate,
  onRemove,
  onSearch,
  onSelectSeg,
  selected,
  onToggle,
}: {
  route: Route;
  idx: number;
  payment: PaymentMethod;
  segments: RouteSegment[];
  loading: boolean;
  dayDate: string;
  onUpdate: (routeId: string, field: string, value: string) => void;
  onRemove: (() => void) | null;
  onSearch: () => void;
  onSelectSeg: (segmentId: string) => void;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selSeg = segments.find((s) => s.id === route.selected_segment_id);
  const toll = selSeg
    ? payment === "ETC"
      ? selSeg.toll_etc_yen
      : selSeg.toll_cash_yen
    : 0;

  const departureTime =
    route.departure_time != null
      ? new Date(route.departure_time).toTimeString().slice(0, 5)
      : "09:00";

  return (
    <div
      className={`mb-2.5 rounded-[14px] border p-4 transition ${
        selected ? "border-accent shadow-[var(--glow)]" : "border-border"
      } bg-card`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-accentDim px-2.5 py-0.5 text-xs font-bold text-accent">
            ルート {idx + 1}
          </span>
          {selSeg && (
            <span className="rounded-full bg-greenDim px-2 py-0.5 text-[11px] text-green">
              ✓ {selSeg.distance_km}km · {formatYen(toll)}
            </span>
          )}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="border-none bg-transparent text-red text-base cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
      <div className="mb-2 flex flex-col gap-1.5">
        <input
          type="text"
          placeholder="出発地（例：筑波大学）"
          value={route.origin}
          onChange={(e) => onUpdate(route.id, "origin", e.target.value)}
          className="w-full rounded-[10px] border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <input
          type="text"
          placeholder="目的地（例：東京駅）"
          value={route.destination}
          onChange={(e) => onUpdate(route.id, "destination", e.target.value)}
          className="w-full rounded-[10px] border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs text-label">⏰ 出発時刻</span>
          <input
            type="time"
            value={departureTime}
            onChange={(e) =>
              onUpdate(
                route.id,
                "departure_time",
                `${dayDate}T${e.target.value}:00+09:00`
              )
            }
            className="w-[120px] rounded-[10px] border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          onClick={onSearch}
          disabled={!route.origin || !route.destination || loading}
          variant="ghost"
          className="flex-1 text-xs"
        >
          {loading
            ? "検索中…"
            : segments.length > 0
              ? "🔄 再検索"
              : "🔍 経路を検索"}
        </Button>
        {segments.length > 0 && (
          <Button
            onClick={() => setOpen((o) => !o)}
            variant="ghost"
            className="flex-1 text-xs"
          >
            {open ? "▲ 閉じる" : "▼ 経路を選ぶ"}
          </Button>
        )}
        {selSeg && (
          <Button
            onClick={onToggle}
            variant="ghost"
            className={`flex-1 text-xs ${selected ? "border-accent text-accent" : ""}`}
          >
            {selected ? "✓ 含む" : "割り勘に含む"}
          </Button>
        )}
      </div>
      {open && segments.length > 0 && (
        <SegmentSelector
          segments={segments}
          selectedId={route.selected_segment_id}
          payment={payment}
          onSelect={(id) => {
            onSelectSeg(id);
            setOpen(false);
          }}
        />
      )}
      {selSeg && (
        <a
          href={`https://www.google.com/maps/dir/${encodeURIComponent(route.origin)}/${encodeURIComponent(route.destination)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs text-accent no-underline"
        >
          🗺 Google Maps でナビ →
        </a>
      )}
    </div>
  );
}
