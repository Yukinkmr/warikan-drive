"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { tripsApi, daysApi, routesApi } from "@/lib/api";
import type { Trip, Day, Route, RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { DayBlock } from "@/components/DayBlock";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { todayStr } from "@/lib/utils";

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [routesByDayId, setRoutesByDayId] = useState<Record<string, Route[]>>(
    {}
  );
  const [segmentsByRouteId, setSegmentsByRouteId] = useState<
    Record<string, RouteSegment[]>
  >({});
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null);
  const [includeRouteIds, setIncludeRouteIds] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState(todayStr());
  const [payment, setPayment] = useState<PaymentMethod>("ETC");
  const [loading, setLoading] = useState(true);

  const loadTrip = useCallback(async () => {
    try {
      const t = await tripsApi.get(tripId);
      setTrip(t);
      setPayment((t.payment_method as PaymentMethod) || "ETC");
    } catch {
      setTrip(null);
    }
  }, [tripId]);

  const loadDays = useCallback(async () => {
    if (!tripId) return;
    try {
      const list = await daysApi.list(tripId);
      setDays(list);
      const nextRoutes: Record<string, Route[]> = {};
      const nextSegments: Record<string, RouteSegment[]> = {};
      for (const d of list) {
        const routes = await routesApi.list(d.id);
        nextRoutes[d.id] = routes;
        for (const r of routes) {
          if (r.selected_segment_id) {
            try {
              const { segments } = await routesApi.listSegments(r.id);
              nextSegments[r.id] = segments;
            } catch {
              // ignore
            }
          }
        }
      }
      setRoutesByDayId(nextRoutes);
      setSegmentsByRouteId((prev) => ({ ...prev, ...nextSegments }));
      setIncludeRouteIds((_) =>
        Object.values(nextRoutes).flat().filter((r) => r.is_include_split).map((r) => r.id)
      );
    } catch {
      setDays([]);
    }
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    loadTrip().then(() => setLoading(false));
  }, [tripId, loadTrip]);

  useEffect(() => {
    if (!tripId || !trip) return;
    loadDays();
  }, [tripId, trip?.id, loadDays]);

  const updateRoute = useCallback(
    async (routeId: string, field: string, value: string) => {
      const day = days.find((d) =>
        (routesByDayId[d.id] ?? []).some((r) => r.id === routeId)
      );
      if (!day) return;
      const route = (routesByDayId[day.id] ?? []).find((r) => r.id === routeId);
      if (!route) return;
      const payload: Record<string, unknown> = { [field]: value };
      if (field === "departure_time") payload.departure_time = value;
      try {
        const updated = await routesApi.update(day.id, routeId, payload as any);
        setRoutesByDayId((prev) => ({
          ...prev,
          [day.id]: (prev[day.id] ?? []).map((r) =>
            r.id === routeId ? updated : r
          ),
        }));
      } catch {
        // ignore
      }
    },
    [days, routesByDayId]
  );

  const addRoute = useCallback(
    async (dayId: string) => {
      try {
        const newRoute = await routesApi.create(dayId, {
          origin: "",
          destination: "",
        });
        setRoutesByDayId((prev) => ({
          ...prev,
          [dayId]: [...(prev[dayId] ?? []), newRoute],
        }));
      } catch {
        // ignore
      }
    },
    []
  );

  const removeRoute = useCallback(
    async (dayId: string, routeId: string) => {
      try {
        await routesApi.delete(dayId, routeId);
        setRoutesByDayId((prev) => ({
          ...prev,
          [dayId]: (prev[dayId] ?? []).filter((r) => r.id !== routeId),
        }));
        setIncludeRouteIds((ids) => ids.filter((id) => id !== routeId));
        setSegmentsByRouteId((prev) => {
          const next = { ...prev };
          delete next[routeId];
          return next;
        });
      } catch {
        // ignore
      }
    },
    []
  );

  const searchRoute = useCallback(
    async (dayId: string, routeId: string) => {
      const route = (routesByDayId[dayId] ?? []).find((r) => r.id === routeId);
      if (!route || !trip) return;
      const dep =
        route.departure_time ??
        `${days.find((d) => d.id === dayId)?.date ?? todayStr()}T09:00:00+09:00`;
      setLoadingRouteId(routeId);
      try {
        const { segments } = await routesApi.search(routeId, {
          departure_time: dep,
          payment_method: trip.payment_method,
        });
        setSegmentsByRouteId((prev) => ({ ...prev, [routeId]: segments }));
        if (segments.length > 0) {
          const updated = await routesApi.selectSegment(routeId, segments[0].id);
          setRoutesByDayId((prev) => ({
            ...prev,
            [dayId]: (prev[dayId] ?? []).map((r) =>
              r.id === routeId ? updated : r
            ),
          }));
        }
      } catch {
        // ignore
      } finally {
        setLoadingRouteId(null);
      }
    },
    [trip, days, routesByDayId]
  );

  const selectSeg = useCallback(
    async (routeId: string, segmentId: string) => {
      const day = days.find((d) =>
        (routesByDayId[d.id] ?? []).some((r) => r.id === routeId)
      );
      if (!day) return;
      try {
        const updated = await routesApi.selectSegment(routeId, segmentId);
        setRoutesByDayId((prev) => ({
          ...prev,
          [day.id]: (prev[day.id] ?? []).map((r) =>
            r.id === routeId ? updated : r
          ),
        }));
      } catch {
        // ignore
      }
    },
    [days, routesByDayId]
  );

  const toggleInclude = useCallback(
    async (routeId: string) => {
      const day = days.find((d) =>
        (routesByDayId[d.id] ?? []).some((r) => r.id === routeId)
      );
      if (!day) return;
      const route = (routesByDayId[day.id] ?? []).find((r) => r.id === routeId);
      if (!route) return;
      const nextInclude = !route.is_include_split;
      try {
        await routesApi.update(day.id, routeId, {
          is_include_split: nextInclude,
        });
        setRoutesByDayId((prev) => ({
          ...prev,
          [day.id]: (prev[day.id] ?? []).map((r) =>
            r.id === routeId ? { ...r, is_include_split: nextInclude } : r
          ),
        }));
        setIncludeRouteIds((ids) =>
          nextInclude ? [...ids, routeId] : ids.filter((id) => id !== routeId)
        );
      } catch {
        // ignore
      }
    },
    [days, routesByDayId]
  );

  const addDay = useCallback(async () => {
    if (!tripId) return;
    try {
      const newDay = await daysApi.create(tripId, { date: dateInput });
      setDays((prev) => [...prev, newDay]);
      const firstRoute = await routesApi.create(newDay.id, {
        origin: "",
        destination: "",
      });
      setRoutesByDayId((prev) => ({
        ...prev,
        [newDay.id]: [firstRoute],
      }));
    } catch {
      // ignore
    }
  }, [tripId, dateInput]);

  const removeDay = useCallback(
    async (dayId: string) => {
      if (!tripId) return;
      const dayRoutes = routesByDayId[dayId] ?? [];
      try {
        await daysApi.delete(tripId, dayId);
        setDays((prev) => prev.filter((d) => d.id !== dayId));
        setIncludeRouteIds((ids) =>
          ids.filter((id) => !dayRoutes.some((r) => r.id === id))
        );
        setRoutesByDayId((prev) => {
          const next = { ...prev };
          delete next[dayId];
          return next;
        });
        setSegmentsByRouteId((prev) => {
          const next = { ...prev };
          dayRoutes.forEach((r) => delete next[r.id]);
          return next;
        });
      } catch {
        // ignore
      }
    },
    [tripId, routesByDayId]
  );

  const allRoutes = days.flatMap((d) => routesByDayId[d.id] ?? []);
  const selCount = includeRouteIds.filter((id) =>
    allRoutes.find((r) => r.id === id && r.selected_segment_id)
  ).length;

  if (loading || !trip) {
    return (
      <div className="max-w-app mx-auto min-h-screen bg-bg text-text flex items-center justify-center p-4">
        {loading ? (
          <p className="text-muted">読み込み中…</p>
        ) : (
          <div>
            <p className="text-muted">旅行が見つかりません</p>
            <Link href="/" className="text-accent mt-2 inline-block">
              トップへ
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-app mx-auto min-h-screen bg-bg text-text">
      <header
        className="border-b border-border px-4 pt-5 pb-0"
        style={{ background: "var(--header-bg)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="text-white/80 text-sm">
            ← 一覧
          </Link>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🚗</span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              {trip.name}
            </h1>
            <p className="text-[11px] text-white/65">ルート管理</p>
          </div>
        </div>
        <div className="mt-4 flex">
          <span className="flex-1 py-2.5 text-center text-[13px] font-bold border-b-2 border-white text-white">
            🗺 ルート管理
          </span>
          <Link
            href={`/trips/${tripId}/split`}
            className="flex-1 py-2.5 text-center text-[13px] font-normal border-b-2 border-transparent text-white/55 hover:text-white transition"
          >
            💰 割り勘計算
          </Link>
        </div>
      </header>

      <main className="p-4">
        <Card className="mb-4 flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-label">
            高速料金
          </span>
          <Pill
            active={payment === "ETC"}
            onClick={() => {
              setPayment("ETC");
              tripsApi.update(tripId, { payment_method: "ETC" }).then(loadTrip);
            }}
          >
            ETC
          </Pill>
          <Pill
            active={payment === "CASH"}
            onClick={() => {
              setPayment("CASH");
              tripsApi.update(tripId, { payment_method: "CASH" }).then(loadTrip);
            }}
          >
            現金
          </Pill>
        </Card>

        {days.length === 0 && (
          <div className="py-10 text-center text-muted">
            下から日付を追加してください
          </div>
        )}

        {days.map((day) => (
          <DayBlock
            key={day.id}
            day={day}
            routes={routesByDayId[day.id] ?? []}
            payment={payment}
            segmentsByRouteId={segmentsByRouteId}
            loadingRouteId={loadingRouteId}
            includeRouteIds={includeRouteIds}
            onUpdateRoute={updateRoute}
            onAddRoute={() => addRoute(day.id)}
            onRemoveRoute={(routeId) => removeRoute(day.id, routeId)}
            onSearchRoute={(routeId) => searchRoute(day.id, routeId)}
            onSelectSeg={selectSeg}
            onToggleInclude={toggleInclude}
            onRemoveDay={() => removeDay(day.id)}
          />
        ))}

        <Card className="mb-4">
          <Label>日付を追加</Label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="flex-1 rounded-[10px] border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none"
            />
            <Button onClick={addDay} variant="primary" className="py-2">
              追加
            </Button>
          </div>
        </Card>

        <Link href={`/trips/${tripId}/split`}>
          <Button
            disabled={selCount === 0}
            variant="primary"
            className="w-full py-3.5 text-[15px]"
          >
            {selCount > 0
              ? `${selCount}ルートで割り勘計算 →`
              : "経路を選択・「割り勘に含む」を設定してください"}
          </Button>
        </Link>
      </main>
    </div>
  );
}
