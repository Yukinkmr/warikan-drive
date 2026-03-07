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
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">📅</span>
          <span className="text-base font-semibold text-text">{day.date}</span>
          <span className="text-xs text-muted">{routes.length} ルート</span>
        </div>
        <button
          type="button"
          onClick={onRemoveDay}
          className="rounded p-1.5 text-muted transition-colors hover:bg-red/10 hover:text-red"
          aria-label="この日を削除"
        >
          ✕
        </button>
      </div>
      <div className="space-y-3">
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
          onUpdateDate={(routeId, value) => onUpdateRoute(routeId, "day_date", value)}
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
      </div>
      <button
        type="button"
        onClick={onAddRoute}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-transparent py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent hover:bg-accentDim/20"
      >
        <span>＋</span>
        ルートを追加
      </button>
    </section>
  );
}
