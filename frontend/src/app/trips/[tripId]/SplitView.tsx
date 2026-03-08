"use client";

import { useCallback, useEffect, useState } from "react";
import { extraCostsApi, splitsApi } from "@/lib/api";
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
import { Button } from "@/components/ui/Button";
import { formatYen } from "@/lib/utils";

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
    <div className="flex min-w-0 flex-wrap items-stretch gap-2 mt-2.5">
      <input
        type="text"
        placeholder="名前（例：駐車場代）"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="min-w-0 flex-[2] basis-0 rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent"
      />
      <input
        type="number"
        placeholder="金額"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="min-w-0 flex-1 min-w-[5rem] basis-0 rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
      />
      <Button onClick={submit} variant="ghost" className="shrink-0 whitespace-nowrap">
        追加
      </Button>
    </div>
  );
}

type SplitViewProps = {
  tripId: string;
  trip: Trip;
  days: Day[];
  routesByDayId: Record<string, Route[]>;
  segmentsByRouteId: Record<string, RouteSegment[]>;
};

export function SplitView({
  tripId,
  trip,
  days,
  routesByDayId,
  segmentsByRouteId,
}: SplitViewProps) {
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>([]);
  const [splitResult, setSplitResult] = useState<Split | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [fuelEff, setFuelEff] = useState(15);
  const [gasPrice, setGasPrice] = useState(170);
  const [driverWeight, setDriverWeight] = useState(0.5);
  const [people, setPeople] = useState(4);

  const payment = (trip?.payment_method as PaymentMethod) || "ETC";
  const paymentLabel = payment === "CASH" ? "現金" : "ETC";

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
    loadExtraCosts().finally(() => setLoading(false));
  }, [loadExtraCosts]);

  useEffect(() => {
    if (!trip) return;
    setFuelEff(Number(trip.fuel_efficiency) || 15);
    setGasPrice(Number(trip.gas_price) || 170);
    setDriverWeight(Number(trip.driver_weight) || 0.5);
  }, [trip]);

  // ページ読み込み時に前回の計算結果を復元
  useEffect(() => {
    if (!tripId) return;
    splitsApi.getLatest(tripId).then(setSplitResult).catch(() => {});
  }, [tripId]);

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
        fuel_efficiency: fuelEff,
        gas_price: gasPrice,
        driver_weight: driverWeight,
        people,
      });
      setSplitResult(result);
    } catch {
      // ignore
    } finally {
      setCalcLoading(false);
    }
  }, [tripId, includedRoutes, extraCosts, fuelEff, gasPrice, driverWeight, people]);

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

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">
        読み込み中…
      </div>
    );
  }

  return (
    <>
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
        <Label>車・燃料設定</Label>
        <div className="flex flex-col gap-4 text-[13px]">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-label">燃費</span>
              <span className="font-semibold text-text">
                {fuelEff} km/L
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={0.5}
              value={fuelEff}
              onChange={(e) => setFuelEff(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-inputBg border border-border accent-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-label whitespace-nowrap">
              ガソリン単価
            </span>
            <input
              type="number"
              min={1}
              value={gasPrice}
              onChange={(e) =>
                setGasPrice(parseInt(e.target.value, 10) || 0)
              }
              className="w-24 rounded-2xl border border-border bg-inputBg px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
            />
            <span className="text-muted">円/L</span>
          </div>
          <div>
            <Label>人数（運転手含む）</Label>
            <div className="flex gap-1.5 flex-wrap">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPeople(n)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors ${
                    people === n
                      ? "border-accent bg-accent-dim text-accent"
                      : "border-border bg-transparent text-muted hover:border-accent/50"
                  }`}
                >
                  {n}人
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-label">運転手優遇</span>
              <span className="font-semibold text-text">
                {Math.round(driverWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(driverWeight * 100)}
              onChange={(e) =>
                setDriverWeight(parseInt(e.target.value, 10) / 100)
              }
              className="w-full h-2 rounded-full appearance-none bg-inputBg border border-border accent-accent"
            />
            <div className="flex justify-between text-[11px] text-muted mt-0.5">
              <span>優遇なし</span>
              <span>優遇大</span>
            </div>
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
          className="border-accent shadow-glow"
        >
          <div className="text-center mb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted mb-1.5">
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
              ["🛣 高速料金", splitResult.toll_yen, `(${paymentLabel})`],
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
          <div className="flex gap-3 mb-3">
            <div className="flex-1 rounded-2xl border border-accent bg-statBg p-3 text-center shadow-glow">
              <div className="text-xs font-medium text-muted mb-0.5">🚗 運転手</div>
              <div className="font-bold text-lg text-accent">
                {formatYen(splitResult.driver_yen)}
              </div>
            </div>
            <div className="flex-1 rounded-2xl border border-border bg-statBg p-3 text-center">
              <div className="text-xs font-medium text-muted mb-0.5">
                🧑‍🤝‍🧑 同乗者×{Math.max(people - 1, 0)}
              </div>
              <div className="font-bold text-lg text-text">
                {formatYen(splitResult.passenger_yen)}
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
