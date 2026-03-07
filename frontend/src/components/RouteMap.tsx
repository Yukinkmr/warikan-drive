"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import type { RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { formatYen } from "@/lib/utils";

// セグメントのインデックスに対応した色
const ROUTE_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "500px",
  borderRadius: "12px",
};

interface RouteMapProps {
  origin: string;
  originLat: number | null;
  originLng: number | null;
  destination: string;
  destLat: number | null;
  destLng: number | null;
  segments: RouteSegment[];
  selectedId: string | null;
  payment: PaymentMethod;
  onSelect: (id: string) => void;
}

export function RouteMap({
  origin,
  originLat,
  originLng,
  destination,
  destLat,
  destLng,
  segments,
  selectedId,
  payment,
  onSelect,
}: RouteMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
  });

  // セグメントIDごとに DirectionsResult をキャッシュ
  const [directionsBySegId, setDirectionsBySegId] = useState<
    Record<string, google.maps.DirectionsResult>
  >({});
  const [mapError, setMapError] = useState<string | null>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  const fetchForSegment = useCallback(
    (seg: RouteSegment) => {
      if (!isLoaded || !origin || !destination) return;
      if (fetchedRef.current.has(seg.id)) return;
      fetchedRef.current.add(seg.id);

      const service = new window.google.maps.DirectionsService();

      const originParam =
        originLat != null && originLng != null
          ? new window.google.maps.LatLng(originLat, originLng)
          : origin;

      const destParam =
        destLat != null && destLng != null
          ? new window.google.maps.LatLng(destLat, destLng)
          : destination;

      service.route(
        {
          origin: originParam,
          destination: destParam,
          travelMode: window.google.maps.TravelMode.DRIVING,
          // 高速/一般道を summary キーワードで選り好みできないため
          // provideRouteAlternatives で複数取得し、summaryが最も近いものを選択
          provideRouteAlternatives: true,
          region: "JP",
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            // summary が一致するルートを探し、見つかれば routeIndex を先頭に移動
            const keyword = (seg.summary ?? "").split("経由")[0].trim();
            const matchIdx = result.routes.findIndex((r) =>
              keyword ? r.summary?.includes(keyword) : false
            );
            if (matchIdx > 0) {
              // 一致したルートを先頭に移動してアクティブ表示できるようにする
              const reordered = [
                result.routes[matchIdx],
                ...result.routes.filter((_, i) => i !== matchIdx),
              ];
              result = { ...result, routes: reordered };
            }
            setDirectionsBySegId((prev) => ({ ...prev, [seg.id]: result! }));
          } else {
            setMapError(`経路の取得に失敗しました (${status})`);
            // エラー時はキャッシュから除外して再試行できるように
            fetchedRef.current.delete(seg.id);
          }
        }
      );
    },
    [isLoaded, origin, destination, originLat, originLng, destLat, destLng]
  );

  // 表示対象のセグメント（選択中 + 全件を事前フェッチ）
  useEffect(() => {
    if (!isLoaded || segments.length === 0) return;
    for (const seg of segments) {
      fetchForSegment(seg);
    }
  }, [isLoaded, segments, fetchForSegment]);

  if (loadError) {
    return (
      <p className="py-3 text-xs text-red-500">
        地図の読み込みに失敗しました。APIキーを確認してください。
      </p>
    );
  }

  if (!isLoaded) {
    return (
      <p className="py-4 text-center text-xs text-muted">地図を読み込み中…</p>
    );
  }

  const center =
    originLat != null && originLng != null
      ? { lat: originLat, lng: originLng }
      : { lat: 35.6812, lng: 139.7671 };

  const selectedSeg = segments.find((s) => s.id === selectedId) ?? segments[0];
  const selectedDirections = selectedSeg
    ? directionsBySegId[selectedSeg.id] ?? null
    : null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {/* ─── Google Map ─────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={10}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {/* 非選択セグメントを薄く描画 */}
          {segments
            .filter((s) => s.id !== selectedSeg?.id)
            .map((seg, idx) => {
              const dirs = directionsBySegId[seg.id];
              if (!dirs) return null;
              const color = ROUTE_COLORS[(idx + 1) % ROUTE_COLORS.length];
              return (
                <DirectionsRenderer
                  key={seg.id}
                  directions={dirs}
                  routeIndex={0}
                  options={{
                    suppressMarkers: true,
                    suppressInfoWindows: true,
                    preserveViewport: true,
                    polylineOptions: {
                      strokeColor: color,
                      strokeWeight: 3,
                      strokeOpacity: 0.35,
                      zIndex: 1,
                    },
                  }}
                />
              );
            })}

          {/* 選択中セグメントを最前面に太く描画 */}
          {selectedSeg && selectedDirections && (
            <DirectionsRenderer
              key={selectedSeg.id}
              directions={selectedDirections}
              routeIndex={0}
              options={{
                suppressMarkers: false,
                suppressInfoWindows: true,
                preserveViewport: false,
                polylineOptions: {
                  strokeColor: ROUTE_COLORS[0],
                  strokeWeight: 6,
                  strokeOpacity: 1.0,
                  zIndex: 10,
                },
              }}
            />
          )}

          {/* 地図未取得中はローディング表示 */}
          {!selectedDirections && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.05)",
                fontSize: "12px",
                color: "#888",
                pointerEvents: "none",
              }}
            >
              経路を描画中…
            </div>
          )}
        </GoogleMap>
      </div>

      {mapError && <p className="text-xs text-red-500">{mapError}</p>}

      {/* ─── ルート選択リスト ───────────────────── */}
      <div className="flex flex-col gap-2">
        {segments.map((seg, idx) => {
          const isSelected = seg.id === selectedId;
          const toll = payment === "ETC" ? seg.toll_etc_yen : seg.toll_cash_yen;
          const color = ROUTE_COLORS[isSelected ? 0 : (idx + 1) % ROUTE_COLORS.length];
          const isFetching = !directionsBySegId[seg.id];
          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => onSelect(seg.id)}
              className={`flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition-all ${
                isSelected
                  ? "border-accent bg-accentDim shadow-glow"
                  : "border-border bg-surface hover:border-label/50"
              }`}
            >
              {/* 地図上のライン色に対応するドット */}
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 0 2px white, 0 0 0 3px ${color}`,
                  opacity: isFetching ? 0.4 : 1,
                }}
              />
              <div className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-semibold ${
                    isSelected ? "text-accent" : "text-text"
                  }`}
                >
                  {seg.summary || `経路 ${idx + 1}`}
                </span>
                <span className="mt-0.5 flex gap-3 text-xs text-label">
                  <span>📍 {seg.distance_km} km</span>
                  <span>⏱ {seg.duration_min}分</span>
                  <span>🛣 {toll === 0 ? "無料" : formatYen(toll)}</span>
                </span>
              </div>
              {isSelected && (
                <span className="shrink-0 text-xs font-medium text-accent">
                  ✓ 選択中
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
