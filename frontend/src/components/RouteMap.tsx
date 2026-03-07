"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { RouteSegment } from "@/types";
import type { PaymentMethod } from "@/types";
import { formatYen } from "@/lib/utils";

// 新しい関数型API: setOptions は一度だけ呼ぶ
let apiOptionsSet = false;
function ensureApiOptions() {
  if (!apiOptionsSet) {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
      v: "weekly",
      language: "ja",
      region: "JP",
    });
    apiOptionsSet = true;
  }
}

// 選択インデックスに対応した色
const ROUTE_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

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
  originLat,
  originLng,
  destLat,
  destLng,
  segments,
  selectedId,
  payment,
  onSelect,
}: RouteMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- Maps JS API ロード ---
  useEffect(() => {
    let cancelled = false;
    ensureApiOptions();
    // maps と geometry を並列ロード
    Promise.all([importLibrary("maps"), importLibrary("geometry")])
      .then(() => { if (!cancelled) setIsLoaded(true); })
      .catch((e: unknown) => { if (!cancelled) setLoadError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  // --- Map インスタンス作成 ---
  useEffect(() => {
    if (!isLoaded || !mapDivRef.current || mapRef.current) return;
    const center =
      originLat != null && originLng != null
        ? { lat: originLat, lng: originLng }
        : { lat: 35.6812, lng: 139.7671 }; // デフォルトは東京駅
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center,
      zoom: 10,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      gestureHandling: "cooperative",
    });
  }, [isLoaded, originLat, originLng]);

  // --- Polyline 描画・更新 ---
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const existing = polylinesRef.current;
    const newIds = new Set(segments.map((s) => s.id));
    for (const [id, poly] of existing) {
      if (!newIds.has(id)) { poly.setMap(null); existing.delete(id); }
    }
    const selectedSeg = segments.find((s) => s.id === selectedId) ?? segments[0];
    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;
    segments.forEach((seg, idx) => {
      if (!seg.polyline) return;
      let path: google.maps.LatLng[];
      try { path = google.maps.geometry.encoding.decodePath(seg.polyline); }
      catch { return; }
      const isSelected = seg.id === selectedSeg?.id;
      const color = ROUTE_COLORS[isSelected ? 0 : (idx + 1) % ROUTE_COLORS.length];
      if (existing.has(seg.id)) {
        existing.get(seg.id)!.setOptions({
          strokeColor: color, strokeWeight: isSelected ? 7 : 4,
          strokeOpacity: isSelected ? 1 : 0.45, zIndex: isSelected ? 10 : 1,
        });
      } else {
        const poly = new google.maps.Polyline({
          path, map, clickable: true,
          strokeColor: color, strokeWeight: isSelected ? 7 : 4,
          strokeOpacity: isSelected ? 1 : 0.45, zIndex: isSelected ? 10 : 1,
        });
        poly.addListener("click", () => onSelect(seg.id));
        existing.set(seg.id, poly);
      }
      if (isSelected) { path.forEach((ll) => bounds.extend(ll)); hasBounds = true; }
    });
    if (hasBounds) map.fitBounds(bounds, 32);
  }, [isLoaded, segments, selectedId, onSelect]);

  // --- A / B マーカー ---
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (originLat != null && originLng != null)
      markersRef.current.push(new google.maps.Marker({
        map: mapRef.current, position: { lat: originLat, lng: originLng },
        label: { text: "A", color: "white", fontWeight: "bold", fontSize: "13px" }, zIndex: 20,
      }));
    if (destLat != null && destLng != null)
      markersRef.current.push(new google.maps.Marker({
        map: mapRef.current, position: { lat: destLat, lng: destLng },
        label: { text: "B", color: "white", fontWeight: "bold", fontSize: "13px" }, zIndex: 20,
      }));
  }, [isLoaded, originLat, originLng, destLat, destLng]);

  // --- アンマウント時クリーンアップ ---
  useEffect(() => {
    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current.clear();
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, []);

  const hasAnyPolyline = segments.some((s) => s.polyline);

  return (
    <div className="mt-3 flex flex-col gap-3">
      {/* ─── Google Map ─────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-border" style={{ height: 360 }}>
        <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-xs text-red-500">
            地図の読み込みに失敗しました
          </div>
        )}
        {!isLoaded && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-xs text-muted">
            地図を読み込み中…
          </div>
        )}
        {isLoaded && !hasAnyPolyline && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted">
            再検索するとルートが表示されます
          </div>
        )}
      </div>

      {/* ─── ルート選択リスト ───────────────────── */}
      <div className="flex flex-col gap-2">
        {segments.map((seg, idx) => {
          const isSelected = seg.id === selectedId;
          const toll = payment === "ETC" ? seg.toll_etc_yen : seg.toll_cash_yen;
          const color = ROUTE_COLORS[isSelected ? 0 : (idx + 1) % ROUTE_COLORS.length];
          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => onSelect(seg.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
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
