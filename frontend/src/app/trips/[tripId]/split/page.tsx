"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tripsApi, daysApi, routesApi } from "@/lib/api";
import type { Trip, Day, Route, RouteSegment } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoadingMessage } from "@/components/ui/LoadingMessage";
import { useAuth } from "@/contexts/AuthContext";
import { SplitView } from "../SplitView";

type PageProps = { params: Promise<{ tripId: string }> };

export default function SplitPage({ params }: PageProps) {
  const { tripId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [routesByDayId, setRoutesByDayId] = useState<Record<string, Route[]>>({});
  const [segmentsByRouteId, setSegmentsByRouteId] = useState<
    Record<string, RouteSegment[]>
  >({});
  const [loading, setLoading] = useState(true);

  const loadTrip = useCallback(async () => {
    if (!tripId) return;
    try {
      const t = await tripsApi.get(tripId);
      setTrip(t);
    } catch {
      setTrip(null);
    }
  }, [tripId]);

  const loadDays = useCallback(async () => {
    if (!tripId) return;
    try {
      const list = await daysApi.list(tripId);
      setDays(list);
      const routeEntries = await Promise.all(
        list.map(async (day) => [day.id, await routesApi.list(day.id)] as const)
      );
      const nextRoutes = Object.fromEntries(routeEntries);
      const selectedRoutes = routeEntries.flatMap(([, routes]) =>
        routes.filter((route) => route.selected_segment_id)
      );
      const segmentEntries = await Promise.all(
        selectedRoutes.map(async (route) => {
          try {
            const { segments } = await routesApi.listSegments(route.id);
            return [route.id, segments] as const;
          } catch {
            return null;
          }
        })
      );
      const nextSegments = Object.fromEntries(
        segmentEntries.filter(
          (entry): entry is readonly [string, RouteSegment[]] => entry !== null
        )
      );
      setRoutesByDayId(nextRoutes);
      setSegmentsByRouteId((prev) => ({ ...prev, ...nextSegments }));
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
    Promise.all([loadTrip(), loadDays()]).finally(() => setLoading(false));
  }, [authLoading, user, router, tripId, loadTrip, loadDays]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-bg p-4 text-text">
        <div className="w-full max-w-app text-center md:max-w-app-md">
          <LoadingMessage />
        </div>
      </div>
    );
  }

  if (loading || !trip) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-bg p-4 text-text">
        <div className="w-full max-w-app text-center md:max-w-app-md">
          {loading ? (
            <LoadingMessage />
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
          className="border-b border-white/10 px-4 pt-5 pb-5 sm:px-5 sm:pt-6 md:px-6 md:pb-6 lg:px-8 lg:pt-7"
          style={{ background: "var(--header-bg)" }}
        >
          <div className="flex items-center justify-between">
            <Link
              href={`/trips/${tripId}`}
              className="text-xs font-medium text-white/80 transition-colors hover:text-white sm:text-sm"
            >
              ← ルート管理
            </Link>
            <div className="flex items-center scale-75 origin-center sm:scale-90">
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 sm:mt-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl sm:h-11 sm:w-11 md:h-12 md:w-12 md:text-2xl">
              💰
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                割り勘
              </p>
              <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
                {trip.name}
              </h1>
              <p className="mt-0.5 text-xs text-white/70 sm:text-sm">割り勘計算</p>
            </div>
          </div>
        </header>

        <main className="p-4 pb-8 sm:p-5 md:p-6 md:pb-10 lg:p-8">
          <SplitView
          tripId={tripId}
          trip={trip}
          days={days}
          routesByDayId={routesByDayId}
          segmentsByRouteId={segmentsByRouteId}
        />
        </main>
      </div>
    </div>
  );
}
