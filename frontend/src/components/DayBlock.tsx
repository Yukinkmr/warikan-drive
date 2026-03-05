"use client";

import type { Day, Route, RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { RouteCard } from "@/components/RouteCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function DayBlock({
  day,
  routes,
  payment,
  segmentsByRouteId,
  loadingRouteId,
  includeRouteIds,
  onUpdateRoute,
  onAddRoute,
  onRemoveRoute,
  onSearchRoute,
  onSelectSeg,
  onToggleInclude,
  onRemoveDay,
}: {
  day: Day;
  routes: Route[];
  payment: PaymentMethod;
  segmentsByRouteId: Record<string, RouteSegment[]>;
  loadingRouteId: string | null;
  includeRouteIds: string[];
  onUpdateRoute: (routeId: string, field: string, value: string) => void;
  onAddRoute: () => void;
  onRemoveRoute: (routeId: string) => void;
  onSearchRoute: (routeId: string) => void;
  onSelectSeg: (routeId: string, segmentId: string) => void;
  onToggleInclude: (routeId: string) => void;
  onRemoveDay: () => void;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <span className="text-[15px] font-bold text-text">{day.date}</span>
          <span className="text-xs text-muted">{routes.length}ルート</span>
        </div>
        <button
          type="button"
          onClick={onRemoveDay}
          className="border-none bg-transparent text-red cursor-pointer text-base"
        >
          🗑
        </button>
      </div>
      {routes.map((r, i) => (
        <RouteCard
          key={r.id}
          route={r}
          idx={i}
          payment={payment}
          segments={segmentsByRouteId[r.id] ?? []}
          loading={loadingRouteId === r.id}
          dayDate={day.date}
          onUpdate={onUpdateRoute}
          onRemove={
            routes.length > 1
              ? () => onRemoveRoute(r.id)
              : null
          }
          onSearch={() => onSearchRoute(r.id)}
          onSelectSeg={(segId) => onSelectSeg(r.id, segId)}
          selected={includeRouteIds.includes(r.id)}
          onToggle={() => onToggleInclude(r.id)}
        />
      ))}
      <button
        type="button"
        onClick={onAddRoute}
        className="w-full rounded-[10px] border-2 border-dashed border-border bg-transparent py-2.5 font-semibold text-[13px] text-muted transition hover:border-accent hover:text-accent"
      >
        ＋ ルートを追加
      </button>
    </div>
  );
}
