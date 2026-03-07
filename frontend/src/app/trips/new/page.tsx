"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tripsApi, daysApi, routesApi, API_BASE } from "@/lib/api";

const DEFAULT_OWNER_ID = "00000000-0000-0000-0000-000000000001";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NewTripPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const trip = await tripsApi.create({
          name: "新しい旅行",
          payment_method: "ETC",
          fuel_efficiency: 15,
          gas_price: 170,
          driver_weight: 0.7,
          owner_id: DEFAULT_OWNER_ID,
        });
        const day = await daysApi.create(trip.id, { date: todayStr() });
        await routesApi.create(day.id, { origin: "", destination: "" });
        router.replace(`/trips/${trip.id}`);
        return;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "作成に失敗しました。通信を確認してください。";
        setError(msg);
      }
    })();
  }, [router]);

  const [checkResult, setCheckResult] = useState<string | null>(null);
  const checkConnection = async () => {
    setCheckResult("確認中…");
    const healthUrl = API_BASE.startsWith("/")
      ? `${API_BASE}/health`
      : `${API_BASE.replace(/\/api\/v1\/?$/, "")}/api/v1/health`;
    try {
      const res = await fetch(healthUrl, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.status === "ok") {
        setCheckResult("✓ 接続できました。もう一度お試しください。");
      } else {
        setCheckResult(`✗ 応答異常: ${res.status}`);
      }
    } catch (e) {
      setCheckResult(
        "✗ 接続できません。Docker で backend が起動しているか確認してください。"
      );
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen w-full justify-center bg-bg p-4 text-text">
        <div className="w-full max-w-app md:max-w-app-md">
          <p className="text-red font-medium">{error}</p>
        <p className="text-sm text-muted mt-2">
          使用中の API: <code className="text-label">{API_BASE}</code>
        </p>
        <p className="text-sm text-muted mt-1">
          バックエンドが起動しているか確認してください。
        </p>
        <button
          type="button"
          onClick={checkConnection}
          className="mt-3 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:bg-surface"
        >
          接続を確認
        </button>
        {checkResult && (
          <p className="mt-2 text-sm text-label">{checkResult}</p>
        )}
          <Link href="/" className="text-accent mt-4 inline-block font-semibold hover:underline">
            ← トップへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-bg p-4 text-text">
      <div className="w-full max-w-app text-center md:max-w-app-md">
        <p className="text-muted">作成中…</p>
        <Link href="/" className="mt-2 inline-block text-sm text-accent hover:underline">
          キャンセルしてトップへ戻る
        </Link>
      </div>
    </div>
  );
}
