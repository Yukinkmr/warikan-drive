"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tripsApi } from "@/lib/api";
import type { Trip } from "@/types";

export default function HomePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tripsApi
      .list()
      .then((r) => setTrips(r.trips))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-app mx-auto min-h-screen bg-bg text-text">
      <header
        className="border-b border-border px-4 pt-5 pb-0"
        style={{ background: "var(--header-bg)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🚗</span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              割り勘ドライブ
            </h1>
            <p className="text-[11px] text-white/65">
              経路検索 ＋ ETC対応 ＋ 傾斜計算
            </p>
          </div>
        </div>
      </header>

      <main className="p-4">
        <div className="rounded-xl border border-border bg-card p-4 mb-4 shadow-none">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
            旅行一覧
          </p>
          {loading ? (
            <p className="text-sm text-muted">読み込み中…</p>
          ) : trips.length === 0 ? (
            <p className="text-sm text-muted">
              まだ旅行がありません。新規作成してください。
            </p>
          ) : (
            <ul className="space-y-2">
              {trips.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/trips/${t.id}`}
                    className="block rounded-lg border border-border bg-surface p-3 text-label hover:border-accent transition"
                  >
                    <span className="font-semibold text-text">{t.name}</span>
                    <span className="ml-2 text-xs text-muted">
                      {t.payment_method} · {t.fuel_efficiency} km/L
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href="/trips/new"
          className="block w-full rounded-xl border-2 border-dashed border-border bg-transparent py-3 text-center font-semibold text-muted hover:border-accent hover:text-accent transition"
        >
          ＋ 新しい旅行を作成
        </Link>
      </main>
    </div>
  );
}
