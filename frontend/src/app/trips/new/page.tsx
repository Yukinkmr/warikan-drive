"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tripsApi, daysApi, routesApi } from "@/lib/api";

const DEFAULT_OWNER_ID = "00000000-0000-0000-0000-000000000001";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NewTripPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      } catch (e) {
        setError(e instanceof Error ? e.message : "作成に失敗しました");
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div className="max-w-app mx-auto min-h-screen bg-bg text-text p-4">
        <p className="text-red">{error}</p>
        <a href="/" className="text-accent mt-4 inline-block">トップへ戻る</a>
      </div>
    );
  }

  return (
    <div className="max-w-app mx-auto min-h-screen bg-bg text-text flex items-center justify-center">
      <p className="text-muted">作成中…</p>
    </div>
  );
}
