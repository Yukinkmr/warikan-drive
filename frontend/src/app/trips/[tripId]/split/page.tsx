"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  tripsApi,
  daysApi,
  routesApi,
  extraCostsApi,
  splitsApi,
} from "@/lib/api";
import type {
  Trip,
  Day,
  Route,
  RouteSegment,
  ExtraCost,
  Split,
} from "@/types";
import type { PaymentMethod } from "@/types";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { formatYen } from "@/lib/utils";

export default function SplitPage() {
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
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>([]);
  const [splitResult, setSplitResult] = useState<Split | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const payment = (trip?.payment_method as PaymentMethod) || "ETC";

  const loadTrip = useCallback(async () => {
    if (!tripId) return;
    try {
      const t = await tripsApi.get(tripId);
      setTrip(t);
    } catch {
      setTrip(null);
    }
  }, [tripId]);

  const loadDaysAndRoutes = useCallback(async () => {
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
          if (r.selected_segment_id && r.is_include_split) {
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
      setSegmentsByRouteId(nextSegments);
    } catch {
      setDays([]);
    }
  }, [tripId]);

  const loadExtraCosts = useCallback(async () => {
    if (!tripId) return;
    try {
      const list = await extraCostsApi.list(tripId);
      setExtraCosts(list);
    } catch {
      setExtraCosts([]);
    }
  }, [tripId]);

  useEffect(() => {
    loadTrip().then(() => setLoading(false));
  }, [loadTrip]);

  useEffect(() => {
    if (!tripId) return;
    loadDaysAndRoutes();
    loadExtraCosts();
  }, [tripId, loadDaysAndRoutes, loadExtraCosts]);

  const includedRoutes = days.flatMap((d) =>
    (routesByDayId[d.id] ?? []).filter(
      (r) => r.is_include_split && r.selected_segment_id
    )
  );

  const handleCalculate = useCallback(async () => {
    if (!tripId || includedRoutes.length === 0) return;
    setCalcLoading(true);
    try {
      const result = await splitsApi.create(tripId, {
        route_ids: includedRoutes.map((r) => r.id),
        include_extra_cost_ids: extraCosts.map((c) => c.id),
      });
      setSplitResult(result);
    } catch {
      // ignore
    } finally {
      setCalcLoading(false);
    }
  }, [tripId, includedRoutes, extraCosts]);

  const addExtraCost = useCallback(
    async (label: string, amount: number) => {
      if (!tripId || !label || amount <= 0) return;
      try {
        const created = await extraCostsApi.create(tripId, {
          type: "parking",
          label,
          amount_yen: amount,
        });
        setExtraCosts((prev) => [...prev, created]);
      } catch {
        // ignore
      }
    },
    [tripId]
  );

  const removeExtraCost = useCallback(
    async (costId: string) => {
      if (!tripId) return;
      try {
        await extraCostsApi.delete(tripId, costId);
        setExtraCosts((prev) => prev.filter((c) => c.id !== costId));
      } catch {
        // ignore
      }
    },
    [tripId]
  );

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
          <Link
            href={`/trips/${tripId}`}
            className="text-white/80 text-sm"
          >
            ← ルート管理
          </Link>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">💰</span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              {trip.name}
            </h1>
            <p className="text-[11px] text-white/65">割り勘計算</p>
          </div>
        </div>
      </header>

      <main className="p-4">
        <Card className="mb-3">
          <Label>計算対象ルート</Label>
          {includedRoutes.length === 0 ? (
            <p className="text-[13px] text-muted">
              ルート管理で「割り勘に含む」を選んだルートがここに表示されます
            </p>
          ) : (
            <div className="space-y-1.5">
              {includedRoutes.map((r, i) => {
                const seg = (segmentsByRouteId[r.id] ?? []).find(
                  (s) => s.id === r.selected_segment_id
                );
                return (
                  <div
                    key={r.id}
                    className="flex justify-between py-1.5 border-b border-border text-[13px]"
                  >
                    <span className="text-label">
                      {i + 1}. {r.origin} → {r.destination}
                    </span>
                    <span className="text-accent">
                      {seg?.distance_km ?? r.distance_km ?? 0} km
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="mb-3">
          <Label>車・燃料設定（旅行設定を反映）</Label>
          <div className="flex flex-col gap-3 text-[13px]">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-label">燃費</span>
                <span className="font-semibold text-text">
                  {trip.fuel_efficiency} km/L
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-label whitespace-nowrap">
                ガソリン単価
              </span>
              <span className="font-semibold text-text">
                {trip.gas_price} 円/L
              </span>
            </div>
            <div>
              <Label>運転手優遇</Label>
              <span className="text-text font-semibold">
                {Math.round(Number(trip.driver_weight) * 100)}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="mb-3">
          <Label>追加費用（レンタカー・駐車場）</Label>
          {extraCosts.map((c) => (
            <div
              key={c.id}
              className="flex justify-between items-center py-1.5 border-b border-border text-[13px]"
            >
              <span className="text-label">{c.label}</span>
              <div className="flex gap-2 items-center">
                <span className="text-text">{formatYen(c.amount_yen)}</span>
                <button
                  type="button"
                  onClick={() => removeExtraCost(c.id)}
                  className="border-none bg-transparent text-red cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <ExtraCostForm onAdd={addExtraCost} />
        </Card>

        <Button
          onClick={handleCalculate}
          disabled={includedRoutes.length === 0 || calcLoading}
          variant="primary"
          className="w-full py-3 text-[15px] mb-4"
        >
          {calcLoading
            ? "計算中…"
            : "割り勘を計算する →"}
        </Button>

        {splitResult && (
          <Card
            className="border-accent shadow-[var(--glow)]"
          >
            <div className="text-center mb-4">
              <div className="text-[11px] uppercase tracking-wider text-muted mb-1">
                合計コスト
              </div>
              <div className="text-4xl font-extrabold tracking-tight text-accent">
                {formatYen(splitResult.total_yen)}
              </div>
              <div className="text-xs text-muted">
                {Number(splitResult.distance_km).toFixed(1)} km 走行
              </div>
            </div>
            <div className="border-t border-border pt-2.5 mb-3">
              {[
                ["🛣 高速料金", splitResult.toll_yen, `(${payment})`],
                ["⛽ ガソリン代", splitResult.fuel_yen, ""],
                ["🏨 追加費用", splitResult.extra_yen, ""],
              ].map(([label, value, sub]) => (
                <div
                  key={String(label)}
                  className="flex justify-between py-1.5 text-[13px]"
                >
                  <span className="text-label">
                    {label}{" "}
                    {sub && (
                      <span className="text-[11px] text-muted">{sub}</span>
                    )}
                  </span>
                  <span className="text-text">{formatYen(Number(value))}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 rounded-xl border border-accent bg-statBg p-3 text-center shadow-[var(--glow)]">
                <div className="text-[11px] text-muted mb-0.5">🚗 運転手</div>
                <div className="font-bold text-lg text-accent">
                  {formatYen(splitResult.driver_yen)}
                </div>
              </div>
              <div className="flex-1 rounded-xl border border-border bg-statBg p-3 text-center">
                <div className="text-[11px] text-muted mb-0.5">
                  🧑‍🤝‍🧑 同乗者×1
                </div>
                <div className="font-bold text-lg text-text">
                  {formatYen(splitResult.passenger_yen)}
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function ExtraCostForm({
  onAdd,
}: {
  onAdd: (label: string, amount: number) => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const submit = () => {
    const n = parseInt(amount, 10);
    if (label.trim() && !isNaN(n) && n > 0) {
      onAdd(label.trim(), n);
      setLabel("");
      setAmount("");
    }
  };

  return (
    <div className="flex gap-1.5 mt-2.5">
      <input
        type="text"
        placeholder="名前（例：駐車場代）"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-[2] rounded-[10px] border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />
      <input
        type="number"
        placeholder="金額"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="flex-1 rounded-[10px] border border-border bg-inputBg px-3 py-2 text-sm text-text outline-none"
      />
      <Button onClick={submit} variant="ghost" className="whitespace-nowrap">
        追加
      </Button>
    </div>
  );
}
