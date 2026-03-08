"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tripsApi, API_BASE } from "@/lib/api";
import { LoadingMessage } from "@/components/ui/LoadingMessage";
import { useAuth } from "@/contexts/AuthContext";

export default function NewTripPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const trip = await tripsApi.create({
          name: "新しいドライブプラン",
          payment_method: "ETC",
          fuel_efficiency: 15,
          gas_price: 170,
          driver_weight: 0.5,
        });
        router.replace(`/trips/${trip.id}`);
        return;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "作成に失敗しました。通信を確認してください。";
        setError(msg);
      }
    })();
  }, [loading, router, user]);

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

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-bg p-4 text-text">
        <div className="w-full max-w-app text-center md:max-w-app-md">
          <LoadingMessage />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full justify-center bg-bg p-4 text-text">
        <div className="w-full max-w-app md:max-w-app-md space-y-4">
          <p className="rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
            {error}
          </p>
          <p className="text-sm text-muted">
            使用中の API: <code className="text-label">{API_BASE}</code>
          </p>
          <p className="text-sm text-muted">
            バックエンドが起動しているか確認してください。
          </p>
          <button
            type="button"
            onClick={checkConnection}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-text transition hover:bg-surface"
          >
            接続を確認
          </button>
          {checkResult && (
            <p className="text-sm text-label">{checkResult}</p>
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
