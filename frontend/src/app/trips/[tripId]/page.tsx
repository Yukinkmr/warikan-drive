"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tripsApi, daysApi, routesApi } from "@/lib/api";
import type { Trip, Day, Route, RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { RouteCard } from "@/components/RouteCard";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SplitView } from "@/app/trips/[tripId]/SplitView";
import { useAuth } from "@/contexts/AuthContext";
import { todayStr } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 60;

type PageProps = { params: Promise<{ tripId: string }> };

export default function TripDetailPage({ params }: PageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("ETC");
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"detail" | "split">("detail");
  const swipeStartX = useRef<number | null>(null);
  const updateRouteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<
    Map<string, { dayId: string; routeId: string; field: string; value: string | boolean }>
  >(new Map());

  const mergeRouteKeepingLocalInputs = useCallback(
    (current: Route, updated: Route) => ({
      ...updated,
      origin: current.origin,
      destination: current.destination,
      departure_time: current.departure_time,
      time_type: current.time_type,
      use_highways: current.use_highways,
      use_tolls: current.use_tolls,
    }),
    []
  );

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
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!tripId) return;
    loadTrip().then(() => setLoading(false));
  }, [authLoading, user, router, tripId, loadTrip]);

  useEffect(() => {
    if (!user || !tripId || !trip) return;
    loadDays();
    // trip?.id で「どのプランか」を追跡しており、trip オブジェクト全体は意図的に省略
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tripId, trip?.id, loadDays]);

  useEffect(() => {
    return () => {
      if (updateRouteDebounceRef.current) {
        clearTimeout(updateRouteDebounceRef.current);
      }
    };
  }, []);

  const updateRoute = useCallback(
    (routeId: string, field: string, value: string | boolean) => {
      const day = days.find((d) =>
        (routesByDayId[d.id] ?? []).some((r) => r.id === routeId)
      );
      if (!day) return;

      if (field === "day_date" && typeof value === "string") {
        const currentRoutes = routesByDayId[day.id] ?? [];
        setDays((prev) =>
          prev.map((d) => (d.id === day.id ? { ...d, date: value } : d))
        );
        setRoutesByDayId((prev) => ({
          ...prev,
          [day.id]: (prev[day.id] ?? []).map((r) => {
            if (!r.departure_time) return r;
            const time = new Date(r.departure_time).toTimeString().slice(0, 5);
            return {
              ...r,
              departure_time: `${value}T${time}:00+09:00`,
            };
          }),
        }));

        daysApi
          .update(tripId, day.id, { date: value })
          .then((updatedDay) => {
            setDays((prev) =>
              prev.map((d) => (d.id === day.id ? updatedDay : d))
            );
          })
          .catch(() => {});

        currentRoutes.forEach((r) => {
          if (!r.departure_time) return;
          const time = new Date(r.departure_time).toTimeString().slice(0, 5);
          routesApi.update(day.id, r.id, {
            departure_time: `${value}T${time}:00+09:00`,
          }).catch(() => {});
        });
        return;
      }

      // 1. 楽観的更新: 入力内容を即座に表示（入力ずれ防止）
      setRoutesByDayId((prev) => ({
        ...prev,
        [day.id]: (prev[day.id] ?? []).map((r) =>
          r.id === routeId ? { ...r, [field]: value } : r
        ),
      }));

      // 2. 出発/到着時刻設定は即時 API 送信（選択なのでデバウンス不要）
      if (
        field === "departure_time" ||
        field === "time_type" ||
        field === "use_highways" ||
        field === "use_tolls"
      ) {
        const payload: Record<string, unknown> =
          field === "departure_time"
            ? { departure_time: value }
            : field === "time_type"
              ? { time_type: value }
              : field === "use_highways"
                ? { use_highways: value }
                : { use_tolls: value };
        routesApi
          .update(day.id, routeId, payload as any)
          .then((updated) => {
            setRoutesByDayId((prev) => ({
              ...prev,
              [day.id]: (prev[day.id] ?? []).map((r) =>
                r.id === routeId ? mergeRouteKeepingLocalInputs(r, updated) : r
              ),
            }));
          })
          .catch(() => {});
        return;
      }

      // 3. 出発地・目的地はデバウンスしてから API 送信
      const key = `${day.id}:${routeId}:${field}`;
      pendingUpdatesRef.current.set(key, {
        dayId: day.id,
        routeId,
        field,
        value,
      });
      if (updateRouteDebounceRef.current) {
        clearTimeout(updateRouteDebounceRef.current);
      }
      updateRouteDebounceRef.current = setTimeout(() => {
        updateRouteDebounceRef.current = null;
        const pending = new Map(pendingUpdatesRef.current);
        pendingUpdatesRef.current.clear();
        pending.forEach((p) => {
          const payload: Record<string, unknown> = { [p.field]: p.value };
          routesApi
            .update(p.dayId, p.routeId, payload as any)
            .then((updated) => {
              setRoutesByDayId((prev) => ({
                ...prev,
                [p.dayId]: (prev[p.dayId] ?? []).map((r) =>
                  r.id === p.routeId ? mergeRouteKeepingLocalInputs(r, updated) : r
                ),
              }));
            })
            .catch(() => {});
        });
      }, 400);
    },
    [days, routesByDayId, mergeRouteKeepingLocalInputs]
  );

  const addRoute = useCallback(
    async () => {
      if (!tripId) return;
      setIsAddingRoute(true);
      try {
        const newDay = await daysApi.create(tripId, { date: todayStr() });
        const newRoute = await routesApi.create(newDay.id, {
          origin: "",
          destination: "",
        });
        setDays((prev) => [...prev, newDay]);
        setRoutesByDayId((prev) => ({
          ...prev,
          [newDay.id]: [newRoute],
        }));
      } catch {
        // ignore
      } finally {
        setIsAddingRoute(false);
      }
    },
    [tripId]
  );

  const removeRoute = useCallback(
    async (dayId: string, routeId: string) => {
      const dayRoutes = routesByDayId[dayId] ?? [];
      const route = dayRoutes.find((r) => r.id === routeId);
      const day = days.find((d) => d.id === dayId);
      if (!route || !day) return;

      const savedSegments = segmentsByRouteId[routeId] ?? [];
      const wasIncluded = includeRouteIds.includes(routeId);

      // 即時UIから消す
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

      try {
        if (dayRoutes.length <= 1 && tripId) {
          await daysApi.delete(tripId, dayId);
          setDays((prev) => prev.filter((d) => d.id !== dayId));
          setRoutesByDayId((prev) => {
            const next = { ...prev };
            delete next[dayId];
            return next;
          });
        } else {
          await routesApi.delete(dayId, routeId);
        }
      } catch {
        // 失敗時はロールバック
        setRoutesByDayId((prev) => ({
          ...prev,
          [dayId]: [...(prev[dayId] ?? []), route].sort((a, b) =>
            a.created_at.localeCompare(b.created_at)
          ),
        }));
        setSegmentsByRouteId((prev) => ({ ...prev, [routeId]: savedSegments }));
        if (wasIncluded) {
          setIncludeRouteIds((ids) => [...ids, routeId]);
        }
        if (dayRoutes.length <= 1) {
          setDays((prev) => {
            if (prev.some((d) => d.id === dayId)) return prev;
            return [...prev, day].sort((a, b) => a.date.localeCompare(b.date));
          });
        }
      }
    },
    [days, includeRouteIds, routesByDayId, segmentsByRouteId, tripId]
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
          time_type: route.time_type ?? "DEPARTURE",
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

      // 楽観的更新
      setRoutesByDayId((prev) => ({
        ...prev,
        [day.id]: (prev[day.id] ?? []).map((r) =>
          r.id === routeId ? { ...r, is_include_split: nextInclude } : r
        ),
      }));
      setIncludeRouteIds((ids) =>
        nextInclude ? [...ids, routeId] : ids.filter((id) => id !== routeId)
      );
      try {
        await routesApi.update(day.id, routeId, {
          is_include_split: nextInclude,
        });
      } catch {
        // ロールバック
        setRoutesByDayId((prev) => ({
          ...prev,
          [day.id]: (prev[day.id] ?? []).map((r) =>
            r.id === routeId ? { ...r, is_include_split: !nextInclude } : r
          ),
        }));
        setIncludeRouteIds((ids) =>
          !nextInclude ? [...ids, routeId] : ids.filter((id) => id !== routeId)
        );
      }
    },
    [days, routesByDayId]
  );

  const allRoutes = days.flatMap((d) => routesByDayId[d.id] ?? []);
  const routeCards = days
    .flatMap((day) =>
      (routesByDayId[day.id] ?? []).map((route, index) => ({
        day,
        route,
        index,
      }))
    )
    .sort((a, b) => {
      const dateCompare = a.day.date.localeCompare(b.day.date);
      if (dateCompare !== 0) return dateCompare;
      return a.route.created_at.localeCompare(b.route.created_at);
    });
  const selCount = includeRouteIds.filter((id) =>
    allRoutes.find((r) => r.id === id && r.selected_segment_id)
  ).length;

  if (authLoading || (!user && !trip)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-bg p-4 text-text">
        <div className="w-full max-w-app text-center md:max-w-app-md">
          <p className="text-muted">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading || !trip) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-bg p-4 text-text">
        <div className="w-full max-w-app text-center md:max-w-app-md">
          {loading ? (
            <p className="text-muted">読み込み中…</p>
          ) : (
            <div>
              <p className="text-muted">プランが見つかりません</p>
              <Link href="/" className="text-accent mt-2 inline-block hover:underline">
                トップへ
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-bg text-text md:flex md:justify-center">
      <div className="mx-auto w-full min-w-0 max-w-app md:max-w-app-md lg:max-w-app-lg xl:max-w-app-xl">
        <header
          className="border-b border-white/10 px-4 pt-5 pb-0 sm:px-5 sm:pt-6 md:px-6 lg:px-8 lg:pt-7"
          style={{ background: "var(--header-bg)" }}
        >
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-medium text-white/80 transition-colors hover:text-white sm:text-sm"
            >
              ← 一覧
            </Link>
            <div className="flex items-center scale-75 origin-center sm:scale-90">
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 sm:mt-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl sm:h-11 sm:w-11 md:h-12 md:w-12 md:text-2xl">
              🚗
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                Trip
              </p>
              <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
                {trip.name}
              </h1>
              <p className="mt-0.5 text-xs text-white/70 sm:text-sm">ルート管理</p>
            </div>
          </div>
          <nav className="mt-4 flex sm:mt-5" role="tablist">
            <button
              type="button"
              onClick={() => setActiveView("detail")}
              className={`flex-1 border-b-2 py-3 text-center text-sm font-medium transition-colors sm:py-3.5 ${
                activeView === "detail"
                  ? "border-white text-white font-semibold"
                  : "border-transparent text-white/60 hover:text-white"
              }`}
              role="tab"
              aria-selected={activeView === "detail"}
            >
              🗺 ルート管理
            </button>
            <button
              type="button"
              onClick={() => setActiveView("split")}
              className={`flex-1 border-b-2 py-3 text-center text-sm font-medium transition-colors sm:py-3.5 ${
                activeView === "split"
                  ? "border-white text-white font-semibold"
                  : "border-transparent text-white/60 hover:text-white"
              }`}
              role="tab"
              aria-selected={activeView === "split"}
            >
              💰 割り勘計算
            </button>
          </nav>
        </header>

        <main
          className="p-4 pb-8 sm:p-5 md:p-6 md:pb-10 lg:p-8 touch-pan-y"
          onTouchStart={(e) => {
            swipeStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = swipeStartX.current;
            if (start == null) return;
            const end = e.changedTouches[0]?.clientX ?? start;
            const diff = start - end;
            if (Math.abs(diff) >= SWIPE_THRESHOLD_PX) {
              if (diff > 0) setActiveView("split");
              else setActiveView("detail");
            }
            swipeStartX.current = null;
          }}
        >
        {activeView === "split" ? (
          <SplitView tripId={tripId} />
        ) : (
          <>
        

        {routeCards.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">
            まずルートを追加してください
          </div>
        )}

        <div className="space-y-3">
          {routeCards.map((item) => (
            <RouteCard
              key={item.route.id}
              route={item.route}
              idx={item.index}
              payment={payment}
              segments={segmentsByRouteId[item.route.id] ?? []}
              loading={loadingRouteId === item.route.id}
              dayDate={item.day.date}
              onUpdate={updateRoute}
              onUpdateDate={(routeId: string, value: string) =>
                updateRoute(routeId, "day_date", value)
              }
              onRemove={() => removeRoute(item.day.id, item.route.id)}
              onSearch={() => searchRoute(item.day.id, item.route.id)}
              onSelectSeg={(segId: string) => selectSeg(item.route.id, segId)}
              selected={includeRouteIds.includes(item.route.id)}
              onToggle={() => toggleInclude(item.route.id)}
              onPaymentChange={(nextPayment: PaymentMethod) => {
                setPayment(nextPayment);
                tripsApi.update(tripId, { payment_method: nextPayment }).then(loadTrip);
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addRoute}
          disabled={isAddingRoute}
          className="mt-4 mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-transparent py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:bg-accentDim/20 hover:text-accent disabled:pointer-events-none disabled:opacity-60"
        >
          {isAddingRoute ? (
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted/30 border-t-muted" aria-hidden />
          ) : (
            <span>＋</span>
          )}
          {isAddingRoute ? "追加中…" : "ルートを追加"}
        </button>

        <Button
          onClick={() => setActiveView("split")}
          disabled={selCount === 0}
          variant="primary"
          className="w-full py-3.5 text-sm sm:max-w-md"
        >
          {selCount > 0
            ? `${selCount}ルートで割り勘計算 →`
            : "経路を選択し「割り勘に含む」を設定してください"}
        </Button>
          </>
        )}
        </main>
      </div>
    </div>
  );
}
