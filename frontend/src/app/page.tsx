"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tripsApi, daysApi, routesApi } from "@/lib/api";
import type { Trip } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";

const DEFAULT_OWNER_ID = "00000000-0000-0000-0000-000000000001";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadTrips = () => {
    tripsApi
      .list()
      .then((r) => setTrips(r.trips))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    tripsApi
      .list()
      .then((r) => setTrips(r.trips))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateTrip = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const trip = await tripsApi.create({
        name: "新しい旅行",
        payment_method: "ETC",
        fuel_efficiency: 15,
        gas_price: 170,
        driver_weight: 0.5,
        owner_id: DEFAULT_OWNER_ID,
      });
      const day = await daysApi.create(trip.id, { date: todayStr() });
      await routesApi.create(day.id, { origin: "", destination: "" });
      setShowNewTripModal(false);
      setCreating(false);
      loadTrips();
      router.push(`/trips/${trip.id}`);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "作成に失敗しました。";
      setCreateError(msg);
      setCreating(false);
    }
  };

  const openNewTripModal = () => {
    setCreateError(null);
    setShowNewTripModal(true);
    handleCreateTrip();
  };

  useEffect(() => {
    if (!showNewTripModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creating) setShowNewTripModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNewTripModal, creating]);

  return (
    <div className="min-h-screen w-full min-w-0 bg-bg text-text md:flex md:justify-center">
      <div className="mx-auto w-full min-w-0 max-w-app md:max-w-app-md lg:max-w-app-lg xl:max-w-app-xl">
        <header
          className="border-b border-white/10 px-4 pt-5 pb-0 sm:px-5 sm:pt-6 md:px-6 lg:px-8 lg:pt-7"
          style={{ background: "var(--header-bg)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl sm:h-11 sm:w-11 md:h-12 md:w-12 md:text-2xl">
                🚗
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl md:text-[1.65rem]">
                  割り勘ドライブ
                </h1>
                <p className="mt-0.5 text-xs text-white/70 sm:text-sm">
                  経路検索 · ETC対応 · 傾斜計算
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="p-4 pb-8 sm:p-5 md:p-6 md:pb-10 lg:p-8">
          <section className="mb-5 md:mb-6">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted sm:text-xs">
              旅行一覧
            </h2>
            <div className="rounded-card border border-border bg-card p-4 shadow-card sm:p-5 md:p-6">
              {loading ? (
                <p className="py-6 text-center text-sm text-muted md:py-8">読み込み中…</p>
              ) : trips.length === 0 ? (
                <p className="py-6 text-center text-sm leading-relaxed text-muted md:py-8">
                  まだ旅行がありません
                  <br />
                  下のボタンから新規作成してください
                </p>
              ) : (
                <ul className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                  {trips.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/trips/${t.id}`}
                        className="block rounded-[10px] border border-border bg-surface/80 p-3.5 transition-colors hover:border-accent/50 hover:bg-surface sm:p-4"
                      >
                        <span className="font-medium text-text">{t.name}</span>
                        <span className="mt-1 block text-xs text-muted">
                          {t.payment_method} · {t.fuel_efficiency} km/L
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <button
            type="button"
            onClick={openNewTripModal}
            className="flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-border bg-transparent py-3.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent hover:bg-accentDim/30 sm:py-4 md:max-w-xs"
          >
            <span className="text-base">＋</span>
            新しい旅行を作成
          </button>
        </main>

      </div>

      {showNewTripModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:p-6"
          onClick={() => !creating && setShowNewTripModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-trip-modal-title"
        >
          <div
            className="w-full max-w-sm rounded-card-lg border border-border bg-card p-6 shadow-2xl sm:max-w-md sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="new-trip-modal-title" className="sr-only">
              新しい旅行を作成
            </h2>
            {creating && !createError && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <p className="text-sm text-muted">作成中…</p>
              </div>
            )}
            {createError && (
              <>
                <p className="mb-5 text-center text-sm leading-relaxed text-red">
                  {createError}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewTripModal(false)}
                    className="flex-1 rounded-[10px] border border-border bg-surface py-2.5 text-sm font-medium text-label transition-colors hover:bg-border/50"
                  >
                    閉じる
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateTrip}
                    className="flex-1 rounded-[10px] border border-accent bg-accentDim py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accentDim/80"
                  >
                    再試行
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
