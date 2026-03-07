"use client";

import { useState } from "react";
import type { Route, RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RouteMap } from "@/components/RouteMap";
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
      className={`rounded-card border bg-card p-4 shadow-card transition-all ${
        selected ? "border-accent shadow-glow" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-accentDim px-2.5 py-1 text-xs font-semibold text-accent">
            ルート {idx + 1}
          </span>
          {selSeg && (
            <span className="rounded-full bg-greenDim px-2.5 py-1 text-[11px] font-medium text-green">
              ✓ {selSeg.distance_km} km · {formatYen(toll)}
            </span>
          )}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-muted transition-colors hover:bg-red/10 hover:text-red"
            aria-label="ルートを削除"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="出発地（例：筑波大学）"
          value={route.origin}
          onChange={(e) => onUpdate(route.id, "origin", e.target.value)}
          className="w-full rounded-[10px] border border-border bg-inputBg px-3 py-2.5 text-sm text-text transition-colors placeholder:text-muted focus:border-accent"
        />
        <input
          type="text"
          placeholder="目的地（例：東京駅）"
          value={route.destination}
          onChange={(e) => onUpdate(route.id, "destination", e.target.value)}
          className="w-full rounded-[10px] border border-border bg-inputBg px-3 py-2.5 text-sm text-text transition-colors placeholder:text-muted focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-label">⏰ 出発時刻</span>
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
            className="w-[120px] rounded-[10px] border border-border bg-inputBg px-3 py-2.5 text-sm text-text transition-colors focus:border-accent"
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
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
        <RouteMap
          origin={route.origin}
          originLat={route.origin_lat}
          originLng={route.origin_lng}
          destination={route.destination}
          destLat={route.dest_lat}
          destLng={route.dest_lng}
          segments={segments}
          selectedId={route.selected_segment_id}
          payment={payment}
          onSelect={(id) => {
            onSelectSeg(id);
          }}
        />
      )}
      {selSeg && (
        <a
          href={`https://www.google.com/maps/dir/${encodeURIComponent(route.origin)}/${encodeURIComponent(route.destination)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center text-xs font-medium text-accent no-underline transition-colors hover:underline"
        >
          🗺 Google Maps でナビ →
        </a>
      )}
    </div>
  );
}
