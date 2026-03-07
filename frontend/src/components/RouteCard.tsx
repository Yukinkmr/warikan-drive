"use client";

import { useState } from "react";
import type { Route, RouteSegment } from "@/types";
import type { PaymentMethod, RouteTimeType } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RouteMap } from "@/components/RouteMap";
import { PlaceInput } from "@/components/PlaceInput";
import { formatYen } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

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
  onSearch: () => void | Promise<void>;
  onSelectSeg: (segmentId: string) => void;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
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
  const timeType: RouteTimeType = route.time_type ?? "DEPARTURE";
  const [selectedHour, selectedMinute] = departureTime.split(":");

  function updateTime(nextHour: string, nextMinute: string) {
    onUpdate(
      route.id,
      "departure_time",
      `${dayDate}T${nextHour}:${nextMinute}:00+09:00`
    );
  }

  async function handleSearch() {
    await Promise.resolve(onSearch());
    setHasSearched(true);
    setOpen(true);
  }

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 shadow-card transition-all ${
        selected ? "border-accent shadow-glow" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-2xl bg-accentDim px-2.5 py-1 text-xs font-semibold text-accent">
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
        <PlaceInput
          placeholder="出発地（例：筑波大学）"
          value={route.origin}
          onChange={(val) => onUpdate(route.id, "origin", val)}
          className="w-full rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent"
        />
        <PlaceInput
          placeholder="目的地（例：東京駅）"
          value={route.destination}
          onChange={(val) => onUpdate(route.id, "destination", val)}
          className="w-full rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-label">⏰ 時刻</span>
          <div className="inline-flex rounded-2xl border border-border bg-inputBg p-1 text-xs">
            <button
              type="button"
              onClick={() => onUpdate(route.id, "time_type", "DEPARTURE")}
              className={`rounded-xl px-2.5 py-1 transition ${
                timeType === "DEPARTURE"
                  ? "bg-accent text-white"
                  : "text-label hover:bg-surface"
              }`}
            >
              出発
            </button>
            <button
              type="button"
              onClick={() => onUpdate(route.id, "time_type", "ARRIVAL")}
              className={`rounded-xl px-2.5 py-1 transition ${
                timeType === "ARRIVAL"
                  ? "bg-accent text-white"
                  : "text-label hover:bg-surface"
              }`}
            >
              到着
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedHour}
              onChange={(e) => updateTime(e.target.value, selectedMinute)}
              className="appearance-none rounded-2xl border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none transition focus:border-accent"
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            時
            <span className="text-sm font-medium text-label">:</span>
            <select
              value={selectedMinute}
              onChange={(e) => updateTime(selectedHour, e.target.value)}
              className="appearance-none rounded-2xl border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none transition focus:border-accent"
            >
              {MINUTES.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </select>
            分
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={handleSearch}
          disabled={!route.origin || !route.destination || loading}
          variant="ghost"
          className="flex-1 text-xs hover:!border-accent hover:!bg-accentDim hover:text-white active:!border-accent active:text-white active:shadow-glow"
        >
          {loading
            ? "検索中…"
            : hasSearched
              ? "🔄 再検索"
              : "🔍 経路を検索"}
        </Button>
        {/* <Button
        onClick={() => setOpen((o) => !o)}
        variant="ghost"
        className={`flex-1 text-xs ${
          open
            ? "text-white shadow-glow hover:bg-accentDim hover:!border-accent hover:text-white hover:shadow-glow"
            : "hover:bg-accentDim hover:text-white hover:shadow-glow hover:!border-accent"
        }`}
        disabled={segments.length === 0}
        >
        {open ? "▲ 閉じる" : "▼ 経路を選ぶ"}
        </Button> */}
        <Button
        onClick={onToggle}
        variant="ghost"
        className={`flex-1 text-xs ${
          selected
            ? "!border-green !bg-green text-white shadow-glow hover:!border-green hover:!bg-green hover:text-white hover:shadow-glow"
            : "hover:bg-greenDim hover:text-white hover:border-green hover:shadow-glow"
        }`}
        disabled={segments.length === 0}
        >
        {selected ? "✓ 割り勘に含む" : "割り勘に含む"}
        </Button>
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
          loading={loading}
          onSelect={(id) => {
            onSelectSeg(id);
          }}
        />
      )}
      {selSeg && (
        <a
          href={`https://www.google.com/maps/dir/${route.origin}/${route.destination}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center text-xs font-medium text-accent no-underline transition-colors hover:underline"
        >
          🗺 Google Maps に移動
        </a>
      )}
    </div>
  );
}
