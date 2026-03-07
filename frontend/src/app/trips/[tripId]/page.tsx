"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tripsApi, daysApi, routesApi } from "@/lib/api";
import type { Trip, Day, Route, RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { DayBlock } from "@/components/DayBlock";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
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
  const [dateInput, setDateInput] = useState(todayStr());
  const [payment, setPayment] = useState<PaymentMethod>("ETC");
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"detail" | "split">("detail");
  const swipeStartX = useRef<number | null>(null);
  const updateRouteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<
    Map<string, { dayId: string; routeId: string; field: string; value: string }>
  >(new Map());

  const mergeRouteKeepingLocalInputs = useCallback(
    (current: Route, updated: Route) => ({
      ...updated,
      origin: current.origin,
      destination: current.destination,
      departure_time: current.departure_time,
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
    // trip?.id で「どの旅行か」を追跡しており、trip オブジェクト全体は意図的に省略
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
    (routeId: string, field: string, value: string) => {
      const day = days.find((d) =>
        (routesByDayId[d.id] ?? []).some((r) => r.id === routeId)
      );
      if (!day) return;

      // 1. 楽観的更新: 入力内容を即座に表示（入力ずれ防止）
      setRoutesByDayId((prev) => ({
        ...prev,
        [day.id]: (prev[day.id] ?? []).map((r) =>
          r.id === routeId ? { ...r, [field]: value } : r
        ),
      }));

      // 2. 出発時刻は即時 API 送信（選択なのでデバウンス不要）
      if (field === "departure_time") {
        const payload: Record<string, unknown> = { departure_time: value };
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
              <p className="text-muted">旅行が見つかりません</p>
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
            <ThemeToggle />
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
        <Card className="mb-4 flex items-center gap-3">
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
          <div className="py-12 text-center text-sm text-muted">
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

        <Card className="mb-5">
          <Label>日付を追加</Label>
          <div className="mt-2 flex gap-3">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="flex-1 rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
            />
            <Button onClick={addDay} variant="primary" className="shrink-0">
              追加
            </Button>
          </div>
        </Card>

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
