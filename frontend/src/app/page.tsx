"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { daysApi, routesApi, tripsApi } from "@/lib/api";
import type { Trip } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoadingTrips(false);
      return;
    }

    setLoadingTrips(true);
    tripsApi
      .list()
      .then((r) => setTrips(r.trips))
      .catch(() => setTrips([]))
      .finally(() => setLoadingTrips(false));
  }, [user]);

  const handleAuthSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setAuthError("メールアドレスを入力してください。");
      return;
    }
    if (!password) {
      setAuthError("パスワードを入力してください。");
      return;
    }
    if (mode === "register") {
      if (!name.trim()) {
        setAuthError("ユーザー名を入力してください。");
        return;
      }
      if (!PASSWORD_RULE.test(password)) {
        setAuthError("パスワードは8文字以上、英字と数字を両方含めてください。");
        return;
      }
    }

    try {
      if (mode === "login") {
        await login(normalizedEmail, password);
      } else {
        await register(name.trim(), normalizedEmail, password);
      }
      setPassword("");
      setAuthError(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "認証に失敗しました。");
    }
  };

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
      });
      const day = await daysApi.create(trip.id, { date: todayStr() });
      await routesApi.create(day.id, { origin: "", destination: "" });
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "作成に失敗しました。");
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4 text-text">
        <p className="text-sm text-muted">読み込み中…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg px-4 py-6 text-text">
        <div className="mx-auto w-full max-w-app md:max-w-app-md">
          <div className="mb-8 flex items-center justify-end">
            <ThemeToggle />
          </div>

          <div
            className="rounded-[28px] border border-white/10 px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] sm:px-6"
            style={{
              background:
                "linear-gradient(160deg, color-mix(in srgb, var(--header-bg) 88%, transparent) 0%, color-mix(in srgb, var(--card-bg) 92%, transparent) 100%)",
            }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                  Warikan Drive
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                  ログイン / 新規登録
                </h1>
                <p className="mt-2 text-sm text-white/70">
                  ログインすると、自分の旅行履歴と割り勘データだけを表示します。
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                🚗
              </div>
            </div>

            <div className="mb-5 flex rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setAuthError(null);
                }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-white text-slate-900"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setAuthError(null);
                }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "register"
                    ? "bg-white text-slate-900"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === "register" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-white/80">
                    Username
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                    placeholder="your name"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/80">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/80">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                  placeholder="8+ chars, letters and numbers"
                />
              </label>

              {mode === "register" && (
                <p className="text-xs text-white/55">
                  パスワードは8文字以上で、英字と数字を両方含めてください。
                </p>
              )}

              {authError && (
                <p className="rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:opacity-90"
              >
                {mode === "login" ? "ログイン" : "アカウント作成"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-bg text-text md:flex md:justify-center">
      <div className="mx-auto w-full min-w-0 max-w-app md:max-w-app-md lg:max-w-app-lg xl:max-w-app-xl">
        <header
          className="border-b border-white/10 px-4 pt-5 pb-5 sm:px-5 sm:pt-6 md:px-6 lg:px-8 lg:pt-7"
          style={{ background: "var(--header-bg)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                Signed in
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {user.name} の旅行一覧
              </h1>
              <p className="mt-1 text-sm text-white/70">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 pb-8 sm:p-5 md:p-6 md:pb-10 lg:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Your trips</h2>
              <p className="text-sm text-muted">
                この一覧と中の履歴は、現在ログイン中のユーザーだけに紐づきます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateTrip}
              disabled={creating}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "作成中…" : "＋ 新しい旅行"}
            </button>
          </div>

          {createError && (
            <p className="mb-4 rounded-2xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
              {createError}
            </p>
          )}

          {loadingTrips ? (
            <div className="rounded-card border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              読み込み中…
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-card border border-border bg-card px-4 py-8 text-center">
              <p className="text-sm text-muted">まだ旅行がありません。</p>
              <p className="mt-1 text-sm text-muted">
                「＋ 新しい旅行」から自分用の履歴を作成できます。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block rounded-card border border-border bg-card px-4 py-4 transition hover:border-accent/50 hover:bg-surface"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-text">
                        {trip.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        作成日 {new Date(trip.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-accent">開く →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
